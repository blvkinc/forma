// ============================================================
// FORMA — domain.js unit tests (Node built-in runner, no deps)
// Run with: npm test   (node --test)
// Asserts SRS acceptance rules and SQL parity for bid math.
// ============================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  minimumBidIncrement, minimumNextBid, validateBid,
  shouldExtendAuction, extendedEndTime, canRetractBid,
  isValidAuctionDuration, AUCTION_DURATION,
  auctionBuyerPremium, auctionTotalCost,
  commissionPlatformFee, commissionArtistPayout,
  canTransition, nextStates, isTerminalState,
  isPayoutEligible, PAYOUT_MINIMUM,
} from './domain.js';

// ---- FR-AUC-003: bid increment = max($20, 5%), 2 sig figs ----
test('minimumBidIncrement floors at $20 for small bids', () => {
  assert.equal(minimumBidIncrement(0), 20);
  assert.equal(minimumBidIncrement(100), 20);   // 5% = 5 → floor 20
  assert.equal(minimumBidIncrement(400), 20);   // 5% = 20 → 20
});

test('minimumBidIncrement uses 5% above the floor, 2 sig figs', () => {
  assert.equal(minimumBidIncrement(1000), 50);  // 5% = 50
  assert.equal(minimumBidIncrement(2000), 100); // 5% = 100
  assert.equal(minimumBidIncrement(1450), 73);  // 5% = 72.5 → 73 (2 sig figs, ceil)
});

test('minimumNextBid adds the increment to the current bid', () => {
  assert.equal(minimumNextBid(1000), 1050);
  assert.equal(minimumNextBid(100), 120);
});

test('validateBid enforces the minimum next bid', () => {
  assert.deepEqual(validateBid(1050, 1000), { valid: true, error: null });
  const low = validateBid(1010, 1000);
  assert.equal(low.valid, false);
  assert.match(low.error, /at least/);
});

// ---- SQL PARITY (supabase/migrations/010_harden_auction_bidding.sql) ----
// The DB trigger public.minimum_next_bid() is the authoritative server-side
// guard. domain.js MUST stay numerically identical to it. This re-implements
// the SQL algorithm verbatim and asserts the JS helper matches across a sweep.
test('minimumNextBid matches the SQL minimum_next_bid() formula', () => {
  const sqlMinimumNextBid = (current) => {
    const raw = Math.max(20, (current || 0) * 0.05);
    if (raw === 0) return (current || 0) + 20;
    const magnitude = Math.pow(10, Math.floor(Math.log10(raw)) - 1);
    return (current || 0) + Math.ceil(raw / magnitude) * magnitude;
  };
  for (const bid of [0, 20, 50, 100, 250, 399, 400, 750, 1000, 1450, 2000, 9999, 25000]) {
    assert.equal(minimumNextBid(bid), sqlMinimumNextBid(bid), `bid=${bid}`);
  }
});

// ---- FR-AUC-004: anti-snipe — last 5 min extends by 5 min ----
test('shouldExtendAuction only inside the final 5 minutes', () => {
  assert.equal(shouldExtendAuction(4 * 60 * 1000), true);
  assert.equal(shouldExtendAuction(6 * 60 * 1000), false);
  assert.equal(shouldExtendAuction(0), false);
});

test('extendedEndTime adds 5 minutes when sniped', () => {
  assert.equal(extendedEndTime(4 * 60 * 1000), 4 * 60 * 1000 + 5 * 60 * 1000);
  assert.equal(extendedEndTime(10 * 60 * 1000), 10 * 60 * 1000); // unchanged
});

// ---- FR-AUC-006: retraction rules ----
test('canRetractBid needs >12h left and <3 retractions/90d', () => {
  const thirteenHours = 13 * 60 * 60 * 1000;
  const tenHours = 10 * 60 * 60 * 1000;
  assert.equal(canRetractBid(thirteenHours, 0), true);
  assert.equal(canRetractBid(tenHours, 0), false);
  assert.equal(canRetractBid(thirteenHours, 3), false);
});

// ---- FR-AUC-002: duration 24h–7d ----
test('isValidAuctionDuration enforces the 24h–168h window', () => {
  assert.equal(isValidAuctionDuration(AUCTION_DURATION.MIN_HOURS), true);
  assert.equal(isValidAuctionDuration(AUCTION_DURATION.MAX_HOURS), true);
  assert.equal(isValidAuctionDuration(23), false);
  assert.equal(isValidAuctionDuration(169), false);
});

// ---- FR-PAY-002 / FR-PAY-007: fee math ----
test('auction buyer premium tiers', () => {
  assert.equal(auctionBuyerPremium(1000), 120);                 // default 12%
  assert.equal(auctionBuyerPremium(1000, 'AUCTION_VERIFIED'), 100);
  assert.equal(auctionBuyerPremium(1000, 'AUCTION_RESIDENT'), 80);
  assert.equal(auctionTotalCost(1000), 1120);
});

test('commission 15% platform fee and artist payout', () => {
  assert.equal(commissionPlatformFee(300), 45);
  assert.equal(commissionArtistPayout(300), 255);
});

// ---- FR-COM-004: commission lifecycle ----
test('commission state machine transitions', () => {
  assert.equal(canTransition('BOOKED', 'BRIEFED'), true);
  assert.equal(canTransition('BOOKED', 'DELIVERED'), false);
  assert.equal(canTransition('ACCEPTED', 'DISPUTED'), false);
  assert.deepEqual(nextStates('DELIVERED'), ['ACCEPTED', 'DISPUTED']);
  assert.equal(isTerminalState('ACCEPTED'), true);
  assert.equal(isTerminalState('IN_PROGRESS'), false);
});

// ---- FR-PAY-005: payout minimum ----
test('isPayoutEligible respects the $50 minimum', () => {
  assert.equal(isPayoutEligible(PAYOUT_MINIMUM), true);
  assert.equal(isPayoutEligible(49.99), false);
});
