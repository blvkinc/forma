-- ============================================================
-- FORMA — Rule 3: feed posts expire after 5 days
-- Every feed post is deleted 5 days after it was posted.
-- Run after 016_artwork_authenticity_seal.sql.
-- ============================================================

-- 1. Hide posts older than 5 days immediately (even before the
--    delete job runs), while the owning artist still manages theirs.
drop policy if exists "Feed posts are viewable by everyone" on public.feed_posts;
create policy "Fresh feed posts are viewable by everyone"
  on public.feed_posts for select using (
    created_at > now() - interval '5 days'
    or exists (
      select 1 from public.artists a
      where a.id = artist_id
        and a.profile_id is not null
        and a.profile_id = auth.uid()
    )
  );

create index if not exists feed_posts_created_at_idx
  on public.feed_posts (created_at);

-- 2. Hard-delete job for posts past their 5-day life.
create or replace function public.delete_expired_feed_posts()
returns integer
language plpgsql
security definer set search_path = ''
as $$
declare
  affected integer;
begin
  delete from public.feed_posts
    where created_at < now() - interval '5 days';
  get diagnostics affected = row_count;
  return affected;
end;
$$;

-- 3. Schedule the cleanup hourly via pg_cron when available.
--    If pg_cron is not enabled, the migration still succeeds;
--    enable it and re-run this block, or call
--    public.delete_expired_feed_posts() from an external scheduler.
do $$
begin
  perform cron.schedule(
    'forma-delete-expired-feed-posts',
    '0 * * * *',
    $cron$ select public.delete_expired_feed_posts(); $cron$
  );
exception when undefined_function or undefined_table or invalid_schema_name then
  raise notice 'pg_cron not available — call public.delete_expired_feed_posts() from an external scheduler.';
end;
$$;
