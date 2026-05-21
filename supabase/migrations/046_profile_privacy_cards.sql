-- ============================================================
-- FORMA - profile privacy and public profile cards
-- Full profiles include email and role/verification state. Public UI only
-- needs display name, handle, and avatar for comments/social surfaces.
-- Run after 045_auth_role_self_assignment_hardening.sql.
-- ============================================================

create table if not exists public.profile_cards (
  id uuid references public.profiles(id) on delete cascade primary key,
  display_name text not null default 'FORMA user',
  handle text,
  avatar_url text,
  updated_at timestamptz not null default now()
);

alter table public.profile_cards enable row level security;

grant select on public.profile_cards to anon, authenticated;

drop policy if exists "Profile cards are public" on public.profile_cards;
create policy "Profile cards are public"
  on public.profile_cards
  for select
  using (true);

create or replace function public.sync_profile_card()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profile_cards (id, display_name, handle, avatar_url, updated_at)
  values (
    new.id,
    coalesce(nullif(trim(new.display_name), ''), split_part(new.email, '@', 1), 'FORMA user'),
    nullif(trim(coalesce(new.handle, '')), ''),
    nullif(trim(coalesce(new.avatar_url, '')), ''),
    now()
  )
  on conflict (id) do update
    set display_name = excluded.display_name,
        handle = excluded.handle,
        avatar_url = excluded.avatar_url,
        updated_at = now();

  return new;
end;
$$;

drop trigger if exists sync_profile_card on public.profiles;
create trigger sync_profile_card
  after insert or update of display_name, handle, avatar_url, email on public.profiles
  for each row execute procedure public.sync_profile_card();

insert into public.profile_cards (id, display_name, handle, avatar_url, updated_at)
select
  p.id,
  coalesce(nullif(trim(p.display_name), ''), split_part(p.email, '@', 1), 'FORMA user'),
  nullif(trim(coalesce(p.handle, '')), ''),
  nullif(trim(coalesce(p.avatar_url, '')), ''),
  now()
from public.profiles p
on conflict (id) do update
  set display_name = excluded.display_name,
      handle = excluded.handle,
      avatar_url = excluded.avatar_url,
      updated_at = now();

drop policy if exists "Profiles are viewable by everyone" on public.profiles;
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "Admins can view profiles" on public.profiles;
create policy "Admins can view profiles"
  on public.profiles
  for select
  to authenticated
  using ((select private.is_admin()));

revoke execute on function public.sync_profile_card() from public, anon, authenticated;

notify pgrst, 'reload schema';
