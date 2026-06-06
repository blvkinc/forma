-- ============================================================
-- FORMA - profile handles, avatar storage, and seller upgrade hardening
-- Run after 048_seller_application_media_and_links.sql.
-- ============================================================

-- New auth profiles get a stable, unique handle. The UI treats profile
-- handles as system-managed; seller onboarding can still set the final
-- studio handle when an admin approves the application.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  requested_role text := coalesce(new.raw_user_meta_data ->> 'role', 'buyer');
  safe_role text := 'buyer';
  base_handle text;
  candidate_handle text;
  suffix integer := 0;
begin
  safe_role := case
    when requested_role = 'artist' then 'artist'
    else 'buyer'
  end;

  base_handle := private.slugify_handle(
    coalesce(
      new.raw_user_meta_data ->> 'handle',
      new.raw_user_meta_data ->> 'display_name',
      split_part(new.email, '@', 1),
      'forma-user'
    ),
    'forma-user'
  );
  candidate_handle := base_handle;

  while exists (
    select 1
    from public.profiles p
    where p.handle = candidate_handle
      and p.id <> new.id
  ) loop
    suffix := suffix + 1;
    candidate_handle := left(base_handle, 34) || '-' || suffix::text;
  end loop;

  insert into public.profiles (id, email, display_name, handle, role, verified)
  values (
    new.id,
    new.email,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1), 'FORMA user'),
    candidate_handle,
    safe_role,
    false
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

do $$
declare
  profile_row record;
  base_handle text;
  candidate_handle text;
  suffix integer;
begin
  for profile_row in
    select id, email, display_name
    from public.profiles
    where handle is null or trim(handle) = ''
    order by created_at, id
  loop
    base_handle := private.slugify_handle(
      coalesce(profile_row.display_name, split_part(profile_row.email, '@', 1), 'forma-user'),
      'forma-user'
    );
    candidate_handle := base_handle;
    suffix := 0;

    while exists (
      select 1
      from public.profiles p
      where p.handle = candidate_handle
        and p.id <> profile_row.id
    ) loop
      suffix := suffix + 1;
      candidate_handle := left(base_handle, 34) || '-' || suffix::text;
    end loop;

    update public.profiles
    set handle = candidate_handle,
        updated_at = now()
    where id = profile_row.id;
  end loop;
end $$;

create or replace function public.guard_profile_self_update()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if (select auth.uid()) = old.id then
    new.email := old.email;
    new.handle := old.handle;
    new.role := old.role;
    new.verified := old.verified;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.guard_profile_self_update() from public, anon, authenticated;

-- Avatar uploads are owner-scoped by both owner_id and path. The client now
-- writes unique objects without upsert, but update/delete stay owner-bound.
drop policy if exists "Users can upload own avatar" on storage.objects;
create policy "Users can upload own avatar"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and name like (select auth.uid())::text || '/%'
    and (
      owner_id = (select auth.uid())::text
      or owner_id is null
    )
  );

drop policy if exists "Users can update own avatar" on storage.objects;
create policy "Users can update own avatar"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and name like (select auth.uid())::text || '/%'
    and (
      owner_id = (select auth.uid())::text
      or owner_id is null
    )
  )
  with check (
    bucket_id = 'avatars'
    and name like (select auth.uid())::text || '/%'
    and (
      owner_id = (select auth.uid())::text
      or owner_id is null
    )
  );

drop policy if exists "Users can delete own avatar" on storage.objects;
create policy "Users can delete own avatar"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and name like (select auth.uid())::text || '/%'
    and (
      owner_id = (select auth.uid())::text
      or owner_id is null
    )
  );

-- A buyer can apply to sell from the same account. Publishing still requires
-- admin approval, which flips the profile role to artist and verified=true.
drop policy if exists "Sellers can submit own application" on public.seller_applications;
create policy "Sellers can submit own application"
  on public.seller_applications
  for insert
  to authenticated
  with check (
    profile_id = (select auth.uid())
    and status in ('draft', 'pending')
    and exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role in ('buyer', 'artist')
        and p.verified = false
    )
  );

drop policy if exists "Sellers can revise pending application" on public.seller_applications;
create policy "Sellers can revise pending application"
  on public.seller_applications
  for update
  to authenticated
  using (
    profile_id = (select auth.uid())
    and status in ('draft', 'pending', 'rejected')
    and exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role in ('buyer', 'artist')
        and p.verified = false
    )
  )
  with check (
    profile_id = (select auth.uid())
    and status in ('draft', 'pending')
    and exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role in ('buyer', 'artist')
        and p.verified = false
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
        and p.role in ('buyer', 'artist')
        and p.verified = false
    )
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
  sample_url text;
  profile_url text;
  has_profile_link boolean := false;
  has_complete_sample boolean := false;
begin
  if jsonb_typeof(coalesce(new.sample_works, '[]'::jsonb)) <> 'array' then
    raise exception 'Seller application sample works must be an array.';
  end if;

  if jsonb_array_length(coalesce(new.sample_works, '[]'::jsonb)) > 8 then
    raise exception 'Seller applications can include at most 8 sample works.';
  end if;

  if jsonb_typeof(coalesce(new.profile_links, '[]'::jsonb)) <> 'array' then
    raise exception 'Seller application profile links must be an array.';
  end if;

  if jsonb_array_length(coalesce(new.profile_links, '[]'::jsonb)) > 8 then
    raise exception 'Seller applications can include at most 8 profile links.';
  end if;

  if coalesce(new.portfolio_url, '') <> ''
     and new.portfolio_url !~* '^https://[^[:space:]]+$' then
    raise exception 'Seller application portfolio URL must use HTTPS.';
  end if;

  for sample in
    select value from jsonb_array_elements(coalesce(new.sample_works, '[]'::jsonb))
  loop
    storage_path := coalesce(sample ->> 'storagePath', sample ->> 'imagePath', '');
    sample_url := coalesce(sample ->> 'imageUrl', '');

    if storage_path <> '' and storage_path not like new.profile_id::text || '/%' then
      raise exception 'Seller application media must stay inside the applicant storage folder.';
    end if;

    if sample_url <> '' and sample_url !~* '^https://[^[:space:]]+$' then
      raise exception 'Seller application sample image URLs must use HTTPS.';
    end if;

    if length(trim(coalesce(sample ->> 'title', ''))) >= 2
       and length(trim(coalesce(sample ->> 'notes', ''))) >= 20
       and (storage_path <> '' or sample_url <> '') then
      has_complete_sample := true;
    end if;
  end loop;

  for link in
    select value from jsonb_array_elements(coalesce(new.profile_links, '[]'::jsonb))
  loop
    profile_url := coalesce(link ->> 'url', '');
    if profile_url <> '' and profile_url !~* '^https://[^[:space:]]+$' then
      raise exception 'Seller application profile links must use HTTPS URLs.';
    end if;
    if profile_url <> '' then
      has_profile_link := true;
    end if;
  end loop;

  if new.status = 'pending' then
    if length(trim(coalesce(new.studio_name, ''))) < 2 then
      raise exception 'Enter a studio name.';
    end if;

    if length(trim(coalesce(new.artist_statement, ''))) < 40 then
      raise exception 'Seller applications need an artist statement of at least 40 characters.';
    end if;

    if length(trim(coalesce(new.process_notes, ''))) < 40 then
      raise exception 'Seller applications need process notes or proof of work of at least 40 characters.';
    end if;

    if coalesce(new.portfolio_url, '') = ''
       and not has_profile_link
       and not has_complete_sample then
      raise exception 'Add an HTTPS portfolio/profile link or a completed sample with image and process notes.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists validate_seller_application_review_packet on public.seller_applications;
create trigger validate_seller_application_review_packet
  before insert or update on public.seller_applications
  for each row execute procedure public.validate_seller_application_review_packet();

revoke execute on function public.validate_seller_application_review_packet() from public, anon, authenticated;

notify pgrst, 'reload schema';
