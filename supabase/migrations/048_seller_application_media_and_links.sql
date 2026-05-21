-- ============================================================
-- FORMA - seller application media and profile links
-- Adds private onboarding media uploads plus richer application
-- metadata for admin seller review.
-- Run after 047_disable_client_side_purchase_adapter.sql.
-- ============================================================

alter table public.seller_applications
  add column if not exists artist_statement text,
  add column if not exists profile_links jsonb not null default '[]'::jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'seller_applications_profile_links_array'
      and conrelid = 'public.seller_applications'::regclass
  ) then
    alter table public.seller_applications
      add constraint seller_applications_profile_links_array
      check (jsonb_typeof(profile_links) = 'array');
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'seller_applications_sample_works_limit'
      and conrelid = 'public.seller_applications'::regclass
  ) then
    alter table public.seller_applications
      add constraint seller_applications_sample_works_limit
      check (jsonb_array_length(sample_works) <= 8);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'seller_applications_profile_links_limit'
      and conrelid = 'public.seller_applications'::regclass
  ) then
    alter table public.seller_applications
      add constraint seller_applications_profile_links_limit
      check (jsonb_array_length(profile_links) <= 8);
  end if;
end $$;

grant select, insert, update on public.seller_applications to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'seller-application-media',
  'seller-application-media',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Applicants and admins can read seller application media" on storage.objects;
create policy "Applicants and admins can read seller application media"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'seller-application-media'
    and (
      owner_id = (select auth.uid())::text
      or (select private.is_admin())
    )
  );

drop policy if exists "Applicants can upload own seller application media" on storage.objects;
create policy "Applicants can upload own seller application media"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'seller-application-media'
    and owner_id = (select auth.uid())::text
    and name like (select auth.uid())::text || '/%'
    and exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'artist'
        and p.verified = false
    )
  );

drop policy if exists "Applicants can update own seller application media" on storage.objects;
create policy "Applicants can update own seller application media"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'seller-application-media'
    and owner_id = (select auth.uid())::text
  )
  with check (
    bucket_id = 'seller-application-media'
    and owner_id = (select auth.uid())::text
    and name like (select auth.uid())::text || '/%'
  );

drop policy if exists "Applicants can delete own seller application media" on storage.objects;
create policy "Applicants can delete own seller application media"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'seller-application-media'
    and owner_id = (select auth.uid())::text
  );

create or replace function public.validate_seller_application_review_packet()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  sample jsonb;
  link jsonb;
  storage_path text;
  profile_url text;
begin
  if jsonb_typeof(new.sample_works) <> 'array' then
    raise exception 'Seller application sample works must be an array.';
  end if;

  if jsonb_array_length(new.sample_works) > 8 then
    raise exception 'Seller applications can include at most 8 sample works.';
  end if;

  for sample in
    select value from jsonb_array_elements(new.sample_works)
  loop
    storage_path := coalesce(sample ->> 'storagePath', sample ->> 'imagePath');
    if storage_path is not null
       and storage_path <> ''
       and storage_path not like new.profile_id::text || '/%' then
      raise exception 'Seller application media must stay inside the applicant storage folder.';
    end if;
  end loop;

  if jsonb_typeof(new.profile_links) <> 'array' then
    raise exception 'Seller application profile links must be an array.';
  end if;

  if jsonb_array_length(new.profile_links) > 8 then
    raise exception 'Seller applications can include at most 8 profile links.';
  end if;

  for link in
    select value from jsonb_array_elements(new.profile_links)
  loop
    profile_url := coalesce(link ->> 'url', '');
    if profile_url <> '' and profile_url !~* '^https://[^[:space:]]+$' then
      raise exception 'Seller application profile links must use HTTPS URLs.';
    end if;
  end loop;

  return new;
end;
$$;

drop trigger if exists validate_seller_application_review_packet on public.seller_applications;
create trigger validate_seller_application_review_packet
  before insert or update on public.seller_applications
  for each row execute procedure public.validate_seller_application_review_packet();

revoke execute on function public.validate_seller_application_review_packet() from public, anon, authenticated;

notify pgrst, 'reload schema';
