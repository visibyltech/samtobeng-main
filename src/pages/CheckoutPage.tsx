import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import {
  ArrowLeft,
  Building2,
  CreditCard,
  Lock,
  PiggyBank,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import { BankTransferCard } from '../components/BankTransferCard';
import { CloudinaryUploader } from '../components/CloudinaryUploader';
import { KlumpButton } from '../components/KlumpButton';
import { SaveToBuyModal } from '../components/SaveToBuyModal';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useStore } from '../context/StoreContext';
import { useToast } from '../context/ToastContext';
import { getBnplAvailability } from '../lib/bnpl';
import { getOptimizedImageUrl } from '../lib/cloudinary';
import { calculateDeliveryFee } from '../lib/defaultData';
import { db } from '../lib/firebase';
import { OperationType, handleFirestoreError } from '../lib/firestoreError';
import { clampStr, formatNaira } from '../lib/format';
import { DeliveryMethod, DeliveryRegion, PaymentMethod } from '../types';

export function CheckoutPage() {
  const { items, subtotal, clear } = useCart();
  const { settings } = useStore();
  const { user, profile, loggedIn, loginWithGoogle } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [customerName, setCustomerName] = useState(profile?.name || '');
  const [email, setEmail] = useState(profile?.email || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [address, setAddress] = useState(profile?.address || '');

  const [region, setRegion] = useState<DeliveryRegion>('ibadan');
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('door-step');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('bank-transfer');

  const [receiptImages, setReceiptImages] = useState<string[]>([]);
  const [senderAccountName, setSenderAccountName] = useState('');
  const [senderBankName, setSenderBankName] = useState('');
  const [paymentReference, setPaymentReference] = useState('');

  const [saveToBuyOpen, setSaveToBuyOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    if (profile) {
      if (!customerName && profile.name) setCustomerName(profile.name);
      if (!email && profile.email) setEmail(profile.email);
      if (!phone && profile.phone) setPhone(profile.phone);
      if (!address && profile.address) setAddress(profile.address);
    }
  }, [profile]);

  const currentTier =
    settings.deliveryTiers.find((t) => t.region === region) || settings.deliveryTiers[0];
  const validMethods = currentTier?.options || [];

  useEffect(() => {
    if (validMethods.length > 0 && !validMethods.some((o) => o.method === deliveryMethod)) {
      setDeliveryMethod(validMethods[0].method);
    }
  }, [region, validMethods, deliveryMethod]);

  const deliveryFee = calculateDeliveryFee(settings.deliveryTiers, region, deliveryMethod, subtotal);
  const total = subtotal + deliveryFee;
  const bnplAvailability = getBnplAvailability(settings.bnpl);

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-20 text-center">
        <h1 className="font-display font-bold text-2xl mb-2">Nothing in your cart to check out</h1>
        <p className="text-sm text-steel mb-6">Add a laptop, phone or gadget first before proceeding to checkout.</p>
        <Link
          to="/products"
          className="inline-flex items-center gap-2 bg-ink text-paper px-6 py-3 rounded-full text-sm font-medium hover:bg-signal transition-colors"
        >
          Shop Devices
        </Link>
      </div>
    );
  }

  async function handleInlineSignIn() {
    setSigningIn(true);
    try {
      const p = await loginWithGoogle();
      if (p) {
        if (!customerName) setCustomerName(p.name || '');
        if (!email) setEmail(p.email || '');
        if (!phone && p.phone) setPhone(p.phone);
        if (!address && p.address) setAddress(p.address);
        showToast('Signed in successfully', 'success');
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Google Sign-In failed', 'error');
    } finally {
      setSigningIn(false);
    }
  }

  async function handlePlaceOrder(e: React.FormEvent) {
    e.preventDefault();

    if (!loggedIn || !user) {
      showToast('Please sign in with Google first to place your order', 'error');
      return;
    }

    if (paymentMethod === 'klump' || paymentMethod === 'bnpl') {
      if (!bnplAvailability.available) {
        showToast(
          bnplAvailability.controlledMessage ||
            'Klump is unavailable. Select Bank Transfer or Save-to-Buy.',
          'error'
        );
        return;
      }
    }

    if (paymentMethod === 'save-to-buy') {
      if (items.length !== 1) {
        showToast('Save-to-Buy plans apply to a single device at a time.', 'error');
        return;
      }
      setSaveToBuyOpen(true);
      return;
    }

    if (customerName.trim().length < 2 || phone.trim().length < 5 || address.trim().length < 3) {
      showToast('Please complete your name, phone number, and delivery address.', 'error');
      return;
    }

    setSubmitting(true);
    const orderId = `ord_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`;
    const orderNumber = `SMT-${Math.floor(100000 + Math.random() * 900000)}`;
    const receiptUrl = receiptImages[0] || '';
    const hasReceipt = Boolean(receiptUrl);

    try {
      const orderPayload = {
        id: orderId,
        orderNumber,
        userId: user.uid,
        customerName: clampStr(customerName, 120),
        email: clampStr(email || user.email || '', 180),
        phone: clampStr(phone, 30),
        address: clampStr(address, 500),
        region,
        deliveryMethod,
        paymentMethod,
        items: items.map((i) => ({
          productId: i.productId,
          slug: i.slug,
          name: clampStr(i.name, 240),
          price: Number(i.price),
          qty: Number(i.qty),
          image: i.image,
        })),
        subtotal,
        deliveryFee,
        total,
        paymentStatus: hasReceipt ? 'awaiting_verification' : 'pending',
        orderStatus: 'pending',
        ...(receiptUrl ? { receiptUrl: clampStr(receiptUrl, 1000) } : {}),
        ...(senderAccountName.trim()
          ? { senderAccountName: clampStr(senderAccountName, 120) }
          : {}),
        ...(senderBankName.trim()
          ? { senderBankName: clampStr(senderBankName, 120) }
          : {}),
        ...(paymentReference.trim()
          ? { paymentReference: clampStr(paymentReference, 120) }
          : {}),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(doc(db, 'orders', orderId), orderPayload);

      if (hasReceipt || senderAccountName.trim() || paymentReference.trim()) {
        const paymentId = `pay_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`;
        await setDoc(doc(db, 'payments', paymentId), {
          id: paymentId,
          userId: user.uid,
          orderId,
          type: 'bank-transfer',
          provider: settings.bankTransferAccount.bankName || 'Bank Transfer',
          amount: total,
          ...(paymentReference.trim()
            ? { reference: clampStr(paymentReference, 120) }
            : {}),
          ...(senderAccountName.trim()
            ? { senderAccountName: clampStr(senderAccountName, 120) }
            : {}),
          ...(senderBankName.trim()
            ? { senderBankName: clampStr(senderBankName, 120) }
            : {}),
          ...(receiptUrl ? { receiptUrl: clampStr(receiptUrl, 1000) } : {}),
          status: 'pending_verification',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      clear();
      showToast('Order placed successfully!', 'success');
      navigate(`/order-confirmation/${orderId}`);
    } catch (error) {
      showToast('Failed to place order. Please verify your details.', 'error');
      handleFirestoreError(error, OperationType.CREATE, `orders/${orderId}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10">
      <Link
        to="/cart"
        className="inline-flex items-center gap-1.5 text-sm text-steel hover:text-signal mb-6"
      >
        <ArrowLeft size={15} /> Back to cart
      </Link>

      <h1 className="font-display font-bold text-3xl mb-8">Checkout</h1>

      {!loggedIn && (
        <div className="mb-8 rounded-2xl border border-signal/30 bg-signal/5 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="font-display font-semibold text-sm text-ink">
              Sign in to complete your order &amp; track verification
            </p>
            <p className="text-xs text-steel mt-1">
              Sign in with Google so your order, payment receipt, or Save-to-Buy plan is tied securely to your account.
            </p>
          </div>
          <button
            type="button"
            onClick={handleInlineSignIn}
            disabled={signingIn}
            className="inline-flex items-center justify-center gap-2 bg-signal text-white px-5 py-2.5 rounded-full text-xs font-medium hover:brightness-110 transition-all shrink-0 disabled:opacity-60"
          >
            <Lock size={14} />
            {signingIn ? 'Signing in...' : 'Sign in with Google'}
          </button>
        </div>
      )}

      <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 space-y-6">
          {/* Contact & Shipping Details */}
          <section className="bg-white border border-line rounded-2xl p-6 space-y-4">
            <h2 className="font-display font-semibold text-lg">1. Contact &amp; Delivery Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-steel mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full border border-line rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-signal"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-steel mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full border border-line rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-signal"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-steel mb-1">Phone Number *</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 08012345678"
                  className="w-full border border-line rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-signal"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-steel mb-1">Delivery Region *</label>
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value as DeliveryRegion)}
                  className="w-full border border-line rounded-xl px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:border-signal"
                >
                  {settings.deliveryTiers.map((t) => (
                    <option key={t.region} value={t.region}>
                      {t.regionLabel}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-steel mb-1">
                Full Delivery Address (Street, City, State / Park) *
              </label>
              <textarea
                required
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Street address, landmark, city & state"
                className="w-full border border-line rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-signal"
              />
            </div>
          </section>

          {/* Delivery Method */}
          <section className="bg-white border border-line rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display font-semibold text-lg flex items-center gap-2">
                <Truck size={18} className="text-signal" /> 2. Delivery Method
              </h2>
              {currentTier?.freeThreshold && subtotal >= currentTier.freeThreshold && (
                <span className="text-xs font-data font-medium text-mint bg-mint/10 px-2.5 py-1 rounded-full">
                  FREE Delivery Applied
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {validMethods.map((opt) => {
                const effectiveFee =
                  currentTier?.freeThreshold && subtotal >= currentTier.freeThreshold ? 0 : opt.fee;
                const active = deliveryMethod === opt.method;
                return (
                  <button
                    key={opt.method}
                    type="button"
                    onClick={() => setDeliveryMethod(opt.method)}
                    className={`text-left p-4 rounded-xl border transition-all ${
                      active
                        ? 'border-signal bg-signal/5 ring-1 ring-signal/20'
                        : 'border-line hover:border-ink/40'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-medium text-sm">{opt.label}</span>
                      <span className="font-data font-semibold text-sm">
                        {effectiveFee === 0 ? 'FREE' : formatNaira(effectiveFee)}
                      </span>
                    </div>
                    <p className="text-xs text-steel">Estimated: {opt.eta}</p>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-steel leading-relaxed">{settings.storefront.deliveryNotice}</p>
          </section>

          {/* Payment Options (All 3 Original Options) */}
          <section className="bg-white border border-line rounded-2xl p-6 space-y-5">
            <h2 className="font-display font-semibold text-lg">3. Select Payment Option</h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod('bank-transfer')}
                className={`p-4 rounded-xl border text-left transition-all ${
                  paymentMethod === 'bank-transfer'
                    ? 'border-signal bg-signal/5'
                    : 'border-line hover:border-ink/40'
                }`}
              >
                <Building2 size={18} className="text-signal mb-2" />
                <p className="font-display font-semibold text-sm">Buy &amp; Pay Now</p>
                <p className="text-xs text-steel mt-0.5">Direct Bank Transfer</p>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('klump')}
                className={`p-4 rounded-xl border text-left transition-all ${
                  paymentMethod === 'klump'
                    ? 'border-signal bg-signal/5'
                    : 'border-line hover:border-ink/40'
                }`}
              >
                <CreditCard size={18} className="text-signal mb-2" />
                <p className="font-display font-semibold text-sm">Buy Now, Pay Later</p>
                <p className="text-xs text-steel mt-0.5">Klump / BNPL Instalments</p>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('save-to-buy')}
                className={`p-4 rounded-xl border text-left transition-all ${
                  paymentMethod === 'save-to-buy'
                    ? 'border-signal bg-signal/5'
                    : 'border-line hover:border-ink/40'
                }`}
              >
                <PiggyBank size={18} className="text-signal mb-2" />
                <p className="font-display font-semibold text-sm">Save to Buy</p>
                <p className="text-xs text-steel mt-0.5">Weekly or monthly layaway</p>
              </button>
            </div>

            {/* Option A — Buy and Pay Now */}
            {paymentMethod === 'bank-transfer' && (
              <div className="space-y-4 pt-2">
                <BankTransferCard amount={formatNaira(total)} />

                <div className="rounded-xl border border-line p-4 space-y-3 bg-paper/60">
                  <p className="text-xs font-semibold text-ink">
                    Optional: Attach Proof of Payment Now (or upload after placing order)
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input
                      type="text"
                      value={senderAccountName}
                      onChange={(e) => setSenderAccountName(e.target.value)}
                      placeholder="Sender Account Name"
                      className="border border-line rounded-xl px-3 py-2 text-xs bg-white focus:outline-none focus:border-signal"
                    />
                    <input
                      type="text"
                      value={senderBankName}
                      onChange={(e) => setSenderBankName(e.target.value)}
                      placeholder="Sender Bank Name"
                      className="border border-line rounded-xl px-3 py-2 text-xs bg-white focus:outline-none focus:border-signal"
                    />
                    <input
                      type="text"
                      value={paymentReference}
                      onChange={(e) => setPaymentReference(e.target.value)}
                      placeholder="Transfer Reference (optional)"
                      className="border border-line rounded-xl px-3 py-2 text-xs bg-white focus:outline-none focus:border-signal"
                    />
                  </div>

                  <CloudinaryUploader
                    images={receiptImages}
                    onChange={setReceiptImages}
                    folder="samtobpc/receipts"
                    multiple={false}
                    maxFiles={1}
                    label="Upload Transfer Receipt"
                  />
                </div>
              </div>
            )}

            {/* Option B — Buy Now, Pay Later */}
            {paymentMethod === 'klump' && (
              <div className="space-y-3 pt-2">
                <KlumpButton
                  payload={
                    loggedIn && user
                      ? {
                          orderId: `bnpl_${Date.now()}`,
                          merchantReference: `SMT-BNPL-${Date.now()}`,
                          amount: total,
                          shippingFee: deliveryFee,
                          customerEmail: email || user.email || '',
                          customerFirstName: customerName.split(' ')[0] || 'Customer',
                          customerLastName: customerName.split(' ').slice(1).join(' ') || 'SAMTOB',
                          customerPhone: phone,
                          items: items.map((i) => ({
                            productId: i.productId,
                            slug: i.slug,
                            name: i.name,
                            price: i.price,
                            qty: i.qty,
                            image: i.image,
                          })),
                          redirectUrl: `${window.location.origin}/account/orders`,
                        }
                      : undefined
                  }
                />
                <p className="text-xs text-steel">{settings.bnpl.termsText}</p>
              </div>
            )}

            {/* Option C — Save to Buy */}
            {paymentMethod === 'save-to-buy' && (
              <div className="rounded-xl border border-line bg-paper/60 p-4 space-y-3">
                <p className="text-sm font-semibold">Save-to-Buy Layaway Plan</p>
                <p className="text-xs text-steel leading-relaxed">
                  {settings.storefront.saveToBuyTermsSummary}
                </p>
                {items.length > 1 ? (
                  <p className="text-xs text-signal font-medium">
                    Save-to-Buy supports 1 device per plan. Remove extra items from your cart or open any product page and click &ldquo;Save Toward This Device&rdquo;.
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={() => setSaveToBuyOpen(true)}
                    className="inline-flex items-center gap-2 bg-signal text-white px-5 py-2.5 rounded-full text-xs font-medium hover:brightness-110 transition-all"
                  >
                    <PiggyBank size={15} /> Configure Save-to-Buy Plan for {items[0].name}
                  </button>
                )}
              </div>
            )}
          </section>
        </div>

        {/* Summary Column */}
        <aside className="bg-white border border-line rounded-2xl p-6 space-y-5 lg:sticky lg:top-24">
          <h2 className="font-display font-semibold text-lg">Order Summary</h2>

          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {items.map((item) => (
              <div key={item.productId} className="flex items-center gap-3 text-sm">
                <img
                  src={getOptimizedImageUrl(item.image, 120)}
                  alt={item.name}
                  referrerPolicy="no-referrer"
                  className="w-12 h-12 rounded-lg bg-[#F5F4F0] object-contain p-1 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium line-clamp-1">{item.name}</p>
                  <p className="text-xs text-steel font-data">
                    Qty {item.qty} × {formatNaira(item.price)}
                  </p>
                </div>
                <span className="font-data font-medium text-xs shrink-0">
                  {formatNaira(item.price * item.qty)}
                </span>
              </div>
            ))}
          </div>

          <div className="border-t border-line pt-4 space-y-2 text-sm">
            <div className="flex justify-between text-steel">
              <span>Subtotal</span>
              <span className="font-data text-ink">{formatNaira(subtotal)}</span>
            </div>
            <div className="flex justify-between text-steel">
              <span>Delivery Fee</span>
              <span className="font-data text-ink">
                {deliveryFee === 0 ? 'FREE' : formatNaira(deliveryFee)}
              </span>
            </div>
            <div className="flex justify-between items-baseline pt-2 border-t border-line">
              <span className="font-semibold">Total</span>
              <span className="font-data font-bold text-xl text-ink">{formatNaira(total)}</span>
            </div>
          </div>

          {paymentMethod === 'bank-transfer' && (
            <button
              type="submit"
              disabled={submitting || !loggedIn}
              className="w-full bg-signal text-white py-3.5 rounded-full text-sm font-medium hover:brightness-110 transition-all disabled:opacity-50"
            >
              {submitting ? 'Placing Order...' : 'Place Order'}
            </button>
          )}

          {paymentMethod === 'save-to-buy' && items.length === 1 && (
            <button
              type="button"
              onClick={() => setSaveToBuyOpen(true)}
              className="w-full bg-signal text-white py-3.5 rounded-full text-sm font-medium hover:brightness-110 transition-all"
            >
              Start Save-to-Buy Plan
            </button>
          )}

          <div className="flex items-center gap-2 text-xs text-steel pt-1">
            <ShieldCheck size={15} className="text-mint shrink-0" />
            <span>Every device tested &amp; backed by SAMTOB P&amp;C warranty</span>
          </div>
        </aside>
      </form>

      {items.length === 1 && (
        <SaveToBuyModal
          productId={items[0].productId}
          productSlug={items[0].slug}
          productName={items[0].name}
          productImage={items[0].image}
          price={items[0].price}
          open={saveToBuyOpen}
          onOpenChange={setSaveToBuyOpen}
        />
      )}
    </div>
  );
}
