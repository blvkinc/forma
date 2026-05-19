-- ============================================================
-- FORMA — Rule 1: one-week artwork listing window
-- An artist can list an artwork for at most one week; afterwards
-- it is automatically taken down (hidden from the marketplace).
-- Run after 014_pause_restricted_ai_bids.sql.
-- ============================================================

-- 1. Columns: when the listing expires and whether it is still live.
alter table public.artworks
  add column if not exists listing_expires_at timestamptz,
  add column if not exists is_active boolean not null default true,
  add column if not exists taken_down_at timestamptz;

-- Backfill existing rows: one week from when they were created.
update public.artworks
  set listing_expires_at = created_at + interval '7 days'
  where listing_expires_at is null;

-- New rows expire exactly one week after creation.
create or replace function public.set_artwork_listing_window()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if new.listing_expires_at is null then
    new.listing_expires_at := coalesce(new.created_at, now()) + interval '7 days';
  end if;
  new.is_active := true;
  new.taken_down_at := null;
  return new;
end;
$$;

drop trigger if exists on_artwork_listing_window on public.artworks;
create trigger on_artwork_listing_window
  before insert on public.artworks
  for each row execute procedure public.set_artwork_listing_window();

-- 2. Takedown job: flip expired listings to inactive.
create or replace function public.expire_artwork_listings()
returns integer
language plpgsql
security definer set search_path = ''
as $$
declare
  affected integer;
begin
  update public.artworks
    set is_active = false,
        taken_down_at = now()
    where is_active = true
      and listing_expires_at is not null
      and listing_expires_at <= now();
  get diagnostics affected = row_count;
  return affected;
end;
$$;

-- 3. Hide expired artworks from the marketplace immediately (even
--    before the job runs). The owning artist still sees their own
--    rows so they can re-list.
drop policy if exists "Artworks are viewable by everyone" on public.artworks;
create policy "Active artworks are viewable by everyone"
  on public.artworks for select using (
    is_active = true
    or exists (
      select 1 from public.artists a
      where a.id = artist_id
        and a.profile_id is not null
        and a.profile_id = auth.uid()
    )
  );

create index if not exists artworks_listing_expiry_idx
  on public.artworks (is_active, listing_expires_at);

-- 4. Schedule the takedown every 5 minutes via pg_cron when available.
--    If pg_cron is not enabled on this project, the migration still
--    succeeds; enable it (Dashboard → Database → Extensions → pg_cron)
--    and re-run the DO block, or call public.expire_artwork_listings()
--    from an Edge Function / external scheduler.
do $$
begin
  perform cron.schedule(
    'forma-expire-artwork-listings',
    '*/5 * * * *',
    $cron$ select public.expire_artwork_listings(); $cron$
  );
exception when undefined_function or undefined_table or invalid_schema_name then
  raise notice 'pg_cron not available — call public.expire_artwork_listings() from an external scheduler.';
end;
$$;
