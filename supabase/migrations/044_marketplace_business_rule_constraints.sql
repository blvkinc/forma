-- ============================================================
-- FORMA - marketplace business-rule constraints and visibility
-- Moves production marketplace visibility into RLS and adds
-- database constraints for prices, counters, slots, and content.
-- Run after 043_webhook_event_filters.sql.
-- ============================================================

-- Current Supabase projects may require explicit grants before PostgREST
-- exposes newly-created tables. Keep grants narrow; RLS remains authoritative.
grant select on public.artists to anon, authenticated;
grant select on public.artworks to anon, authenticated;
grant select on public.commissions to anon, authenticated;
grant select on public.feed_posts to anon, authenticated;
grant select on public.bids to anon, authenticated;
grant select on public.auction_extensions to anon, authenticated;
grant select on public.post_comments to anon, authenticated;
grant select on public.artwork_comments to anon, authenticated;
grant select on public.artwork_ai_proofs to anon, authenticated;

grant select, insert, update, delete on public.user_likes to authenticated;
grant select, insert, update, delete on public.user_follows to authenticated;
grant select, insert, update, delete on public.user_watchlist to authenticated;
grant select, insert, update, delete on public.feed_post_likes to authenticated;
grant select, insert, update, delete on public.feed_post_saves to authenticated;
grant select, insert, update, delete on public.post_comments to authenticated;
grant select, insert, update, delete on public.artwork_comments to authenticated;
grant select, insert, update, delete on public.artwork_ai_votes to authenticated;
grant select, insert, update on public.reports to authenticated;
grant select, insert, update on public.artwork_ai_proofs to authenticated;
grant select, insert, update on public.commission_bookings to authenticated;
grant select, insert on public.commission_messages to authenticated;
grant select, insert, update, delete on public.webhook_endpoints to authenticated;
grant select on public.notifications to authenticated;
grant select on public.purchases to authenticated;
grant select on public.auction_settlements to authenticated;
grant select, insert, update on public.seller_applications to authenticated;
grant select, insert, update on public.artwork_moderation_reviews to authenticated;
grant select, update on public.delivery_outbox to authenticated;
grant select on public.audit_log to authenticated;

-- Public catalogue visibility. Admins and owners keep access to hidden rows
-- for moderation, studio management, and audit surfaces.
drop policy if exists "Artists are viewable by everyone" on public.artists;
drop policy if exists "Public can view active artists" on public.artists;
create policy "Public can view active artists"
  on public.artists
  for select
  using (coalesce(suspended, false) = false);

drop policy if exists "Admins and owners can view hidden artists" on public.artists;
create policy "Admins and owners can view hidden artists"
  on public.artists
  for select
  to authenticated
  using (
    profile_id = (select auth.uid())
    or (select private.is_admin())
  );

drop policy if exists "Artworks are viewable by everyone" on public.artworks;
drop policy if exists "Public can view active artworks" on public.artworks;
create policy "Public can view active artworks"
  on public.artworks
  for select
  using (
    coalesce(taken_down, false) = false
    and exists (
      select 1
      from public.artists a
      where a.id = artist_id
        and coalesce(a.suspended, false) = false
    )
  );

drop policy if exists "Admins and owners can view hidden artworks" on public.artworks;
create policy "Admins and owners can view hidden artworks"
  on public.artworks
  for select
  to authenticated
  using (
    (select private.is_admin())
    or exists (
      select 1
      from public.artists a
      where a.id = artist_id
        and a.profile_id = (select auth.uid())
    )
  );

drop policy if exists "Commissions are viewable by everyone" on public.commissions;
drop policy if exists "Public can view active commission boards" on public.commissions;
create policy "Public can view active commission boards"
  on public.commissions
  for select
  using (
    exists (
      select 1
      from public.artists a
      where a.id = artist_id
        and coalesce(a.suspended, false) = false
    )
  );

drop policy if exists "Admins and owners can view hidden commission boards" on public.commissions;
create policy "Admins and owners can view hidden commission boards"
  on public.commissions
  for select
  to authenticated
  using (
    (select private.is_admin())
    or exists (
      select 1
      from public.artists a
      where a.id = artist_id
        and a.profile_id = (select auth.uid())
    )
  );

drop policy if exists "Feed posts are viewable by everyone" on public.feed_posts;
drop policy if exists "Public can view active feed posts" on public.feed_posts;
create policy "Public can view active feed posts"
  on public.feed_posts
  for select
  using (
    exists (
      select 1
      from public.artists a
      where a.id = artist_id
        and coalesce(a.suspended, false) = false
    )
  );

drop policy if exists "Admins and owners can view hidden feed posts" on public.feed_posts;
create policy "Admins and owners can view hidden feed posts"
  on public.feed_posts
  for select
  to authenticated
  using (
    (select private.is_admin())
    or exists (
      select 1
      from public.artists a
      where a.id = artist_id
        and a.profile_id = (select auth.uid())
    )
  );

-- Hard business constraints. NOT VALID avoids blocking deployment on legacy
-- demo rows, while still enforcing these rules for new and updated rows.
alter table public.artworks drop constraint if exists artworks_non_negative_money_counts;
alter table public.artworks
  add constraint artworks_non_negative_money_counts
  check (
    start_bid >= 0
    and current_bid >= 0
    and current_bid >= start_bid
    and bid_count >= 0
    and watcher_count >= 0
    and like_count >= 0
  ) not valid;

alter table public.artworks drop constraint if exists artworks_non_empty_title_visual;
alter table public.artworks
  add constraint artworks_non_empty_title_visual
  check (
    length(trim(title)) > 0
    and length(trim(visual)) > 0
  ) not valid;

alter table public.commissions drop constraint if exists commissions_valid_slots_price;
alter table public.commissions
  add constraint commissions_valid_slots_price
  check (
    slots > 0
    and taken >= 0
    and taken <= slots
    and price > 0
    and days between 1 and 365
    and length(trim(title)) > 0
  ) not valid;

alter table public.bids drop constraint if exists bids_positive_amount;
alter table public.bids
  add constraint bids_positive_amount
  check (amount > 0) not valid;

alter table public.feed_posts drop constraint if exists feed_posts_non_empty_body_counts;
alter table public.feed_posts
  add constraint feed_posts_non_empty_body_counts
  check (
    length(trim(body)) > 0
    and like_count >= 0
    and comment_count >= 0
    and save_count >= 0
  ) not valid;

alter table public.post_comments drop constraint if exists post_comments_non_empty_body;
alter table public.post_comments
  add constraint post_comments_non_empty_body
  check (length(trim(body)) > 0) not valid;

alter table public.artwork_comments drop constraint if exists artwork_comments_non_empty_body;
alter table public.artwork_comments
  add constraint artwork_comments_non_empty_body
  check (length(trim(body)) > 0) not valid;

alter table public.commission_messages drop constraint if exists commission_messages_non_empty_body;
alter table public.commission_messages
  add constraint commission_messages_non_empty_body
  check (length(trim(body)) > 0) not valid;

alter table public.reports drop constraint if exists reports_non_empty_target;
alter table public.reports
  add constraint reports_non_empty_target
  check (length(trim(target_id)) > 0) not valid;

alter table public.delivery_outbox drop constraint if exists delivery_outbox_non_negative_attempts;
alter table public.delivery_outbox
  add constraint delivery_outbox_non_negative_attempts
  check (attempts >= 0) not valid;

-- Booking a commission must still be blocked if a studio is suspended after
-- publishing its board.
create or replace function public.guard_commission_booking_write()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  actor_role text;
  commission_row record;
  artist_owner uuid;
  actor_is_admin boolean := false;
  transition_allowed boolean := false;
begin
  if actor is null then
    raise exception 'Authentication is required.';
  end if;

  select p.role into actor_role
  from public.profiles p
  where p.id = actor;

  actor_is_admin := coalesce(actor_role = 'admin', false);

  if tg_op = 'INSERT' then
    if new.buyer_id is distinct from actor then
      raise exception 'Commission bookings must be created by the buyer.';
    end if;

    if actor_role is distinct from 'buyer' then
      raise exception 'Use a buyer account to book commission slots.';
    end if;

    select c.id, c.artist_id, c.slots, c.taken, c.price, a.suspended
      into commission_row
    from public.commissions c
    join public.artists a on a.id = c.artist_id
    where c.id = new.commission_id
    for update of c;

    if not found then
      raise exception 'Commission board not found.';
    end if;

    if coalesce(commission_row.suspended, false) then
      raise exception 'This studio is not accepting commissions.';
    end if;

    if commission_row.taken >= commission_row.slots then
      raise exception 'This commission board is full.';
    end if;

    new.artist_id := commission_row.artist_id;
    new.price := commission_row.price;
    new.status := 'BOOKED';
    new.brief_text := left(trim(coalesce(new.brief_text, '')), 1200);
    new.created_at := coalesce(new.created_at, now());
    new.updated_at := now();
    return new;
  end if;

  if tg_op = 'UPDATE' then
    new.id := old.id;
    new.commission_id := old.commission_id;
    new.buyer_id := old.buyer_id;
    new.artist_id := old.artist_id;
    new.price := old.price;
    new.brief_text := old.brief_text;
    new.created_at := old.created_at;

    if new.status is not distinct from old.status then
      new.updated_at := now();
      return new;
    end if;

    select a.profile_id into artist_owner
    from public.artists a
    where a.id = old.artist_id;

    transition_allowed := case old.status
      when 'BOOKED' then new.status in ('BRIEFED', 'DISPUTED', 'CANCELLED')
      when 'BRIEFED' then new.status in ('IN_PROGRESS', 'DISPUTED', 'CANCELLED')
      when 'IN_PROGRESS' then new.status in ('REVIEW', 'DISPUTED')
      when 'REVIEW' then new.status in ('IN_PROGRESS', 'DELIVERED', 'DISPUTED')
      when 'DELIVERED' then new.status in ('ACCEPTED', 'DISPUTED')
      when 'DISPUTED' then new.status in ('IN_PROGRESS', 'CANCELLED')
      else false
    end;

    if not transition_allowed then
      raise exception 'Cannot transition commission from % to %.', old.status, new.status;
    end if;

    if old.status = 'DISPUTED' and not actor_is_admin then
      raise exception 'Only admins can resolve disputed commissions.';
    end if;

    if new.status in ('BRIEFED', 'IN_PROGRESS', 'REVIEW', 'DELIVERED')
       and actor is distinct from artist_owner
       and not actor_is_admin then
      raise exception 'Only the seller can move this commission forward.';
    end if;

    if new.status in ('ACCEPTED', 'CANCELLED')
       and actor is distinct from old.buyer_id
       and not actor_is_admin then
      raise exception 'Only the buyer can accept or cancel this commission.';
    end if;

    if new.status = 'DISPUTED'
       and actor is distinct from old.buyer_id
       and actor is distinct from artist_owner
       and not actor_is_admin then
      raise exception 'Only commission parties can open a dispute.';
    end if;

    new.updated_at := now();
    return new;
  end if;

  return new;
end;
$$;

revoke execute on function public.guard_commission_booking_write() from public, anon, authenticated;

notify pgrst, 'reload schema';
