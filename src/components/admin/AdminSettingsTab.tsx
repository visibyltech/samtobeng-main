import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';
import {
  BankAccountInfo,
  BnplSettings,
  DeliveryTier,
  FaqItem,
  LegalDocument,
  SiteSettingsBundle,
  StoreLocation,
  StorefrontSettings,
  TestimonialItem,
} from '../../types';

export function AdminSettingsTab() {
  const { settings, updateSiteSettings } = useStore();
  const { showToast } = useToast();

  const [bankTransfer, setBankTransfer] = useState<BankAccountInfo>(settings.bankTransferAccount);
  const [saveToBuy, setSaveToBuy] = useState<BankAccountInfo>(settings.saveToBuyAccount);
  const [bnpl, setBnpl] = useState<BnplSettings>(settings.bnpl);
  const [storefront, setStorefront] = useState<StorefrontSettings>(settings.storefront);
  const [stores, setStores] = useState<StoreLocation[]>(settings.stores);
  const [faqs, setFaqs] = useState<FaqItem[]>(settings.faqs);
  const [testimonials, setTestimonials] = useState<TestimonialItem[]>(settings.testimonials);
  const [deliveryTiers, setDeliveryTiers] = useState<DeliveryTier[]>(settings.deliveryTiers);
  const [termsDoc, setTermsDoc] = useState<LegalDocument>(settings.termsDocument);
  const [privacyDoc, setPrivacyDoc] = useState<LegalDocument>(settings.privacyDocument);

  const [savingKey, setSavingKey] = useState<string | null>(null);

  useEffect(() => {
    setBankTransfer(settings.bankTransferAccount);
    setSaveToBuy(settings.saveToBuyAccount);
    setBnpl(settings.bnpl);
    setStorefront(settings.storefront);
    setStores(settings.stores);
    setFaqs(settings.faqs);
    setTestimonials(settings.testimonials);
    setDeliveryTiers(settings.deliveryTiers);
    setTermsDoc(settings.termsDocument);
    setPrivacyDoc(settings.privacyDocument);
  }, [settings]);

  async function saveSection(key: keyof SiteSettingsBundle, value: unknown, label: string) {
    setSavingKey(key);
    try {
      await updateSiteSettings(key, value);
      showToast(`${label} saved to Firestore`, 'success');
    } catch {
      showToast(`Could not save ${label}`, 'error');
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Bank Accounts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white border border-line rounded-2xl p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-semibold text-base">
              Buy &amp; Pay Now Bank Account
            </h2>
            <button
              type="button"
              disabled={savingKey === 'bankTransferAccount'}
              onClick={() =>
                saveSection('bankTransferAccount', bankTransfer, 'Bank Transfer Account')
              }
              className="inline-flex items-center gap-1 bg-ink text-paper px-3.5 py-1.5 rounded-full text-xs font-medium hover:bg-signal"
            >
              <Save size={13} /> Save
            </button>
          </div>
          <input
            type="text"
            value={bankTransfer.bankName}
            onChange={(e) => setBankTransfer({ ...bankTransfer, bankName: e.target.value })}
            placeholder="Bank Name"
            className="w-full border border-line rounded-xl px-3 py-2 text-xs"
          />
          <input
            type="text"
            value={bankTransfer.accountNumber}
            onChange={(e) => setBankTransfer({ ...bankTransfer, accountNumber: e.target.value })}
            placeholder="Account Number"
            className="w-full border border-line rounded-xl px-3 py-2 text-xs font-data"
          />
          <input
            type="text"
            value={bankTransfer.accountName}
            onChange={(e) => setBankTransfer({ ...bankTransfer, accountName: e.target.value })}
            placeholder="Account Name"
            className="w-full border border-line rounded-xl px-3 py-2 text-xs"
          />
          <textarea
            rows={2}
            value={bankTransfer.instructions}
            onChange={(e) => setBankTransfer({ ...bankTransfer, instructions: e.target.value })}
            placeholder="Payment instructions"
            className="w-full border border-line rounded-xl px-3 py-2 text-xs"
          />
        </section>

        <section className="bg-white border border-line rounded-2xl p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-semibold text-base">Save-to-Buy Bank Account</h2>
            <button
              type="button"
              disabled={savingKey === 'saveToBuyAccount'}
              onClick={() => saveSection('saveToBuyAccount', saveToBuy, 'Save-to-Buy Account')}
              className="inline-flex items-center gap-1 bg-ink text-paper px-3.5 py-1.5 rounded-full text-xs font-medium hover:bg-signal"
            >
              <Save size={13} /> Save
            </button>
          </div>
          <input
            type="text"
            value={saveToBuy.bankName}
            onChange={(e) => setSaveToBuy({ ...saveToBuy, bankName: e.target.value })}
            placeholder="Bank Name"
            className="w-full border border-line rounded-xl px-3 py-2 text-xs"
          />
          <input
            type="text"
            value={saveToBuy.accountNumber}
            onChange={(e) => setSaveToBuy({ ...saveToBuy, accountNumber: e.target.value })}
            placeholder="Account Number"
            className="w-full border border-line rounded-xl px-3 py-2 text-xs font-data"
          />
          <input
            type="text"
            value={saveToBuy.accountName}
            onChange={(e) => setSaveToBuy({ ...saveToBuy, accountName: e.target.value })}
            placeholder="Account Name"
            className="w-full border border-line rounded-xl px-3 py-2 text-xs"
          />
          <textarea
            rows={2}
            value={saveToBuy.instructions}
            onChange={(e) => setSaveToBuy({ ...saveToBuy, instructions: e.target.value })}
            placeholder="Save-to-Buy instructions"
            className="w-full border border-line rounded-xl px-3 py-2 text-xs"
          />
        </section>
      </div>

      {/* Storefront Hero, Hours & WhatsApp */}
      <section className="bg-white border border-line rounded-2xl p-6 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-semibold text-base">
            Storefront Hero, Hours &amp; Social Links
          </h2>
          <button
            type="button"
            disabled={savingKey === 'storefront'}
            onClick={() => saveSection('storefront', storefront, 'Storefront Settings')}
            className="inline-flex items-center gap-1 bg-ink text-paper px-3.5 py-1.5 rounded-full text-xs font-medium hover:bg-signal"
          >
            <Save size={13} /> Save
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            type="text"
            value={storefront.heroEyebrow}
            onChange={(e) => setStorefront({ ...storefront, heroEyebrow: e.target.value })}
            placeholder="Hero Eyebrow"
            className="border border-line rounded-xl px-3 py-2 text-xs"
          />
          <input
            type="text"
            value={storefront.heroTitleHighlight}
            onChange={(e) => setStorefront({ ...storefront, heroTitleHighlight: e.target.value })}
            placeholder="Hero Highlight Word"
            className="border border-line rounded-xl px-3 py-2 text-xs"
          />
          <input
            type="url"
            value={storefront.whatsappUrl}
            onChange={(e) => setStorefront({ ...storefront, whatsappUrl: e.target.value })}
            placeholder="WhatsApp URL"
            className="border border-line rounded-xl px-3 py-2 text-xs"
          />
          <input
            type="text"
            value={storefront.businessHours}
            onChange={(e) => setStorefront({ ...storefront, businessHours: e.target.value })}
            placeholder="Business Hours"
            className="border border-line rounded-xl px-3 py-2 text-xs"
          />
        </div>
        <textarea
          rows={2}
          value={storefront.heroSubtitle}
          onChange={(e) => setStorefront({ ...storefront, heroSubtitle: e.target.value })}
          placeholder="Hero Subtitle"
          className="w-full border border-line rounded-xl px-3 py-2 text-xs"
        />
        <textarea
          rows={2}
          value={storefront.deliveryNotice}
          onChange={(e) => setStorefront({ ...storefront, deliveryNotice: e.target.value })}
          placeholder="Waybill & Delivery Notice"
          className="w-full border border-line rounded-xl px-3 py-2 text-xs"
        />
      </section>

      {/* Terms & Conditions + Privacy Policy */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white border border-line rounded-2xl p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-semibold text-base">Terms &amp; Conditions</h2>
            <button
              type="button"
              disabled={savingKey === 'termsDocument'}
              onClick={() => saveSection('termsDocument', termsDoc, 'Terms & Conditions')}
              className="inline-flex items-center gap-1 bg-ink text-paper px-3.5 py-1.5 rounded-full text-xs font-medium hover:bg-signal"
            >
              <Save size={13} /> Save
            </button>
          </div>
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={termsDoc.awaitingOriginalContent}
              onChange={(e) =>
                setTermsDoc({ ...termsDoc, awaitingOriginalContent: e.target.checked })
              }
              className="accent-[var(--color-signal)]"
            />
            Mark as awaiting original content
          </label>
          <textarea
            rows={5}
            value={termsDoc.content}
            onChange={(e) =>
              setTermsDoc({
                ...termsDoc,
                content: e.target.value,
                awaitingOriginalContent: e.target.value.trim().length === 0,
              })
            }
            placeholder="Paste official SAMTOB P&C Terms & Conditions here..."
            className="w-full border border-line rounded-xl px-3 py-2 text-xs"
          />
        </section>

        <section className="bg-white border border-line rounded-2xl p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-semibold text-base">Privacy Policy</h2>
            <button
              type="button"
              disabled={savingKey === 'privacyDocument'}
              onClick={() => saveSection('privacyDocument', privacyDoc, 'Privacy Policy')}
              className="inline-flex items-center gap-1 bg-ink text-paper px-3.5 py-1.5 rounded-full text-xs font-medium hover:bg-signal"
            >
              <Save size={13} /> Save
            </button>
          </div>
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={privacyDoc.awaitingOriginalContent}
              onChange={(e) =>
                setPrivacyDoc({ ...privacyDoc, awaitingOriginalContent: e.target.checked })
              }
              className="accent-[var(--color-signal)]"
            />
            Mark as awaiting original content
          </label>
          <textarea
            rows={5}
            value={privacyDoc.content}
            onChange={(e) =>
              setPrivacyDoc({
                ...privacyDoc,
                content: e.target.value,
                awaitingOriginalContent: e.target.value.trim().length === 0,
              })
            }
            placeholder="Paste official SAMTOB P&C Privacy Policy here..."
            className="w-full border border-line rounded-xl px-3 py-2 text-xs"
          />
        </section>
      </div>

      {/* Stores, FAQs, Testimonials & Delivery JSON/Form Editors */}
      <section className="bg-white border border-line rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-semibold text-base">Store Locations</h2>
          <button
            type="button"
            disabled={savingKey === 'stores'}
            onClick={() => saveSection('stores', stores, 'Store Locations')}
            className="inline-flex items-center gap-1 bg-ink text-paper px-3.5 py-1.5 rounded-full text-xs font-medium hover:bg-signal"
          >
            <Save size={13} /> Save Stores
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {stores.map((s, idx) => (
            <div key={idx} className="border border-line rounded-xl p-3 space-y-2">
              <input
                type="text"
                value={s.name}
                onChange={(e) => {
                  const next = [...stores];
                  next[idx] = { ...next[idx], name: e.target.value };
                  setStores(next);
                }}
                className="w-full border border-line rounded-lg px-2.5 py-1.5 text-xs font-semibold"
              />
              <textarea
                rows={2}
                value={s.address}
                onChange={(e) => {
                  const next = [...stores];
                  next[idx] = { ...next[idx], address: e.target.value };
                  setStores(next);
                }}
                className="w-full border border-line rounded-lg px-2.5 py-1.5 text-xs"
              />
              <input
                type="text"
                value={s.phone}
                onChange={(e) => {
                  const next = [...stores];
                  next[idx] = { ...next[idx], phone: e.target.value };
                  setStores(next);
                }}
                className="w-full border border-line rounded-lg px-2.5 py-1.5 text-xs font-data"
              />
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white border border-line rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-semibold text-base">Delivery Rates</h2>
          <button
            type="button"
            disabled={savingKey === 'deliveryTiers'}
            onClick={() => saveSection('deliveryTiers', deliveryTiers, 'Delivery Rates')}
            className="inline-flex items-center gap-1 bg-ink text-paper px-3.5 py-1.5 rounded-full text-xs font-medium hover:bg-signal"
          >
            <Save size={13} /> Save Rates
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {deliveryTiers.map((tier, tIdx) => (
            <div key={tier.region} className="border border-line rounded-xl p-3 space-y-2">
              <p className="font-semibold text-xs">{tier.regionLabel}</p>
              {tier.options.map((opt, oIdx) => (
                <div key={opt.method} className="flex items-center gap-2 text-xs">
                  <span className="flex-1 text-steel">{opt.label}</span>
                  <input
                    type="number"
                    min={0}
                    value={opt.fee}
                    onChange={(e) => {
                      const next = [...deliveryTiers];
                      const nextOpts = [...next[tIdx].options];
                      nextOpts[oIdx] = { ...nextOpts[oIdx], fee: Number(e.target.value) };
                      next[tIdx] = { ...next[tIdx], options: nextOpts };
                      setDeliveryTiers(next);
                    }}
                    className="w-28 border border-line rounded-lg px-2.5 py-1 font-data"
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white border border-line rounded-2xl p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-semibold text-base">FAQs ({faqs.length})</h2>
            <button
              type="button"
              disabled={savingKey === 'faqs'}
              onClick={() => saveSection('faqs', faqs, 'FAQs')}
              className="inline-flex items-center gap-1 bg-ink text-paper px-3.5 py-1.5 rounded-full text-xs font-medium hover:bg-signal"
            >
              <Save size={13} /> Save FAQs
            </button>
          </div>
          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {faqs.map((item, idx) => (
              <div key={idx} className="border border-line rounded-xl p-3 space-y-1.5">
                <input
                  type="text"
                  value={item.q}
                  onChange={(e) => {
                    const next = [...faqs];
                    next[idx] = { ...next[idx], q: e.target.value };
                    setFaqs(next);
                  }}
                  className="w-full border border-line rounded-lg px-2.5 py-1 text-xs font-semibold"
                />
                <textarea
                  rows={2}
                  value={item.a}
                  onChange={(e) => {
                    const next = [...faqs];
                    next[idx] = { ...next[idx], a: e.target.value };
                    setFaqs(next);
                  }}
                  className="w-full border border-line rounded-lg px-2.5 py-1 text-xs"
                />
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white border border-line rounded-2xl p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-semibold text-base">
              Testimonials ({testimonials.length})
            </h2>
            <button
              type="button"
              disabled={savingKey === 'testimonials'}
              onClick={() => saveSection('testimonials', testimonials, 'Testimonials')}
              className="inline-flex items-center gap-1 bg-ink text-paper px-3.5 py-1.5 rounded-full text-xs font-medium hover:bg-signal"
            >
              <Save size={13} /> Save Testimonials
            </button>
          </div>
          <div className="space-y-3">
            {testimonials.map((t, idx) => (
              <div key={idx} className="border border-line rounded-xl p-3 space-y-1.5">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={t.author}
                    onChange={(e) => {
                      const next = [...testimonials];
                      next[idx] = { ...next[idx], author: e.target.value };
                      setTestimonials(next);
                    }}
                    className="flex-1 border border-line rounded-lg px-2.5 py-1 text-xs font-semibold"
                  />
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={t.rating}
                    onChange={(e) => {
                      const next = [...testimonials];
                      next[idx] = { ...next[idx], rating: Number(e.target.value) };
                      setTestimonials(next);
                    }}
                    className="w-16 border border-line rounded-lg px-2 py-1 text-xs font-data"
                  />
                </div>
                <textarea
                  rows={2}
                  value={t.quote}
                  onChange={(e) => {
                    const next = [...testimonials];
                    next[idx] = { ...next[idx], quote: e.target.value };
                    setTestimonials(next);
                  }}
                  className="w-full border border-line rounded-lg px-2.5 py-1 text-xs"
                />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
