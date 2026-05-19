-- ============================================================
-- FORMA — admin enforcement: artwork takedown + artist suspension
-- Adds moderation flags and admin-only RPCs (gated by
-- private.is_admin(), audited to public.audit_log).
-- Run after 027_drop_alert_subscriptions.sql.
-- ============================================================

alter table public.artworks
  add column if not exists taken_down boolean not null default false;

alter table public.artists
  add column if not exists suspended boolean not null default false;

create index if not exists artworks_taken_down_idx
  on public.artworks (taken_down) where taken_down;
create index if not exists artists_suspended_idx
  on public.artists (suspended) where suspended;

-- Take down / reinstate an artwork.
create or replace function public.admin_set_artwork_takedown(p_artwork_id text, p_value boolean)
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  if not (select private.is_admin()) then
    raise exception 'Admin privilege required';
  end if;

  update public.artworks set taken_down = p_value where id = p_artwork_id;

  insert into public.audit_log (actor_id, action, target_type, target_id, detail)
  values (
    (select auth.uid()),
    case when p_value then 'artwork_takedown' else 'artwork_reinstate' end,
    'artwork',
    p_artwork_id,
    case when p_value then 'Artwork taken down by admin' else 'Artwork reinstated by admin' end
  );
end;
$$;

-- Suspend / reinstate a studio.
create or replace function public.admin_set_artist_suspended(p_artist_id text, p_value boolean)
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  if not (select private.is_admin()) then
    raise exception 'Admin privilege required';
  end if;

  update public.artists set suspended = p_value where id = p_artist_id;

  insert into public.audit_log (actor_id, action, target_type, target_id, detail)
  values (
    (select auth.uid()),
    case when p_value then 'artist_suspend' else 'artist_reinstate' end,
    'artist',
    p_artist_id,
    case when p_value then 'Studio suspended by admin' else 'Studio reinstated by admin' end
  );
end;
$$;

revoke execute on function public.admin_set_artwork_takedown(text, boolean) from public, anon;
revoke execute on function public.admin_set_artist_suspended(text, boolean) from public, anon;
grant execute on function public.admin_set_artwork_takedown(text, boolean) to authenticated;
grant execute on function public.admin_set_artist_suspended(text, boolean) to authenticated;
