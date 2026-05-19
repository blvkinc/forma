-- ============================================================
-- FORMA — Slice 5: real admin queues (KYC, disputes, audit)
-- Adds admin RLS for verification + dispute triage and an
-- append-only audit log fed by triggers on key state changes.
-- Run after 020_feed_post_comments.sql.
-- ============================================================

-- Reusable admin check.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

-- 1. KYC: admins can verify/suspend any profile.
drop policy if exists "Admins can update any profile" on public.profiles;
create policy "Admins can update any profile"
  on public.profiles for update using (public.is_admin());

-- 2. Disputes: admins can see and resolve any commission booking.
drop policy if exists "Admins can view all bookings" on public.commission_bookings;
create policy "Admins can view all bookings"
  on public.commission_bookings for select using (public.is_admin());

drop policy if exists "Admins can update any booking" on public.commission_bookings;
create policy "Admins can update any booking"
  on public.commission_bookings for update using (public.is_admin());

-- Admins can also read commission threads to triage disputes.
drop policy if exists "Admins can view all messages" on public.commission_messages;
create policy "Admins can view all messages"
  on public.commission_messages for select using (public.is_admin());

-- 3. Append-only audit log.
create table if not exists public.audit_log (
  id uuid default gen_random_uuid() primary key,
  actor_id uuid,
  action text not null,
  target_type text,
  target_id text,
  detail text,
  created_at timestamptz not null default now()
);

alter table public.audit_log enable row level security;

drop policy if exists "Admins can read audit log" on public.audit_log;
create policy "Admins can read audit log"
  on public.audit_log for select using (public.is_admin());

-- Inserts come only from security-definer triggers below.
drop policy if exists "System can append audit log" on public.audit_log;
create policy "System can append audit log"
  on public.audit_log for insert with check (true);

create index if not exists audit_log_created_idx on public.audit_log (created_at desc);

-- 3a. Report status changes.
create or replace function public.audit_report_change()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    insert into public.audit_log (actor_id, action, target_type, target_id, detail)
    values (auth.uid(), 'report.' || new.status, 'report', new.id::text,
            old.status || ' → ' || new.status);
  end if;
  return new;
end;
$$;

drop trigger if exists on_report_audited on public.reports;
create trigger on_report_audited
  after update on public.reports
  for each row execute procedure public.audit_report_change();

-- 3b. Commission booking status changes (disputes, resolutions).
create or replace function public.audit_booking_change()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    insert into public.audit_log (actor_id, action, target_type, target_id, detail)
    values (auth.uid(), 'commission.' || new.status, 'commission_booking', new.id::text,
            old.status || ' → ' || new.status);
  end if;
  return new;
end;
$$;

drop trigger if exists on_booking_audited on public.commission_bookings;
create trigger on_booking_audited
  after update on public.commission_bookings
  for each row execute procedure public.audit_booking_change();

-- 3c. KYC verification changes.
create or replace function public.audit_profile_verification()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if new.verified is distinct from old.verified then
    insert into public.audit_log (actor_id, action, target_type, target_id, detail)
    values (auth.uid(),
            case when new.verified then 'kyc.verified' else 'kyc.revoked' end,
            'profile', new.id::text,
            coalesce(new.handle, new.email));
  end if;
  return new;
end;
$$;

drop trigger if exists on_profile_verification_audited on public.profiles;
create trigger on_profile_verification_audited
  after update on public.profiles
  for each row execute procedure public.audit_profile_verification();
