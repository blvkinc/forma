// ============================================================
// FORMA — Buyer dashboard
// ============================================================
import React, { useState } from 'react';
import { Gavel, Bookmark, Image as ImageIcon, Briefcase, ArrowRight, ShieldCheck } from 'lucide-react';
import { ArtCard, ArtVisual } from '../components/shared';
import { fmt, formatTime, relativeTime } from '../lib/ui';
import { ARTWORKS, artworkById, artistById } from '../lib/catalogue';

export const BuyerDashboard = ({ goToArtwork, likes, toggleLike, userBids, purchases = [], auctionSettlements = [], artworks = ARTWORKS, watchlist, toggleWatch, profile, commissionState, onOpenCommissionThread, setView }) => {
  const [tab, setTab] = useState('bids');
  const [commissionNotice, setCommissionNotice] = useState('');
  const watchedWorks = ARTWORKS.filter(w => watchlist[w.id]);
  const findArtwork = (id) => (artworks || []).find(work => work.id === id) || artworkById(id);
  const acquiredRows = (purchases || [])
    .map(purchase => ({ purchase, work: findArtwork(purchase.artworkId) }))
    .filter(row => row.work && row.work.id && row.work.title !== 'Unknown');
  const invoiceRows = (auctionSettlements || []).map(settlement => ({
    settlement,
    work: findArtwork(settlement.artworkId),
  }));
  const displayName = profile?.display_name || profile?.email?.split('@')[0] || 'Buyer';
  const buyerBookings = commissionState?.buyerBookings || [];
  const escrowTotal = buyerBookings.reduce((total, booking) => total + Number(booking.price || 0), 0);
  const activeBidRows = userBids || [];
  const acquisitionTotal = acquiredRows.reduce((total, row) => total + Number(row.purchase.amount || 0), 0);
  const pendingInvoiceTotal = invoiceRows
    .filter(row => row.settlement.status === 'invoice_pending')
    .reduce((total, row) => total + Number(row.settlement.totalDue || 0), 0);
  const formatDate = (iso) => iso ? new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '-';
  const updateCommissionStatus = async (booking, status) => {
    setCommissionNotice('');
    const result = await commissionState.transitionBooking(booking.id, status);
    if (result?.error) {
      setCommissionNotice(result.error);
      return false;
    }
    setCommissionNotice(`Commission moved to ${commissionState.stateLabel(status).toLowerCase()}.`);
    return true;
  };

  return (
    <main className="fade-in max-w-[1440px] mx-auto px-8 py-10">
      <div className="hair-b pb-4 mb-8 flex justify-between items-end">
        <div>
          <div className="label mb-2">№ DASHBOARD — Buyer</div>
          <h1 className="display text-[56px] leading-tight">Hello, {displayName}.</h1>
        </div>
        <button onClick={() => setView('profile')} className="swiss-btn ghost">Account settings</button>
      </div>

      <div className="grid grid-cols-5 gap-5 mb-10">
        {[
          {l:'Active bids', v:String(activeBidRows.length), d: activeBidRows.length ? 'Loaded from bid history' : 'No bids loaded yet'},
          {l:'Invoices', v:`$${fmt(pendingInvoiceTotal)}`, d:`${invoiceRows.filter(row => row.settlement.status === 'invoice_pending').length} pending auction win${invoiceRows.filter(row => row.settlement.status === 'invoice_pending').length === 1 ? '' : 's'}`},
          {l:'In escrow', v:`$${fmt(escrowTotal)}`, d:`${buyerBookings.length} commission${buyerBookings.length === 1 ? '' : 's'}`},
          {l:'Acquired', v:String(acquiredRows.length), d: acquiredRows.length ? `$${fmt(acquisitionTotal)} settled through paid invoices` : 'No settled works yet'},
          {l:'Watching', v:String(watchedWorks.length), d: watchedWorks.length ? `${watchedWorks.filter(w => w.endsAt < 1000*60*60*24).length} ending today` : 'No saved auctions yet'},
        ].map((s,i) => (
          <div key={i} className="hair-all p-5 bg-[var(--card)] motion-stat">
            <div className="label">{s.l}</div>
            <div className="mono text-[36px] mt-2 leading-none">{s.v}</div>
            <div className="text-[12px] text-[var(--muted)] mt-2">{s.d}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-6">
        {[{k:'bids',l:'My bids'},{k:'invoices',l:'Invoices'},{k:'watching',l:'Watching'},{k:'acquired',l:'Acquired'},{k:'commissions',l:'Commissions'}].map(t => (
          <button key={t.k} onClick={() => setTab(t.k)} className={`tab-pill ${tab===t.k?'active':''}`}>{t.l}</button>
        ))}
      </div>

      {tab === 'bids' && (
        activeBidRows.length ? (
        <div>
          <div className="grid grid-cols-12 gap-4 label hair-b pb-3">
            <div className="col-span-1">№</div>
            <div className="col-span-5">Work</div>
            <div className="col-span-2">Your bid</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2 text-right">Ends in</div>
          </div>
          {activeBidRows.map((bid,i) => {
            const w = artworkById(bid.artworkId);
            const isLeading = Number(bid.amount) >= Number(w.currentBid || 0);
            return (
              <div key={`${w.id}-${i}`} onClick={() => goToArtwork(w.id)} className="grid grid-cols-12 gap-4 py-4 hair-b items-center cursor-pointer hover:bg-[var(--card)] transition-colors">
                <div className="col-span-1 mono text-[11px] text-[var(--muted)]">{String(i+1).padStart(3,'0')}</div>
                <div className="col-span-5 flex items-center gap-3">
                  <div className="w-12 h-12 hair-all flex-shrink-0">
                    <ArtVisual visual={w.visual} imageUrl={w.imageUrl} alt={w.title}/>
                  </div>
                  <div>
                    <div className="text-[14px] font-medium">{w.title}</div>
                    <div className="mono text-[11px] text-[var(--muted)]">{artistById(w.artist).handle}</div>
                  </div>
                </div>
                <div className="col-span-2 mono text-[14px]">${fmt(Number(bid.amount || 0))}</div>
                <div className="col-span-2">
                  <span className={`mono text-[9px] uppercase tracking-[0.12em] px-2 py-1 ${isLeading ? 'bg-[var(--good)] text-white' : 'bg-[var(--accent)] text-white'}`}>
                    {isLeading ? 'LEADING' : 'OUTBID'}
                  </span>
                </div>
                <div className="col-span-2 text-right mono text-[13px]">{formatTime(w.endsAt)}</div>
              </div>
            );
          })}
        </div>
        ) : (
          <div className="hair-all p-10 text-center bg-[var(--card)]">
            <Gavel size={22} className="mx-auto text-[var(--muted)]"/>
            <div className="display text-[28px] mt-3">No bid history yet.</div>
            <p className="text-[14px] text-[var(--muted)] mt-2">Open an artwork and place a bid to populate this dashboard.</p>
          </div>
        )
      )}

      {tab === 'invoices' && (
        invoiceRows.length ? (
          <div className="space-y-4">
            {invoiceRows.map(({ settlement, work }) => {
              const isKnownWork = work?.title && work.title !== 'Unknown';
              const isPending = settlement.status === 'invoice_pending';
              return (
                <div key={settlement.id} className="hair-all p-5 bg-[var(--card)] motion-copy">
                  <div className="grid grid-cols-12 gap-5 items-center">
                    <div className="col-span-1 hair-all aspect-square overflow-hidden">
                      <ArtVisual visual={work.visual} imageUrl={work.imageUrl} alt={work.title || settlement.artworkId}/>
                    </div>
                    <div className="col-span-4 min-w-0">
                      <div className="display text-[24px] leading-tight truncate">{isKnownWork ? work.title : `Artwork ${settlement.artworkId}`}</div>
                      <div className="mono text-[10px] text-[var(--muted)] mt-1">
                        {settlement.invoiceReference} - {formatDate(settlement.closedAt)}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <div className="label">Hammer</div>
                      <div className="mono text-[13px] mt-1">${fmt(settlement.amount)}</div>
                    </div>
                    <div className="col-span-2">
                      <div className="label">Premium</div>
                      <div className="mono text-[13px] mt-1">${fmt(settlement.buyerPremium)}</div>
                    </div>
                    <div className="col-span-2">
                      <div className="label">Total due</div>
                      <div className="mono text-[13px] mt-1">${fmt(settlement.totalDue)}</div>
                    </div>
                    <div className="col-span-1 text-right">
                      <span className={`mono text-[9px] uppercase tracking-[0.12em] px-2 py-1 ${settlement.status === 'paid' ? 'bg-[var(--good)] text-white' : isPending ? 'bg-[var(--accent)] text-white' : 'hair-all text-[var(--muted)]'}`}>
                        {settlement.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 hair-t pt-4 flex items-center justify-between gap-3">
                    <div className="text-[12px] text-[var(--muted)]">
                      {isPending ? `Payment window closes ${formatDate(settlement.dueAt)}.` : settlement.paidAt ? `Paid ${formatDate(settlement.paidAt)}.` : 'No payment is due for this settlement.'}
                    </div>
                    {isKnownWork && (
                      <button onClick={() => goToArtwork(work.id)} className="swiss-btn ghost">
                        Open listing <ArrowRight size={12}/>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="hair-all p-10 text-center bg-[var(--card)]">
            <Gavel size={22} className="mx-auto text-[var(--muted)]"/>
            <div className="display text-[28px] mt-3">No auction invoices yet.</div>
            <p className="text-[14px] text-[var(--muted)] mt-2">Winning bids will appear here after an ended auction is closed by operations.</p>
          </div>
        )
      )}

      {tab === 'watching' && (
        watchedWorks.length ? (
          <div className="grid grid-cols-4 gap-6">
            {watchedWorks.map(w => (
              <ArtCard key={w.id} work={w} onClick={() => goToArtwork(w.id)} likes={likes} toggleLike={toggleLike} watchlist={watchlist} toggleWatch={toggleWatch}/>
            ))}
          </div>
        ) : (
          <div className="hair-all p-10 text-center bg-[var(--card)]">
            <Bookmark size={22} className="mx-auto text-[var(--muted)]"/>
            <div className="display text-[28px] mt-3">No watched auctions yet.</div>
            <p className="text-[14px] text-[var(--muted)] mt-2">Save works from the marketplace to track close times and bids here.</p>
          </div>
        )
      )}

      {tab === 'acquired' && (
        acquiredRows.length ? (
          <div className="grid grid-cols-3 gap-6">
            {acquiredRows.map(({ purchase, work }) => {
              const artist = artistById(work.artist);
              return (
                <div key={purchase.id || purchase.artworkId} className="hair-all bg-[var(--card)] p-4 motion-copy">
                  <div onClick={() => goToArtwork(work.id)} className="hair-all cursor-pointer aspect-[4/3] overflow-hidden">
                    <ArtVisual visual={work.visual} imageUrl={work.imageUrl} alt={work.title}/>
                  </div>
                  <div className="mt-4 flex items-start justify-between gap-3">
                    <div>
                      <div className="display text-[24px] leading-tight">{work.title}</div>
                      <div className="mono text-[10px] text-[var(--muted)] mt-1">{artist.handle} · {work.edition}</div>
                    </div>
                    <ShieldCheck size={18} className="text-[var(--good)] flex-shrink-0"/>
                  </div>
                  <div className="mt-4 hair-t pt-4 grid grid-cols-2 gap-3">
                    <div>
                      <div className="label">Settled</div>
                      <div className="mono text-[13px] mt-1">${fmt(purchase.amount)}</div>
                    </div>
                    <div>
                      <div className="label">Acquired</div>
                      <div className="mono text-[13px] mt-1">{relativeTime(purchase.createdAt)}</div>
                    </div>
                  </div>
                  <button onClick={() => goToArtwork(work.id)} className="swiss-btn ghost w-full justify-center mt-4">
                    Open seal <ArrowRight size={12}/>
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="hair-all p-10 text-center bg-[var(--card)]">
            <ImageIcon size={22} className="mx-auto text-[var(--muted)]"/>
            <div className="display text-[28px] mt-3">No acquired works yet.</div>
            <p className="text-[14px] text-[var(--muted)] mt-2">Paid auction invoices will unlock acquired works and authenticity seals here.</p>
          </div>
        )
      )}

      {tab === 'commissions' && (
        buyerBookings.length ? (
        <div className="space-y-4">
          {commissionNotice && (
            <div className="hair-all p-3 bg-[var(--bg-2)] text-[13px] text-[var(--muted)]">
              {commissionNotice}
            </div>
          )}
          {buyerBookings.map((c) => {
            const stageIndex = { BOOKED: 0, BRIEFED: 1, IN_PROGRESS: 2, REVIEW: 2, DELIVERED: 3, ACCEPTED: 3 }[c.status] ?? 0;
            return (
            <div key={c.id} className="hair-all p-6 bg-[var(--card)]">
              <div className="flex justify-between items-start">
                <div>
                  <div className="display text-[24px]">{c.commission?.title || 'Commission'}</div>
                  <div className="mono text-[11px] text-[var(--muted)] mt-1">with {c.artist?.handle || artistById(c.artistId).handle}</div>
                </div>
                <span className="mono text-[9px] uppercase tracking-[0.15em] px-2 py-1 bg-[var(--accent-soft)] text-[var(--accent)]">{commissionState.stateLabel(c.status)}</span>
              </div>
              <div className="mt-5 flex gap-1">
                {['Booked','Brief','Drafts','Delivery'].map((s,j) => (
                  <div key={j} className="flex-1">
                    <div className={`h-1.5 ${j <= stageIndex ? 'bg-[var(--ink)]' : 'bg-[var(--hair)]'}`}/>
                    <div className="mono text-[9px] uppercase tracking-[0.1em] mt-2 text-[var(--muted)]">0{j+1} {s}</div>
                  </div>
                ))}
              </div>
              <div className="mt-5 pt-4 hair-t grid grid-cols-4 gap-4">
                <div><div className="label">Amount</div><div className="mono mt-1">${fmt(c.price)}</div></div>
                <div><div className="label">Status</div><div className="mt-1 text-[13px]">Escrowed</div></div>
                <div><div className="label">Due</div><div className="mono mt-1">{c.commission?.days || '-'}d</div></div>
                <div className="flex justify-end items-end gap-2 flex-wrap">
                  {c.status === 'DELIVERED' && (
                    <button onClick={() => updateCommissionStatus(c, 'ACCEPTED')} className="swiss-btn accent">
                      Accept delivery <ArrowRight size={12}/>
                    </button>
                  )}
                  {['BOOKED', 'BRIEFED'].includes(c.status) && (
                    <button onClick={() => updateCommissionStatus(c, 'CANCELLED')} className="swiss-btn ghost">
                      Cancel
                    </button>
                  )}
                  <button onClick={() => onOpenCommissionThread(c)} className="swiss-btn">Open thread <ArrowRight size={12}/></button>
                </div>
              </div>
            </div>
            );
          })}
        </div>
        ) : (
          <div className="hair-all p-10 text-center bg-[var(--card)]">
            <Briefcase size={22} className="mx-auto text-[var(--muted)]"/>
            <div className="display text-[28px] mt-3">No commission bookings yet.</div>
            <p className="text-[14px] text-[var(--muted)] mt-2">Book an open seller slot from the commissions board.</p>
          </div>
        )
      )}
    </main>
  );
};
