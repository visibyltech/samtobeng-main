import React, { useState } from 'react';
import { deleteDoc, doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { Plus, Trash2 } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';
import { db } from '../../lib/firebase';
import { OperationType, handleFirestoreError } from '../../lib/firestoreError';
import { clampStr, slugify } from '../../lib/format';
import { Category } from '../../types';

export function AdminCategoriesTab() {
  const { categories } = useStore();
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [order, setOrder] = useState(categories.length + 1);
  const [saving, setSaving] = useState(false);

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    const safeSlug = slugify(slug || name);
    if (!name.trim() || !safeSlug) {
      showToast('Category name and slug are required', 'error');
      return;
    }

    setSaving(true);
    try {
      await setDoc(doc(db, 'categories', safeSlug), {
        id: safeSlug,
        slug: safeSlug,
        name: clampStr(name, 80),
        ...(description.trim() ? { description: clampStr(description, 300) } : {}),
        order: Number(order) || 1,
        active: true,
        updatedAt: serverTimestamp(),
      });
      setName('');
      setSlug('');
      setDescription('');
      setOrder(categories.length + 2);
      showToast('Category saved', 'success');
    } catch (err) {
      showToast('Failed to save category', 'error');
      handleFirestoreError(err, OperationType.WRITE, `categories/${safeSlug}`);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(cat: Category) {
    try {
      await updateDoc(doc(db, 'categories', cat.id), {
        active: !cat.active,
        updatedAt: serverTimestamp(),
      });
      showToast(`${cat.name} ${cat.active ? 'hidden' : 'activated'}`, 'success');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `categories/${cat.id}`);
    }
  }

  async function handleDelete(cat: Category) {
    if (!window.confirm(`Delete category "${cat.name}"?`)) return;
    try {
      await deleteDoc(doc(db, 'categories', cat.id));
      showToast('Category deleted', 'info');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `categories/${cat.id}`);
    }
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleAddCategory}
        className="bg-white border border-line rounded-2xl p-6 space-y-4"
      >
        <h2 className="font-display font-semibold text-base">Add / Update Category</h2>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <input
            type="text"
            required
            placeholder="Category Name (e.g. Tablets)"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setSlug(slugify(e.target.value));
            }}
            className="border border-line rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-signal"
          />
          <input
            type="text"
            required
            placeholder="Slug (e.g. tablets)"
            value={slug}
            onChange={(e) => setSlug(slugify(e.target.value))}
            className="border border-line rounded-xl px-3 py-2 text-xs font-data focus:outline-none focus:border-signal"
          />
          <input
            type="text"
            placeholder="Short description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="border border-line rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-signal"
          />
          <div className="flex gap-2">
            <input
              type="number"
              min={1}
              value={order}
              onChange={(e) => setOrder(Number(e.target.value))}
              className="w-20 border border-line rounded-xl px-3 py-2 text-xs font-data"
              title="Display order"
            />
            <button
              type="submit"
              disabled={saving}
              className="flex-1 inline-flex items-center justify-center gap-1.5 bg-signal text-white px-4 py-2 rounded-full text-xs font-medium hover:brightness-110 disabled:opacity-50"
            >
              <Plus size={14} /> Save
            </button>
          </div>
        </div>
      </form>

      <div className="bg-white border border-line rounded-2xl divide-y divide-line">
        {categories.map((cat) => (
          <div key={cat.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-display font-semibold text-sm">
                {cat.name}{' '}
                <span className="font-data text-xs text-steel font-normal">/{cat.slug}</span>
              </p>
              {cat.description && <p className="text-xs text-steel">{cat.description}</p>}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-data text-steel">Order #{cat.order}</span>
              <button
                type="button"
                onClick={() => toggleActive(cat)}
                className={`px-3 py-1 rounded-full text-xs font-data border ${
                  cat.active ? 'border-mint/30 bg-mint/10 text-mint' : 'border-line text-steel'
                }`}
              >
                {cat.active ? 'Active' : 'Hidden'}
              </button>
              <button
                type="button"
                onClick={() => handleDelete(cat)}
                className="p-1.5 rounded-lg text-steel hover:text-signal hover:bg-signal/10"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
