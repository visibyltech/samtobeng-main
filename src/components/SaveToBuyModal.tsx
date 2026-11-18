import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { PiggyBank, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { useToast } from '../context/ToastContext';
import { db } from '../lib/firebase';
import { OperationType, handleFirestoreError } from '../lib/firestoreError';
import { clampStr, formatNaira } from '../lib/format';
import { SaveToBuyFrequency } from '../types';

interface SaveToBuyModalProps {
  productId: string;
  productSlug: string;
  productName: string;
  productImage: string;
  price: number;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function SaveToBuyModal({
  productId,
  productSlug,
  productName,
  productImage,
  price,
  open: controlledOpen,
  onOpenChange,
}: SaveToBuyModalProps) {
  const isControlled = controlledOpen !== undefined && onOpenChange !== undefined;
  const [internalOpen, setInternalOpen] = useState(false);
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? onOpenChange : setInternalOpen;

  const { user, profile, loggedIn } = useAuth();
  const { settings } = useStore();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [frequency, setFrequency] = useState<SaveToBuyFrequency>('monthly');
  const [months, setMonths] = useState(3);
  const [submitting, setSubmitting] = useState(false);
  const [diffAccount, setDiffAccount] = useState(false);
  const [senderName, setSenderName] = useState('');
  const [senderBank, setSenderBank] = useState('');
  const [customerPhone, setCustomerPhone] = useState(profile?.phone || '');

  const totalPayments = frequency === 'weekly' ? months * 4 : months;
  const installmentAmount = Math.ceil(price / totalPayments);
  const acct = settings.saveToBuyAccount;

  async function handleStartSaving() {
    if (!user) return;
    setSubmitting(true);
    const planId = `stb_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`;
    const path = `save_to_buy_plans/${planId}`;
    try {
      await setDoc(doc(db, 'save_to_buy_plans', planId), {
        id: planId,
        userId: user.uid,
        customerName: clampStr(profile?.name || user.displayName || 'Customer', 120),
        customerEmail: clampStr(profile?.email || user.email || '', 180),
        customerPhone: clampStr(customerPhone || profile?.phone || '', 30),
        productId,
        productSlug: clampStr(productSlug, 220),
        productName: clampStr(productName, 240),
        productImage: clampStr(productImage, 1000),
        targetAmount: price,
        amountSaved: 0,
        frequency,
        durationMonths: months,
        totalPayments,
        installmentAmount,
        paymentsCompleted: 0,
        ...(diffAccount && senderName.trim()
          ? { sourceAccountName: clampStr(senderName, 120) }
          : {}),
        ...(diffAccount && senderBank.trim()
          ? { sourceBankName: clampStr(senderBank, 120) }
          : {}),
        status: 'active',
        eligibleForDelivery: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      showToast('Save-to-Buy plan started', 'success');
      setOpen(false);
      navigate(`/account/save-to-buy/${planId}`);
    } catch (error) {
      showToast('Could not start plan', 'error');
      handleFirestoreError(error, OperationType.CREATE, path);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {!isControlled && (
        <motion.button
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setOpen(true)}
          className="w-full inline-flex items-center justify-center gap-2 border border-line px-6 py-3.5 rounded-full font-medium text-sm hover:border-signal hover:text-signal transition-colors"
        >
          <PiggyBank size={16} /> Save Toward This Device
        </motion.button>
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-ink/50 z-50 flex items-center justify-center p-4 overflow-y-auto"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              className="bg-white rounded-2xl p-6 max-w-sm w-full my-8 max-h-[90vh] overflow-y-auto shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-display font-semibold text-lg">Save-to-Buy</h2>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                  className="p-1 rounded-full hover:bg-ink/5 text-steel hover:text-ink"
                >
                  <X size={18} />
                </button>
              </div>

              {loggedIn ? (
                <>
                  <p className="text-sm text-steel mb-4">
                    {productName} — target{' '}
                    <span className="font-data text-ink font-semibold">
                      {formatNaira(price)}
                    </span>
                  </p>

                  <label className="block text-xs font-medium text-steel mb-1.5">
                    Save
                  </label>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {(['weekly', 'monthly'] as const).map((freq) => (
                      <button
                        key={freq}
                        type="button"
                        onClick={() => setFrequency(freq)}
                        className={`py-2 rounded-lg text-sm font-medium border capitalize ${
                          frequency === freq
                            ? 'border-signal bg-signal/5 text-signal'
                            : 'border-line text-steel'
                        }`}
                      >
                        {freq}
                      </button>
                    ))}
                  </div>

                  <label className="block text-xs font-medium text-steel mb-1.5">
                    Over how many months?
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={12}
                    value={months}
                    onChange={(e) => setMonths(Number(e.target.value))}
                    className="w-full mb-1 accent-[var(--color-signal)]"
                  />
                  <p className="text-xs text-steel mb-4">
                    {months} month{months > 1 ? 's' : ''}
                  </p>

                  <div className="rounded-xl bg-signal/5 border border-signal/20 p-4 mb-4 text-center">
                    <p className="text-xs text-steel">You&apos;ll save</p>
                    <p className="font-display font-bold text-xl text-signal">
                      {formatNaira(installmentAmount)}
                    </p>
                    <p className="text-xs text-steel capitalize">
                      per {frequency === 'weekly' ? 'week' : 'month'} · {totalPayments} payments
                    </p>
                  </div>

                  <div className="rounded-xl bg-ink/5 border border-line p-3 mb-4 text-xs">
                    <p className="font-semibold text-ink mb-1">
                      Transfer to Company Account:
                    </p>
                    <p className="text-steel">
                      <span className="font-medium">Bank:</span> {acct.bankName}
                    </p>
                    <p className="text-steel">
                      <span className="font-medium">Account No:</span> {acct.accountNumber}
                    </p>
                    <p className="text-steel">
                      <span className="font-medium">Account Name:</span> {acct.accountName}
                    </p>
                  </div>

                  <div className="mb-3">
                    <label className="block text-[11px] font-medium text-steel mb-1">
                      Phone Number (for delivery updates)
                    </label>
                    <input
                      type="tel"
                      placeholder="e.g. 08012345678"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-line rounded-lg focus:outline-none focus:border-signal"
                    />
                  </div>

                  <div className="mb-4 pt-3 border-t border-line">
                    <label className="flex items-center gap-2 text-xs font-medium text-steel cursor-pointer mb-3">
                      <input
                        type="checkbox"
                        checked={diffAccount}
                        onChange={(e) => setDiffAccount(e.target.checked)}
                        className="rounded border-line text-signal focus:ring-signal"
                      />
                      Transferring from a different bank account name?
                    </label>
                    {diffAccount && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="space-y-3"
                      >
                        <div>
                          <label className="block text-[11px] font-medium text-steel mb-1">
                            Account Name (Sender)
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. John Doe"
                            value={senderName}
                            onChange={(e) => setSenderName(e.target.value)}
                            className="w-full px-3 py-2 text-xs border border-line rounded-lg focus:outline-none focus:border-signal"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-steel mb-1">
                            Bank Name
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. GTBank"
                            value={senderBank}
                            onChange={(e) => setSenderBank(e.target.value)}
                            className="w-full px-3 py-2 text-xs border border-line rounded-lg focus:outline-none focus:border-signal"
                          />
                        </div>
                      </motion.div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleStartSaving}
                    disabled={submitting}
                    className="w-full bg-signal text-white py-3 rounded-full text-sm font-medium hover:brightness-110 transition-all disabled:opacity-60"
                  >
                    {submitting ? 'Starting...' : 'Start Saving'}
                  </button>
                  <p className="text-[11px] text-steel mt-3 text-center leading-relaxed">
                    {acct.instructions}
                  </p>
                </>
              ) : (
                <div className="text-center py-4">
                  <p className="text-steel text-sm mb-4">
                    Log in or create an account to start saving toward this device.
                  </p>
                  <Link
                    to="/account/login"
                    onClick={() => setOpen(false)}
                    className="inline-flex bg-ink text-paper px-6 py-3 rounded-full text-sm font-medium hover:bg-signal transition-colors"
                  >
                    Log In
                  </Link>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
