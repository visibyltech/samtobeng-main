import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import originalProductsRaw from '../data/originalProducts.json';
import { useAuth } from './AuthContext';
import { DEFAULT_CATEGORIES, DEFAULT_SITE_SETTINGS } from '../lib/defaultData';
import { db } from '../lib/firebase';
import { OperationType, handleFirestoreError } from '../lib/firestoreError';
import { clampStr, computeDiscountPercent, slugify } from '../lib/format';
import { Category, Product, SiteSettingsBundle } from '../types';

interface StoreContextValue {
  products: Product[];
  publishedProducts: Product[];
  categories: Category[];
  settings: SiteSettingsBundle;
  loading: boolean;
  needsCatalogSeed: boolean;
  seeding: boolean;
  seedOriginalCatalog: (forceOverwrite?: boolean) => Promise<number>;
  updateSiteSettings: (
    sectionKey: keyof SiteSettingsBundle,
    payload: unknown
  ) => Promise<void>;
}

const StoreContext = createContext<StoreContextValue | null>(null);

const SETTING_DOC_IDS: (keyof SiteSettingsBundle)[] = [
  'storefront',
  'bankTransferAccount',
  'saveToBuyAccount',
  'bnpl',
  'cloudinary',
  'stores',
  'faqs',
  'testimonials',
  'deliveryTiers',
  'termsDocument',
  'privacyDocument',
];

export function normalizeOriginalProducts(): Product[] {
  const rawList = originalProductsRaw as Array<{
    id: string;
    slug: string;
    name: string;
    brand: string;
    category: string;
    condition: 'new' | 'uk-used';
    price: number;
    oldPrice: number | null;
    stock: number;
    description: string;
    specs?: Record<string, string> | Array<{ label: string; value: string }>;
    images: string[];
    featured?: boolean;
  }>;

  return rawList.map((item) => {
    const specsList = Array.isArray(item.specs)
      ? item.specs
      : item.specs && typeof item.specs === 'object'
        ? Object.entries(item.specs).map(([label, value]) => ({
            label: String(label),
            value: String(value),
          }))
        : [];
    const discountPercent = computeDiscountPercent(item.price, item.oldPrice);
    return {
      id: item.id,
      slug: item.slug || slugify(item.name),
      name: clampStr(item.name, 240),
      brand: clampStr(item.brand, 80) || 'Generic',
      category: (item.category || 'laptops').toLowerCase().trim(),
      condition: item.condition === 'new' ? 'new' : 'uk-used',
      price: Number(item.price) || 0,
      oldPrice: item.oldPrice ? Number(item.oldPrice) : null,
      discountPercent,
      stock: Number.isFinite(item.stock) ? item.stock : 0,
      description: clampStr(item.description, 5000),
      specs: specsList.slice(0, 30),
      images: Array.isArray(item.images) && item.images.length > 0 ? item.images.slice(0, 12) : ['/logo.png'],
      featured: Boolean(item.featured),
      flashSale: Boolean(item.oldPrice && item.oldPrice > item.price),
      published: true,
      tags: [],
    };
  });
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const { isAdmin, authReady } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [settings, setSettings] = useState<SiteSettingsBundle>(DEFAULT_SITE_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const autoSeededRef = useRef(false);

  // Subscribe to products in real time from Firestore
  useEffect(() => {
    if (!authReady) return;
    const productsQuery = isAdmin
      ? collection(db, 'products')
      : query(collection(db, 'products'), where('published', '==', true));

    const unsub = onSnapshot(
      productsQuery,
      (snap) => {
        const list = snap.docs.map((d) => ({ ...(d.data() as Product), id: d.id }));
        list.sort((a, b) => Number(b.featured) - Number(a.featured));
        setProducts(list);
        setLoading(false);
      },
      (error) => {
        setLoading(false);
        handleFirestoreError(error, OperationType.LIST, 'products');
      }
    );

    return () => unsub();
  }, [authReady, isAdmin]);

  // Subscribe to categories in real time from Firestore
  useEffect(() => {
    if (!authReady) return;
    const catQuery = isAdmin
      ? collection(db, 'categories')
      : query(collection(db, 'categories'), where('active', '==', true));

    const unsub = onSnapshot(
      catQuery,
      (snap) => {
        if (snap.empty) {
          setCategories(DEFAULT_CATEGORIES);
        } else {
          const list = snap.docs.map((d) => ({ ...(d.data() as Category), id: d.id }));
          list.sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
          setCategories(list);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'categories');
      }
    );

    return () => unsub();
  }, [authReady, isAdmin]);

  // Subscribe to each known site_settings document in real time using get (no collection list needed)
  useEffect(() => {
    const unsubs = SETTING_DOC_IDS.map((key) =>
      onSnapshot(
        doc(db, 'site_settings', key),
        (snap) => {
          if (!snap.exists()) return;
          const data = snap.data() as { payload?: { value?: unknown } };
          if (data?.payload && 'value' in data.payload) {
            setSettings((prev) => ({
              ...prev,
              [key]: data.payload!.value,
            }));
          }
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, `site_settings/${key}`);
        }
      )
    );

    return () => {
      for (const unsub of unsubs) unsub();
    };
  }, []);

  const seedOriginalCatalog = useCallback(async (forceOverwrite = false): Promise<number> => {
    setSeeding(true);
    try {
      const existingProducts = await getDocs(collection(db, 'products'));
      const existingIds = new Set(existingProducts.docs.map((snapshot) => snapshot.id));
      const normalized = normalizeOriginalProducts();
      const productsToWrite = forceOverwrite
        ? normalized
        : normalized.filter((product) => !existingIds.has(product.id));

      // Add missing original products without overwriting existing store edits.
      for (let i = 0; i < productsToWrite.length; i += 400) {
        const batch = writeBatch(db);
        const chunk = productsToWrite.slice(i, i + 400);
        for (const p of chunk) {
          const ref = doc(db, 'products', p.id);
          batch.set(ref, {
            id: p.id,
            slug: p.slug,
            name: p.name,
            brand: p.brand,
            category: p.category,
            condition: p.condition,
            price: p.price,
            oldPrice: p.oldPrice ?? null,
            discountPercent: p.discountPercent ?? null,
            stock: p.stock,
            description: p.description,
            specs: p.specs || [],
            images: p.images,
            featured: p.featured,
            flashSale: p.flashSale,
            published: p.published,
            tags: p.tags || [],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
        await batch.commit();
      }

      // Seed default categories
      const catBatch = writeBatch(db);
      for (const cat of DEFAULT_CATEGORIES) {
        catBatch.set(doc(db, 'categories', cat.id), {
          ...cat,
          updatedAt: serverTimestamp(),
        });
      }
      await catBatch.commit();

      // Seed default site_settings if missing
      const storefrontSettingSnap = await getDoc(doc(db, 'site_settings', 'storefront'));
      if (forceOverwrite || !storefrontSettingSnap.exists()) {
        const settingsBatch = writeBatch(db);
        for (const key of SETTING_DOC_IDS) {
          settingsBatch.set(doc(db, 'site_settings', key), {
            id: key,
            payload: { value: DEFAULT_SITE_SETTINGS[key] },
            updatedAt: serverTimestamp(),
          });
        }
        await settingsBatch.commit();
      }

      return productsToWrite.length;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'products');
    } finally {
      setSeeding(false);
    }
  }, []);

  // On first Admin login, add any missing products from the recovered catalog.
  useEffect(() => {
    if (authReady && isAdmin && !loading && !autoSeededRef.current) {
      autoSeededRef.current = true;
      seedOriginalCatalog(false).catch((err) => {
        console.error('Auto-seed error:', err);
      });
    }
  }, [authReady, isAdmin, loading, products.length, seedOriginalCatalog]);

  async function updateSiteSettings(sectionKey: keyof SiteSettingsBundle, payloadValue: unknown) {
    const path = `site_settings/${sectionKey}`;
    try {
      await setDoc(doc(db, 'site_settings', sectionKey), {
        id: sectionKey,
        payload: { value: payloadValue },
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  const publishedProducts = products.filter((p) => p.published);

  return (
    <StoreContext.Provider
      value={{
        products,
        publishedProducts,
        categories,
        settings,
        loading,
        needsCatalogSeed: !loading && products.length === 0,
        seeding,
        seedOriginalCatalog,
        updateSiteSettings,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
