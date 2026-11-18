import React, { createContext, useContext, useEffect, useState } from 'react';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { db } from '../lib/firebase';
import { CartItem } from '../types';

const CART_STORAGE_KEY = 'samtob_cart';

interface CartContextValue {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'qty'>, qty?: number) => void;
  removeItem: (productId: string) => void;
  updateQty: (productId: string, qty: number) => void;
  syncStockCaps: (stockMap: Record<string, number>) => void;
  clear: () => void;
  subtotal: number;
  count: number;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user, authReady } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage immediately
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setItems(parsed);
      }
    } catch {
      // Ignore storage errors
    }
    setHydrated(true);
  }, []);

  // Merge/load persisted Firestore cart when user authenticates
  useEffect(() => {
    if (!authReady || !user) return;
    const cartDocRef = doc(db, 'users', user.uid, 'cart', 'current');
    getDoc(cartDocRef)
      .then((snap) => {
        if (snap.exists()) {
          const remoteItems = (snap.data()?.items || []) as CartItem[];
          setItems((local) => {
            if (local.length === 0) return remoteItems;
            const merged = [...local];
            for (const r of remoteItems) {
              if (!merged.find((m) => m.productId === r.productId)) {
                merged.push(r);
              }
            }
            return merged;
          });
        }
      })
      .catch((err) => {
        console.warn('Could not read remote cart:', err);
      });
  }, [authReady, user]);

  // Persist changes to localStorage and Firestore
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Ignore quota issues
    }
    if (authReady && user) {
      const cartDocRef = doc(db, 'users', user.uid, 'cart', 'current');
      setDoc(cartDocRef, {
        userId: user.uid,
        items: items.slice(0, 50),
        updatedAt: serverTimestamp(),
      }).catch((err) => {
        console.warn('Could not persist remote cart:', err);
      });
    }
  }, [items, hydrated, authReady, user]);

  function addItem(newItem: Omit<CartItem, 'qty'>, qty = 1) {
    if (newItem.stock <= 0) return;
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === newItem.productId);
      if (existing) {
        return prev.map((i) =>
          i.productId === newItem.productId
            ? { ...i, ...newItem, qty: Math.min(i.qty + qty, newItem.stock) }
            : i
        );
      }
      return [...prev, { ...newItem, qty: Math.max(1, Math.min(qty, newItem.stock)) }];
    });
  }

  function removeItem(productId: string) {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }

  function updateQty(productId: string, qty: number) {
    setItems((prev) =>
      prev.map((i) =>
        i.productId === productId
          ? { ...i, qty: Math.max(1, Math.min(qty, Math.max(1, i.stock))) }
          : i
      )
    );
  }

  function syncStockCaps(stockMap: Record<string, number>) {
    setItems((prev) =>
      prev.map((i) => {
        const latestStock = stockMap[i.productId];
        if (typeof latestStock === 'number') {
          return {
            ...i,
            stock: latestStock,
            qty: latestStock > 0 ? Math.min(i.qty, latestStock) : i.qty,
          };
        }
        return i;
      })
    );
  }

  function clear() {
    setItems([]);
  }

  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const count = items.reduce((sum, i) => sum + i.qty, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQty,
        syncStockCaps,
        clear,
        subtotal,
        count,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
