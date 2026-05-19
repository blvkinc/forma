-- ============================================================
-- FORMA — Slice 5: feed post comments
-- Real comments on feed posts (replaces the mock comment list).
-- Run after 019_realtime_bid_stream.sql.
-- ============================================================

create table if not exists public.post_comments (
  id uuid default gen_random_uuid() primary key,
  post_id text references public.feed_posts(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.post_comments enable row level security;

-- Readable while the parent post is still visible (mirrors the
-- 5-day feed TTL from migration 017); the owning artist always sees.
drop policy if exists "Comments on fresh posts are viewable" on public.post_comments;
create policy "Comments on fresh posts are viewable"
  on public.post_comments for select using (
    exists (
      select 1 from public.feed_posts f
      where f.id = post_id
        and (
          f.created_at > now() - interval '5 days'
          or exists (
            select 1 from public.artists a
            where a.id = f.artist_id
              and a.profile_id is not null
              and a.profile_id = auth.uid()
          )
        )
    )
  );

-- Any authenticated account can comment as itself.
drop policy if exists "Users can insert own comment" on public.post_comments;
create policy "Users can insert own comment"
  on public.post_comments for insert with check (auth.uid() = user_id);

-- Authors can delete their own comments.
drop policy if exists "Users can delete own comment" on public.post_comments;
create policy "Users can delete own comment"
  on public.post_comments for delete using (auth.uid() = user_id);

create index if not exists post_comments_post_idx
  on public.post_comments (post_id, created_at);

-- Keep feed_posts.comment_count in sync.
create or replace function public.handle_post_comment_change()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if (tg_op = 'INSERT') then
    update public.feed_posts set comment_count = comment_count + 1 where id = new.post_id;
    return new;
  elsif (tg_op = 'DELETE') then
    update public.feed_posts set comment_count = greatest(0, comment_count - 1) where id = old.post_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists on_post_comment_change on public.post_comments;
create trigger on_post_comment_change
  after insert or delete on public.post_comments
  for each row execute procedure public.handle_post_comment_change();
