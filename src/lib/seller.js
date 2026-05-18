import { supabase } from './supabase';

async function devSellerApi(path, options = {}) {
  if (!import.meta.env.DEV) return null;

  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error('Authentication is required.');

  const response = await fetch(path, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || 'Seller request failed.');
  }

  return payload.data;
}

export async function createSellerArtist(payload) {
  const apiData = await devSellerApi('/api/seller-artist', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (apiData) return apiData;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id) throw new Error('Authentication is required.');

  const { data, error } = await supabase
    .from('artists')
    .insert({
      id: payload.id,
      handle: payload.handle,
      name: payload.name,
      city: payload.city,
      joined: String(new Date().getFullYear()),
      followers: 0,
      bio: payload.bio,
      verified: false,
      accent: payload.accent,
      profile_id: user.id,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function createSellerArtwork(payload) {
  const apiData = await devSellerApi('/api/seller-artworks', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (apiData) return apiData;

  const { data, error } = await supabase
    .from('artworks')
    .insert({
      id: payload.id,
      title: payload.title,
      visual: payload.visual,
      artist_id: payload.artistId,
      year: payload.year,
      dimensions: payload.dimensions,
      edition: payload.edition,
      start_bid: payload.startBid,
      current_bid: payload.startBid,
      bid_count: 0,
      watcher_count: 0,
      ends_at: payload.endsAt,
      tags: payload.tags,
      like_count: 0,
      format: payload.format,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function createSellerCommission(payload) {
  const apiData = await devSellerApi('/api/seller-commissions', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (apiData) return apiData;

  const { data, error } = await supabase
    .from('commissions')
    .insert({
      id: payload.id,
      artist_id: payload.artistId,
      title: payload.title,
      slots: payload.slots,
      taken: 0,
      price: payload.price,
      days: payload.days,
      brief: payload.brief,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
