import { supabase } from './supabase';

async function authorsFor(rows) {
  const ids = [...new Set((rows || []).map(row => row.user_id).filter(Boolean))];
  if (!ids.length) return {};

  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, handle, avatar_url')
    .in('id', ids);

  if (error) return {};
  return Object.fromEntries((data || []).map(profile => [profile.id, profile]));
}

function displayNameFor(profile, userId) {
  return profile?.display_name || profile?.handle || (userId ? `User ${userId.slice(0, 8)}` : 'User');
}

function transformPostComment(row, authorMap = {}) {
  const author = authorMap[row.user_id];
  return {
    id: row.id,
    postId: row.post_id,
    userId: row.user_id,
    displayName: displayNameFor(author, row.user_id),
    handle: author?.handle || '',
    avatarUrl: author?.avatar_url || '',
    body: row.body,
    createdAt: row.created_at,
  };
}

function transformArtworkComment(row, authorMap = {}) {
  const author = authorMap[row.user_id];
  return {
    id: row.id,
    artworkId: row.artwork_id,
    userId: row.user_id,
    displayName: displayNameFor(author, row.user_id),
    handle: author?.handle || '',
    avatarUrl: author?.avatar_url || '',
    body: row.body,
    createdAt: row.created_at,
  };
}

function mapByPostId(rows) {
  const map = {};
  (rows || []).forEach(row => { map[row.post_id] = true; });
  return map;
}

// Feed post comments
export async function fetchPostComments(postId) {
  const { data, error } = await supabase
    .from('post_comments')
    .select('*')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });
  if (error) throw error;

  const authorMap = await authorsFor(data || []);
  return (data || []).map(row => transformPostComment(row, authorMap));
}

export async function addPostComment(userId, postId, body) {
  const clean = String(body || '').trim();
  if (clean.length < 1) return { error: 'Write a comment first.' };

  const { data, error } = await supabase
    .from('post_comments')
    .insert({ post_id: postId, user_id: userId, body: clean.slice(0, 800) })
    .select()
    .single();
  if (error) return { error: error.message };

  const authorMap = await authorsFor([data]);
  return { data: transformPostComment(data, authorMap) };
}

export async function deletePostComment(commentId) {
  const { error } = await supabase
    .from('post_comments')
    .delete()
    .eq('id', commentId);
  if (error) return { error: error.message };
  return { success: true };
}

// Artwork detail comments
export async function fetchArtworkComments(artworkId) {
  const { data, error } = await supabase
    .from('artwork_comments')
    .select('*')
    .eq('artwork_id', artworkId)
    .order('created_at', { ascending: true });
  if (error) throw error;

  const authorMap = await authorsFor(data || []);
  return (data || []).map(row => transformArtworkComment(row, authorMap));
}

export async function addArtworkComment(userId, artworkId, body) {
  const clean = String(body || '').trim();
  if (clean.length < 1) return { error: 'Write a comment first.' };

  const { data, error } = await supabase
    .from('artwork_comments')
    .insert({ artwork_id: artworkId, user_id: userId, body: clean.slice(0, 800) })
    .select()
    .single();
  if (error) return { error: error.message };

  const authorMap = await authorsFor([data]);
  return { data: transformArtworkComment(data, authorMap) };
}

export async function deleteArtworkComment(commentId) {
  const { error } = await supabase
    .from('artwork_comments')
    .delete()
    .eq('id', commentId);
  if (error) return { error: error.message };
  return { success: true };
}

// Feed post likes + saves
export async function fetchUserPostLikes(userId) {
  const { data, error } = await supabase
    .from('feed_post_likes')
    .select('post_id')
    .eq('user_id', userId);
  if (error) throw error;
  return mapByPostId(data);
}

export async function fetchUserSavedPosts(userId) {
  const { data, error } = await supabase
    .from('feed_post_saves')
    .select('post_id')
    .eq('user_id', userId);
  if (error) throw error;
  return mapByPostId(data);
}

export async function togglePostLike(userId, postId) {
  const { data: existing } = await supabase
    .from('feed_post_likes')
    .select('post_id')
    .eq('user_id', userId)
    .eq('post_id', postId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('feed_post_likes')
      .delete()
      .eq('user_id', userId)
      .eq('post_id', postId);
    if (error) throw error;
    return false;
  }

  const { error } = await supabase
    .from('feed_post_likes')
    .insert({ user_id: userId, post_id: postId });
  if (error) throw error;
  return true;
}

// Drop-alert subscriptions
export async function subscribeToDropAlerts(userId, email) {
  const clean = String(email || '').trim();
  if (!userId) return { error: 'Sign in to subscribe to drop alerts.' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) return { error: 'Enter a valid email.' };

  const { error } = await supabase
    .from('drop_alert_subscriptions')
    .upsert({ user_id: userId, email: clean }, { onConflict: 'user_id,email' });
  if (error) return { error: error.message };
  return { success: true };
}

export async function toggleSavedPost(userId, postId) {
  const { data: existing } = await supabase
    .from('feed_post_saves')
    .select('post_id')
    .eq('user_id', userId)
    .eq('post_id', postId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('feed_post_saves')
      .delete()
      .eq('user_id', userId)
      .eq('post_id', postId);
    if (error) throw error;
    return false;
  }

  const { error } = await supabase
    .from('feed_post_saves')
    .insert({ user_id: userId, post_id: postId });
  if (error) throw error;
  return true;
}
