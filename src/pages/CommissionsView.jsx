// ============================================================
// FORMA — Commissions board
// ============================================================
import React, { useState } from 'react';
import { CommissionCard } from '../features/commissions';
import { COMMISSIONS } from '../lib/catalogue';

export const CommissionsView = ({ goToArtist, role, onBookCommission }) => {
  const [filter, setFilter] = useState('all');
  let visible = COMMISSIONS;
  if (filter === 'open') visible = visible.filter(c => c.slots - c.taken > 0);
  if (filter === 'cheap') visible = [...visible].sort((a,b) => a.price - b.price);
  if (filter === 'fast') visible = [...visible].sort((a,b) => a.days - b.days);

  return (
    <main className="fade-in max-w-[1440px] mx-auto px-8 py-12">
      <div className="grid grid-cols-12 gap-8 mb-16">
        <div className="col-span-7">
          <div className="label mb-6">№ 06 — Commissions</div>
          <h1 className="display text-[96px] leading-[0.9] tracking-[-0.045em]">
            Book a slot.<br/>
            Pay up front.<br/>
            <span style={{color:'var(--accent)'}}>Get it made.</span>
          </h1>
        </div>
        <div className="col-span-5">
          <p className="text-[16px] mt-6 leading-relaxed text-[var(--ink-2)] max-w-[420px]">
            Every commission is prepaid into escrow and released to the artist when you accept delivery. Refunded automatically if the deadline passes.
          </p>
          <div className="hair-all p-5 mt-8">
            <div className="label">How it works</div>
            <div className="mt-3 space-y-2 text-[13px]">
              {['Pick a slot from an open commission.','Pay the full amount — held in escrow.','Brief the artist. Approve drafts.','Funds release on delivery, or refund on miss.'].map((s,i)=>(
                <div key={i} className="flex gap-3 hair-b pb-2 last:hair-b-0">
                  <span className="mono text-[var(--accent)] text-[12px]">0{i+1}</span>
                  <span>{s}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="hair-b pb-4 flex justify-between items-baseline mb-8">
        <h2 className="display text-[36px]">Open boards</h2>
        <div className="flex gap-2">
          {[{k:'all',l:'All'},{k:'open',l:'Open slots'},{k:'cheap',l:'Lowest first'},{k:'fast',l:'Fastest'}].map(f => (
            <button key={f.k} onClick={() => setFilter(f.k)} className={`tab-pill ${filter===f.k ? 'active':''}`}>{f.l}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {visible.map(c => <CommissionCard key={c.id} commission={c} role={role} onBookCommission={onBookCommission}/>)}
      </div>
    </main>
  );
};
