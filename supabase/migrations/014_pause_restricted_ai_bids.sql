-- ============================================================
-- FORMA - pause bids for AI-restricted artwork
-- Community AI review can pause bidding until artist proof is filed.
-- ============================================================

create or replace function public.validate_bid_before_insert()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  auction_current_bid numeric;
  auction_end timestamptz;
  auction_authenticity_status text;
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

  select w.current_bid, w.ends_at, coalesce(w.authenticity_status, 'clear'), a.profile_id
    into auction_current_bid, auction_end, auction_authenticity_status, owner_profile_id
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

  if auction_authenticity_status = 'restricted' then
    raise exception 'Bidding is paused until the artist submits process proof.';
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
