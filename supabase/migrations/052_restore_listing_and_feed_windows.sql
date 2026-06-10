-- ============================================================
-- FORMA - restore listing/feed window enforcement
-- 044 replaced the public artworks/feed_posts visibility policies but left
-- the older window policies (015 listing window, 017 feed TTL) in place.
-- Because permissive policies OR together, expired listings and stale feed
-- posts became publicly visible again, while dependent surfaces (e.g. the
-- post_comments select policy) still enforce freshness — so commenting on
-- a stale-but-visible post failed. This folds the window conditions into
-- the 044-style public policies and drops the superseded ones.
-- Also schedules the takedown/cleanup pg_cron jobs from 015/017, which were
-- silently skipped before 033 installed pg_cron.
-- Run after 051_rls_initplan_and_fk_index.sql.
-- ============================================================

drop policy if exists "Active artworks are viewable by everyone" on public.artworks;
drop policy if exists "Public can view active artworks" on public.artworks;
create policy "Public can view active artworks"
  on public.artworks
  for select
  using (
    is_active = true
    and coalesce(taken_down, false) = false
    and exists (
      select 1
      from public.artists a
      where a.id = artist_id
        and coalesce(a.suspended, false) = false
    )
  );

drop policy if exists "Fresh feed posts are viewable by everyone" on public.feed_posts;
drop policy if exists "Public can view active feed posts" on public.feed_posts;
create policy "Public can view active feed posts"
  on public.feed_posts
  for select
  using (
    created_at > now() - interval '5 days'
    and exists (
      select 1
      from public.artists a
      where a.id = artist_id
        and coalesce(a.suspended, false) = false
    )
  );

-- Owners and admins keep access to hidden/expired rows through the 044
-- "Admins and owners can view hidden ..." policies, which stay in place.

do $$
declare
  job record;
begin
  for job in
    select jobid, jobname from cron.job
    where jobname in ('forma-expire-artwork-listings', 'forma-delete-expired-feed-posts')
  loop
    perform cron.unschedule(job.jobid);
  end loop;
end;
$$;

select cron.schedule(
  'forma-expire-artwork-listings',
  '*/5 * * * *',
  $cron$ select public.expire_artwork_listings(); $cron$
);

select cron.schedule(
  'forma-delete-expired-feed-posts',
  '0 * * * *',
  $cron$ select public.delete_expired_feed_posts(); $cron$
);

notify pgrst, 'reload schema';
