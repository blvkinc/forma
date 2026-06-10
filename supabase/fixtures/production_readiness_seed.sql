-- ============================================================
-- FORMA - production readiness QA fixtures
-- Optional: run in Supabase SQL Editor for staging/QA.
-- This does not create auth users. It uses existing buyer/artist
-- profiles and the demo catalogue rows to populate queues that are
-- otherwise hard to test when the project is empty.
-- ============================================================

begin;

-- Fresh feed content so /#feed is not empty after the 5-day TTL.
insert into public.feed_posts (
  id,
  artist_id,
  type,
  posted_at,
  body,
  artwork_id,
  like_count,
  comment_count,
  save_count,
  created_at
) values
  (
    'qa-feed-drop-channel-error',
    'a4',
    'drop',
    'now',
    'QA drop: Channel Error 03 is live for social, save, report, and admin review testing.',
    'w08',
    0,
    0,
    0,
    now()
  ),
  (
    'qa-feed-process-light',
    'a2',
    'process',
    '1h',
    'QA process note: testing comments, follows, and feed filtering with a real Supabase feed post.',
    null,
    0,
    0,
    0,
    now() - interval '1 hour'
  ),
  (
    'qa-feed-commission-slots',
    'a1',
    'note',
    '2h',
    'QA note: commission slots are open. Use a buyer account to book, then move the thread through the lifecycle.',
    null,
    0,
    0,
    0,
    now() - interval '2 hours'
  )
on conflict (id) do update set
  artist_id = excluded.artist_id,
  type = excluded.type,
  posted_at = excluded.posted_at,
  body = excluded.body,
  artwork_id = excluded.artwork_id,
  like_count = excluded.like_count,
  comment_count = excluded.comment_count,
  save_count = excluded.save_count,
  created_at = excluded.created_at;

-- Give admins seller-review work when unverified artist profiles exist.
insert into public.seller_applications (
  profile_id,
  studio_name,
  handle,
  city,
  bio,
  portfolio_url,
  artist_statement,
  process_notes,
  sample_works,
  status
)
select
  p.id,
  coalesce(nullif(p.display_name, ''), 'QA Seller Studio'),
  p.handle,
  p.city,
  coalesce(p.bio, 'QA seller application generated for admin onboarding review.'),
  'https://example.com/forma-qa-portfolio',
  'QA artist statement: this studio application exists to exercise the seller onboarding review workflow end to end.',
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
  and not exists (
    select 1
    from public.seller_applications s
    where s.profile_id = p.id
  );

-- Seed one comment, one report, and one AI vote from the first buyer profile.
-- The abuse rate-limit guards (040) require an authenticated actor, so these
-- direct seeds run with triggers disabled and sync the comment counter manually.
set local session_replication_role = replica;

with buyer as (
  select id
  from public.profiles
  where role = 'buyer'
  order by created_at
  limit 1
)
insert into public.post_comments (post_id, user_id, body)
select
  'qa-feed-drop-channel-error',
  buyer.id,
  'QA comment: social comments persist and can be moderated through reports.'
from buyer
where not exists (
  select 1
  from public.post_comments c
  where c.post_id = 'qa-feed-drop-channel-error'
    and c.user_id = buyer.id
    and c.body like 'QA comment:%'
);

update public.feed_posts
set comment_count = (select count(*) from public.post_comments where post_id = 'qa-feed-drop-channel-error')
where id = 'qa-feed-drop-channel-error';

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
where not exists (
  select 1
  from public.reports r
  where r.target_type = 'feed_post'
    and r.target_id = 'qa-feed-drop-channel-error'
    and r.details like 'QA report:%'
);

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
on conflict (artwork_id, voter_id) do update set
  reason = excluded.reason,
  note = excluded.note,
  updated_at = now();

commit;
