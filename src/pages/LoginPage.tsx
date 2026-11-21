import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, ShieldCheck } from 'lucide-react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export function LoginPage() {
  const { loggedIn, isAdmin, authReady, loginWithEmail, registerWithEmail } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const isRegister = location.pathname.includes('register');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (authReady && loggedIn && isAdmin) navigate('/admin', { replace: true });
    else if (authReady && loggedIn) navigate('/account/dashboard', { replace: true });
  }, [authReady, loggedIn, isAdmin, navigate]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    try {
      if (isRegister) {
        if (password.length < 6) throw new Error('Password must be at least 6 characters.');
        if (password !== confirmPassword) throw new Error('Passwords do not match.');
        await registerWithEmail(name, email, password);
        showToast('Account created. Check your email and verify your address before signing in.', 'success');
        navigate('/account/login', { replace: true });
      } else {
        const profile = await loginWithEmail(email, password);
        showToast('Signed in successfully', 'success');
        navigate(profile?.role === 'admin' ? '/admin' : '/account/dashboard', { replace: true });
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : (isRegister ? 'Account creation failed' : 'Sign in failed'), 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handlePasswordReset() {
    if (!email.trim()) {
      showToast('Enter your email address first.', 'error');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email.trim());
      showToast('Password reset link sent. Check your email.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not send password reset email.', 'error');
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
              ? 'Create your account with your email address and password to track orders and Save-to-Buy plans.'
              : 'Sign in with your email and password to access orders, payment receipts, and Save-to-Buy plans.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">Full name</span>
              <input value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name"
                className="w-full rounded-xl border border-line px-4 py-3 text-sm outline-none focus:border-signal" placeholder="Your full name" />
            </label>
          )}
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Email address</span>
            <span className="relative block">
              <Mail size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-steel" />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email"
                className="w-full rounded-xl border border-line pl-11 pr-4 py-3 text-sm outline-none focus:border-signal" placeholder="you@example.com" />
            </span>
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Password</span>
            <span className="relative block">
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required
                minLength={6} autoComplete={isRegister ? 'new-password' : 'current-password'}
                className="w-full rounded-xl border border-line px-4 pr-12 py-3 text-sm outline-none focus:border-signal" placeholder="Enter your password" />
              <button type="button" onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-steel hover:text-ink"
                >
                {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
            </span>
          </label>
          {isRegister && (
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">Confirm password</span>
              <span className="relative block">
                <input type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required
                  minLength={6} autoComplete="new-password"
                  className="w-full rounded-xl border border-line px-4 pr-12 py-3 text-sm outline-none focus:border-signal" placeholder="Confirm your password" />
                <button type="button" onClick={() => setShowConfirmPassword((value) => !value)}
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  aria-pressed={showConfirmPassword}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-steel hover:text-ink">
                  {showConfirmPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </span>
            </label>
          )}
          {!isRegister && (
            <div className="text-right">
              <button type="button" onClick={handlePasswordReset} className="text-xs text-signal font-medium hover:underline">
                Forgot password?
              </button>
            </div>
          )}
          <button type="submit" disabled={loading}
            className="w-full inline-flex items-center justify-center gap-3 bg-ink text-paper py-3.5 px-6 rounded-full text-sm font-medium hover:bg-signal transition-colors disabled:opacity-60">
            {loading ? 'Please wait...' : isRegister ? 'Create account' : 'Sign in'}
          </button>
        </form>

        <div className="rounded-xl bg-paper border border-line p-4 flex items-start gap-2.5 text-xs text-steel">
          <ShieldCheck size={16} className="text-mint shrink-0 mt-0.5" />
          <span>Email verification helps protect your orders, payment proofs, and Save-to-Buy records.</span>
        </div>

        <div className="text-center text-xs text-steel pt-2 border-t border-line">
          {isRegister ? (
            <>Already have an account? <Link to="/account/login" className="text-signal font-medium hover:underline">Sign in</Link></>
          ) : (
            <>New to SAMTOB P&amp;C? <Link to="/account/register" className="text-signal font-medium hover:underline">Create an account</Link></>
          )}
        </div>
      </div>
    </div>
  );
}
