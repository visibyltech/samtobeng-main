import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LayoutDashboard, LogOut, Package, PiggyBank, Save, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export function AccountDashboardPage() {
  const { user, profile, authReady, loggedIn, isAdmin, updateCustomerProfile, logout } = useAuth();
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setPhone(profile.phone || '');
      setAddress(profile.address || '');
    }
  }, [profile]);

  if (!authReady) {
    return (
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="h-48 rounded-2xl bg-ink/5 animate-pulse" />
      </div>
    );
  }

  if (!loggedIn || !user) {
    return (
      <div className="mx-auto max-w-md px-4 sm:px-6 py-20 text-center space-y-4">
        <h1 className="font-display font-bold text-2xl">Sign in to view your dashboard</h1>
        <p className="text-sm text-steel">Access your orders, Save-to-Buy plans, and delivery address.</p>
        <Link
          to="/account/login"
          className="inline-flex bg-signal text-white px-6 py-3 rounded-full text-sm font-medium"
        >
          Sign In
        </Link>
      </div>
    );
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await updateCustomerProfile({ name, phone, address });
      showToast('Profile saved', 'success');
    } catch {
      showToast('Could not update profile', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-data text-xs uppercase tracking-widest text-steel mb-1">
            Customer Account
          </p>
          <h1 className="font-display font-bold text-3xl">
            Welcome, {profile?.name || user.displayName || 'Customer'}
          </h1>
          <p className="text-xs font-data text-steel mt-1">{profile?.email || user.email}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {isAdmin && (
            <Link
              to="/admin"
              className="inline-flex items-center gap-2 bg-signal text-white px-4 py-2 rounded-full text-xs font-medium"
            >
              <Shield size={14} /> Admin Dashboard
            </Link>
          )}
          <button
            type="button"
            onClick={() => logout()}
            className="inline-flex items-center gap-2 border border-line px-4 py-2 rounded-full text-xs font-medium text-steel hover:text-signal hover:border-signal transition-colors"
          >
            <LogOut size={14} /> Log Out
          </button>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          to="/account/orders"
          className="bg-white border border-line rounded-2xl p-5 hover:border-signal transition-colors flex items-center gap-4"
        >
          <div className="w-11 h-11 rounded-xl bg-signal/10 text-signal flex items-center justify-center shrink-0">
            <Package size={20} />
          </div>
          <div>
            <p className="font-display font-semibold text-base">My Orders</p>
            <p className="text-xs text-steel">Track delivery &amp; payment verification</p>
          </div>
        </Link>

        <Link
          to="/account/save-to-buy"
          className="bg-white border border-line rounded-2xl p-5 hover:border-signal transition-colors flex items-center gap-4"
        >
          <div className="w-11 h-11 rounded-xl bg-signal/10 text-signal flex items-center justify-center shrink-0">
            <PiggyBank size={20} />
          </div>
          <div>
            <p className="font-display font-semibold text-base">Save-to-Buy Plans</p>
            <p className="text-xs text-steel">Manage instalments &amp; upload receipts</p>
          </div>
        </Link>

        <Link
          to="/products"
          className="bg-white border border-line rounded-2xl p-5 hover:border-signal transition-colors flex items-center gap-4"
        >
          <div className="w-11 h-11 rounded-xl bg-ink/5 text-ink flex items-center justify-center shrink-0">
            <LayoutDashboard size={20} />
          </div>
          <div>
            <p className="font-display font-semibold text-base">Browse Store</p>
            <p className="text-xs text-steel">Laptops, phones &amp; gadgets</p>
          </div>
        </Link>
      </div>

      {/* Profile Editor */}
      <form onSubmit={handleSave} className="bg-white border border-line rounded-2xl p-6 space-y-4">
        <h2 className="font-display font-semibold text-lg">Saved Profile &amp; Delivery Address</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-steel mb-1">Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-line rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-signal"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-steel mb-1">Phone Number</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 08012345678"
              className="w-full border border-line rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-signal"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-steel mb-1">Default Delivery Address</label>
          <textarea
            rows={2}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Street address, landmark, city & state"
            className="w-full border border-line rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-signal"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 bg-ink text-paper px-6 py-2.5 rounded-full text-xs font-medium hover:bg-signal transition-colors disabled:opacity-60"
        >
          <Save size={14} /> {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}
