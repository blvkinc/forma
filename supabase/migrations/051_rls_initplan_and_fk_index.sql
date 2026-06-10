-- ============================================================
-- FORMA - RLS initplan + foreign key index hardening
-- Wraps bare auth.<fn>() calls in RLS policies with scalar
-- subselects so Postgres evaluates them once per statement
-- instead of once per row, and covers the one unindexed FK.
-- Fixes all `auth_rls_initplan` and `unindexed_foreign_keys`
-- advisor lints. Run after 050_seller_approval_workflow_enforcement.sql.
-- ============================================================

-- Masks already-wrapped calls, wraps the remaining bare calls, then
-- restores the masked ones, so `(select auth.uid())` is never re-wrapped.
create function pg_temp.wrap_auth_calls(expr text) returns text
language plpgsql
as $fn$
declare
  fn_name text;
  masked text := expr;
begin
  if expr is null then
    return null;
  end if;

  foreach fn_name in array array['uid', 'role', 'jwt', 'email'] loop
    masked := replace(masked, 'SELECT auth.' || fn_name || '() AS ' || fn_name, '@@WRAPPED_' || fn_name || '@@');
    masked := replace(masked, 'auth.' || fn_name || '()', '(select auth.' || fn_name || '())');
    masked := replace(masked, '@@WRAPPED_' || fn_name || '@@', 'SELECT auth.' || fn_name || '() AS ' || fn_name);
  end loop;

  return masked;
end;
$fn$;

do $$
declare
  pol record;
  fixed_qual text;
  fixed_check text;
  cmd text;
begin
  for pol in
    select p.schemaname, p.tablename, p.policyname, p.qual, p.with_check
    from pg_policies p
    where p.schemaname = 'public'
      and (
        coalesce(p.qual, '') ~ 'auth\.(uid|role|jwt|email)\(\)'
        or coalesce(p.with_check, '') ~ 'auth\.(uid|role|jwt|email)\(\)'
      )
  loop
    fixed_qual := pg_temp.wrap_auth_calls(pol.qual);
    fixed_check := pg_temp.wrap_auth_calls(pol.with_check);

    if fixed_qual is not distinct from pol.qual
       and fixed_check is not distinct from pol.with_check then
      continue;
    end if;

    cmd := format('alter policy %I on %I.%I', pol.policyname, pol.schemaname, pol.tablename);
    if fixed_qual is not null then
      cmd := cmd || format(' using (%s)', fixed_qual);
    end if;
    if fixed_check is not null then
      cmd := cmd || format(' with check (%s)', fixed_check);
    end if;

    execute cmd;
  end loop;
end $$;

drop function pg_temp.wrap_auth_calls(text);

create index if not exists artwork_moderation_reviews_reviewed_by_idx
  on public.artwork_moderation_reviews (reviewed_by);

notify pgrst, 'reload schema';
