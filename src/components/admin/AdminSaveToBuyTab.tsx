import { useEffect, useState } from 'react';
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { CheckCircle2, ChevronDown, ExternalLink, XCircle } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { db } from '../../lib/firebase';
import { OperationType, handleFirestoreError } from '../../lib/firestoreError';
import { formatNaira } from '../../lib/format';
import { SaveToBuyInstallment, SaveToBuyPlan } from '../../types';

export function AdminSaveToBuyTab() {
  const { showToast } = useToast();
  const [plans, setPlans] = useState<SaveToBuyPlan[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [installmentsMap, setInstallmentsMap] = useState<Record<string, SaveToBuyInstallment[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'save_to_buy_plans'),
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
  }, []);

  async function loadInstallments(planId: string) {
    try {
      const snap = await getDocs(collection(db, 'save_to_buy_plans', planId, 'installments'));
      const list = snap.docs.map((d) => ({ ...(d.data() as SaveToBuyInstallment), id: d.id }));
      list.sort((a, b) => {
        const at = (a.createdAt as { seconds?: number })?.seconds || 0;
        const bt = (b.createdAt as { seconds?: number })?.seconds || 0;
        return bt - at;
      });
      setInstallmentsMap((prev) => ({ ...prev, [planId]: list }));
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, `save_to_buy_plans/${planId}/installments`);
    }
  }

  function handleToggleExpand(planId: string) {
    if (expandedId === planId) {
      setExpandedId(null);
    } else {
      setExpandedId(planId);
      loadInstallments(planId);
    }
  }

  async function handleVerifyInstallment(
    plan: SaveToBuyPlan,
    inst: SaveToBuyInstallment,
    decision: 'verified' | 'rejected'
  ) {
    try {
      const batch = writeBatch(db);
      const instRef = doc(db, 'save_to_buy_plans', plan.id, 'installments', inst.id);
      batch.update(instRef, {
        status: decision,
        updatedAt: serverTimestamp(),
      });

      if (decision === 'verified' && inst.status !== 'verified') {
        const newSaved = plan.amountSaved + inst.amount;
        const newCompleted = plan.paymentsCompleted + 1;
        const fullyPaid = newSaved >= plan.targetAmount;
        batch.update(doc(db, 'save_to_buy_plans', plan.id), {
          amountSaved: newSaved,
          paymentsCompleted: newCompleted,
          eligibleForDelivery: fullyPaid,
          status: fullyPaid ? 'completed' : 'active',
          updatedAt: serverTimestamp(),
        });
      }

      await batch.commit();
      await loadInstallments(plan.id);
      showToast(`Instalment ${decision}`, 'success');
    } catch (err) {
      showToast('Failed to update instalment', 'error');
      handleFirestoreError(
        err,
        OperationType.UPDATE,
        `save_to_buy_plans/${plan.id}/installments/${inst.id}`
      );
    }
  }

  async function handleUpdatePlanStatus(plan: SaveToBuyPlan, status: 'active' | 'completed' | 'cancelled') {
    try {
      await updateDoc(doc(db, 'save_to_buy_plans', plan.id), {
        status,
        eligibleForDelivery: status === 'completed' ? true : plan.eligibleForDelivery,
        updatedAt: serverTimestamp(),
      });
      showToast('Plan status updated', 'success');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `save_to_buy_plans/${plan.id}`);
    }
  }

  if (loading) {
    return <div className="h-40 rounded-2xl bg-ink/5 animate-pulse" />;
  }

  if (plans.length === 0) {
    return (
      <div className="bg-white border border-line rounded-2xl p-10 text-center text-sm text-steel">
        No Save-to-Buy layaway plans started yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {plans.map((plan) => {
        const pct = Math.min(100, Math.round((plan.amountSaved / plan.targetAmount) * 100));
        const isOpen = expandedId === plan.id;
        const insts = installmentsMap[plan.id] || [];

        return (
          <div key={plan.id} className="bg-white border border-line rounded-2xl p-5 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-display font-semibold text-base">{plan.productName}</p>
                <p className="text-xs text-steel">
                  {plan.customerName} · {plan.customerEmail} · {plan.customerPhone || 'No phone'}
                </p>
                <p className="text-xs font-data text-steel mt-1 capitalize">
                  {plan.frequency} · {plan.durationMonths} mo ·{' '}
                  {formatNaira(plan.installmentAmount)} / instalment
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={plan.status}
                  onChange={(e) =>
                    handleUpdatePlanStatus(
                      plan,
                      e.target.value as 'active' | 'completed' | 'cancelled'
                    )
                  }
                  className="border border-line rounded-full px-3 py-1 text-xs bg-white"
                >
                  <option value="active">active</option>
                  <option value="completed">completed</option>
                  <option value="cancelled">cancelled</option>
                </select>
                <button
                  type="button"
                  onClick={() => handleToggleExpand(plan.id)}
                  className="inline-flex items-center gap-1 border border-line px-3 py-1 rounded-full text-xs font-medium hover:border-signal"
                >
                  Instalments
                  <ChevronDown size={14} className={isOpen ? 'rotate-180 transition-transform' : ''} />
                </button>
              </div>
            </div>

            <div>
              <div className="w-full h-2 rounded-full bg-ink/10 overflow-hidden">
                <div className="h-full bg-signal" style={{ width: `${pct}%` }} />
              </div>
              <div className="flex justify-between text-xs font-data text-steel mt-1">
                <span>
                  Saved {formatNaira(plan.amountSaved)} / {formatNaira(plan.targetAmount)} ({pct}%)
                </span>
                <span>
                  {plan.paymentsCompleted} / {plan.totalPayments} payments ·{' '}
                  {plan.eligibleForDelivery ? 'Eligible for Delivery' : 'In Progress'}
                </span>
              </div>
            </div>

            {isOpen && (
              <div className="border-t border-line pt-3 space-y-2">
                {insts.length === 0 ? (
                  <p className="text-xs text-steel">No instalments submitted for this plan yet.</p>
                ) : (
                  insts.map((inst) => (
                    <div
                      key={inst.id}
                      className="rounded-xl border border-line bg-paper p-3 flex flex-wrap items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <p className="font-data font-semibold text-sm">{formatNaira(inst.amount)}</p>
                        <p className="text-steel">
                          {inst.senderAccountName || 'Transfer'} · {inst.senderBankName || '—'} · Ref:{' '}
                          {inst.reference || '—'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {inst.receiptUrl && (
                          <a
                            href={inst.receiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-signal underline mr-2"
                          >
                            Receipt <ExternalLink size={12} />
                          </a>
                        )}
                        <span className="font-data px-2.5 py-0.5 rounded-full border border-line capitalize">
                          {inst.status.replace(/_/g, ' ')}
                        </span>
                        {inst.status === 'pending_verification' && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleVerifyInstallment(plan, inst, 'verified')}
                              className="inline-flex items-center gap-1 bg-mint text-white px-3 py-1 rounded-full font-medium"
                            >
                              <CheckCircle2 size={12} /> Verify
                            </button>
                            <button
                              type="button"
                              onClick={() => handleVerifyInstallment(plan, inst, 'rejected')}
                              className="inline-flex items-center gap-1 border border-signal text-signal px-3 py-1 rounded-full font-medium"
                            >
                              <XCircle size={12} /> Reject
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
