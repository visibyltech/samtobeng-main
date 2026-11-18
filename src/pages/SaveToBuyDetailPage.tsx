import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { ArrowLeft, CheckCircle2, Clock, PiggyBank, UploadCloud, XCircle } from 'lucide-react';
import { CloudinaryUploader } from '../components/CloudinaryUploader';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { useToast } from '../context/ToastContext';
import { getOptimizedImageUrl } from '../lib/cloudinary';
import { db } from '../lib/firebase';
import { OperationType, handleFirestoreError } from '../lib/firestoreError';
import { clampStr, formatNaira } from '../lib/format';
import { SaveToBuyInstallment, SaveToBuyPlan } from '../types';

export function SaveToBuyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, authReady } = useAuth();
  const { settings } = useStore();
  const { showToast } = useToast();

  const [plan, setPlan] = useState<SaveToBuyPlan | null>(null);
  const [installments, setInstallments] = useState<SaveToBuyInstallment[]>([]);
  const [loading, setLoading] = useState(true);

  const [amount, setAmount] = useState('');
  const [senderAccountName, setSenderAccountName] = useState('');
  const [senderBankName, setSenderBankName] = useState('');
  const [reference, setReference] = useState('');
  const [receiptImages, setReceiptImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!id || !authReady) return;
    const unsubPlan = onSnapshot(
      doc(db, 'save_to_buy_plans', id),
      (snap) => {
        if (snap.exists()) {
          const data = { ...(snap.data() as SaveToBuyPlan), id: snap.id };
          setPlan(data);
          setAmount((prev) => prev || String(data.installmentAmount));
          if (data.sourceAccountName && !senderAccountName) setSenderAccountName(data.sourceAccountName);
          if (data.sourceBankName && !senderBankName) setSenderBankName(data.sourceBankName);
        } else {
          setPlan(null);
        }
        setLoading(false);
      },
      (err) => {
        setLoading(false);
        handleFirestoreError(err, OperationType.GET, `save_to_buy_plans/${id}`);
      }
    );

    return () => unsubPlan();
  }, [id, authReady]);

  useEffect(() => {
    if (!id || !authReady || !user) return;
    const q = query(
      collection(db, 'save_to_buy_plans', id, 'installments'),
      where('userId', '==', user.uid)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ ...(d.data() as SaveToBuyInstallment), id: d.id }));
        list.sort((a, b) => {
          const at = (a.createdAt as { seconds?: number })?.seconds || 0;
          const bt = (b.createdAt as { seconds?: number })?.seconds || 0;
          return bt - at;
        });
        setInstallments(list);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, `save_to_buy_plans/${id}/installments`);
      }
    );
    return () => unsub();
  }, [id, authReady, user]);

  async function handleSubmitInstallment(e: React.FormEvent) {
    e.preventDefault();
    if (!plan || !user) return;
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      showToast('Enter a valid transfer amount', 'error');
      return;
    }

    setSubmitting(true);
    const instId = `inst_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`;
    const paymentId = `pay_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`;
    const receiptUrl = receiptImages[0] || '';

    try {
      await setDoc(doc(db, 'save_to_buy_plans', plan.id, 'installments', instId), {
        id: instId,
        planId: plan.id,
        userId: user.uid,
        amount: numericAmount,
        ...(senderAccountName.trim()
          ? { senderAccountName: clampStr(senderAccountName, 120) }
          : {}),
        ...(senderBankName.trim() ? { senderBankName: clampStr(senderBankName, 120) } : {}),
        ...(reference.trim() ? { reference: clampStr(reference, 120) } : {}),
        ...(receiptUrl ? { receiptUrl: clampStr(receiptUrl, 1000) } : {}),
        status: 'pending_verification',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await setDoc(doc(db, 'payments', paymentId), {
        id: paymentId,
        userId: user.uid,
        planId: plan.id,
        type: 'save-to-buy',
        provider: settings.saveToBuyAccount.bankName || 'Access Bank',
        amount: numericAmount,
        ...(reference.trim() ? { reference: clampStr(reference, 120) } : {}),
        ...(senderAccountName.trim()
          ? { senderAccountName: clampStr(senderAccountName, 120) }
          : {}),
        ...(senderBankName.trim() ? { senderBankName: clampStr(senderBankName, 120) } : {}),
        ...(receiptUrl ? { receiptUrl: clampStr(receiptUrl, 1000) } : {}),
        status: 'pending_verification',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setReference('');
      setReceiptImages([]);
      showToast('Instalment submitted! Admin will verify and update your progress.', 'success');
    } catch (err) {
      showToast('Could not submit instalment', 'error');
      handleFirestoreError(err, OperationType.CREATE, `save_to_buy_plans/${plan.id}/installments/${instId}`);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancelPlan() {
    if (!plan || plan.status !== 'active') return;
    setCancelling(true);
    try {
      await updateDoc(doc(db, 'save_to_buy_plans', plan.id), {
        status: 'cancelled',
        updatedAt: serverTimestamp(),
      });
      showToast('Save-to-Buy plan cancelled', 'info');
    } catch (err) {
      showToast('Could not cancel plan', 'error');
      handleFirestoreError(err, OperationType.UPDATE, `save_to_buy_plans/${plan.id}`);
    } finally {
      setCancelling(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="h-56 rounded-2xl bg-ink/5 animate-pulse" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-20 text-center space-y-4">
        <h1 className="font-display font-bold text-2xl">Save-to-Buy Plan Not Found</h1>
        <Link
          to="/account/save-to-buy"
          className="inline-flex bg-ink text-paper px-6 py-3 rounded-full text-sm font-medium"
        >
          Back to Plans
        </Link>
      </div>
    );
  }

  const pct = Math.min(100, Math.round((plan.amountSaved / plan.targetAmount) * 100));
  const remaining = Math.max(0, plan.targetAmount - plan.amountSaved);
  const acct = settings.saveToBuyAccount;

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <Link
        to="/account/save-to-buy"
        className="inline-flex items-center gap-1.5 text-sm text-steel hover:text-signal"
      >
        <ArrowLeft size={15} /> Back to Save-to-Buy Plans
      </Link>

      {/* Plan Progress Header */}
      <div className="bg-white border border-line rounded-2xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <img
            src={getOptimizedImageUrl(plan.productImage, 200)}
            alt={plan.productName}
            referrerPolicy="no-referrer"
            className="w-20 h-20 rounded-xl bg-[#F5F4F0] object-contain p-2 shrink-0"
          />
          <div className="flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-data text-xs uppercase tracking-widest text-steel">
                Save-to-Buy Plan
              </p>
              <div className="flex items-center gap-2">
                {plan.eligibleForDelivery && (
                  <span className="text-xs font-data px-3 py-1 rounded-full bg-mint/10 text-mint font-medium">
                    Eligible for Delivery
                  </span>
                )}
                <span className="text-xs font-data px-3 py-1 rounded-full border border-line capitalize">
                  {plan.status}
                </span>
              </div>
            </div>
            <h1 className="font-display font-bold text-xl sm:text-2xl mt-1">{plan.productName}</h1>
            <p className="text-xs text-steel font-data mt-1 capitalize">
              {plan.frequency} plan · {plan.durationMonths} month{plan.durationMonths > 1 ? 's' : ''} ·{' '}
              {formatNaira(plan.installmentAmount)} per {plan.frequency === 'weekly' ? 'week' : 'month'}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="w-full h-3 rounded-full bg-ink/10 overflow-hidden">
            <div className="h-full bg-signal transition-all" style={{ width: `${pct}%` }} />
          </div>
          <div className="flex flex-wrap justify-between text-xs font-data">
            <span className="text-ink font-semibold">
              Saved: {formatNaira(plan.amountSaved)} ({pct}%)
            </span>
            <span className="text-steel">
              Remaining: {formatNaira(remaining)} · Target: {formatNaira(plan.targetAmount)}
            </span>
          </div>
        </div>

        {plan.status === 'active' && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleCancelPlan}
              disabled={cancelling}
              className="text-xs text-steel hover:text-signal underline"
            >
              {cancelling ? 'Cancelling...' : 'Cancel Plan'}
            </button>
          </div>
        )}
      </div>

      {/* Transfer Instructions + Submit Instalment */}
      {plan.status === 'active' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          <div className="rounded-2xl border border-signal/20 bg-signal/5 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <PiggyBank size={18} className="text-signal" />
              <h2 className="font-display font-semibold text-base">
                Save-to-Buy Transfer Account
              </h2>
            </div>
            <p className="text-xs text-steel leading-relaxed">{acct.instructions}</p>
            <div className="divide-y divide-signal/10 text-xs font-data">
              <div className="py-2 flex justify-between">
                <span className="text-steel">Bank</span>
                <span className="font-semibold text-ink">{acct.bankName}</span>
              </div>
              <div className="py-2 flex justify-between">
                <span className="text-steel">Account Number</span>
                <span className="font-semibold text-ink">{acct.accountNumber}</span>
              </div>
              <div className="py-2 flex justify-between">
                <span className="text-steel">Account Name</span>
                <span className="font-semibold text-ink">{acct.accountName}</span>
              </div>
            </div>
          </div>

          <form
            onSubmit={handleSubmitInstallment}
            className="bg-white border border-line rounded-2xl p-5 space-y-3.5"
          >
            <div className="flex items-center gap-2">
              <UploadCloud size={18} className="text-signal" />
              <h2 className="font-display font-semibold text-base">Submit Instalment Payment</h2>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-steel mb-1">Amount Paid (₦) *</label>
              <input
                type="number"
                required
                min={100}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full border border-line rounded-xl px-3.5 py-2 text-xs font-data focus:outline-none focus:border-signal"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                value={senderAccountName}
                onChange={(e) => setSenderAccountName(e.target.value)}
                placeholder="Sender Account Name"
                className="border border-line rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-signal"
              />
              <input
                type="text"
                value={senderBankName}
                onChange={(e) => setSenderBankName(e.target.value)}
                placeholder="Sender Bank Name"
                className="border border-line rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-signal"
              />
            </div>

            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Transfer Reference / Session ID"
              className="w-full border border-line rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-signal"
            />

            <CloudinaryUploader
              images={receiptImages}
              onChange={setReceiptImages}
              folder="samtobpc/receipts"
              multiple={false}
              maxFiles={1}
              label="Upload Transfer Receipt"
            />

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-signal text-white py-2.5 rounded-full text-xs font-medium hover:brightness-110 transition-all disabled:opacity-60"
            >
              {submitting ? 'Submitting...' : 'Submit Instalment for Verification'}
            </button>
          </form>
        </div>
      )}

      {/* Installment History */}
      <div className="bg-white border border-line rounded-2xl p-6 space-y-4">
        <h2 className="font-display font-semibold text-base">
          Instalment History ({installments.length})
        </h2>

        {installments.length === 0 ? (
          <p className="text-sm text-steel">No instalments submitted yet.</p>
        ) : (
          <div className="divide-y divide-line">
            {installments.map((inst) => (
              <div
                key={inst.id}
                className="py-3 flex flex-wrap items-center justify-between gap-3 text-sm"
              >
                <div>
                  <p className="font-data font-semibold">{formatNaira(inst.amount)}</p>
                  <p className="text-xs text-steel">
                    {inst.senderAccountName || 'Transfer'} {inst.senderBankName ? `· ${inst.senderBankName}` : ''}{' '}
                    {inst.reference ? `· Ref: ${inst.reference}` : ''}
                  </p>
                  {inst.adminNote && (
                    <p className="text-xs text-signal mt-0.5">Note: {inst.adminNote}</p>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {inst.receiptUrl && (
                    <a
                      href={inst.receiptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-signal underline"
                    >
                      View Receipt
                    </a>
                  )}
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-data px-2.5 py-1 rounded-full ${
                      inst.status === 'verified'
                        ? 'bg-mint/10 text-mint'
                        : inst.status === 'rejected'
                          ? 'bg-signal/10 text-signal'
                          : 'bg-ink/5 text-steel'
                    }`}
                  >
                    {inst.status === 'verified' && <CheckCircle2 size={12} />}
                    {inst.status === 'rejected' && <XCircle size={12} />}
                    {inst.status === 'pending_verification' && <Clock size={12} />}
                    {inst.status.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
