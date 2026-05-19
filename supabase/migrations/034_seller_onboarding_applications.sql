-- ============================================================
-- FORMA - seller onboarding applications
-- Sellers apply with portfolio/process samples. Admin approval
-- verifies the profile and creates/updates the linked studio row.
-- Run after 033_automatic_auction_closeout.sql.
-- ============================================================

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table if not exists public.seller_applications (
  id uuid default gen_random_uuid() primary key,
  profile_id uuid references public.profiles(id) on delete cascade not null unique,
  studio_name text not null,
  handle text,
  city text,
  bio text,
  portfolio_url text,
  process_notes text,
  sample_works jsonb not null default '[]'::jsonb,
  status text not null default 'pending'
    check (status in ('draft', 'pending', 'approved', 'rejected')),
  review_note text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint seller_applications_sample_works_array
    check (jsonb_typeof(sample_works) = 'array')
);

alter table public.seller_applications enable row level security;

grant select, insert, update on public.seller_applications to authenticated;

create index if not exists seller_applications_status_idx
  on public.seller_applications (status, created_at desc);
create index if not exists seller_applications_reviewed_by_idx
  on public.seller_applications (reviewed_by);

create unique index if not exists artists_profile_id_unique_idx
  on public.artists (profile_id)
  where profile_id is not null;

drop policy if exists "Sellers can view own application" on public.seller_applications;
create policy "Sellers can view own application"
  on public.seller_applications
  for select
  to authenticated
  using (profile_id = (select auth.uid()));

drop policy if exists "Admins can view seller applications" on public.seller_applications;
create policy "Admins can view seller applications"
  on public.seller_applications
  for select
  to authenticated
  using ((select private.is_admin()));

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
        and p.role = 'artist'
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
  )
  with check (
    profile_id = (select auth.uid())
    and status in ('draft', 'pending')
  );

drop policy if exists "Admins can review seller applications" on public.seller_applications;
create policy "Admins can review seller applications"
  on public.seller_applications
  for update
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create or replace function private.slugify_handle(p_value text, p_fallback text default 'studio')
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  slug text;
begin
  slug := lower(coalesce(nullif(trim(p_value), ''), p_fallback));
  slug := regexp_replace(slug, '[^a-z0-9]+', '-', 'g');
  slug := trim(both '-' from slug);
  slug := left(coalesce(nullif(slug, ''), p_fallback), 48);
  return slug;
end;
$$;

revoke all on function private.slugify_handle(text, text) from public, anon;
grant execute on function private.slugify_handle(text, text) to authenticated;

create or replace function public.guard_seller_application_update()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  is_reviewer boolean;
begin
  is_reviewer := (select private.is_admin());

  if tg_op = 'INSERT' then
    new.created_at := coalesce(new.created_at, now());
    new.updated_at := now();
    new.reviewed_by := null;
    new.reviewed_at := null;
    new.review_note := null;
    return new;
  end if;

  new.profile_id := old.profile_id;
  new.created_at := old.created_at;
  new.updated_at := now();

  if not is_reviewer then
    if old.status = 'approved' then
      raise exception 'Approved seller applications cannot be changed.';
    end if;

    if new.status not in ('draft', 'pending') then
      raise exception 'Seller applications can only be saved as draft or pending.';
    end if;

    new.reviewed_by := old.reviewed_by;
    new.reviewed_at := old.reviewed_at;
    new.review_note := old.review_note;
    return new;
  end if;

  if new.status is distinct from old.status
     and new.status in ('approved', 'rejected') then
    new.reviewed_by := (select auth.uid());
    new.reviewed_at := now();
  end if;

  return new;
end;
$$;

drop trigger if exists guard_seller_application_update on public.seller_applications;
create trigger guard_seller_application_update
  before insert or update on public.seller_applications
  for each row execute procedure public.guard_seller_application_update();

create or replace function public.handle_seller_application_review()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  base_handle text;
  candidate_handle text;
  suffix integer := 0;
  existing_artist_id text;
  candidate_artist_id text;
  applicant_email text;
  applicant_name text;
begin
  if new.status = old.status or new.status not in ('approved', 'rejected') then
    return new;
  end if;

  select p.email, p.display_name
    into applicant_email, applicant_name
  from public.profiles p
  where p.id = new.profile_id;

  if new.status = 'approved' then
    base_handle := private.slugify_handle(coalesce(new.handle, new.studio_name, applicant_name, applicant_email), 'studio');
    candidate_handle := base_handle;

    while exists (
      select 1
      from public.artists a
      where a.handle = candidate_handle
        and (a.profile_id is null or a.profile_id <> new.profile_id)
    ) loop
      suffix := suffix + 1;
      candidate_handle := left(base_handle, 40) || '-' || suffix::text;
    end loop;

    select a.id
      into existing_artist_id
    from public.artists a
    where a.profile_id = new.profile_id
    limit 1;

    if existing_artist_id is null then
      candidate_artist_id := 'seller-' || candidate_handle;
      if exists (select 1 from public.artists a where a.id = candidate_artist_id) then
        candidate_artist_id := 'seller-' || candidate_handle || '-' || left(replace(new.profile_id::text, '-', ''), 8);
      end if;

      insert into public.artists (
        id,
        handle,
        name,
        city,
        joined,
        followers,
        bio,
        verified,
        accent,
        profile_id,
        suspended
      )
      values (
        candidate_artist_id,
        candidate_handle,
        left(trim(new.studio_name), 120),
        nullif(left(trim(coalesce(new.city, '')), 120), ''),
        extract(year from now())::text,
        0,
        nullif(left(trim(coalesce(new.bio, '')), 900), ''),
        true,
        '#0E0E0C',
        new.profile_id,
        false
      );
    else
      update public.artists
      set handle = candidate_handle,
          name = left(trim(new.studio_name), 120),
          city = nullif(left(trim(coalesce(new.city, '')), 120), ''),
          bio = nullif(left(trim(coalesce(new.bio, '')), 900), ''),
          verified = true,
          suspended = false
      where id = existing_artist_id;
      candidate_artist_id := existing_artist_id;
    end if;

    update public.profiles
    set verified = true,
        role = 'artist',
        display_name = coalesce(nullif(left(trim(new.studio_name), 120), ''), display_name),
        handle = case
          when exists (
            select 1
            from public.profiles p
            where p.handle = candidate_handle
              and p.id <> new.profile_id
          ) then handle
          else candidate_handle
        end,
        city = nullif(left(trim(coalesce(new.city, '')), 120), ''),
        bio = nullif(left(trim(coalesce(new.bio, '')), 900), ''),
        updated_at = now()
    where id = new.profile_id;

    insert into public.notifications (user_id, type, title, body, link_type, link_id)
    values (
      new.profile_id,
      'seller_approved',
      'Studio approved',
      'Your seller application was approved. Studio tools are now available.',
      'artist',
      candidate_artist_id
    );

    insert into public.audit_log (actor_id, action, target_type, target_id, detail)
    values (
      (select auth.uid()),
      'seller_application.approved',
      'seller_application',
      new.id::text,
      coalesce(new.studio_name, applicant_email, new.profile_id::text)
    );
  else
    update public.profiles
    set verified = false,
        updated_at = now()
    where id = new.profile_id
      and role = 'artist';

    update public.artists
    set verified = false,
        suspended = true
    where profile_id = new.profile_id;

    insert into public.notifications (user_id, type, title, body, link_type, link_id)
    values (
      new.profile_id,
      'seller_rejected',
      'Seller review returned',
      coalesce(nullif(new.review_note, ''), 'Your seller application needs more proof of work before approval.'),
      'profile',
      new.profile_id::text
    );

    insert into public.audit_log (actor_id, action, target_type, target_id, detail)
    values (
      (select auth.uid()),
      'seller_application.rejected',
      'seller_application',
      new.id::text,
      coalesce(new.review_note, new.studio_name, applicant_email, new.profile_id::text)
    );
  end if;

  return new;
end;
$$;

drop trigger if exists on_seller_application_reviewed on public.seller_applications;
create trigger on_seller_application_reviewed
  after update on public.seller_applications
  for each row execute procedure public.handle_seller_application_review();

-- Require admin-approved seller profiles before studio/listing writes.
drop policy if exists "Sellers can insert own artist row" on public.artists;
create policy "Sellers can insert own artist row"
  on public.artists
  for insert
  to authenticated
  with check (
    profile_id = (select auth.uid())
    and exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'artist'
        and p.verified = true
    )
  );

drop policy if exists "Sellers can update own artist row" on public.artists;
create policy "Sellers can update own artist row"
  on public.artists
  for update
  to authenticated
  using (
    profile_id = (select auth.uid())
    and exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'artist'
        and p.verified = true
    )
  )
  with check (
    profile_id = (select auth.uid())
    and exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'artist'
        and p.verified = true
    )
  );

drop policy if exists "Sellers can insert own artworks" on public.artworks;
create policy "Sellers can insert own artworks"
  on public.artworks
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.artists a
      join public.profiles p on p.id = a.profile_id
      where a.id = artist_id
        and a.profile_id = (select auth.uid())
        and p.role = 'artist'
        and p.verified = true
    )
  );

drop policy if exists "Sellers can update own artworks" on public.artworks;
create policy "Sellers can update own artworks"
  on public.artworks
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.artists a
      join public.profiles p on p.id = a.profile_id
      where a.id = artist_id
        and a.profile_id = (select auth.uid())
        and p.role = 'artist'
        and p.verified = true
    )
  )
  with check (
    exists (
      select 1
      from public.artists a
      join public.profiles p on p.id = a.profile_id
      where a.id = artist_id
        and a.profile_id = (select auth.uid())
        and p.role = 'artist'
        and p.verified = true
    )
  );

drop policy if exists "Sellers can insert own commissions" on public.commissions;
create policy "Sellers can insert own commissions"
  on public.commissions
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.artists a
      join public.profiles p on p.id = a.profile_id
      where a.id = artist_id
        and a.profile_id = (select auth.uid())
        and p.role = 'artist'
        and p.verified = true
    )
  );

drop policy if exists "Sellers can update own commissions" on public.commissions;
create policy "Sellers can update own commissions"
  on public.commissions
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.artists a
      join public.profiles p on p.id = a.profile_id
      where a.id = artist_id
        and a.profile_id = (select auth.uid())
        and p.role = 'artist'
        and p.verified = true
    )
  )
  with check (
    exists (
      select 1
      from public.artists a
      join public.profiles p on p.id = a.profile_id
      where a.id = artist_id
        and a.profile_id = (select auth.uid())
        and p.role = 'artist'
        and p.verified = true
    )
  );

drop policy if exists "Sellers can delete own commissions" on public.commissions;
create policy "Sellers can delete own commissions"
  on public.commissions
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.artists a
      join public.profiles p on p.id = a.profile_id
      where a.id = artist_id
        and a.profile_id = (select auth.uid())
        and p.role = 'artist'
        and p.verified = true
    )
  );

drop policy if exists "Sellers can insert own feed posts" on public.feed_posts;
create policy "Sellers can insert own feed posts"
  on public.feed_posts
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.artists a
      join public.profiles p on p.id = a.profile_id
      where a.id = artist_id
        and a.profile_id = (select auth.uid())
        and p.role = 'artist'
        and p.verified = true
    )
  );

drop policy if exists "Sellers can update own feed posts" on public.feed_posts;
create policy "Sellers can update own feed posts"
  on public.feed_posts
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.artists a
      join public.profiles p on p.id = a.profile_id
      where a.id = artist_id
        and a.profile_id = (select auth.uid())
        and p.role = 'artist'
        and p.verified = true
    )
  )
  with check (
    exists (
      select 1
      from public.artists a
      join public.profiles p on p.id = a.profile_id
      where a.id = artist_id
        and a.profile_id = (select auth.uid())
        and p.role = 'artist'
        and p.verified = true
    )
  );

drop policy if exists "Sellers can delete own feed posts" on public.feed_posts;
create policy "Sellers can delete own feed posts"
  on public.feed_posts
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.artists a
      join public.profiles p on p.id = a.profile_id
      where a.id = artist_id
        and a.profile_id = (select auth.uid())
        and p.role = 'artist'
        and p.verified = true
    )
  );

revoke execute on function public.guard_seller_application_update() from public, anon, authenticated;
revoke execute on function public.handle_seller_application_review() from public, anon, authenticated;

notify pgrst, 'reload schema';
