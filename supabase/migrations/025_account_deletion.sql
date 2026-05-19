-- ============================================================
-- FORMA — self-service account deletion
-- A SECURITY DEFINER RPC lets a signed-in user delete their own
-- auth account. profiles + all owned rows cascade via existing FKs.
-- Run after 024_feed_reactions_and_saves.sql.
-- ============================================================

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  -- Remove the auth user; public.profiles and every table that
  -- references auth.users(id) on delete cascade follow automatically.
  delete from auth.users where id = uid;
end;
$$;

revoke execute on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;
