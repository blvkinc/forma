import { supabase } from './supabase';

async function devInteractionApi(path, options = {}) {
  if (!import.meta.env.DEV) return null;

  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(path, {
    ...options,
    headers,
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || 'Marketplace interaction failed.');
  }

  return payload.data;
}

function transformArtwork(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    visual: row.visual,
    artist: row.artist_id,
    year: row.year,
    dim: row.dimensions,
    edition: row.edition,
    startBid: Number(row.start_bid),
    currentBid: Number(row.current_bid),
    bids: row.bid_count,
    watchers: row.watcher_count,
    endsAt: Math.max(0, new Date(row.ends_at).getTime() - Date.now()),
    tags: row.tags || [],
    likes: row.like_count,
    format: row.format,
    createdAt: row.created_at,
  };
}

function transformBid(row) {
  return {
    id: row.id,
    userId: row.user_id,
    artworkId: row.artwork_id,
    user: row.display_name,
    amount: Number(row.amount),
    when: formatRelativeTime(row.placed_at),
    placedAt: row.placed_at,
  };
}

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
  const apiData = await devInteractionApi(`/api/bids?artworkId=${encodeURIComponent(artworkId)}`);
  if (apiData) return (apiData || []).map(transformBid);

  const { data, error } = await supabase
    .from('bids')
    .select('*')
    .eq('artwork_id', artworkId)
    .order('placed_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(transformBid);
}

export async function fetchUserBids(userId) {
  const apiData = await devInteractionApi('/api/bids?scope=mine');
  if (apiData) return (apiData || []).map(transformBid);

  const { data, error } = await supabase
    .from('bids')
    .select('*')
    .eq('user_id', userId)
    .order('placed_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(transformBid);
}

export async function placeBid(userId, artworkId, amount, displayName) {
  const apiData = await devInteractionApi('/api/bids', {
    method: 'POST',
    body: JSON.stringify({ artworkId, amount, displayName }),
  });
  if (apiData) {
    return {
      bid: transformBid(apiData.bid),
      artwork: transformArtwork(apiData.artwork),
    };
  }

  const { data: bid, error } = await supabase
    .from('bids')
    .insert({
      user_id: userId,
      artwork_id: artworkId,
      amount,
      display_name: displayName || 'Anonymous',
    })
    .select()
    .single();
  if (error) throw error;

  const { data: artwork, error: artworkError } = await supabase
    .from('artworks')
    .select('*')
    .eq('id', artworkId)
    .single();
  if (artworkError) throw artworkError;

  return {
    bid: transformBid(bid),
    artwork: transformArtwork(artwork),
  };
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
