import { Clock, MapPin, Phone } from 'lucide-react';
import { useStore } from '../context/StoreContext';

export function StoresPage() {
  const { settings } = useStore();

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-14 space-y-10">
      <div>
        <p className="font-data text-xs uppercase tracking-widest text-steel mb-2">
          Visit Us in Ibadan
        </p>
        <h1 className="font-display font-bold text-3xl sm:text-4xl">Store Locations</h1>
        <p className="text-steel mt-2">
          Walk in to test any laptop, phone or gadget in person, pick up your order, or drop off a device for repair.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {settings.stores.map((store) => (
          <div
            key={store.name}
            className="bg-white border border-line rounded-2xl p-6 flex flex-col justify-between gap-4"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-signal/10 text-signal flex items-center justify-center">
                <MapPin size={18} />
              </div>
              <h2 className="font-display font-semibold text-lg">{store.name}</h2>
              <p className="text-sm text-steel leading-relaxed">{store.address}</p>
            </div>

            <div className="border-t border-line pt-4 space-y-2 text-xs font-data">
              <a
                href={`tel:${store.phone}`}
                className="flex items-center gap-2 text-ink hover:text-signal transition-colors"
              >
                <Phone size={14} className="text-signal" />
                {store.phone}
              </a>
              <p className="flex items-center gap-2 text-steel">
                <Clock size={14} />
                {store.hours || settings.storefront.businessHours}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
