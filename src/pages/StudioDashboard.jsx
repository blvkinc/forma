// ============================================================
// FORMA — Artist studio dashboard
// ============================================================
import React, { useState, useEffect, useRef } from 'react';
import { User, Plus, ArrowRight, ChevronRight } from 'lucide-react';
import { ArtVisual } from '../components/shared';
import { SellerApplicationForm, SellerStudioForm, SellerArtworkForm, SellerCommissionForm } from '../features/seller';
import { fmt, formatTime, relativeTime, isSellerRole } from '../lib/ui';
import { ARTWORKS, COMMISSIONS } from '../lib/catalogue';
import { fetchMySellerApplication, submitSellerApplication, uploadSellerApplicationImage } from '../lib/onboarding';
import { loadPendingSellerApplication, submitPendingSellerApplication } from '../lib/pendingSellerApplication';
import { fetchArtistAuctionSettlements } from '../lib/auctions';
import { artistPayoutFromAuction } from '../lib/domain';

export const StudioDashboard = ({ goToArtwork, likes, toggleLike, profile, role, ownedArtist, commissionState, onOpenCommissionThread, onSubmitStudio, onSubmitArtwork, onUploadArtworkImage, onSubmitCommission }) => {
  const [tab, setTab] = useState(() => ownedArtist && isSellerRole(role) && profile?.verified ? 'overview' : 'onboarding');
  const [payoutsPaused, setPayoutsPaused] = useState(false);
  const [payoutNotice, setPayoutNotice] = useState('');
  const [application, setApplication] = useState(null);
  const [applicationLoading, setApplicationLoading] = useState(false);
  const [applicationError, setApplicationError] = useState('');
  const [pendingApplicationNotice, setPendingApplicationNotice] = useState('');
  const pendingApplicationImportRef = useRef(false);
  const [commissionNotice, setCommissionNotice] = useState('');
  const [sellerSettlements, setSellerSettlements] = useState([]);
  const [settlementLoading, setSettlementLoading] = useState(false);
  const [settlementError, setSettlementError] = useState('');
  const sellerVerified = isSellerRole(role) && profile?.verified === true;
  const canManageStudio = sellerVerified && !!ownedArtist;
  const canCreateStudio = sellerVerified;
  const ownedWorks = canManageStudio ? ARTWORKS.filter(w => w.artist === ownedArtist.id) : [];
  const ownedCommissions = canManageStudio ? COMMISSIONS.filter(c => c.artist === ownedArtist.id) : [];
  const sellerBookings = commissionState?.artistBookings || [];
  const escrowTotal = sellerBookings.reduce((total, booking) => total + Number(booking.price || 0), 0);
  const auctionTotal = ownedWorks.reduce((total, work) => total + Number(work.currentBid || 0), 0);
  const auctionSettlementTotal = sellerSettlements.reduce((total, settlement) => total + artistPayoutFromAuction(Number(settlement.amount || 0)), 0);
  const pendingAuctionSettlementTotal = sellerSettlements
    .filter(settlement => settlement.status === 'invoice_pending')
    .reduce((total, settlement) => total + artistPayoutFromAuction(Number(settlement.amount || 0)), 0);
  const openSlots = ownedCommissions.reduce((sum, c) => sum + Math.max(0, c.slots - c.taken), 0);
  const displayName = ownedArtist?.handle || profile?.handle || profile?.display_name || 'seller';
  const guardedSetTab = (next) => {
    if (!sellerVerified && next !== 'onboarding') {
      setTab('onboarding');
      return;
    }
    if (sellerVerified && !ownedArtist && !['setup', 'onboarding'].includes(next)) {
      setTab('setup');
      return;
    }
    setTab(next);
  };
  const studioTabs = [
    ...(!sellerVerified || application ? [{k:'onboarding',l:'Onboarding'}] : []),
    {k:'overview',l:'Overview',disabled:!canManageStudio},
    {k:'auctions',l:'Auctions',disabled:!canManageStudio},
    {k:'commissions',l:'Commissions',disabled:!canManageStudio},
    {k:'list-work',l:'List work',disabled:!canManageStudio},
    {k:'new-commission',l:'New commission',disabled:!canManageStudio},
    {k:'setup',l:ownedArtist ? 'Studio settings' : 'Studio setup',disabled:!canCreateStudio},
    {k:'payouts',l:'Payouts',disabled:!canManageStudio},
    {k:'audience',l:'Audience',disabled:!canManageStudio},
  ];

  useEffect(() => {
    let cancelled = false;
    if (!profile?.id) {
      setApplication(null);
      return undefined;
    }

    setApplicationLoading(true);
    setApplicationError('');
    fetchMySellerApplication(profile.id)
      .then(data => {
        if (!cancelled) setApplication(data);
      })
      .catch(err => {
        if (!cancelled) setApplicationError(err.message || 'Seller application unavailable.');
      })
      .finally(() => {
        if (!cancelled) setApplicationLoading(false);
      });

    return () => { cancelled = true; };
  }, [profile?.id]);

  useEffect(() => {
    if (!sellerVerified && tab !== 'onboarding') setTab('onboarding');
    else if (sellerVerified && !ownedArtist && !['setup', 'onboarding'].includes(tab)) setTab('setup');
    else if (sellerVerified && ownedArtist && tab === 'onboarding' && application?.status === 'approved') setTab('overview');
  }, [sellerVerified, ownedArtist, tab, application?.status]);

  useEffect(() => {
    let cancelled = false;
    const email = profile?.email;

    if (
      !profile?.id ||
      !email ||
      sellerVerified ||
      applicationLoading ||
      application?.id ||
      pendingApplicationImportRef.current
    ) {
      return undefined;
    }

    const pending = loadPendingSellerApplication(email);
    if (!pending) return undefined;

    pendingApplicationImportRef.current = true;
    setPendingApplicationNotice('Submitting your saved seller application for admin review.');
    setApplicationError('');

    submitPendingSellerApplication(profile.id, email)
      .then(saved => {
        if (cancelled) return;
        if (saved) {
          setApplication(saved);
          setPendingApplicationNotice('Seller application submitted. Admin review can now begin.');
        }
      })
      .catch(err => {
        if (cancelled) return;
        pendingApplicationImportRef.current = false;
        setPendingApplicationNotice('');
        setApplicationError(err.message || 'Saved seller application could not be submitted.');
      });

    return () => { cancelled = true; };
  }, [profile?.id, profile?.email, sellerVerified, applicationLoading, application?.id]);

  useEffect(() => {
    let cancelled = false;
    if (!canManageStudio || !ownedArtist?.id) {
      setSellerSettlements([]);
      return undefined;
    }

    setSettlementLoading(true);
    setSettlementError('');
    fetchArtistAuctionSettlements(ownedArtist.id)
      .then(rows => {
        if (!cancelled) setSellerSettlements(rows);
      })
      .catch(err => {
        if (!cancelled) setSettlementError(err.message || 'Auction settlements unavailable.');
      })
      .finally(() => {
        if (!cancelled) setSettlementLoading(false);
      });

    return () => { cancelled = true; };
  }, [canManageStudio, ownedArtist?.id]);

  const handleSubmitApplication = async (payload) => {
    if (!profile?.id) throw new Error('Authentication is required.');
    const saved = await submitSellerApplication(profile.id, payload);
    setApplication(saved);
    return true;
  };

  const transitionSellerBooking = async (booking, status) => {
    setCommissionNotice('');
    const result = await commissionState.transitionBooking(booking.id, status);
    if (result?.error) {
      setCommissionNotice(result.error);
      return false;
    }
    setCommissionNotice(`Commission moved to ${commissionState.stateLabel(status).toLowerCase()}.`);
    return true;
  };

  const todoItems = [
    ...sellerBookings.slice(0, 3).map(booking => ({
      p: '!',
      t: `${commissionState.stateLabel(booking.status)}: ${booking.commission?.title || 'Commission'}`,
      sub: `${booking.briefText ? 'Brief received' : 'Waiting for brief'} - $${fmt(Number(booking.price || 0))} in escrow`,
      action: () => onOpenCommissionThread(booking),
    })),
    ...ownedWorks.filter(work => work.endsAt > 0).slice(0, 3).map(work => ({
      p: work.endsAt < 1000 * 60 * 60 * 24 ? '!' : '.',
      t: `${work.title} auction is live`,
      sub: `${work.bids} bids - $${fmt(work.currentBid)} current - ${formatTime(work.endsAt)} left`,
      action: () => goToArtwork(work.id),
    })),
    ...ownedCommissions.filter(c => c.slots > c.taken).slice(0, 2).map(c => ({
      p: '.',
      t: `${c.title} has ${c.slots - c.taken} open slot${c.slots - c.taken === 1 ? '' : 's'}`,
      sub: `$${fmt(c.price)} - ${c.days}d delivery`,
      action: () => guardedSetTab('commissions'),
    })),
  ].slice(0, 5);

  return (
    <main className="fade-in max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
      <div className="hair-b pb-4 mb-8 flex flex-col lg:flex-row lg:justify-between lg:items-end gap-5">
        <div>
          <div className="label mb-2">№ STUDIO — Seller / {displayName}</div>
          <h1 className="display text-[42px] sm:text-[56px] leading-tight">Studio, today.</h1>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          <button onClick={() => guardedSetTab(sellerVerified ? 'setup' : 'onboarding')} className="swiss-btn ghost justify-center"><User size={12}/> {sellerVerified ? (ownedArtist ? 'Edit studio' : 'Studio setup') : 'Seller review'}</button>
          <button onClick={() => guardedSetTab('new-commission')} disabled={!canManageStudio} className={`swiss-btn ghost justify-center ${!canManageStudio ? 'opacity-50 cursor-not-allowed' : ''}`}><Plus size={12}/> New commission</button>
          <button onClick={() => guardedSetTab('list-work')} disabled={!canManageStudio} className={`swiss-btn justify-center ${!canManageStudio ? 'opacity-50 cursor-not-allowed' : ''}`}><Plus size={12}/> List new work</button>
        </div>
      </div>

      {!canManageStudio && (
        <div className="hair-all bg-[var(--card)] p-6 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="label">{sellerVerified ? 'Seller setup' : 'Seller review'}</div>
            <h2 className="display text-[26px] sm:text-[28px] mt-2">
              {sellerVerified ? 'Create your studio in the setup page.' : 'Submit your work before publishing.'}
            </h2>
            <p className="text-[13px] text-[var(--muted)] mt-2 max-w-[620px]">
              {sellerVerified
                ? 'Your seller account is verified; finish the studio row to unlock listings.'
                : 'Sellers are reviewed by admins for portfolio quality, process proof, and platform fit before auctions or commission boards open.'}
            </p>
          </div>
          <button onClick={() => guardedSetTab(sellerVerified ? 'setup' : 'onboarding')} className="swiss-btn accent shrink-0">
            <User size={12}/> {sellerVerified ? 'Studio setup' : 'Start onboarding'}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-5 mb-10">
        {[
          {l:'Live auctions',v:String(ownedWorks.length),d: ownedWorks.length ? `${ownedWorks.filter(w => w.endsAt < 1000*60*60*24).length} ending today` : 'No listed works'},
          {l:'Open slots',v:`${openSlots}`,d:`Across ${ownedCommissions.length} boards`},
          {l:'In escrow',v:`$${fmt(escrowTotal)}`,d:`${sellerBookings.length} commissions`},
          {l:'Auction value',v:`$${fmt(auctionTotal)}`,d:'Current live bids'},
          {l:'Followers',v: canManageStudio ? fmt(ownedArtist.followers || 0) : '0',d:'From Supabase artist row'},
        ].map((s,i) => (
          <div key={i} className="hair-all p-5 bg-[var(--card)]">
            <div className="label">{s.l}</div>
            <div className="mono text-[28px] mt-2 leading-none">{s.v}</div>
            <div className="text-[12px] text-[var(--muted)] mt-2">{s.d}</div>
          </div>
        ))}
      </div>

      <div className="admin-tabs flex gap-2 mb-8 overflow-x-auto pb-2">
        {studioTabs.map(t => (
          <button key={t.k} onClick={() => guardedSetTab(t.k)} disabled={t.disabled} className={`tab-pill shrink-0 ${tab===t.k?'active':''} ${t.disabled ? 'opacity-45 cursor-not-allowed' : ''}`}>{t.l}</button>
        ))}
      </div>

      {tab === 'onboarding' && (
        <div className="space-y-6">
          <div className="hair-all bg-[var(--card)] p-5 sm:p-6">
            <div className="label">Review status</div>
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mt-3">
              <div>
                <div className="display text-[28px]">
                  {applicationLoading ? 'Checking application.' :
                    application?.status === 'approved' ? 'Approved.' :
                    application?.status === 'rejected' ? 'Review returned.' :
                    application?.status === 'pending' ? 'Awaiting admin review.' :
                    application?.status === 'draft' ? 'Draft saved.' :
                    'No application submitted.'}
                </div>
                <p className="text-[13px] text-[var(--muted)] mt-2 max-w-[720px] leading-relaxed">
                  {application?.status === 'approved'
                    ? 'Your seller profile has been verified. Studio tools are available after the catalogue refreshes.'
                    : application?.status === 'rejected'
                      ? (application.reviewNote || 'Add stronger proof of work and resubmit for another review.')
                      : application?.status === 'pending'
                        ? 'Admins can now inspect your portfolio links, sample works, and process notes.'
                        : 'The application below becomes the admin review packet for your seller account.'}
                </p>
              </div>
              <span className={`mono text-[10px] uppercase tracking-[0.12em] px-2 py-1 self-start ${application?.status === 'approved' ? 'bg-[var(--good)] text-white' : application?.status === 'pending' ? 'bg-[var(--accent)] text-white' : 'hair-all text-[var(--muted)]'}`}>
                {application?.status || 'not submitted'}
              </span>
            </div>
            {applicationError && <div className="text-[12px] text-[var(--accent)] mt-4">{applicationError}</div>}
            {pendingApplicationNotice && <div className="text-[12px] text-[var(--muted)] mt-4">{pendingApplicationNotice}</div>}
          </div>

          {!sellerVerified && application?.status !== 'approved' && (
            <SellerApplicationForm
              profile={profile}
              application={application}
              onSubmit={handleSubmitApplication}
              onUploadImage={uploadSellerApplicationImage}
            />
          )}

          {sellerVerified && !ownedArtist && (
            <SellerStudioForm
              profile={profile}
              ownedArtist={ownedArtist}
              onSubmit={onSubmitStudio}
              onDone={() => setTab('overview')}
            />
          )}
        </div>
      )}

      {tab === 'setup' && sellerVerified && (
        <SellerStudioForm
          profile={profile}
          ownedArtist={ownedArtist}
          onSubmit={onSubmitStudio}
          onDone={() => setTab('overview')}
        />
      )}

      {tab === 'list-work' && canManageStudio && (
        <SellerArtworkForm
          onSubmit={onSubmitArtwork}
          onUploadImage={onUploadArtworkImage}
          onDone={() => setTab('auctions')}
        />
      )}

      {tab === 'new-commission' && canManageStudio && (
        <SellerCommissionForm
          onSubmit={onSubmitCommission}
          onDone={() => setTab('commissions')}
        />
      )}

      {tab === 'overview' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          <div className="xl:col-span-8">
            <div className="hair-b pb-3 mb-5 flex justify-between items-baseline">
              <h3 className="display text-[28px]">Live auction values</h3>
              <span className="mono text-[11px] text-[var(--muted)]">USD · current bids</span>
            </div>
            <div className="hair-all bg-[var(--card)] p-6">
              {ownedWorks.length ? (
                <div className="space-y-3">
                  {[...ownedWorks].sort((a,b) => Number(b.currentBid||0) - Number(a.currentBid||0)).map(w => {
                    const max = Math.max(...ownedWorks.map(x => Number(x.currentBid||0)), 1);
                    const pct = Math.max(3, Math.round((Number(w.currentBid||0) / max) * 100));
                    return (
                      <button key={w.id} onClick={() => goToArtwork(w.id)} className="w-full text-left group/bar">
                        <div className="flex justify-between items-baseline text-[12px] mb-1">
                          <span className="truncate pr-3">{w.title}</span>
                          <span className="mono font-medium">${fmt(w.currentBid)}</span>
                        </div>
                        <div className="h-2.5 bg-[var(--hair)]">
                          <div className="h-full bg-[var(--ink)] group-hover/bar:bg-[var(--accent)] transition-colors" style={{ width: `${pct}%` }}/>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-10">
                  <div className="display text-[22px]">No live works yet.</div>
                  <p className="text-[13px] text-[var(--muted)] mt-2">List an auction to see its current bid value here.</p>
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mt-5">
              <div className="hair-all p-4">
                <div className="label">Live auction value</div>
                <div className="mono text-[24px] mt-1">${fmt(auctionTotal)}</div>
              </div>
              <div className="hair-all p-4">
                <div className="label">Commission escrow</div>
                <div className="mono text-[24px] mt-1">${fmt(escrowTotal)}</div>
              </div>
              <div className="hair-all p-4">
                <div className="label">Open inventory</div>
                <div className="mono text-[24px] mt-1">{ownedWorks.length + openSlots}</div>
              </div>
            </div>
          </div>
          <div className="xl:col-span-4">
            <div className="hair-b pb-3 mb-5">
              <h3 className="display text-[24px]">To do</h3>
            </div>
            <div className="space-y-3">
              {(todoItems.length ? todoItems : [
                {p:'.', t: canManageStudio ? 'List your first artwork or commission board' : 'Complete seller onboarding to unlock tools', sub: canManageStudio ? 'Use the Studio tabs to open your shop.' : 'Admin approval verifies your studio before listings open.', action: canManageStudio ? () => guardedSetTab('list-work') : () => guardedSetTab(sellerVerified ? 'setup' : 'onboarding')},
              ]).map((todo,i) => (
                <button key={i} onClick={todo.action} className="hair-all p-3 flex items-start gap-3 cursor-pointer hover:bg-[var(--card)] text-left w-full">
                  <span className={`mono text-[14px] ${todo.p === '!' ? 'text-[var(--accent)]' : 'text-[var(--muted)]'}`}>{todo.p}</span>
                  <div className="flex-1">
                    <div className="text-[13px] font-medium">{todo.t}</div>
                    <div className="text-[11px] text-[var(--muted)] mt-0.5">{todo.sub}</div>
                  </div>
                  <ChevronRight size={14} className="text-[var(--muted)]"/>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'auctions' && (
        <div className="overflow-x-auto pb-2">
          <div className="min-w-[760px] grid grid-cols-12 gap-4 label hair-b pb-3">
            <div className="col-span-1">№</div>
            <div className="col-span-4">Work</div>
            <div className="col-span-2">Bids</div>
            <div className="col-span-2">Current</div>
            <div className="col-span-2">Ends</div>
            <div className="col-span-1 text-right">Actions</div>
          </div>
          {ownedWorks.map((w,i) => (
            <div key={w.id} className="min-w-[760px] grid grid-cols-12 gap-4 py-4 hair-b items-center">
              <div className="col-span-1 mono text-[11px] text-[var(--muted)]">{String(i+1).padStart(3,'0')}</div>
              <div className="col-span-4 flex items-center gap-3">
                <div className="w-12 h-12 hair-all"><ArtVisual visual={w.visual} imageUrl={w.imageUrl} alt={w.title}/></div>
                <div>
                  <div className="text-[14px] font-medium">{w.title}</div>
                  <div className="mono text-[11px] text-[var(--muted)]">Listed {relativeTime(w.createdAt)}</div>
                </div>
              </div>
              <div className="col-span-2 mono">{w.bids}</div>
              <div className="col-span-2 mono font-medium">${fmt(w.currentBid)}</div>
              <div className="col-span-2 mono text-[13px]">{formatTime(w.endsAt)}</div>
              <div className="col-span-1 text-right">
                <button onClick={() => goToArtwork(w.id)} className="hair-all w-7 h-7 inline-flex items-center justify-center" aria-label={`Open ${w.title}`}>
                  <ArrowRight size={14}/>
                </button>
              </div>
            </div>
          ))}
          {ownedWorks.length === 0 && (
            <div className="hair-all p-8 text-center bg-[var(--card)]">
              <div className="display text-[24px]">No seller auctions yet.</div>
              <p className="text-[13px] text-[var(--muted)] mt-2">Linked seller works from Supabase will appear here.</p>
            </div>
          )}
          <button onClick={() => guardedSetTab('list-work')} disabled={!canManageStudio} className={`swiss-btn mt-8 ${!canManageStudio ? 'opacity-50 cursor-not-allowed' : ''}`}><Plus size={12}/> List new auction</button>
        </div>
      )}

      {tab === 'commissions' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {commissionNotice && (
            <div className="lg:col-span-2 hair-all p-3 bg-[var(--bg-2)] text-[13px] text-[var(--muted)]">
              {commissionNotice}
            </div>
          )}
          {ownedCommissions.map(c => {
            const remaining = Math.max(0, c.slots - c.taken);
            return (
              <div key={c.id} className="hair-all p-6 bg-[var(--card)]">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <div className="label">Commission board</div>
                    <div className="display text-[24px] mt-3">{c.title}</div>
                    <div className="mono text-[11px] text-[var(--muted)] mt-2">${fmt(c.price)} - {c.days}d delivery</div>
                  </div>
                  <span className={`mono text-[9px] uppercase tracking-[0.12em] px-2 py-1 ${remaining > 0 ? 'bg-[var(--good)] text-white' : 'hair-all text-[var(--muted)]'}`}>
                    {remaining > 0 ? 'OPEN' : 'FULL'}
                  </span>
                </div>
                <p className="text-[13px] text-[var(--ink-2)] mt-4 leading-relaxed">{c.brief || 'No public brief yet.'}</p>
                <div className="mt-5 grid grid-cols-3 gap-3">
                  <div className="hair-all p-3">
                    <div className="label">Slots</div>
                    <div className="mono text-[20px] mt-1">{c.taken}/{c.slots}</div>
                  </div>
                  <div className="hair-all p-3">
                    <div className="label">Open</div>
                    <div className="mono text-[20px] mt-1">{remaining}</div>
                  </div>
                  <div className="hair-all p-3">
                    <div className="label">Potential</div>
                    <div className="mono text-[20px] mt-1">${fmt(remaining * c.price)}</div>
                  </div>
                </div>
              </div>
            );
          })}
          {sellerBookings.map(booking => (
            <div key={booking.id} className="hair-all p-6 bg-[var(--card)]">
              <div className="label">Booked slot</div>
              <div className="display text-[24px] mt-3">{booking.commission?.title || 'Commission'}</div>
              <div className="mono text-[11px] text-[var(--muted)] mt-2">{commissionState.stateLabel(booking.status)} · ${fmt(booking.price)}</div>
              <p className="text-[13px] text-[var(--ink-2)] mt-4 leading-relaxed">{booking.briefText || 'No brief submitted yet.'}</p>
              <div className="flex gap-2 mt-5">
                <button onClick={() => onOpenCommissionThread(booking)} className="swiss-btn ghost">Open thread <ArrowRight size={12}/></button>
                {booking.status === 'DISPUTED' ? (
                  <span className="hair-all px-3 py-2 mono text-[10px] uppercase tracking-[0.1em] text-[var(--muted)]">
                    Admin review
                  </span>
                ) : booking.status === 'DELIVERED' ? (
                  <span className="hair-all px-3 py-2 mono text-[10px] uppercase tracking-[0.1em] text-[var(--muted)]">
                    Awaiting buyer acceptance
                  </span>
                ) : (
                  commissionState.roleNextStates(booking.status).map(next => (
                    <button key={next} onClick={() => transitionSellerBooking(booking, next)} className="swiss-btn">
                      {commissionState.stateLabel(next)}
                    </button>
                  ))
                )}
              </div>
            </div>
          ))}
          <div className="hair-all p-6 bg-[var(--card)] flex flex-col items-center justify-center text-center min-h-[300px]">
            <Plus size={24} className="text-[var(--muted)]"/>
            <div className="display text-[22px] mt-4">Open new commission</div>
            <div className="text-[12px] text-[var(--muted)] mt-1 max-w-[200px]">Set price, slots, brief, and delivery window.</div>
            <button onClick={() => guardedSetTab('new-commission')} disabled={!canManageStudio} className={`swiss-btn mt-5 ${!canManageStudio ? 'opacity-50 cursor-not-allowed' : ''}`}>Create commission</button>
          </div>
        </div>
      )}

      {tab === 'payouts' && (
        <div>
          <div className="hair-all p-6 mb-8 bg-[var(--card)] grid grid-cols-1 md:grid-cols-5 gap-6">
            <div className="md:col-span-2">
              <div className="label">Escrow due (net)</div>
              <div className="display text-[48px] mt-2 leading-none">${fmt(Math.round(escrowTotal * 0.85))}</div>
              <div className="mono text-[11px] text-[var(--muted)] mt-2">
                {payoutsPaused ? 'Payouts paused' : `${sellerBookings.length} commission${sellerBookings.length === 1 ? '' : 's'} in escrow`}
              </div>
            </div>
            <div>
              <div className="label">Gross</div>
              <div className="mono text-[20px] mt-1">${fmt(escrowTotal)}</div>
              <div className="label mt-3">Platform fee</div>
              <div className="mono text-[14px] text-[var(--muted)] mt-1">-${fmt(Math.round(escrowTotal * 0.15))} (15%)</div>
            </div>
            <div>
              <div className="label">Auction invoices</div>
              <div className="mono text-[20px] mt-1">${fmt(pendingAuctionSettlementTotal)}</div>
              <div className="label mt-3">Settled hammer</div>
              <div className="mono text-[14px] text-[var(--muted)] mt-1">${fmt(auctionSettlementTotal)}</div>
            </div>
            <div className="flex flex-col justify-end">
              <button
                onClick={() => {
                  setPayoutsPaused(v => !v);
                  setPayoutNotice(payoutsPaused ? 'Payouts resumed.' : 'Payouts paused — escrow will hold until you resume.');
                }}
                className="swiss-btn ghost mb-2"
              >
                {payoutsPaused ? 'Resume payouts' : 'Pause payouts'}
              </button>
              <button
                onClick={() => setPayoutNotice('Bank/USDC account changes are handled by FORMA support — email payouts@forma.studio.')}
                className="swiss-btn"
              >
                Change account
              </button>
            </div>
          </div>

          {payoutNotice && (
            <div className="hair-all bg-[var(--bg-2)] p-3 text-[13px] mb-8">{payoutNotice}</div>
          )}

          <div className="hair-b pb-3 mb-4">
            <h3 className="display text-[24px]">Escrow ledger</h3>
          </div>
          {sellerBookings.length ? (
            <div className="overflow-x-auto">
              <div className="min-w-[760px] grid grid-cols-12 gap-4 label hair-b pb-2">
                <div className="col-span-1">№</div>
                <div className="col-span-3">Status</div>
                <div className="col-span-4">Commission</div>
                <div className="col-span-2">Updated</div>
                <div className="col-span-2 text-right">Net (85%)</div>
              </div>
              {sellerBookings.map((b, i) => (
                <div key={b.id} className="min-w-[760px] grid grid-cols-12 gap-4 py-3 hair-b items-center text-[13px]">
                  <div className="col-span-1 mono text-[11px] text-[var(--muted)]">{String(i+1).padStart(3,'0')}</div>
                  <div className="col-span-3">{commissionState.stateLabel(b.status)}</div>
                  <div className="col-span-4 text-[var(--muted)]">{b.commission?.title || 'Commission'}</div>
                  <div className="col-span-2 mono text-[11px]">{b.updatedAt ? relativeTime(b.updatedAt) : '—'}</div>
                  <div className="col-span-2 mono text-right font-medium">${fmt(Math.round(Number(b.price || 0) * 0.85))}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="hair-all bg-[var(--card)] p-10 text-center">
              <div className="display text-[24px]">No escrow yet.</div>
              <p className="text-[14px] text-[var(--muted)] mt-2">Booked commissions accrue here; net pays out at 85% after delivery.</p>
            </div>
          )}

          <div className="hair-b pb-3 mb-4 mt-10">
            <h3 className="display text-[24px]">Auction settlements</h3>
          </div>
          {settlementError && (
            <div className="hair-all bg-[var(--accent-soft)] text-[var(--accent)] p-3 text-[13px] mb-4">{settlementError}</div>
          )}
          {sellerSettlements.length ? (
            <div className="overflow-x-auto">
              <div className="min-w-[860px] grid grid-cols-12 gap-4 label hair-b pb-2">
                <div className="col-span-1">No.</div>
                <div className="col-span-4">Artwork</div>
                <div className="col-span-2">Invoice</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-1 text-right">Hammer</div>
                <div className="col-span-2 text-right">Artist due</div>
              </div>
              {sellerSettlements.map((settlement, i) => (
                <button
                  key={settlement.id}
                  type="button"
                  onClick={() => goToArtwork(settlement.artworkId)}
                  className="min-w-[860px] w-full grid grid-cols-12 gap-4 py-3 hair-b items-center text-[13px] text-left hover:bg-[var(--card)] transition-colors"
                >
                  <div className="col-span-1 mono text-[11px] text-[var(--muted)]">{String(i+1).padStart(3,'0')}</div>
                  <div className="col-span-4 flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 hair-all flex-shrink-0">
                      <ArtVisual visual={settlement.artwork?.visual} imageUrl={settlement.artwork?.imageUrl} alt={settlement.artwork?.title || settlement.artworkId}/>
                    </div>
                    <div className="min-w-0">
                      <div className="truncate">{settlement.artwork?.title || settlement.artworkId}</div>
                      <div className="mono text-[10px] text-[var(--muted)] mt-1">{settlement.closedAt ? relativeTime(settlement.closedAt) : 'not closed'}</div>
                    </div>
                  </div>
                  <div className="col-span-2 mono text-[11px] truncate">{settlement.invoiceReference || 'No invoice'}</div>
                  <div className="col-span-2">
                    <span className={`mono text-[9px] uppercase tracking-[0.1em] px-1.5 py-0.5 ${settlement.status === 'paid' ? 'bg-[var(--good)] text-white' : settlement.status === 'invoice_pending' ? 'bg-[var(--accent)] text-white' : 'hair-all text-[var(--muted)]'}`}>
                      {settlement.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="col-span-1 mono text-right">${fmt(settlement.amount)}</div>
                  <div className="col-span-2 mono text-right font-medium">${fmt(artistPayoutFromAuction(settlement.amount))}</div>
                </button>
              ))}
            </div>
          ) : (
            <div className="hair-all bg-[var(--card)] p-10 text-center">
              <div className="display text-[24px]">{settlementLoading ? 'Loading settlements.' : 'No auction settlements yet.'}</div>
              <p className="text-[14px] text-[var(--muted)] mt-2">Closed auction invoices and paid hammer totals will appear here.</p>
            </div>
          )}
        </div>
      )}

      {tab === 'audience' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          <div className="xl:col-span-8">
            <div className="hair-b pb-3 mb-5">
              <h3 className="display text-[28px]">Engagement by work</h3>
            </div>
            {ownedWorks.length ? (
              <div className="hair-all bg-[var(--card)]">
                <div className="grid grid-cols-12 gap-4 label hair-b p-4">
                  <div className="col-span-6">Work</div>
                  <div className="col-span-3 text-right">Bids</div>
                  <div className="col-span-3 text-right">Watching</div>
                </div>
                {[...ownedWorks].sort((a,b) => Number(b.watchers||0) - Number(a.watchers||0)).map(w => (
                  <button key={w.id} onClick={() => goToArtwork(w.id)} className="w-full grid grid-cols-12 gap-4 p-4 hair-b last:border-0 items-center text-[13px] text-left hover:bg-[var(--bg-2)] transition-colors">
                    <div className="col-span-6 truncate">{w.title}</div>
                    <div className="col-span-3 text-right mono">{w.bids || 0}</div>
                    <div className="col-span-3 text-right mono">{w.watchers || 0}</div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="hair-all bg-[var(--card)] p-10 text-center">
                <div className="display text-[24px]">No works to measure yet.</div>
                <p className="text-[13px] text-[var(--muted)] mt-2">Bids and watchers per listed work will appear here.</p>
              </div>
            )}
          </div>
          <div className="xl:col-span-4">
            <div className="hair-all p-5 bg-[var(--card)]">
              <div className="label">Audience totals</div>
              <div className="space-y-3 mt-4 text-[13px]">
                {[
                  {l:'Followers', v:fmt(Number(ownedArtist?.followers || 0))},
                  {l:'Total bids', v:fmt(ownedWorks.reduce((s,w) => s + Number(w.bids||0), 0))},
                  {l:'Total watchers', v:fmt(ownedWorks.reduce((s,w) => s + Number(w.watchers||0), 0))},
                  {l:'Commission boards', v:fmt(ownedCommissions.length)},
                ].map((r,i) => (
                  <div key={i} className="hair-b pb-3 flex justify-between items-baseline last:border-0">
                    <span className="text-[var(--muted)]">{r.l}</span>
                    <span className="mono">{r.v}</span>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-[var(--muted)] mt-4 leading-relaxed">
                Follower-level history and reach analytics aren't tracked yet.
              </p>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};
