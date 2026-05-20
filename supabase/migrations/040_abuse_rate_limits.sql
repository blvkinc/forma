-- ============================================================
-- FORMA - abuse rate limits
-- Adds server-side rate limiting for high-risk social/community
-- writes. Run after 039_verified_seller_artwork_storage.sql.
-- ============================================================

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table if not exists private.rate_limit_events (
  id bigserial primary key,
  actor_id uuid not null,
  action_key text not null,
  occurred_at timestamptz not null default now()
);

alter table private.rate_limit_events enable row level security;
revoke all on table private.rate_limit_events from public, anon, authenticated;

create index if not exists rate_limit_events_actor_action_time_idx
  on private.rate_limit_events (actor_id, action_key, occurred_at desc);

create or replace function private.assert_rate_limit(
  p_action_key text,
  p_max_events integer,
  p_window interval
)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  event_count integer;
begin
  if actor is null then
    raise exception 'Authentication is required.';
  end if;

  if p_action_key is null or length(trim(p_action_key)) = 0 then
    raise exception 'Rate limit action is required.';
  end if;

  if p_max_events <= 0 or p_window <= interval '0 seconds' then
    raise exception 'Invalid rate limit configuration.';
  end if;

  delete from private.rate_limit_events
  where occurred_at < now() - interval '7 days';

  select count(*)
    into event_count
  from private.rate_limit_events e
  where e.actor_id = actor
    and e.action_key = p_action_key
    and e.occurred_at > now() - p_window;

  if event_count >= p_max_events then
    raise exception 'Too many %, please wait and try again.', replace(p_action_key, '_', ' ');
  end if;

  insert into private.rate_limit_events (actor_id, action_key)
  values (actor, p_action_key);
end;
$$;

revoke all on function private.assert_rate_limit(text, integer, interval) from public, anon, authenticated;

create or replace function public.guard_social_signal_rate_limit()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  perform private.assert_rate_limit(tg_table_name || '_insert', 120, interval '1 hour');
  return new;
end;
$$;

create or replace function public.guard_comment_rate_limit()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  perform private.assert_rate_limit(tg_table_name || '_insert', 30, interval '10 minutes');
  return new;
end;
$$;

create or replace function public.guard_report_rate_limit()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  perform private.assert_rate_limit('reports_insert', 8, interval '1 hour');
  return new;
end;
$$;

create or replace function public.guard_ai_vote_rate_limit()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  perform private.assert_rate_limit('artwork_ai_votes_insert', 30, interval '1 hour');
  return new;
end;
$$;

create or replace function public.guard_bid_rate_limit()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  perform private.assert_rate_limit('bids_insert', 60, interval '10 minutes');
  return new;
end;
$$;

create or replace function public.guard_commission_booking_rate_limit()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  perform private.assert_rate_limit('commission_bookings_insert', 10, interval '1 hour');
  return new;
end;
$$;

drop trigger if exists guard_user_follows_rate_limit on public.user_follows;
create trigger guard_user_follows_rate_limit
  before insert on public.user_follows
  for each row execute procedure public.guard_social_signal_rate_limit();

drop trigger if exists guard_user_likes_rate_limit on public.user_likes;
create trigger guard_user_likes_rate_limit
  before insert on public.user_likes
  for each row execute procedure public.guard_social_signal_rate_limit();

drop trigger if exists guard_feed_post_likes_rate_limit on public.feed_post_likes;
create trigger guard_feed_post_likes_rate_limit
  before insert on public.feed_post_likes
  for each row execute procedure public.guard_social_signal_rate_limit();

drop trigger if exists guard_feed_post_saves_rate_limit on public.feed_post_saves;
create trigger guard_feed_post_saves_rate_limit
  before insert on public.feed_post_saves
  for each row execute procedure public.guard_social_signal_rate_limit();

drop trigger if exists guard_post_comments_rate_limit on public.post_comments;
create trigger guard_post_comments_rate_limit
  before insert on public.post_comments
  for each row execute procedure public.guard_comment_rate_limit();

drop trigger if exists guard_artwork_comments_rate_limit on public.artwork_comments;
create trigger guard_artwork_comments_rate_limit
  before insert on public.artwork_comments
  for each row execute procedure public.guard_comment_rate_limit();

drop trigger if exists guard_commission_messages_rate_limit on public.commission_messages;
create trigger guard_commission_messages_rate_limit
  before insert on public.commission_messages
  for each row execute procedure public.guard_comment_rate_limit();

drop trigger if exists guard_reports_rate_limit on public.reports;
create trigger guard_reports_rate_limit
  before insert on public.reports
  for each row execute procedure public.guard_report_rate_limit();

drop trigger if exists guard_artwork_ai_votes_rate_limit on public.artwork_ai_votes;
create trigger guard_artwork_ai_votes_rate_limit
  before insert on public.artwork_ai_votes
  for each row execute procedure public.guard_ai_vote_rate_limit();

drop trigger if exists guard_bids_rate_limit on public.bids;
create trigger guard_bids_rate_limit
  before insert on public.bids
  for each row execute procedure public.guard_bid_rate_limit();

drop trigger if exists guard_commission_bookings_rate_limit on public.commission_bookings;
create trigger guard_commission_bookings_rate_limit
  before insert on public.commission_bookings
  for each row execute procedure public.guard_commission_booking_rate_limit();

revoke execute on function public.guard_social_signal_rate_limit() from public, anon, authenticated;
revoke execute on function public.guard_comment_rate_limit() from public, anon, authenticated;
revoke execute on function public.guard_report_rate_limit() from public, anon, authenticated;
revoke execute on function public.guard_ai_vote_rate_limit() from public, anon, authenticated;
revoke execute on function public.guard_bid_rate_limit() from public, anon, authenticated;
revoke execute on function public.guard_commission_booking_rate_limit() from public, anon, authenticated;
