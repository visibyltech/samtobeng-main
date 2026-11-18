import { Clock, Facebook, Instagram, MapPin, MessageCircle, Phone } from 'lucide-react';
import { useStore } from '../context/StoreContext';

export function ContactPage() {
  const { settings } = useStore();
  const { storefront, stores } = settings;

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-14 space-y-10">
      <div>
        <p className="font-data text-xs uppercase tracking-widest text-steel mb-2">Get In Touch</p>
        <h1 className="font-display font-bold text-3xl sm:text-4xl">Contact SAMTOB P&amp;C</h1>
        <p className="text-steel mt-2">
          Reach out to any of our Ibadan branches, chat directly on WhatsApp, or connect on social media.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stores.map((s) => (
          <div key={s.name} className="bg-white border border-line rounded-2xl p-6 space-y-3">
            <h2 className="font-display font-semibold text-lg">{s.name}</h2>
            <p className="text-sm text-steel flex items-start gap-2">
              <MapPin size={16} className="text-signal shrink-0 mt-0.5" />
              <span>{s.address}</span>
            </p>
            <a
              href={`tel:${s.phone}`}
              className="text-sm font-data font-medium text-ink hover:text-signal flex items-center gap-2"
            >
              <Phone size={15} className="text-signal" />
              {s.phone}
            </a>
            <p className="text-xs text-steel flex items-center gap-2">
              <Clock size={14} />
              {s.hours || storefront.businessHours}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-white border border-line rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-semibold text-lg">Online Support &amp; Orders</h2>
          <p className="text-sm text-steel mt-1">
            Business Hours: {storefront.businessHours}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <a
            href={storefront.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-signal text-white px-5 py-2.5 rounded-full text-sm font-medium hover:brightness-110 transition-all"
          >
            <MessageCircle size={16} /> {storefront.whatsappLabel || 'Order on WhatsApp'}
          </a>
          <a
            href={storefront.instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 border border-line px-4 py-2.5 rounded-full text-sm font-medium hover:border-signal hover:text-signal"
          >
            <Instagram size={16} /> Instagram
          </a>
          <a
            href={storefront.facebookUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 border border-line px-4 py-2.5 rounded-full text-sm font-medium hover:border-signal hover:text-signal"
          >
            <Facebook size={16} /> Facebook
          </a>
        </div>
      </div>
    </div>
  );
}
