// ============================================================
// FORMA — Commission card + booking/thread modals
// ============================================================
import React, { useState } from 'react';
import { Plus, ArrowRight, X, Send } from 'lucide-react';
import { fmt, isBuyerRole } from '../lib/ui';
import { artistById } from '../lib/catalogue';

export const CommissionCard = ({ commission, role, onBookCommission }) => {
  const a = artistById(commission.artist);
  const left = commission.slots - commission.taken;
  const full = left === 0;
  const canBook = isBuyerRole(role) && !full;
  const buttonLabel = full
    ? 'Waitlist'
    : isBuyerRole(role)
      ? 'Book a slot'
      : 'Buyer account required';

  return (
    <div className={`hair-all p-6 bg-[var(--card)] transition-all ${full ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10" style={{background:a.accent}}/>
          <div>
            <div className="text-[13px] font-medium">{a.name}</div>
            <div className="mono text-[10px] text-[var(--muted)]">{a.handle}</div>
          </div>
        </div>
        <span className={`mono text-[10px] uppercase tracking-[0.12em] px-2 py-1 ${full ? 'bg-[var(--ink)] text-[var(--bg)]' : 'bg-[var(--accent-soft)] text-[var(--accent)]'}`}>
          {full ? 'FULL' : `${left} OF ${commission.slots} LEFT`}
        </span>
      </div>
      <div className="display text-[28px] mt-5">{commission.title}</div>
      <p className="text-[13px] mt-3 text-[var(--ink-2)] leading-relaxed">{commission.brief}</p>

      <div className="grid grid-cols-3 gap-3 mt-6 hair-t pt-4">
        <div>
          <div className="label">Price</div>
          <div className="mono text-[20px] mt-1">${fmt(commission.price)}</div>
        </div>
        <div>
          <div className="label">Delivery</div>
          <div className="mono text-[20px] mt-1">{commission.days}d</div>
        </div>
        <div>
          <div className="label">Slots</div>
          <div className="mono text-[20px] mt-1">{commission.taken}/{commission.slots}</div>
        </div>
      </div>

      {/* Slot bar */}
      <div className="mt-4 flex gap-1">
        {Array.from({length: commission.slots}).map((_,i) => (
          <div key={i} className={`flex-1 h-2 hair-all ${i < commission.taken ? 'bg-[var(--ink)]' : ''}`}/>
        ))}
      </div>

      {onBookCommission && (
        <button
          disabled={full}
          onClick={() => onBookCommission(commission)}
          className={`swiss-btn w-full mt-5 justify-center ${canBook ? 'accent' : 'ghost'}`}
        >
          {buttonLabel} {full ? <Plus size={12}/> : <ArrowRight size={12}/>}
        </button>
      )}
    </div>
  );
};

export const CommissionBookingView = ({ commission, role, onClose, onConfirm, getPriceBreakdown }) => {
  const [briefText, setBriefText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!commission) return null;

  const artist = artistById(commission.artist);
  const breakdown = getPriceBreakdown(commission.price);
  const canSubmit = isBuyerRole(role) && briefText.trim().length >= 12 && !submitting;

  const submit = async (event) => {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError('');
    const result = await onConfirm(briefText.trim());
    if (result?.error) setError(result.error);
    setSubmitting(false);
  };

  return (
    <main className="fade-in max-w-[960px] mx-auto px-8 py-12">
      <button type="button" onClick={onClose} className="swiss-btn ghost mb-6" aria-label="Back">
        <X size={12}/> Back
      </button>
      <form onSubmit={submit} className="hair-all bg-[var(--card)]">
        <div className="p-6 hair-b">
          <div className="label">Commission booking</div>
          <h2 className="display text-[34px] mt-2">{commission.title}</h2>
          <div className="mono text-[11px] text-[var(--muted)] mt-2">with {artist.handle}</div>
        </div>

        <div className="p-6 space-y-5">
          {!isBuyerRole(role) && (
            <div className="hair-all p-4 bg-[var(--accent-soft)] text-[var(--accent)] text-[13px]">
              Booking is reserved for buyer accounts. Seller and admin accounts stay in their own workspaces.
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            {[
              ['Slot price', `$${fmt(breakdown.slotPrice)}`],
              ['Platform fee', `$${fmt(breakdown.platformFee)}`],
              ['Artist payout', `$${fmt(breakdown.artistPayout)}`],
            ].map(([label, value]) => (
              <div key={label} className="hair-all p-4">
                <div className="label">{label}</div>
                <div className="mono text-[20px] mt-1">{value}</div>
              </div>
            ))}
          </div>

          <div>
            <label htmlFor="commission-brief" className="label mb-2 block">Project brief</label>
            <textarea
              id="commission-brief"
              value={briefText}
              onChange={event => setBriefText(event.target.value)}
              className="swiss-input min-h-[150px]"
              placeholder="Describe the piece, references, deadline pressure, and usage needs."
              maxLength={1200}
              disabled={!isBuyerRole(role)}
            />
            <div className="mono text-[10px] text-[var(--muted)] mt-2">{briefText.trim().length}/1200</div>
          </div>

          <div className="hair-all p-4 bg-[var(--bg-2)] text-[13px] leading-relaxed">
            The slot is created in Supabase as a booked commission. Payment escrow is represented as pending until the Stripe adapter is added.
          </div>
          {error && (
            <div className="hair-all p-3 bg-[var(--accent-soft)] text-[var(--accent)] text-[13px]">
              {error}
            </div>
          )}
        </div>

        <div className="p-6 hair-t flex justify-end gap-3">
          <button type="button" onClick={onClose} className="swiss-btn ghost">Cancel</button>
          <button type="submit" disabled={!canSubmit} className={`swiss-btn accent ${!canSubmit ? 'opacity-50 cursor-not-allowed' : ''}`}>
            {submitting ? 'Booking...' : 'Confirm booking'} <ArrowRight size={12}/>
          </button>
        </div>
      </form>
    </main>
  );
};

export const CommissionThreadModal = ({ booking, activeThread, user, onClose, onSend, onDispute, sending }) => {
  const [message, setMessage] = useState('');
  const [isMilestone, setIsMilestone] = useState(false);
  const [disputing, setDisputing] = useState(false);

  if (!booking || !activeThread) return null;

  const canDispute = !['ACCEPTED', 'CANCELLED', 'DISPUTED'].includes(booking.status);

  const submit = async (event) => {
    event.preventDefault();
    const body = message.trim();
    if (!body) return;
    const result = await onSend(body, isMilestone);
    if (!result?.error) {
      setMessage('');
      setIsMilestone(false);
    }
  };

  const dispute = async () => {
    if (!onDispute || disputing) return;
    setDisputing(true);
    await onDispute(booking);
    setDisputing(false);
  };

  return (
    <div className="fixed inset-0 z-[300] bg-[rgba(14,14,12,0.52)] backdrop-blur-sm flex items-center justify-center p-4">
      <div className="hair-all bg-[var(--card)] w-full max-w-[760px] max-h-[92vh] overflow-hidden shadow-[0_24px_80px_rgba(14,14,12,0.22)] flex flex-col">
        <div className="p-6 hair-b flex items-start justify-between gap-4">
          <div>
            <div className="label">Commission thread</div>
            <h2 className="display text-[32px] mt-2">{booking.commission?.title || 'Commission'}</h2>
            <div className="mono text-[11px] text-[var(--muted)] mt-2">{booking.artist?.handle || artistById(booking.artistId).handle} · {booking.status}</div>
          </div>
          <div className="flex items-center gap-2">
            {onDispute && (
              <button
                type="button"
                onClick={dispute}
                disabled={!canDispute || disputing}
                className={`swiss-btn ghost ${!canDispute || disputing ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {booking.status === 'DISPUTED' ? 'Disputed' : disputing ? 'Opening…' : 'Open dispute'}
              </button>
            )}
            <button type="button" onClick={onClose} className="hair-all w-9 h-9 inline-flex items-center justify-center hover:bg-[var(--bg-2)]" aria-label="Close thread">
              <X size={16}/>
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto space-y-3 min-h-[240px]">
          {activeThread.messages.length === 0 && (
            <div className="hair-all p-6 text-center text-[13px] text-[var(--muted)]">
              No messages yet. Start the project thread with a concise note.
            </div>
          )}
          {activeThread.messages.map(msg => {
            const mine = msg.senderId === user?.id;
            return (
              <div key={msg.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[78%] hair-all p-3 ${msg.isMilestone ? 'bg-[var(--accent-soft)] border-[var(--accent)]' : mine ? 'bg-[var(--ink)] text-[var(--bg)]' : 'bg-[var(--bg-2)]'}`}>
                  <div className="mono text-[9px] uppercase mb-1 opacity-70 flex items-center gap-2">
                    <span>{mine ? 'You' : 'Counterparty'}</span>
                    {msg.isMilestone && <span className="text-[var(--accent)]">● Milestone</span>}
                  </div>
                  <div className="text-[13px] leading-relaxed">{msg.body}</div>
                </div>
              </div>
            );
          })}
        </div>

        <form onSubmit={submit} className="p-4 hair-t flex flex-col gap-3">
          <div className="flex gap-3">
            <input
              value={message}
              onChange={event => setMessage(event.target.value)}
              className="swiss-input flex-1"
              placeholder={isMilestone ? 'Describe this milestone…' : 'Write a message...'}
              maxLength={800}
            />
            <button type="submit" disabled={sending || !message.trim()} className={`swiss-btn accent ${sending || !message.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}>
              Send <Send size={12}/>
            </button>
          </div>
          <label className="label flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={isMilestone} onChange={e => setIsMilestone(e.target.checked)}/>
            Mark as milestone
          </label>
        </form>
      </div>
    </div>
  );
};
