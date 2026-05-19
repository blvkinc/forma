-- ============================================================
-- FORMA - outbound delivery outbox
-- Queues email/webhook work for notifications, drop alerts, and
-- future workers. This does not send email by itself; a worker with
-- SMTP/API credentials consumes pending rows.
-- Run after 030_auction_settlements.sql.
-- ============================================================

create table if not exists public.delivery_outbox (
  id uuid default gen_random_uuid() primary key,
  event_type text not null,
  channel text not null check (channel in ('email', 'webhook')),
  recipient_user_id uuid references auth.users(id) on delete set null,
  recipient_email text,
  webhook_url text,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending'
    check (status in ('pending', 'sending', 'sent', 'failed', 'cancelled')),
  attempts integer not null default 0,
  dedupe_key text unique,
  last_error text,
  available_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz
);

alter table public.delivery_outbox enable row level security;

grant select, update on public.delivery_outbox to authenticated;

drop policy if exists "Admins can read delivery outbox" on public.delivery_outbox;
create policy "Admins can read delivery outbox"
  on public.delivery_outbox
  for select
  to authenticated
  using ((select private.is_admin()));

drop policy if exists "Admins can update delivery outbox" on public.delivery_outbox;
create policy "Admins can update delivery outbox"
  on public.delivery_outbox
  for update
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create index if not exists delivery_outbox_pending_idx
  on public.delivery_outbox (status, available_at)
  where status in ('pending', 'failed');
create index if not exists delivery_outbox_user_idx
  on public.delivery_outbox (recipient_user_id, created_at desc);

create table if not exists public.webhook_endpoints (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  url text not null,
  events text[] not null default array['notification.created']::text[],
  status text not null default 'active' check (status in ('active', 'paused')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.webhook_endpoints enable row level security;

grant select, insert, update, delete on public.webhook_endpoints to authenticated;

drop policy if exists "Users can manage own webhooks (select)" on public.webhook_endpoints;
create policy "Users can manage own webhooks (select)"
  on public.webhook_endpoints
  for select
  to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()));

drop policy if exists "Users can manage own webhooks (insert)" on public.webhook_endpoints;
create policy "Users can manage own webhooks (insert)"
  on public.webhook_endpoints
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "Users can manage own webhooks (update)" on public.webhook_endpoints;
create policy "Users can manage own webhooks (update)"
  on public.webhook_endpoints
  for update
  to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()))
  with check (user_id = (select auth.uid()) or (select private.is_admin()));

drop policy if exists "Users can manage own webhooks (delete)" on public.webhook_endpoints;
create policy "Users can manage own webhooks (delete)"
  on public.webhook_endpoints
  for delete
  to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()));

create index if not exists webhook_endpoints_user_idx
  on public.webhook_endpoints (user_id, status);

create or replace function public.enqueue_email_delivery(
  p_event_type text,
  p_user_id uuid,
  p_email text,
  p_payload jsonb,
  p_dedupe_key text default null,
  p_available_at timestamptz default now()
)
returns uuid
language plpgsql
security definer set search_path = ''
as $$
declare
  delivery_id uuid;
  dest_email text := nullif(trim(coalesce(p_email, '')), '');
begin
  if dest_email is null and p_user_id is not null then
    select email into dest_email
    from public.profiles
    where id = p_user_id;
  end if;

  if dest_email is null then
    return null;
  end if;

  insert into public.delivery_outbox (
    event_type,
    channel,
    recipient_user_id,
    recipient_email,
    payload,
    dedupe_key,
    available_at
  )
  values (
    p_event_type,
    'email',
    p_user_id,
    dest_email,
    coalesce(p_payload, '{}'::jsonb),
    p_dedupe_key,
    coalesce(p_available_at, now())
  )
  on conflict (dedupe_key) do update
    set updated_at = public.delivery_outbox.updated_at
  returning id into delivery_id;

  return delivery_id;
end;
$$;

create or replace function public.enqueue_webhook_deliveries(
  p_event_type text,
  p_user_id uuid,
  p_payload jsonb,
  p_dedupe_prefix text default null
)
returns integer
language plpgsql
security definer set search_path = ''
as $$
declare
  inserted_count integer := 0;
  endpoint record;
  dedupe text;
begin
  for endpoint in
    select id, url
    from public.webhook_endpoints
    where user_id = p_user_id
      and status = 'active'
      and (
        events @> array[p_event_type]::text[]
        or events @> array['*']::text[]
      )
  loop
    dedupe := case
      when p_dedupe_prefix is null then null
      else p_dedupe_prefix || ':webhook:' || endpoint.id::text
    end;

    insert into public.delivery_outbox (
      event_type,
      channel,
      recipient_user_id,
      webhook_url,
      payload,
      dedupe_key
    )
    values (
      p_event_type,
      'webhook',
      p_user_id,
      endpoint.url,
      coalesce(p_payload, '{}'::jsonb),
      dedupe
    )
    on conflict (dedupe_key) do nothing;

    inserted_count := inserted_count + 1;
  end loop;

  return inserted_count;
end;
$$;

create or replace function public.enqueue_notification_delivery()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  payload jsonb;
begin
  payload := jsonb_build_object(
    'notification_id', new.id,
    'type', new.type,
    'title', new.title,
    'body', new.body,
    'link_type', new.link_type,
    'link_id', new.link_id,
    'created_at', new.created_at
  );

  perform public.enqueue_email_delivery(
    'notification.' || new.type,
    new.user_id,
    null,
    payload,
    'notification:' || new.id::text || ':email',
    now()
  );

  perform public.enqueue_webhook_deliveries(
    'notification.created',
    new.user_id,
    payload,
    'notification:' || new.id::text
  );

  return new;
end;
$$;

drop trigger if exists on_notification_enqueue_delivery on public.notifications;
create trigger on_notification_enqueue_delivery
  after insert on public.notifications
  for each row execute procedure public.enqueue_notification_delivery();

create or replace function public.enqueue_drop_post_alerts()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  sub record;
  payload jsonb;
begin
  if new.type <> 'drop' then
    return new;
  end if;

  payload := jsonb_build_object(
    'feed_post_id', new.id,
    'artist_id', new.artist_id,
    'artwork_id', new.artwork_id,
    'body', new.body,
    'created_at', new.created_at
  );

  for sub in
    select user_id, email
    from public.drop_alert_subscriptions
  loop
    perform public.enqueue_email_delivery(
      'drop.alert',
      sub.user_id,
      sub.email,
      payload,
      'drop_alert:' || new.id || ':' || sub.user_id::text,
      now()
    );
  end loop;

  return new;
end;
$$;

drop trigger if exists on_drop_post_enqueue_alerts on public.feed_posts;
create trigger on_drop_post_enqueue_alerts
  after insert on public.feed_posts
  for each row execute procedure public.enqueue_drop_post_alerts();

create or replace function public.admin_mark_delivery_status(
  p_delivery_id uuid,
  p_status text,
  p_error text default null
)
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  if not (select private.is_admin()) then
    raise exception 'Admin privilege required';
  end if;

  if p_status not in ('pending', 'sending', 'sent', 'failed', 'cancelled') then
    raise exception 'Invalid delivery status.';
  end if;

  update public.delivery_outbox
  set status = p_status,
      attempts = case when p_status in ('sent', 'failed') then attempts + 1 else attempts end,
      last_error = p_error,
      sent_at = case when p_status = 'sent' then now() else sent_at end,
      updated_at = now()
  where id = p_delivery_id;
end;
$$;

revoke execute on function public.enqueue_email_delivery(text, uuid, text, jsonb, text, timestamptz) from public, anon, authenticated;
revoke execute on function public.enqueue_webhook_deliveries(text, uuid, jsonb, text) from public, anon, authenticated;
revoke execute on function public.enqueue_notification_delivery() from public, anon, authenticated;
revoke execute on function public.enqueue_drop_post_alerts() from public, anon, authenticated;
revoke execute on function public.admin_mark_delivery_status(uuid, text, text) from public, anon;
grant execute on function public.admin_mark_delivery_status(uuid, text, text) to authenticated;
