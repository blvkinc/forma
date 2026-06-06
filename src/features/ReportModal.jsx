// ============================================================
// FORMA — Trust & safety report modal
// ============================================================
import React, { useState } from 'react';
import { X, Flag } from 'lucide-react';
import { REPORT_REASONS } from '../lib/ui';

export const ReportModal = ({ target, onClose, onSubmit }) => {
  const [reason, setReason] = useState('misleading');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!target) return null;

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    const ok = await onSubmit({
      targetType: target.type,
      targetId: target.id,
      reason,
      details,
    });
    setSubmitting(false);
    if (ok) {
      setDetails('');
      setReason('misleading');
    }
  };

  return (
    <div className="fixed inset-0 z-[320] bg-[rgba(14,14,12,0.56)] backdrop-blur-sm flex items-center justify-center p-4">
      <form onSubmit={submit} className="hair-all bg-[var(--card)] w-full max-w-[620px] max-h-[92vh] overflow-y-auto shadow-[0_24px_80px_rgba(14,14,12,0.22)]">
        <div className="p-6 hair-b flex items-start justify-between gap-4">
          <div>
            <div className="label">Trust report</div>
            <h2 className="display text-[34px] mt-2">Report {target.label}.</h2>
            <div className="mono text-[11px] text-[var(--muted)] mt-2">{target.type} · {target.id}</div>
          </div>
          <button type="button" onClick={onClose} className="hair-all w-9 h-9 inline-flex items-center justify-center hover:bg-[var(--bg-2)]" aria-label="Close report">
            <X size={16}/>
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <label htmlFor="report-reason" className="label mb-2 block">Reason</label>
            <select
              id="report-reason"
              value={reason}
              onChange={event => setReason(event.target.value)}
              className="swiss-input"
            >
              {REPORT_REASONS.map(option => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="report-details" className="label mb-2 block">Details</label>
            <textarea
              id="report-details"
              value={details}
              onChange={event => setDetails(event.target.value)}
              className="swiss-input min-h-[150px]"
              placeholder="Add links, context, or what the admin should review."
              maxLength={1200}
            />
          </div>
          <div className="hair-all p-4 bg-[var(--bg-2)] text-[13px] leading-relaxed">
            Reports go to the admin queue with your account attached. False reports can affect account standing.
          </div>
        </div>

        <div className="p-6 hair-t flex justify-end gap-3">
          <button type="button" onClick={onClose} className="swiss-btn ghost">Cancel</button>
          <button type="submit" disabled={submitting} className={`swiss-btn accent ${submitting ? 'opacity-60 cursor-wait' : ''}`}>
            {submitting ? 'Submitting...' : 'Submit report'} <Flag size={12}/>
          </button>
        </div>
      </form>
    </div>
  );
};
