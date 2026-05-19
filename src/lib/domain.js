// ============================================================
// FORMA — Domain Helpers
// Bid rules, fee math, anti-snipe, commission lifecycle
// Per SRS requirements FR-AUC-*, FR-COM-*, FR-PAY-*
// ============================================================

// -------------------------------------------------
// Auction: Bid Increment (FR-AUC-003)
// Minimum bid increment = max($20, 5% of current top bid)
// rounded to 2 significant figures.
//
// SINGLE SOURCE OF TRUTH: this formula is mirrored server-side by
// public.minimum_next_bid() in
// supabase/migrations/010_harden_auction_bidding.sql, which is the
// authoritative guard enforced by a BEFORE INSERT trigger on bids.
// If you change the math here, change it there too. The parity test
// in domain.test.js ("matches the SQL minimum_next_bid() formula")
// fails the build if the two drift apart.
// -------------------------------------------------
export function minimumBidIncrement(currentBid) {
  const percentBased = currentBid * 0.05;
  const raw = Math.max(20, percentBased);
  // Round to 2 significant figures
  if (raw === 0) return 20;
  const magnitude = Math.pow(10, Math.floor(Math.log10(raw)) - 1);
  return Math.ceil(raw / magnitude) * magnitude;
}

export function minimumNextBid(currentBid) {
  return currentBid + minimumBidIncrement(currentBid);
}

export function validateBid(amount, currentBid) {
  const minNext = minimumNextBid(currentBid);
  if (amount < minNext) {
    return { valid: false, error: `Bid must be at least $${minNext.toLocaleString('en-US')}` };
  }
  return { valid: true, error: null };
}

// -------------------------------------------------
// Auction: Anti-Snipe (FR-AUC-004)
// Any bid in the final 5 minutes extends end time by 5 minutes.
// Extensions may repeat without limit.
// -------------------------------------------------
const ANTI_SNIPE_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const ANTI_SNIPE_EXTENSION_MS = 5 * 60 * 1000;

export function shouldExtendAuction(endsAtMs) {
  return endsAtMs > 0 && endsAtMs <= ANTI_SNIPE_WINDOW_MS;
}

export function extendedEndTime(currentEndsAtMs) {
  if (!shouldExtendAuction(currentEndsAtMs)) return currentEndsAtMs;
  return currentEndsAtMs + ANTI_SNIPE_EXTENSION_MS;
}

// -------------------------------------------------
// Auction: Bid Retraction Rules (FR-AUC-006)
// Retraction allowed if (a) auction has >12h remaining
// and (b) artist not notified. Capped at 3 per 90 days.
// -------------------------------------------------
const RETRACTION_MIN_TIME_MS = 12 * 60 * 60 * 1000; // 12 hours

export function canRetractBid(auctionEndsAtMs, retractionsInLast90Days) {
  if (auctionEndsAtMs <= RETRACTION_MIN_TIME_MS) return false;
  if (retractionsInLast90Days >= 3) return false;
  return true;
}

// -------------------------------------------------
// Auction: Duration Rules (FR-AUC-002)
// Default 5 days, configurable 24h–7d.
// -------------------------------------------------
export const AUCTION_DURATION = {
  MIN_HOURS: 24,
  MAX_HOURS: 168, // 7 days
  DEFAULT_HOURS: 120, // 5 days
};

export function isValidAuctionDuration(hours) {
  return hours >= AUCTION_DURATION.MIN_HOURS && hours <= AUCTION_DURATION.MAX_HOURS;
}

// -------------------------------------------------
// Auction: Status helpers
// -------------------------------------------------
export function auctionStatus(endsAtMs, bidCount) {
  if (endsAtMs <= 0) return bidCount > 0 ? 'SOLD' : 'ENDED_NO_SALE';
  if (endsAtMs <= ANTI_SNIPE_WINDOW_MS) return 'ENDING_SOON';
  if (endsAtMs <= 60 * 60 * 1000) return 'FINAL_HOUR';
  return 'LIVE';
}

export function auctionUrgency(endsAtMs) {
  if (endsAtMs <= 0) return 'ended';
  if (endsAtMs <= 5 * 60 * 1000) return 'critical';  // < 5 min
  if (endsAtMs <= 60 * 60 * 1000) return 'urgent';    // < 1 hour
  if (endsAtMs <= 3 * 60 * 60 * 1000) return 'warm';  // < 3 hours
  return 'normal';
}

// -------------------------------------------------
// Fee Math (FR-PAY-002, FR-PAY-007)
// Auction: 12% buyer's premium (default), 10% verified, 8% resident
// Commission: 15% platform fee
// -------------------------------------------------
export const FEE_TIERS = {
  AUCTION_DEFAULT: 0.12,
  AUCTION_VERIFIED: 0.10,
  AUCTION_RESIDENT: 0.08,
  COMMISSION: 0.15,
};

export function auctionBuyerPremium(bidAmount, tier = 'AUCTION_DEFAULT') {
  const rate = FEE_TIERS[tier] || FEE_TIERS.AUCTION_DEFAULT;
  return Math.round(bidAmount * rate * 100) / 100;
}

export function auctionTotalCost(bidAmount, tier = 'AUCTION_DEFAULT') {
  return bidAmount + auctionBuyerPremium(bidAmount, tier);
}

export function commissionPlatformFee(price) {
  return Math.round(price * FEE_TIERS.COMMISSION * 100) / 100;
}

export function commissionArtistPayout(price) {
  return price - commissionPlatformFee(price);
}

export function artistPayoutFromAuction(salePrice, tier = 'AUCTION_DEFAULT') {
  // Artist receives the hammer price (buyer premium goes to platform)
  return salePrice;
}

// -------------------------------------------------
// Commission Lifecycle States (FR-COM-004)
// BOOKED → BRIEFED → IN_PROGRESS → REVIEW → DELIVERED → ACCEPTED
// DISPUTED can branch from any stage after BOOKED
// -------------------------------------------------
export const COMMISSION_STATES = {
  BOOKED: 'BOOKED',
  BRIEFED: 'BRIEFED',
  IN_PROGRESS: 'IN_PROGRESS',
  REVIEW: 'REVIEW',
  DELIVERED: 'DELIVERED',
  ACCEPTED: 'ACCEPTED',
  DISPUTED: 'DISPUTED',
  CANCELLED: 'CANCELLED',
};

const STATE_TRANSITIONS = {
  BOOKED: ['BRIEFED', 'DISPUTED', 'CANCELLED'],
  BRIEFED: ['IN_PROGRESS', 'DISPUTED', 'CANCELLED'],
  IN_PROGRESS: ['REVIEW', 'DISPUTED'],
  REVIEW: ['IN_PROGRESS', 'DELIVERED', 'DISPUTED'],
  DELIVERED: ['ACCEPTED', 'DISPUTED'],
  ACCEPTED: [], // terminal
  DISPUTED: ['IN_PROGRESS', 'CANCELLED'], // resolved by admin
  CANCELLED: [], // terminal
};

export function canTransition(currentState, targetState) {
  return (STATE_TRANSITIONS[currentState] || []).includes(targetState);
}

export function nextStates(currentState) {
  return STATE_TRANSITIONS[currentState] || [];
}

export function isTerminalState(state) {
  return state === COMMISSION_STATES.ACCEPTED || state === COMMISSION_STATES.CANCELLED;
}

export function stateLabel(state) {
  const labels = {
    BOOKED: 'Booked',
    BRIEFED: 'Briefed',
    IN_PROGRESS: 'In progress',
    REVIEW: 'Under review',
    DELIVERED: 'Delivered',
    ACCEPTED: 'Accepted',
    DISPUTED: 'Disputed',
    CANCELLED: 'Cancelled',
  };
  return labels[state] || state;
}

export function stateColor(state) {
  const colors = {
    BOOKED: '#FFB200',
    BRIEFED: '#1A4FFF',
    IN_PROGRESS: '#0E7C3A',
    REVIEW: '#FF8A00',
    DELIVERED: '#0E7C3A',
    ACCEPTED: '#0E0E0C',
    DISPUTED: '#FF3B1F',
    CANCELLED: '#9C988A',
  };
  return colors[state] || '#9C988A';
}

// -------------------------------------------------
// Payout Rules (FR-PAY-005)
// Weekly on Mondays at 09:00 UTC, minimum $50
// -------------------------------------------------
export const PAYOUT_MINIMUM = 50;
export const PAYOUT_DAY = 1; // Monday

export function isPayoutEligible(balance) {
  return balance >= PAYOUT_MINIMUM;
}

export function nextPayoutDate() {
  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  const daysUntilMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek);
  const next = new Date(now);
  next.setUTCDate(now.getUTCDate() + daysUntilMonday);
  next.setUTCHours(9, 0, 0, 0);
  return next;
}

// -------------------------------------------------
// Notification Types (FR-NOT-003, FR-NOT-004)
// -------------------------------------------------
export const NOTIFICATION_TYPES = {
  // Auction
  OUTBID: 'outbid',
  ENDING_1H: 'ending_1h',
  ENDING_10M: 'ending_10m',
  WON: 'won',
  LOST: 'lost',
  // Commission
  COMMISSION_BOOKED: 'commission_booked',
  BRIEF_RECEIVED: 'brief_received',
  MILESTONE_UPLOADED: 'milestone_uploaded',
  DELIVERY_POSTED: 'delivery_posted',
  DISPUTE_OPENED: 'dispute_opened',
  REFUND_ISSUED: 'refund_issued',
};

// -------------------------------------------------
// Format helpers
// -------------------------------------------------
export function formatPrice(amount) {
  return `$${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function formatPriceDetailed(amount) {
  return `$${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatCountdown(ms) {
  if (ms <= 0) return 'ENDED';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  if (h > 24) return `${Math.floor(h / 24)}D ${h % 24}H`;
  if (h > 0) return `${h}H ${String(m).padStart(2, '0')}M`;
  return `${String(m).padStart(2, '0')}M ${String(s).padStart(2, '0')}S`;
}
