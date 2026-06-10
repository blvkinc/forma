// ============================================================
// FORMA — Artwork detail / auction view
// ============================================================
import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, ArrowRight, ArrowUpRight, Heart, Share2, Bookmark,
  Flag, AlertCircle, Gavel, Send, Trash2, ShieldCheck,
} from 'lucide-react';
import { ArtCard, ArtVisual } from '../components/shared';
import { fmt, formatTime, relativeTime, authenticityMeta, isBuyerRole, isSellerRole, isAdminRole } from '../lib/ui';
import { ARTWORKS, artworkById, artistById } from '../lib/catalogue';
import {
  minimumBidIncrement, minimumNextBid, auctionBuyerPremium,
  auctionTotalCost, auctionUrgency, shouldExtendAuction,
} from '../lib/domain';
import { fetchArtworkAuthenticity, fetchArtworkAuthenticitySeal, removeAiVote, submitAiVote, submitArtworkProof } from '../lib/authenticity';
import { supabase } from '../lib/supabase';
import { fetchArtworkComments, addArtworkComment, deleteArtworkComment } from '../lib/social';

export const ArtworkView = ({ workId, goToArtwork, goToArtist, likes, toggleLike, watchlist = {}, toggleWatch, bids, placeBid, purchases = [], recordPurchase, loadBidsForArtwork, onReport, user, role, refreshCatalogue, onOpenAdminModeration }) => {
  const work = artworkById(workId);
  const artist = artistById(work.artist);
  const [bidInput, setBidInput] = useState(minimumNextBid(work.currentBid));
  const [tab, setTab] = useState('bids');
  const [timeLeft, setTimeLeft] = useState(work.endsAt);
  const [placingBid, setPlacingBid] = useState(false);
  const [bidNotice, setBidNotice] = useState('');
  const [authState, setAuthState] = useState({ votes: [], proofs: [], ownVote: null });
  const [authNotice, setAuthNotice] = useState('');
  const [authSaving, setAuthSaving] = useState(false);
  const [voteReason, setVoteReason] = useState('suspected_ai');
  const [voteNote, setVoteNote] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [proofNotes, setProofNotes] = useState('');
  const [authSeal, setAuthSeal] = useState(null);
  const [comments, setComments] = useState([]);
  const [linkCopied, setLinkCopied] = useState(false);
  const [commentDraft, setCommentDraft] = useState('');
  const [commentSending, setCommentSending] = useState(false);
  const [commentError, setCommentError] = useState('');
  const authenticity = authenticityMeta(work.authenticityStatus);
  const isRestricted = work.authenticityStatus === 'restricted';
  const isArtistOwner = artist.profileId === user?.id;
  const isAdmin = isAdminRole(role);
  const hasPurchased = (purchases || []).some(purchase => purchase.artworkId === work.id);
  const canVoteAi = (isBuyerRole(role) || isSellerRole(role)) && !isArtistOwner;
  const canSubmitProof = isSellerRole(role) && isArtistOwner;
  const canComment = !isAdmin;
  useEffect(() => {
    const i = setInterval(() => setTimeLeft(t => Math.max(0, t - 1000)), 1000);
    return () => clearInterval(i);
  }, []);
  useEffect(() => {
    loadBidsForArtwork?.(work.id);
  }, [loadBidsForArtwork, work.id]);
  // Realtime bid stream: re-pull bids + catalogue when anyone bids
  // on this artwork (also reflects anti-snipe ends_at extensions).
  useEffect(() => {
    const channel = supabase
      .channel(`bids:${work.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'bids', filter: `artwork_id=eq.${work.id}` },
        () => {
          loadBidsForArtwork?.(work.id);
          refreshCatalogue?.();
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [work.id, loadBidsForArtwork, refreshCatalogue]);
  const refreshAuthenticity = async () => {
    try {
      const state = await fetchArtworkAuthenticity(work.id);
      setAuthState(state);
    } catch (err) {
      setAuthNotice(err.message || 'Authenticity state could not load.');
    }
  };
  useEffect(() => {
    setAuthNotice('');
    refreshAuthenticity();
  }, [work.id]);
  useEffect(() => {
    let cancelled = false;
    setAuthSeal(null);
    // RLS returns the seal only for the owning artist or the buyer.
    fetchArtworkAuthenticitySeal(work.id)
      .then(seal => { if (!cancelled) setAuthSeal(seal); })
      .catch(() => { if (!cancelled) setAuthSeal(null); });
    return () => { cancelled = true; };
  }, [work.id, hasPurchased, isArtistOwner]);
  useEffect(() => {
    let cancelled = false;
    setComments([]);
    setCommentError('');
    fetchArtworkComments(work.id)
      .then(rows => { if (!cancelled) setComments(rows); })
      .catch(err => { if (!cancelled) setCommentError(err.message || 'Could not load comments.'); });
    return () => { cancelled = true; };
  }, [work.id]);
  const submitComment = async (event) => {
    event.preventDefault();
    if (!canComment) { setCommentError('Admin accounts can review comments but cannot participate socially.'); return; }
    if (!user?.id) { setCommentError('Sign in to comment.'); return; }
    const body = commentDraft.trim();
    if (!body) return;
    setCommentSending(true);
    setCommentError('');
    const result = await addArtworkComment(user.id, work.id, body);
    setCommentSending(false);
    if (result?.error) { setCommentError(result.error); return; }
    setComments(prev => [...prev, result.data]);
    setCommentDraft('');
  };
  const removeComment = async (commentId) => {
    const previous = comments;
    setComments(prev => prev.filter(comment => comment.id !== commentId));
    const result = await deleteArtworkComment(commentId);
    if (result?.error) {
      setComments(previous);
      setCommentError(result.error);
    }
  };
  useEffect(() => {
    setTimeLeft(work.endsAt);
  }, [work.id, work.endsAt]);
  const localBids = bids[work.id] || [];
  const currentTopBid = Math.max(Number(work.currentBid || 0), Number(localBids[0]?.amount || 0));
  const minNextBid = minimumNextBid(currentTopBid);
  const bidCount = Math.max(Number(work.bids || 0), localBids.length);
  useEffect(() => {
    setBidInput(minimumNextBid(currentTopBid));
    setBidNotice('');
  }, [work.id, currentTopBid]);
  const submitBid = async () => {
    setBidNotice('');
    if (isAdmin) {
      setBidNotice('Admin accounts cannot bid. Use the admin review and settlement tools instead.');
      return;
    }
    if (isRestricted) {
      setBidNotice('Bidding is paused until the artist submits process proof.');
      return;
    }
    setPlacingBid(true);
    const result = await placeBid(work.id, bidInput);
    setPlacingBid(false);
    if (result?.error) {
      setBidNotice(result.error);
      return;
    }
    setBidNotice('Bid placed and synced to the auction ledger.');
    setBidInput(minimumNextBid(Number(result?.artwork?.currentBid || bidInput)));
  };
  const submitAuthenticityVote = async () => {
    if (!canVoteAi) return;
    setAuthSaving(true);
    setAuthNotice('');
    try {
      await submitAiVote(work.id, voteReason, voteNote);
      await refreshCatalogue?.();
      await refreshAuthenticity();
      setAuthNotice('AI review vote recorded.');
    } catch (err) {
      setAuthNotice(err.message || 'AI review vote failed.');
    } finally {
      setAuthSaving(false);
    }
  };
  const clearAuthenticityVote = async () => {
    setAuthSaving(true);
    setAuthNotice('');
    try {
      await removeAiVote(work.id);
      await refreshCatalogue?.();
      await refreshAuthenticity();
      setAuthNotice('Your AI review vote was removed.');
    } catch (err) {
      setAuthNotice(err.message || 'Vote removal failed.');
    } finally {
      setAuthSaving(false);
    }
  };
  const shareArtwork = async () => {
    const url = `${window.location.origin}${window.location.pathname}#artwork/${work.id}`;
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2200);
    } catch {
      window.prompt('Copy this artwork link:', url);
    }
  };
  const submitProof = async () => {
    if (!canSubmitProof) return;
    setAuthSaving(true);
    setAuthNotice('');
    try {
      await submitArtworkProof(work, proofUrl, proofNotes);
      setProofUrl('');
      setProofNotes('');
      await refreshCatalogue?.();
      await refreshAuthenticity();
      setAuthNotice('Process proof submitted. Listing authenticity status updated.');
    } catch (err) {
      setAuthNotice(err.message || 'Process proof submission failed.');
    } finally {
      setAuthSaving(false);
    }
  };
  return (
    <main className="fade-in max-w-[1440px] mx-auto px-8 py-10">
      <div className="hair-b pb-4 mb-8 flex items-center justify-between">
        <button onClick={() => window.history.back()} className="mono text-[11px] uppercase tracking-[0.12em] flex items-center gap-2 underline-hover">
          <ArrowLeft size={12}/> Back to index
        </button>
        <div className="label">№ {work.id.toUpperCase()} — Live auction</div>
      </div>

      <div className="grid grid-cols-12 gap-10">
        {/* LEFT — visual */}
        <div className="col-span-7">
          <div className="hair-all sticky top-[88px]">
            <ArtVisual visual={work.visual} imageUrl={work.imageUrl} alt={work.title} watermark={`FORMA © ${artist.handle}`}/>
            <div className="hair-t p-4 flex justify-between items-center mono text-[11px]">
              <div className="flex gap-4">
                <span className="text-[var(--muted)]">{work.dim}</span>
                <span>·</span>
                <span className="text-[var(--muted)]">{work.format}</span>
              </div>
              <div className="flex gap-3 items-center">
                {linkCopied && <span className="text-[var(--good)] text-[10px] uppercase tracking-[0.1em]">Link copied</span>}
                {!isAdmin && (
                  <button onClick={() => toggleLike(work.id)} title={likes[work.id] ? 'Unlike' : 'Like'} aria-label={likes[work.id] ? `Unlike ${work.title}` : `Like ${work.title}`} className="hair-all w-7 h-7 flex items-center justify-center hover:bg-[var(--ink)] hover:text-[var(--bg)]"><Heart size={12} fill={likes[work.id] ? 'currentColor' : 'none'}/></button>
                )}
                <button onClick={shareArtwork} title="Copy artwork link" aria-label="Copy artwork link" className="hair-all w-7 h-7 flex items-center justify-center hover:bg-[var(--ink)] hover:text-[var(--bg)]"><Share2 size={12}/></button>
                {!isAdmin && toggleWatch && (
                  <button onClick={() => toggleWatch(work.id)} title={watchlist[work.id] ? 'Remove from watchlist' : 'Add to watchlist'} aria-label={watchlist[work.id] ? `Remove ${work.title} from watchlist` : `Add ${work.title} to watchlist`} className={`hair-all w-7 h-7 flex items-center justify-center ${watchlist[work.id] ? 'bg-[var(--ink)] text-[var(--bg)]' : 'hover:bg-[var(--ink)] hover:text-[var(--bg)]'}`}><Bookmark size={12} fill={watchlist[work.id] ? 'currentColor' : 'none'}/></button>
                )}
                {isAdmin ? (
                  <button onClick={() => onOpenAdminModeration?.(work.id)} className="hair-all w-7 h-7 flex items-center justify-center hover:bg-[var(--accent)] hover:text-white" aria-label="Open admin review"><ShieldCheck size={12}/></button>
                ) : (
                  <button onClick={() => onReport?.({ type: 'artwork', id: work.id, label: work.title })} title="Report artwork" className="hair-all w-7 h-7 flex items-center justify-center hover:bg-[var(--accent)] hover:text-white" aria-label="Report artwork"><Flag size={12}/></button>
                )}
              </div>
            </div>
            <div className="hair-t px-4 py-3 flex items-center justify-between gap-3 bg-[var(--card)]">
              <div className="mono text-[10px] text-[var(--muted)] uppercase tracking-[0.1em] flex items-center gap-2">
                <ShieldCheck size={11} className="flex-shrink-0"/>
                © {work.year} {artist.name}. All rights reserved — reproduction prohibited.
              </div>
              {!isAdmin && (
                <button
                  onClick={() => onReport?.({ type: 'artwork', id: work.id, label: work.title })}
                  className="mono text-[10px] uppercase tracking-[0.1em] underline-hover text-[var(--accent)] flex-shrink-0"
                >
                  Report stolen work
                </button>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT — info & bid */}
        <div className="col-span-5 space-y-8">
          <div>
            <div onClick={() => goToArtist(artist.id)} className="cursor-pointer inline-flex items-center gap-3 hair-all p-2 pr-4 hover:bg-[var(--card)]">
              <div className="w-8 h-8" style={{background:artist.accent}}/>
              <div>
                <div className="text-[12px] font-medium">{artist.name}{artist.verified && <span className="text-[var(--accent)] ml-1">●</span>}</div>
                <div className="mono text-[10px] text-[var(--muted)]">{artist.handle}</div>
              </div>
              <ArrowUpRight size={14} className="ml-2"/>
            </div>
            <h1 className="display text-[64px] leading-[0.9] mt-5 tracking-[-0.04em]">{work.title}</h1>
            <div className="mono text-[11px] mt-4 text-[var(--muted)] uppercase tracking-[0.1em]">
              {work.year} · Edition {work.edition} · {work.dim}
            </div>
          </div>

          {/* AUCTION PANEL */}
          <div className="hair-all bg-[var(--card)] p-6">
            <div className="flex justify-between items-baseline">
              <div className="label">Current top bid</div>
              <div className="label">{bidCount} bids placed</div>
            </div>
            <div className="display text-[64px] leading-none mt-2">${fmt(currentTopBid)}</div>
            {isRestricted && (
              <div className="mt-4 hair-all p-3 bg-[var(--accent-soft)] text-[var(--accent)] text-[12px] leading-relaxed">
                Bidding is paused by community AI review until process proof is submitted.
              </div>
            )}
            <div className="mt-4 hair-t pt-4 grid grid-cols-2 gap-4">
              <div>
                <div className="label">Ends in</div>
                <div className={`mono text-[24px] mt-1 ${auctionUrgency(timeLeft) === 'critical' || auctionUrgency(timeLeft) === 'urgent' ? 'text-[var(--accent)]' : ''}`}>{formatTime(timeLeft)}</div>
                {shouldExtendAuction(timeLeft) && (
                  <div className="mono text-[10px] text-[var(--accent)] mt-1 flex items-center gap-1">
                    <AlertCircle size={10}/> Anti-snipe active · bids extend +5m
                  </div>
                )}
              </div>
              <div>
                <div className="label">Min. next bid</div>
                <div className="mono text-[24px] mt-1">${fmt(minNextBid)}</div>
                <div className="mono text-[10px] text-[var(--muted)] mt-1">
                  Increment: ${fmt(minimumBidIncrement(currentTopBid))}
                </div>
              </div>
            </div>

            {isAdmin ? (
              <div className="mt-6 hair-t pt-6">
                <div className="label mb-3">Admin auction lens</div>
                <div className="hair-all p-4 bg-[var(--bg)]">
                  <div className="display text-[22px] leading-tight">Bidding and acquisition are disabled for admin accounts.</div>
                  <p className="text-[12px] text-[var(--muted)] mt-2 leading-relaxed">
                    Use Operations for auction close-out, settlement review, and moderation decisions. Community-facing account actions stay with buyer and seller roles.
                  </p>
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <div className="hair-all p-3">
                      <div className="label">Min next bid</div>
                      <div className="mono text-[18px] mt-1">${fmt(minNextBid)}</div>
                    </div>
                    <div className="hair-all p-3">
                      <div className="label">Buyer total</div>
                      <div className="mono text-[18px] mt-1">${fmt(auctionTotalCost(minNextBid))}</div>
                    </div>
                  </div>
                  <button type="button" onClick={() => onOpenAdminModeration?.(work.id)} className="swiss-btn ghost mt-4">
                    Open moderation <ShieldCheck size={12}/>
                  </button>
                </div>
                {bidNotice && <div className="mt-3 text-[12px] text-[var(--accent)]">{bidNotice}</div>}
              </div>
            ) : (
              <div className="mt-6 hair-t pt-6">
              <div className="label mb-3">Place your bid</div>
              <div className="flex items-center gap-2">
                <div className="hair-all flex-1 flex items-center px-3">
                  <span className="mono text-[12px] text-[var(--muted)]">USD</span>
                  <input value={bidInput} min={minNextBid} onChange={e => setBidInput(Number(e.target.value)||0)} type="number" className="bg-transparent outline-none mono text-[18px] flex-1 px-3 py-2.5 text-right"/>
                </div>
                <button onClick={submitBid} className="swiss-btn accent py-3" disabled={isRestricted || timeLeft <= 0 || placingBid || bidInput < minNextBid}>
                  <Gavel size={12}/> {isRestricted ? 'Paused' : timeLeft <= 0 ? 'Ended' : placingBid ? 'Placing...' : 'Bid'}
                </button>
              </div>
              {bidNotice && (
                <div className={`mt-3 text-[12px] ${bidNotice.toLowerCase().includes('synced') ? 'text-[var(--good)]' : 'text-[var(--accent)]'}`}>
                  {bidNotice}
                </div>
              )}
              <div className="mt-3 hair-all p-3 bg-[var(--bg)]">
                <div className="flex justify-between mono text-[11px]">
                  <span className="text-[var(--muted)]">Your bid</span>
                  <span>${fmt(bidInput)}</span>
                </div>
                <div className="flex justify-between mono text-[11px] mt-1">
                  <span className="text-[var(--muted)]">Buyer's premium (12%)</span>
                  <span>${fmt(auctionBuyerPremium(bidInput))}</span>
                </div>
                <div className="flex justify-between mono text-[11px] mt-1 pt-1 hair-t font-medium">
                  <span>Total if you win</span>
                  <span>${fmt(auctionTotalCost(bidInput))}</span>
                </div>
              </div>
              <div className="mt-2 label">
                Authorised at bid · captured only on winning · refunded if outbid
              </div>
              {isBuyerRole(role) && !isArtistOwner && (
                <div className="mt-4 hair-all p-4 bg-[var(--bg)] motion-copy">
                  <div className="label">Checkout pending</div>
                  <p className="text-[12px] text-[var(--muted)] mt-2 leading-relaxed">
                    Auction invoices are generated at close-out. Payments and authenticity-seal unlocks are completed from the buyer dashboard once the payment gateway is connected.
                  </p>
                </div>
              )}
              <div className="flex gap-2 mt-3">
                {[0, 50, 100, 250].map(inc => (
                  <button key={inc} onClick={() => setBidInput(minNextBid + inc)} className="tab-pill flex-1">{inc === 0 ? 'Min' : `+${inc}`}</button>
                ))}
              </div>
            </div>
            )}
          </div>

          <div className="hair-all bg-[var(--card)] p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="label">Community AI filter</div>
                <div className="display text-[24px] mt-2">{authenticity.label}</div>
                <p className="text-[13px] text-[var(--muted)] mt-2 leading-relaxed">{work.authenticityNote || authenticity.body}</p>
              </div>
              <div className="hair-all px-3 py-2 text-center min-w-[74px]">
                <div className="mono text-[22px] leading-none">{work.aiVoteCount || authState.votes.length || 0}</div>
                <div className="label mt-1">Votes</div>
              </div>
            </div>

            {isAdmin && (
              <div className="mt-5 hair-t pt-5">
                <div className="label mb-3">Admin AI review lens</div>
                <div className="hair-all p-4 bg-[var(--bg)]">
                  <p className="text-[13px] text-[var(--muted)] leading-relaxed">
                    Community votes are signals. Admins decide whether to clear, verify proof, reject proof, or take down the listing from the moderation queue.
                  </p>
                  <div className="grid grid-cols-3 gap-3 mt-4">
                    <div className="hair-all p-3">
                      <div className="label">Votes</div>
                      <div className="mono text-[18px] mt-1">{authState.votes.length}</div>
                    </div>
                    <div className="hair-all p-3">
                      <div className="label">Proofs</div>
                      <div className="mono text-[18px] mt-1">{authState.proofs.length}</div>
                    </div>
                    <div className="hair-all p-3">
                      <div className="label">Status</div>
                      <div className="mono text-[12px] mt-2 uppercase">{work.authenticityStatus || 'clear'}</div>
                    </div>
                  </div>
                  <button type="button" onClick={() => onOpenAdminModeration?.(work.id)} className="swiss-btn ghost mt-4">
                    Open moderation <ArrowRight size={12}/>
                  </button>
                </div>
              </div>
            )}

            {!isAdmin && canVoteAi && (
              <div className="mt-5 hair-t pt-5">
                <div className="label mb-3">{authState.ownVote ? 'Your vote is recorded' : 'Vote if this appears AI-generated'}</div>
                {!authState.ownVote && (
                  <div className="grid grid-cols-1 gap-3">
                    <select value={voteReason} onChange={event => setVoteReason(event.target.value)} className="swiss-input">
                      <option value="suspected_ai">Suspected AI generation</option>
                      <option value="inconsistent_process">Process looks inconsistent</option>
                      <option value="metadata_mismatch">Metadata mismatch</option>
                      <option value="other">Other authenticity concern</option>
                    </select>
                    <textarea value={voteNote} onChange={event => setVoteNote(event.target.value)} className="swiss-input min-h-[90px]" maxLength={800} placeholder="Optional: what made you doubt this listing?"/>
                  </div>
                )}
                <div className="mt-3 flex gap-2">
                  {authState.ownVote ? (
                    <button onClick={clearAuthenticityVote} disabled={authSaving} className="swiss-btn ghost">Remove vote</button>
                  ) : (
                    <button onClick={submitAuthenticityVote} disabled={authSaving} className="swiss-btn"><Flag size={12}/> Vote likely AI</button>
                  )}
                </div>
              </div>
            )}

            {!isAdmin && canSubmitProof && (
              <div className="mt-5 hair-t pt-5">
                <div className="label mb-3">Artist process proof</div>
                <div className="grid grid-cols-1 gap-3">
                  <input value={proofUrl} onChange={event => setProofUrl(event.target.value)} className="swiss-input" placeholder="Process link, timelapse, layered source, or WIP URL"/>
                  <textarea value={proofNotes} onChange={event => setProofNotes(event.target.value)} className="swiss-input min-h-[110px]" maxLength={1600} placeholder="Describe the process, tools, source files, and how the final was made."/>
                </div>
                <button onClick={submitProof} disabled={authSaving || proofNotes.trim().length < 20} className={`swiss-btn accent mt-3 ${authSaving || proofNotes.trim().length < 20 ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  Submit proof <ArrowRight size={12}/>
                </button>
              </div>
            )}

            {authState.proofs.length > 0 && (
              <div className="mt-5 hair-t pt-5">
                <div className="label mb-3">Submitted proof</div>
                <div className="space-y-3">
                  {authState.proofs.slice(0, 3).map(proof => (
                    <div key={proof.id} className="hair-all p-3 bg-[var(--bg)]">
                      <div className="flex justify-between gap-3">
                        <div className="mono text-[10px] uppercase tracking-[0.12em]">{proof.status}</div>
                        <div className="mono text-[10px] text-[var(--muted)]">{relativeTime(proof.createdAt)}</div>
                      </div>
                      <p className="text-[12px] text-[var(--ink-2)] mt-2 leading-relaxed">{proof.notes}</p>
                      {proof.proofUrl && <a href={proof.proofUrl} target="_blank" rel="noreferrer" className="mono text-[10px] text-[var(--accent)] underline-hover mt-2 inline-block">Open proof link</a>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {authNotice && <div className="text-[12px] text-[var(--accent)] mt-3">{authNotice}</div>}
          </div>

          {/* AUTHENTICITY SEAL — visible only to the artist and the buyer */}
          {authSeal && (
            <div className="hair-all bg-[var(--card)] p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="label">Authenticity seal</div>
                  <div className="display text-[22px] mt-2">Verified original</div>
                  <p className="text-[13px] text-[var(--muted)] mt-2 leading-relaxed">
                    This unique hash is private to you and {isArtistOwner ? 'the buyer' : 'the artist'}. It proves this file is the authentic listed artwork.
                  </p>
                </div>
                <div className="hair-all px-3 py-2 text-center min-w-[74px]">
                  <div className="mono text-[10px] uppercase tracking-[0.12em]">Issued</div>
                  <div className="mono text-[11px] mt-1">{relativeTime(authSeal.issuedAt)}</div>
                </div>
              </div>
              <div className="mt-4 hair-t pt-4">
                <div className="label mb-2">SHA-256</div>
                <div className="mono text-[11px] break-all bg-[var(--bg)] hair-all p-3 leading-relaxed">{authSeal.hash}</div>
              </div>
            </div>
          )}

          {/* TABS */}
          <div>
            <div className="flex gap-1 hair-b">
              {[{k:'bids', l:`Bid history - ${bidCount}`},{k:'about',l:'About'},{k:'comments',l:`Comments · ${comments.length}`}].map(t => (
                <button key={t.k} onClick={() => setTab(t.k)} className={`mono text-[11px] uppercase tracking-[0.12em] px-3 py-2.5 ${tab===t.k ? 'border-b border-[var(--ink)] -mb-px text-[var(--ink)]' : 'text-[var(--muted)]'}`}>{t.l}</button>
              ))}
            </div>
            <div className="pt-5">
              {tab === 'bids' && (
                localBids.length ? (
                  <div className="space-y-0">
                    {localBids.map((b, i) => (
                      <div key={b.id || i} className="flex items-center justify-between hair-b py-3">
                        <div className="flex items-center gap-3">
                          <span className="mono text-[10px] text-[var(--muted)] w-6">{String(i+1).padStart(2,'0')}</span>
                          <span className="text-[13px]">{b.user}</span>
                          {i === 0 && <span className="bg-[var(--good)] text-white mono text-[9px] px-1.5 py-0.5 tracking-wider">TOP</span>}
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="mono text-[11px] text-[var(--muted)]">{b.when}</span>
                          <span className="mono text-[14px]">${fmt(b.amount)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="hair-all p-6 bg-[var(--card)] text-center">
                    <Gavel size={18} className="mx-auto text-[var(--muted)]"/>
                    <div className="display text-[22px] mt-3">No persisted bid rows yet.</div>
                    <p className="text-[13px] text-[var(--muted)] mt-2">
                      New bids placed through FORMA will appear here immediately.
                    </p>
                  </div>
                )
              )}
              {tab === 'about' && (
                <div className="text-[14px] leading-relaxed text-[var(--ink-2)] space-y-4">
                  <p>
                    <span className="font-medium text-[var(--ink)]">{work.title}</span> by {artist.name}
                    {work.year ? `, ${work.year}` : ''}. {work.edition} edition{work.dim ? `, ${work.dim}` : ''}
                    {work.format ? `, delivered as ${work.format}` : ''}.
                  </p>
                  {work.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {work.tags.map(tag => (
                        <span key={tag} className="hair-all px-2 py-0.5 mono text-[10px] uppercase tracking-[0.1em]">#{tag}</span>
                      ))}
                    </div>
                  )}
                  <div className="hair-t pt-4 grid grid-cols-2 gap-y-2 mono text-[11px]">
                    <span className="text-[var(--muted)]">ARTIST</span><span>{artist.name} · {artist.handle}</span>
                    <span className="text-[var(--muted)]">LISTED</span><span>{work.createdAt ? relativeTime(work.createdAt) : '—'}</span>
                    <span className="text-[var(--muted)]">AUTHENTICITY</span><span>{authenticity.label}</span>
                    <span className="text-[var(--muted)]">DELIVERY</span><span>Instant — files unlock at sale</span>
                    <span className="text-[var(--muted)]">LICENSE</span><span>Personal display, non-commercial</span>
                  </div>
                </div>
              )}
              {tab === 'comments' && (
                <div className="space-y-4">
                  {comments.length === 0 && (
                    <div className="mono text-[11px] text-[var(--muted)]">{canComment ? 'No comments yet. Start the thread.' : 'No comments yet.'}</div>
                  )}
                  {comments.map((c) => (
                    <div key={c.id} className="hair-b pb-3">
                      <div className="flex justify-between items-baseline gap-3">
                        <div className="min-w-0">
                          <span className="text-[13px] font-medium">{c.displayName || c.userId?.slice(0, 8) || 'user'}</span>
                          {c.handle && <span className="mono text-[10px] text-[var(--muted)] ml-2">@{c.handle}</span>}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className="mono text-[10px] text-[var(--muted)]">{relativeTime(c.createdAt)}</div>
                          {canComment && c.userId === user?.id && (
                            <button type="button" onClick={() => removeComment(c.id)} className="hair-all w-6 h-6 flex items-center justify-center hover:bg-[var(--ink)] hover:text-[var(--bg)]" aria-label="Delete comment">
                              <Trash2 size={11}/>
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-[13px] mt-1 text-[var(--ink-2)]">{c.body}</p>
                    </div>
                  ))}
                  {canComment ? (
                    <form onSubmit={submitComment} className="hair-all p-3 flex gap-2">
                      <input
                        value={commentDraft}
                        onChange={e => setCommentDraft(e.target.value)}
                        className="swiss-input flex-1 border-none"
                        placeholder="Add a comment..."
                        maxLength={800}
                      />
                      <button type="submit" disabled={commentSending || !commentDraft.trim()} className={`swiss-btn ${commentSending || !commentDraft.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        <Send size={12}/>
                      </button>
                    </form>
                  ) : (
                    <div className="hair-all p-3 mono text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">
                      Admin accounts can view comments here. Resolve comment issues through reports.
                    </div>
                  )}
                  {commentError && <div className="text-[12px] text-[var(--accent)]">{commentError}</div>}
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="label mb-3">Tags</div>
            <div className="flex flex-wrap gap-2">
              {work.tags.map(t => (
                <span key={t} className="hair-all px-2.5 py-1 mono text-[10px] uppercase tracking-[0.1em] cursor-pointer hover:bg-[var(--ink)] hover:text-[var(--bg)]">#{t}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* RELATED */}
      <section className="mt-24">
        <div className="hair-b pb-4 mb-8 flex justify-between items-baseline">
          <h3 className="display text-[32px]">More from {artist.name}</h3>
          <a onClick={() => goToArtist(artist.id)} className="mono text-[11px] uppercase tracking-[0.12em] underline-hover cursor-pointer">Visit shop →</a>
        </div>
        <div className="grid grid-cols-4 gap-6">
          {ARTWORKS.filter(w => w.artist === artist.id && w.id !== work.id).slice(0,4).map(w => (
            <ArtCard key={w.id} work={w} onClick={() => goToArtwork(w.id)} likes={likes} toggleLike={toggleLike}/>
          ))}
          {ARTWORKS.filter(w => w.artist !== artist.id).slice(0, Math.max(0, 4 - ARTWORKS.filter(w => w.artist === artist.id && w.id !== work.id).length)).map(w => (
            <ArtCard key={w.id} work={w} onClick={() => goToArtwork(w.id)} likes={likes} toggleLike={toggleLike}/>
          ))}
        </div>
      </section>
    </main>
  );
};
