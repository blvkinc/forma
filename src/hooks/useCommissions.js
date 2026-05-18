import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  bookCommission,
  fetchBuyerBookings,
  fetchArtistBookings,
  transitionBooking,
  fetchCommissionMessages,
  sendCommissionMessage,
  getCommissionPriceBreakdown,
} from '../lib/commissions';
import { COMMISSION_STATES, nextStates, stateLabel, stateColor, isTerminalState } from '../lib/domain';

// ============================================================
// useCommissions — Commission booking & lifecycle management
// ============================================================
const COMMISSION_LOAD_TIMEOUT_MS = 10000;

function withTimeout(promise, label, ms = COMMISSION_LOAD_TIMEOUT_MS) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label} timed out.`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}

export function useCommissions(artistId = null) {
  const { user, role } = useAuth();
  const userId = user?.id;

  const [buyerBookings, setBuyerBookings] = useState([]);
  const [artistBookings, setArtistBookings] = useState([]);
  const [activeThread, setActiveThread] = useState(null); // { bookingId, messages }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load bookings on mount
  useEffect(() => {
    if (!userId) return;

    async function loadBookings() {
      setLoading(true);
      try {
        const bookings = role === 'buyer'
          ? await withTimeout(fetchBuyerBookings(userId), 'Buyer commission load')
          : [];
        setBuyerBookings(bookings);

        const sellerBookings = role === 'artist' && artistId
          ? await withTimeout(fetchArtistBookings(artistId), 'Seller commission load')
          : [];
        setArtistBookings(sellerBookings);
      } catch (err) {
        console.error('Failed to load bookings:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadBookings();
  }, [userId, role, artistId]);

  // Book a commission
  const handleBookCommission = useCallback(async (commission, briefText = '') => {
    if (!userId) return { error: 'Not authenticated' };
    if (role !== 'buyer') return { error: 'Use a buyer account to book commissions.' };

    const result = await bookCommission(userId, commission, briefText);
    if (result.error) return result;

    // Add to local state optimistically
    setBuyerBookings(prev => [result.data, ...prev]);
    return result;
  }, [userId, role]);

  // Transition a booking state
  const handleTransitionBooking = useCallback(async (bookingId, newStatus) => {
    if (role !== 'artist') return { error: 'Use a seller account to update commission status.' };

    const result = await transitionBooking(bookingId, newStatus);
    if (result.error) return result;

    // Update local state
    const updateList = (list) => list.map(b =>
      b.id === bookingId ? { ...b, status: newStatus, updatedAt: new Date().toISOString() } : b
    );

    setBuyerBookings(updateList);
    setArtistBookings(updateList);
    return result;
  }, []);

  // Load thread messages
  const openThread = useCallback(async (bookingId) => {
    try {
      const messages = await fetchCommissionMessages(bookingId);
      setActiveThread({ bookingId, messages });
    } catch (err) {
      console.error('Failed to load thread:', err);
      setError(err.message);
    }
  }, []);

  // Send a message in the active thread
  const handleSendMessage = useCallback(async (body, isMilestone = false) => {
    if (!activeThread || !userId) return;

    const result = await sendCommissionMessage(
      activeThread.bookingId, userId, body, isMilestone
    );

    if (result.error) return result;

    // Add to local messages
    setActiveThread(prev => ({
      ...prev,
      messages: [...prev.messages, result.data],
    }));

    return result;
  }, [activeThread, userId]);

  const closeThread = useCallback(() => {
    setActiveThread(null);
  }, []);

  return {
    // Data
    buyerBookings,
    artistBookings,

    // Thread
    activeThread,
    openThread,
    closeThread,
    sendMessage: handleSendMessage,

    // Actions
    bookCommission: handleBookCommission,
    transitionBooking: handleTransitionBooking,
    getPriceBreakdown: getCommissionPriceBreakdown,

    // State helpers
    COMMISSION_STATES,
    nextStates,
    stateLabel,
    stateColor,
    isTerminalState,

    // Status
    loading,
    error,
  };
}
