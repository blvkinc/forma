-- ============================================================
-- FORMA - trust and safety reports
-- Buyers and sellers can report content. Admins triage the queue.
-- Run after 008_seller_artist_profile_policy.sql.
-- ============================================================

create table if not exists public.reports (
  id uuid default gen_random_uuid() primary key,
  reporter_id uuid references public.profiles(id) on delete set null,
  target_type text not null check (target_type in ('artwork', 'artist', 'commission', 'feed_post', 'user')),
  target_id text not null,
  reason text not null check (reason in ('copyright', 'abuse', 'fraud', 'misleading', 'prohibited', 'other')),
  details text,
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high')),
  resolution_note text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.reports enable row level security;

drop policy if exists "Users can insert own reports" on public.reports;
create policy "Users can insert own reports"
  on public.reports for insert with check (
    auth.uid() = reporter_id
  );

drop policy if exists "Users can view own reports" on public.reports;
create policy "Users can view own reports"
  on public.reports for select using (
    auth.uid() = reporter_id
  );

drop policy if exists "Admins can view all reports" on public.reports;
create policy "Admins can view all reports"
  on public.reports for select using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );

drop policy if exists "Admins can update reports" on public.reports;
create policy "Admins can update reports"
  on public.reports for update using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );

create index if not exists reports_status_priority_created_idx
  on public.reports (status, priority, created_at desc);

create index if not exists reports_target_idx
  on public.reports (target_type, target_id);
