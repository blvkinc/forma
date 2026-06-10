-- ============================================================
-- FORMA - seller approval workflow enforcement
-- Run after 049_profile_handle_avatar_and_seller_application_hardening.sql.
-- ============================================================

-- Revoke accidental seller access created through generic profile/KYC
-- verification. Demo artists without profile_id are left alone.
update public.artists a
set verified = false,
    suspended = true
where a.profile_id is not null
  and not exists (
    select 1
    from public.seller_applications sa
    where sa.profile_id = a.profile_id
      and sa.status = 'approved'
  );

update public.profiles p
set verified = false,
    updated_at = now()
where p.role = 'artist'
  and p.verified = true
  and not exists (
    select 1
    from public.seller_applications sa
    where sa.profile_id = p.id
      and sa.status = 'approved'
  );

create or replace function public.guard_artist_verification_requires_approval()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role = 'artist'
     and new.verified = true
     and not exists (
       select 1
       from public.seller_applications sa
       where sa.profile_id = new.id
         and sa.status = 'approved'
     ) then
    raise exception 'Seller accounts must be approved from Seller review before verification.';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_artist_verification_requires_approval on public.profiles;
create trigger guard_artist_verification_requires_approval
  before insert or update of role, verified on public.profiles
  for each row execute procedure public.guard_artist_verification_requires_approval();

revoke execute on function public.guard_artist_verification_requires_approval() from public, anon, authenticated;

create or replace function public.admin_review_seller_application(
  p_application_id uuid,
  p_decision text,
  p_review_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  reviewed_id uuid;
begin
  if not (select private.is_admin()) then
    raise exception 'Admin privilege required';
  end if;

  if p_decision not in ('approved', 'rejected') then
    raise exception 'Seller review decision must be approved or rejected.';
  end if;

  update public.seller_applications
  set status = p_decision,
      review_note = nullif(left(trim(coalesce(p_review_note, '')), 900), '')
  where id = p_application_id
  returning id into reviewed_id;

  if reviewed_id is null then
    raise exception 'Seller application not found.';
  end if;

  return reviewed_id;
end;
$$;

revoke execute on function public.admin_review_seller_application(uuid, text, text) from public, anon;
grant execute on function public.admin_review_seller_application(uuid, text, text) to authenticated;

insert into public.audit_log (actor_id, action, target_type, target_id, detail)
select
  null,
  'seller_workflow.enforced',
  'migration',
  '050',
  'Seller verification now requires an approved seller application.'
where exists (select 1 from public.audit_log limit 1);

notify pgrst, 'reload schema';
