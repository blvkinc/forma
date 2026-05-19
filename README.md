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
```

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

If `pg_cron` is not enabled on the project, the migrations still succeed;
call `public.expire_artwork_listings()` / `public.delete_expired_feed_posts()`
from an external scheduler instead. `019` also needs Realtime enabled.

## Frontend Structure

`src/App.jsx` is now just the app shell + routing. UI is split into
`src/components/` (shared UI + global styles), `src/pages/` (one file per
view), `src/features/` (seller forms, commission/report modals), and
`src/lib/` (`catalogue` store, `ui` helpers, `domain` rules with tests).

## Development Direction

The SRS targets a production stack of Next.js 14, TypeScript, Tailwind CSS, Node.js, Prisma, PostgreSQL, Redis/BullMQ, Stripe Connect, Persona, Cloudflare R2, and a modular monolith backend. This repo now starts by making the supplied UI prototype runnable, then progressively moves toward that production architecture.
