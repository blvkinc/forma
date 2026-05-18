import { supabase } from './supabase';
import { COMMISSION_STATES, canTransition, commissionPlatformFee, commissionArtistPayout } from './domain';

// ============================================================
// COMMISSIONS SERVICE — Booking & lifecycle management
// ============================================================

/**
 * Book a commission slot.
 * Creates a booking record and increments the taken count via trigger.
 */
export async function bookCommission(userId, commission, briefText = '') {
  // Validate slot availability
  if (commission.taken >= commission.slots) {
    return { error: 'No slots available' };
  }

  const { data, error } = await supabase
    .from('commission_bookings')
    .insert({
      commission_id: commission.id,
      buyer_id: userId,
      artist_id: commission.artist,
      status: COMMISSION_STATES.BOOKED,
      brief_text: briefText,
      price: commission.price,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to book commission:', error);
    return { error: error.message };
  }

  return { data: transformBooking(data) };
}

/**
 * Fetch all bookings for a user (as buyer).
 */
export async function fetchBuyerBookings(userId) {
  const { data, error } = await supabase
    .from('commission_bookings')
    .select('*, commissions(*), artists(*)')
    .eq('buyer_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(transformBooking);
}

/**
 * Fetch all bookings for an artist.
 */
export async function fetchArtistBookings(artistId) {
  const { data, error } = await supabase
    .from('commission_bookings')
    .select('*, commissions(*)')
    .eq('artist_id', artistId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(transformBooking);
}

/**
 * Transition a booking to a new state.
 */
export async function transitionBooking(bookingId, newStatus) {
  // Get current state
  const { data: current, error: fetchErr } = await supabase
    .from('commission_bookings')
    .select('status')
    .eq('id', bookingId)
    .single();

  if (fetchErr) return { error: fetchErr.message };

  if (!canTransition(current.status, newStatus)) {
    return { error: `Cannot transition from ${current.status} to ${newStatus}` };
  }

  const { data, error } = await supabase
    .from('commission_bookings')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', bookingId)
    .select()
    .single();

  if (error) return { error: error.message };
  return { data: transformBooking(data) };
}

/**
 * Fetch messages in a commission thread.
 */
export async function fetchCommissionMessages(bookingId) {
  const { data, error } = await supabase
    .from('commission_messages')
    .select('*')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data || []).map(msg => ({
    id: msg.id,
    senderId: msg.sender_id,
    body: msg.body,
    isMilestone: msg.is_milestone,
    attachmentUrl: msg.attachment_url,
    createdAt: msg.created_at,
  }));
}

/**
 * Send a message in a commission thread.
 */
export async function sendCommissionMessage(bookingId, userId, body, isMilestone = false) {
  const { data, error } = await supabase
    .from('commission_messages')
    .insert({
      booking_id: bookingId,
      sender_id: userId,
      body,
      is_milestone: isMilestone,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return {
    data: {
      id: data.id,
      senderId: data.sender_id,
      body: data.body,
      isMilestone: data.is_milestone,
      createdAt: data.created_at,
    }
  };
}

/**
 * Get commission price breakdown.
 */
export function getCommissionPriceBreakdown(price) {
  return {
    slotPrice: price,
    platformFee: commissionPlatformFee(price),
    artistPayout: commissionArtistPayout(price),
    buyerTotal: price, // Buyer pays slot price; fee comes from artist's side
  };
}

// ---- Transform ----

function transformBooking(row) {
  return {
    id: row.id,
    commissionId: row.commission_id,
    buyerId: row.buyer_id,
    artistId: row.artist_id,
    status: row.status,
    briefText: row.brief_text,
    price: Number(row.price),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    // Joined data (if available)
    commission: row.commissions ? {
      title: row.commissions.title,
      brief: row.commissions.brief,
      days: row.commissions.days,
    } : null,
    artist: row.artists ? {
      name: row.artists.name,
      handle: row.artists.handle,
    } : null,
  };
}
