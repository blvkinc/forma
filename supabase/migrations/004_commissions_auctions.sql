-- ============================================================
-- FORMA — Phase 3: Commission Bookings & Auction Enhancements
-- Run AFTER 003_seed.sql
-- ============================================================

-- -------------------------------------------------
-- Commission Bookings (FR-COM-001 through FR-COM-007)
-- -------------------------------------------------
create table if not exists public.commission_bookings (
  id uuid default gen_random_uuid() primary key,
  commission_id text references public.commissions(id) on delete cascade not null,
  buyer_id uuid references auth.users(id) on delete cascade not null,
  artist_id text references public.artists(id) on delete cascade not null,
  status text not null default 'BOOKED'
    check (status in ('BOOKED','BRIEFED','IN_PROGRESS','REVIEW','DELIVERED','ACCEPTED','DISPUTED','CANCELLED')),
  brief_text text,
  price numeric not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.commission_bookings enable row level security;

-- Both buyer and artist can view their bookings
create policy "Booking parties can view"
  on public.commission_bookings for select using (
    auth.uid() = buyer_id
    or exists (
      select 1 from public.artists a where a.id = artist_id and a.profile_id = auth.uid()
    )
  );
-- Buyers can create bookings
create policy "Buyers can book commissions"
  on public.commission_bookings for insert with check (auth.uid() = buyer_id);
-- Both parties can update (state transitions)
create policy "Parties can update bookings"
  on public.commission_bookings for update using (
    auth.uid() = buyer_id
    or exists (
      select 1 from public.artists a where a.id = artist_id and a.profile_id = auth.uid()
    )
  );

-- -------------------------------------------------
-- Commission Messages / Thread (FR-COM-003)
-- -------------------------------------------------
create table if not exists public.commission_messages (
  id uuid default gen_random_uuid() primary key,
  booking_id uuid references public.commission_bookings(id) on delete cascade not null,
  sender_id uuid references auth.users(id) on delete cascade not null,
  body text not null,
  is_milestone boolean not null default false,
  attachment_url text,
  created_at timestamptz not null default now()
);

alter table public.commission_messages enable row level security;
create policy "Thread parties can view messages"
  on public.commission_messages for select using (
    exists (
      select 1 from public.commission_bookings b
      where b.id = booking_id
        and (b.buyer_id = auth.uid() or exists (
          select 1 from public.artists a where a.id = b.artist_id and a.profile_id = auth.uid()
        ))
    )
  );
create policy "Thread parties can send messages"
  on public.commission_messages for insert with check (
    exists (
      select 1 from public.commission_bookings b
      where b.id = booking_id
        and (b.buyer_id = auth.uid() or exists (
          select 1 from public.artists a where a.id = b.artist_id and a.profile_id = auth.uid()
        ))
    )
  );

-- -------------------------------------------------
-- Notifications (FR-NOT-003, FR-NOT-004)
-- -------------------------------------------------
create table if not exists public.notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  type text not null,
  title text not null,
  body text,
  link_type text, -- 'artwork', 'artist', 'commission', etc.
  link_id text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;
create policy "Users can view own notifications"
  on public.notifications for select using (auth.uid() = user_id);
create policy "System can insert notifications"
  on public.notifications for insert with check (true);
create policy "Users can update own notifications (mark read)"
  on public.notifications for update using (auth.uid() = user_id);

-- -------------------------------------------------
-- Auction Extensions Log (FR-AUC-004, anti-snipe tracking)
-- -------------------------------------------------
create table if not exists public.auction_extensions (
  id uuid default gen_random_uuid() primary key,
  artwork_id text references public.artworks(id) on delete cascade not null,
  bid_id uuid references public.bids(id) on delete cascade not null,
  original_end timestamptz not null,
  new_end timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.auction_extensions enable row level security;
create policy "Extensions are viewable by everyone"
  on public.auction_extensions for select using (true);

-- -------------------------------------------------
-- Function: Auto-increment commission taken count on booking
-- -------------------------------------------------
create or replace function public.handle_commission_booking()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if (tg_op = 'INSERT') then
    update public.commissions set taken = taken + 1 where id = new.commission_id;
    return new;
  end if;
  return null;
end;
$$;

drop trigger if exists on_commission_booked on public.commission_bookings;
create trigger on_commission_booked
  after insert on public.commission_bookings
  for each row execute procedure public.handle_commission_booking();

-- -------------------------------------------------
-- Function: Anti-snipe auto-extend on bids in final 5 min
-- -------------------------------------------------
create or replace function public.handle_anti_snipe()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  auction_end timestamptz;
  time_remaining interval;
begin
  select ends_at into auction_end from public.artworks where id = new.artwork_id;

  if auction_end is null then
    return new;
  end if;

  time_remaining := auction_end - now();

  -- If bid is within final 5 minutes, extend by 5 minutes
  if time_remaining > interval '0' and time_remaining <= interval '5 minutes' then
    update public.artworks
    set ends_at = auction_end + interval '5 minutes'
    where id = new.artwork_id;

    -- Log the extension
    insert into public.auction_extensions (artwork_id, bid_id, original_end, new_end)
    values (new.artwork_id, new.id, auction_end, auction_end + interval '5 minutes');
  end if;

  return new;
end;
$$;

drop trigger if exists on_bid_anti_snipe on public.bids;
create trigger on_bid_anti_snipe
  after insert on public.bids
  for each row execute procedure public.handle_anti_snipe();
