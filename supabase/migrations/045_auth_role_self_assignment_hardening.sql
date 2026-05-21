-- ============================================================
-- FORMA - auth role self-assignment hardening
-- Supabase user_metadata is user-controlled. Never trust it for
-- privileged roles. Run after 044_marketplace_business_rule_constraints.sql.
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  requested_role text := coalesce(new.raw_user_meta_data ->> 'role', 'buyer');
  safe_role text := 'buyer';
begin
  safe_role := case
    when requested_role = 'artist' then 'artist'
    else 'buyer'
  end;

  insert into public.profiles (id, email, display_name, role, verified)
  values (
    new.id,
    new.email,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1), 'FORMA user'),
    safe_role,
    false
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Users can insert safe own profile" on public.profiles;
create policy "Users can insert safe own profile"
  on public.profiles
  for insert
  to authenticated
  with check (
    (select auth.uid()) = id
    and role in ('buyer', 'artist')
    and verified = false
  );

create or replace function public.guard_profile_self_update()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if (select auth.uid()) = old.id then
    new.email := old.email;
    new.role := old.role;
    new.verified := old.verified;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.guard_profile_self_update() from public, anon, authenticated;

notify pgrst, 'reload schema';
