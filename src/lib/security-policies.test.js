import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('social participation is database-gated to buyers and sellers', () => {
  const sql = read('supabase/migrations/038_social_participant_role_hardening.sql');

  assert.match(sql, /private\.is_social_participant/);
  assert.match(sql, /p\.role in \('buyer', 'artist'\)/);

  [
    'public.user_follows',
    'public.user_likes',
    'public.feed_post_likes',
    'public.feed_post_saves',
    'public.post_comments',
    'public.artwork_comments',
    'public.reports',
    'public.artwork_ai_votes',
  ].forEach((table) => assert.match(sql, new RegExp(table.replace('.', '\\.'))));
});

test('seller publishing remains gated by admin verification', () => {
  const sql = read('supabase/migrations/034_seller_onboarding_applications.sql');

  [
    'Sellers can insert own artist row',
    'Sellers can insert own artworks',
    'Sellers can insert own commissions',
    'Sellers can insert own feed posts',
  ].forEach((policyName) => assert.match(sql, new RegExp(policyName)));

  assert.match(sql, /p\.role = 'artist'\s+and p\.verified = true/);
});

test('commission booking pipeline enforces buyer, seller, and admin boundaries', () => {
  const sql = read('supabase/migrations/037_commission_booking_pipeline.sql');

  assert.match(sql, /Use a buyer account to book commission slots/);
  assert.match(sql, /Only the seller can move this commission forward/);
  assert.match(sql, /Only the buyer can accept or cancel this commission/);
  assert.match(sql, /Only admins can resolve disputed commissions/);
});

test('artwork image storage is restricted to verified sellers', () => {
  const sql = read('supabase/migrations/039_verified_seller_artwork_storage.sql');

  assert.match(sql, /private\.is_verified_seller/);
  assert.match(sql, /p\.role = 'artist'/);
  assert.match(sql, /p\.verified = true/);
  assert.match(sql, /bucket_id = 'artwork-images'/);
  assert.match(sql, /owner_id = \(select auth\.uid\(\)\)::text/);
});

test('high-risk user writes have server-side abuse rate limits', () => {
  const sql = read('supabase/migrations/040_abuse_rate_limits.sql');

  assert.match(sql, /private\.rate_limit_events/);
  assert.match(sql, /private\.assert_rate_limit/);
  assert.match(sql, /revoke all on table private\.rate_limit_events from public, anon, authenticated/);

  [
    'public.user_follows',
    'public.user_likes',
    'public.feed_post_likes',
    'public.feed_post_saves',
    'public.post_comments',
    'public.artwork_comments',
    'public.commission_messages',
    'public.reports',
    'public.artwork_ai_votes',
    'public.bids',
    'public.commission_bookings',
  ].forEach((table) => assert.match(sql, new RegExp(table.replace('.', '\\.'))));

  [
    'guard_social_signal_rate_limit',
    'guard_comment_rate_limit',
    'guard_report_rate_limit',
    'guard_ai_vote_rate_limit',
    'guard_bid_rate_limit',
    'guard_commission_booking_rate_limit',
  ].forEach((functionName) => assert.match(sql, new RegExp(`revoke execute on function public\\.${functionName}\\(\\)`)));
});

test('delivery worker uses service-only claim and completion RPCs', () => {
  const sql = read('supabase/migrations/041_delivery_worker_claims.sql');
  const worker = read('supabase/functions/delivery-worker/index.ts');

  assert.match(sql, /for update skip locked/);
  assert.match(sql, /grant execute on function public\.claim_delivery_outbox_batch\(integer\) to service_role/);
  assert.match(sql, /grant execute on function public\.complete_delivery_outbox\(uuid, boolean, text\) to service_role/);
  assert.match(sql, /attempts < 5/);
  assert.match(sql, /make_interval\(secs =>/);

  assert.match(worker, /SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SECRET_KEY|SUPABASE_SECRET_KEYS/);
  assert.match(worker, /FORMA_DELIVERY_WORKER_SECRET/);
  assert.match(worker, /RESEND_API_KEY/);
  assert.match(worker, /FORMA_WEBHOOK_SIGNING_SECRET/);
  assert.match(worker, /claim_delivery_outbox_batch/);
  assert.match(worker, /complete_delivery_outbox/);
});
