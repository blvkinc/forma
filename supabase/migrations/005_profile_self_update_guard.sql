-- ============================================================
-- FORMA - Profile self-update guard
-- Prevent client-side profile edits from changing privileged fields.
-- ============================================================

create or replace function public.guard_profile_self_update()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() = old.id then
    new.email := old.email;
    new.role := old.role;
    new.verified := old.verified;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists guard_profile_self_update on public.profiles;

create trigger guard_profile_self_update
  before update on public.profiles
  for each row execute procedure public.guard_profile_self_update();
