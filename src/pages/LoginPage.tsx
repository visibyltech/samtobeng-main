import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Lock, LogIn, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export function LoginPage() {
  const { loggedIn, isAdmin, authReady, loginWithGoogle } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const isRegister = location.pathname.includes('register');

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (authReady && loggedIn) {
      navigate(isAdmin ? '/admin' : '/account/dashboard', { replace: true });
    }
  }, [authReady, loggedIn, isAdmin, navigate]);

  async function handleGoogleLogin() {
    setLoading(true);
    try {
      const profile = await loginWithGoogle();
      showToast('Signed in successfully', 'success');
      if (profile?.role === 'admin') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/account/dashboard', { replace: true });
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Sign in failed', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 sm:px-6 py-16">
      <div className="bg-white border border-line rounded-3xl p-8 shadow-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-signal/10 text-signal flex items-center justify-center mx-auto">
            <Lock size={22} />
          </div>
          <h1 className="font-display font-bold text-2xl">
            {isRegister ? 'Create Your SAMTOB P&C Account' : 'Sign In to SAMTOB P&C'}
          </h1>
          <p className="text-sm text-steel">
            {isRegister
              ? 'Use your Google account to create your customer profile, track orders, and start Save-to-Buy plans.'
              : 'Access your orders, upload payment receipts, and manage Save-to-Buy plans.'}
          </p>
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full inline-flex items-center justify-center gap-3 bg-ink text-paper py-3.5 px-6 rounded-full text-sm font-medium hover:bg-signal transition-colors disabled:opacity-60"
        >
          <LogIn size={17} />
          {loading ? 'Signing in...' : 'Continue with Google'}
        </button>

        <div className="rounded-xl bg-paper border border-line p-4 flex items-start gap-2.5 text-xs text-steel">
          <ShieldCheck size={16} className="text-mint shrink-0 mt-0.5" />
          <span>
            Verified Google Sign-In protects your orders, payment proofs, and Save-to-Buy records.
          </span>
        </div>

        <div className="text-center text-xs text-steel pt-2 border-t border-line">
          {isRegister ? (
            <>
              Already have an account?{' '}
              <Link to="/account/login" className="text-signal font-medium hover:underline">
                Sign in
              </Link>
            </>
          ) : (
            <>
              New to SAMTOB P&amp;C?{' '}
              <Link to="/account/register" className="text-signal font-medium hover:underline">
                Create an account
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
