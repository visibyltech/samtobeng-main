import React, { useMemo, useState } from 'react';
import {
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import {
  Edit3,
  Eye,
  EyeOff,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { CloudinaryUploader } from '../CloudinaryUploader';
import { useStore } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';
import { getOptimizedImageUrl } from '../../lib/cloudinary';
import { db } from '../../lib/firebase';
import { OperationType, handleFirestoreError } from '../../lib/firestoreError';
import { clampStr, computeDiscountPercent, formatNaira, slugify } from '../../lib/format';
import { Product, ProductCondition, ProductSpec } from '../../types';

const EMPTY_FORM = {
  id: '',
  name: '',
  slug: '',
  brand: '',
  category: 'laptops',
  condition: 'uk-used' as ProductCondition,
  price: 0,
  oldPrice: '' as string | number,
  stock: 1,
  description: '',
  images: [] as string[],
  specs: [] as ProductSpec[],
  tagsText: '',
  featured: false,
  flashSale: false,
  published: true,
};

export function AdminProductsTab() {
  const { products, categories } = useStore();
  const { showToast } = useToast();

  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [pubFilter, setPubFilter] = useState<'all' | 'published' | 'draft'>('all');

  const [editing, setEditing] = useState<Product | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [previewProduct, setPreviewProduct] = useState<Product | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (catFilter !== 'all' && p.category !== catFilter) return false;
      if (pubFilter === 'published' && !p.published) return false;
      if (pubFilter === 'draft' && p.published) return false;
      if (q) {
        return (
          p.name.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.slug.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [products, search, catFilter, pubFilter]);

  function openNewModal() {
    setEditing(null);
    setForm({
      ...EMPTY_FORM,
      category: categories[0]?.slug || 'laptops',
    });
    setModalOpen(true);
  }

  function openEditModal(p: Product) {
    setEditing(p);
    setForm({
      id: p.id,
      name: p.name,
      slug: p.slug,
      brand: p.brand,
      category: p.category,
      condition: p.condition,
      price: p.price,
      oldPrice: p.oldPrice ?? '',
      stock: p.stock,
      description: p.description,
      images: p.images || [],
      specs: p.specs || [],
      tagsText: (p.tags || []).join(', '),
      featured: p.featured,
      flashSale: p.flashSale,
      published: p.published,
    });
    setModalOpen(true);
  }

  function buildProductSnapshot(): Product {
    const safeSlug = slugify(form.slug || form.name) || `item-${Date.now()}`;
    const numPrice = Math.max(0, Number(form.price) || 0);
    const numOldPrice =
      form.oldPrice !== '' && Number(form.oldPrice) > 0 ? Number(form.oldPrice) : null;
    const discountPercent = computeDiscountPercent(numPrice, numOldPrice);
    const tags = form.tagsText
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 15);

    return {
      id: editing ? editing.id : `prod_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`,
      slug: clampStr(safeSlug, 128),
      name: clampStr(form.name || 'Untitled Device', 240),
      brand: clampStr(form.brand || 'Generic', 80),
      category: (form.category || 'laptops').toLowerCase().replace(/[^a-z0-9_-]/g, ''),
      condition: form.condition,
      price: numPrice,
      oldPrice: numOldPrice,
      discountPercent,
      stock: Math.max(0, Number(form.stock) || 0),
      description: clampStr(form.description, 5000),
      specs: form.specs.filter((s) => s.label.trim() && s.value.trim()).slice(0, 30),
      images: form.images.length > 0 ? form.images.slice(0, 12) : ['/logo.png'],
      featured: form.featured,
      flashSale: form.flashSale,
      published: form.published,
      tags,
    };
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      showToast('Product name is required', 'error');
      return;
    }
    if (form.images.length === 0) {
      showToast('Upload at least 1 product image (Cloudinary or URL)', 'error');
      return;
    }

    setSaving(true);
    const snap = buildProductSnapshot();
    try {
      if (editing) {
        await updateDoc(doc(db, 'products', editing.id), {
          slug: snap.slug,
          name: snap.name,
          brand: snap.brand,
          category: snap.category,
          condition: snap.condition,
          price: snap.price,
          oldPrice: snap.oldPrice ?? null,
          discountPercent: snap.discountPercent ?? null,
          stock: snap.stock,
          description: snap.description,
          specs: snap.specs || [],
          images: snap.images,
          featured: snap.featured,
          flashSale: snap.flashSale,
          published: snap.published,
          tags: snap.tags || [],
          updatedAt: serverTimestamp(),
        });
        showToast('Product updated', 'success');
      } else {
        await setDoc(doc(db, 'products', snap.id), {
          ...snap,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        showToast('Product created', 'success');
      }
      setModalOpen(false);
    } catch (err) {
      showToast('Failed to save product', 'error');
      handleFirestoreError(
        err,
        editing ? OperationType.UPDATE : OperationType.CREATE,
        `products/${snap.id}`
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleQuickToggle(p: Product, field: 'published' | 'featured' | 'flashSale') {
    try {
      await updateDoc(doc(db, 'products', p.id), {
        [field]: !p[field],
        updatedAt: serverTimestamp(),
      });
      showToast(`Updated ${p.name}`, 'success');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `products/${p.id}`);
    }
  }

  async function handleDelete(p: Product) {
    if (!window.confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    try {
      await deleteDoc(doc(db, 'products', p.id));
      showToast('Product deleted', 'info');
    } catch (err) {
      showToast('Could not delete product', 'error');
      handleFirestoreError(err, OperationType.DELETE, `products/${p.id}`);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-steel" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products, brand, slug..."
              className="w-full border border-line rounded-full pl-9 pr-4 py-2 text-xs bg-white focus:outline-none focus:border-signal"
            />
          </div>

          <select
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
            className="border border-line rounded-full px-3.5 py-2 text-xs bg-white focus:outline-none focus:border-signal"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={pubFilter}
            onChange={(e) => setPubFilter(e.target.value as 'all' | 'published' | 'draft')}
            className="border border-line rounded-full px-3.5 py-2 text-xs bg-white focus:outline-none focus:border-signal"
          >
            <option value="all">All Status</option>
            <option value="published">Published</option>
            <option value="draft">Draft / Hidden</option>
          </select>
        </div>

        <button
          type="button"
          onClick={openNewModal}
          className="inline-flex items-center gap-1.5 bg-signal text-white px-4 py-2.5 rounded-full text-xs font-medium hover:brightness-110 transition-all"
        >
          <Plus size={15} /> Add Product
        </button>
      </div>

      <p className="text-xs font-data text-steel">
        Showing {filtered.length} of {products.length} products
      </p>

      <div className="bg-white border border-line rounded-2xl overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-line bg-paper text-steel font-data uppercase">
            <tr>
              <th className="py-3 px-4">Product</th>
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-4">Price</th>
              <th className="py-3 px-4">Stock</th>
              <th className="py-3 px-4">Flags</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {filtered.map((p) => (
              <tr key={p.id} className="hover:bg-paper/60">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={getOptimizedImageUrl(p.images?.[0], 100) || '/logo.png'}
                      alt={p.name}
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-lg bg-[#F5F4F0] object-contain p-1 shrink-0"
                    />
                    <div>
                      <p className="font-medium text-ink line-clamp-1 max-w-[260px]">{p.name}</p>
                      <p className="text-[11px] font-data text-steel">
                        {p.brand} · {p.condition === 'new' ? 'Brand New' : 'UK Used'}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4 capitalize font-data">{p.category}</td>
                <td className="py-3 px-4 font-data">
                  <p className="font-semibold">{formatNaira(p.price)}</p>
                  {p.oldPrice && (
                    <p className="text-[11px] text-steel line-through">{formatNaira(p.oldPrice)}</p>
                  )}
                </td>
                <td className="py-3 px-4 font-data">
                  <span className={p.stock === 0 ? 'text-signal font-semibold' : 'text-ink'}>
                    {p.stock}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleQuickToggle(p, 'published')}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-data border ${
                        p.published
                          ? 'border-mint/30 bg-mint/10 text-mint'
                          : 'border-line text-steel'
                      }`}
                    >
                      {p.published ? 'Published' : 'Draft'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickToggle(p, 'featured')}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-data border ${
                        p.featured
                          ? 'border-signal/30 bg-signal/10 text-signal'
                          : 'border-line text-steel'
                      }`}
                    >
                      Featured
                    </button>
                  </div>
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="inline-flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setPreviewProduct(p)}
                      title="Preview"
                      className="p-1.5 rounded-lg hover:bg-ink/5 text-steel hover:text-ink"
                    >
                      <Eye size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditModal(p)}
                      title="Edit"
                      className="p-1.5 rounded-lg hover:bg-ink/5 text-steel hover:text-ink"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(p)}
                      title="Delete"
                      className="p-1.5 rounded-lg hover:bg-signal/10 text-steel hover:text-signal"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-ink/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto p-6 space-y-5 shadow-xl my-8">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h2 className="font-display font-bold text-lg">
                {editing ? `Edit: ${editing.name}` : 'Add New Product'}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-full hover:bg-ink/5"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-steel mb-1">Product Name *</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => {
                      const val = e.target.value;
                      setForm((prev) => ({
                        ...prev,
                        name: val,
                        slug: editing ? prev.slug : slugify(val),
                      }));
                    }}
                    className="w-full border border-line rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-signal"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-steel mb-1">URL Slug *</label>
                  <input
                    type="text"
                    required
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })}
                    className="w-full border border-line rounded-xl px-3 py-2 text-xs font-data focus:outline-none focus:border-signal"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-steel mb-1">Brand *</label>
                  <input
                    type="text"
                    required
                    value={form.brand}
                    onChange={(e) => setForm({ ...form, brand: e.target.value })}
                    className="w-full border border-line rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-signal"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-steel mb-1">Category *</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full border border-line rounded-xl px-3 py-2 text-xs bg-white focus:outline-none focus:border-signal"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.slug}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-steel mb-1">Condition</label>
                  <select
                    value={form.condition}
                    onChange={(e) =>
                      setForm({ ...form, condition: e.target.value as ProductCondition })
                    }
                    className="w-full border border-line rounded-xl px-3 py-2 text-xs bg-white focus:outline-none focus:border-signal"
                  >
                    <option value="uk-used">UK Used</option>
                    <option value="new">Brand New</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-steel mb-1">Stock Quantity</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={form.stock}
                    onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })}
                    className="w-full border border-line rounded-xl px-3 py-2 text-xs font-data focus:outline-none focus:border-signal"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-steel mb-1">Price (₦) *</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                    className="w-full border border-line rounded-xl px-3 py-2 text-xs font-data focus:outline-none focus:border-signal"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-steel mb-1">
                    Original Price (₦, if discounted)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={form.oldPrice}
                    onChange={(e) => setForm({ ...form, oldPrice: e.target.value })}
                    placeholder="Leave blank if not discounted"
                    className="w-full border border-line rounded-xl px-3 py-2 text-xs font-data focus:outline-none focus:border-signal"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-steel mb-1">Description</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full border border-line rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-signal"
                />
              </div>

              {/* Images via Cloudinary */}
              <div>
                <label className="block text-xs font-medium text-steel mb-1.5">
                  Product Gallery Images (Cloudinary)
                </label>
                <CloudinaryUploader
                  images={form.images}
                  onChange={(imgs) => setForm({ ...form, images: imgs })}
                  folder="samtobpc/products"
                  multiple
                  maxFiles={12}
                  label="Upload Product Images"
                />
              </div>

              {/* Specifications */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-steel">Specifications</label>
                  <button
                    type="button"
                    onClick={() =>
                      setForm({ ...form, specs: [...form.specs, { label: '', value: '' }] })
                    }
                    className="text-xs text-signal hover:underline"
                  >
                    + Add Spec
                  </button>
                </div>
                {form.specs.map((spec, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Label (e.g. RAM)"
                      value={spec.label}
                      onChange={(e) => {
                        const copy = [...form.specs];
                        copy[idx] = { ...copy[idx], label: e.target.value };
                        setForm({ ...form, specs: copy });
                      }}
                      className="flex-1 border border-line rounded-lg px-3 py-1.5 text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Value (e.g. 16GB)"
                      value={spec.value}
                      onChange={(e) => {
                        const copy = [...form.specs];
                        copy[idx] = { ...copy[idx], value: e.target.value };
                        setForm({ ...form, specs: copy });
                      }}
                      className="flex-1 border border-line rounded-lg px-3 py-1.5 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setForm({ ...form, specs: form.specs.filter((_, i) => i !== idx) })
                      }
                      className="p-1.5 text-signal"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs font-medium text-steel mb-1">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  value={form.tagsText}
                  onChange={(e) => setForm({ ...form, tagsText: e.target.value })}
                  placeholder="e.g. touchscreen, core-i7, 512gb-ssd"
                  className="w-full border border-line rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-signal"
                />
              </div>

              <div className="flex flex-wrap gap-5 pt-1 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.published}
                    onChange={(e) => setForm({ ...form, published: e.target.checked })}
                    className="accent-[var(--color-signal)]"
                  />
                  Published on Storefront
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.featured}
                    onChange={(e) => setForm({ ...form, featured: e.target.checked })}
                    className="accent-[var(--color-signal)]"
                  />
                  Featured Device
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.flashSale}
                    onChange={(e) => setForm({ ...form, flashSale: e.target.checked })}
                    className="accent-[var(--color-signal)]"
                  />
                  Flash Sale
                </label>
              </div>

              <div className="flex flex-wrap justify-between items-center gap-3 pt-4 border-t border-line">
                <button
                  type="button"
                  onClick={() => setPreviewProduct(buildProductSnapshot())}
                  className="inline-flex items-center gap-1.5 border border-line px-4 py-2 rounded-full text-xs font-medium hover:border-signal hover:text-signal"
                >
                  <Sparkles size={14} /> Preview Before Publishing
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 rounded-full border border-line text-xs font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 rounded-full bg-signal text-white text-xs font-medium hover:brightness-110 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Product'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Product Preview Modal */}
      {previewProduct && (
        <div className="fixed inset-0 z-[60] bg-ink/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-paper rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                {previewProduct.published ? (
                  <Eye size={16} className="text-mint" />
                ) : (
                  <EyeOff size={16} className="text-steel" />
                )}
                <span className="font-data text-xs uppercase text-steel">
                  Storefront Preview ({previewProduct.published ? 'Published' : 'Draft'})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewProduct(null)}
                className="p-1 rounded-full hover:bg-ink/5"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 bg-white p-4 rounded-xl border border-line">
              <div className="aspect-square bg-[#F5F4F0] rounded-xl flex items-center justify-center p-4">
                <img
                  src={getOptimizedImageUrl(previewProduct.images?.[0], 480) || '/logo.png'}
                  alt={previewProduct.name}
                  referrerPolicy="no-referrer"
                  className="max-h-full object-contain"
                />
              </div>
              <div className="space-y-2">
                <p className="text-[11px] font-data uppercase text-steel">
                  {previewProduct.brand} ·{' '}
                  {previewProduct.condition === 'new' ? 'Brand New' : 'UK Used'}
                </p>
                <h3 className="font-display font-bold text-lg">{previewProduct.name}</h3>
                <div className="flex items-baseline gap-2">
                  <span className="font-data font-bold text-xl text-ink">
                    {formatNaira(previewProduct.price)}
                  </span>
                  {previewProduct.oldPrice && (
                    <span className="font-data text-xs text-steel line-through">
                      {formatNaira(previewProduct.oldPrice)}
                    </span>
                  )}
                </div>
                <p className="text-xs text-steel leading-relaxed line-clamp-4">
                  {previewProduct.description || 'No description added yet.'}
                </p>
                <p className="text-xs font-data text-mint">
                  {previewProduct.stock > 0
                    ? `${previewProduct.stock} in stock`
                    : 'Out of stock'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
