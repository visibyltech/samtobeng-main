import { useEffect, useState } from 'react';
import { collection, doc, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore';
import { CheckCircle2, ExternalLink, XCircle } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { db } from '../../lib/firebase';
import { OperationType, handleFirestoreError } from '../../lib/firestoreError';
import { clampStr, formatNaira } from '../../lib/format';
import { Order, OrderStatus, PaymentStatus } from '../../types';

export function AdminOrdersTab() {
  const { showToast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'orders'),
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
  }, []);

  async function updateOrder(
    orderId: string,
    patch: { paymentStatus?: PaymentStatus; orderStatus?: OrderStatus; adminNote?: string }
  ) {
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        ...patch,
        updatedAt: serverTimestamp(),
      });
      showToast('Order updated', 'success');
    } catch (err) {
      showToast('Failed to update order', 'error');
      handleFirestoreError(err, OperationType.UPDATE, `orders/${orderId}`);
    }
  }

  if (loading) {
    return <div className="h-40 rounded-2xl bg-ink/5 animate-pulse" />;
  }

  if (orders.length === 0) {
    return (
      <div className="bg-white border border-line rounded-2xl p-10 text-center text-sm text-steel">
        No customer orders placed yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <div key={order.id} className="bg-white border border-line rounded-2xl p-5 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-3">
            <div>
              <p className="font-data font-bold text-base">{order.orderNumber}</p>
              <p className="text-xs text-steel">
                {order.customerName} · {order.email} · {order.phone}
              </p>
              <p className="text-xs text-steel mt-0.5">
                {order.address} ({order.region} / {order.deliveryMethod})
              </p>
            </div>

            <div className="text-right">
              <p className="font-data font-bold text-lg">{formatNaira(order.total)}</p>
              <p className="text-[11px] font-data text-steel capitalize">
                {order.paymentMethod.replace('-', ' ')}
              </p>
            </div>
          </div>

          {/* Ordered items */}
          <div className="text-xs space-y-1">
            {order.items.map((item, i) => (
              <div key={i} className="flex justify-between text-ink">
                <span>
                  {item.qty}× {item.name}
                </span>
                <span className="font-data">{formatNaira(item.price * item.qty)}</span>
              </div>
            ))}
          </div>

          {/* Receipt & Transfer Details */}
          {(order.receiptUrl || order.senderAccountName || order.paymentReference) && (
            <div className="rounded-xl bg-paper border border-line p-3 text-xs flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-ink">Submitted Transfer Info:</p>
                <p className="text-steel">
                  Sender: {order.senderAccountName || '—'} · Bank: {order.senderBankName || '—'} · Ref:{' '}
                  {order.paymentReference || '—'}
                </p>
              </div>
              {order.receiptUrl && (
                <a
                  href={order.receiptUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-signal font-medium underline"
                >
                  View Receipt <ExternalLink size={12} />
                </a>
              )}
            </div>
          )}

          {/* Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-line">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-steel">Order Status:</span>
              <select
                value={order.orderStatus}
                onChange={(e) =>
                  updateOrder(order.id, { orderStatus: e.target.value as OrderStatus })
                }
                className="border border-line rounded-full px-3 py-1.5 text-xs bg-white"
              >
                {(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'] as const).map(
                  (st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  )
                )}
              </select>

              <span className="text-xs text-steel ml-2">Payment:</span>
              <span className="text-xs font-data px-2.5 py-1 rounded-full bg-ink/5 capitalize">
                {order.paymentStatus.replace(/_/g, ' ')}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={notes[order.id] ?? order.adminNote ?? ''}
                onChange={(e) => setNotes({ ...notes, [order.id]: e.target.value })}
                placeholder="Admin note..."
                className="border border-line rounded-full px-3 py-1.5 text-xs"
              />
              <button
                type="button"
                onClick={() =>
                  updateOrder(order.id, {
                    paymentStatus: 'verified',
                    orderStatus: order.orderStatus === 'pending' ? 'confirmed' : order.orderStatus,
                    adminNote: clampStr(notes[order.id] ?? order.adminNote ?? '', 500),
                  })
                }
                className="inline-flex items-center gap-1 bg-mint text-white px-3 py-1.5 rounded-full text-xs font-medium"
              >
                <CheckCircle2 size={13} /> Verify Payment
              </button>
              <button
                type="button"
                onClick={() =>
                  updateOrder(order.id, {
                    paymentStatus: 'rejected',
                    adminNote: clampStr(notes[order.id] ?? order.adminNote ?? '', 500),
                  })
                }
                className="inline-flex items-center gap-1 border border-signal text-signal px-3 py-1.5 rounded-full text-xs font-medium"
              >
                <XCircle size={13} /> Reject
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
