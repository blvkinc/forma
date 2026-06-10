// ============================================================
// FORMA — Admin console
// ============================================================
import React, { useEffect, useState } from 'react';
import { Check, ExternalLink, Eye, Flag, MessageCircle, ShieldCheck, X } from 'lucide-react';
import { ArtVisual } from '../components/shared';
import { fmt, formatTime, relativeTime } from '../lib/ui';
import { ARTWORKS, ARTISTS, COMMISSIONS, FEED_POSTS, artworkById, artistById } from '../lib/catalogue';
import { useAdmin } from '../hooks/useAdmin';

export const AdminDashboard = ({ goToArtist, goToArtwork, goToFeed, trustState, profile, user, initialModerationArtworkId, initialTab }) => {
  const [tab, setTab] = useState(initialModerationArtworkId ? 'moderation' : initialTab || 'overview');
  const [actionError, setActionError] = useState(null);
  const [reviewNotes, setReviewNotes] = useState({});
  const [selectedModerationId, setSelectedModerationId] = useState(initialModerationArtworkId || null);
  const [moderationNotes, setModerationNotes] = useState({});
  const admin = useAdmin();
  const reports = trustState?.reports || [];
  const openReports = reports.filter(report => report.status === 'open' || report.status === 'reviewing');
  const highPriorityReports = openReports.filter(report => report.priority === 'high');
  const socialTargetTypes = new Set(['feed_post', 'artist', 'user']);
  const socialReports = reports.filter(report => socialTargetTypes.has(report.targetType));
  const openSocialReports = socialReports.filter(report => report.status === 'open' || report.status === 'reviewing');
  const adminEmail = profile?.email || user?.email || 'admin';
  const adminName = profile?.display_name || adminEmail;
  const liveAuctions = ARTWORKS.filter(w => w.endsAt > 0).length;
  const catalogueValue = ARTWORKS.reduce((s, w) => s + Number(w.currentBid || 0), 0);
  const escrowGross = admin.payouts.reduce((s, p) => s + Number(p.gross || 0), 0);
  const pendingKyc = admin.kyc.filter(u => !u.verified).length;
  const pendingSettlements = admin.auctionSettlements.filter(s => s.status === 'invoice_pending');
  const activeDeliveries = admin.deliveryOutbox.filter(d => d.status === 'pending' || d.status === 'failed');
  const pendingSellerApplications = admin.sellerApplications.filter(app => app.status === 'pending');
  const settlementByArtworkId = new Map(admin.auctionSettlements.map(s => [s.artworkId, s]));
  const sellerApplicationByProfileId = new Map(admin.sellerApplications.map(app => [app.profileId, app]));
  const aiReviewItems = admin.moderation.artworks.filter(work =>
    Number(work.aiVoteCount || 0) > 0 ||
    (work.pendingProofs?.length || 0) > 0 ||
    ['under_review', 'restricted', 'proof_pending'].includes(work.authenticityStatus)
  );
  const pendingProofReviews = admin.moderation.artworks.reduce((sum, work) => sum + Number(work.pendingProofs?.length || 0), 0);
  const aiVoteTotal = admin.moderation.artworks.reduce((sum, work) => sum + Number(work.aiVoteCount || 0), 0);
  const moderationQueue = admin.moderation.artworks.filter(work =>
    work.takenDown ||
    work.reviewStatus === 'queued' ||
    work.reviewStatus === 'reviewing' ||
    work.openReports?.length > 0 ||
    work.pendingProofs?.length > 0 ||
    Number(work.aiVoteCount || 0) > 0
  );
  const selectedModerationArtwork =
    admin.moderation.artworks.find(work => work.id === selectedModerationId) ||
    moderationQueue[0] ||
    admin.moderation.artworks[0] ||
    null;
  useEffect(() => {
    if (initialModerationArtworkId) {
      setSelectedModerationId(initialModerationArtworkId);
      setTab('moderation');
      return;
    }
    if (initialTab) setTab(initialTab);
  }, [initialModerationArtworkId, initialTab]);
  const statusTone = (status) => {
    if (status === 'paid' || status === 'sent' || status === 'approved' || status === 'cleared' || status === 'verified' || status === 'accepted') return 'bg-[var(--good)] text-white';
    if (status === 'invoice_pending' || status === 'pending' || status === 'failed' || status === 'rejected' || status === 'taken_down' || status === 'restricted') return 'bg-[var(--accent)] text-white';
    if (status === 'queued' || status === 'reviewing' || status === 'under_review' || status === 'proof_pending') return 'bg-[#D2BE76] text-[var(--ink)]';
    return 'hair-all text-[var(--muted)]';
  };
  const dateLabel = (iso) => iso ? new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '-';
  const reportTargetName = (report) => {
    if (report.targetType === 'artwork') return artworkById(report.targetId).title || report.targetId;
    if (report.targetType === 'artist') return artistById(report.targetId).name || report.targetId;
    if (report.targetType === 'feed_post') {
      const post = FEED_POSTS.find(item => item.id === report.targetId);
      if (!post) return report.targetId;
      const artist = artistById(post.artist);
      const body = String(post.text || '').slice(0, 54);
      return `${artist.name} feed post${body ? ` - ${body}` : ''}`;
    }
    if (report.targetType === 'user') return `User ${String(report.targetId || '').slice(0, 8)}`;
    return report.targetId;
  };
  const reportAge = (iso) => {
    if (!iso) return 'unknown';
    const diff = Date.now() - new Date(iso).getTime();
    const hours = Math.max(0, Math.floor(diff / 3600000));
    if (hours < 1) return 'just now';
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };
  const changeReportStatus = async (reportId, status, resolutionNote = '') => {
    setActionError(null);
    try {
      await trustState?.updateReportStatus(reportId, status, resolutionNote);
    } catch (err) {
      setActionError(err.message || 'Report update failed.');
    }
  };
  const closeAuction = async (artworkId) => {
    setActionError(null);
    try {
      await admin.closeAuction(artworkId);
    } catch (err) {
      setActionError(err.message || 'Auction close-out failed.');
    }
  };
  const markSettlementPaid = async (settlementId) => {
    setActionError(null);
    try {
      await admin.markSettlementPaid(settlementId);
    } catch (err) {
      setActionError(err.message || 'Invoice update failed.');
    }
  };
  const changeDeliveryStatus = async (deliveryId, status) => {
    setActionError(null);
    try {
      await admin.setDeliveryStatus(deliveryId, status);
    } catch (err) {
      setActionError(err.message || 'Delivery update failed.');
    }
  };
  const reviewApplication = async (application, decision) => {
    setActionError(null);
    try {
      await admin.decideSellerApplication(application.id, decision, reviewNotes[application.id] || '');
      setReviewNotes(prev => ({ ...prev, [application.id]: '' }));
      await admin.refresh();
    } catch (err) {
      setActionError(err.message || 'Seller review failed.');
    }
  };
  const noteForArtwork = (artwork) => moderationNotes[artwork.id] ?? artwork.review?.reviewNote ?? '';
  const saveArtworkDecision = async (artwork, status, takenDown) => {
    if (!artwork) return;
    setActionError(null);
    try {
      await admin.reviewArtworkModeration(artwork.id, {
        status,
        takenDown,
        priority: artwork.reviewPriority || 'normal',
        reason: status === 'taken_down' ? 'admin_takedown' : 'admin_review',
        reviewNote: noteForArtwork(artwork),
      });
    } catch (err) {
      setActionError(err.message || 'Artwork review failed.');
    }
  };
  const saveProofDecision = async (proofId, status) => {
    setActionError(null);
    try {
      await admin.reviewArtworkProof(proofId, status);
    } catch (err) {
      setActionError(err.message || 'Proof review failed.');
    }
  };

  return (
    <main className="fade-in max-w-[1440px] mx-auto px-8 py-10">
      <div className="hair-b pb-4 mb-8 flex justify-between items-end">
        <div>
          <div className="label mb-2 text-[var(--accent)]">№ ADMIN — Internal use only</div>
          <h1 className="display text-[56px] leading-tight">Operations.</h1>
        </div>
        <div className="flex items-center gap-3 mono text-[11px] uppercase tracking-[0.12em]">
          <span className="text-[var(--muted)]">Logged in as</span>
          <span className="normal-case tracking-normal">{adminName}</span>
          <span className="bg-[var(--accent)] text-white px-2 py-0.5">ADMIN</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-9 gap-5 mb-10">
        {[
          {l:'Accounts',v:fmt(admin.kyc.length),d:`${pendingKyc} pending KYC`,hot:pendingKyc > 0},
          {l:'Seller review',v:fmt(pendingSellerApplications.length),d:`${admin.sellerApplications.length} applications`,hot:pendingSellerApplications.length > 0},
          {l:'Catalogue value',v:`$${fmt(catalogueValue)}`,d:`${ARTWORKS.length} works`},
          {l:'Live auctions',v:fmt(liveAuctions),d:`${ARTWORKS.length - liveAuctions} closed`},
          {l:'AI review',v:fmt(aiReviewItems.length),d:`${pendingProofReviews} proofs / ${aiVoteTotal} votes`,hot:aiReviewItems.length > 0},
          {l:'Social reports',v:fmt(openSocialReports.length),d:`${socialReports.length} total`,hot:openSocialReports.length > 0},
          {l:'Invoices',v:fmt(pendingSettlements.length),d:`$${fmt(pendingSettlements.reduce((s, row) => s + Number(row.totalDue || 0), 0))} pending`,hot:pendingSettlements.length > 0},
          {l:'Commission escrow',v:`$${fmt(escrowGross)}`,d:`${admin.payouts.length} studios`},
          {l:'Delivery queue',v:String(activeDeliveries.length),d:`${activeDeliveries.filter(row => row.status === 'failed').length} failed`,hot:activeDeliveries.length > 0},
        ].map((s,i) => (
          <div key={i} className={`p-5 ${s.hot ? 'hair-all bg-[var(--accent)] text-white' : 'hair-all bg-[var(--card)]'}`}>
            <div className={`label ${s.hot ? 'text-white opacity-70' : ''}`}>{s.l}</div>
            <div className="mono text-[28px] mt-2 leading-none">{s.v}</div>
            <div className={`text-[12px] mt-2 ${s.hot ? 'opacity-90' : 'text-[var(--muted)]'}`}>{s.d}</div>
          </div>
        ))}
      </div>

      <div className="admin-tabs flex gap-2 mb-8 overflow-x-auto pb-2">
        {[
          {k:'overview',l:'Overview'},
          {k:'seller-review',l:`Seller review - ${pendingSellerApplications.length}`},
          {k:'users',l:'Users / KYC'},
          {k:'auctions',l:'Auctions'},
          {k:'settlements',l:`Invoices - ${admin.auctionSettlements.length}`},
          {k:'social',l:`Social - ${openSocialReports.length}`},
          {k:'disputes',l:`Reports - ${openReports.length}`},
          {k:'cdisputes',l:`Disputes - ${admin.disputes.length}`},
          {k:'moderation',l:`AI review - ${moderationQueue.length}`},
          {k:'delivery',l:`Delivery - ${activeDeliveries.length}`},
          {k:'finance',l:'Payouts'},
          {k:'audit',l:'Audit log'},
        ].map(t => (
          <button key={t.k} onClick={() => setTab(t.k)} className={`tab-pill ${tab===t.k?'active':''}`}>{t.l}</button>
        ))}
      </div>

      {(admin.error || actionError) && (
        <div className="hair-all bg-[var(--accent-soft)] text-[var(--accent)] p-4 text-[13px] mb-6">
          {actionError || admin.error}
        </div>
      )}

      {tab === 'overview' && (
        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-8">
            <div className="hair-b pb-3 mb-5 flex justify-between items-baseline">
              <h3 className="display text-[28px]">Top auctions by bid</h3>
              <span className="mono text-[11px] text-[var(--muted)]">USD · live</span>
            </div>
            <div className="hair-all p-6 bg-[var(--card)] space-y-3">
              {[...ARTWORKS].sort((a,b) => Number(b.currentBid||0) - Number(a.currentBid||0)).slice(0,8).map(w => {
                const max = Math.max(...ARTWORKS.map(x => Number(x.currentBid||0)), 1);
                const pct = Math.max(3, Math.round((Number(w.currentBid||0) / max) * 100));
                return (
                  <div key={w.id}>
                    <div className="flex justify-between items-baseline text-[12px] mb-1">
                      <span className="truncate pr-3">{w.title} <span className="text-[var(--muted)] mono text-[10px]">{artistById(w.artist).handle}</span></span>
                      <span className="mono font-medium">${fmt(w.currentBid)}</span>
                    </div>
                    <div className="h-2.5 bg-[var(--hair)]">
                      <div className="h-full bg-[var(--ink)]" style={{ width: `${pct}%` }}/>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 hair-b pb-3 mb-5 flex justify-between items-baseline">
              <h3 className="display text-[28px]">Live high-value auctions</h3>
              <span className="mono text-[11px] text-[var(--muted)]">Real-time</span>
            </div>
            <div className="grid grid-cols-12 gap-4 label hair-b pb-2">
              <div className="col-span-1">№</div>
              <div className="col-span-4">Work</div>
              <div className="col-span-2">Artist</div>
              <div className="col-span-2">Bid</div>
              <div className="col-span-2">Ends</div>
              <div className="col-span-1 text-right">Artist</div>
            </div>
            {ARTWORKS.filter(w => w.currentBid > 400).slice(0,6).map((w) => (
              <div key={w.id} className="grid grid-cols-12 gap-4 py-3 hair-b items-center text-[13px]">
                <div className="col-span-1 mono text-[11px] text-[var(--muted)]">{w.id.toUpperCase()}</div>
                <div className="col-span-4">{w.title}</div>
                <div className="col-span-2 mono text-[11px]">{artistById(w.artist).handle}</div>
                <div className="col-span-2 mono font-medium">${fmt(w.currentBid)}</div>
                <div className="col-span-2 mono text-[11px]">{formatTime(w.endsAt)}</div>
                <div className="col-span-1 text-right">
                  <button onClick={() => goToArtist(w.artist)} className="hair-all w-6 h-6 inline-flex items-center justify-center hover:bg-[var(--ink)] hover:text-[var(--bg)]" aria-label={`Open ${artistById(w.artist).name}`}>
                    <Flag size={11}/>
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="col-span-4 space-y-6">
            <div className="hair-all p-5">
              <div className="label mb-4">Platform snapshot</div>
              <div className="space-y-2">
                {[
                  {l:'Studios', v:fmt(ARTISTS.length)},
                  {l:'Works listed', v:fmt(ARTWORKS.length)},
                  {l:'Commission boards', v:fmt(COMMISSIONS.length)},
                  {l:'AI review cases', v:fmt(aiReviewItems.length)},
                  {l:'Social reports', v:fmt(openSocialReports.length)},
                  {l:'Open disputes', v:fmt(admin.disputes.length)},
                  {l:'Pending KYC', v:fmt(pendingKyc)},
                ].map((m,i) => (
                  <div key={i} className="flex justify-between items-center hair-b py-2 last:border-0">
                    <span className="text-[13px]">{m.l}</span>
                    <span className="mono text-[11px]">{m.v}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="hair-all p-5 bg-[var(--accent)] text-white">
              <div className="label text-white opacity-80">Action required</div>
              <div className="text-[15px] mt-3 leading-relaxed">
                {pendingSellerApplications.length > 0
                  ? `${pendingSellerApplications.length} seller application${pendingSellerApplications.length === 1 ? '' : 's'} need portfolio review.`
                  : aiReviewItems.length > 0
                  ? `${aiReviewItems.length} artwork authenticity case${aiReviewItems.length === 1 ? '' : 's'} need AI/proof review.`
                  : openSocialReports.length > 0
                  ? `${openSocialReports.length} social report${openSocialReports.length === 1 ? '' : 's'} need feed, studio, or user review.`
                  : openReports.length > 0
                  ? `${openReports.length} trust reports need review. ${highPriorityReports.length} are high priority.`
                  : 'No open trust reports are waiting in the queue.'}
              </div>
              <button
                onClick={() => setTab(
                  pendingSellerApplications.length > 0 ? 'seller-review' :
                  aiReviewItems.length > 0 ? 'moderation' :
                  openSocialReports.length > 0 ? 'social' :
                  'disputes'
                )}
                className="swiss-btn mt-4 bg-white text-[var(--accent)] border-white"
              >
                {pendingSellerApplications.length > 0 ? 'Review sellers' : aiReviewItems.length > 0 ? 'Review AI cases' : openSocialReports.length > 0 ? 'Review social' : 'Review reports'}
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === 'seller-review' && (
        <div>
          <div className="hair-b pb-3 mb-5 flex justify-between items-baseline">
            <div>
              <h3 className="display text-[24px]">Seller applications</h3>
              <p className="text-[12px] text-[var(--muted)] mt-1">Review portfolio links, sample work, and process proof before approving seller tools.</p>
            </div>
            <button onClick={admin.refresh} className="mono text-[11px] underline-hover">Refresh</button>
          </div>
          <div className="space-y-5">
            {admin.sellerApplications.map(application => (
              <div key={application.id} className="hair-all bg-[var(--card)] p-5">
                <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-5">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`mono text-[9px] uppercase tracking-[0.12em] px-2 py-1 ${statusTone(application.status)}`}>
                        {application.status}
                      </span>
                      <span className="mono text-[10px] text-[var(--muted)]">{relativeTime(application.updatedAt)}</span>
                    </div>
                    <div className="display text-[28px] mt-3">{application.studioName}</div>
                    <div className="mono text-[11px] text-[var(--muted)] mt-1">
                      {application.profile?.email || application.profileId} · @{application.handle || application.profile?.handle || 'pending'}
                    </div>
                    <p className="text-[13px] text-[var(--ink-2)] mt-4 leading-relaxed max-w-[820px]">
                      {application.bio || 'No studio bio submitted.'}
                    </p>
                    {application.artistStatement && (
                      <div className="hair-all bg-[var(--bg)] p-4 mt-4 max-w-[820px]">
                        <div className="label mb-2">Artist statement</div>
                        <p className="text-[12px] text-[var(--ink-2)] leading-relaxed">
                          {application.artistStatement}
                        </p>
                      </div>
                    )}
                    {application.processNotes && (
                      <div className="hair-all bg-[var(--bg)] p-4 mt-4 max-w-[820px]">
                        <div className="label mb-2">Process proof</div>
                        <p className="text-[12px] text-[var(--muted)] leading-relaxed">
                          {application.processNotes}
                        </p>
                      </div>
                    )}
                    {(application.portfolioUrl || application.profileLinks?.length > 0) && (
                      <div className="flex flex-wrap gap-2 mt-4">
                        {application.portfolioUrl && (
                          <a href={application.portfolioUrl} target="_blank" rel="noreferrer" className="swiss-btn ghost inline-flex">
                            Portfolio <ExternalLink size={12}/>
                          </a>
                        )}
                        {(application.profileLinks || []).map((link, linkIndex) => (
                          <a key={`${link.url}-${linkIndex}`} href={link.url} target="_blank" rel="noreferrer" className="swiss-btn ghost inline-flex">
                            {link.label || 'Profile'} <ExternalLink size={12}/>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="xl:w-[360px] shrink-0">
                    <label htmlFor={`seller-review-note-${application.id}`} className="label mb-2 block">Review note</label>
                    <textarea
                      id={`seller-review-note-${application.id}`}
                      value={reviewNotes[application.id] ?? application.reviewNote ?? ''}
                      onChange={event => setReviewNotes(prev => ({ ...prev, [application.id]: event.target.value }))}
                      className="swiss-input min-h-[120px]"
                      maxLength={900}
                      placeholder="Why approved, or what proof is missing"
                    />
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => reviewApplication(application, 'approved')} className="swiss-btn flex-1 justify-center">
                        <Check size={12}/> Approve
                      </button>
                      <button onClick={() => reviewApplication(application, 'rejected')} className="swiss-btn ghost flex-1 justify-center">
                        <X size={12}/> Reject
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
                  {(application.sampleWorks.length ? application.sampleWorks : [{ title: 'No sample works attached', notes: 'Use the portfolio link for review.' }]).map((sample, index) => (
                    <div key={index} className="hair-all bg-[var(--bg)] overflow-hidden">
                      {sample.imageUrl && (
                        <div className="aspect-[4/3] bg-[var(--bg-2)]">
                          <img src={sample.imageUrl} alt={sample.title || `Sample ${index + 1}`} className="w-full h-full object-cover"/>
                        </div>
                      )}
                      <div className="p-4">
                        <div className="label">Sample {String(index + 1).padStart(2, '0')}</div>
                        <div className="text-[14px] font-medium mt-2">{sample.title || 'Untitled sample'}</div>
                        <p className="text-[12px] text-[var(--muted)] mt-2 leading-relaxed">{sample.notes || 'No process notes.'}</p>
                        {sample.storagePath && (
                          <div className="mono text-[9px] text-[var(--muted)] mt-3 break-all">
                            Private upload: {sample.storagePath}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {admin.sellerApplications.length === 0 && !admin.loading && (
              <div className="hair-all bg-[var(--card)] p-10 text-center">
                <div className="display text-[24px]">No seller applications.</div>
                <p className="text-[14px] text-[var(--muted)] mt-2">Submitted onboarding packets will appear here.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'users' && (
        <div>
          <div className="hair-b pb-3 mb-4 flex justify-between items-baseline">
            <h3 className="display text-[24px]">KYC queue</h3>
            <span className="mono text-[11px] text-[var(--muted)]">
              {admin.kyc.filter(u => !u.verified).length} unverified
            </span>
          </div>
          {admin.error && (
            <div className="hair-all bg-[var(--accent-soft)] text-[var(--accent)] p-4 text-[13px] mb-4">{admin.error}</div>
          )}
          <div className="grid grid-cols-12 gap-4 label hair-b pb-2">
            <div className="col-span-4">User</div>
            <div className="col-span-2">Role</div>
            <div className="col-span-2">Joined</div>
            <div className="col-span-2">KYC</div>
            <div className="col-span-2 text-right">Action</div>
          </div>
          {admin.kyc.map(u => (
            <div key={u.id} className="grid grid-cols-12 gap-4 py-3 hair-b items-center text-[13px] hover:bg-[var(--card)]">
              <div className="col-span-4">
                <div className="font-medium">{u.displayName || u.handle || u.email}</div>
                <div className="mono text-[10px] text-[var(--muted)]">{u.email}</div>
              </div>
              <div className="col-span-2 mono text-[11px] capitalize">{u.role}</div>
              <div className="col-span-2 mono text-[11px]">{relativeTime(u.createdAt)}</div>
              <div className="col-span-2">
                <span className={`mono text-[9px] uppercase tracking-[0.1em] px-1.5 py-0.5 ${u.verified ? 'bg-[var(--good)] text-white' : 'bg-[var(--accent)] text-white'}`}>
                  {u.verified ? 'VERIFIED' : 'PENDING'}
                </span>
              </div>
              <div className="col-span-2 text-right">
                {u.role === 'artist' ? (
                  <button
                    onClick={() => setTab('seller-review')}
                    disabled={!sellerApplicationByProfileId.has(u.id) || u.verified}
                    className={`swiss-btn ghost ${!sellerApplicationByProfileId.has(u.id) || u.verified ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {u.verified ? 'Seller approved' : sellerApplicationByProfileId.has(u.id) ? 'Review app' : 'Awaiting app'}
                  </button>
                ) : (
                  <button
                    onClick={() => admin.verifyProfile(u.id, !u.verified)}
                    className="swiss-btn ghost"
                  >
                    {u.verified ? 'Revoke' : 'Verify'}
                  </button>
                )}
              </div>
            </div>
          ))}
          {!admin.loading && admin.kyc.length === 0 && (
            <div className="hair-all bg-[var(--card)] p-10 text-center mt-4">
              <div className="display text-[24px]">No accounts to review.</div>
            </div>
          )}
        </div>
      )}

      {tab === 'cdisputes' && (
        <div className="space-y-4">
          <div className="hair-b pb-3 mb-2 flex justify-between items-baseline">
            <h3 className="display text-[24px]">Commission disputes</h3>
            <button onClick={admin.refresh} className="mono text-[11px] underline-hover">Refresh</button>
          </div>
          {admin.disputes.length === 0 && !admin.loading && (
            <div className="hair-all bg-[var(--card)] p-10 text-center">
              <Flag size={22} className="mx-auto text-[var(--muted)]"/>
              <div className="display text-[26px] mt-3">No open disputes.</div>
              <p className="text-[14px] text-[var(--muted)] mt-2">Disputed commissions appear here for resolution.</p>
            </div>
          )}
          {admin.disputes.map(d => (
            <div key={d.id} className="hair-all bg-[var(--card)] p-5">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <div className="mono text-[11px] text-[var(--muted)]">{d.id.slice(0, 8)} · {relativeTime(d.updatedAt)}</div>
                  <div className="display text-[22px] mt-1">{d.title}</div>
                  <div className="mono text-[11px] text-[var(--muted)] mt-1">with {d.artistHandle} · ${fmt(d.price)} in escrow</div>
                  {d.briefText && <p className="text-[13px] mt-3 text-[var(--ink-2)] leading-relaxed">{d.briefText}</p>}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => admin.decideDispute(d.id, 'resume')} className="swiss-btn ghost">Resume work</button>
                  <button onClick={() => admin.decideDispute(d.id, 'refund')} className="swiss-btn">Refund &amp; cancel</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'auctions' && (
        <div>
          <div className="grid grid-cols-12 gap-4 label hair-b pb-2">
            <div className="col-span-1">ID</div>
            <div className="col-span-4">Work</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2">Bid</div>
            <div className="col-span-2">Ends</div>
            <div className="col-span-1 text-right">Action</div>
          </div>
          {ARTWORKS.map((w) => {
            const settlement = settlementByArtworkId.get(w.id);
            const ended = w.endsAt <= 0;
            return (
              <div key={w.id} className="grid grid-cols-12 gap-4 py-3 hair-b items-center text-[13px]">
                <div className="col-span-1 mono text-[11px] text-[var(--muted)]">{w.id.toUpperCase()}</div>
                <div className="col-span-4 flex items-center gap-3">
                  <div className="w-9 h-9 hair-all"><ArtVisual visual={w.visual} imageUrl={w.imageUrl} alt={w.title}/></div>
                  <div>
                    <div>{w.title}</div>
                    <div className="mono text-[10px] text-[var(--muted)]">{artistById(w.artist).handle}</div>
                  </div>
                </div>
                <div className="col-span-2">
                  <span className={`mono text-[9px] uppercase tracking-[0.1em] px-1.5 py-0.5 ${settlement ? statusTone(settlement.status) : ended ? 'bg-[var(--accent)] text-white' : w.endsAt < 1000*60*60*2 ? 'bg-[var(--accent)] text-white' : 'bg-[var(--good)] text-white'}`}>
                    {settlement ? settlement.status.replace(/_/g, ' ') : ended ? 'ENDED' : w.endsAt < 1000*60*60*2 ? 'ENDING' : 'LIVE'}
                  </span>
                </div>
                <div className="col-span-2 mono">${fmt(w.currentBid)}</div>
                <div className="col-span-2 mono text-[11px]">{formatTime(w.endsAt)}</div>
                <div className="col-span-1 text-right flex gap-1 justify-end">
                  {ended && !settlement ? (
                    <button onClick={() => closeAuction(w.id)} className="swiss-btn ghost px-2 py-1">Close</button>
                  ) : settlement ? (
                    <button onClick={() => setTab('settlements')} className="mono text-[10px] underline-hover">Invoice</button>
                  ) : (
                    <button onClick={() => goToArtist(w.artist)} className="hair-all w-6 h-6 inline-flex items-center justify-center hover:bg-[var(--ink)] hover:text-[var(--bg)]" aria-label={`Open ${artistById(w.artist).name}`}><Flag size={11}/></button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'settlements' && (
        <div>
          <div className="hair-b pb-3 mb-4 flex justify-between items-baseline">
            <h3 className="display text-[24px]">Auction invoices</h3>
            <button onClick={admin.refresh} className="mono text-[11px] underline-hover">Refresh</button>
          </div>
          <div className="grid grid-cols-12 gap-4 label hair-b pb-2">
            <div className="col-span-2">Invoice</div>
            <div className="col-span-3">Work</div>
            <div className="col-span-2">Buyer</div>
            <div className="col-span-1">Status</div>
            <div className="col-span-2 text-right">Total due</div>
            <div className="col-span-2 text-right">Action</div>
          </div>
          {admin.auctionSettlements.map((settlement) => {
            const work = artworkById(settlement.artworkId);
            const knownWork = work.title !== 'Unknown';
            return (
              <div key={settlement.id} className="grid grid-cols-12 gap-4 py-3 hair-b items-center text-[13px]">
                <div className="col-span-2">
                  <div className="mono text-[11px]">{settlement.invoiceReference}</div>
                  <div className="mono text-[10px] text-[var(--muted)]">{dateLabel(settlement.closedAt)}</div>
                </div>
                <div className="col-span-3 min-w-0">
                  <button
                    disabled={!knownWork}
                    onClick={() => knownWork && goToArtwork?.(work.id)}
                    className={`text-left min-w-0 ${knownWork ? 'underline-hover' : 'text-[var(--muted)]'}`}
                  >
                    <div className="truncate">{knownWork ? work.title : settlement.artworkId}</div>
                    <div className="mono text-[10px] text-[var(--muted)]">{knownWork ? artistById(work.artist).handle : 'archived listing'}</div>
                  </button>
                </div>
                <div className="col-span-2 mono text-[10px] text-[var(--muted)]">
                  {settlement.winnerId ? settlement.winnerId.slice(0, 8) : 'no winner'}
                </div>
                <div className="col-span-1">
                  <span className={`mono text-[9px] uppercase tracking-[0.1em] px-1.5 py-0.5 ${statusTone(settlement.status)}`}>
                    {settlement.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="col-span-2 text-right mono">
                  ${fmt(settlement.totalDue)}
                  <div className="mono text-[10px] text-[var(--muted)]">due {dateLabel(settlement.dueAt)}</div>
                </div>
                <div className="col-span-2 text-right">
                  {settlement.status === 'invoice_pending' ? (
                    <button onClick={() => markSettlementPaid(settlement.id)} className="swiss-btn ghost">Mark paid</button>
                  ) : settlement.status === 'paid' ? (
                    <span className="mono text-[10px] text-[var(--muted)]">Paid {dateLabel(settlement.paidAt)}</span>
                  ) : (
                    <span className="mono text-[10px] text-[var(--muted)]">No action</span>
                  )}
                </div>
              </div>
            );
          })}
          {admin.auctionSettlements.length === 0 && !admin.loading && (
            <div className="hair-all bg-[var(--card)] p-10 text-center mt-4">
              <div className="display text-[24px]">No auction settlements yet.</div>
              <p className="text-[14px] text-[var(--muted)] mt-2">Close an ended auction to create an invoice or no-bid settlement.</p>
            </div>
          )}
        </div>
      )}

      {tab === 'social' && (
        <div className="space-y-6">
          <div className="hair-b pb-3 flex flex-col lg:flex-row lg:items-end justify-between gap-3">
            <div>
              <h3 className="display text-[24px]">Social moderation</h3>
              <p className="text-[12px] text-[var(--muted)] mt-1">
                Feed posts, comments, follows, likes, and saves stay with buyer/seller accounts. Admins review reports and enforce policy from here.
              </p>
            </div>
            <button onClick={trustState?.refreshReports} className="mono text-[11px] underline-hover">Refresh reports</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              {l:'Open social', v:fmt(openSocialReports.length), d:'Needs action'},
              {l:'Feed posts', v:fmt(socialReports.filter(report => report.targetType === 'feed_post').length), d:'Reported posts'},
              {l:'Studios', v:fmt(socialReports.filter(report => report.targetType === 'artist').length), d:'Reported studios'},
              {l:'Users', v:fmt(socialReports.filter(report => report.targetType === 'user').length), d:'Reported accounts'},
            ].map(item => (
              <div key={item.l} className="hair-all bg-[var(--card)] p-4">
                <div className="label">{item.l}</div>
                <div className="mono text-[26px] mt-2 leading-none">{item.v}</div>
                <div className="text-[12px] text-[var(--muted)] mt-2">{item.d}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            <div className="xl:col-span-8 space-y-3">
              {trustState?.loading && (
                <div className="hair-all bg-[var(--card)] p-8 text-center">
                  <div className="display text-[24px]">Loading social reports.</div>
                </div>
              )}
              {!trustState?.loading && socialReports.length === 0 && (
                <div className="hair-all bg-[var(--card)] p-10 text-center">
                  <MessageCircle size={22} className="mx-auto text-[var(--muted)]"/>
                  <div className="display text-[28px] mt-3">No social reports.</div>
                  <p className="text-[14px] text-[var(--muted)] mt-2">
                    Feed, studio, and user reports will appear here for admin review.
                  </p>
                </div>
              )}
              {socialReports.map(report => (
                <div key={report.id} className="hair-all bg-[var(--card)] p-5">
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    <div className="flex gap-4 items-start min-w-0">
                      <span className={`mono text-[10px] uppercase tracking-[0.12em] px-2 py-1 ${report.priority === 'high' ? 'bg-[var(--accent)] text-white' : report.priority === 'normal' ? 'bg-[#D2BE76] text-[var(--ink)]' : 'hair-all'}`}>
                        {report.priority}
                      </span>
                      <div className="min-w-0">
                        <div className="mono text-[11px] text-[var(--muted)]">{report.id.slice(0, 8)} - {reportAge(report.createdAt)}</div>
                        <div className="display text-[22px] mt-1 capitalize">{report.reason.replace(/_/g, ' ')}</div>
                        <div className="mono text-[11px] mt-2 text-[var(--muted)] truncate">
                          {report.targetType} - {reportTargetName(report)} - {report.status}
                        </div>
                        {report.details && <p className="text-[13px] mt-3 text-[var(--ink-2)] leading-relaxed">{report.details}</p>}
                        {report.resolutionNote && (
                          <p className="text-[12px] mt-3 text-[var(--muted)] leading-relaxed">Resolution: {report.resolutionNote}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 shrink-0">
                      {report.targetType === 'feed_post' && (
                        <button onClick={goToFeed} className="swiss-btn ghost">Open feed</button>
                      )}
                      {report.targetType === 'artist' && (
                        <button onClick={() => goToArtist?.(report.targetId)} className="swiss-btn ghost">Open studio</button>
                      )}
                      {report.status !== 'reviewing' && (
                        <button onClick={() => changeReportStatus(report.id, 'reviewing')} className="swiss-btn ghost">Review</button>
                      )}
                      {report.status !== 'resolved' && (
                        <button onClick={() => changeReportStatus(report.id, 'resolved', 'Resolved by social moderation review.')} className="swiss-btn">Resolve</button>
                      )}
                      {report.status !== 'dismissed' && (
                        <button onClick={() => changeReportStatus(report.id, 'dismissed', 'Dismissed by social moderation review.')} className="swiss-btn ghost">Dismiss</button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="xl:col-span-4 space-y-4">
              <div className="hair-all bg-[var(--ink)] text-[var(--bg)] p-5">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={15}/>
                  <div className="label" style={{color:'#9C988A'}}>Admin perspective</div>
                </div>
                <div className="display text-[28px] mt-3 leading-tight">Observe, verify, enforce.</div>
                <p className="text-[13px] mt-3 leading-relaxed" style={{color:'#DCD7C8'}}>
                  Admin accounts do not build a following graph or cast community reactions. Reports create the trail, admin notes close the loop.
                </p>
              </div>
              <div className="hair-all bg-[var(--card)] p-5">
                <div className="label mb-3">User perspective</div>
                <div className="space-y-3 text-[13px] text-[var(--muted)] leading-relaxed">
                  <p>Buyers and sellers can follow studios, comment on listings, like feed posts, save posts, and submit reports.</p>
                  <p>Sellers can publish feed posts only from verified studios; buyers cannot publish studio feed content.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'disputes' && (
        <div className="space-y-4">
          {trustState?.loading && (
            <div className="hair-all bg-[var(--card)] p-8 text-center">
              <div className="display text-[24px]">Loading reports.</div>
            </div>
          )}
          {(trustState?.error || actionError) && (
            <div className="hair-all bg-[var(--accent-soft)] text-[var(--accent)] p-5 text-[13px]">
              {actionError || trustState?.error}
            </div>
          )}
          {!trustState?.loading && reports.length === 0 && (
            <div className="hair-all bg-[var(--card)] p-10 text-center">
              <Flag size={22} className="mx-auto text-[var(--muted)]"/>
              <div className="display text-[28px] mt-3">No reports in queue.</div>
              <p className="text-[14px] text-[var(--muted)] mt-2">
                Submitted trust reports will appear here after the reports migration is active.
              </p>
            </div>
          )}
          {reports.map(report => (
            <div key={report.id} className="hair-all bg-[var(--card)] p-5">
              <div className="admin-report-row flex justify-between items-start gap-4">
                <div className="flex gap-4 items-start">
                  <span className={`mono text-[10px] uppercase tracking-[0.12em] px-2 py-1 ${report.priority === 'high' ? 'bg-[var(--accent)] text-white' : report.priority === 'normal' ? 'bg-[#D2BE76] text-[var(--ink)]' : 'hair-all'}`}>
                    {report.priority}
                  </span>
                  <div>
                    <div className="mono text-[11px] text-[var(--muted)]">{report.id.slice(0, 8)} - {reportAge(report.createdAt)}</div>
                    <div className="display text-[22px] mt-1 capitalize">{report.reason.replace(/_/g, ' ')}</div>
                    <div className="mono text-[11px] mt-2 text-[var(--muted)]">
                      {report.targetType} - {reportTargetName(report)} - {report.status}
                    </div>
                    {report.details && <p className="text-[13px] mt-3 text-[var(--ink-2)] leading-relaxed">{report.details}</p>}
                    {report.resolutionNote && (
                      <p className="text-[12px] mt-3 text-[var(--muted)] leading-relaxed">Resolution: {report.resolutionNote}</p>
                    )}
                  </div>
                </div>
                <div className="admin-report-actions flex gap-2">
                  {report.status !== 'reviewing' && (
                    <button onClick={() => changeReportStatus(report.id, 'reviewing')} className="swiss-btn ghost">Review</button>
                  )}
                  {report.status !== 'resolved' && (
                    <button onClick={() => changeReportStatus(report.id, 'resolved', 'Resolved by admin review.')} className="swiss-btn">Resolve</button>
                  )}
                  {report.status !== 'dismissed' && (
                    <button onClick={() => changeReportStatus(report.id, 'dismissed', 'Dismissed by admin review.')} className="swiss-btn ghost">Dismiss</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'moderation' && (
        <div className="space-y-8">
          <div className="hair-b pb-3 flex flex-col lg:flex-row lg:items-end justify-between gap-3">
            <div>
              <h3 className="display text-[24px]">Artwork / AI review desk</h3>
              <p className="text-[12px] text-[var(--muted)] mt-1">Community AI votes queue the case; admins inspect reports and artist proof before clearing, verifying, or taking down a listing.</p>
            </div>
            <div className="mono text-[11px] text-[var(--muted)]">
              {moderationQueue.length} queued - {admin.moderation.artworks.filter(w => w.takenDown).length} taken down
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              {l:'AI review cases', v:fmt(aiReviewItems.length), d:'Vote/proof signals'},
              {l:'Community votes', v:fmt(aiVoteTotal), d:'Across catalogue'},
              {l:'Pending proof', v:fmt(pendingProofReviews), d:'Needs admin decision'},
              {l:'Restricted', v:fmt(admin.moderation.artworks.filter(w => w.authenticityStatus === 'restricted').length), d:'Bidding paused'},
            ].map(item => (
              <div key={item.l} className="hair-all bg-[var(--card)] p-4">
                <div className="label">{item.l}</div>
                <div className="mono text-[26px] mt-2 leading-none">{item.v}</div>
                <div className="text-[12px] text-[var(--muted)] mt-2">{item.d}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
            <div className="xl:col-span-4">
              <div className="space-y-2 max-h-[720px] overflow-y-auto pr-1">
                {admin.moderation.artworks.map(w => (
                  <button
                    key={w.id}
                    onClick={() => setSelectedModerationId(w.id)}
                    className={`hair-all p-3 w-full text-left flex items-center gap-3 text-[13px] hover:bg-[var(--card)] ${selectedModerationArtwork?.id === w.id ? 'bg-[var(--card)]' : ''}`}
                  >
                    <div className="w-12 h-12 hair-all shrink-0 bg-[var(--bg-2)]">
                      <ArtVisual visual={w.visual} imageUrl={w.imageUrl} alt={w.title}/>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{w.title}</div>
                      <div className="mono text-[10px] text-[var(--muted)] truncate">
                        {w.artistHandle || artistById(w.artistId).handle} - ${fmt(w.currentBid)}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        <span className={`mono text-[8px] uppercase tracking-[0.1em] px-1.5 py-0.5 ${statusTone(w.reviewStatus)}`}>
                          {String(w.reviewStatus || 'clear').replace(/_/g, ' ')}
                        </span>
                        {w.openReports?.length > 0 && <span className="mono text-[8px] uppercase tracking-[0.1em] hair-all px-1.5 py-0.5">{w.openReports.length} reports</span>}
                        {Number(w.aiVoteCount || 0) > 0 && <span className="mono text-[8px] uppercase tracking-[0.1em] hair-all px-1.5 py-0.5">{w.aiVoteCount} AI votes</span>}
                        {w.pendingProofs?.length > 0 && <span className="mono text-[8px] uppercase tracking-[0.1em] hair-all px-1.5 py-0.5">{w.pendingProofs.length} proof</span>}
                      </div>
                    </div>
                    <Eye size={14} className="text-[var(--muted)] shrink-0"/>
                  </button>
                ))}
              </div>
            </div>

            <div className="xl:col-span-8">
              {selectedModerationArtwork ? (
                <div className="hair-all bg-[var(--card)]">
                  <div className="p-5 hair-b flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    <div>
                      <div className="label">Reviewing artwork</div>
                      <div className="display text-[30px] mt-2">{selectedModerationArtwork.title}</div>
                      <div className="mono text-[11px] text-[var(--muted)] mt-2">
                        {selectedModerationArtwork.artistName} - @{selectedModerationArtwork.artistHandle} - {selectedModerationArtwork.id}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <button onClick={() => goToArtwork?.(selectedModerationArtwork.id)} className="swiss-btn ghost">
                        Open listing <ExternalLink size={12}/>
                      </button>
                      <button onClick={() => goToArtist?.(selectedModerationArtwork.artistId)} className="swiss-btn ghost">
                        Studio <ExternalLink size={12}/>
                      </button>
                    </div>
                  </div>

                  <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-5">
                      <div className="hair-all bg-[var(--bg-2)]">
                        <ArtVisual visual={selectedModerationArtwork.visual} imageUrl={selectedModerationArtwork.imageUrl} alt={selectedModerationArtwork.title}/>
                      </div>
                      <div className="grid grid-cols-2 gap-3 mt-3">
                        {[
                          ['Bid', `$${fmt(selectedModerationArtwork.currentBid)}`],
                          ['Reports', String(selectedModerationArtwork.openReports?.length || 0)],
                          ['AI votes', String(selectedModerationArtwork.aiVoteCount || 0)],
                          ['Proofs', String(selectedModerationArtwork.proofs?.length || 0)],
                        ].map(([label, value]) => (
                          <div key={label} className="hair-all p-3">
                            <div className="label">{label}</div>
                            <div className="mono text-[18px] mt-1">{value}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="lg:col-span-7">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                        <div className="hair-all p-3">
                          <div className="label">Moderation status</div>
                          <span className={`inline-block mono text-[9px] uppercase tracking-[0.12em] px-2 py-1 mt-2 ${statusTone(selectedModerationArtwork.reviewStatus)}`}>
                            {String(selectedModerationArtwork.reviewStatus || 'clear').replace(/_/g, ' ')}
                          </span>
                        </div>
                        <div className="hair-all p-3">
                          <div className="label">Authenticity</div>
                          <span className={`inline-block mono text-[9px] uppercase tracking-[0.12em] px-2 py-1 mt-2 ${statusTone(selectedModerationArtwork.authenticityStatus)}`}>
                            {String(selectedModerationArtwork.authenticityStatus || 'clear').replace(/_/g, ' ')}
                          </span>
                        </div>
                      </div>

                      {selectedModerationArtwork.authenticityNote && (
                        <div className="hair-all p-3 text-[12px] text-[var(--muted)] leading-relaxed mb-5">
                          {selectedModerationArtwork.authenticityNote}
                        </div>
                      )}

                      <label htmlFor="artwork-moderation-note" className="label mb-2 block">Review note</label>
                      <textarea
                        id="artwork-moderation-note"
                        value={noteForArtwork(selectedModerationArtwork)}
                        onChange={event => setModerationNotes(prev => ({ ...prev, [selectedModerationArtwork.id]: event.target.value }))}
                        className="swiss-input min-h-[130px]"
                        maxLength={1200}
                        placeholder="Record evidence checked, policy reason, and final decision."
                      />

                      <div className="flex flex-wrap gap-2 mt-4">
                        <button onClick={() => saveArtworkDecision(selectedModerationArtwork, 'reviewing', selectedModerationArtwork.takenDown)} className="swiss-btn ghost">
                          Mark reviewing
                        </button>
                        <button onClick={() => saveArtworkDecision(selectedModerationArtwork, 'cleared', false)} className="swiss-btn ghost">
                          <Check size={12}/> Clear / reinstate
                        </button>
                        <button onClick={() => saveArtworkDecision(selectedModerationArtwork, 'taken_down', true)} className="swiss-btn">
                          <X size={12}/> Take down
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 hair-t grid grid-cols-1 xl:grid-cols-3 gap-5">
                    <div>
                      <div className="hair-b pb-2 mb-3 flex justify-between items-baseline">
                        <div className="label">Reports</div>
                        <span className="mono text-[10px] text-[var(--muted)]">{selectedModerationArtwork.reports?.length || 0}</span>
                      </div>
                      <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                        {(selectedModerationArtwork.reports?.length ? selectedModerationArtwork.reports : [{ id: 'empty', reason: 'none', status: 'clear', details: 'No user reports for this listing.' }]).map(report => (
                          <div key={report.id} className="hair-all p-3 bg-[var(--bg)] text-[12px]">
                            <div className="flex justify-between gap-2">
                              <span className="font-medium capitalize">{String(report.reason).replace(/_/g, ' ')}</span>
                              <span className={`mono text-[8px] uppercase px-1.5 py-0.5 ${statusTone(report.status)}`}>{report.status}</span>
                            </div>
                            <p className="text-[var(--muted)] mt-2 leading-relaxed">{report.details || report.resolutionNote || 'No details.'}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="hair-b pb-2 mb-3 flex justify-between items-baseline">
                        <div className="label">AI votes</div>
                        <span className="mono text-[10px] text-[var(--muted)]">{selectedModerationArtwork.votes?.length || 0}</span>
                      </div>
                      <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                        {(selectedModerationArtwork.votes?.length ? selectedModerationArtwork.votes.slice(0, 8) : [{ id: 'empty', reason: 'none', note: 'No community AI votes.' }]).map(vote => (
                          <div key={vote.id} className="hair-all p-3 bg-[var(--bg)] text-[12px]">
                            <div className="font-medium capitalize">{String(vote.reason).replace(/_/g, ' ')}</div>
                            <p className="text-[var(--muted)] mt-2 leading-relaxed">{vote.note || 'No note.'}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="hair-b pb-2 mb-3 flex justify-between items-baseline">
                        <div className="label">Artist proof</div>
                        <span className="mono text-[10px] text-[var(--muted)]">{selectedModerationArtwork.proofs?.length || 0}</span>
                      </div>
                      <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                        {(selectedModerationArtwork.proofs?.length ? selectedModerationArtwork.proofs : [{ id: 'empty', status: 'none', notes: 'No process proof submitted.' }]).map(proof => (
                          <div key={proof.id} className="hair-all p-3 bg-[var(--bg)] text-[12px]">
                            <div className="flex justify-between gap-2">
                              <span className={`mono text-[8px] uppercase px-1.5 py-0.5 ${statusTone(proof.status)}`}>{proof.status}</span>
                              {proof.createdAt && <span className="mono text-[9px] text-[var(--muted)]">{relativeTime(proof.createdAt)}</span>}
                            </div>
                            <p className="text-[var(--muted)] mt-2 leading-relaxed">{proof.notes}</p>
                            {proof.proofUrl && <a href={proof.proofUrl} target="_blank" rel="noreferrer" className="mono text-[10px] text-[var(--accent)] underline-hover mt-2 inline-block">Open proof</a>}
                            {proof.status === 'pending' && (
                              <div className="flex gap-2 mt-3">
                                <button onClick={() => saveProofDecision(proof.id, 'accepted')} className="swiss-btn ghost flex-1 justify-center">Accept</button>
                                <button onClick={() => saveProofDecision(proof.id, 'rejected')} className="swiss-btn ghost flex-1 justify-center">Reject</button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="hair-all bg-[var(--card)] p-10 text-center">
                  <div className="display text-[24px]">No artwork selected.</div>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <div className="hair-b pb-3 mb-4 flex justify-between items-baseline">
              <h3 className="display text-[24px]">Artworks</h3>
              <span className="mono text-[11px] text-[var(--muted)]">
                {admin.moderation.artworks.filter(w => w.takenDown).length} taken down
              </span>
            </div>
            <div className="space-y-2 max-h-[620px] overflow-y-auto pr-1">
              {admin.moderation.artworks.map(w => (
                <div key={w.id} className="hair-all p-3 flex items-center justify-between gap-3 text-[13px]">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{w.title}</div>
                    <div className="mono text-[10px] text-[var(--muted)]">{artistById(w.artistId).handle} · ${fmt(w.currentBid)}</div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {w.takenDown && <span className="mono text-[9px] uppercase tracking-[0.1em] bg-[var(--accent)] text-white px-1.5 py-0.5">DOWN</span>}
                    <button
                      onClick={() => admin.toggleArtworkTakedown(w.id, !w.takenDown).catch(err => setActionError(err.message))}
                      className="swiss-btn ghost"
                    >
                      {w.takenDown ? 'Reinstate' : 'Take down'}
                    </button>
                  </div>
                </div>
              ))}
              {admin.moderation.artworks.length === 0 && !admin.loading && (
                <div className="hair-all bg-[var(--card)] p-8 text-center">
                  <div className="display text-[20px]">No artworks.</div>
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="hair-b pb-3 mb-4 flex justify-between items-baseline">
              <h3 className="display text-[24px]">Studios</h3>
              <span className="mono text-[11px] text-[var(--muted)]">
                {admin.moderation.artists.filter(a => a.suspended).length} suspended
              </span>
            </div>
            <div className="space-y-2 max-h-[620px] overflow-y-auto pr-1">
              {admin.moderation.artists.map(a => (
                <div key={a.id} className="hair-all p-3 flex items-center justify-between gap-3 text-[13px]">
                  <button onClick={() => goToArtist(a.id)} className="min-w-0 text-left">
                    <div className="font-medium truncate">{a.name}</div>
                    <div className="mono text-[10px] text-[var(--muted)]">{a.handle}</div>
                  </button>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {a.suspended && <span className="mono text-[9px] uppercase tracking-[0.1em] bg-[var(--accent)] text-white px-1.5 py-0.5">SUSPENDED</span>}
                    <button
                      onClick={() => admin.toggleArtistSuspended(a.id, !a.suspended).catch(err => setActionError(err.message))}
                      className="swiss-btn ghost"
                    >
                      {a.suspended ? 'Reinstate' : 'Suspend'}
                    </button>
                  </div>
                </div>
              ))}
              {admin.moderation.artists.length === 0 && !admin.loading && (
                <div className="hair-all bg-[var(--card)] p-8 text-center">
                  <div className="display text-[20px]">No studios.</div>
                </div>
              )}
            </div>
          </div>
        </div>
        </div>
      )}

      {tab === 'delivery' && (
        <div>
          <div className="hair-b pb-3 mb-4 flex justify-between items-baseline">
            <div>
              <h3 className="display text-[24px]">Delivery outbox</h3>
              <p className="text-[12px] text-[var(--muted)] mt-1">Queued email and webhook work. A worker still needs to consume pending rows.</p>
            </div>
            <button onClick={admin.refresh} className="mono text-[11px] underline-hover">Refresh</button>
          </div>
          <div className="grid grid-cols-12 gap-4 label hair-b pb-2">
            <div className="col-span-2">Event</div>
            <div className="col-span-1">Channel</div>
            <div className="col-span-3">Recipient</div>
            <div className="col-span-1">Status</div>
            <div className="col-span-1">Attempts</div>
            <div className="col-span-2">Created</div>
            <div className="col-span-2 text-right">Action</div>
          </div>
          {admin.deliveryOutbox.map((row) => (
            <div key={row.id} className="grid grid-cols-12 gap-4 py-3 hair-b items-center text-[13px]">
              <div className="col-span-2 min-w-0">
                <div className="font-medium truncate">{row.eventType}</div>
                {row.lastError && <div className="mono text-[10px] text-[var(--accent)] truncate">{row.lastError}</div>}
              </div>
              <div className="col-span-1 mono text-[10px] uppercase">{row.channel}</div>
              <div className="col-span-3 min-w-0">
                <div className="truncate">{row.recipientEmail || row.webhookUrl || 'No destination'}</div>
                <div className="mono text-[10px] text-[var(--muted)] truncate">{row.dedupeKey || row.id}</div>
              </div>
              <div className="col-span-1">
                <span className={`mono text-[9px] uppercase tracking-[0.1em] px-1.5 py-0.5 ${statusTone(row.status)}`}>
                  {row.status}
                </span>
              </div>
              <div className="col-span-1 mono">{row.attempts}</div>
              <div className="col-span-2 mono text-[10px] text-[var(--muted)]">{relativeTime(row.createdAt)}</div>
              <div className="col-span-2 flex justify-end gap-2">
                {(row.status === 'pending' || row.status === 'failed' || row.status === 'sending') ? (
                  <>
                    <button onClick={() => changeDeliveryStatus(row.id, 'sent')} className="swiss-btn ghost">Sent</button>
                    <button onClick={() => changeDeliveryStatus(row.id, 'cancelled')} className="swiss-btn ghost">Cancel</button>
                  </>
                ) : (
                  <span className="mono text-[10px] text-[var(--muted)]">{row.sentAt ? `Sent ${dateLabel(row.sentAt)}` : 'Closed'}</span>
                )}
              </div>
            </div>
          ))}
          {admin.deliveryOutbox.length === 0 && !admin.loading && (
            <div className="hair-all bg-[var(--card)] p-10 text-center mt-4">
              <div className="display text-[24px]">No delivery jobs yet.</div>
              <p className="text-[14px] text-[var(--muted)] mt-2">Notifications and drop alerts will enqueue email/webhook jobs here.</p>
            </div>
          )}
        </div>
      )}

      {tab === 'finance' && (
        <div>
          <div className="hair-b pb-3 mb-4 flex justify-between items-baseline">
            <h3 className="display text-[24px]">Artist payouts</h3>
            <span className="mono text-[11px] text-[var(--muted)]">
              From delivered &amp; accepted commissions (15% platform fee)
            </span>
          </div>
          <div className="grid grid-cols-12 gap-4 label hair-b pb-2">
            <div className="col-span-4">Artist</div>
            <div className="col-span-2">Jobs</div>
            <div className="col-span-3 text-right">Gross</div>
            <div className="col-span-3 text-right">Net payout</div>
          </div>
          {admin.payouts.map(p => (
            <div key={p.artistId} className="grid grid-cols-12 gap-4 py-3 hair-b items-center text-[13px]">
              <div className="col-span-4">
                <div className="font-medium">{p.name}</div>
                <div className="mono text-[10px] text-[var(--muted)]">{p.handle}</div>
              </div>
              <div className="col-span-2 mono">{p.jobs}</div>
              <div className="col-span-3 text-right mono">${fmt(p.gross)}</div>
              <div className="col-span-3 text-right mono font-medium">${fmt(Math.round(p.net))}</div>
            </div>
          ))}
          {admin.payouts.length === 0 && !admin.loading && (
            <div className="hair-all bg-[var(--card)] p-10 text-center mt-4">
              <div className="display text-[24px]">No payouts due.</div>
              <p className="text-[14px] text-[var(--muted)] mt-2">Payouts accrue once commissions reach Delivered or Accepted.</p>
            </div>
          )}
        </div>
      )}

      {tab === 'audit' && (
        <div>
          <div className="hair-b pb-3 mb-4 flex justify-between items-baseline">
            <h3 className="display text-[24px]">Audit log</h3>
            <button onClick={admin.refresh} className="mono text-[11px] underline-hover">Refresh</button>
          </div>
          <div className="grid grid-cols-12 gap-4 label hair-b pb-2">
            <div className="col-span-2">When</div>
            <div className="col-span-3">Action</div>
            <div className="col-span-3">Target</div>
            <div className="col-span-4">Detail</div>
          </div>
          {admin.audit.map(row => (
            <div key={row.id} className="grid grid-cols-12 gap-4 py-2.5 hair-b items-center mono text-[11px]">
              <div className="col-span-2 text-[var(--muted)]">{relativeTime(row.createdAt)}</div>
              <div className="col-span-3 text-[var(--accent)]">{row.action}</div>
              <div className="col-span-3">{row.targetType}:{String(row.targetId || '').slice(0, 8)}</div>
              <div className="col-span-4 text-[var(--muted)]">{row.detail}</div>
            </div>
          ))}
          {admin.audit.length === 0 && !admin.loading && (
            <div className="hair-all bg-[var(--card)] p-10 text-center mt-4">
              <div className="display text-[24px]">No audit events yet.</div>
              <p className="text-[14px] text-[var(--muted)] mt-2">Report, dispute, and KYC actions are logged here.</p>
            </div>
          )}
        </div>
      )}
    </main>
  );
};
