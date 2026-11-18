import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ArrowRight,
  Laptop,
  Repeat,
  ShieldCheck,
  Smartphone,
  Speaker,
  Truck,
  Wrench,
} from 'lucide-react';
import { ProductCard } from '../components/ProductCard';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';

function AnimatedCounter({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let start = 0;
    const duration = 700;
    const stepMs = 20;
    const steps = Math.max(1, Math.floor(duration / stepMs));
    const increment = value / steps;
    const timer = setInterval(() => {
      start += increment;
      if (start >= value) {
        setDisplay(value);
        clearInterval(timer);
      } else {
        setDisplay(Math.round(start));
      }
    }, stepMs);
    return () => clearInterval(timer);
  }, [value]);

  return (
    <span>
      {display}
      {suffix}
    </span>
  );
}

const categoryIconMap: Record<string, typeof Laptop> = {
  laptops: Laptop,
  phones: Smartphone,
  gadgets: Speaker,
};

export function HomePage() {
  const { publishedProducts, categories, settings, loading, needsCatalogSeed, seeding, seedOriginalCatalog } = useStore();
  const { isAdmin, loginWithGoogle } = useAuth();

  const { storefront, testimonials } = settings;
  const flashSaleProducts = publishedProducts.filter((p) => p.flashSale).slice(0, 4);
  const featuredProducts = publishedProducts.filter((p) => p.featured).slice(0, 8);
  const displayFeatured = featuredProducts.length > 0 ? featuredProducts : publishedProducts.slice(0, 8);
  const devicesCount = publishedProducts.length > 0 ? publishedProducts.length : storefront.stats.devicesInStock;

  return (
    <div>
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-line mesh-bg">
        <div
          className="pointer-events-none absolute inset-0 hidden lg:block"
          style={{
            background:
              'radial-gradient(600px circle at 50% 30%, rgba(228,20,27,0.12), transparent 70%)',
          }}
        />
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-20 lg:py-28 text-center relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
          >
            <span className="inline-flex items-center gap-2 text-xs font-data uppercase tracking-widest text-signal mb-5">
              <span className="signal-bars active-4">
                <span />
                <span />
                <span />
                <span />
              </span>
              {storefront.heroEyebrow}
            </span>

            <h1 className="font-display font-bold text-4xl sm:text-5xl lg:text-6xl leading-[1.05] tracking-tight">
              <span className="block">A strong signal for</span>
              <span className="block">
                your next <span className="text-gradient-signal">{storefront.heroTitleHighlight}</span>.
              </span>
            </h1>

            <p className="mt-6 text-steel text-lg max-w-xl mx-auto leading-relaxed">
              {storefront.heroSubtitle}
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link
                to="/products"
                className="inline-flex items-center gap-2 bg-ink text-paper px-6 py-3.5 rounded-full font-medium text-sm hover:bg-signal transition-colors glow-signal"
              >
                Shop All Products <ArrowRight size={16} />
              </Link>
              <a
                href={storefront.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 border border-ink/20 px-6 py-3.5 rounded-full font-medium text-sm hover:border-signal hover:text-signal transition-colors"
              >
                Chat on WhatsApp
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Brand Marquee */}
      <div className="relative overflow-hidden border-y border-line bg-white py-6">
        <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />
        <div className="animate-marquee gap-16">
          {[...storefront.brandsMarquee, ...storefront.brandsMarquee].map((brand, i) => (
            <span
              key={`${brand}-${i}`}
              className="font-display font-bold text-xl sm:text-2xl text-ink/20 tracking-tight whitespace-nowrap select-none"
            >
              {brand}
            </span>
          ))}
        </div>
      </div>

      {/* Stats Strip */}
      <section className="border-b border-line bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          <div>
            <p className="font-display font-bold text-3xl">
              <AnimatedCounter value={storefront.stats.physicalStores} />
            </p>
            <p className="text-xs text-steel mt-1 font-data uppercase tracking-wider">
              Physical Stores
            </p>
          </div>
          <div>
            <p className="font-display font-bold text-3xl">
              <AnimatedCounter value={devicesCount} suffix="+" />
            </p>
            <p className="text-xs text-steel mt-1 font-data uppercase tracking-wider">
              Devices in stock
            </p>
          </div>
          <div>
            <p className="font-display font-bold text-3xl">
              <AnimatedCounter value={storefront.stats.warrantyYears} suffix="yr" />
            </p>
            <p className="text-xs text-steel mt-1 font-data uppercase tracking-wider">
              Warranty on new
            </p>
          </div>
          <div>
            <p className="font-display font-bold text-3xl">
              <AnimatedCounter value={storefront.stats.testedPercent} suffix="%" />
            </p>
            <p className="text-xs text-steel mt-1 font-data uppercase tracking-wider">
              Tested before sale
            </p>
          </div>
        </div>
      </section>

      {/* Admin Catalog Seed Banner if Firestore is empty */}
      {needsCatalogSeed && (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-10">
          <div className="rounded-2xl border border-signal/30 bg-signal/5 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-data uppercase tracking-wider text-signal font-semibold">
                Firestore Migration Required
              </p>
              <p className="text-sm text-ink mt-1">
                No products are currently stored in Cloud Firestore yet. Sign in as store administrator to migrate the 77 original SAMTOB P&amp;C products into Firestore.
              </p>
            </div>
            {isAdmin ? (
              <button
                type="button"
                disabled={seeding}
                onClick={() => seedOriginalCatalog(true)}
                className="shrink-0 bg-signal text-white px-5 py-2.5 rounded-full text-sm font-medium hover:brightness-110 disabled:opacity-60"
              >
                {seeding ? 'Migrating 77 Products...' : 'Migrate 77 Products Now'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => loginWithGoogle()}
                className="shrink-0 bg-ink text-paper px-5 py-2.5 rounded-full text-sm font-medium hover:bg-signal transition-colors"
              >
                Admin Sign In to Migrate
              </button>
            )}
          </div>
        </section>
      )}

      {/* Categories */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <span className="text-xs font-data uppercase tracking-widest text-steel">
          Category
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mt-4">
          {categories
            .filter((c) => c.active)
            .slice(0, 6)
            .map((cat) => {
              const Icon = categoryIconMap[cat.slug] || Laptop;
              return (
                <Link
                  key={cat.id}
                  to={`/products?category=${cat.slug}`}
                  className="group flex flex-col items-center justify-center gap-3 rounded-2xl border border-line bg-white p-6 hover:border-signal/50 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 text-center"
                >
                  <div className="p-3 rounded-full bg-slate-50 group-hover:bg-signal/10 transition-colors">
                    <Icon className="w-6 h-6 text-steel group-hover:text-signal transition-colors" />
                  </div>
                  <h3 className="font-display font-bold text-lg group-hover:text-signal transition-colors">
                    {cat.name}
                  </h3>
                </Link>
              );
            })}
        </div>
      </section>

      {/* Flash Sale Section */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-end justify-between mb-8">
          <div>
            <span className="text-xs font-data uppercase tracking-widest text-signal">
              On the shelf
            </span>
            <h2 className="font-display font-bold text-3xl mt-1">Flash Sale</h2>
          </div>
          <Link
            to="/products"
            className="text-sm font-medium text-signal hover:underline hidden sm:inline"
          >
            View all products →
          </Link>
        </div>
        {flashSaleProducts.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {flashSaleProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* Featured Devices Section */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-end justify-between mb-8">
          <div>
            <span className="text-xs font-data uppercase tracking-widest text-signal">
              On the shelf
            </span>
            <h2 className="font-display font-bold text-3xl mt-1">Featured devices</h2>
          </div>
          <Link
            to="/products"
            className="text-sm font-medium text-signal hover:underline hidden sm:inline"
          >
            View all products →
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-line bg-white h-80 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {displayFeatured.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* Value Propositions */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <div className="w-11 h-11 rounded-full bg-signal/10 flex items-center justify-center mb-4">
              <ShieldCheck size={20} className="text-signal" />
            </div>
            <h3 className="font-display font-semibold text-base">
              Warranty on every device
            </h3>
            <p className="text-sm text-steel mt-1.5 leading-relaxed">
              1yr on new, 30-day guaranty on UK used.
            </p>
          </div>
          <div>
            <div className="w-11 h-11 rounded-full bg-signal/10 flex items-center justify-center mb-4">
              <Truck size={20} className="text-signal" />
            </div>
            <h3 className="font-display font-semibold text-base">
              Nationwide delivery
            </h3>
            <p className="text-sm text-steel mt-1.5 leading-relaxed">
              Free delivery on qualifying orders — shipped anywhere in Nigeria.
            </p>
          </div>
          <div>
            <div className="w-11 h-11 rounded-full bg-signal/10 flex items-center justify-center mb-4">
              <Repeat size={20} className="text-signal" />
            </div>
            <h3 className="font-display font-semibold text-base">
              Trade-in accepted
            </h3>
            <p className="text-sm text-steel mt-1.5 leading-relaxed">
              Swap your old SAMTOB device for a new one.
            </p>
          </div>
          <div>
            <div className="w-11 h-11 rounded-full bg-signal/10 flex items-center justify-center mb-4">
              <Wrench size={20} className="text-signal" />
            </div>
            <h3 className="font-display font-semibold text-base">
              Professional repairs
            </h3>
            <p className="text-sm text-steel mt-1.5 leading-relaxed">
              Affordable, expert repair services in-store.
            </p>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-white border-y border-line py-20 overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mb-10">
          <span className="text-xs font-data uppercase tracking-widest text-signal">
            Customer signal
          </span>
          <h2 className="font-display font-bold text-3xl mt-1">
            What buyers are saying
          </h2>
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid md:grid-cols-3 gap-6">
          {testimonials.map((t, idx) => (
            <div
              key={`${t.author}-${idx}`}
              className="rounded-2xl border border-line bg-paper p-6 flex flex-col justify-between"
            >
              <div>
                <div className="text-signal text-sm mb-3 tracking-widest">
                  {'★'.repeat(t.rating)}
                  {'☆'.repeat(Math.max(0, 5 - t.rating))}
                </div>
                <p className="text-sm text-ink leading-relaxed">{t.quote}</p>
              </div>
              <p className="text-xs font-data text-steel mt-4">— {t.author}</p>
            </div>
          ))}
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-8 text-center text-xs text-steel">
          <a
            href={storefront.googleReviewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-signal hover:underline"
          >
            Leave a Google review
          </a>
          <span className="mx-2">·</span>
          <a
            href={storefront.jijiReviewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-signal hover:underline"
          >
            Leave a Jiji review
          </a>
        </div>
      </section>

      {/* Bottom Question CTA */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-20">
        <div className="rounded-2xl bg-ink text-paper p-8 sm:p-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="font-display font-bold text-2xl sm:text-3xl">
              Have a question before you buy?
            </h2>
            <p className="text-paper/70 text-sm mt-2">
              Our team replies fast on WhatsApp, or visit one of our stores.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 shrink-0">
            <Link
              to="/faq"
              className="bg-signal text-white px-6 py-3 rounded-full text-sm font-medium hover:brightness-110 transition-all"
            >
              Read FAQ
            </Link>
            <Link
              to="/stores"
              className="border border-paper/30 text-paper px-6 py-3 rounded-full text-sm font-medium hover:border-signal hover:text-signal-bright transition-colors"
            >
              Find a store
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
