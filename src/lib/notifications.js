import { supabase } from './supabase';

// ============================================================
// NOTIFICATIONS SERVICE
// ============================================================

/**
 * Fetch notifications for the current user.
 */
export async function fetchNotifications(userId, { limit = 20, unreadOnly = false } = {}) {
  let query = supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (unreadOnly) {
    query = query.eq('read', false);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(transformNotification);
}

/**
 * Get unread count for badge display.
 */
export async function fetchUnreadCount(userId) {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false);

  if (error) throw error;
  return count || 0;
}

/**
 * Mark a single notification as read.
 */
export async function markAsRead(notificationId) {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId);
  if (error) throw error;
}

/**
 * Mark all notifications as read.
 */
export async function markAllAsRead(userId) {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false);
  if (error) throw error;
}

/**
 * Create a notification (used internally by services).
 */
export async function createNotification(userId, { type, title, body, linkType, linkId }) {
  const { error } = await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      type,
      title,
      body,
      link_type: linkType,
      link_id: linkId,
    });
  if (error) console.error('Failed to create notification:', error);
}

/**
 * Subscribe to real-time notifications (returns cleanup function).
 */
export function subscribeToNotifications(userId, onNotification) {
  const channel = supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        onNotification(transformNotification(payload.new));
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// ---- Transform ----

function transformNotification(row) {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    linkType: row.link_type,
    linkId: row.link_id,
    read: row.read,
    createdAt: row.created_at,
  };
}

// ---- Notification Templates ----

export const NOTIFICATION_TEMPLATES = {
  outbid: (artworkTitle, newAmount) => ({
    type: 'outbid',
    title: 'Outbid',
    body: `You've been outbid on ${artworkTitle}. New top bid: $${newAmount.toLocaleString()}.`,
    linkType: 'artwork',
  }),
  won: (artworkTitle) => ({
    type: 'won',
    title: 'Auction Won',
    body: `You won the auction for ${artworkTitle}!`,
    linkType: 'artwork',
  }),
  lost: (artworkTitle) => ({
    type: 'lost',
    title: 'Auction Ended',
    body: `The auction for ${artworkTitle} has ended. You did not win.`,
    linkType: 'artwork',
  }),
  commission_booked: (commissionTitle, buyerName) => ({
    type: 'commission_booked',
    title: 'New Booking',
    body: `${buyerName} booked your commission: ${commissionTitle}.`,
    linkType: 'commission',
  }),
  milestone_uploaded: (commissionTitle) => ({
    type: 'milestone_uploaded',
    title: 'Milestone Ready',
    body: `A new milestone is ready for review: ${commissionTitle}.`,
    linkType: 'commission',
  }),
  delivery_posted: (commissionTitle) => ({
    type: 'delivery_posted',
    title: 'Delivery Posted',
    body: `Final delivery for ${commissionTitle} is ready for your review.`,
    linkType: 'commission',
  }),
};
