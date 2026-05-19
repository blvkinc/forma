-- ============================================================
-- FORMA — drop-alert subscriptions
-- Persists the "notified 6 hours before public drops" sign-ups
-- from the feed sidebar. One row per (user, email).
-- Run after 026_social_notifications.sql.
-- ============================================================

create table if not exists public.drop_alert_subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  email text not null,
  created_at timestamptz not null default now(),
  unique (user_id, email)
);

alter table public.drop_alert_subscriptions enable row level security;

grant select, insert, delete on public.drop_alert_subscriptions to authenticated;

drop policy if exists "Users manage own drop alerts (select)" on public.drop_alert_subscriptions;
create policy "Users manage own drop alerts (select)"
  on public.drop_alert_subscriptions
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users manage own drop alerts (insert)" on public.drop_alert_subscriptions;
create policy "Users manage own drop alerts (insert)"
  on public.drop_alert_subscriptions
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users manage own drop alerts (delete)" on public.drop_alert_subscriptions;
create policy "Users manage own drop alerts (delete)"
  on public.drop_alert_subscriptions
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create index if not exists drop_alert_subscriptions_user_idx
  on public.drop_alert_subscriptions (user_id);
