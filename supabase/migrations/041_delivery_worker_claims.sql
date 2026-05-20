-- ============================================================
-- FORMA - delivery worker claim/complete RPCs
-- Lets a service-role worker atomically claim delivery_outbox rows
-- and mark results with retry/backoff. Run after
-- 040_abuse_rate_limits.sql.
-- ============================================================

create or replace function public.claim_delivery_outbox_batch(p_limit integer default 25)
returns table (
  id uuid,
  event_type text,
  channel text,
  recipient_user_id uuid,
  recipient_email text,
  webhook_url text,
  payload jsonb,
  attempts integer
)
language sql
security definer set search_path = ''
as $$
  with candidate as (
    select d.id
    from public.delivery_outbox d
    where d.status in ('pending', 'failed')
      and d.available_at <= now()
      and d.attempts < 5
    order by d.available_at asc, d.created_at asc
    limit least(greatest(coalesce(p_limit, 25), 1), 100)
    for update skip locked
  ),
  claimed as (
    update public.delivery_outbox d
    set status = 'sending',
        attempts = d.attempts + 1,
        last_error = null,
        updated_at = now()
    from candidate
    where d.id = candidate.id
    returning
      d.id,
      d.event_type,
      d.channel,
      d.recipient_user_id,
      d.recipient_email,
      d.webhook_url,
      d.payload,
      d.attempts
  )
  select *
  from claimed;
$$;

create or replace function public.complete_delivery_outbox(
  p_delivery_id uuid,
  p_success boolean,
  p_error text default null
)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  next_delay_seconds integer;
begin
  if p_delivery_id is null then
    raise exception 'Delivery id is required.';
  end if;

  select least(3600, power(2, least(greatest(attempts, 1), 6))::integer * 60)
    into next_delay_seconds
  from public.delivery_outbox
  where id = p_delivery_id;

  update public.delivery_outbox
  set status = case
        when p_success then 'sent'
        when attempts >= 5 then 'cancelled'
        else 'failed'
      end,
      last_error = case when p_success then null else left(coalesce(p_error, 'Delivery failed.'), 1000) end,
      available_at = case
        when p_success then available_at
        when attempts >= 5 then available_at
        else now() + make_interval(secs => coalesce(next_delay_seconds, 120))
      end,
      sent_at = case when p_success then now() else sent_at end,
      updated_at = now()
  where id = p_delivery_id
    and status = 'sending';
end;
$$;

revoke execute on function public.claim_delivery_outbox_batch(integer) from public, anon, authenticated;
revoke execute on function public.complete_delivery_outbox(uuid, boolean, text) from public, anon, authenticated;
grant execute on function public.claim_delivery_outbox_batch(integer) to service_role;
grant execute on function public.complete_delivery_outbox(uuid, boolean, text) to service_role;
