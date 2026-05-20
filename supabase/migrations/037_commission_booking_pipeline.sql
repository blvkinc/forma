-- ============================================================
-- FORMA - commission booking pipeline
-- Makes booking slots API-reachable, role-scoped, concurrency-safe,
-- and notification-aware.
-- Run after 036_social_interaction_permissions.sql.
-- ============================================================

grant select, insert, update on public.commission_bookings to authenticated;
grant select, insert on public.commission_messages to authenticated;
grant select, update on public.notifications to authenticated;

drop policy if exists "Booking parties can view" on public.commission_bookings;
create policy "Booking parties can view"
  on public.commission_bookings
  for select
  to authenticated
  using (
    buyer_id = (select auth.uid())
    or exists (
      select 1
      from public.artists a
      where a.id = artist_id
        and a.profile_id = (select auth.uid())
    )
  );

drop policy if exists "Buyers can book commissions" on public.commission_bookings;
create policy "Buyers can book commissions"
  on public.commission_bookings
  for insert
  to authenticated
  with check (
    buyer_id = (select auth.uid())
    and exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'buyer'
    )
    and exists (
      select 1
      from public.commissions c
      where c.id = commission_id
        and c.artist_id = artist_id
        and c.taken < c.slots
    )
  );

drop policy if exists "Parties can update bookings" on public.commission_bookings;
drop policy if exists "Buyer or seller parties can update bookings" on public.commission_bookings;
create policy "Buyer or seller parties can update bookings"
  on public.commission_bookings
  for update
  to authenticated
  using (
    buyer_id = (select auth.uid())
    or exists (
      select 1
      from public.artists a
      where a.id = artist_id
        and a.profile_id = (select auth.uid())
    )
  )
  with check (
    buyer_id = (select auth.uid())
    or exists (
      select 1
      from public.artists a
      where a.id = artist_id
        and a.profile_id = (select auth.uid())
    )
  );

drop policy if exists "Thread parties can view messages" on public.commission_messages;
create policy "Thread parties can view messages"
  on public.commission_messages
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.commission_bookings b
      where b.id = booking_id
        and (
          b.buyer_id = (select auth.uid())
          or exists (
            select 1
            from public.artists a
            where a.id = b.artist_id
              and a.profile_id = (select auth.uid())
          )
        )
    )
  );

drop policy if exists "Thread parties can send messages" on public.commission_messages;
create policy "Thread parties can send messages"
  on public.commission_messages
  for insert
  to authenticated
  with check (
    sender_id = (select auth.uid())
    and exists (
      select 1
      from public.commission_bookings b
      where b.id = booking_id
        and (
          b.buyer_id = (select auth.uid())
          or exists (
            select 1
            from public.artists a
            where a.id = b.artist_id
              and a.profile_id = (select auth.uid())
          )
        )
    )
  );

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

    select c.id, c.artist_id, c.slots, c.taken, c.price
      into commission_row
    from public.commissions c
    where c.id = new.commission_id
    for update;

    if not found then
      raise exception 'Commission board not found.';
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

drop trigger if exists guard_commission_booking_write on public.commission_bookings;
create trigger guard_commission_booking_write
  before insert or update on public.commission_bookings
  for each row execute procedure public.guard_commission_booking_write();

create or replace function public.handle_commission_booking()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  seller_id uuid;
  commission_title text;
begin
  if (tg_op = 'INSERT') then
    update public.commissions
    set taken = least(slots, taken + 1)
    where id = new.commission_id;

    select a.profile_id, c.title
      into seller_id, commission_title
    from public.commissions c
    join public.artists a on a.id = c.artist_id
    where c.id = new.commission_id;

    if seller_id is not null and seller_id <> new.buyer_id then
      insert into public.notifications (user_id, type, title, body, link_type, link_id)
      values (
        seller_id,
        'commission_booked',
        'Commission booked',
        'A buyer booked ' || coalesce(commission_title, 'your commission board') || '.',
        'commission',
        new.id::text
      );
    end if;

    return new;
  end if;
  return null;
end;
$$;

create or replace function public.handle_commission_booking_status_change()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  seller_id uuid;
  commission_title text;
  target_user uuid;
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  if new.status = 'CANCELLED' and old.status <> 'CANCELLED' then
    update public.commissions
    set taken = greatest(0, taken - 1)
    where id = new.commission_id;
  elsif old.status = 'CANCELLED' and new.status <> 'CANCELLED' then
    update public.commissions
    set taken = least(slots, taken + 1)
    where id = new.commission_id;
  end if;

  select a.profile_id, c.title
    into seller_id, commission_title
  from public.commissions c
  join public.artists a on a.id = c.artist_id
  where c.id = new.commission_id;

  target_user := case
    when actor is not null and actor = new.buyer_id then seller_id
    else new.buyer_id
  end;

  if target_user is not null and target_user is distinct from actor then
    insert into public.notifications (user_id, type, title, body, link_type, link_id)
    values (
      target_user,
      'commission_status',
      'Commission updated',
      coalesce(commission_title, 'A commission') || ' moved to ' || replace(lower(new.status), '_', ' ') || '.',
      'commission',
      new.id::text
    );
  end if;

  return new;
end;
$$;

drop trigger if exists on_commission_booking_status_change on public.commission_bookings;
create trigger on_commission_booking_status_change
  after update of status on public.commission_bookings
  for each row execute procedure public.handle_commission_booking_status_change();

create or replace function public.handle_commission_message_notify()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  buyer_id uuid;
  seller_id uuid;
  commission_title text;
  target_user uuid;
begin
  select b.buyer_id, a.profile_id, c.title
    into buyer_id, seller_id, commission_title
  from public.commission_bookings b
  join public.commissions c on c.id = b.commission_id
  join public.artists a on a.id = b.artist_id
  where b.id = new.booking_id;

  target_user := case
    when new.sender_id = buyer_id then seller_id
    else buyer_id
  end;

  if target_user is not null and target_user <> new.sender_id then
    insert into public.notifications (user_id, type, title, body, link_type, link_id)
    values (
      target_user,
      case when new.is_milestone then 'commission_milestone' else 'commission_message' end,
      case when new.is_milestone then 'Commission milestone' else 'Commission message' end,
      coalesce(commission_title, 'A commission') || ' has a new ' ||
        case when new.is_milestone then 'milestone.' else 'message.' end,
      'commission',
      new.booking_id::text
    );
  end if;

  return new;
end;
$$;

drop trigger if exists on_commission_message_notify on public.commission_messages;
create trigger on_commission_message_notify
  after insert on public.commission_messages
  for each row execute procedure public.handle_commission_message_notify();

revoke execute on function public.guard_commission_booking_write() from public, anon, authenticated;
revoke execute on function public.handle_commission_booking() from public, anon, authenticated;
revoke execute on function public.handle_commission_booking_status_change() from public, anon, authenticated;
revoke execute on function public.handle_commission_message_notify() from public, anon, authenticated;

notify pgrst, 'reload schema';
