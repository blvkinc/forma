import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ArrowRight, Eye, EyeOff, Check, AlertCircle, Mail } from 'lucide-react';

export default function AuthPage() {
  const { signIn, signUp, resetPassword, signInWithProvider } = useAuth();
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup' | 'reset'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState('buyer');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmationSent, setConfirmationSent] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const reset = () => {
    setError('');
    setConfirmationSent(false);
    setResetSent(false);
  };

  const switchMode = (m) => {
    setMode(m);
    reset();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    reset();
    setLoading(true);

    try {
      if (mode === 'reset') {
        await resetPassword(email);
        setResetSent(true);
      } else if (mode === 'signup') {
        if (!displayName.trim()) {
          throw new Error('Display name is required.');
        }
        if (password.length < 10) {
          throw new Error('Password must be at least 10 characters.');
        }

        const result = await signUp({
          email,
          password,
          displayName: displayName.trim(),
          role,
        });

        // If email confirmation is required, session will be null
        if (result.user && !result.session) {
          setConfirmationSent(true);
        } else if (role === 'artist' && typeof window !== 'undefined') {
          window.location.hash = 'studio';
        }
      } else {
        await signIn({ email, password });
        // signIn triggers onAuthStateChange which sets user/profile
      }
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  // ---- Confirmation screen after signup ----
  if (confirmationSent) {
    return (
      <div className="swiss-app min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="w-full max-w-[480px] px-6">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto hair-all flex items-center justify-center bg-[var(--card)]">
              <Mail size={24} className="text-[var(--accent)]" />
            </div>
            <h1 className="display text-[42px] mt-8 leading-[0.95]">Check your email.</h1>
            <p className="text-[15px] text-[var(--ink-2)] mt-4 leading-relaxed max-w-[360px] mx-auto">
              We sent a confirmation link to <strong className="text-[var(--ink)]">{email}</strong>.
              Click it to activate your account, then come back here to sign in.
            </p>
            <button
              onClick={() => { switchMode('signin'); setConfirmationSent(false); }}
              className="swiss-btn mt-8 mx-auto"
            >
              Back to sign in <ArrowRight size={12} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---- Reset link sent screen ----
  if (resetSent) {
    return (
      <div className="swiss-app min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="w-full max-w-[480px] px-6">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto hair-all flex items-center justify-center bg-[var(--card)]">
              <Mail size={24} className="text-[var(--accent)]" />
            </div>
            <h1 className="display text-[42px] mt-8 leading-[0.95]">Check your email.</h1>
            <p className="text-[15px] text-[var(--ink-2)] mt-4 leading-relaxed max-w-[360px] mx-auto">
              If an account exists for <strong className="text-[var(--ink)]">{email}</strong>, we sent a
              password reset link. Open it to choose a new password.
            </p>
            <button
              onClick={() => { switchMode('signin'); }}
              className="swiss-btn mt-8 mx-auto"
            >
              Back to sign in <ArrowRight size={12} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---- Main auth form ----
  return (
    <div className="swiss-app min-h-screen grid-bg" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="min-h-screen flex">
        {/* Left branding panel */}
        <div className="auth-gallery-panel hidden lg:flex flex-col justify-between w-[480px] flex-shrink-0 p-12 relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-baseline gap-2">
              <span className="display text-[28px]">FORMA</span>
              <span className="mono text-[11px] uppercase tracking-[0.12em]" style={{ color: '#9C988A' }}>/24</span>
            </div>
          </div>

          <div className="relative z-10">
            <h2 className="display text-[64px] leading-[0.9]">
              A market for<br />
              <span className="italic" style={{ fontFamily: 'Bricolage Grotesque' }}>digital</span><br />
              artefacts.
            </h2>
            <p className="text-[15px] mt-8 leading-relaxed max-w-[320px]" style={{ color: '#B8B5AA' }}>
              Auctions and commissions, run by artists, watched by a quiet crowd.
              No collections, no royalties theatre — just files, prices, deadlines.
            </p>
          </div>

          <div className="relative z-10 mono text-[10px] uppercase tracking-[0.12em]" style={{ color: '#6E6B62' }}>
            © 2026 — Made in five cities
          </div>

          {/* Decorative SVG */}
          <svg className="absolute bottom-0 right-0 opacity-[0.06]" width="400" height="400" viewBox="0 0 400 400">
            {Array.from({ length: 12 }).map((_, r) =>
              Array.from({ length: 12 }).map((_, c) => (
                <circle key={`${r}-${c}`} cx={20 + c * 32} cy={20 + r * 32} r={Math.max(1, ((r + c) % 6) * 1.5)} fill="#EFEDE5" />
              ))
            )}
          </svg>
        </div>

        {/* Right form panel */}
        <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
          <div className="auth-form-panel w-full max-w-[440px]">
            {/* Mobile logo */}
            <div className="lg:hidden mb-12">
              <div className="flex items-baseline gap-2">
                <span className="display text-[26px]">FORMA</span>
                <span className="label">/24</span>
              </div>
            </div>

            {/* Section label */}
            <div className="label mb-6 flex items-center gap-3">
              <span>№ {mode === 'signin' ? '01' : mode === 'signup' ? '02' : '03'} — {mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Reset password'}</span>
              <span className="w-8 hair-t" />
            </div>

            <h1 className="display text-[48px] leading-[0.92]">
              {mode === 'signin' ? (
                <>Welcome<br />back.</>
              ) : mode === 'signup' ? (
                <>Join the<br />index.</>
              ) : (
                <>Reset<br />password.</>
              )}
            </h1>

            <p className="text-[15px] text-[var(--ink-2)] mt-4 leading-relaxed">
              {mode === 'signin'
                ? 'Sign in with your email and password.'
                : mode === 'signup'
                  ? 'Create an account to bid, book commissions, or apply for seller review.'
                  : 'Enter your account email and we will send a password reset link.'}
            </p>

            {/* Error banner */}
            {error && (
              <div className="mt-6 hair-all bg-[var(--accent-soft)] p-4 flex items-start gap-3">
                <AlertCircle size={16} className="text-[var(--accent)] flex-shrink-0 mt-0.5" />
                <div className="text-[13px] text-[var(--accent)]">{error}</div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              {/* Display name (signup only) */}
              {mode === 'signup' && (
                <div>
                  <label htmlFor="display-name" className="label mb-2 block">Display name</label>
                  <input
                    id="display-name"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Lou Kestner"
                    required
                    className="swiss-input"
                    autoComplete="name"
                  />
                </div>
              )}

              {/* Email */}
              <div>
                <label htmlFor="auth-email" className="label mb-2 block">Email</label>
                <input
                  id="auth-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@studio.com"
                  required
                  className="swiss-input"
                  autoComplete="email"
                />
              </div>

              {/* Password */}
              {mode !== 'reset' && (
              <div>
                <label htmlFor="auth-password" className="label mb-2 block">Password</label>
                <div className="relative">
                  <input
                    id="auth-password"
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={10}
                    className="swiss-input pr-10"
                    autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-0 bottom-2 text-[var(--muted)] hover:text-[var(--ink)] transition-colors"
                    tabIndex={-1}
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                  >
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {mode === 'signin' && (
                  <div className="mt-2 text-right">
                    <button
                      type="button"
                      onClick={() => switchMode('reset')}
                      className="mono text-[11px] uppercase tracking-[0.1em] text-[var(--muted)] hover:text-[var(--ink)] underline-hover"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}
              </div>
              )}

              {/* Role selector (signup only) */}
              {mode === 'signup' && (
                <div>
                  <label className="label mb-3 block">I want to</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      {
                        id: 'buyer',
                        title: 'Collect',
                        desc: 'Bid on auctions, book commissions, build a collection.',
                      },
                      {
                        id: 'artist',
                        title: 'Apply to sell',
                        desc: 'Submit work samples and profile links. Admin approval unlocks seller tools.',
                      },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setRole(opt.id)}
                        className={`hair-all p-4 text-left transition-all ${
                          role === opt.id
                            ? 'bg-[var(--ink)] text-[var(--bg)] border-[var(--ink)]'
                            : 'bg-[var(--card)] hover:border-[var(--ink)]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="display text-[18px]">{opt.title}</span>
                          {role === opt.id && (
                            <span className="w-5 h-5 bg-[var(--accent)] flex items-center justify-center">
                              <Check size={12} className="text-white" />
                            </span>
                          )}
                        </div>
                        <p className={`text-[12px] leading-relaxed ${
                          role === opt.id ? 'opacity-80' : 'text-[var(--muted)]'
                        }`}>
                          {opt.desc}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className={`swiss-btn accent w-full justify-center py-3.5 mt-2 ${
                  loading ? 'opacity-60 cursor-wait' : ''
                }`}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                    {mode === 'signin' ? 'Signing in…' : mode === 'signup' ? 'Creating account…' : 'Sending link…'}
                  </span>
                ) : (
                  <>
                    {mode === 'signin' ? 'Sign in' : mode === 'signup' ? (role === 'artist' ? 'Create seller application account' : 'Create account') : 'Send reset link'}
                    <ArrowRight size={12} />
                  </>
                )}
              </button>
            </form>

            {mode !== 'reset' && (
              <div className="mt-6">
                <div className="flex items-center gap-3 mono text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">
                  <span className="flex-1 hair-t" /> or <span className="flex-1 hair-t" />
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    reset();
                    try {
                      await signInWithProvider('google');
                    } catch (err) {
                      setError(err.message || 'Google sign-in is not available.');
                    }
                  }}
                  className="swiss-btn ghost w-full justify-center py-3.5 mt-4"
                >
                  Continue with Google <ArrowRight size={12} />
                </button>
              </div>
            )}

            {/* Mode switch */}
            <div className="mt-8 pt-6 hair-t text-[14px] text-center">
              {mode === 'signin' ? (
                <span className="text-[var(--muted)]">
                  No account?{' '}
                  <button
                    onClick={() => switchMode('signup')}
                    className="text-[var(--ink)] font-medium underline-hover"
                  >
                    Create one
                  </button>
                </span>
              ) : mode === 'reset' ? (
                <span className="text-[var(--muted)]">
                  Remembered it?{' '}
                  <button
                    onClick={() => switchMode('signin')}
                    className="text-[var(--ink)] font-medium underline-hover"
                  >
                    Sign in
                  </button>
                </span>
              ) : (
                <span className="text-[var(--muted)]">
                  Already have an account?{' '}
                  <button
                    onClick={() => switchMode('signin')}
                    className="text-[var(--ink)] font-medium underline-hover"
                  >
                    Sign in
                  </button>
                </span>
              )}
            </div>

            {/* Platform note */}
            <div className="mt-6 mono text-[10px] text-center uppercase tracking-[0.1em] text-[var(--muted)]">
              12% platform fee · Weekly payouts · FORMA Index 24/26
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
