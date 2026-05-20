import { createClient } from '@supabase/supabase-js';
import { existsSync, readFileSync } from 'node:fs';

const REQUIRED_PUBLIC_TABLES = [
  'artists',
  'artworks',
  'commissions',
  'feed_posts',
];

const ADMIN_TABLES = [
  'profiles',
  'seller_applications',
  'reports',
  'commission_bookings',
  'artwork_moderation_reviews',
  'auction_settlements',
  'delivery_outbox',
  'audit_log',
];

const QA_ACTIVITY_TABLES = [
  'feed_posts',
  'seller_applications',
  'reports',
  'artwork_ai_votes',
];

const ACTIVITY_FIXTURE_HINTS = {
  feed_posts: 'run supabase/fixtures/production_readiness_seed.sql for social/feed E2E',
  seller_applications: 'run supabase/fixtures/production_readiness_missing_queues.sql for seller onboarding E2E',
  reports: 'run supabase/fixtures/production_readiness_missing_queues.sql for admin moderation E2E',
  artwork_ai_votes: 'run supabase/fixtures/production_readiness_missing_queues.sql for AI review E2E',
};

function loadLocalEnv() {
  for (const file of ['.env.qa.local', '.env.local', '.env']) {
    if (!existsSync(file)) continue;
    const rows = readFileSync(file, 'utf8').split(/\r?\n/);
    for (const row of rows) {
      const line = row.trim();
      if (!line || line.startsWith('#')) continue;
      const index = line.indexOf('=');
      if (index < 0) continue;
      const key = line.slice(0, index);
      const value = line.slice(index + 1);
      if (process.env[key] == null) process.env[key] = value;
    }
  }
}

function makeClient(accessToken = null) {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('Missing VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY or VITE_SUPABASE_ANON_KEY.');
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined,
  });
}

function log(status, label, detail = '') {
  const suffix = detail ? ` - ${detail}` : '';
  console.log(`${status.padEnd(6)} ${label}${suffix}`);
}

function assertOk(condition, message) {
  if (!condition) throw new Error(message);
}

function isEnabled(key) {
  return ['1', 'true', 'yes'].includes(String(process.env[key] || '').toLowerCase());
}

function uniqueId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

async function signInRole(roleName) {
  const upper = roleName.toUpperCase();
  const email = process.env[`QA_${upper}_EMAIL`];
  const password = process.env[`QA_${upper}_PASSWORD`];
  if (!email || !password) {
    log('SKIP', `${roleName} account`, `set QA_${upper}_EMAIL and QA_${upper}_PASSWORD to test this role`);
    return null;
  }

  const authClient = makeClient();
  const { data, error } = await authClient.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`${roleName} sign-in failed: ${error.message}`);
  const token = data.session?.access_token;
  assertOk(token, `${roleName} sign-in did not return a session.`);

  const client = makeClient(token);
  const { data: profile, error: profileError } = await client
    .from('profiles')
    .select('id, role, verified, display_name')
    .eq('id', data.user.id)
    .single();
  if (profileError) throw new Error(`${roleName} profile failed: ${profileError.message}`);

  log('PASS', `${roleName} sign-in`, `${profile.role}${profile.verified ? ', verified' : ''}`);
  return { client, user: data.user, profile };
}

async function expectRejected(label, action) {
  try {
    const result = await action();
    if (result?.error) {
      log('PASS', label, result.error.message || result.error);
      return;
    }
    throw new Error('request unexpectedly succeeded');
  } catch (error) {
    log('PASS', label, error.message);
  }
}

async function publicChecks(client) {
  const counts = {};
  for (const table of REQUIRED_PUBLIC_TABLES) {
    const { count, error } = await client.from(table).select('*', { count: 'exact', head: true });
    if (error) throw new Error(`${table} public read failed: ${error.message}`);
    counts[table] = count ?? 0;
    log('PASS', `public ${table}`, `${count ?? 0} rows`);
  }

  await expectRejected('anonymous bid insert blocked', () =>
    client.from('bids').insert({
      user_id: '00000000-0000-0000-0000-000000000000',
      artwork_id: 'w01',
      amount: 999,
      display_name: 'anonymous smoke',
    })
  );

  await expectRejected('anonymous report insert blocked', () =>
    client.from('reports').insert({
      reporter_id: '00000000-0000-0000-0000-000000000000',
      target_type: 'artwork',
      target_id: 'w01',
      reason: 'other',
      details: 'anonymous smoke',
    })
  );

  if ((counts.feed_posts || 0) === 0) {
    log('WARN', 'feed QA data missing', 'run supabase/fixtures/production_readiness_seed.sql for social/feed E2E');
  }
}

async function activityReadinessChecks(client) {
  for (const table of QA_ACTIVITY_TABLES) {
    const { count, error } = await client.from(table).select('*', { count: 'exact', head: true });
    if (error) {
      log('WARN', `${table} readiness`, error.message);
      continue;
    }
    if ((count ?? 0) === 0) {
      log('WARN', `${table} readiness`, `0 rows; ${ACTIVITY_FIXTURE_HINTS[table] || 'QA fixture/user activity needed for full E2E'}`);
    } else {
      log('PASS', `${table} readiness`, `${count} rows`);
    }
  }
}

async function buyerChecks(session) {
  if (!session) return;
  assertOk(session.profile.role === 'buyer', 'QA buyer account must have role buyer.');
  const { client, user } = session;

  const { data: artist } = await client.from('artists').select('id').limit(1).single();
  const { data: artwork } = await client.from('artworks').select('id, artist_id').limit(1).single();
  const { data: post } = await client.from('feed_posts').select('id').limit(1).single();
  assertOk(artist?.id && artwork?.id, 'Buyer checks need at least one artist and artwork.');

  const follow = { user_id: user.id, artist_id: artist.id };
  const like = { user_id: user.id, artwork_id: artwork.id };

  const { error: followError } = await client.from('user_follows').upsert(follow, { onConflict: 'user_id,artist_id' });
  if (followError) throw new Error(`buyer follow failed: ${followError.message}`);
  await client.from('user_follows').delete().eq('user_id', user.id).eq('artist_id', artist.id);
  log('PASS', 'buyer follow/unfollow');

  const { error: likeError } = await client.from('user_likes').upsert(like, { onConflict: 'user_id,artwork_id' });
  if (likeError) throw new Error(`buyer like failed: ${likeError.message}`);
  await client.from('user_likes').delete().eq('user_id', user.id).eq('artwork_id', artwork.id);
  log('PASS', 'buyer like/unlike');

  if (post?.id) {
    const feedLike = { user_id: user.id, post_id: post.id };
    const { error: feedLikeError } = await client
      .from('feed_post_likes')
      .upsert(feedLike, { onConflict: 'user_id,post_id' });
    if (feedLikeError) throw new Error(`buyer feed like failed: ${feedLikeError.message}`);
    await client.from('feed_post_likes').delete().eq('user_id', user.id).eq('post_id', post.id);
    log('PASS', 'buyer feed like/unlike');

    const { error: feedSaveError } = await client
      .from('feed_post_saves')
      .upsert(feedLike, { onConflict: 'user_id,post_id' });
    if (feedSaveError) throw new Error(`buyer feed save failed: ${feedSaveError.message}`);
    await client.from('feed_post_saves').delete().eq('user_id', user.id).eq('post_id', post.id);
    log('PASS', 'buyer feed save/unsave');

    const { data: feedComment, error: feedCommentError } = await client
      .from('post_comments')
      .insert({ post_id: post.id, user_id: user.id, body: 'QA smoke feed comment, cleaned up immediately.' })
      .select('id')
      .single();
    if (feedCommentError) throw new Error(`buyer feed comment failed: ${feedCommentError.message}`);
    await client.from('post_comments').delete().eq('id', feedComment.id);
    log('PASS', 'buyer feed comment/delete');
  } else {
    log('SKIP', 'buyer feed actions', 'no feed post exists yet');
  }

  const { data: artworkComment, error: artworkCommentError } = await client
    .from('artwork_comments')
    .insert({ artwork_id: artwork.id, user_id: user.id, body: 'QA smoke artwork comment, cleaned up immediately.' })
    .select('id')
    .single();
  if (artworkCommentError) throw new Error(`buyer artwork comment failed: ${artworkCommentError.message}`);
  await client.from('artwork_comments').delete().eq('id', artworkComment.id);
  log('PASS', 'buyer artwork comment/delete');

  const { error: voteError } = await client.from('artwork_ai_votes').upsert({
    artwork_id: artwork.id,
    voter_id: user.id,
    reason: 'suspected_ai',
    note: 'QA smoke vote, cleaned up immediately.',
  }, { onConflict: 'artwork_id,voter_id' });
  if (voteError) throw new Error(`buyer AI vote failed: ${voteError.message}`);
  await client.from('artwork_ai_votes').delete().eq('artwork_id', artwork.id).eq('voter_id', user.id);
  log('PASS', 'buyer AI vote/remove');

  if (!isEnabled('QA_ALLOW_PERSISTENT_WRITES')) {
    log('SKIP', 'buyer report/commission persistence', 'set QA_ALLOW_PERSISTENT_WRITES=true to create persistent report + cancelled booking rows');
    return;
  }

  const { error: reportError } = await client.from('reports').insert({
    reporter_id: user.id,
    target_type: 'artwork',
    target_id: artwork.id,
    reason: 'other',
    details: `QA smoke report ${uniqueId('report')}`,
    priority: 'low',
  });
  if (reportError) throw new Error(`buyer report create failed: ${reportError.message}`);
  log('PASS', 'buyer report create', 'persistent moderation row');

  const { data: commissions, error: commissionError } = await client
    .from('commissions')
    .select('id, artist_id, price, slots, taken')
    .limit(20);
  if (commissionError) throw new Error(`commission lookup failed: ${commissionError.message}`);
  const commission = (commissions || []).find((item) => Number(item.taken || 0) < Number(item.slots || 0));
  if (!commission?.id) {
    log('SKIP', 'buyer commission booking', 'no open commission slot exists');
    return;
  }

  const { data: booking, error: bookingError } = await client
    .from('commission_bookings')
    .insert({
      commission_id: commission.id,
      buyer_id: user.id,
      artist_id: commission.artist_id,
      price: commission.price,
      brief_text: `QA smoke commission booking ${uniqueId('brief')}`,
    })
    .select('id, status')
    .single();
  if (bookingError) throw new Error(`buyer commission booking failed: ${bookingError.message}`);

  const { error: cancelError } = await client
    .from('commission_bookings')
    .update({ status: 'CANCELLED' })
    .eq('id', booking.id);
  if (cancelError) throw new Error(`buyer commission cancel failed: ${cancelError.message}`);
  log('PASS', 'buyer commission book/cancel', 'persistent cancelled booking row');
}

async function sellerChecks(session) {
  if (!session) return;
  assertOk(session.profile.role === 'artist', 'QA seller account must have role artist.');
  const { client, user, profile } = session;

  if (!profile.verified) {
    log('SKIP', 'verified seller actions', 'seller account is not admin-verified yet');
    return;
  }

  const { data: artist, error: artistError } = await client
    .from('artists')
    .select('id')
    .eq('profile_id', user.id)
    .maybeSingle();
  if (artistError) throw new Error(`seller artist lookup failed: ${artistError.message}`);
  assertOk(artist?.id, 'verified seller needs an artists row.');

  const postId = uniqueId('qa_post');
  const { error: postError } = await client.from('feed_posts').insert({
    id: postId,
    artist_id: artist.id,
    type: 'note',
    posted_at: 'qa',
    body: 'QA smoke feed post, cleaned up immediately.',
  });
  if (postError) throw new Error(`seller feed post create failed: ${postError.message}`);
  await client.from('feed_posts').delete().eq('id', postId);
  log('PASS', 'seller feed create/delete');

  const tinyPng = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
    'base64'
  );
  const path = `${user.id}/qa-${Date.now()}.png`;
  const { error: uploadError } = await client.storage
    .from('artwork-images')
    .upload(path, tinyPng, { contentType: 'image/png', upsert: false });
  if (uploadError) throw new Error(`seller artwork image upload failed: ${uploadError.message}`);
  await client.storage.from('artwork-images').remove([path]);
  log('PASS', 'seller artwork image upload/delete');
}

async function adminChecks(session) {
  if (!session) return;
  assertOk(session.profile.role === 'admin', 'QA admin account must have role admin.');
  const { client, user } = session;

  for (const table of ADMIN_TABLES) {
    const { count, error } = await client.from(table).select('*', { count: 'exact', head: true });
    if (error) throw new Error(`admin ${table} read failed: ${error.message}`);
    log('PASS', `admin ${table}`, `${count ?? 0} rows`);
  }

  const { data: artist } = await client.from('artists').select('id').limit(1).single();
  if (artist?.id) {
    const { error } = await client
      .from('user_follows')
      .insert({ user_id: user.id, artist_id: artist.id });
    if (!error) {
      await client.from('user_follows').delete().eq('user_id', user.id).eq('artist_id', artist.id);
      throw new Error('admin social follow unexpectedly succeeded. Apply migration 038.');
    }
    log('PASS', 'admin social follow blocked', error.message);
  }
}

async function main() {
  loadLocalEnv();
  const client = makeClient();

  log('INFO', 'FORMA production smoke', process.env.VITE_SUPABASE_URL);
  await publicChecks(client);
  await activityReadinessChecks(client);

  const buyer = await signInRole('buyer');
  await buyerChecks(buyer);

  const seller = await signInRole('seller');
  await sellerChecks(seller);

  const admin = await signInRole('admin');
  await adminChecks(admin);

  log('DONE', 'smoke checks complete');
}

main().catch((error) => {
  log('FAIL', 'smoke checks', error.message);
  process.exitCode = 1;
});
