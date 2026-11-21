import React, { useRef, useState } from 'react';
import { doc, serverTimestamp, updateDoc, writeBatch } from 'firebase/firestore';
import { Database, Download, FileJson, FileSpreadsheet, RefreshCw, Upload } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';
import { db } from '../../lib/firebase';
import { OperationType, handleFirestoreError } from '../../lib/firestoreError';
import { clampStr, computeDiscountPercent, slugify } from '../../lib/format';
import { Product } from '../../types';
import { migrateRemoteUrlToCloudinary } from '../../lib/cloudinary';

function downloadTextFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function escapeCsvCell(val: string | number | boolean | null | undefined): string {
  const str = val === null || val === undefined ? '' : String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  result.push(cur);
  return result;
}

export function AdminMigrationTab() {
  const { products, categories, settings, seeding, seedOriginalCatalog } = useStore();
  const { showToast } = useToast();

  const jsonInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const [importing, setImporting] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [migrationProgress, setMigrationProgress] = useState({ completed: 0, total: 0 });

  async function handleReseed() {
    if (
      !window.confirm(
        'Re-seed all 77 original SAMTOB P&C products into Firestore? Existing items with matching IDs will be restored.'
      )
    ) {
      return;
    }
    const count = await seedOriginalCatalog(true);
    showToast(`Seeded ${count} original products into Firestore`, 'success');
  }


  async function handleCloudinaryMigration() {
    const candidates = products.filter((product) =>
      Array.isArray(product.images) && product.images.some((url) => url.includes('supabase.co'))
    );
    const total = candidates.reduce(
      (sum, product) => sum + product.images.filter((url) => url.includes('supabase.co')).length,
      0
    );
    if (total === 0) {
      showToast('No legacy Supabase product images remain to migrate.', 'success');
      return;
    }
    if (!window.confirm(`Move ${total} legacy product images from the old storage service to Cloudinary? This updates the product image links in Firebase and does not delete the old files.`)) {
      return;
    }

    setMigrating(true);
    setMigrationProgress({ completed: 0, total });
    const queue = [...candidates];
    let completed = 0;
    let failed = false;

    const worker = async () => {
      while (!failed) {
        const product = queue.shift();
        if (!product) return;
        try {
          const nextImages = [...(product.images || [])];
          for (let index = 0; index < nextImages.length; index += 1) {
            const imageUrl = nextImages[index];
            if (!imageUrl.includes('supabase.co')) continue;
            nextImages[index] = await migrateRemoteUrlToCloudinary(
              imageUrl,
              'samtobpc/products',
              settings.cloudinary
            );
            await updateDoc(doc(db, 'products', product.id), {
              images: nextImages,
              updatedAt: serverTimestamp(),
            });
            completed += 1;
            setMigrationProgress({ completed, total });
          }
        } catch (error) {
          failed = true;
          throw error;
        }
      }
    };

    try {
      const results = await Promise.allSettled([worker(), worker(), worker()]);
      const failure = results.find((result) => result.status === 'rejected');
      if (failure && failure.status === 'rejected') throw failure.reason;
      showToast(`Migrated ${completed} of ${total} product images to Cloudinary`, 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown migration error';
      showToast(`Migration paused at ${completed}/${total}: ${message}`, 'error');
    } finally {
      setMigrating(false);
    }
  }

  function handleExportJson() {
    downloadTextFile(
      `samtobpc-products-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify(products, null, 2),
      'application/json'
    );
    showToast(`Exported ${products.length} products as JSON`, 'success');
  }

  function handleExportFullBackup() {
    const backup = {
      exportedAt: new Date().toISOString(),
      products,
      categories,
      settings,
    };
    downloadTextFile(
      `samtobpc-full-backup-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify(backup, null, 2),
      'application/json'
    );
    showToast('Full database backup exported', 'success');
  }

  function handleExportCsv() {
    const headers = [
      'id',
      'slug',
      'name',
      'brand',
      'category',
      'condition',
      'price',
      'oldPrice',
      'stock',
      'description',
      'images',
      'featured',
      'flashSale',
      'published',
    ];
    const rows = products.map((p) =>
      [
        p.id,
        p.slug,
        p.name,
        p.brand,
        p.category,
        p.condition,
        p.price,
        p.oldPrice ?? '',
        p.stock,
        p.description,
        (p.images || []).join('|'),
        p.featured,
        p.flashSale,
        p.published,
      ]
        .map(escapeCsvCell)
        .join(',')
    );
    downloadTextFile(
      `samtobpc-products-${new Date().toISOString().slice(0, 10)}.csv`,
      [headers.join(','), ...rows].join('\n'),
      'text/csv'
    );
    showToast(`Exported ${products.length} products as CSV`, 'success');
  }

  async function importProductsList(list: Partial<Product>[]) {
    if (!Array.isArray(list) || list.length === 0) {
      showToast('No valid products found in file', 'error');
      return;
    }

    setImporting(true);
    try {
      for (let i = 0; i < list.length; i += 400) {
        const batch = writeBatch(db);
        const chunk = list.slice(i, i + 400);
        for (const item of chunk) {
          const safeId =
            item.id && /^[a-zA-Z0-9_-]+$/.test(item.id)
              ? item.id
              : `prod_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
          const safeSlug = slugify(item.slug || item.name || safeId) || safeId;
          const price = Number(item.price) || 0;
          const oldPrice = item.oldPrice ? Number(item.oldPrice) : null;
          batch.set(doc(db, 'products', safeId), {
            id: safeId,
            slug: clampStr(safeSlug, 128),
            name: clampStr(item.name || 'Imported Device', 240),
            brand: clampStr(item.brand || 'Generic', 80),
            category: String(item.category || 'laptops')
              .toLowerCase()
              .replace(/[^a-z0-9_-]/g, ''),
            condition: item.condition === 'new' ? 'new' : 'uk-used',
            price,
            oldPrice,
            discountPercent: computeDiscountPercent(price, oldPrice),
            stock: Number.isFinite(Number(item.stock)) ? Number(item.stock) : 1,
            description: clampStr(item.description || '', 5000),
            specs: Array.isArray(item.specs) ? item.specs.slice(0, 30) : [],
            images:
              Array.isArray(item.images) && item.images.length > 0
                ? item.images.slice(0, 12)
                : ['/logo.png'],
            featured: Boolean(item.featured),
            flashSale: Boolean(item.flashSale),
            published: item.published !== false,
            tags: Array.isArray(item.tags) ? item.tags.slice(0, 15) : [],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
        await batch.commit();
      }
      showToast(`Imported ${list.length} products into Firestore`, 'success');
    } catch (err) {
      showToast('Failed to import products', 'error');
      handleFirestoreError(err, OperationType.WRITE, 'products');
    } finally {
      setImporting(false);
    }
  }

  async function handleJsonUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const list = Array.isArray(parsed) ? parsed : parsed.products;
      await importProductsList(list);
    } catch {
      showToast('Invalid JSON file', 'error');
    } finally {
      if (jsonInputRef.current) jsonInputRef.current.value = '';
    }
  }

  async function handleCsvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length < 2) {
        showToast('CSV must contain headers and at least one product row', 'error');
        return;
      }
      const headers = parseCsvLine(lines[0]);
      const items: Partial<Product>[] = lines.slice(1).map((line) => {
        const cols = parseCsvLine(line);
        const row: Record<string, string> = {};
        headers.forEach((h, idx) => {
          row[h.trim()] = cols[idx] || '';
        });
        return {
          id: row.id || undefined,
          slug: row.slug || undefined,
          name: row.name,
          brand: row.brand,
          category: row.category || 'laptops',
          condition: row.condition === 'new' ? 'new' : 'uk-used',
          price: Number(row.price) || 0,
          oldPrice: row.oldPrice ? Number(row.oldPrice) : null,
          stock: Number(row.stock) || 0,
          description: row.description || '',
          images: row.images ? row.images.split('|').filter(Boolean) : ['/logo.png'],
          featured: row.featured === 'true',
          flashSale: row.flashSale === 'true',
          published: row.published !== 'false',
        };
      });
      await importProductsList(items);
    } catch {
      showToast('Invalid CSV file', 'error');
    } finally {
      if (csvInputRef.current) csvInputRef.current.value = '';
    }
  }

  return (
    <div className="space-y-6">
      {/* Catalog Seeding & Backup */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="bg-white border border-line rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Database size={18} className="text-signal" />
            <h2 className="font-display font-semibold text-base">
              Original Catalog Seed &amp; Full Backup
            </h2>
          </div>
          <p className="text-xs text-steel leading-relaxed">
            Re-sync the 77 recovered SAMTOB P&amp;C products, categories, and default settings into Firestore, or download a complete JSON snapshot of your entire store database.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleReseed}
              disabled={seeding}
              className="inline-flex items-center gap-1.5 bg-signal text-white px-4 py-2 rounded-full text-xs font-medium hover:brightness-110 disabled:opacity-50"
            >
              <RefreshCw size={14} className={seeding ? 'animate-spin' : ''} />
              {seeding ? 'Seeding...' : 'Seed / Restore 77 Original Products'}
            </button>
            <button
              type="button"
              onClick={handleExportFullBackup}
              className="inline-flex items-center gap-1.5 border border-line px-4 py-2 rounded-full text-xs font-medium hover:border-signal"
            >
              <Download size={14} /> Full JSON Backup
            </button>
          </div>
        </section>

        <section className="bg-white border border-line rounded-2xl p-6 space-y-3">
          <h2 className="font-display font-semibold text-base">Cloudinary Product Image Migration</h2>
          <p className="text-xs text-steel leading-relaxed">
            New product uploads use Cloudinary. The recovered catalog still contains legacy image links; migrate them here after Cloudinary has been configured in Website &amp; Payment Settings.
          </p>
          <button
            type="button"
            onClick={handleCloudinaryMigration}
            disabled={migrating || products.length === 0}
            className="inline-flex items-center gap-1.5 bg-ink text-paper px-4 py-2 rounded-full text-xs font-medium hover:bg-signal disabled:opacity-50"
          >
            <RefreshCw size={14} className={migrating ? 'animate-spin' : ''} />
            {migrating ? `Migrating ${migrationProgress.completed}/${migrationProgress.total}...` : 'Migrate Legacy Images to Cloudinary'}
          </button>
          {migrationProgress.total > 0 && (
            <p className="text-xs text-steel font-data">
              {migrationProgress.completed} of {migrationProgress.total} images migrated. You can safely run this again to continue any remaining images.
            </p>
          )}
        </section>
      </div>

      {/* Product Import / Export JSON & CSV */}
      <section className="bg-white border border-line rounded-2xl p-6 space-y-4">
        <h2 className="font-display font-semibold text-base">
          Import &amp; Export Catalog (JSON / CSV)
        </h2>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleExportJson}
            className="inline-flex items-center gap-1.5 border border-line px-4 py-2 rounded-full text-xs font-medium hover:border-signal"
          >
            <FileJson size={14} /> Export Products JSON
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 border border-line px-4 py-2 rounded-full text-xs font-medium hover:border-signal"
          >
            <FileSpreadsheet size={14} /> Export Products CSV
          </button>

          <input
            ref={jsonInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleJsonUpload}
            className="hidden"
          />
          <button
            type="button"
            disabled={importing}
            onClick={() => jsonInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 border border-ink px-4 py-2 rounded-full text-xs font-medium hover:bg-ink hover:text-paper transition-colors"
          >
            <Upload size={14} /> Import JSON
          </button>

          <input
            ref={csvInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleCsvUpload}
            className="hidden"
          />
          <button
            type="button"
            disabled={importing}
            onClick={() => csvInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 border border-ink px-4 py-2 rounded-full text-xs font-medium hover:bg-ink hover:text-paper transition-colors"
          >
            <Upload size={14} /> Import CSV
          </button>
        </div>
      </section>

      {/* Deployment & Setup Checklist */}
      <section className="bg-white border border-line rounded-2xl p-6 space-y-3">
        <h2 className="font-display font-semibold text-base">
          Deployment &amp; Environment Reference
        </h2>
        <div className="text-xs text-steel space-y-2 leading-relaxed font-data">
          <p>
            1. <strong>Firebase Auth &amp; Firestore</strong>: Configured via{' '}
            <code>firebase-applet-config.json</code> and protected by{' '}
            <code>firestore.rules</code>. Bootstrapped admin email:{' '}
            <code>samtobeng@gmail.com</code>.
          </p>
          <p>
            2. <strong>Product Images</strong>: New uploads and migrated legacy catalog images are stored in Cloudinary; product records remain in Firestore.
          </p>
          <p>
            3. <strong>Production Build</strong>: Run <code>npm run build</code> then{' '}
            <code>npm start</code> (serves Express + compiled Vite SPA on port 3000).
          </p>
        </div>
      </section>
    </div>
  );
}
