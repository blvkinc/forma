-- ============================================================
-- FORMA - security and performance hardening
-- Hides SECURITY DEFINER trigger/helper functions from public RPC,
-- moves the reusable admin predicate out of the exposed schema, and
-- adds missing foreign-key indexes flagged by Supabase advisors.
-- Run after 022_artwork_comments.sql.
-- ============================================================

-- Private helper schema: usable by RLS policies, not exposed by PostgREST.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'
  );
$$;

revoke all on function private.is_admin() from public, anon;
grant execute on function private.is_admin() to authenticated;

-- Recreate admin policies against the private helper.
drop policy if exists "Admins can update any profile" on public.profiles;
create policy "Admins can update any profile"
  on public.profiles
  as permissive
  for update
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

drop policy if exists "Admins can view all bookings" on public.commission_bookings;
create policy "Admins can view all bookings"
  on public.commission_bookings
  as permissive
  for select
  to authenticated
  using ((select private.is_admin()));

drop policy if exists "Admins can update any booking" on public.commission_bookings;
create policy "Admins can update any booking"
  on public.commission_bookings
  as permissive
  for update
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

drop policy if exists "Admins can view all messages" on public.commission_messages;
create policy "Admins can view all messages"
  on public.commission_messages
  as permissive
  for select
  to authenticated
  using ((select private.is_admin()));

drop policy if exists "Admins can read audit log" on public.audit_log;
create policy "Admins can read audit log"
  on public.audit_log
  as permissive
  for select
  to authenticated
  using ((select private.is_admin()));

drop function if exists public.is_admin();

-- These rows are written by SECURITY DEFINER triggers. A client-facing
-- always-true INSERT policy is unnecessary and creates a public write path.
drop policy if exists "System can append audit log" on public.audit_log;
drop policy if exists "System can insert notifications" on public.notifications;

-- Helper function search_path hardening.
alter function public.minimum_next_bid(numeric) set search_path = '';

-- SECURITY DEFINER functions should not be callable through /rpc.
revoke execute on function public.audit_booking_change() from public, anon, authenticated;
revoke execute on function public.audit_profile_verification() from public, anon, authenticated;
revoke execute on function public.audit_report_change() from public, anon, authenticated;
revoke execute on function public.delete_expired_feed_posts() from public, anon, authenticated;
revoke execute on function public.expire_artwork_listings() from public, anon, authenticated;
revoke execute on function public.guard_profile_self_update() from public, anon, authenticated;
revoke execute on function public.handle_anti_snipe() from public, anon, authenticated;
revoke execute on function public.handle_artwork_ai_proof_submitted() from public, anon, authenticated;
revoke execute on function public.handle_artwork_ai_vote_change() from public, anon, authenticated;
revoke execute on function public.handle_commission_booking() from public, anon, authenticated;
revoke execute on function public.handle_follow_change() from public, anon, authenticated;
revoke execute on function public.handle_like_change() from public, anon, authenticated;
revoke execute on function public.handle_new_bid() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.handle_post_comment_change() from public, anon, authenticated;
revoke execute on function public.handle_watch_change() from public, anon, authenticated;
revoke execute on function public.issue_artwork_authenticity_seal() from public, anon, authenticated;
revoke execute on function public.refresh_artwork_ai_vote_count(text) from public, anon, authenticated;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
revoke execute on function public.set_artwork_listing_window() from public, anon, authenticated;
revoke execute on function public.validate_bid_before_insert() from public, anon, authenticated;

alter default privileges in schema public
  revoke execute on functions from public, anon, authenticated;

-- Foreign-key indexes.
create index if not exists artists_profile_id_idx
  on public.artists (profile_id);
create index if not exists artwork_ai_proofs_artist_id_idx
  on public.artwork_ai_proofs (artist_id);
create index if not exists artwork_ai_proofs_reviewed_by_idx
  on public.artwork_ai_proofs (reviewed_by);
create index if not exists artwork_ai_proofs_submitted_by_idx
  on public.artwork_ai_proofs (submitted_by);
create index if not exists artwork_comments_user_id_idx
  on public.artwork_comments (user_id);
create index if not exists artworks_artist_id_idx
  on public.artworks (artist_id);
create index if not exists auction_extensions_artwork_id_idx
  on public.auction_extensions (artwork_id);
create index if not exists auction_extensions_bid_id_idx
  on public.auction_extensions (bid_id);
create index if not exists commission_bookings_artist_id_idx
  on public.commission_bookings (artist_id);
create index if not exists commission_bookings_buyer_id_idx
  on public.commission_bookings (buyer_id);
create index if not exists commission_bookings_commission_id_idx
  on public.commission_bookings (commission_id);
create index if not exists commission_messages_booking_id_idx
  on public.commission_messages (booking_id);
create index if not exists commission_messages_sender_id_idx
  on public.commission_messages (sender_id);
create index if not exists commissions_artist_id_idx
  on public.commissions (artist_id);
create index if not exists feed_posts_artist_id_idx
  on public.feed_posts (artist_id);
create index if not exists feed_posts_artwork_id_idx
  on public.feed_posts (artwork_id);
create index if not exists notifications_user_id_idx
  on public.notifications (user_id);
create index if not exists post_comments_user_id_idx
  on public.post_comments (user_id);
create index if not exists reports_reporter_id_idx
  on public.reports (reporter_id);
create index if not exists reports_reviewed_by_idx
  on public.reports (reviewed_by);
create index if not exists user_follows_artist_id_idx
  on public.user_follows (artist_id);
create index if not exists user_likes_artwork_id_idx
  on public.user_likes (artwork_id);
create index if not exists user_watchlist_artwork_id_idx
  on public.user_watchlist (artwork_id);
