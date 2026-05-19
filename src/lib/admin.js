import { supabase } from './supabase';
import { commissionArtistPayout } from './domain';
import {
  closeEndedAuction,
  adminMarkAuctionInvoicePaid,
  transformAuctionSettlement,
} from './auctions';
import {
  fetchSellerApplications as fetchSellerApplicationRows,
  reviewSellerApplication as reviewSellerApplicationRow,
} from './onboarding';

// ============================================================
// FORMA — Admin operations (KYC, disputes, audit, payouts)
// All reads/writes are gated by the admin RLS policies added in
// migration 021_admin_queues.sql.
// ============================================================

// ---- KYC ----
export async function fetchKycQueue() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, display_name, handle, role, verified, created_at')
    .order('verified', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map(p => ({
    id: p.id,
    email: p.email,
    displayName: p.display_name,
    handle: p.handle,
    role: p.role,
    verified: p.verified,
    createdAt: p.created_at,
  }));
}

export async function setProfileVerified(profileId, verified) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ verified, updated_at: new Date().toISOString() })
    .eq('id', profileId)
    .select('id, verified')
    .single();
  if (error) throw error;
  return data;
}

// ---- Seller onboarding review ----
export async function fetchSellerApplications() {
  return fetchSellerApplicationRows();
}

export async function reviewSellerApplication(applicationId, decision, reviewNote = '') {
  return reviewSellerApplicationRow(applicationId, decision, reviewNote);
}

// ---- Commission disputes ----
function transformDispute(row) {
  return {
    id: row.id,
    status: row.status,
    price: Number(row.price),
    briefText: row.brief_text,
    buyerId: row.buyer_id,
    artistId: row.artist_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    title: row.commissions?.title || 'Commission',
    artistHandle: row.artists?.handle || row.artist_id,
  };
}

export async function fetchDisputes() {
  const { data, error } = await supabase
    .from('commission_bookings')
    .select('*, commissions(title), artists(handle)')
    .eq('status', 'DISPUTED')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(transformDispute);
}

// decision: 'resume' → back to IN_PROGRESS, 'refund' → CANCELLED
export async function resolveDispute(bookingId, decision) {
  const status = decision === 'refund' ? 'CANCELLED' : 'IN_PROGRESS';
  const { data, error } = await supabase
    .from('commission_bookings')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', bookingId)
    .select('id, status')
    .single();
  if (error) throw error;
  return data;
}

// ---- Audit log ----
export async function fetchAuditLog(limit = 50) {
  const { data, error } = await supabase
    .from('audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []).map(r => ({
    id: r.id,
    actorId: r.actor_id,
    action: r.action,
    targetType: r.target_type,
    targetId: r.target_id,
    detail: r.detail,
    createdAt: r.created_at,
  }));
}

function groupBy(rows, keyFn) {
  const groups = new Map();
  for (const row of rows || []) {
    const key = keyFn(row);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  return groups;
}

function transformModerationReview(row) {
  if (!row) return null;
  return {
    id: row.id,
    artworkId: row.artwork_id,
    status: row.status,
    priority: row.priority,
    reason: row.reason,
    reviewNote: row.review_note,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function transformModerationReport(row) {
  return {
    id: row.id,
    reason: row.reason,
    details: row.details,
    status: row.status,
    priority: row.priority,
    resolutionNote: row.resolution_note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function transformModerationVote(row) {
  return {
    id: row.id,
    reason: row.reason,
    note: row.note,
    createdAt: row.created_at,
  };
}

function transformModerationProof(row) {
  return {
    id: row.id,
    proofUrl: row.proof_url,
    notes: row.notes,
    status: row.status,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function derivedModerationStatus({ takenDown, review, openReports, pendingProofs, aiVoteCount }) {
  if (takenDown) return 'taken_down';
  if (review?.status) return review.status;
  if (pendingProofs.length > 0 || openReports.length > 0 || aiVoteCount > 0) return 'queued';
  return 'clear';
}

function derivedModerationPriority({ review, openReports, pendingProofs, aiVoteCount }) {
  if (review?.priority) return review.priority;
  if (openReports.some(report => report.priority === 'high') || pendingProofs.length > 0 || aiVoteCount >= 3) return 'high';
  if (openReports.length > 0 || aiVoteCount > 0) return 'normal';
  return 'low';
}

// ---- Moderation (review / takedown / suspension) ----
export async function fetchModerationTargets() {
  const [artworksRes, artistsRes, reviewsRes, reportsRes, votesRes, proofsRes] = await Promise.all([
    supabase
      .from('artworks')
      .select(`
        id,
        title,
        visual,
        image_url,
        artist_id,
        year,
        dimensions,
        edition,
        start_bid,
        current_bid,
        bid_count,
        watcher_count,
        ends_at,
        tags,
        like_count,
        format,
        created_at,
        taken_down,
        authenticity_status,
        ai_vote_count,
        authenticity_note,
        authenticity_updated_at,
        artists(handle, name, profile_id)
      `)
      .order('taken_down', { ascending: false })
      .order('title', { ascending: true }),
    supabase
      .from('artists')
      .select('id, name, handle, suspended')
      .order('suspended', { ascending: false })
      .order('name', { ascending: true }),
    supabase
      .from('artwork_moderation_reviews')
      .select('*')
      .order('updated_at', { ascending: false }),
    supabase
      .from('reports')
      .select('*')
      .eq('target_type', 'artwork')
      .order('created_at', { ascending: false }),
    supabase
      .from('artwork_ai_votes')
      .select('*')
      .order('created_at', { ascending: false }),
    supabase
      .from('artwork_ai_proofs')
      .select('*')
      .order('created_at', { ascending: false }),
  ]);
  if (artworksRes.error) throw artworksRes.error;
  if (artistsRes.error) throw artistsRes.error;
  if (reviewsRes.error) throw reviewsRes.error;
  if (reportsRes.error) throw reportsRes.error;
  if (votesRes.error) throw votesRes.error;
  if (proofsRes.error) throw proofsRes.error;

  const reviewsByArtwork = new Map((reviewsRes.data || []).map(row => [row.artwork_id, transformModerationReview(row)]));
  const reportsByArtwork = groupBy(reportsRes.data || [], row => row.target_id);
  const votesByArtwork = groupBy(votesRes.data || [], row => row.artwork_id);
  const proofsByArtwork = groupBy(proofsRes.data || [], row => row.artwork_id);

  return {
    artworks: (artworksRes.data || []).map(w => {
      const review = reviewsByArtwork.get(w.id) || null;
      const reports = (reportsByArtwork.get(w.id) || []).map(transformModerationReport);
      const votes = (votesByArtwork.get(w.id) || []).map(transformModerationVote);
      const proofs = (proofsByArtwork.get(w.id) || []).map(transformModerationProof);
      const openReports = reports.filter(report => report.status === 'open' || report.status === 'reviewing');
      const pendingProofs = proofs.filter(proof => proof.status === 'pending');
      const aiVoteCount = Number(w.ai_vote_count || votes.length || 0);
      const takenDown = w.taken_down === true;
      return {
        id: w.id,
        title: w.title,
        visual: w.visual,
        imageUrl: w.image_url,
        artistId: w.artist_id,
        artistName: w.artists?.name || w.artist_id,
        artistHandle: w.artists?.handle || w.artist_id,
        year: w.year,
        dimensions: w.dimensions,
        edition: w.edition,
        startBid: Number(w.start_bid || 0),
        currentBid: Number(w.current_bid || 0),
        bids: Number(w.bid_count || 0),
        watchers: Number(w.watcher_count || 0),
        likes: Number(w.like_count || 0),
        endsAt: w.ends_at,
        tags: w.tags || [],
        format: w.format,
        createdAt: w.created_at,
        takenDown,
        authenticityStatus: w.authenticity_status || 'clear',
        aiVoteCount,
        authenticityNote: w.authenticity_note,
        authenticityUpdatedAt: w.authenticity_updated_at,
        review,
        reviewStatus: derivedModerationStatus({ takenDown, review, openReports, pendingProofs, aiVoteCount }),
        reviewPriority: derivedModerationPriority({ review, openReports, pendingProofs, aiVoteCount }),
        reports,
        openReports,
        votes,
        proofs,
        pendingProofs,
      };
    }),
    artists: (artistsRes.data || []).map(a => ({
      id: a.id,
      name: a.name,
      handle: a.handle,
      suspended: a.suspended === true,
    })),
  };
}

export async function setArtworkTakedown(artworkId, value) {
  const { error } = await supabase.rpc('admin_set_artwork_takedown', {
    p_artwork_id: artworkId,
    p_value: value,
  });
  if (error) throw error;
  return true;
}

export async function saveArtworkModerationReview(artworkId, payload = {}) {
  const status = payload.status || 'reviewing';
  const { data, error } = await supabase
    .from('artwork_moderation_reviews')
    .upsert({
      artwork_id: artworkId,
      status,
      priority: payload.priority || 'normal',
      reason: payload.reason || null,
      review_note: String(payload.reviewNote || '').trim().slice(0, 1200) || null,
    }, { onConflict: 'artwork_id' })
    .select()
    .single();
  if (error) throw error;
  return transformModerationReview(data);
}

export async function setArtworkProofStatus(proofId, status) {
  const { data, error } = await supabase
    .from('artwork_ai_proofs')
    .update({ status })
    .eq('id', proofId)
    .select()
    .single();
  if (error) throw error;
  return transformModerationProof(data);
}

export async function setArtistSuspended(artistId, value) {
  const { error } = await supabase.rpc('admin_set_artist_suspended', {
    p_artist_id: artistId,
    p_value: value,
  });
  if (error) throw error;
  return true;
}

// ---- Auction settlements / invoice close-out ----
export async function fetchAuctionSettlements(limit = 80) {
  const { data, error } = await supabase
    .from('auction_settlements')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []).map(transformAuctionSettlement).filter(Boolean);
}

export async function closeAuctionForSettlement(artworkId) {
  return closeEndedAuction(artworkId);
}

export async function markAuctionSettlementPaid(settlementId) {
  return adminMarkAuctionInvoicePaid(settlementId);
}

// ---- Delivery outbox ----
function transformDelivery(row) {
  return {
    id: row.id,
    eventType: row.event_type,
    channel: row.channel,
    recipientUserId: row.recipient_user_id,
    recipientEmail: row.recipient_email,
    webhookUrl: row.webhook_url,
    payload: row.payload || {},
    status: row.status,
    attempts: Number(row.attempts || 0),
    dedupeKey: row.dedupe_key,
    lastError: row.last_error,
    availableAt: row.available_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    sentAt: row.sent_at,
  };
}

export async function fetchDeliveryOutbox(limit = 80) {
  const { data, error } = await supabase
    .from('delivery_outbox')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []).map(transformDelivery);
}

export async function markDeliveryStatus(deliveryId, status, errorMessage = null) {
  const { error } = await supabase.rpc('admin_mark_delivery_status', {
    p_delivery_id: deliveryId,
    p_status: status,
    p_error: errorMessage,
  });
  if (error) throw error;
  return true;
}

// ---- Payouts (derived from delivered/accepted commissions) ----
export async function fetchPayouts() {
  const { data, error } = await supabase
    .from('commission_bookings')
    .select('artist_id, price, status, artists(handle, name)')
    .in('status', ['DELIVERED', 'ACCEPTED']);
  if (error) throw error;

  const byArtist = new Map();
  for (const row of data || []) {
    const key = row.artist_id;
    const entry = byArtist.get(key) || {
      artistId: key,
      handle: row.artists?.handle || key,
      name: row.artists?.name || key,
      gross: 0,
      net: 0,
      jobs: 0,
    };
    const price = Number(row.price || 0);
    entry.gross += price;
    entry.net += commissionArtistPayout(price);
    entry.jobs += 1;
    byArtist.set(key, entry);
  }
  return Array.from(byArtist.values()).sort((a, b) => b.net - a.net);
}
