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
export function useCommissions() {
  const { user, profile, role } = useAuth();
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
        const bookings = await fetchBuyerBookings(userId);
        setBuyerBookings(bookings);

        // If user is an artist, also load artist-side bookings
        if (role === 'artist' || role === 'admin') {
          // For now, use a1 as the artist ID mapping
          // In production, this would come from the artist profile linked to the user
          const artistBookings = await fetchArtistBookings(profile?.artist_id || 'a1');
          setArtistBookings(artistBookings);
        }
      } catch (err) {
        console.error('Failed to load bookings:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadBookings();
  }, [userId, role, profile]);

  // Book a commission
  const handleBookCommission = useCallback(async (commission, briefText = '') => {
    if (!userId) return { error: 'Not authenticated' };

    const result = await bookCommission(userId, commission, briefText);
    if (result.error) return result;

    // Add to local state optimistically
    setBuyerBookings(prev => [result.data, ...prev]);
    return result;
  }, [userId]);

  // Transition a booking state
  const handleTransitionBooking = useCallback(async (bookingId, newStatus) => {
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
