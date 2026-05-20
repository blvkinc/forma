-- ============================================================
-- FORMA - verified seller artwork storage
-- Artwork media uploads are seller inventory operations. Authenticated
-- buyers/admins may own avatar files, but only verified sellers should
-- be able to write to the artwork-images bucket.
-- Run after 038_social_participant_role_hardening.sql.
-- ============================================================

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.is_verified_seller()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'artist'
      and p.verified = true
  );
$$;

revoke all on function private.is_verified_seller() from public, anon;
grant execute on function private.is_verified_seller() to authenticated;

drop policy if exists "Artists can upload artwork images" on storage.objects;
create policy "Verified sellers can upload artwork images"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'artwork-images'
    and owner_id = (select auth.uid())::text
    and (select private.is_verified_seller())
  );

drop policy if exists "Artists can update own artwork images" on storage.objects;
create policy "Verified sellers can update own artwork images"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'artwork-images'
    and owner_id = (select auth.uid())::text
    and (select private.is_verified_seller())
  )
  with check (
    bucket_id = 'artwork-images'
    and owner_id = (select auth.uid())::text
    and (select private.is_verified_seller())
  );

drop policy if exists "Artists can delete own artwork images" on storage.objects;
create policy "Verified sellers can delete own artwork images"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'artwork-images'
    and owner_id = (select auth.uid())::text
    and (select private.is_verified_seller())
  );

notify pgrst, 'reload schema';
