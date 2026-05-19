import { supabase } from './supabase';

// ============================================================
// DATA LAYER — Supabase queries for catalogue data
// ============================================================

/**
 * Transform a DB artwork row into the shape the front-end expects.
 * Converts ends_at timestamp → endsAt (ms remaining).
 * Converts snake_case → camelCase for consistency with existing components.
 */
function transformArtwork(row) {
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
    imageUrl: row.image_url,
    authenticityStatus: row.authenticity_status || 'clear',
    aiVoteCount: Number(row.ai_vote_count || 0),
    authenticityNote: row.authenticity_note,
    authenticityUpdatedAt: row.authenticity_updated_at,
    takenDown: row.taken_down === true,
    createdAt: row.created_at,
  };
}

function transformArtist(row) {
  return {
    id: row.id,
    handle: row.handle,
    name: row.name,
    city: row.city,
    joined: row.joined,
    followers: row.followers,
    bio: row.bio,
    verified: row.verified,
    accent: row.accent,
    profileId: row.profile_id,
    suspended: row.suspended === true,
  };
}

function transformCommission(row) {
  return {
    id: row.id,
    artist: row.artist_id,
    title: row.title,
    slots: row.slots,
    taken: row.taken,
    price: Number(row.price),
    days: row.days,
    brief: row.brief,
  };
}

function transformFeedPost(row) {
  return {
    id: row.id,
    artist: row.artist_id,
    type: row.type,
    when: row.posted_at,
    text: row.body,
    artwork: row.artwork_id,
    likes: row.like_count,
    comments: row.comment_count,
    saves: row.save_count || 0,
    createdAt: row.created_at,
  };
}

// ---- Fetch functions ----

function shouldUseDirectSupabase(errorMessage) {
  return /fetch failed|failed to fetch|networkerror|load failed/i.test(String(errorMessage || ''));
}

async function fetchCatalogueResource(resource) {
  if (import.meta.env.DEV) {
    try {
      const response = await fetch(`/api/catalogue?resource=${resource}`);
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message = payload.error || `Failed to load ${resource}`;
        if (shouldUseDirectSupabase(message)) return null;
        throw new Error(message);
      }

      return payload.data || [];
    } catch (error) {
      if (shouldUseDirectSupabase(error?.message)) return null;
      throw error;
    }
  }

  return null;
}

export async function fetchArtists() {
  const apiData = await fetchCatalogueResource('artists');
  if (apiData) return apiData.map(transformArtist);

  const { data, error } = await supabase
    .from('artists')
    .select('*')
    .order('name');
  if (error) throw error;
  return (data || []).map(transformArtist);
}

export async function fetchArtworks() {
  const apiData = await fetchCatalogueResource('artworks');
  if (apiData) return apiData.map(transformArtwork);

  const { data, error } = await supabase
    .from('artworks')
    .select('*')
    .order('ends_at', { ascending: true });
  if (error) throw error;
  return (data || []).map(transformArtwork);
}

export async function fetchArtwork(id) {
  const { data, error } = await supabase
    .from('artworks')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return transformArtwork(data);
}

export async function fetchArtist(id) {
  const { data, error } = await supabase
    .from('artists')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return transformArtist(data);
}

export async function fetchCommissions() {
  const apiData = await fetchCatalogueResource('commissions');
  if (apiData) return apiData.map(transformCommission);

  const { data, error } = await supabase
    .from('commissions')
    .select('*')
    .order('created_at');
  if (error) throw error;
  return (data || []).map(transformCommission);
}

export async function fetchFeedPosts() {
  const apiData = await fetchCatalogueResource('feed_posts');
  if (apiData) return apiData.map(transformFeedPost);

  const { data, error } = await supabase
    .from('feed_posts')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(transformFeedPost);
}
