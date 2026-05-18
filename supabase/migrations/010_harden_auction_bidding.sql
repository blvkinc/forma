-- ============================================================
-- FORMA - auction bid validation and indexing
-- Buyers place bids, Supabase validates auction state atomically.
-- Run after 009_trust_safety_reports.sql.
-- ============================================================

create or replace function public.minimum_next_bid(current_amount numeric)
returns numeric
language plpgsql
immutable
as $$
declare
  raw_increment numeric;
  magnitude numeric;
begin
  raw_increment := greatest(20, coalesce(current_amount, 0) * 0.05);

  if raw_increment = 0 then
    return coalesce(current_amount, 0) + 20;
  end if;

  magnitude := power(10, floor(log(raw_increment)) - 1);
  return coalesce(current_amount, 0) + ceil(raw_increment / magnitude) * magnitude;
end;
$$;

create or replace function public.validate_bid_before_insert()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  auction_current_bid numeric;
  auction_end timestamptz;
  owner_profile_id uuid;
  bidder_role text;
  required_amount numeric;
begin
  if auth.uid() is null or new.user_id <> auth.uid() then
    raise exception 'Authentication is required to place a bid.';
  end if;

  select role into bidder_role
  from public.profiles
  where id = new.user_id;

  if bidder_role is distinct from 'buyer' then
    raise exception 'Only buyer accounts can place bids.';
  end if;

  select w.current_bid, w.ends_at, a.profile_id
    into auction_current_bid, auction_end, owner_profile_id
  from public.artworks w
  join public.artists a on a.id = w.artist_id
  where w.id = new.artwork_id
  for update of w;

  if auction_end is null then
    raise exception 'Artwork auction does not exist.';
  end if;

  if owner_profile_id = new.user_id then
    raise exception 'Artists cannot bid on their own listings.';
  end if;

  if auction_end <= now() then
    raise exception 'Auction has ended.';
  end if;

  required_amount := public.minimum_next_bid(auction_current_bid);
  if new.amount < required_amount then
    raise exception 'Bid must be at least $%', required_amount;
  end if;

  new.display_name := coalesce(nullif(trim(new.display_name), ''), 'Anonymous');
  return new;
end;
$$;

drop trigger if exists validate_bid_before_insert on public.bids;
create trigger validate_bid_before_insert
  before insert on public.bids
  for each row execute procedure public.validate_bid_before_insert();

create or replace function public.handle_new_bid()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  update public.artworks
  set current_bid = greatest(current_bid, new.amount),
      bid_count = bid_count + 1
  where id = new.artwork_id;
  return new;
end;
$$;

create index if not exists bids_artwork_placed_idx
  on public.bids (artwork_id, placed_at desc);

create index if not exists bids_user_placed_idx
  on public.bids (user_id, placed_at desc);
