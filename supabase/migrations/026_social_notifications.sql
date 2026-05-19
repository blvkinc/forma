-- ============================================================
-- FORMA — social notification triggers
-- Populates public.notifications for the events the in-app
-- notifications panel surfaces: outbid, new follower, feed-post
-- like, feed-post comment, artwork comment.
-- All inserts run from SECURITY DEFINER triggers (the public
-- insert policy was removed in migration 023), matching the
-- existing audit/notification trigger pattern.
-- Run after 025_account_deletion.sql.
-- ============================================================

-- 1. Outbid — when a higher bid lands, tell the prior top bidder.
create or replace function public.notify_on_outbid()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  prev_user uuid;
  art_title text;
begin
  select b.user_id into prev_user
  from public.bids b
  where b.artwork_id = new.artwork_id
    and b.id <> new.id
    and b.user_id <> new.user_id
  order by b.amount desc, b.placed_at desc
  limit 1;

  if prev_user is null then
    return new;
  end if;

  select title into art_title from public.artworks where id = new.artwork_id;

  insert into public.notifications (user_id, type, title, body, link_type, link_id)
  values (
    prev_user,
    'outbid',
    'Outbid',
    'You were outbid on ' || coalesce(art_title, 'an artwork')
      || '. New top bid: $' || trim(to_char(new.amount, 'FM999999990')) || '.',
    'artwork',
    new.artwork_id
  );
  return new;
end;
$$;

drop trigger if exists on_bid_outbid on public.bids;
create trigger on_bid_outbid
  after insert on public.bids
  for each row execute procedure public.notify_on_outbid();

-- 2. New follower — notify the followed studio's owner.
create or replace function public.notify_on_follow()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  target_profile uuid;
  studio_name text;
begin
  select a.profile_id, a.name into target_profile, studio_name
  from public.artists a
  where a.id = new.artist_id;

  if target_profile is null or target_profile = new.user_id then
    return new;
  end if;

  insert into public.notifications (user_id, type, title, body, link_type, link_id)
  values (
    target_profile,
    'new_follower',
    'New follower',
    'Someone started following ' || coalesce(studio_name, 'your studio') || '.',
    'artist',
    new.artist_id
  );
  return new;
end;
$$;

drop trigger if exists on_follow_notify on public.user_follows;
create trigger on_follow_notify
  after insert on public.user_follows
  for each row execute procedure public.notify_on_follow();

-- 3. Feed-post like — notify the post's studio owner.
create or replace function public.notify_on_feed_like()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  target_profile uuid;
begin
  select a.profile_id into target_profile
  from public.feed_posts f
  join public.artists a on a.id = f.artist_id
  where f.id = new.post_id;

  if target_profile is null or target_profile = new.user_id then
    return new;
  end if;

  insert into public.notifications (user_id, type, title, body, link_type, link_id)
  values (
    target_profile,
    'feed_like',
    'New like',
    'Someone liked your feed post.',
    'feed',
    new.post_id
  );
  return new;
end;
$$;

drop trigger if exists on_feed_like_notify on public.feed_post_likes;
create trigger on_feed_like_notify
  after insert on public.feed_post_likes
  for each row execute procedure public.notify_on_feed_like();

-- 4. Feed-post comment — notify the post's studio owner.
create or replace function public.notify_on_post_comment()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  target_profile uuid;
begin
  select a.profile_id into target_profile
  from public.feed_posts f
  join public.artists a on a.id = f.artist_id
  where f.id = new.post_id;

  if target_profile is null or target_profile = new.user_id then
    return new;
  end if;

  insert into public.notifications (user_id, type, title, body, link_type, link_id)
  values (
    target_profile,
    'feed_comment',
    'New comment',
    'Someone commented on your feed post.',
    'feed',
    new.post_id
  );
  return new;
end;
$$;

drop trigger if exists on_post_comment_notify on public.post_comments;
create trigger on_post_comment_notify
  after insert on public.post_comments
  for each row execute procedure public.notify_on_post_comment();

-- 5. Artwork comment — notify the artwork's studio owner.
create or replace function public.notify_on_artwork_comment()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  target_profile uuid;
  art_title text;
begin
  select a.profile_id, w.title into target_profile, art_title
  from public.artworks w
  join public.artists a on a.id = w.artist_id
  where w.id = new.artwork_id;

  if target_profile is null or target_profile = new.user_id then
    return new;
  end if;

  insert into public.notifications (user_id, type, title, body, link_type, link_id)
  values (
    target_profile,
    'artwork_comment',
    'New comment',
    'Someone commented on ' || coalesce(art_title, 'your artwork') || '.',
    'artwork',
    new.artwork_id
  );
  return new;
end;
$$;

drop trigger if exists on_artwork_comment_notify on public.artwork_comments;
create trigger on_artwork_comment_notify
  after insert on public.artwork_comments
  for each row execute procedure public.notify_on_artwork_comment();

-- SECURITY DEFINER trigger functions must not be RPC-callable
-- (matches the hardening in migration 023).
revoke execute on function public.notify_on_outbid() from public, anon, authenticated;
revoke execute on function public.notify_on_follow() from public, anon, authenticated;
revoke execute on function public.notify_on_feed_like() from public, anon, authenticated;
revoke execute on function public.notify_on_post_comment() from public, anon, authenticated;
revoke execute on function public.notify_on_artwork_comment() from public, anon, authenticated;
