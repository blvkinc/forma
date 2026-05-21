-- ============================================================
-- FORMA - webhook event filters
-- Expands endpoint event subscriptions beyond generic
-- notification.created, and emits specific webhook event types while
-- preserving notification.created compatibility.
-- Run after 042_webhook_endpoint_guard.sql.
-- ============================================================

create or replace function public.guard_webhook_endpoint_write()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  allowed_events text[] := array[
    '*',
    'drop.alert',
    'notification.created',
    'notification.outbid',
    'notification.new_follower',
    'notification.feed_like',
    'notification.feed_comment',
    'notification.artwork_comment',
    'notification.auction_won',
    'notification.auction_closed',
    'notification.auction_paid',
    'notification.seller_approved',
    'notification.seller_rejected',
    'notification.artwork_proof_accepted',
    'notification.artwork_proof_rejected',
    'notification.commission_booked',
    'notification.commission_status',
    'notification.commission_message',
    'notification.commission_milestone'
  ]::text[];
  event_name text;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication is required.';
  end if;

  if new.user_id is distinct from (select auth.uid()) and not (select private.is_admin()) then
    raise exception 'Webhook endpoints must belong to the current user.';
  end if;

  new.url := trim(coalesce(new.url, ''));
  if new.url !~* '^https://[a-z0-9][a-z0-9.-]*(:[0-9]+)?(/.*)?$' then
    raise exception 'Webhook URL must be a valid HTTPS endpoint.';
  end if;

  if position('@' in split_part(new.url, '/', 3)) > 0 then
    raise exception 'Webhook URL credentials are not allowed.';
  end if;

  if new.events is null or array_length(new.events, 1) is null then
    new.events := array['notification.created']::text[];
  end if;

  new.events := array(select distinct unnest(new.events));
  if '*' = any(new.events) then
    new.events := array['*']::text[];
  end if;

  foreach event_name in array new.events loop
    if not event_name = any(allowed_events) then
      raise exception 'Unsupported webhook event: %', event_name;
    end if;
  end loop;

  new.updated_at := now();
  return new;
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
        or (
          p_event_type like 'notification.%'
          and events @> array['notification.created']::text[]
        )
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
  event_type text;
begin
  event_type := 'notification.' || new.type;
  payload := jsonb_build_object(
    'notification_id', new.id,
    'event_type', event_type,
    'type', new.type,
    'title', new.title,
    'body', new.body,
    'link_type', new.link_type,
    'link_id', new.link_id,
    'created_at', new.created_at
  );

  perform public.enqueue_email_delivery(
    event_type,
    new.user_id,
    null,
    payload,
    'notification:' || new.id::text || ':email',
    now()
  );

  perform public.enqueue_webhook_deliveries(
    event_type,
    new.user_id,
    payload,
    'notification:' || new.id::text
  );

  return new;
end;
$$;

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
    'event_type', 'drop.alert',
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
      'drop_alert:' || new.id || ':' || sub.user_id::text || ':email',
      now()
    );

    perform public.enqueue_webhook_deliveries(
      'drop.alert',
      sub.user_id,
      payload,
      'drop_alert:' || new.id || ':' || sub.user_id::text
    );
  end loop;

  return new;
end;
$$;

revoke execute on function public.guard_webhook_endpoint_write() from public, anon, authenticated;
revoke execute on function public.enqueue_webhook_deliveries(text, uuid, jsonb, text) from public, anon, authenticated;
revoke execute on function public.enqueue_notification_delivery() from public, anon, authenticated;
revoke execute on function public.enqueue_drop_post_alerts() from public, anon, authenticated;

notify pgrst, 'reload schema';
