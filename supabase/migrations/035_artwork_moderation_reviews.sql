-- ============================================================
-- FORMA - artwork moderation review desk
-- Admins can review artwork evidence, record a decision note, and
-- track whether a listing was cleared or taken down.
-- Run after 034_seller_onboarding_applications.sql.
-- ============================================================

create table if not exists public.artwork_moderation_reviews (
  id uuid default gen_random_uuid() primary key,
  artwork_id text references public.artworks(id) on delete cascade not null unique,
  status text not null default 'queued'
    check (status in ('queued', 'reviewing', 'cleared', 'taken_down')),
  priority text not null default 'normal'
    check (priority in ('low', 'normal', 'high')),
  reason text,
  review_note text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.artwork_moderation_reviews enable row level security;

grant select, insert, update on public.artwork_moderation_reviews to authenticated;

drop policy if exists "Admins can view artwork moderation reviews" on public.artwork_moderation_reviews;
create policy "Admins can view artwork moderation reviews"
  on public.artwork_moderation_reviews
  for select
  to authenticated
  using ((select private.is_admin()));

drop policy if exists "Admins can write artwork moderation reviews" on public.artwork_moderation_reviews;
create policy "Admins can write artwork moderation reviews"
  on public.artwork_moderation_reviews
  for insert
  to authenticated
  with check ((select private.is_admin()));

drop policy if exists "Admins can update artwork moderation reviews" on public.artwork_moderation_reviews;
create policy "Admins can update artwork moderation reviews"
  on public.artwork_moderation_reviews
  for update
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create index if not exists artwork_moderation_reviews_status_idx
  on public.artwork_moderation_reviews (status, priority, updated_at desc);

create or replace function public.guard_artwork_moderation_review()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if not (select private.is_admin()) then
    raise exception 'Admin privilege required';
  end if;

  if tg_op = 'INSERT' then
    new.created_at := coalesce(new.created_at, now());
  else
    new.artwork_id := old.artwork_id;
    new.created_at := old.created_at;
  end if;

  new.updated_at := now();

  if new.status in ('reviewing', 'cleared', 'taken_down') then
    new.reviewed_by := (select auth.uid());
    new.reviewed_at := now();
  end if;

  return new;
end;
$$;

drop trigger if exists guard_artwork_moderation_review on public.artwork_moderation_reviews;
create trigger guard_artwork_moderation_review
  before insert or update on public.artwork_moderation_reviews
  for each row execute procedure public.guard_artwork_moderation_review();

create or replace function public.guard_artwork_ai_proof_review()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if new.status is distinct from old.status
     and new.status in ('accepted', 'rejected') then
    if not (select private.is_admin()) then
      raise exception 'Admin privilege required';
    end if;

    new.reviewed_by := (select auth.uid());
    new.reviewed_at := now();
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists guard_artwork_ai_proof_review on public.artwork_ai_proofs;
create trigger guard_artwork_ai_proof_review
  before update on public.artwork_ai_proofs
  for each row execute procedure public.guard_artwork_ai_proof_review();

create or replace function public.apply_artwork_ai_proof_review()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  vote_total integer;
  artist_owner uuid;
  art_title text;
begin
  if new.status is not distinct from old.status
     or new.status not in ('accepted', 'rejected') then
    return new;
  end if;

  select w.ai_vote_count, a.profile_id, w.title
    into vote_total, artist_owner, art_title
  from public.artworks w
  join public.artists a on a.id = w.artist_id
  where w.id = new.artwork_id;

  if new.status = 'accepted' then
    update public.artworks
    set authenticity_status = 'verified',
        authenticity_note = 'Artist process proof accepted by staff review.',
        authenticity_updated_at = now()
    where id = new.artwork_id;

    if artist_owner is not null then
      insert into public.notifications (user_id, type, title, body, link_type, link_id)
      values (
        artist_owner,
        'artwork_proof_accepted',
        'Process proof accepted',
        'Staff accepted process proof for ' || coalesce(art_title, 'your artwork') || '.',
        'artwork',
        new.artwork_id
      );
    end if;
  else
    update public.artworks
    set authenticity_status = case
          when coalesce(vote_total, 0) >= 3 then 'restricted'
          when coalesce(vote_total, 0) > 0 then 'under_review'
          else 'clear'
        end,
        authenticity_note = case
          when coalesce(vote_total, 0) >= 3 then 'Artist process proof was rejected by staff. Bidding remains paused.'
          when coalesce(vote_total, 0) > 0 then 'Artist process proof was rejected by staff. Community review remains open.'
          else 'Artist process proof was rejected by staff.'
        end,
        authenticity_updated_at = now()
    where id = new.artwork_id;

    if artist_owner is not null then
      insert into public.notifications (user_id, type, title, body, link_type, link_id)
      values (
        artist_owner,
        'artwork_proof_rejected',
        'Process proof rejected',
        'Staff rejected process proof for ' || coalesce(art_title, 'your artwork') || '.',
        'artwork',
        new.artwork_id
      );
    end if;
  end if;

  insert into public.audit_log (actor_id, action, target_type, target_id, detail)
  values (
    (select auth.uid()),
    'artwork.proof.' || new.status,
    'artwork',
    new.artwork_id,
    coalesce(art_title, new.artwork_id)
  );

  return new;
end;
$$;

drop trigger if exists on_artwork_ai_proof_reviewed on public.artwork_ai_proofs;
create trigger on_artwork_ai_proof_reviewed
  after update of status on public.artwork_ai_proofs
  for each row execute procedure public.apply_artwork_ai_proof_review();

revoke execute on function public.guard_artwork_moderation_review() from public, anon, authenticated;
revoke execute on function public.guard_artwork_ai_proof_review() from public, anon, authenticated;
revoke execute on function public.apply_artwork_ai_proof_review() from public, anon, authenticated;

notify pgrst, 'reload schema';
