-- ============================================================
-- FORMA — Phase 2: Catalogue & Interaction Tables
-- Run this in the Supabase SQL Editor AFTER 001_profiles.sql
-- ============================================================

-- -------------------------------------------------
-- Artists (catalogue entities, not auth users)
-- -------------------------------------------------
create table if not exists public.artists (
  id text primary key,
  handle text unique not null,
  name text not null,
  city text,
  joined text,
  followers integer not null default 0,
  bio text,
  verified boolean not null default false,
  accent text default '#0E0E0C',
  profile_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.artists enable row level security;
create policy "Artists are viewable by everyone"
  on public.artists for select using (true);
create policy "Artists can update own row"
  on public.artists for update using (
    profile_id is not null and auth.uid() = profile_id
  );

-- -------------------------------------------------
-- Artworks
-- -------------------------------------------------
create table if not exists public.artworks (
  id text primary key,
  title text not null,
  visual text not null,
  artist_id text references public.artists(id) on delete cascade not null,
  year integer,
  dimensions text,
  edition text,
  start_bid numeric not null default 0,
  current_bid numeric not null default 0,
  bid_count integer not null default 0,
  watcher_count integer not null default 0,
  ends_at timestamptz not null,
  tags text[] default '{}',
  like_count integer not null default 0,
  format text,
  created_at timestamptz not null default now()
);

alter table public.artworks enable row level security;
create policy "Artworks are viewable by everyone"
  on public.artworks for select using (true);
create policy "Artworks can be updated by artist owner"
  on public.artworks for update using (
    exists (
      select 1 from public.artists a
      where a.id = artist_id
        and a.profile_id is not null
        and a.profile_id = auth.uid()
    )
  );
create policy "Artworks can be inserted by artists"
  on public.artworks for insert with check (
    exists (
      select 1 from public.artists a
      where a.id = artist_id
        and a.profile_id is not null
        and a.profile_id = auth.uid()
    )
  );

-- -------------------------------------------------
-- Commissions
-- -------------------------------------------------
create table if not exists public.commissions (
  id text primary key,
  artist_id text references public.artists(id) on delete cascade not null,
  title text not null,
  slots integer not null default 1,
  taken integer not null default 0,
  price numeric not null default 0,
  days integer not null default 7,
  brief text,
  created_at timestamptz not null default now()
);

alter table public.commissions enable row level security;
create policy "Commissions are viewable by everyone"
  on public.commissions for select using (true);
create policy "Commissions can be managed by artist owner"
  on public.commissions for all using (
    exists (
      select 1 from public.artists a
      where a.id = artist_id
        and a.profile_id is not null
        and a.profile_id = auth.uid()
    )
  );

-- -------------------------------------------------
-- Feed posts
-- -------------------------------------------------
create table if not exists public.feed_posts (
  id text primary key,
  artist_id text references public.artists(id) on delete cascade not null,
  type text not null check (type in ('drop', 'process', 'note', 'sold')),
  posted_at text,
  body text not null,
  artwork_id text references public.artworks(id) on delete set null,
  like_count integer not null default 0,
  comment_count integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.feed_posts enable row level security;
create policy "Feed posts are viewable by everyone"
  on public.feed_posts for select using (true);
create policy "Feed posts can be managed by artist owner"
  on public.feed_posts for all using (
    exists (
      select 1 from public.artists a
      where a.id = artist_id
        and a.profile_id is not null
        and a.profile_id = auth.uid()
    )
  );

-- -------------------------------------------------
-- User Likes (user_id + artwork_id)
-- -------------------------------------------------
create table if not exists public.user_likes (
  user_id uuid references auth.users(id) on delete cascade not null,
  artwork_id text references public.artworks(id) on delete cascade not null,
  created_at timestamptz not null default now(),
  primary key (user_id, artwork_id)
);

alter table public.user_likes enable row level security;
create policy "Users can read own likes"
  on public.user_likes for select using (auth.uid() = user_id);
create policy "Users can insert own likes"
  on public.user_likes for insert with check (auth.uid() = user_id);
create policy "Users can delete own likes"
  on public.user_likes for delete using (auth.uid() = user_id);

-- -------------------------------------------------
-- User Follows (user_id + artist_id)
-- -------------------------------------------------
create table if not exists public.user_follows (
  user_id uuid references auth.users(id) on delete cascade not null,
  artist_id text references public.artists(id) on delete cascade not null,
  created_at timestamptz not null default now(),
  primary key (user_id, artist_id)
);

alter table public.user_follows enable row level security;
create policy "Users can read own follows"
  on public.user_follows for select using (auth.uid() = user_id);
create policy "Users can insert own follows"
  on public.user_follows for insert with check (auth.uid() = user_id);
create policy "Users can delete own follows"
  on public.user_follows for delete using (auth.uid() = user_id);

-- -------------------------------------------------
-- User Watchlist (user_id + artwork_id)
-- -------------------------------------------------
create table if not exists public.user_watchlist (
  user_id uuid references auth.users(id) on delete cascade not null,
  artwork_id text references public.artworks(id) on delete cascade not null,
  created_at timestamptz not null default now(),
  primary key (user_id, artwork_id)
);

alter table public.user_watchlist enable row level security;
create policy "Users can read own watchlist"
  on public.user_watchlist for select using (auth.uid() = user_id);
create policy "Users can insert own watchlist"
  on public.user_watchlist for insert with check (auth.uid() = user_id);
create policy "Users can delete own watchlist"
  on public.user_watchlist for delete using (auth.uid() = user_id);

-- -------------------------------------------------
-- Bids
-- -------------------------------------------------
create table if not exists public.bids (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  artwork_id text references public.artworks(id) on delete cascade not null,
  amount numeric not null,
  display_name text not null default 'Anonymous',
  placed_at timestamptz not null default now()
);

alter table public.bids enable row level security;
create policy "Bids are viewable by everyone"
  on public.bids for select using (true);
create policy "Users can insert own bids"
  on public.bids for insert with check (auth.uid() = user_id);

-- -------------------------------------------------
-- Function: update artwork current_bid on new bid
-- -------------------------------------------------
create or replace function public.handle_new_bid()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  update public.artworks
  set current_bid = new.amount,
      bid_count = bid_count + 1
  where id = new.artwork_id
    and new.amount > current_bid;
  return new;
end;
$$;

drop trigger if exists on_bid_placed on public.bids;
create trigger on_bid_placed
  after insert on public.bids
  for each row execute procedure public.handle_new_bid();

-- -------------------------------------------------
-- Function: update artwork like_count on like/unlike
-- -------------------------------------------------
create or replace function public.handle_like_change()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if (tg_op = 'INSERT') then
    update public.artworks set like_count = like_count + 1 where id = new.artwork_id;
    return new;
  elsif (tg_op = 'DELETE') then
    update public.artworks set like_count = greatest(0, like_count - 1) where id = old.artwork_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists on_like_change on public.user_likes;
create trigger on_like_change
  after insert or delete on public.user_likes
  for each row execute procedure public.handle_like_change();

-- -------------------------------------------------
-- Function: update artist followers on follow/unfollow
-- -------------------------------------------------
create or replace function public.handle_follow_change()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if (tg_op = 'INSERT') then
    update public.artists set followers = followers + 1 where id = new.artist_id;
    return new;
  elsif (tg_op = 'DELETE') then
    update public.artists set followers = greatest(0, followers - 1) where id = old.artist_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists on_follow_change on public.user_follows;
create trigger on_follow_change
  after insert or delete on public.user_follows
  for each row execute procedure public.handle_follow_change();

-- -------------------------------------------------
-- Function: update artwork watcher_count on watch/unwatch
-- -------------------------------------------------
create or replace function public.handle_watch_change()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if (tg_op = 'INSERT') then
    update public.artworks set watcher_count = watcher_count + 1 where id = new.artwork_id;
    return new;
  elsif (tg_op = 'DELETE') then
    update public.artworks set watcher_count = greatest(0, watcher_count - 1) where id = old.artwork_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists on_watch_change on public.user_watchlist;
create trigger on_watch_change
  after insert or delete on public.user_watchlist
  for each row execute procedure public.handle_watch_change();
