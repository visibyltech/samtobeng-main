import { Link } from 'react-router-dom';
import { Facebook, Instagram, MessageCircle } from 'lucide-react';
import { useStore } from '../context/StoreContext';

export function Footer() {
  const { settings } = useStore();
  const { storefront, stores } = settings;

  return (
    <footer className="bg-white text-black mt-24 border-t border-line">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
        <div>
          <div className="font-display font-bold text-lg mb-3">
            <Link to="/" className="flex items-center gap-1 font-display font-bold text-xl tracking-tight">
              <img
                src="/logo.png"
                alt="SAMTOB P&C"
                width={150}
                height={70}
                className="object-contain h-12 w-auto"
              />
            </Link>
          </div>
          <p className="text-sm text-black/60 leading-relaxed">
            Trusted signal for new &amp; UK used laptops, phones and gadgets — shipped nationwide across Nigeria.
          </p>
          <div className="flex gap-3 mt-5">
            <a
              href={storefront.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="SAMTOB P&C on Instagram"
              className="p-2 rounded-full border border-line hover:border-signal hover:text-signal-bright transition-colors"
            >
              <Instagram size={18} />
            </a>
            <a
              href={storefront.facebookUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="SAMTOB P&C on Facebook"
              className="p-2 rounded-full border border-line hover:border-signal hover:text-signal-bright transition-colors"
            >
              <Facebook size={18} />
            </a>
            <a
              href={storefront.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="SAMTOB P&C on WhatsApp"
              className="p-2 rounded-full border border-line hover:border-signal hover:text-signal-bright transition-colors"
            >
              <MessageCircle size={18} />
            </a>
          </div>
        </div>

        <div>
          <h4 className="font-display font-semibold text-sm tracking-wide mb-4 text-black/90">
            Shop
          </h4>
          <ul className="space-y-2.5 text-sm text-black/60">
            <li>
              <Link className="hover:text-signal-bright transition-colors" to="/products?category=laptops">
                Laptops
              </Link>
            </li>
            <li>
              <Link className="hover:text-signal-bright transition-colors" to="/products?category=phones">
                Phones
              </Link>
            </li>
            <li>
              <Link className="hover:text-signal-bright transition-colors" to="/products?category=gadgets">
                Gadgets
              </Link>
            </li>
            <li>
              <Link className="hover:text-signal-bright transition-colors" to="/products">
                All Products
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="font-display font-semibold text-sm tracking-wide mb-4 text-black/90">
            Support
          </h4>
          <ul className="space-y-2.5 text-sm text-black/60">
            <li>
              <Link className="hover:text-signal-bright transition-colors" to="/faq">
                FAQ
              </Link>
            </li>
            <li>
              <Link className="hover:text-signal-bright transition-colors" to="/delivery">
                Delivery &amp; Shipping
              </Link>
            </li>
            <li>
              <Link className="hover:text-signal-bright transition-colors" to="/stores">
                Store Locations
              </Link>
            </li>
            <li>
              <Link className="hover:text-signal-bright transition-colors" to="/account/orders">
                Track My Order
              </Link>
            </li>
            <li>
              <Link className="hover:text-signal-bright transition-colors" to="/contact">
                Contact
              </Link>
            </li>
            <li>
              <Link className="hover:text-signal-bright transition-colors" to="/terms">
                Terms &amp; Conditions
              </Link>
            </li>
            <li>
              <Link className="hover:text-signal-bright transition-colors" to="/privacy">
                Privacy Policy
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="font-display font-semibold text-sm tracking-wide mb-4 text-black/90">
            Contact
          </h4>
          <ul className="space-y-2.5 text-sm text-black/60 font-data">
            {stores.map((s) => (
              <li key={s.name}>
                {s.name.replace(' Store', '')}: {s.phone}
              </li>
            ))}
            <li className="pt-1">Mon–Fri 9am–6pm</li>
            <li>Sat 9:30am–5pm · Sun Closed</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-line py-5 text-center text-xs text-black/40">
        © {new Date().getFullYear()} SAMTOB P&amp;C. All rights reserved.
      </div>
    </footer>
  );
}
