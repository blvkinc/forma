-- ============================================================
-- FORMA - production readiness missing queue fixtures
-- Run this if `npm run qa:smoke` shows feed rows but still warns that
-- seller_applications, reports, or artwork_ai_votes are empty.
-- It is intentionally focused and idempotent.
-- ============================================================

-- Seller review queue for every unverified artist profile.
insert into public.seller_applications (
  profile_id,
  studio_name,
  handle,
  city,
  bio,
  portfolio_url,
  process_notes,
  sample_works,
  status
)
select
  p.id,
  coalesce(nullif(p.display_name, ''), 'QA Seller Studio'),
  coalesce(nullif(p.handle, ''), lower(regexp_replace(coalesce(p.display_name, 'qa-seller'), '[^a-zA-Z0-9]+', '-', 'g'))),
  p.city,
  coalesce(p.bio, 'QA seller application generated for admin onboarding review.'),
  'https://example.com/forma-qa-portfolio',
  'QA process packet: review sample work, process notes, and platform fit before approving the seller.',
  jsonb_build_array(
    jsonb_build_object(
      'title', 'QA sample work',
      'imageUrl', 'https://example.com/forma-qa-sample.png',
      'notes', 'Used for seller onboarding acceptance testing.'
    )
  ),
  'pending'
from public.profiles p
where p.role = 'artist'
  and p.verified = false
on conflict (profile_id) do update set
  studio_name = excluded.studio_name,
  handle = excluded.handle,
  city = excluded.city,
  bio = excluded.bio,
  portfolio_url = excluded.portfolio_url,
  process_notes = excluded.process_notes,
  sample_works = excluded.sample_works,
  status = case
    when public.seller_applications.status = 'approved' then public.seller_applications.status
    else excluded.status
  end,
  updated_at = now();

-- Trust/safety report for the feed moderation queue.
with buyer as (
  select id
  from public.profiles
  where role = 'buyer'
  order by created_at
  limit 1
)
insert into public.reports (
  reporter_id,
  target_type,
  target_id,
  reason,
  details,
  priority
)
select
  buyer.id,
  'feed_post',
  'qa-feed-drop-channel-error',
  'misleading',
  'QA report: verify admin social moderation can review and resolve this feed report.',
  'low'
from buyer
where exists (
  select 1
  from public.feed_posts f
  where f.id = 'qa-feed-drop-channel-error'
)
and not exists (
  select 1
  from public.reports r
  where r.target_type = 'feed_post'
    and r.target_id = 'qa-feed-drop-channel-error'
    and r.details like 'QA report:%'
);

-- Community AI vote for the artwork moderation queue.
with buyer as (
  select id
  from public.profiles
  where role = 'buyer'
  order by created_at
  limit 1
)
insert into public.artwork_ai_votes (
  artwork_id,
  voter_id,
  reason,
  note
)
select
  'w03',
  buyer.id,
  'suspected_ai',
  'QA vote: verify community AI review state and artist proof workflow.'
from buyer
where exists (
  select 1
  from public.artworks w
  where w.id = 'w03'
)
on conflict (artwork_id, voter_id) do update set
  reason = excluded.reason,
  note = excluded.note,
  updated_at = now();

select 'seller_applications' as table_name, count(*) as row_count from public.seller_applications
union all
select 'reports', count(*) from public.reports
union all
select 'artwork_ai_votes', count(*) from public.artwork_ai_votes;
