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

test('webhook endpoint writes are owner-bound and HTTPS-only', () => {
  const sql = read('supabase/migrations/042_webhook_endpoint_guard.sql');

  assert.match(sql, /public\.guard_webhook_endpoint_write/);
  assert.match(sql, /new\.user_id is distinct from \(select auth\.uid\(\)\)/);
  assert.match(sql, /private\.is_admin/);
  assert.match(sql, /\^https:\/\//);
  assert.match(sql, /Webhook URL credentials are not allowed/);
  assert.match(sql, /allowed_events text\[\] := array\['notification.created', '\*'\]/);
  assert.match(sql, /before insert or update on public\.webhook_endpoints/);
  assert.match(sql, /revoke execute on function public\.guard_webhook_endpoint_write\(\) from public, anon, authenticated/);
});

test('webhook event filters cover platform notification and drop events', () => {
  const sql = read('supabase/migrations/043_webhook_event_filters.sql');
  const client = read('src/lib/webhooks.js');

  [
    'drop.alert',
    'notification.created',
    'notification.outbid',
    'notification.auction_won',
    'notification.auction_closed',
    'notification.auction_paid',
    'notification.seller_approved',
    'notification.seller_rejected',
    'notification.artwork_proof_accepted',
    'notification.artwork_proof_rejected',
    'notification.commission_booked',
    'notification.commission_status',
    'notification.commission_message',
    'notification.commission_milestone',
  ].forEach((eventName) => {
    assert.match(sql, new RegExp(eventName.replace('.', '\\.')));
    assert.match(client, new RegExp(eventName.replace('.', '\\.')));
  });

  assert.match(sql, /p_event_type like 'notification\.%'/);
  assert.match(sql, /events @> array\['notification.created'\]::text\[\]/);
  assert.match(sql, /event_type := 'notification\.' \|\| new\.type/);
  assert.match(sql, /perform public\.enqueue_webhook_deliveries\(\s*'drop\.alert'/);
});

test('marketplace visibility and data invariants are enforced in the database', () => {
  const sql = read('supabase/migrations/044_marketplace_business_rule_constraints.sql');
  const catalogue = read('src/lib/catalogue.js');
  const marketplace = read('src/hooks/useMarketplace.js');

  [
    'Public can view active artists',
    'Public can view active artworks',
    'Public can view active commission boards',
    'Public can view active feed posts',
    'Admins and owners can view hidden artworks',
  ].forEach((policyName) => assert.match(sql, new RegExp(policyName)));

  assert.match(sql, /coalesce\(suspended, false\) = false/);
  assert.match(sql, /coalesce\(taken_down, false\) = false/);
  assert.match(sql, /commissions_valid_slots_price/);
  assert.match(sql, /artworks_non_negative_money_counts/);
  assert.match(sql, /bids_positive_amount/);
  assert.match(sql, /commission_messages_non_empty_body/);
  assert.match(sql, /grant select on public\.artists to anon, authenticated/);
  assert.match(sql, /grant select, insert, update, delete on public\.webhook_endpoints to authenticated/);
  assert.match(sql, /This studio is not accepting commissions/);

  assert.match(catalogue, /COMMISSIONS = \(marketplace\.commissions \|\| \[\]\)\.filter\(commission => !suspendedIds\.has\(commission\.artist\)\)/);
  assert.match(marketplace, /const \[\s*artistsData,\s*artworksData,\s*commissionsData,\s*feedData,\s*\] = await withTimeout\(Promise\.all/);
  assert.match(marketplace, /if \(!userId\) \{/);
  assert.doesNotMatch(marketplace, /if \(!userId\) \{[\s\S]{0,260}fetchArtists/);
});

test('auth signup cannot self-assign privileged roles', () => {
  const sql = read('supabase/migrations/045_auth_role_self_assignment_hardening.sql');
  const auth = read('src/contexts/AuthContext.jsx');

  assert.match(sql, /requested_role text := coalesce\(new\.raw_user_meta_data ->> 'role', 'buyer'\)/);
  assert.match(sql, /when requested_role = 'artist' then 'artist'/);
  assert.match(sql, /else 'buyer'/);
  assert.match(sql, /role, verified\)/);
  assert.match(sql, /safe_role,\s*false/s);
  assert.match(sql, /Users can insert safe own profile/);
  assert.match(sql, /role in \('buyer', 'artist'\)/);
  assert.match(sql, /verified = false/);
  assert.match(sql, /new\.role := old\.role/);
  assert.match(sql, /new\.verified := old\.verified/);

  assert.match(auth, /const SELF_SERVICE_ROLES = new Set\(\['buyer', 'artist'\]\)/);
  assert.doesNotMatch(auth, /SELF_SERVICE_ROLES = new Set\(\[[^\]]*'admin'/);
});

test('public identity cards do not expose full profile rows', () => {
  const sql = read('supabase/migrations/046_profile_privacy_cards.sql');
  const social = read('src/lib/social.js');

  assert.match(sql, /create table if not exists public\.profile_cards/);
  assert.match(sql, /grant select on public\.profile_cards to anon, authenticated/);
  assert.match(sql, /Profile cards are public/);
  assert.match(sql, /drop policy if exists "Profiles are viewable by everyone" on public\.profiles/);
  assert.match(sql, /Users can view own profile/);
  assert.match(sql, /Admins can view profiles/);
  assert.match(sql, /public\.sync_profile_card/);
  assert.doesNotMatch(sql, /profile_cards[\s\S]{0,220}email text/);

  assert.match(social, /\.from\('profile_cards'\)/);
  assert.doesNotMatch(social, /\.from\('profiles'\)/);
});

test('purchases are settlement-created, not buyer-created from the client', () => {
  const sql = read('supabase/migrations/047_disable_client_side_purchase_adapter.sql');
  const purchases = read('src/lib/purchases.js');
  const artworkView = read('src/pages/ArtworkView.jsx');
  const buyerDashboard = read('src/pages/BuyerDashboard.jsx');

  assert.match(sql, /drop policy if exists "Buyers can insert own purchase"/);
  assert.match(sql, /revoke insert, update, delete on public\.purchases from anon, authenticated/);
  assert.match(sql, /purchases_non_negative_amount/);

  assert.match(purchases, /Purchases are created only after an auction invoice is marked paid/);
  assert.doesNotMatch(purchases, /\.from\('purchases'\)[\s\S]{0,240}\.upsert/);
  assert.doesNotMatch(artworkView, /Record acquisition|prototype acquisition|Checkout adapter/);
  assert.doesNotMatch(buyerDashboard, /prototype checkout|checkout adapter|prototype acquisition/i);
});
