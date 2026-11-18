import { useState } from 'react';
import { ChevronDown, ExternalLink, MessageCircle } from 'lucide-react';
import { useStore } from '../context/StoreContext';

export function FaqPage() {
  const { settings } = useStore();
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-14 space-y-10">
      <div>
        <p className="font-data text-xs uppercase tracking-widest text-steel mb-2">Support</p>
        <h1 className="font-display font-bold text-3xl sm:text-4xl">
          Frequently Asked Questions
        </h1>
        <p className="text-steel mt-2">
          Everything you need to know about our warranty, UK used &amp; brand new devices, delivery, and policies.
        </p>
      </div>

      <div className="space-y-3">
        {settings.faqs.map((item, idx) => {
          const isOpen = openIdx === idx;
          return (
            <div key={item.q} className="bg-white border border-line rounded-2xl overflow-hidden">
              <button
                type="button"
                onClick={() => setOpenIdx(isOpen ? null : idx)}
                className="w-full px-6 py-4 text-left flex items-center justify-between gap-4"
              >
                <span className="font-display font-semibold text-sm sm:text-base">{item.q}</span>
                <ChevronDown
                  size={18}
                  className={`text-steel shrink-0 transition-transform ${isOpen ? 'rotate-180 text-signal' : ''}`}
                />
              </button>
              {isOpen && (
                <div className="px-6 pb-5 text-sm text-steel leading-relaxed border-t border-line/60 pt-3">
                  {item.a}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="bg-white border border-line rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-semibold text-base">Still have questions?</h2>
          <p className="text-xs text-steel mt-1">
            Message our team on WhatsApp or review us on Google &amp; Jiji.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={settings.storefront.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-signal text-white px-4 py-2 rounded-full text-xs font-medium hover:brightness-110 transition-all"
          >
            <MessageCircle size={14} /> WhatsApp Us
          </a>
          <a
            href={settings.storefront.googleReviewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 border border-line px-4 py-2 rounded-full text-xs font-medium hover:border-signal hover:text-signal transition-colors"
          >
            Google Reviews <ExternalLink size={12} />
          </a>
          <a
            href={settings.storefront.jijiReviewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 border border-line px-4 py-2 rounded-full text-xs font-medium hover:border-signal hover:text-signal transition-colors"
          >
            Jiji Opinion <ExternalLink size={12} />
          </a>
        </div>
      </div>
    </div>
  );
}
