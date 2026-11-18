import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  CreditCard,
  Database,
  FolderTree,
  Lock,
  Package,
  PiggyBank,
  Settings,
  ShoppingBag,
} from 'lucide-react';
import { AdminCategoriesTab } from '../components/admin/AdminCategoriesTab';
import { AdminMigrationTab } from '../components/admin/AdminMigrationTab';
import { AdminOrdersTab } from '../components/admin/AdminOrdersTab';
import { AdminPaymentsTab } from '../components/admin/AdminPaymentsTab';
import { AdminProductsTab } from '../components/admin/AdminProductsTab';
import { AdminSaveToBuyTab } from '../components/admin/AdminSaveToBuyTab';
import { AdminSettingsTab } from '../components/admin/AdminSettingsTab';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';

type AdminTab =
  | 'products'
  | 'categories'
  | 'orders'
  | 'save-to-buy'
  | 'payments'
  | 'settings'
  | 'migration';

const TABS: { key: AdminTab; label: string; icon: typeof Package }[] = [
  { key: 'products', label: 'Products', icon: Package },
  { key: 'categories', label: 'Categories', icon: FolderTree },
  { key: 'orders', label: 'Orders', icon: ShoppingBag },
  { key: 'save-to-buy', label: 'Save-to-Buy', icon: PiggyBank },
  { key: 'payments', label: 'Payments', icon: CreditCard },
  { key: 'settings', label: 'Website & Payment Settings', icon: Settings },
  { key: 'migration', label: 'Migration & Backup', icon: Database },
];

export function AdminPage() {
  const { authReady, loggedIn, isAdmin, profile, loginWithGoogle } = useAuth();
  const { products, categories, needsCatalogSeed, seeding, seedOriginalCatalog } = useStore();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialTab = (searchParams.get('tab') as AdminTab) || 'products';
  const [activeTab, setActiveTab] = useState<AdminTab>(
    TABS.some((t) => t.key === initialTab) ? initialTab : 'products'
  );

  useEffect(() => {
    const t = searchParams.get('tab') as AdminTab;
    if (t && TABS.some((x) => x.key === t)) {
      setActiveTab(t);
    }
  }, [searchParams]);

  function selectTab(tab: AdminTab) {
    setActiveTab(tab);
    setSearchParams({ tab }, { replace: true });
  }

  if (!authReady) {
    return (
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-14">
        <div className="h-48 rounded-2xl bg-ink/5 animate-pulse" />
      </div>
    );
  }

  if (!loggedIn || !isAdmin) {
    return (
      <div className="mx-auto max-w-md px-4 sm:px-6 py-20 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-signal/10 text-signal flex items-center justify-center mx-auto">
          <Lock size={24} />
        </div>
        <h1 className="font-display font-bold text-2xl">Admin Access Required</h1>
        <p className="text-sm text-steel">
          {loggedIn
            ? `Signed in as ${profile?.email}. Only authorized SAMTOB P&C administrators can access this dashboard.`
            : 'Sign in with an authorized SAMTOB P&C administrator Google account to manage products, orders, and payments.'}
        </p>
        <div className="flex justify-center gap-3 pt-2">
          {!loggedIn ? (
            <button
              type="button"
              onClick={() => loginWithGoogle()}
              className="bg-signal text-white px-6 py-2.5 rounded-full text-sm font-medium"
            >
              Sign In as Admin
            </button>
          ) : (
            <Link
              to="/account/dashboard"
              className="bg-ink text-paper px-6 py-2.5 rounded-full text-sm font-medium"
            >
              Go to Customer Account
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-data text-xs uppercase tracking-widest text-signal mb-1">
            SAMTOB P&amp;C Admin Control
          </p>
          <h1 className="font-display font-bold text-3xl">Store Administration</h1>
        </div>

        <div className="flex items-center gap-3 text-xs font-data">
          <span className="px-3 py-1.5 rounded-full bg-white border border-line">
            {products.length} Products
          </span>
          <span className="px-3 py-1.5 rounded-full bg-white border border-line">
            {categories.length} Categories
          </span>
        </div>
      </div>

      {needsCatalogSeed && (
        <div className="rounded-2xl border border-signal/30 bg-signal/5 p-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-display font-semibold text-sm">
              Firestore catalog is currently empty
            </p>
            <p className="text-xs text-steel">
              Import all 77 original SAMTOB P&amp;C products, categories, and settings into Firestore now.
            </p>
          </div>
          <button
            type="button"
            disabled={seeding}
            onClick={() => seedOriginalCatalog(false)}
            className="bg-signal text-white px-5 py-2.5 rounded-full text-xs font-medium disabled:opacity-50"
          >
            {seeding ? 'Seeding Catalog...' : 'Seed 77 Original Products'}
          </button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-line pb-4">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => selectTab(t.key)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium transition-colors ${
                active
                  ? 'bg-ink text-paper'
                  : 'bg-white border border-line text-steel hover:border-signal hover:text-ink'
              }`}
            >
              <Icon size={14} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Active Tab Content */}
      {activeTab === 'products' && <AdminProductsTab />}
      {activeTab === 'categories' && <AdminCategoriesTab />}
      {activeTab === 'orders' && <AdminOrdersTab />}
      {activeTab === 'save-to-buy' && <AdminSaveToBuyTab />}
      {activeTab === 'payments' && <AdminPaymentsTab />}
      {activeTab === 'settings' && <AdminSettingsTab />}
      {activeTab === 'migration' && <AdminMigrationTab />}
    </div>
  );
}
