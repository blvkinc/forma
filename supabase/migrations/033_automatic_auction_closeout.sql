-- ============================================================
-- FORMA - automatic auction close-out
-- Adds a private cron-callable settlement path and schedules it
-- to close ended, unsettled auctions every five minutes.
-- Run after 032_harden_settlement_delivery_advisors.sql.
-- ============================================================

create extension if not exists pg_cron;
create schema if not exists private;

create or replace function private.close_ended_auction_system(p_artwork_id text)
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
    values (null, 'auction.closed.no_bids', 'artwork', p_artwork_id, coalesce(art.title, p_artwork_id));

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
  values (null, 'auction.closed.invoice_pending', 'auction_settlement', settlement_id::text, invoice_ref);

  return settlement_id;
end;
$$;

create or replace function public.close_ended_auction(p_artwork_id text)
returns uuid
language plpgsql
security definer set search_path = ''
as $$
begin
  if not (select private.is_admin()) then
    raise exception 'Admin privilege required';
  end if;

  return private.close_ended_auction_system(p_artwork_id);
end;
$$;

create or replace function private.close_ended_auctions_batch(p_limit integer default 25)
returns jsonb
language plpgsql
security definer set search_path = ''
as $$
declare
  work_id text;
  closed_count integer := 0;
  failed_count integer := 0;
begin
  for work_id in
    select w.id
    from public.artworks w
    where w.ends_at <= now()
      and not exists (
        select 1
        from public.auction_settlements s
        where s.artwork_id = w.id
      )
    order by w.ends_at asc
    limit greatest(1, least(coalesce(p_limit, 25), 100))
  loop
    begin
      perform private.close_ended_auction_system(work_id);
      closed_count := closed_count + 1;
    exception when others then
      failed_count := failed_count + 1;
      insert into public.audit_log (actor_id, action, target_type, target_id, detail)
      values (null, 'auction.closeout.failed', 'artwork', work_id, sqlerrm);
    end;
  end loop;

  return jsonb_build_object(
    'closed', closed_count,
    'failed', failed_count,
    'ran_at', now()
  );
end;
$$;

revoke execute on function private.close_ended_auction_system(text) from public, anon, authenticated;
revoke execute on function private.close_ended_auctions_batch(integer) from public, anon, authenticated;
revoke execute on function public.close_ended_auction(text) from public, anon;
grant execute on function public.close_ended_auction(text) to authenticated;

do $$
declare
  existing_job_id integer;
begin
  select jobid
    into existing_job_id
  from cron.job
  where jobname = 'forma-close-ended-auctions'
  limit 1;

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;
end;
$$;

select cron.schedule(
  'forma-close-ended-auctions',
  '*/5 * * * *',
  $$ select private.close_ended_auctions_batch(50); $$
);
