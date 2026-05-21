// ============================================================
// FORMA — Catalogue store (shared, live-binding singleton)
// App() pushes marketplace hook data here via setCatalogue();
// view components read the live bindings + lookup helpers.
// ============================================================

// Rule 1 (FR-AUC): an artwork is listed for at most one week,
// after which it is automatically taken down.
export const ARTWORK_LISTING_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
// Rule 3 (FR-SOC): feed posts disappear 5 days after posting.
export const FEED_POST_TTL_MS = 5 * 24 * 60 * 60 * 1000;

export function isArtworkActive(work, now = Date.now()) {
  if (!work) return false;
  if (!work.createdAt) return true; // legacy/demo rows without a timestamp stay visible
  const listedAt = new Date(work.createdAt).getTime();
  if (Number.isNaN(listedAt)) return true;
  return now - listedAt < ARTWORK_LISTING_WINDOW_MS;
}

export function isFeedPostFresh(post, now = Date.now()) {
  if (!post) return false;
  // Prefer the real created_at timestamp; `when` is a display string.
  const stamp = post.createdAt || post.when;
  if (!stamp) return true;
  const postedAt = new Date(stamp).getTime();
  if (Number.isNaN(postedAt)) return true;
  return now - postedAt < FEED_POST_TTL_MS;
}

// Live ES-module bindings — reassigned by setCatalogue(), so importing
// `import { ARTWORKS } from '../lib/catalogue'` always sees current data.
export let ARTISTS = [];
export let ARTWORKS = [];
export let COMMISSIONS = [];
export let FEED_POSTS = [];

export function setCatalogue(marketplace) {
  const allArtists = marketplace.artists || [];
  // Admin-suspended studios drop out of public browsing.
  ARTISTS = allArtists.filter(artist => !artist.suspended);
  const suspendedIds = new Set(allArtists.filter(a => a.suspended).map(a => a.id));
  // Rule 1: hide artworks past the one-week listing window client-side
  // (the DB migration is the authoritative takedown). Also hide
  // admin-taken-down works and works from suspended studios.
  ARTWORKS = (marketplace.artworks || []).filter(work =>
    isArtworkActive(work) && !work.takenDown && !suspendedIds.has(work.artist)
  );
  COMMISSIONS = (marketplace.commissions || []).filter(commission => !suspendedIds.has(commission.artist));
  // Rule 3: drop feed posts older than 5 days client-side.
  FEED_POSTS = (marketplace.feedPosts || []).filter(post => isFeedPostFresh(post));
}

export const artistById = (id) =>
  ARTISTS.find(a => a.id === id) ||
  { id, name: 'Unknown', handle: '?', accent: '#0E0E0C', followers: 0, verified: false };

export const artworkById = (id) =>
  ARTWORKS.find(w => w.id === id) ||
  { id, title: 'Unknown', currentBid: 0, tags: [] };

export const getTagOptions = () =>
  ['all', ...Array.from(new Set(ARTWORKS.flatMap(w => w.tags || []))).sort()];
