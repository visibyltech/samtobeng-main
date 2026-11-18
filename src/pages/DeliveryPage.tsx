import { motion } from 'motion/react';
import { Clock, MapPin, Truck } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { formatNaira } from '../lib/format';

export function DeliveryPage() {
  const { settings } = useStore();

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-14 space-y-10">
      <div>
        <p className="font-data text-xs uppercase tracking-widest text-steel mb-2">Shipping</p>
        <h1 className="font-display font-bold text-3xl sm:text-4xl">Delivery &amp; Shipping</h1>
        <p className="text-steel mt-2">
          Same-day and next-day delivery in Ibadan, and nationwide shipping across Nigeria.
        </p>
      </div>

      <div className="bg-white border border-line rounded-2xl p-6 flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-signal/10 text-signal flex items-center justify-center shrink-0">
          <Clock size={20} />
        </div>
        <div>
          <h2 className="font-display font-semibold text-base">Waybill &amp; Dispatch Schedule</h2>
          <p className="text-sm text-steel mt-1 leading-relaxed">
            {settings.storefront.deliveryNotice}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {settings.deliveryTiers.map((tier, idx) => (
          <motion.div
            key={tier.region}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="bg-white border border-line rounded-2xl p-6"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <h3 className="font-display font-semibold text-lg flex items-center gap-2">
                <MapPin size={18} className="text-signal" />
                {tier.regionLabel}
              </h3>
              {tier.freeThreshold && (
                <span className="text-xs font-data text-mint bg-mint/10 px-3 py-1 rounded-full">
                  Free on orders ≥ {formatNaira(tier.freeThreshold)}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {tier.options.map((opt) => (
                <div
                  key={opt.method}
                  className="border border-line rounded-xl p-4 flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium text-sm flex items-center gap-1.5">
                      <Truck size={14} className="text-steel" />
                      {opt.label}
                    </p>
                    <p className="text-xs text-steel mt-0.5">ETA: {opt.eta}</p>
                  </div>
                  <p className="font-data font-bold text-base">{formatNaira(opt.fee)}</p>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
