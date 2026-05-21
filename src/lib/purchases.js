import { supabase } from './supabase';

function transformPurchase(row) {
  return {
    id: row.id,
    artworkId: row.artwork_id,
    buyerId: row.buyer_id,
    amount: Number(row.amount || 0),
    createdAt: row.created_at,
  };
}

export async function fetchUserPurchases(userId) {
  if (!userId) return [];

  const { data, error } = await supabase
    .from('purchases')
    .select('*')
    .eq('buyer_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(transformPurchase);
}

export async function recordArtworkPurchase(userId, artworkId, amount) {
  if (!userId) return { error: 'Authentication is required.' };
  if (!artworkId) return { error: 'Artwork is required.' };
  return {
    error: 'Checkout is not enabled yet. Purchases are created only after an auction invoice is marked paid.',
  };
}
