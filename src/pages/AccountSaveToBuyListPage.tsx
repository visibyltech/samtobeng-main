import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { ArrowRight, PiggyBank } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getOptimizedImageUrl } from '../lib/cloudinary';
import { db } from '../lib/firebase';
import { OperationType, handleFirestoreError } from '../lib/firestoreError';
import { formatNaira } from '../lib/format';
import { SaveToBuyPlan } from '../types';

export function AccountSaveToBuyListPage() {
  const { user, authReady, loggedIn } = useAuth();
  const [plans, setPlans] = useState<SaveToBuyPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authReady) return;
    if (!user) {
      setLoading(false);
      return;
    }
    const q = query(collection(db, 'save_to_buy_plans'), where('userId', '==', user.uid));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ ...(d.data() as SaveToBuyPlan), id: d.id }));
        list.sort((a, b) => {
          const at = (a.createdAt as { seconds?: number })?.seconds || 0;
          const bt = (b.createdAt as { seconds?: number })?.seconds || 0;
          return bt - at;
        });
        setPlans(list);
        setLoading(false);
      },
      (err) => {
        setLoading(false);
        handleFirestoreError(err, OperationType.LIST, 'save_to_buy_plans');
      }
    );
    return () => unsub();
  }, [authReady, user]);

  if (!authReady || loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-14 space-y-4">
        <div className="h-32 rounded-2xl bg-ink/5 animate-pulse" />
      </div>
    );
  }

  if (!loggedIn) {
    return (
      <div className="mx-auto max-w-md px-4 sm:px-6 py-20 text-center space-y-4">
        <h1 className="font-display font-bold text-2xl">Sign in to manage Save-to-Buy plans</h1>
        <Link
          to="/account/login"
          className="inline-flex bg-signal text-white px-6 py-3 rounded-full text-sm font-medium"
        >
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12 space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <p className="font-data text-xs uppercase tracking-widest text-steel mb-1">Layaway</p>
          <h1 className="font-display font-bold text-3xl">My Save-to-Buy Plans</h1>
        </div>
        <Link to="/account/dashboard" className="text-xs text-steel hover:text-signal underline">
          Back to dashboard
        </Link>
      </div>

      {plans.length === 0 ? (
        <div className="bg-white border border-line rounded-2xl p-12 text-center space-y-3">
          <PiggyBank size={28} className="mx-auto text-steel" />
          <p className="font-display font-semibold text-lg">No Save-to-Buy plans yet</p>
          <p className="text-sm text-steel max-w-md mx-auto">
            Open any device page and click &ldquo;Save Toward This Device&rdquo; to set up weekly or monthly instalments over 1 to 12 months.
          </p>
          <Link
            to="/products"
            className="inline-flex items-center gap-2 bg-ink text-paper px-5 py-2.5 rounded-full text-xs font-medium hover:bg-signal transition-colors"
          >
            Browse Devices <ArrowRight size={14} />
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {plans.map((plan) => {
            const pct = Math.min(100, Math.round((plan.amountSaved / plan.targetAmount) * 100));
            return (
              <Link
                key={plan.id}
                to={`/account/save-to-buy/${plan.id}`}
                className="block bg-white border border-line rounded-2xl p-5 hover:border-signal transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <img
                    src={getOptimizedImageUrl(plan.productImage, 160)}
                    alt={plan.productName}
                    referrerPolicy="no-referrer"
                    className="w-16 h-16 rounded-xl bg-[#F5F4F0] object-contain p-1.5 shrink-0"
                  />
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h2 className="font-display font-semibold text-base line-clamp-1">
                        {plan.productName}
                      </h2>
                      <span className="text-[11px] font-data px-2.5 py-0.5 rounded-full border border-line capitalize">
                        {plan.status}
                      </span>
                    </div>

                    <div className="w-full h-2 rounded-full bg-ink/10 overflow-hidden">
                      <div className="h-full bg-signal transition-all" style={{ width: `${pct}%` }} />
                    </div>

                    <div className="flex flex-wrap justify-between text-xs font-data text-steel">
                      <span>
                        Saved {formatNaira(plan.amountSaved)} of {formatNaira(plan.targetAmount)} ({pct}%)
                      </span>
                      <span>
                        {formatNaira(plan.installmentAmount)} / {plan.frequency === 'weekly' ? 'wk' : 'mo'}
                      </span>
                    </div>
                  </div>
                  <ArrowRight size={16} className="text-steel shrink-0 hidden sm:block" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
