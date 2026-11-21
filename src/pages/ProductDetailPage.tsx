import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Check, Laptop, Minus, Plus, ShieldCheck, ShoppingCart, Truck } from 'lucide-react';
import { ProductCard, StockSignalBars } from '../components/ProductCard';
import { SaveToBuyModal } from '../components/SaveToBuyModal';
import { useCart } from '../context/CartContext';
import { useStore } from '../context/StoreContext';
import { useToast } from '../context/ToastContext';
import { getOptimizedImageUrl } from '../lib/cloudinary';
import { computeDiscountPercent, formatNaira } from '../lib/format';

export function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { products, publishedProducts, loading } = useStore();
  const { addItem } = useCart();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const product =
    publishedProducts.find((p) => p.slug === slug) ||
    products.find((p) => p.slug === slug);

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [qty, setQty] = useState(1);
  const [addedFeedback, setAddedFeedback] = useState(false);
  const [showStickyMobile, setShowStickyMobile] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setActiveImageIndex(0);
    setQty(1);
    setImgFailed(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [slug]);

  useEffect(() => {
    function handleScroll() {
      setShowStickyMobile(window.scrollY > 480);
    }
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid lg:grid-cols-2 gap-12">
          <div className="aspect-square rounded-2xl bg-white border border-line animate-pulse" />
          <div className="space-y-4">
            <div className="h-6 w-24 bg-white rounded animate-pulse" />
            <div className="h-10 w-3/4 bg-white rounded animate-pulse" />
            <div className="h-8 w-1/3 bg-white rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-24 text-center">
        <h1 className="font-display font-bold text-3xl mb-3">Product not found</h1>
        <p className="text-steel mb-8">
          This device may have been sold out or removed from the shelf.
        </p>
        <Link
          to="/products"
          className="inline-flex bg-ink text-paper px-6 py-3 rounded-full text-sm font-medium hover:bg-signal transition-colors"
        >
          Browse All Products
        </Link>
      </div>
    );
  }

  const images = product.images && product.images.length > 0 ? product.images : ['/logo.png'];
  const currentImg = getOptimizedImageUrl(images[activeImageIndex] || images[0], 1080);
  const discount = computeDiscountPercent(product.price, product.oldPrice);
  const badgeLabel = product.condition === 'new' ? 'Brand New' : 'UK Used';
  const related = publishedProducts
    .filter((p) => p.id !== product.id && p.category === product.category)
    .slice(0, 4);

  function handleAddToCart() {
    if (!product || product.stock <= 0) return;
    addItem(
      {
        productId: product.id,
        slug: product.slug,
        name: product.name,
        price: product.price,
        image: images[0],
        stock: product.stock,
      },
      qty
    );
    setAddedFeedback(true);
    showToast(`${product.name} added to cart`, 'success');
    setTimeout(() => setAddedFeedback(false), 1800);
  }

  function handleBuyNow() {
    if (!product || product.stock <= 0) return;
    addItem(
      {
        productId: product.id,
        slug: product.slug,
        name: product.name,
        price: product.price,
        image: images[0],
        stock: product.stock,
      },
      qty
    );
    navigate('/checkout');
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
      <nav className="text-xs text-steel font-data mb-8 flex flex-wrap gap-2">
        <Link className="hover:text-signal" to="/products">
          Shop
        </Link>
        <span>/</span>
        <Link className="hover:text-signal capitalize" to={`/products?category=${product.category}`}>
          {product.category}
        </Link>
        <span>/</span>
        <span className="text-ink">{product.name}</span>
      </nav>

      <div className="grid lg:grid-cols-2 gap-12">
        {/* Image Gallery */}
        <div>
          <div className="relative aspect-square rounded-2xl overflow-hidden border border-line bg-cloud flex items-center justify-center">
            {currentImg && !imgFailed ? (
              <img
                src={currentImg}
                alt={product.name}
                referrerPolicy="no-referrer"
                onError={() => setImgFailed(true)}
                className="w-full h-full object-contain p-6"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-steel/60 p-8">
                <Laptop size={48} strokeWidth={1.5} />
                <span className="text-xs font-data mt-3">{product.name}</span>
              </div>
            )}

            <span className="absolute top-4 left-4 bg-ink text-paper text-xs font-medium px-3 py-1.5 rounded-full">
              {badgeLabel}
            </span>
            {discount !== null && (
              <span className="absolute top-4 right-4 bg-signal text-white text-xs font-bold px-3 py-1.5 rounded-full">
                -{discount}%
              </span>
            )}
          </div>

          {images.length > 1 && (
            <div className="grid grid-cols-5 gap-3 mt-4">
              {images.map((imgUrl, idx) => (
                <button
                  key={`${imgUrl}-${idx}`}
                  type="button"
                  onClick={() => {
                    setActiveImageIndex(idx);
                    setImgFailed(false);
                  }}
                  aria-label={`View image ${idx + 1} of ${images.length}`}
                  className={`relative aspect-square rounded-xl overflow-hidden border bg-cloud transition-colors ${
                    activeImageIndex === idx
                      ? 'border-signal'
                      : 'border-line hover:border-steel'
                  }`}
                >
                  <img
                    src={getOptimizedImageUrl(imgUrl, 240)}
                    alt={`${product.name} thumbnail ${idx + 1}`}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain p-1.5"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details & Purchase Module */}
        <div>
          <span className="text-xs uppercase tracking-widest text-steel font-data">
            {product.brand}
          </span>
          <h1 className="font-display font-bold text-2xl sm:text-3xl mt-1 leading-tight">{product.name}</h1>

          <div className="flex items-baseline flex-wrap gap-3 mt-3">
            <span className="font-data font-bold text-2xl">{formatNaira(product.price)}</span>
            {product.oldPrice && product.oldPrice > product.price && (
              <span className="font-data text-steel line-through text-base">
                {formatNaira(product.oldPrice)}
              </span>
            )}
          </div>

          <div className="mt-3">
            <StockSignalBars stock={product.stock} />
          </div>

          <div className="mt-5 rounded-2xl border border-line bg-white p-4 sm:p-5 space-y-4">
            {product.stock <= 0 ? (
              <div className="rounded-full bg-ink/5 text-steel px-6 py-3.5 text-sm font-medium text-center">
                Currently out of stock — chat us on WhatsApp for restock alerts
              </div>
            ) : (
              <>
                <div className="flex items-center gap-4">
                  <div className="flex items-center border border-line rounded-full bg-white">
                    <button
                      type="button"
                      onClick={() => setQty((q) => Math.max(1, q - 1))}
                      aria-label="Decrease quantity"
                      className="p-3 hover:text-signal"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-8 text-center font-data text-sm inline-block">
                      {qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQty((q) => Math.min(product.stock, q + 1))}
                      aria-label="Increase quantity"
                      className="p-3 hover:text-signal"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <span className="text-xs text-steel font-data">
                    {product.stock} available
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleAddToCart}
                    className="relative overflow-hidden inline-flex items-center gap-2 border border-ink px-3 py-3 rounded-full font-medium text-xs sm:text-sm hover:border-signal hover:text-signal transition-colors bg-white"
                  >
                    {addedFeedback ? (
                      <span className="flex items-center gap-2 text-mint">
                        <Check size={16} /> Added to cart
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <ShoppingCart size={16} /> Add to Cart
                      </span>
                    )}
                  </motion.button>

                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={handleBuyNow}
                    className="inline-flex items-center gap-2 bg-signal text-white px-3 py-3 rounded-full font-medium text-xs sm:text-sm hover:brightness-110 transition-[filter] glow-signal"
                  >
                    Buy Now
                  </motion.button>
                </div>

                <div className="pt-1 w-full">
                  <SaveToBuyModal
                    productId={product.id}
                    productSlug={product.slug}
                    productName={product.name}
                    productImage={images[0]}
                    price={product.price}
                  />
                </div>
              </>
            )}
          </div>

          {product.description && (
            <p className="text-steel mt-5 leading-relaxed whitespace-pre-line">
              {product.description}
            </p>
          )}

          {product.specs && product.specs.length > 0 && (
            <div className="mt-6 rounded-2xl border border-line bg-white overflow-hidden">
              <div className="px-4 py-2.5 border-b border-line bg-cloud text-xs font-data uppercase tracking-wider text-steel">
                Specifications
              </div>
              <div className="divide-y divide-line">
                {product.specs.map((spec, idx) => (
                  <div key={`${spec.label}-${idx}`} className="flex justify-between gap-4 px-4 py-2.5 text-sm">
                    <span className="text-steel">{spec.label}</span>
                    <span className="font-data text-ink text-right">{spec.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}



          <div className="mt-8 space-y-3 border-t border-line pt-6">
            <div className="flex items-start gap-3 text-sm">
              <ShieldCheck size={18} className="text-signal shrink-0 mt-0.5" />
              <span className="text-steel">
                {product.condition === 'new'
                  ? '1-year warranty on this brand new device.'
                  : '30-day limited guaranty on this UK used device.'}
              </span>
            </div>
            <div className="flex items-start gap-3 text-sm">
              <Truck size={18} className="text-signal shrink-0 mt-0.5" />
              <span className="text-steel">
                Free delivery within Ibadan on orders ₦100,000+. Nationwide shipping available.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Related Products */}
      {related.length > 0 && (
        <section className="mt-20">
          <h2 className="font-display font-bold text-2xl mb-6">You may also like</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* Sticky Mobile Add to Cart */}
      {product.stock > 0 && (
        <AnimatePresence>
          {showStickyMobile && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white border-t border-line px-4 py-3 flex items-center justify-between gap-3 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]"
            >
              <div className="min-w-0">
                <p className="text-xs text-steel truncate">{product.name}</p>
                <p className="font-data font-semibold text-sm">{formatNaira(product.price)}</p>
              </div>
              <button
                type="button"
                onClick={handleAddToCart}
                className="shrink-0 bg-signal text-white px-5 py-2.5 rounded-full text-sm font-medium"
              >
                Add to Cart
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
