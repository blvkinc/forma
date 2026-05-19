-- ============================================================
-- FORMA - community AI-authenticity moderation
-- Buyers and sellers can vote on suspected AI work. Artists can
-- submit process proof to restore a restricted listing into review.
-- ============================================================

alter table public.artworks
  add column if not exists authenticity_status text not null default 'clear',
  add column if not exists ai_vote_count integer not null default 0,
  add column if not exists authenticity_note text,
  add column if not exists authenticity_updated_at timestamptz not null default now();

alter table public.artworks
  drop constraint if exists artworks_authenticity_status_check;

alter table public.artworks
  add constraint artworks_authenticity_status_check
  check (authenticity_status in ('clear', 'under_review', 'restricted', 'proof_pending', 'verified'));

create table if not exists public.artwork_ai_votes (
  id uuid default gen_random_uuid() primary key,
  artwork_id text references public.artworks(id) on delete cascade not null,
  voter_id uuid references public.profiles(id) on delete cascade not null,
  reason text not null default 'suspected_ai' check (reason in ('suspected_ai', 'inconsistent_process', 'metadata_mismatch', 'other')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (artwork_id, voter_id)
);

alter table public.artwork_ai_votes enable row level security;

drop policy if exists "AI votes are visible to authenticated users" on public.artwork_ai_votes;
create policy "AI votes are visible to authenticated users"
  on public.artwork_ai_votes for select
  to authenticated
  using (true);

drop policy if exists "Buyers and sellers can insert own AI votes" on public.artwork_ai_votes;
create policy "Buyers and sellers can insert own AI votes"
  on public.artwork_ai_votes for insert
  to authenticated
  with check (
    voter_id = (select auth.uid())
    and exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role in ('buyer', 'artist')
    )
    and not exists (
      select 1
      from public.artworks w
      join public.artists a on a.id = w.artist_id
      where w.id = artwork_id
        and a.profile_id = (select auth.uid())
    )
  );

drop policy if exists "Users can update own AI votes" on public.artwork_ai_votes;
create policy "Users can update own AI votes"
  on public.artwork_ai_votes for update
  to authenticated
  using (voter_id = (select auth.uid()))
  with check (voter_id = (select auth.uid()));

drop policy if exists "Users can delete own AI votes" on public.artwork_ai_votes;
create policy "Users can delete own AI votes"
  on public.artwork_ai_votes for delete
  to authenticated
  using (voter_id = (select auth.uid()));

create table if not exists public.artwork_ai_proofs (
  id uuid default gen_random_uuid() primary key,
  artwork_id text references public.artworks(id) on delete cascade not null,
  artist_id text references public.artists(id) on delete cascade not null,
  submitted_by uuid references public.profiles(id) on delete set null,
  proof_url text,
  notes text not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.artwork_ai_proofs enable row level security;

drop policy if exists "AI proofs are visible to everyone" on public.artwork_ai_proofs;
create policy "AI proofs are visible to everyone"
  on public.artwork_ai_proofs for select
  using (true);

drop policy if exists "Artists can submit own artwork proof" on public.artwork_ai_proofs;
create policy "Artists can submit own artwork proof"
  on public.artwork_ai_proofs for insert
  to authenticated
  with check (
    submitted_by = (select auth.uid())
    and exists (
      select 1
      from public.artworks w
      join public.artists a on a.id = w.artist_id
      where w.id = artwork_id
        and a.id = artist_id
        and a.profile_id = (select auth.uid())
    )
  );

drop policy if exists "Admins can update AI proofs" on public.artwork_ai_proofs;
create policy "Admins can update AI proofs"
  on public.artwork_ai_proofs for update
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'admin'
    )
  );

create or replace function public.refresh_artwork_ai_vote_count(target_artwork_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  vote_total integer;
  current_status text;
begin
  select count(*) into vote_total
  from public.artwork_ai_votes
  where artwork_id = target_artwork_id;

  select authenticity_status into current_status
  from public.artworks
  where id = target_artwork_id;

  update public.artworks
  set ai_vote_count = vote_total,
      authenticity_status = case
        when current_status in ('proof_pending', 'verified') then current_status
        when vote_total >= 3 then 'restricted'
        when vote_total > 0 then 'under_review'
        else 'clear'
      end,
      authenticity_note = case
        when current_status in ('proof_pending', 'verified') then authenticity_note
        when vote_total >= 3 then 'Community AI review threshold reached. Bidding is paused until proof is submitted.'
        when vote_total > 0 then 'Community members have requested process proof.'
        else null
      end,
      authenticity_updated_at = now()
  where id = target_artwork_id;
end;
$$;

create or replace function public.handle_artwork_ai_vote_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.refresh_artwork_ai_vote_count(coalesce(new.artwork_id, old.artwork_id));
  return coalesce(new, old);
end;
$$;

drop trigger if exists on_artwork_ai_vote_change on public.artwork_ai_votes;
create trigger on_artwork_ai_vote_change
  after insert or update or delete on public.artwork_ai_votes
  for each row execute procedure public.handle_artwork_ai_vote_change();

create or replace function public.handle_artwork_ai_proof_submitted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.artworks
  set authenticity_status = 'proof_pending',
      authenticity_note = 'Artist proof submitted. Listing restored while the community and staff review the process.',
      authenticity_updated_at = now()
  where id = new.artwork_id;

  return new;
end;
$$;

drop trigger if exists on_artwork_ai_proof_submitted on public.artwork_ai_proofs;
create trigger on_artwork_ai_proof_submitted
  after insert on public.artwork_ai_proofs
  for each row execute procedure public.handle_artwork_ai_proof_submitted();

create index if not exists artwork_ai_votes_artwork_idx
  on public.artwork_ai_votes (artwork_id, created_at desc);

create index if not exists artwork_ai_votes_voter_idx
  on public.artwork_ai_votes (voter_id, created_at desc);

create index if not exists artwork_ai_proofs_artwork_idx
  on public.artwork_ai_proofs (artwork_id, created_at desc);

create index if not exists artworks_authenticity_status_idx
  on public.artworks (authenticity_status, ai_vote_count desc);
