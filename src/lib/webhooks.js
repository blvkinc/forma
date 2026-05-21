import { supabase } from './supabase';

export const WEBHOOK_EVENT_OPTIONS = [
  { value: 'notification.created', label: 'Notification created' },
  { value: 'notification.outbid', label: 'Outbid' },
  { value: 'notification.new_follower', label: 'New follower' },
  { value: 'notification.feed_like', label: 'Feed like' },
  { value: 'notification.feed_comment', label: 'Feed comment' },
  { value: 'notification.artwork_comment', label: 'Artwork comment' },
  { value: 'notification.auction_won', label: 'Auction won' },
  { value: 'notification.auction_closed', label: 'Auction closed' },
  { value: 'notification.auction_paid', label: 'Auction paid' },
  { value: 'notification.seller_approved', label: 'Seller approved' },
  { value: 'notification.seller_rejected', label: 'Seller rejected' },
  { value: 'notification.artwork_proof_accepted', label: 'Proof accepted' },
  { value: 'notification.artwork_proof_rejected', label: 'Proof rejected' },
  { value: 'notification.commission_booked', label: 'Commission booked' },
  { value: 'notification.commission_status', label: 'Commission status' },
  { value: 'notification.commission_message', label: 'Commission message' },
  { value: 'notification.commission_milestone', label: 'Commission milestone' },
  { value: 'drop.alert', label: 'Drop alert' },
  { value: '*', label: 'All events' },
];

function normalizeUrl(value) {
  const clean = String(value || '').trim();
  if (!clean) throw new Error('Webhook URL is required.');

  let parsed;
  try {
    parsed = new URL(clean);
  } catch {
    throw new Error('Enter a valid webhook URL.');
  }

  if (parsed.protocol !== 'https:') {
    throw new Error('Webhook URLs must use HTTPS.');
  }

  parsed.hash = '';
  parsed.username = '';
  parsed.password = '';
  return parsed.toString();
}

function normalizeEvents(events) {
  const allowed = new Set(WEBHOOK_EVENT_OPTIONS.map(event => event.value));
  const selected = [...new Set((events || []).filter(event => allowed.has(event)))];
  if (selected.includes('*')) return ['*'];
  return selected.length ? selected : ['notification.created'];
}

export function transformWebhookEndpoint(row) {
  return {
    id: row.id,
    userId: row.user_id,
    url: row.url,
    events: row.events || ['notification.created'],
    status: row.status || 'active',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function fetchWebhookEndpoints(userId) {
  if (!userId) return [];
  const { data, error } = await supabase
    .from('webhook_endpoints')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(transformWebhookEndpoint);
}

export async function createWebhookEndpoint(userId, payload) {
  if (!userId) throw new Error('Sign in to create webhook endpoints.');

  const { data, error } = await supabase
    .from('webhook_endpoints')
    .insert({
      user_id: userId,
      url: normalizeUrl(payload?.url),
      events: normalizeEvents(payload?.events),
      status: 'active',
    })
    .select()
    .single();
  if (error) throw error;
  return transformWebhookEndpoint(data);
}

export async function updateWebhookEndpoint(endpointId, payload) {
  const changes = {
    updated_at: new Date().toISOString(),
  };
  if (payload?.url != null) changes.url = normalizeUrl(payload.url);
  if (payload?.events != null) changes.events = normalizeEvents(payload.events);
  if (payload?.status != null) changes.status = payload.status === 'paused' ? 'paused' : 'active';

  const { data, error } = await supabase
    .from('webhook_endpoints')
    .update(changes)
    .eq('id', endpointId)
    .select()
    .single();
  if (error) throw error;
  return transformWebhookEndpoint(data);
}

export async function deleteWebhookEndpoint(endpointId) {
  const { error } = await supabase
    .from('webhook_endpoints')
    .delete()
    .eq('id', endpointId);
  if (error) throw error;
  return true;
}
