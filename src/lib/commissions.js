import { supabase } from './supabase';
import { COMMISSION_STATES, canTransition, commissionPlatformFee, commissionArtistPayout } from './domain';

async function devApi(path, options = {}) {
  if (!import.meta.env.DEV) return null;

  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error('Authentication is required.');

  const response = await fetch(path, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || 'Commission request failed.');
  }

  return payload.data;
}

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

  try {
    const apiData = await devApi('/api/commission-bookings', {
      method: 'POST',
      body: JSON.stringify({
        commissionId: commission.id,
        artistId: commission.artist,
        briefText,
        price: commission.price,
      }),
    });
    if (apiData) return { data: transformBooking(apiData) };
  } catch (error) {
    console.error('Failed to book commission:', error);
    return { error: error.message };
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
  const apiData = await devApi('/api/commission-bookings?scope=buyer');
  if (apiData) return (apiData || []).map(transformBooking);

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
  const apiData = await devApi(`/api/commission-bookings?scope=artist&artistId=${encodeURIComponent(artistId)}`);
  if (apiData) return (apiData || []).map(transformBooking);

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
  try {
    const apiData = await devApi('/api/commission-bookings', {
      method: 'PATCH',
      body: JSON.stringify({ bookingId, status: newStatus }),
    });
    if (apiData) return { data: transformBooking(apiData) };
  } catch (error) {
    return { error: error.message };
  }

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
  const apiData = await devApi(`/api/commission-messages?bookingId=${encodeURIComponent(bookingId)}`);
  if (apiData) return (apiData || []).map(transformMessage);

  const { data, error } = await supabase
    .from('commission_messages')
    .select('*')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data || []).map(transformMessage);
}

/**
 * Send a message in a commission thread.
 */
export async function sendCommissionMessage(bookingId, userId, body, isMilestone = false) {
  try {
    const apiData = await devApi('/api/commission-messages', {
      method: 'POST',
      body: JSON.stringify({ bookingId, body, isMilestone }),
    });
    if (apiData) return { data: transformMessage(apiData) };
  } catch (error) {
    return { error: error.message };
  }

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
    data: transformMessage(data)
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

function transformMessage(row) {
  return {
    id: row.id,
    senderId: row.sender_id,
    body: row.body,
    isMilestone: row.is_milestone,
    attachmentUrl: row.attachment_url,
    createdAt: row.created_at,
  };
}
