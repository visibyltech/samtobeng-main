import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { ArrowRight, Package } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { OperationType, handleFirestoreError } from '../lib/firestoreError';
import { formatNaira } from '../lib/format';
import { Order } from '../types';

export function AccountOrdersPage() {
  const { user, authReady, loggedIn } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authReady) return;
    if (!user) {
      setLoading(false);
      return;
    }
    const q = query(collection(db, 'orders'), where('userId', '==', user.uid));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ ...(d.data() as Order), id: d.id }));
        list.sort((a, b) => {
          const at = (a.createdAt as { seconds?: number })?.seconds || 0;
          const bt = (b.createdAt as { seconds?: number })?.seconds || 0;
          return bt - at;
        });
        setOrders(list);
        setLoading(false);
      },
      (err) => {
        setLoading(false);
        handleFirestoreError(err, OperationType.LIST, 'orders');
      }
    );
    return () => unsub();
  }, [authReady, user]);

  if (!authReady || loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-14 space-y-4">
        <div className="h-28 rounded-2xl bg-ink/5 animate-pulse" />
        <div className="h-28 rounded-2xl bg-ink/5 animate-pulse" />
      </div>
    );
  }

  if (!loggedIn) {
    return (
      <div className="mx-auto max-w-md px-4 sm:px-6 py-20 text-center space-y-4">
        <h1 className="font-display font-bold text-2xl">Sign in to view your orders</h1>
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
          <p className="font-data text-xs uppercase tracking-widest text-steel mb-1">Account</p>
          <h1 className="font-display font-bold text-3xl">My Orders</h1>
        </div>
        <Link to="/account/dashboard" className="text-xs text-steel hover:text-signal underline">
          Back to dashboard
        </Link>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white border border-line rounded-2xl p-12 text-center space-y-3">
          <Package size={28} className="mx-auto text-steel" />
          <p className="font-display font-semibold text-lg">No orders yet</p>
          <p className="text-sm text-steel">When you place an order, you can track it and upload payment proof here.</p>
          <Link
            to="/products"
            className="inline-flex items-center gap-2 bg-ink text-paper px-5 py-2.5 rounded-full text-xs font-medium hover:bg-signal transition-colors"
          >
            Shop Products <ArrowRight size={14} />
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Link
              key={order.id}
              to={`/order-confirmation/${order.id}`}
              className="block bg-white border border-line rounded-2xl p-5 hover:border-signal transition-colors"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-data font-semibold text-base">{order.orderNumber}</p>
                  <p className="text-xs text-steel mt-0.5">
                    {order.items.length} item{order.items.length > 1 ? 's' : ''} ·{' '}
                    <span className="capitalize">{order.paymentMethod.replace('-', ' ')}</span>
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="font-data font-bold text-base">{formatNaira(order.total)}</p>
                    <p className="text-[11px] font-data text-steel capitalize">
                      Order: {order.orderStatus} · Payment: {order.paymentStatus.replace(/_/g, ' ')}
                    </p>
                  </div>
                  <ArrowRight size={16} className="text-steel" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
