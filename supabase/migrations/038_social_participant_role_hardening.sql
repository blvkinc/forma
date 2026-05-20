-- ============================================================
-- FORMA - social participant role hardening
-- Buyers and sellers participate in social/community actions.
-- Admins moderate through admin queues and should not create
-- follows, likes, saves, comments, reports, or AI-review votes.
-- Run after 037_commission_booking_pipeline.sql.
-- ============================================================

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.is_social_participant()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role in ('buyer', 'artist')
  );
$$;

revoke all on function private.is_social_participant() from public, anon;
grant execute on function private.is_social_participant() to authenticated;

-- Studio follows.
drop policy if exists "Authenticated users can insert own follows" on public.user_follows;
drop policy if exists "Buyers and sellers can insert own follows" on public.user_follows;
create policy "Buyers and sellers can insert own follows"
  on public.user_follows
  for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and (select private.is_social_participant())
  );

-- Artwork likes.
drop policy if exists "Authenticated users can insert own artwork likes" on public.user_likes;
drop policy if exists "Buyers and sellers can insert own artwork likes" on public.user_likes;
create policy "Buyers and sellers can insert own artwork likes"
  on public.user_likes
  for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and (select private.is_social_participant())
  );

-- Feed reactions and saves.
drop policy if exists "Users can insert own feed likes" on public.feed_post_likes;
drop policy if exists "Buyers and sellers can insert own feed likes" on public.feed_post_likes;
create policy "Buyers and sellers can insert own feed likes"
  on public.feed_post_likes
  for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and (select private.is_social_participant())
  );

drop policy if exists "Users can insert own saved posts" on public.feed_post_saves;
drop policy if exists "Buyers and sellers can insert own saved posts" on public.feed_post_saves;
create policy "Buyers and sellers can insert own saved posts"
  on public.feed_post_saves
  for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and (select private.is_social_participant())
  );

-- Feed and artwork comments.
drop policy if exists "Users can insert own comment" on public.post_comments;
drop policy if exists "Buyers and sellers can insert own feed comments" on public.post_comments;
create policy "Buyers and sellers can insert own feed comments"
  on public.post_comments
  for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and (select private.is_social_participant())
  );

drop policy if exists "Users can insert own artwork comment" on public.artwork_comments;
drop policy if exists "Buyers and sellers can insert own artwork comments" on public.artwork_comments;
create policy "Buyers and sellers can insert own artwork comments"
  on public.artwork_comments
  for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and (select private.is_social_participant())
  );

-- Trust and safety reports are user signals; admin decisions happen via
-- the report-review update policies.
drop policy if exists "Users can insert own reports" on public.reports;
drop policy if exists "Buyers and sellers can insert own reports" on public.reports;
create policy "Buyers and sellers can insert own reports"
  on public.reports
  for insert
  to authenticated
  with check (
    (select auth.uid()) = reporter_id
    and (select private.is_social_participant())
  );

-- AI-review votes. Keep the owner exclusion on both insert and update so a
-- seller cannot move an existing vote onto their own artwork.
drop policy if exists "Buyers and sellers can insert own AI votes" on public.artwork_ai_votes;
create policy "Buyers and sellers can insert own AI votes"
  on public.artwork_ai_votes
  for insert
  to authenticated
  with check (
    voter_id = (select auth.uid())
    and (select private.is_social_participant())
    and not exists (
      select 1
      from public.artworks w
      join public.artists a on a.id = w.artist_id
      where w.id = artwork_id
        and a.profile_id = (select auth.uid())
    )
  );

drop policy if exists "Users can update own AI votes" on public.artwork_ai_votes;
drop policy if exists "Buyers and sellers can update own AI votes" on public.artwork_ai_votes;
create policy "Buyers and sellers can update own AI votes"
  on public.artwork_ai_votes
  for update
  to authenticated
  using (
    voter_id = (select auth.uid())
    and (select private.is_social_participant())
  )
  with check (
    voter_id = (select auth.uid())
    and (select private.is_social_participant())
    and not exists (
      select 1
      from public.artworks w
      join public.artists a on a.id = w.artist_id
      where w.id = artwork_id
        and a.profile_id = (select auth.uid())
    )
  );

notify pgrst, 'reload schema';
