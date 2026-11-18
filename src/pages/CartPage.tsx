import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useStore } from '../context/StoreContext';
import { getOptimizedImageUrl } from '../lib/cloudinary';
import { formatNaira } from '../lib/format';

export function CartPage() {
  const { items, updateQty, removeItem, subtotal, count } = useCart();
  const { products } = useStore();
  const navigate = useNavigate();

  // Keep max stock synced with live Firestore catalog if available
  const stockMap = new Map<string, number>();
  for (const p of products) {
    stockMap.set(p.id, p.stock);
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-ink/5 flex items-center justify-center mx-auto mb-5 text-steel">
          <ShoppingBag size={28} />
        </div>
        <h1 className="font-display font-bold text-2xl sm:text-3xl mb-2">Your cart is empty</h1>
        <p className="text-sm text-steel max-w-md mx-auto mb-8">
          Browse our tested brand new and UK used laptops, phones and gadgets to add items to your cart.
        </p>
        <Link
          to="/products"
          className="inline-flex items-center gap-2 bg-ink text-paper px-6 py-3 rounded-full text-sm font-medium hover:bg-signal transition-colors"
        >
          Browse Products <ArrowRight size={16} />
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="font-data text-xs uppercase tracking-widest text-steel mb-1">
            Shopping Cart
          </p>
          <h1 className="font-display font-bold text-3xl">
            Your Cart ({count} {count === 1 ? 'item' : 'items'})
          </h1>
        </div>
        <Link
          to="/products"
          className="text-sm text-steel hover:text-signal transition-colors underline underline-offset-4"
        >
          Continue shopping
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => {
            const liveStock = stockMap.get(item.productId) ?? item.stock;
            return (
              <motion.div
                key={item.productId}
                layout
                className="bg-white border border-line rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4"
              >
                <Link
                  to={`/products/${item.slug}`}
                  className="w-24 h-24 rounded-xl bg-[#F5F4F0] flex items-center justify-center shrink-0 overflow-hidden"
                >
                  <img
                    src={getOptimizedImageUrl(item.image, 240)}
                    alt={item.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain p-2"
                  />
                </Link>

                <div className="flex-1 min-w-0">
                  <Link
                    to={`/products/${item.slug}`}
                    className="font-display font-semibold text-base hover:text-signal transition-colors line-clamp-2"
                  >
                    {item.name}
                  </Link>
                  <p className="font-data text-sm text-steel mt-1">
                    {formatNaira(item.price)} each
                  </p>
                  {liveStock <= 3 && liveStock > 0 && (
                    <p className="font-data text-[11px] text-signal mt-1">
                      Only {liveStock} left in stock
                    </p>
                  )}
                  {liveStock === 0 && (
                    <p className="font-data text-[11px] text-signal mt-1">
                      Currently out of stock
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4">
                  <div className="inline-flex items-center border border-line rounded-full">
                    <button
                      type="button"
                      onClick={() => updateQty(item.productId, item.qty - 1)}
                      disabled={item.qty <= 1}
                      aria-label="Decrease quantity"
                      className="p-2 text-steel hover:text-ink disabled:opacity-40"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="px-3 text-sm font-data font-medium">{item.qty}</span>
                    <button
                      type="button"
                      onClick={() => updateQty(item.productId, item.qty + 1)}
                      disabled={item.qty >= liveStock}
                      aria-label="Increase quantity"
                      className="p-2 text-steel hover:text-ink disabled:opacity-40"
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  <p className="font-data font-semibold text-base min-w-[100px] text-right">
                    {formatNaira(item.price * item.qty)}
                  </p>

                  <button
                    type="button"
                    onClick={() => removeItem(item.productId)}
                    aria-label={`Remove ${item.name}`}
                    className="p-2 rounded-full text-steel hover:text-signal hover:bg-signal/5 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>

        <aside className="bg-white border border-line rounded-2xl p-6 space-y-5 lg:sticky lg:top-24">
          <h2 className="font-display font-semibold text-lg">Order Summary</h2>
          <div className="space-y-2.5 text-sm border-b border-line pb-4">
            <div className="flex justify-between text-steel">
              <span>Subtotal</span>
              <span className="font-data text-ink font-medium">{formatNaira(subtotal)}</span>
            </div>
            <div className="flex justify-between text-steel">
              <span>Delivery</span>
              <span className="text-xs">Calculated at checkout</span>
            </div>
            {subtotal >= 100000 && (
              <p className="text-xs text-mint bg-mint/10 rounded-lg px-3 py-2 font-medium">
                Qualifies for free delivery within Ibadan (orders ₦100,000+)
              </p>
            )}
          </div>

          <div className="flex justify-between items-baseline">
            <span className="font-medium">Estimated Total</span>
            <span className="font-data font-bold text-xl">{formatNaira(subtotal)}</span>
          </div>

          <button
            type="button"
            onClick={() => navigate('/checkout')}
            className="w-full inline-flex items-center justify-center gap-2 bg-signal text-white py-3.5 rounded-full text-sm font-medium hover:brightness-110 transition-all"
          >
            Proceed to Checkout <ArrowRight size={16} />
          </button>

          <Link
            to="/products"
            className="block text-center text-xs text-steel hover:text-ink transition-colors"
          >
            Continue shopping
          </Link>
        </aside>
      </div>
    </div>
  );
}
