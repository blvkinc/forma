import { supabase } from './supabase';

const SELLER_REQUEST_TIMEOUT_MS = 15000;

function sellerErrorMessage(error) {
  const message = error?.message || 'Seller request failed.';
  if (/row-level security/i.test(message)) {
    return `${message} Run the latest Supabase migrations in supabase/migrations before retrying protected seller actions.`;
  }
  return message;
}

function shouldUseDirectSupabase(errorMessage) {
  return /fetch failed|failed to fetch|networkerror|load failed/i.test(String(errorMessage || ''));
}

function withSellerTimeout(promise, label = 'Seller request') {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${label} timed out. Refresh the app or restart the Vite dev server, then try again.`));
    }, SELLER_REQUEST_TIMEOUT_MS);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}

async function devSellerApi(path, options = {}) {
  if (!import.meta.env.DEV) return null;

  const { data: { session } } = await withSellerTimeout(
    supabase.auth.getSession(),
    'Authentication check'
  );
  const token = session?.access_token;
  if (!token) throw new Error('Authentication is required.');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SELLER_REQUEST_TIMEOUT_MS);
  let response;

  try {
    response = await fetch(path, {
      ...options,
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
  } catch (error) {
    if (error?.name === 'AbortError') return null;
    if (shouldUseDirectSupabase(error?.message)) return null;
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

  if (response.status === 404) return null;

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = payload.error || 'Seller request failed.';
    if (response.status === 502 && shouldUseDirectSupabase(message)) return null;
    throw new Error(message);
  }

  return payload.data;
}

const makeId = (prefix) => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

function slugify(value, fallback = 'studio') {
  const slug = String(value || fallback)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return slug || fallback;
}

function parseTags(value) {
  if (Array.isArray(value)) return value.map(tag => String(tag).trim()).filter(Boolean).slice(0, 10);
  return String(value || '')
    .split(',')
    .map(tag => tag.trim())
    .filter(Boolean)
    .slice(0, 10);
}

async function ownedArtistFor(userId) {
  const { data, error } = await withSellerTimeout(
    supabase
      .from('artists')
      .select('*')
      .eq('profile_id', userId)
      .maybeSingle(),
    'Studio lookup'
  );
  if (error) throw new Error(sellerErrorMessage(error));
  if (!data) throw new Error('Create a seller studio profile before listing work.');
  return data;
}

async function existingArtistFor(userId) {
  const { data, error } = await withSellerTimeout(
    supabase
      .from('artists')
      .select('*')
      .eq('profile_id', userId)
      .maybeSingle(),
    'Studio lookup'
  );
  if (error) throw new Error(sellerErrorMessage(error));
  return data;
}

export async function createSellerArtist(payload) {
  const apiData = await devSellerApi('/api/seller-artist', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (apiData) return apiData;

  const { data: { user } } = await withSellerTimeout(
    supabase.auth.getUser(),
    'Authentication check'
  );
  if (!user?.id) throw new Error('Authentication is required.');

  const existing = await existingArtistFor(user.id);
  const handle = slugify(payload.handle || payload.name || user.email);
  const values = {
    handle,
    name: String(payload.name || handle).trim().slice(0, 120),
    city: String(payload.city || '').trim().slice(0, 120) || null,
    joined: existing?.joined || String(new Date().getFullYear()),
    followers: existing?.followers || 0,
    bio: String(payload.bio || '').trim().slice(0, 900) || null,
    verified: existing?.verified || false,
    accent: String(payload.accent || existing?.accent || '#0E0E0C').trim().slice(0, 24),
    profile_id: user.id,
  };

  const query = existing
    ? supabase.from('artists').update(values).eq('id', existing.id)
    : supabase.from('artists').insert({ id: payload.id || `seller-${handle}`, ...values });

  const { data, error } = await withSellerTimeout(
    query.select().single(),
    'Studio save'
  );

  if (error) throw new Error(sellerErrorMessage(error));
  return data;
}

export async function createSellerArtwork(payload) {
  const apiData = await devSellerApi('/api/seller-artworks', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (apiData) return apiData;

  const { data: { user } } = await withSellerTimeout(
    supabase.auth.getUser(),
    'Authentication check'
  );
  if (!user?.id) throw new Error('Authentication is required.');
  const artist = await ownedArtistFor(user.id);
  const durationHours = Math.min(168, Math.max(24, Number(payload.durationHours || 120)));

  const { data, error } = await withSellerTimeout(
    supabase
      .from('artworks')
      .insert({
        id: payload.id || makeId('art'),
        title: String(payload.title || '').trim().slice(0, 140),
        visual: String(payload.visual || 'v1').trim().slice(0, 16),
        artist_id: artist.id,
        year: Number(payload.year || new Date().getFullYear()),
        dimensions: String(payload.dimensions || 'Digital file').trim().slice(0, 120),
        edition: String(payload.edition || '1/1').trim().slice(0, 80),
        start_bid: payload.startBid,
        current_bid: payload.startBid,
        bid_count: 0,
        watcher_count: 0,
        ends_at: payload.endsAt || new Date(Date.now() + durationHours * 3600000).toISOString(),
        tags: parseTags(payload.tags),
        like_count: 0,
        format: String(payload.format || 'PNG / source').trim().slice(0, 80),
      })
      .select()
      .single(),
    'Artwork listing'
  );

  if (error) throw new Error(sellerErrorMessage(error));
  return data;
}

export async function createSellerCommission(payload) {
  const apiData = await devSellerApi('/api/seller-commissions', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (apiData) return apiData;

  const { data: { user } } = await withSellerTimeout(
    supabase.auth.getUser(),
    'Authentication check'
  );
  if (!user?.id) throw new Error('Authentication is required.');
  const artist = await ownedArtistFor(user.id);

  const { data, error } = await withSellerTimeout(
    supabase
      .from('commissions')
      .insert({
        id: payload.id || makeId('com'),
        artist_id: artist.id,
        title: String(payload.title || '').trim().slice(0, 140),
        slots: payload.slots,
        taken: 0,
        price: payload.price,
        days: payload.days,
        brief: String(payload.brief || '').trim().slice(0, 900) || null,
      })
      .select()
      .single(),
    'Commission board save'
  );

  if (error) throw new Error(sellerErrorMessage(error));
  return data;
}
