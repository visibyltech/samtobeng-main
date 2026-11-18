import { useEffect } from 'react';
import { BrowserRouter, Link, Route, Routes, useLocation } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Footer } from './components/Footer';
import { Navbar } from './components/Navbar';
import { WhatsAppFloat } from './components/WhatsAppFloat';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { StoreProvider } from './context/StoreContext';
import { ToastProvider } from './context/ToastContext';
import { AccountDashboardPage } from './pages/AccountDashboardPage';
import { AccountOrdersPage } from './pages/AccountOrdersPage';
import { AccountSaveToBuyListPage } from './pages/AccountSaveToBuyListPage';
import { AdminPage } from './pages/AdminPage';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { ContactPage } from './pages/ContactPage';
import { DeliveryPage } from './pages/DeliveryPage';
import { FaqPage } from './pages/FaqPage';
import { HomePage } from './pages/HomePage';
import { PrivacyPage, TermsPage } from './pages/LegalPages';
import { LoginPage } from './pages/LoginPage';
import { OrderConfirmationPage } from './pages/OrderConfirmationPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { ProductsPage } from './pages/ProductsPage';
import { SaveToBuyDetailPage } from './pages/SaveToBuyDetailPage';
import { StoresPage } from './pages/StoresPage';

function ScrollToTop() {
  const { pathname, search } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname, search]);
  return null;
}

function NotFoundPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-24 text-center space-y-4">
      <p className="font-data text-xs uppercase tracking-widest text-signal">404</p>
      <h1 className="font-display font-bold text-3xl">Page Not Found</h1>
      <p className="text-sm text-steel">
        The page you requested could not be found on SAMTOB P&amp;C.
      </p>
      <Link
        to="/"
        className="inline-flex bg-ink text-paper px-6 py-3 rounded-full text-sm font-medium hover:bg-signal transition-colors"
      >
        Back to Home
      </Link>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <ErrorBoundary>
        <AuthProvider>
          <ToastProvider>
            <CartProvider>
              <StoreProvider>
                <div className="min-h-screen flex flex-col bg-paper text-ink">
                  <Navbar />
                  <main className="flex-1">
                    <Routes>
                      <Route path="/" element={<HomePage />} />
                      <Route path="/products" element={<ProductsPage />} />
                      <Route path="/products/:slug" element={<ProductDetailPage />} />
                      <Route path="/cart" element={<CartPage />} />
                      <Route path="/checkout" element={<CheckoutPage />} />
                      <Route path="/order-confirmation/:id" element={<OrderConfirmationPage />} />
                      <Route path="/delivery" element={<DeliveryPage />} />
                      <Route path="/stores" element={<StoresPage />} />
                      <Route path="/faq" element={<FaqPage />} />
                      <Route path="/contact" element={<ContactPage />} />
                      <Route path="/terms" element={<TermsPage />} />
                      <Route path="/privacy" element={<PrivacyPage />} />
                      <Route path="/account/login" element={<LoginPage />} />
                      <Route path="/account/register" element={<LoginPage />} />
                      <Route path="/account/dashboard" element={<AccountDashboardPage />} />
                      <Route path="/account/orders" element={<AccountOrdersPage />} />
                      <Route path="/account/save-to-buy" element={<AccountSaveToBuyListPage />} />
                      <Route path="/account/save-to-buy/:id" element={<SaveToBuyDetailPage />} />
                      <Route path="/admin" element={<AdminPage />} />
                      <Route path="*" element={<NotFoundPage />} />
                    </Routes>
                  </main>
                  <Footer />
                  <WhatsAppFloat />
                </div>
              </StoreProvider>
            </CartProvider>
          </ToastProvider>
        </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
