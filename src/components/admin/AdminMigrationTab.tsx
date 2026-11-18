import React, { useRef, useState } from 'react';
import { doc, serverTimestamp, updateDoc, writeBatch } from 'firebase/firestore';
import {
  CloudUpload,
  Database,
  Download,
  FileJson,
  FileSpreadsheet,
  RefreshCw,
  Upload,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';
import { isCloudinaryUrl, migrateRemoteUrlToCloudinary } from '../../lib/cloudinary';
import { db } from '../../lib/firebase';
import { OperationType, handleFirestoreError } from '../../lib/firestoreError';
import { clampStr, computeDiscountPercent, slugify } from '../../lib/format';
import { Product } from '../../types';

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
  const [migratingImages, setMigratingImages] = useState(false);
  const [migrationLog, setMigrationLog] = useState<string>('');

  const legacyImageProducts = products.filter((p) =>
    (p.images || []).some((img) => img.startsWith('http') && !isCloudinaryUrl(img))
  );

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

  async function handleMigrateImagesToCloudinary() {
    if (legacyImageProducts.length === 0) {
      showToast('All product images are already on Cloudinary or local assets', 'info');
      return;
    }

    setMigratingImages(true);
    let successCount = 0;
    let failCount = 0;

    try {
      for (const p of legacyImageProducts) {
        setMigrationLog(`Migrating ${p.name}... (${successCount + 1}/${legacyImageProducts.length})`);
        const nextImages: string[] = [];
        let changed = false;

        for (const imgUrl of p.images || []) {
          if (imgUrl.startsWith('http') && !isCloudinaryUrl(imgUrl)) {
            try {
              const cloudUrl = await migrateRemoteUrlToCloudinary(
                imgUrl,
                'samtobpc/products',
                settings.cloudinary
              );
              nextImages.push(cloudUrl);
              changed = true;
            } catch {
              nextImages.push(imgUrl);
              failCount++;
            }
          } else {
            nextImages.push(imgUrl);
          }
        }

        if (changed) {
          await updateDoc(doc(db, 'products', p.id), {
            images: nextImages,
            updatedAt: serverTimestamp(),
          });
          successCount++;
        }
      }
      setMigrationLog(
        `Completed: updated ${successCount} products (${failCount} failed image fetches).`
      );
      showToast(`Migrated images on ${successCount} products`, 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Migration failed';
      setMigrationLog(msg);
      showToast(msg, 'error');
    } finally {
      setMigratingImages(false);
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

        {/* Cloudinary Batch Image Migration */}
        <section className="bg-white border border-line rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <CloudUpload size={18} className="text-signal" />
            <h2 className="font-display font-semibold text-base">
              Cloudinary Batch Image Migrator
            </h2>
          </div>
          <p className="text-xs text-steel leading-relaxed">
            {legacyImageProducts.length} products currently reference external/legacy image URLs. Click below to transfer them into your configured Cloudinary account automatically.
          </p>
          <button
            type="button"
            onClick={handleMigrateImagesToCloudinary}
            disabled={migratingImages || legacyImageProducts.length === 0}
            className="inline-flex items-center gap-1.5 bg-ink text-paper px-4 py-2 rounded-full text-xs font-medium hover:bg-signal transition-colors disabled:opacity-50"
          >
            <CloudUpload size={14} />
            {migratingImages
              ? 'Migrating...'
              : `Migrate ${legacyImageProducts.length} Products to Cloudinary`}
          </button>
          {migrationLog && (
            <p className="text-xs font-data text-steel bg-paper border border-line rounded-xl px-3 py-2">
              {migrationLog}
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
            2. <strong>Cloudinary</strong>: Set <code>VITE_CLOUDINARY_CLOUD_NAME</code> +{' '}
            <code>VITE_CLOUDINARY_UPLOAD_PRESET</code> (unsigned) or server{' '}
            <code>CLOUDINARY_CLOUD_NAME</code> + <code>CLOUDINARY_API_KEY</code> +{' '}
            <code>CLOUDINARY_API_SECRET</code> (signed) in environment variables, or configure unsigned values under Website &amp; Payment Settings.
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
