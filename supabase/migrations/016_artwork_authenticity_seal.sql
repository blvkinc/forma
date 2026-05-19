-- ============================================================
-- FORMA — Rule 2: per-artwork authenticity seal
-- Every uploaded artwork gets a unique authenticity hash. The
-- hash is readable ONLY by the owning artist and the buyer who
-- purchased the work; it verifies the artwork's authenticity.
-- Run after 015_artwork_listing_window.sql.
-- ============================================================

create extension if not exists pgcrypto with schema extensions;

-- -------------------------------------------------
-- 1. Ownership record: who bought which artwork.
--    (No explicit purchase/order table existed before.)
-- -------------------------------------------------
create table if not exists public.purchases (
  id uuid default gen_random_uuid() primary key,
  artwork_id text references public.artworks(id) on delete cascade not null,
  buyer_id uuid references auth.users(id) on delete cascade not null,
  amount numeric not null default 0,
  created_at timestamptz not null default now(),
  unique (artwork_id, buyer_id)
);

alter table public.purchases enable row level security;

-- Buyer can see their own purchases.
create policy "Buyers can read own purchases"
  on public.purchases for select using (auth.uid() = buyer_id);

-- The artwork's artist can see who bought their work.
create policy "Artist owner can read purchases of own artwork"
  on public.purchases for select using (
    exists (
      select 1
      from public.artworks w
      join public.artists a on a.id = w.artist_id
      where w.id = artwork_id
        and a.profile_id is not null
        and a.profile_id = auth.uid()
    )
  );

-- A buyer records their own purchase (escrow/Stripe adapter will
-- replace this with a server-side writer later).
create policy "Buyers can insert own purchase"
  on public.purchases for insert with check (auth.uid() = buyer_id);

create index if not exists purchases_artwork_idx on public.purchases (artwork_id);
create index if not exists purchases_buyer_idx on public.purchases (buyer_id);

-- -------------------------------------------------
-- 2. Authenticity seal, kept in its own table so RLS can hide it
--    from everyone except the artist + the buyer. (Postgres RLS is
--    row-level, so a separate row per artwork is how we scope a
--    "column" to specific viewers.)
-- -------------------------------------------------
create table if not exists public.artwork_authenticity_seal (
  artwork_id text primary key references public.artworks(id) on delete cascade,
  authenticity_hash text not null unique,
  issued_at timestamptz not null default now()
);

alter table public.artwork_authenticity_seal enable row level security;

-- Visible to the owning artist…
create policy "Artist owner can read authenticity seal"
  on public.artwork_authenticity_seal for select using (
    exists (
      select 1
      from public.artworks w
      join public.artists a on a.id = w.artist_id
      where w.id = artwork_id
        and a.profile_id is not null
        and a.profile_id = auth.uid()
    )
  );

-- …and to a buyer who has purchased that artwork. Nobody else
-- (including anonymous visitors and other buyers) can read it.
create policy "Buyer of the artwork can read authenticity seal"
  on public.artwork_authenticity_seal for select using (
    exists (
      select 1 from public.purchases p
      where p.artwork_id = artwork_authenticity_seal.artwork_id
        and p.buyer_id = auth.uid()
    )
  );

-- -------------------------------------------------
-- 3. Generate a unique hash for every artwork (existing + future).
--    SHA-256 over the artwork's stable identity plus a per-row
--    UUID so the value is unique and non-guessable.
-- -------------------------------------------------
create or replace function public.issue_artwork_authenticity_seal()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.artwork_authenticity_seal (artwork_id, authenticity_hash)
  values (
    new.id,
    encode(
      extensions.digest(
        new.id || ':' || new.artist_id || ':' ||
        coalesce(new.created_at, now())::text || ':' ||
        gen_random_uuid()::text,
        'sha256'
      ),
      'hex'
    )
  )
  on conflict (artwork_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_artwork_issue_seal on public.artworks;
create trigger on_artwork_issue_seal
  after insert on public.artworks
  for each row execute procedure public.issue_artwork_authenticity_seal();

-- Backfill seals for artworks created before this migration.
insert into public.artwork_authenticity_seal (artwork_id, authenticity_hash)
select w.id,
       encode(
         extensions.digest(
           w.id || ':' || w.artist_id || ':' ||
           w.created_at::text || ':' || gen_random_uuid()::text,
           'sha256'
         ),
         'hex'
       )
from public.artworks w
on conflict (artwork_id) do nothing;
