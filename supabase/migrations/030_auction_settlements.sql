-- ============================================================
-- FORMA - auction close-out and invoice pipeline
-- Creates an idempotent settlement row when an auction has ended.
-- Payment capture is intentionally not implemented here; invoices
-- remain invoice_pending until an admin/service marks them paid.
-- Run after 029_profile_avatars.sql.
-- ============================================================

create table if not exists public.auction_settlements (
  id uuid default gen_random_uuid() primary key,
  artwork_id text references public.artworks(id) on delete cascade not null unique,
  winner_id uuid references auth.users(id) on delete set null,
  winning_bid_id uuid references public.bids(id) on delete set null,
  amount numeric not null default 0,
  buyer_premium numeric not null default 0,
  total_due numeric not null default 0,
  status text not null default 'invoice_pending'
    check (status in ('invoice_pending', 'paid', 'no_bids', 'cancelled')),
  invoice_reference text not null unique,
  due_at timestamptz,
  closed_at timestamptz not null default now(),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.auction_settlements enable row level security;

grant select on public.auction_settlements to authenticated;

drop policy if exists "Settlement participants can read" on public.auction_settlements;
create policy "Settlement participants can read"
  on public.auction_settlements
  for select
  to authenticated
  using (
    winner_id = (select auth.uid())
    or (select private.is_admin())
    or exists (
      select 1
      from public.artworks w
      join public.artists a on a.id = w.artist_id
      where w.id = auction_settlements.artwork_id
        and a.profile_id = (select auth.uid())
    )
  );

create index if not exists auction_settlements_winner_idx
  on public.auction_settlements (winner_id, created_at desc);
create index if not exists auction_settlements_status_idx
  on public.auction_settlements (status, created_at desc);

create or replace function public.auction_buyer_premium(p_amount numeric)
returns numeric
language sql
immutable
set search_path = ''
as $$
  select round(greatest(coalesce(p_amount, 0), 0) * 0.12, 2);
$$;

create or replace function public.close_ended_auction(p_artwork_id text)
returns uuid
language plpgsql
security definer set search_path = ''
as $$
declare
  art record;
  top_bid record;
  existing_id uuid;
  settlement_id uuid;
  premium numeric;
  invoice_ref text;
  artist_owner uuid;
begin
  select s.id into existing_id
  from public.auction_settlements s
  where s.artwork_id = p_artwork_id;

  if existing_id is not null then
    return existing_id;
  end if;

  select w.id, w.title, w.artist_id, w.current_bid, w.ends_at, a.profile_id
    into art
  from public.artworks w
  join public.artists a on a.id = w.artist_id
  where w.id = p_artwork_id
  for update of w;

  if art.id is null then
    raise exception 'Artwork auction does not exist.';
  end if;

  if art.ends_at > now() then
    raise exception 'Auction is still active.';
  end if;

  artist_owner := art.profile_id;

  select b.id, b.user_id, b.amount
    into top_bid
  from public.bids b
  where b.artwork_id = p_artwork_id
  order by b.amount desc, b.placed_at desc
  limit 1;

  invoice_ref := 'inv_' || replace(gen_random_uuid()::text, '-', '');

  if top_bid.id is null then
    insert into public.auction_settlements (
      artwork_id,
      amount,
      buyer_premium,
      total_due,
      status,
      invoice_reference
    )
    values (
      p_artwork_id,
      0,
      0,
      0,
      'no_bids',
      invoice_ref
    )
    on conflict (artwork_id) do update
      set updated_at = public.auction_settlements.updated_at
    returning id into settlement_id;

    if artist_owner is not null then
      insert into public.notifications (user_id, type, title, body, link_type, link_id)
      values (
        artist_owner,
        'auction_closed',
        'Auction closed',
        coalesce(art.title, 'An artwork') || ' closed with no bids.',
        'artwork',
        p_artwork_id
      );
    end if;

    insert into public.audit_log (actor_id, action, target_type, target_id, detail)
    values ((select auth.uid()), 'auction.closed.no_bids', 'artwork', p_artwork_id, coalesce(art.title, p_artwork_id));

    return settlement_id;
  end if;

  premium := public.auction_buyer_premium(top_bid.amount);

  insert into public.auction_settlements (
    artwork_id,
    winner_id,
    winning_bid_id,
    amount,
    buyer_premium,
    total_due,
    status,
    invoice_reference,
    due_at
  )
  values (
    p_artwork_id,
    top_bid.user_id,
    top_bid.id,
    top_bid.amount,
    premium,
    top_bid.amount + premium,
    'invoice_pending',
    invoice_ref,
    now() + interval '48 hours'
  )
  on conflict (artwork_id) do update
    set updated_at = public.auction_settlements.updated_at
  returning id into settlement_id;

  insert into public.notifications (user_id, type, title, body, link_type, link_id)
  values (
    top_bid.user_id,
    'auction_won',
    'Auction won',
    'You won ' || coalesce(art.title, 'an artwork') || '. Invoice ' || invoice_ref || ' is pending payment.',
    'artwork',
    p_artwork_id
  );

  if artist_owner is not null and artist_owner <> top_bid.user_id then
    insert into public.notifications (user_id, type, title, body, link_type, link_id)
    values (
      artist_owner,
      'auction_closed',
      'Auction closed',
      coalesce(art.title, 'An artwork') || ' closed at $' || trim(to_char(top_bid.amount, 'FM999999990')) || '.',
      'artwork',
      p_artwork_id
    );
  end if;

  insert into public.audit_log (actor_id, action, target_type, target_id, detail)
  values ((select auth.uid()), 'auction.closed.invoice_pending', 'auction_settlement', settlement_id::text, invoice_ref);

  return settlement_id;
end;
$$;

create or replace function public.admin_mark_auction_invoice_paid(p_settlement_id uuid)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  settlement record;
  art_title text;
  artist_owner uuid;
begin
  if not (select private.is_admin()) then
    raise exception 'Admin privilege required';
  end if;

  select *
    into settlement
  from public.auction_settlements
  where id = p_settlement_id
  for update;

  if settlement.id is null then
    raise exception 'Settlement not found.';
  end if;

  if settlement.status = 'paid' then
    return;
  end if;

  if settlement.winner_id is null then
    raise exception 'Cannot mark a no-bid settlement paid.';
  end if;

  update public.auction_settlements
  set status = 'paid',
      paid_at = now(),
      updated_at = now()
  where id = p_settlement_id;

  insert into public.purchases (artwork_id, buyer_id, amount)
  values (settlement.artwork_id, settlement.winner_id, settlement.amount)
  on conflict (artwork_id, buyer_id) do update
    set amount = excluded.amount,
        created_at = public.purchases.created_at;

  select w.title, a.profile_id into art_title, artist_owner
  from public.artworks w
  join public.artists a on a.id = w.artist_id
  where w.id = settlement.artwork_id;

  insert into public.notifications (user_id, type, title, body, link_type, link_id)
  values (
    settlement.winner_id,
    'auction_paid',
    'Payment recorded',
    'Payment was recorded for ' || coalesce(art_title, 'your auction win') || '. The authenticity seal is unlocked.',
    'artwork',
    settlement.artwork_id
  );

  if artist_owner is not null and artist_owner <> settlement.winner_id then
    insert into public.notifications (user_id, type, title, body, link_type, link_id)
    values (
      artist_owner,
      'auction_paid',
      'Auction paid',
      'Payment was recorded for ' || coalesce(art_title, 'an artwork') || '.',
      'artwork',
      settlement.artwork_id
    );
  end if;

  insert into public.audit_log (actor_id, action, target_type, target_id, detail)
  values ((select auth.uid()), 'auction.invoice.paid', 'auction_settlement', p_settlement_id::text, settlement.invoice_reference);
end;
$$;

revoke execute on function public.auction_buyer_premium(numeric) from public, anon, authenticated;
revoke execute on function public.close_ended_auction(text) from public, anon;
revoke execute on function public.admin_mark_auction_invoice_paid(uuid) from public, anon;
grant execute on function public.close_ended_auction(text) to authenticated;
grant execute on function public.admin_mark_auction_invoice_paid(uuid) to authenticated;
