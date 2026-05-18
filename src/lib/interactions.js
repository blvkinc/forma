import { supabase } from './supabase';

// ============================================================
// INTERACTIONS LAYER — User-specific reads/writes to Supabase
// ============================================================

// ---- Likes ----

export async function fetchUserLikes(userId) {
  const { data, error } = await supabase
    .from('user_likes')
    .select('artwork_id')
    .eq('user_id', userId);
  if (error) throw error;
  // Return as object map { artworkId: true } to match existing shape
  const map = {};
  (data || []).forEach(row => { map[row.artwork_id] = true; });
  return map;
}

export async function toggleLike(userId, artworkId) {
  // Check if already liked
  const { data: existing } = await supabase
    .from('user_likes')
    .select('artwork_id')
    .eq('user_id', userId)
    .eq('artwork_id', artworkId)
    .maybeSingle();

  if (existing) {
    // Unlike
    const { error } = await supabase
      .from('user_likes')
      .delete()
      .eq('user_id', userId)
      .eq('artwork_id', artworkId);
    if (error) throw error;
    return false; // now unliked
  } else {
    // Like
    const { error } = await supabase
      .from('user_likes')
      .insert({ user_id: userId, artwork_id: artworkId });
    if (error) throw error;
    return true; // now liked
  }
}

// ---- Follows ----

export async function fetchUserFollows(userId) {
  const { data, error } = await supabase
    .from('user_follows')
    .select('artist_id')
    .eq('user_id', userId);
  if (error) throw error;
  const map = {};
  (data || []).forEach(row => { map[row.artist_id] = true; });
  return map;
}

export async function toggleFollow(userId, artistId) {
  const { data: existing } = await supabase
    .from('user_follows')
    .select('artist_id')
    .eq('user_id', userId)
    .eq('artist_id', artistId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('user_follows')
      .delete()
      .eq('user_id', userId)
      .eq('artist_id', artistId);
    if (error) throw error;
    return false;
  } else {
    const { error } = await supabase
      .from('user_follows')
      .insert({ user_id: userId, artist_id: artistId });
    if (error) throw error;
    return true;
  }
}

// ---- Watchlist ----

export async function fetchUserWatchlist(userId) {
  const { data, error } = await supabase
    .from('user_watchlist')
    .select('artwork_id')
    .eq('user_id', userId);
  if (error) throw error;
  const map = {};
  (data || []).forEach(row => { map[row.artwork_id] = true; });
  return map;
}

export async function toggleWatchlist(userId, artworkId) {
  const { data: existing } = await supabase
    .from('user_watchlist')
    .select('artwork_id')
    .eq('user_id', userId)
    .eq('artwork_id', artworkId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('user_watchlist')
      .delete()
      .eq('user_id', userId)
      .eq('artwork_id', artworkId);
    if (error) throw error;
    return false;
  } else {
    const { error } = await supabase
      .from('user_watchlist')
      .insert({ user_id: userId, artwork_id: artworkId });
    if (error) throw error;
    return true;
  }
}

// ---- Bids ----

export async function fetchBidsForArtwork(artworkId) {
  const { data, error } = await supabase
    .from('bids')
    .select('*')
    .eq('artwork_id', artworkId)
    .order('placed_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(row => ({
    user: row.display_name,
    amount: Number(row.amount),
    when: formatRelativeTime(row.placed_at),
  }));
}

export async function placeBid(userId, artworkId, amount, displayName) {
  const { error } = await supabase
    .from('bids')
    .insert({
      user_id: userId,
      artwork_id: artworkId,
      amount,
      display_name: displayName || 'Anonymous',
    });
  if (error) throw error;
}

// ---- Helpers ----

function formatRelativeTime(isoString) {
  const diff = Date.now() - new Date(isoString).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
