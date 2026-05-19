-- ============================================================
-- FORMA — Slice 5: artwork detail comments
-- Real comments on the artwork detail page (replaces the mock
-- list + dead input in the "Comments" tab).
-- Run after 021_admin_queues.sql.
-- ============================================================

create table if not exists public.artwork_comments (
  id uuid default gen_random_uuid() primary key,
  artwork_id text references public.artworks(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.artwork_comments enable row level security;

-- Public discourse on a public listing (mirrors bids: viewable by all).
drop policy if exists "Artwork comments are viewable by everyone" on public.artwork_comments;
create policy "Artwork comments are viewable by everyone"
  on public.artwork_comments for select using (true);

-- Any authenticated account can comment as itself.
drop policy if exists "Users can insert own artwork comment" on public.artwork_comments;
create policy "Users can insert own artwork comment"
  on public.artwork_comments for insert with check (auth.uid() = user_id);

-- Authors can delete their own comments.
drop policy if exists "Users can delete own artwork comment" on public.artwork_comments;
create policy "Users can delete own artwork comment"
  on public.artwork_comments for delete using (auth.uid() = user_id);

create index if not exists artwork_comments_artwork_idx
  on public.artwork_comments (artwork_id, created_at);
