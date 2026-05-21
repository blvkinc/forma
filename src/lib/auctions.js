import { supabase } from './supabase';

export function transformAuctionSettlement(row) {
  if (!row) return null;
  return {
    id: row.id,
    artworkId: row.artwork_id,
    winnerId: row.winner_id,
    winningBidId: row.winning_bid_id,
    amount: Number(row.amount || 0),
    buyerPremium: Number(row.buyer_premium || 0),
    totalDue: Number(row.total_due || 0),
    status: row.status,
    invoiceReference: row.invoice_reference,
    dueAt: row.due_at,
    closedAt: row.closed_at,
    paidAt: row.paid_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function fetchUserAuctionSettlements(userId) {
  if (!userId) return [];

  const { data, error } = await supabase
    .from('auction_settlements')
    .select('*')
    .eq('winner_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(transformAuctionSettlement).filter(Boolean);
}

export async function fetchArtistAuctionSettlements(artistId) {
  if (!artistId) return [];

  const { data: works, error: worksError } = await supabase
    .from('artworks')
    .select('id, title, visual, image_url')
    .eq('artist_id', artistId);
  if (worksError) throw worksError;

  const workMap = new Map((works || []).map(work => [work.id, {
    id: work.id,
    title: work.title,
    visual: work.visual,
    imageUrl: work.image_url,
  }]));
  const artworkIds = [...workMap.keys()];
  if (!artworkIds.length) return [];

  const { data, error } = await supabase
    .from('auction_settlements')
    .select('*')
    .in('artwork_id', artworkIds)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || [])
    .map(row => {
      const settlement = transformAuctionSettlement(row);
      return settlement ? { ...settlement, artwork: workMap.get(settlement.artworkId) || null } : null;
    })
    .filter(Boolean);
}

export async function closeEndedAuction(artworkId) {
  const { data, error } = await supabase.rpc('close_ended_auction', {
    p_artwork_id: artworkId,
  });
  if (error) throw error;
  return data;
}

export async function adminMarkAuctionInvoicePaid(settlementId) {
  const { error } = await supabase.rpc('admin_mark_auction_invoice_paid', {
    p_settlement_id: settlementId,
  });
  if (error) throw error;
  return true;
}
