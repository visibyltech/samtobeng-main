import { useEffect, useState } from 'react';
import { collection, doc, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore';
import { CheckCircle2, ExternalLink, XCircle } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { db } from '../../lib/firebase';
import { OperationType, handleFirestoreError } from '../../lib/firestoreError';
import { formatNaira } from '../../lib/format';
import { PaymentRecord } from '../../types';

export function AdminPaymentsTab() {
  const { showToast } = useToast();
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending_verification' | 'verified' | 'rejected'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'payments'),
      (snap) => {
        const list = snap.docs.map((d) => ({ ...(d.data() as PaymentRecord), id: d.id }));
        list.sort((a, b) => {
          const at = (a.createdAt as { seconds?: number })?.seconds || 0;
          const bt = (b.createdAt as { seconds?: number })?.seconds || 0;
          return bt - at;
        });
        setPayments(list);
        setLoading(false);
      },
      (err) => {
        setLoading(false);
        handleFirestoreError(err, OperationType.LIST, 'payments');
      }
    );
    return () => unsub();
  }, []);

  async function updatePaymentStatus(payment: PaymentRecord, status: 'verified' | 'rejected') {
    try {
      await updateDoc(doc(db, 'payments', payment.id), {
        status,
        updatedAt: serverTimestamp(),
      });
      showToast(`Payment marked ${status}`, 'success');
    } catch (err) {
      showToast('Could not update payment status', 'error');
      handleFirestoreError(err, OperationType.UPDATE, `payments/${payment.id}`);
    }
  }

  const filtered = payments.filter((p) =>
    statusFilter === 'all' ? true : p.status === statusFilter
  );

  if (loading) {
    return <div className="h-40 rounded-2xl bg-ink/5 animate-pulse" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {(['all', 'pending_verification', 'verified', 'rejected'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-data border capitalize ${
                statusFilter === st
                  ? 'border-signal bg-signal text-white'
                  : 'border-line bg-white text-steel hover:border-ink'
              }`}
            >
              {st.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
        <span className="text-xs font-data text-steel">{filtered.length} records</span>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-line rounded-2xl p-10 text-center text-sm text-steel">
          No payment records match the filter.
        </div>
      ) : (
        <div className="bg-white border border-line rounded-2xl overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-line bg-paper text-steel font-data uppercase">
              <tr>
                <th className="py-3 px-4">Type / Provider</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Sender &amp; Reference</th>
                <th className="py-3 px-4">Receipt</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td className="py-3 px-4">
                    <p className="font-medium capitalize">{p.type.replace('-', ' ')}</p>
                    <p className="text-[11px] text-steel">{p.provider}</p>
                  </td>
                  <td className="py-3 px-4 font-data font-semibold">{formatNaira(p.amount)}</td>
                  <td className="py-3 px-4">
                    <p>{p.senderAccountName || '—'}</p>
                    <p className="text-[11px] text-steel">
                      {p.senderBankName || ''} {p.reference ? `· Ref: ${p.reference}` : ''}
                    </p>
                  </td>
                  <td className="py-3 px-4">
                    {p.receiptUrl ? (
                      <a
                        href={p.receiptUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-signal underline"
                      >
                        Receipt <ExternalLink size={12} />
                      </a>
                    ) : (
                      <span className="text-steel">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-data px-2.5 py-0.5 rounded-full border border-line capitalize">
                      {p.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="inline-flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => updatePaymentStatus(p, 'verified')}
                        className="inline-flex items-center gap-1 bg-mint text-white px-2.5 py-1 rounded-full text-[11px]"
                      >
                        <CheckCircle2 size={12} /> Verify
                      </button>
                      <button
                        type="button"
                        onClick={() => updatePaymentStatus(p, 'rejected')}
                        className="inline-flex items-center gap-1 border border-signal text-signal px-2.5 py-1 rounded-full text-[11px]"
                      >
                        <XCircle size={12} /> Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
