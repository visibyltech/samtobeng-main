import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useScroll } from 'motion/react';
import {
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  PiggyBank,
  Search,
  ShoppingCart,
  User as UserIcon,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

const NAV_LINKS = [
  { to: '/products', label: 'Shop All' },
  { to: '/products?category=laptops', label: 'Laptops' },
  { to: '/products?category=phones', label: 'Phones' },
  { to: '/products?category=gadgets', label: 'Gadgets' },
  { to: '/delivery', label: 'Delivery' },
  { to: '/stores', label: 'Stores' },
  { to: '/faq', label: 'FAQ' },
];

function UserMenu() {
  const { loggedIn, profile, isAdmin, authReady, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  if (!authReady) {
    return <div className="hidden sm:block w-9 h-9 rounded-full bg-ink/5 animate-pulse" />;
  }

  if (!loggedIn) {
    return (
      <Link
        to="/account/login"
        aria-label="Account login"
        className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-line text-xs font-medium text-ink hover:border-signal hover:text-signal transition-colors whitespace-nowrap shrink-0"
      >
        <UserIcon size={15} />
        <span>Log In</span>
      </Link>
    );
  }

  const firstName = profile?.name?.split(' ')[0] || 'Account';

  async function handleLogout() {
    setOpen(false);
    await logout();
    navigate('/');
  }

  return (
    <div ref={menuRef} className="relative hidden sm:block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full hover:bg-ink/5 transition-colors"
      >
        <span className="w-6 h-6 rounded-full bg-signal/10 text-signal flex items-center justify-center text-xs font-data font-semibold">
          {firstName.charAt(0).toUpperCase()}
        </span>
        <span className="text-sm font-medium max-w-[100px] truncate">{firstName}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={14} />
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-56 bg-white border border-line rounded-2xl shadow-lg py-2 z-50"
          >
            {isAdmin ? (
              <>
                <Link
                  to="/admin"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-ink/5"
                >
                  <LayoutDashboard size={15} />
                  <span>Admin Dashboard</span>
                </Link>
                <Link
                  to="/account/dashboard"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-ink/5"
                >
                  <Package size={15} />
                  <span>Customer Account</span>
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/account/dashboard"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-ink/5"
                >
                  <LayoutDashboard size={15} />
                  <span>Dashboard</span>
                </Link>
                <Link
                  to="/account/orders"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-ink/5"
                >
                  <Package size={15} />
                  <span>My Orders</span>
                </Link>
                <Link
                  to="/account/save-to-buy"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-ink/5"
                >
                  <PiggyBank size={15} />
                  <span>Save-to-Buy</span>
                </Link>
              </>
            )}
            <div className="border-t border-line mt-1 pt-1">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-signal hover:bg-signal/5"
              >
                <LogOut size={15} />
                <span>Log Out</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { count } = useCart();
  const { loggedIn, profile, isAdmin, logout } = useAuth();
  const { scrollY } = useScroll();
  const navigate = useNavigate();

  useEffect(() => {
    return scrollY.on('change', (y) => {
      setScrolled(y > 12);
    });
  }, [scrollY]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  return (
    <motion.header
      className="sticky top-0 z-40 backdrop-blur border-b"
      animate={{
        backgroundColor: scrolled ? 'rgba(250,249,246,0.92)' : 'rgba(250,249,246,0.75)',
        borderColor: scrolled ? 'rgba(230,228,221,1)' : 'rgba(230,228,221,0)',
        boxShadow: scrolled ? '0 4px 20px -8px rgba(11,11,12,0.08)' : '0 0 0 rgba(0,0,0,0)',
      }}
      transition={{ duration: 0.25 }}
    >
      <div className="divider-wave" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          className="flex items-center justify-between"
          animate={{ height: scrolled ? 60 : 68 }}
          transition={{ duration: 0.25 }}
        >
          <Link
            to="/"
            className="flex items-center gap-1 font-display font-bold text-xl tracking-tight shrink-0"
          >
            <img
              src="/logo.png"
              alt="SAMTOB P&C"
              width={142}
              height={48}
              className="object-contain h-10 sm:h-11 w-auto"
            />
          </Link>

          <nav className="hidden lg:flex items-center gap-7">
            {NAV_LINKS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="relative text-sm font-medium text-ink/80 hover:text-signal transition-colors group py-1 whitespace-nowrap shrink-0"
              >
                {item.label}
                <span className="absolute left-0 -bottom-0.5 h-[1.5px] w-0 bg-signal group-hover:w-full transition-all duration-300" />
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              to="/products"
              aria-label="Search products"
              className="hidden sm:flex p-2 rounded-full hover:bg-ink/5 transition-colors"
            >
              <Search size={20} />
            </Link>

            <UserMenu />

            <Link
              to="/cart"
              aria-label="View cart"
              className="relative p-2 rounded-full hover:bg-ink/5 transition-colors"
            >
              <ShoppingCart size={20} />
              <AnimatePresence>
                {count > 0 && (
                  <motion.span
                    key={count}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                    className="absolute -top-1 -right-1 bg-signal text-white text-[10px] font-data font-medium rounded-full w-4 h-4 flex items-center justify-center"
                  >
                    {count}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>

            <button
              type="button"
              className="lg:hidden p-2 rounded-full hover:bg-ink/5 transition-colors relative z-50"
              onClick={() => setMobileOpen((prev) => !prev)}
              aria-label="Toggle menu"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={mobileOpen ? 'close' : 'menu'}
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="block"
                >
                  {mobileOpen ? <X size={22} /> : <Menu size={22} />}
                </motion.span>
              </AnimatePresence>
            </button>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="lg:hidden border-t border-line bg-paper overflow-hidden"
          >
            <nav className="flex flex-col px-4 py-3 gap-1">
              {NAV_LINKS.map((item, idx) => (
                <motion.div
                  key={item.to}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.04 * idx }}
                >
                  <Link
                    to={item.to}
                    onClick={() => setMobileOpen(false)}
                    className="block py-2.5 text-sm font-medium border-b border-line/60"
                  >
                    {item.label}
                  </Link>
                </motion.div>
              ))}
              <Link
                to={loggedIn ? (isAdmin ? '/admin' : '/account/dashboard') : '/account/login'}
                onClick={() => setMobileOpen(false)}
                className="py-2.5 text-sm font-medium text-signal"
              >
                {loggedIn
                  ? `${isAdmin ? 'Admin Dashboard' : 'My Dashboard'}${
                      profile?.name ? ` (${profile.name.split(' ')[0]})` : ''
                    }`
                  : 'Account Login'}
              </Link>
              {loggedIn && (
                <button
                  type="button"
                  onClick={async () => {
                    await logout();
                    setMobileOpen(false);
                    navigate('/');
                  }}
                  className="text-left py-2.5 text-sm font-medium text-steel"
                >
                  Log Out
                </button>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
