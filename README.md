# FORMA

FORMA is a digital art marketplace prototype based on the SRS in `forma-srs-dev-plan.docx`. The current app focuses on the visible marketplace experience: auctions, artist profiles, commissions, social feed, buyer dashboard, artist studio, and admin console.

## Current Status

- Source SRS: `forma-srs-dev-plan.docx`
- Original visual prototype: `digital-art-platform.jsx`
- Runnable app entry: `src/App.jsx`
- SRS-driven work plan: `docs/work-plan.md`

## Run Locally

```bash
npm install
npm run dev
```

Then open the local Vite URL printed in the terminal.

## Useful Commands

```bash
npm run build
npm run preview
npm test          # domain rules + SQL-parity unit tests (node --test)
npm run qa:smoke  # Supabase production-readiness smoke checks
npm run qa:bootstrap # create/reuse buyer + verified seller QA accounts
```

`npm run qa:smoke` always checks public catalogue reads, anonymous write
blocks, and whether the live project has enough QA activity rows for full
E2E. To test authenticated role flows, set the relevant environment variables
before running it, or place them in an ignored `.env.qa.local` file:

```bash
QA_BUYER_EMAIL="buyer@example.com"
QA_BUYER_PASSWORD="..."
QA_SELLER_EMAIL="seller@example.com"
QA_SELLER_PASSWORD="..."
QA_ADMIN_EMAIL="admin@example.com"
QA_ADMIN_PASSWORD="..."
QA_ALLOW_PERSISTENT_WRITES=false # true only in QA/staging to test reports + commission bookings
npm run qa:smoke
```

The smoke runner avoids payment flows. Buyer social/AI actions are cleaned up
after the check. Verified seller feed and storage checks are also cleaned up.
Reports and commission bookings are persistent by design, so those checks only
run when `QA_ALLOW_PERSISTENT_WRITES=true`.

If you already have a verified admin account, `npm run qa:bootstrap` can fill
the remaining buyer/seller QA credentials. Run it with `QA_ADMIN_EMAIL` and
`QA_ADMIN_PASSWORD` in the environment. It signs up a buyer and seller, submits
the seller onboarding packet, approves it through the admin session, and writes
the generated buyer/seller credentials to ignored `.env.qa.local`.
When Supabase Auth email confirmation or rate limits block public signup, the
script can seed only `forma.qa.*` users directly through Postgres. For local
machines without IPv6 database access, set `SUPABASE_DB_URL` to the IPv4
pooler connection string from Supabase Database settings before running it.

## Marketplace Rules (DB-enforced)

Apply `supabase/migrations/*.sql` in order. The latest three add:

- `015_artwork_listing_window.sql` — artworks are auto-taken-down one week
  after listing (hidden via RLS immediately, `pg_cron` flips them inactive).
- `016_artwork_authenticity_seal.sql` — every artwork gets a unique SHA-256
  authenticity hash in `artwork_authenticity_seal`, readable only by the
  owning artist and the buyer (new `purchases` table records ownership).
- `017_feed_post_ttl.sql` — feed posts are hidden after 5 days and hard-
  deleted by an hourly `pg_cron` job.

Later migrations add:

- `018_auction_anti_snipe.sql` — keeps the single anti-snipe path (the
  dedicated trigger from `004`) and prevents double-extension.
- `019_realtime_bid_stream.sql` — publishes `bids`/`artworks` on
  Supabase Realtime for the live bid stream.
- `020_feed_post_comments.sql` — real comments on feed posts.
- `021_admin_queues.sql` — admin RLS for KYC + dispute triage and an
  append-only `audit_log` fed by triggers.
- `022_artwork_comments.sql` — real comments on the artwork detail page.

Additional production-readiness migrations add:

- `038_social_participant_role_hardening.sql` - buyers and sellers can create
  social/community signals; admins stay review-only.
- `039_verified_seller_artwork_storage.sql` - only admin-verified sellers can
  write to the `artwork-images` bucket.
- `040_abuse_rate_limits.sql` - server-side rate limits for social signals,
  comments/messages, reports, AI votes, bids, and commission bookings.
- `041_delivery_worker_claims.sql` - service-role RPCs for claiming and
  completing delivery outbox rows with retry/backoff.
- `042_webhook_endpoint_guard.sql` - validates webhook endpoint ownership,
  HTTPS URLs, and supported event filters.
- `043_webhook_event_filters.sql` - adds specific webhook event filters for
  auction, commission, social, seller-review, AI-proof, and drop-alert events.
- `044_marketplace_business_rule_constraints.sql` - enforces public marketplace
  visibility in RLS, adds explicit Data API grants, and protects money/count/
  slot/content invariants.
- `045_auth_role_self_assignment_hardening.sql` - prevents user-controlled auth
  metadata or profile inserts from self-assigning admin/verified roles.
- `046_profile_privacy_cards.sql` - removes public full-profile reads and
  exposes only limited public profile cards for social display.
- `047_disable_client_side_purchase_adapter.sql` - disables buyer-created
  purchase rows so acquisitions are settlement/payment-created only.
- `048_seller_application_media_and_links.sql` - adds private seller
  onboarding media uploads, profile links, and richer admin review packets.

For staging QA, run `supabase/fixtures/production_readiness_seed.sql` after the
migrations if the live project has empty feed/admin/social queues. It creates
fresh Supabase-backed QA activity without local mock data. If feed rows exist
but seller applications, reports, or AI votes are still empty, run the focused
`supabase/fixtures/production_readiness_missing_queues.sql` fixture next.

If `pg_cron` is not enabled on the project, the migrations still succeed;
call `public.expire_artwork_listings()` / `public.delete_expired_feed_posts()`
from an external scheduler instead. `019` also needs Realtime enabled.

## Delivery Worker

`supabase/functions/delivery-worker/index.ts` consumes `delivery_outbox` rows
for email and webhook delivery. Deploy it after migration `041` is applied:

```bash
supabase secrets set FORMA_DELIVERY_WORKER_SECRET="long-random-secret"
supabase secrets set FORMA_WEBHOOK_SIGNING_SECRET="long-random-secret"
supabase secrets set RESEND_API_KEY="re_..." FORMA_EMAIL_FROM="FORMA <notifications@example.com>"
supabase functions deploy delivery-worker --use-api
```

Invoke it from a scheduler with `POST /functions/v1/delivery-worker`, passing
`X-Forma-Worker-Secret` matching `FORMA_DELIVERY_WORKER_SECRET`. If the
function keeps Supabase JWT verification enabled, also pass the project
publishable/anon key as the normal function authorization header; if you deploy
with JWT verification disabled, the worker secret remains the protection layer.
Email rows require Resend configuration; webhook rows are signed when
`FORMA_WEBHOOK_SIGNING_SECRET` is set.

## Frontend Structure

`src/App.jsx` is now just the app shell + routing. UI is split into
`src/components/` (shared UI + global styles), `src/pages/` (one file per
view), `src/features/` (seller forms, commission/report modals), and
`src/lib/` (`catalogue` store, `ui` helpers, `domain` rules with tests).

## Development Direction

The SRS targets a production stack of Next.js 14, TypeScript, Tailwind CSS, Node.js, Prisma, PostgreSQL, Redis/BullMQ, Stripe Connect, Persona, Cloudflare R2, and a modular monolith backend. This repo now starts by making the supplied UI prototype runnable, then progressively moves toward that production architecture.
