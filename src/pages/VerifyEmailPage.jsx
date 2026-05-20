import React from 'react';
import { ArrowRight, Check, AlertCircle, Mail } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function VerifyEmailPage({ status, onContinue, onBackToSignIn }) {
  const { user, role, loading } = useAuth();

  if (status === 'error') {
    return (
      <div className="swiss-app min-h-screen grid-bg flex items-center justify-center" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="w-full max-w-[440px] px-6 text-center">
          <div className="w-16 h-16 mx-auto hair-all flex items-center justify-center bg-[var(--card)]">
            <AlertCircle size={24} className="text-[var(--accent)]" />
          </div>
          <h1 className="display text-[42px] mt-8 leading-[0.95]">Link expired.</h1>
          <p className="text-[15px] text-[var(--ink-2)] mt-4 leading-relaxed max-w-[360px] mx-auto">
            We couldn't verify this link. It may have expired or already been used.
            Sign in again or request a new verification email.
          </p>
          <button onClick={onBackToSignIn} className="swiss-btn mt-8 mx-auto">
            Back to sign in <ArrowRight size={12} />
          </button>
        </div>
      </div>
    );
  }

  if (loading || !user) {
    return (
      <div className="swiss-app min-h-screen grid-bg flex items-center justify-center" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="w-full max-w-[440px] px-6 text-center">
          <div className="w-16 h-16 mx-auto hair-all flex items-center justify-center bg-[var(--card)]">
            <Mail size={24} className="text-[var(--accent)]" />
          </div>
          <h1 className="display text-[42px] mt-8 leading-[0.95]">Verifying…</h1>
          <p className="text-[15px] text-[var(--ink-2)] mt-4 leading-relaxed max-w-[360px] mx-auto">
            One moment while we activate your account.
          </p>
          <div className="mt-8 flex justify-center">
            <div className="w-5 h-5 border-2 border-[var(--ink)] border-t-transparent rounded-full animate-spin"/>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="swiss-app min-h-screen grid-bg flex items-center justify-center" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="w-full max-w-[440px] px-6 text-center">
        <div className="w-16 h-16 mx-auto hair-all flex items-center justify-center bg-[var(--card)]">
          <Check size={24} className="text-[var(--good)]" />
        </div>
        <div className="label mt-8 flex items-center justify-center gap-3">
          <span className="w-8 hair-t" />
          <span>№ 05 — Email verified</span>
          <span className="w-8 hair-t" />
        </div>
        <h1 className="display text-[42px] mt-6 leading-[0.95]">Welcome to<br />the index.</h1>
        <p className="text-[15px] text-[var(--ink-2)] mt-4 leading-relaxed max-w-[360px] mx-auto">
          Your email <strong className="text-[var(--ink)]">{user.email}</strong> is verified.
          Your {role === 'artist' ? 'seller' : role === 'admin' ? 'admin' : 'buyer'} account is ready.
        </p>
        <button onClick={onContinue} className="swiss-btn accent mt-8 mx-auto px-6 py-3">
          Continue to FORMA <ArrowRight size={12} />
        </button>
      </div>
    </div>
  );
}
