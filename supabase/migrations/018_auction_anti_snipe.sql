-- ============================================================
-- FORMA — Slice 4 / FR-AUC-004: anti-snipe (dedupe fix)
--
-- NOTE: anti-snipe was ALREADY enforced server-side by
-- public.handle_anti_snipe() + trigger on_bid_anti_snipe in
-- 004_commissions_auctions.sql (it also logs to
-- public.auction_extensions). An earlier revision of this file
-- ALSO added a +5m extension inside handle_new_bid(), which would
-- double-extend (+10m) on a sniped bid.
--
-- This migration restores handle_new_bid() to NOT touch ends_at,
-- leaving 004's dedicated trigger as the single anti-snipe path.
-- Safe to re-run (create or replace).
-- Run after 017_feed_post_ttl.sql.
-- ============================================================

create or replace function public.handle_new_bid()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  update public.artworks
  set current_bid = greatest(current_bid, new.amount),
      bid_count = bid_count + 1
  where id = new.artwork_id;
  return new;
end;
$$;

-- public.handle_anti_snipe() (migration 004) remains the authoritative
-- anti-snipe enforcement and continues to write public.auction_extensions.
