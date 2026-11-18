import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { doc, onSnapshot, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { CheckCircle2, Clock, PackageCheck, UploadCloud } from 'lucide-react';
import { BankTransferCard } from '../components/BankTransferCard';
import { CloudinaryUploader } from '../components/CloudinaryUploader';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { useToast } from '../context/ToastContext';
import { getOptimizedImageUrl } from '../lib/cloudinary';
import { db } from '../lib/firebase';
import { OperationType, handleFirestoreError } from '../lib/firestoreError';
import { clampStr, formatNaira } from '../lib/format';
import { Order } from '../types';

export function OrderConfirmationPage() {
  const { id } = useParams<{ id: string }>();
  const { user, authReady } = useAuth();
  const { settings } = useStore();
  const { showToast } = useToast();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [receiptImages, setReceiptImages] = useState<string[]>([]);
  const [senderAccountName, setSenderAccountName] = useState('');
  const [senderBankName, setSenderBankName] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id || !authReady) return;
    const unsub = onSnapshot(
      doc(db, 'orders', id),
      (snap) => {
        if (snap.exists()) {
          const data = { ...(snap.data() as Order), id: snap.id };
          setOrder(data);
          if (data.receiptUrl && receiptImages.length === 0) {
            setReceiptImages([data.receiptUrl]);
          }
          if (data.senderAccountName) setSenderAccountName(data.senderAccountName);
          if (data.senderBankName) setSenderBankName(data.senderBankName);
          if (data.paymentReference) setPaymentReference(data.paymentReference);
        } else {
          setOrder(null);
        }
        setLoading(false);
      },
      (err) => {
        setLoading(false);
        handleFirestoreError(err, OperationType.GET, `orders/${id}`);
      }
    );
    return () => unsub();
  }, [id, authReady]);

  async function handleSubmitProof(e: React.FormEvent) {
    e.preventDefault();
    if (!order || !user) return;
    if (receiptImages.length === 0 && !paymentReference.trim()) {
      showToast('Upload a receipt image or enter a payment reference.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const receiptUrl = receiptImages[0] || order.receiptUrl || '';
      await updateDoc(doc(db, 'orders', order.id), {
        ...(receiptUrl ? { receiptUrl: clampStr(receiptUrl, 1000) } : {}),
        ...(senderAccountName.trim()
          ? { senderAccountName: clampStr(senderAccountName, 120) }
          : {}),
        ...(senderBankName.trim() ? { senderBankName: clampStr(senderBankName, 120) } : {}),
        ...(paymentReference.trim()
          ? { paymentReference: clampStr(paymentReference, 120) }
          : {}),
        paymentStatus: 'awaiting_verification',
        updatedAt: serverTimestamp(),
      });

      const paymentId = `pay_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`;
      await setDoc(doc(db, 'payments', paymentId), {
        id: paymentId,
        userId: user.uid,
        orderId: order.id,
        type: 'bank-transfer',
        provider: settings.bankTransferAccount.bankName || 'Bank Transfer',
        amount: order.total,
        ...(paymentReference.trim() ? { reference: clampStr(paymentReference, 120) } : {}),
        ...(senderAccountName.trim()
          ? { senderAccountName: clampStr(senderAccountName, 120) }
          : {}),
        ...(senderBankName.trim() ? { senderBankName: clampStr(senderBankName, 120) } : {}),
        ...(receiptUrl ? { receiptUrl: clampStr(receiptUrl, 1000) } : {}),
        status: 'pending_verification',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      showToast('Payment proof submitted for verification', 'success');
    } catch (error) {
      showToast('Could not submit payment proof', 'error');
      handleFirestoreError(error, OperationType.UPDATE, `orders/${order.id}`);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="h-56 rounded-2xl bg-ink/5 animate-pulse" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-20 text-center">
        <h1 className="font-display font-bold text-2xl mb-2">Order Not Found</h1>
        <p className="text-sm text-steel mb-6">
          Make sure you are signed into the account that placed this order.
        </p>
        <Link
          to="/account/orders"
          className="inline-flex bg-ink text-paper px-6 py-3 rounded-full text-sm font-medium hover:bg-signal transition-colors"
        >
          View My Orders
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="bg-white border border-line rounded-2xl p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-full bg-mint/10 text-mint flex items-center justify-center shrink-0">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <p className="font-data text-xs uppercase tracking-widest text-steel">
                Order Confirmation
              </p>
              <h1 className="font-display font-bold text-2xl sm:text-3xl mt-0.5">
                {order.orderNumber}
              </h1>
              <p className="text-sm text-steel mt-1">
                Thank you, {order.customerName}. Your order has been recorded.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-xs font-data">
            <span className="px-3 py-1 rounded-full border border-line bg-paper capitalize">
              Order: {order.orderStatus}
            </span>
            <span className="px-3 py-1 rounded-full border border-signal/30 bg-signal/5 text-signal capitalize">
              Payment: {order.paymentStatus.replace(/_/g, ' ')}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-line text-xs">
          <div>
            <p className="text-steel uppercase font-data mb-1">Delivery To</p>
            <p className="font-medium text-ink">{order.address}</p>
            <p className="text-steel mt-0.5">
              {order.phone} · {order.region} ({order.deliveryMethod})
            </p>
          </div>
          <div>
            <p className="text-steel uppercase font-data mb-1">Payment Method</p>
            <p className="font-medium text-ink capitalize">{order.paymentMethod.replace('-', ' ')}</p>
          </div>
          <div>
            <p className="text-steel uppercase font-data mb-1">Order Total</p>
            <p className="font-data font-bold text-lg text-ink">{formatNaira(order.total)}</p>
          </div>
        </div>
      </div>

      {/* Bank Transfer Instructions + Proof Upload */}
      {order.paymentMethod === 'bank-transfer' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          <BankTransferCard amount={formatNaira(order.total)} />

          <form
            onSubmit={handleSubmitProof}
            className="bg-white border border-line rounded-2xl p-5 space-y-4"
          >
            <div className="flex items-center gap-2">
              <UploadCloud size={18} className="text-signal" />
              <h2 className="font-display font-semibold text-base">
                {order.paymentStatus === 'verified'
                  ? 'Payment Verified'
                  : 'Upload Payment Receipt / Proof'}
              </h2>
            </div>

            {order.paymentStatus === 'verified' ? (
              <div className="rounded-xl bg-mint/10 border border-mint/20 p-4 text-xs text-mint flex items-center gap-2">
                <PackageCheck size={16} />
                <span>Your transfer has been confirmed by our team.</span>
              </div>
            ) : (
              <>
                {order.paymentStatus === 'awaiting_verification' && (
                  <div className="rounded-xl bg-signal/5 border border-signal/20 p-3 text-xs text-ink flex items-center gap-2">
                    <Clock size={15} className="text-signal shrink-0" />
                    <span>Proof received — awaiting admin verification. You can update it below if needed.</span>
                  </div>
                )}

                <input
                  type="text"
                  value={senderAccountName}
                  onChange={(e) => setSenderAccountName(e.target.value)}
                  placeholder="Sender Account Name"
                  className="w-full border border-line rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-signal"
                />
                <input
                  type="text"
                  value={senderBankName}
                  onChange={(e) => setSenderBankName(e.target.value)}
                  placeholder="Sender Bank Name"
                  className="w-full border border-line rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-signal"
                />
                <input
                  type="text"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="Transfer Reference (optional)"
                  className="w-full border border-line rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-signal"
                />

                <CloudinaryUploader
                  images={receiptImages}
                  onChange={setReceiptImages}
                  folder="samtobpc/receipts"
                  multiple={false}
                  maxFiles={1}
                  label="Select Receipt Image"
                />

                {['pending', 'confirmed'].includes(order.orderStatus) && (
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-ink text-paper py-2.5 rounded-full text-xs font-medium hover:bg-signal transition-colors disabled:opacity-50"
                  >
                    {submitting ? 'Submitting...' : 'Submit Payment Proof'}
                  </button>
                )}
              </>
            )}
          </form>
        </div>
      )}

      {/* Items */}
      <div className="bg-white border border-line rounded-2xl p-6 space-y-4">
        <h2 className="font-display font-semibold text-base">Items Ordered</h2>
        <div className="divide-y divide-line">
          {order.items.map((item, idx) => (
            <div key={`${item.productId}-${idx}`} className="py-3 flex items-center gap-4">
              {item.image && (
                <img
                  src={getOptimizedImageUrl(item.image, 120)}
                  alt={item.name}
                  referrerPolicy="no-referrer"
                  className="w-12 h-12 rounded-lg bg-[#F5F4F0] object-contain p-1 shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{item.name}</p>
                <p className="text-xs text-steel font-data">
                  Qty {item.qty} × {formatNaira(item.price)}
                </p>
              </div>
              <p className="font-data font-semibold text-sm">{formatNaira(item.price * item.qty)}</p>
            </div>
          ))}
        </div>

        <div className="border-t border-line pt-4 flex flex-wrap justify-between items-center gap-4">
          <div className="text-xs text-steel">
            Subtotal {formatNaira(order.subtotal)} · Delivery{' '}
            {order.deliveryFee === 0 ? 'FREE' : formatNaira(order.deliveryFee)}
          </div>
          <div className="flex gap-3">
            <Link
              to="/account/orders"
              className="px-4 py-2 rounded-full border border-line text-xs font-medium hover:border-signal hover:text-signal"
            >
              My Orders
            </Link>
            <Link
              to="/products"
              className="px-4 py-2 rounded-full bg-ink text-paper text-xs font-medium hover:bg-signal transition-colors"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
