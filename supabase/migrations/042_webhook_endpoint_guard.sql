-- ============================================================
-- FORMA - webhook endpoint guardrails
-- Validates owner, HTTPS destination, and supported event filters.
-- Run after 041_delivery_worker_claims.sql.
-- ============================================================

create or replace function public.guard_webhook_endpoint_write()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  allowed_events text[] := array['notification.created', '*']::text[];
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

drop trigger if exists guard_webhook_endpoint_write on public.webhook_endpoints;
create trigger guard_webhook_endpoint_write
  before insert or update on public.webhook_endpoints
  for each row execute procedure public.guard_webhook_endpoint_write();

revoke execute on function public.guard_webhook_endpoint_write() from public, anon, authenticated;
