import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ArrowRight, Eye, EyeOff, Check, AlertCircle } from 'lucide-react';

export default function SetNewPassword() {
  const { updatePassword, clearRecoveryMode, signOut } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (password.length < 10) { setError('Password must be at least 10 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      await updatePassword(password);
      setDone(true);
    } catch (err) {
      setError(err.message || 'Could not update password.');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="swiss-app min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="w-full max-w-[440px] px-6 text-center">
          <div className="w-16 h-16 mx-auto hair-all flex items-center justify-center bg-[var(--card)]">
            <Check size={24} className="text-[var(--good)]" />
          </div>
          <h1 className="display text-[42px] mt-8 leading-[0.95]">Password updated.</h1>
          <p className="text-[15px] text-[var(--ink-2)] mt-4 leading-relaxed">
            Your password has been changed. You can keep using FORMA on this device.
          </p>
          <button onClick={clearRecoveryMode} className="swiss-btn mt-8 mx-auto">
            Continue <ArrowRight size={12} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="swiss-app min-h-screen grid-bg flex items-center justify-center" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="auth-form-panel w-full max-w-[440px]">
        <div className="label mb-6 flex items-center gap-3">
          <span>№ 04 — Reset password</span>
          <span className="w-8 hair-t" />
        </div>
        <h1 className="display text-[48px] leading-[0.92]">Set a new<br />password.</h1>
        <p className="text-[15px] text-[var(--ink-2)] mt-4 leading-relaxed">
          Choose a new password for your account. Minimum 10 characters.
        </p>

        {error && (
          <div className="mt-6 hair-all bg-[var(--accent-soft)] p-4 flex items-start gap-3">
            <AlertCircle size={16} className="text-[var(--accent)] flex-shrink-0 mt-0.5" />
            <div className="text-[13px] text-[var(--accent)]">{error}</div>
          </div>
        )}

        <form onSubmit={submit} className="mt-8 space-y-5">
          <div>
            <label htmlFor="np-password" className="label mb-2 block">New password</label>
            <div className="relative">
              <input
                id="np-password"
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={10}
                className="swiss-input pr-10"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-0 bottom-2 text-[var(--muted)] hover:text-[var(--ink)]"
                tabIndex={-1}
                aria-label={showPw ? 'Hide password' : 'Show password'}
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div>
            <label htmlFor="np-confirm" className="label mb-2 block">Confirm password</label>
            <input
              id="np-confirm"
              type={showPw ? 'text' : 'password'}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={10}
              className="swiss-input"
              autoComplete="new-password"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className={`swiss-btn accent w-full justify-center py-3.5 mt-2 ${loading ? 'opacity-60 cursor-wait' : ''}`}
          >
            {loading ? 'Updating…' : 'Update password'} <ArrowRight size={12} />
          </button>
        </form>

        <div className="mt-8 pt-6 hair-t text-[14px] text-center">
          <button
            onClick={async () => { await signOut(); clearRecoveryMode(); }}
            className="text-[var(--muted)] hover:text-[var(--ink)] underline-hover"
          >
            Cancel and sign out
          </button>
        </div>
      </div>
    </div>
  );
}
