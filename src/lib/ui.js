// ============================================================
// FORMA — Shared UI helpers & constants (extracted from App.jsx)
// ============================================================
import ART_VISUALS from '../data/visuals';

export const formatTime = (ms) => {
  if (!Number.isFinite(ms) || ms <= 0) return 'ENDED';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  if (h > 24) return `${Math.floor(h/24)}D ${h%24}H`;
  if (h > 0) return `${h}H ${String(m).padStart(2,'0')}M`;
  return `${String(m).padStart(2,'0')}M ${String(s).padStart(2,'0')}S`;
};

export const fmt = (n) => n.toLocaleString('en-US');

export const relativeTime = (iso) => {
  if (!iso) return 'unknown';
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.max(0, Math.floor(diff / 60000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

export const normalizeText = (value) => String(value || '').toLowerCase().trim();

export const ROLE_LABELS = {
  guest: 'Guest',
  buyer: 'Buyer',
  artist: 'Seller',
  admin: 'Admin',
};
export const roleLabel = (role) => ROLE_LABELS[role] || 'Buyer';
export const isGuestRole = (role) => role === 'guest';
export const isBuyerRole = (role) => role === 'buyer';
export const isSellerRole = (role) => role === 'artist';
export const isAdminRole = (role) => role === 'admin';
export const isSocialParticipantRole = (role) => isBuyerRole(role) || isSellerRole(role);
export const roleHomeView = (role) => {
  if (isSellerRole(role)) return 'studio';
  if (isAdminRole(role)) return 'admin';
  return 'dashboard';
};
export const roleHomeLabel = (role) => {
  if (isSellerRole(role)) return 'Seller studio';
  if (isAdminRole(role)) return 'Admin console';
  return 'Buyer dashboard';
};

export const VISUAL_OPTIONS = Object.keys(ART_VISUALS);
export const ACCENT_SWATCHES = ['#0E0E0C', '#E97864', '#B9C69A', '#6E8D8A', '#D2BE76', '#748D60'];
export const REPORT_REASONS = [
  { id: 'copyright', label: 'Copyright or stolen work' },
  { id: 'fraud', label: 'Fraud or payment risk' },
  { id: 'misleading', label: 'Misleading listing' },
  { id: 'abuse', label: 'Abuse or harassment' },
  { id: 'prohibited', label: 'Prohibited content' },
  { id: 'other', label: 'Other' },
];

export const AUTHENTICITY_COPY = {
  clear: { label: 'Community clear', tone: 'neutral', body: 'No AI-authenticity flags are active on this listing.' },
  under_review: { label: 'Community review', tone: 'warn', body: 'Community members requested process proof from the artist.' },
  restricted: { label: 'Bidding paused', tone: 'danger', body: 'AI review threshold reached. The artist must submit process proof to restore bidding.' },
  proof_pending: { label: 'Proof submitted', tone: 'proof', body: 'The artist submitted process proof. The listing is restored while evidence is reviewed.' },
  verified: { label: 'Proof verified', tone: 'good', body: 'Process proof has been accepted for this listing.' },
};
export const authenticityMeta = (status = 'clear') => AUTHENTICITY_COPY[status] || AUTHENTICITY_COPY.clear;

export const PRICE_BANDS = [
  { id: 'all', label: 'All prices', match: () => true },
  { id: 'under250', label: 'Under $250', match: (work) => work.currentBid < 250 },
  { id: '250-750', label: '$250-$750', match: (work) => work.currentBid >= 250 && work.currentBid <= 750 },
  { id: 'over750', label: 'Over $750', match: (work) => work.currentBid > 750 },
];

export const APP_VIEWS = new Set([
  'home', 'explore', 'artwork', 'artist', 'commissions', 'commission-booking',
  'feed', 'artists', 'profile', 'dashboard', 'studio', 'admin',
  'terms', 'privacy', 'trust', 'api', 'verify', 'auth',
]);

// Views that guests may browse without an account. Everything else routes
// through the sign-in page until a session exists.
export const PUBLIC_VIEWS = new Set([
  'home', 'explore', 'artwork', 'artist', 'commissions', 'feed', 'artists',
  'terms', 'privacy', 'trust', 'api', 'auth',
]);

// Hashes are `#view` or `#view/entityId` (e.g. `#artwork/aw1`) so artwork
// and artist pages survive reloads and can be shared as links.
export const viewFromHash = () => {
  if (typeof window === 'undefined') return 'home';
  const hashView = window.location.hash.replace(/^#\/?/, '').split('/')[0];
  return APP_VIEWS.has(hashView) ? hashView : 'home';
};

export const entityIdFromHash = () => {
  if (typeof window === 'undefined') return null;
  const parts = window.location.hash.replace(/^#\/?/, '').split('/');
  return parts.length > 1 && parts[1] ? decodeURIComponent(parts[1]) : null;
};
