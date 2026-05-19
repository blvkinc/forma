-- ============================================================
-- FORMA - feed reactions and saved posts
-- Adds real feed-post likes and saves, with counters maintained
-- by triggers. Run after 023_harden_function_acl_and_indexes.sql.
-- ============================================================

alter table public.feed_posts
  add column if not exists save_count integer not null default 0;

create table if not exists public.feed_post_likes (
  user_id uuid references auth.users(id) on delete cascade not null,
  post_id text references public.feed_posts(id) on delete cascade not null,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create table if not exists public.feed_post_saves (
  user_id uuid references auth.users(id) on delete cascade not null,
  post_id text references public.feed_posts(id) on delete cascade not null,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

alter table public.feed_post_likes enable row level security;
alter table public.feed_post_saves enable row level security;

grant select, insert, delete on public.feed_post_likes to authenticated;
grant select, insert, delete on public.feed_post_saves to authenticated;

drop policy if exists "Users can read own feed likes" on public.feed_post_likes;
create policy "Users can read own feed likes"
  on public.feed_post_likes
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own feed likes" on public.feed_post_likes;
create policy "Users can insert own feed likes"
  on public.feed_post_likes
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own feed likes" on public.feed_post_likes;
create policy "Users can delete own feed likes"
  on public.feed_post_likes
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can read own saved posts" on public.feed_post_saves;
create policy "Users can read own saved posts"
  on public.feed_post_saves
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own saved posts" on public.feed_post_saves;
create policy "Users can insert own saved posts"
  on public.feed_post_saves
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own saved posts" on public.feed_post_saves;
create policy "Users can delete own saved posts"
  on public.feed_post_saves
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create index if not exists feed_post_likes_post_id_idx
  on public.feed_post_likes (post_id);

create index if not exists feed_post_saves_post_id_idx
  on public.feed_post_saves (post_id);

create or replace function public.handle_feed_post_like_change()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if (tg_op = 'INSERT') then
    update public.feed_posts set like_count = like_count + 1 where id = new.post_id;
    return new;
  elsif (tg_op = 'DELETE') then
    update public.feed_posts set like_count = greatest(0, like_count - 1) where id = old.post_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists on_feed_post_like_change on public.feed_post_likes;
create trigger on_feed_post_like_change
  after insert or delete on public.feed_post_likes
  for each row execute procedure public.handle_feed_post_like_change();

create or replace function public.handle_feed_post_save_change()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if (tg_op = 'INSERT') then
    update public.feed_posts set save_count = save_count + 1 where id = new.post_id;
    return new;
  elsif (tg_op = 'DELETE') then
    update public.feed_posts set save_count = greatest(0, save_count - 1) where id = old.post_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists on_feed_post_save_change on public.feed_post_saves;
create trigger on_feed_post_save_change
  after insert or delete on public.feed_post_saves
  for each row execute procedure public.handle_feed_post_save_change();

revoke execute on function public.handle_feed_post_like_change() from public, anon, authenticated;
revoke execute on function public.handle_feed_post_save_change() from public, anon, authenticated;
