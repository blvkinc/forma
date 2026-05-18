import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { fetchArtists, fetchArtworks, fetchCommissions, fetchFeedPosts } from '../lib/data';
import { minimumNextBid, validateBid } from '../lib/domain';
import {
  fetchUserLikes, toggleLike as apiToggleLike,
  fetchUserFollows, toggleFollow as apiToggleFollow,
  fetchUserWatchlist, toggleWatchlist as apiToggleWatch,
  fetchBidsForArtwork, placeBid as apiPlaceBid,
} from '../lib/interactions';

const CATALOGUE_LOAD_TIMEOUT_MS = 30000;

function withTimeout(promise, label, ms = CATALOGUE_LOAD_TIMEOUT_MS) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${label} timed out. Please check the Supabase connection and try again.`));
    }, ms);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}

// ============================================================
// useMarketplace — replaces hardcoded mock data + useStoredState
// ============================================================
export function useMarketplace() {
  const { user, profile } = useAuth();
  const userId = user?.id;

  // --- Catalogue state ---
  const [artists, setArtists] = useState([]);
  const [artworks, setArtworks] = useState([]);
  const [commissions, setCommissions] = useState([]);
  const [feedPosts, setFeedPosts] = useState([]);

  // --- User interaction state ---
  const [likes, setLikes] = useState({});
  const [follows, setFollows] = useState({});
  const [watchlist, setWatchlist] = useState({});
  const [bids, setBids] = useState({}); // { artworkId: [bid, ...] }

  // --- UI state ---
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // ------------------------------------------------------------------
  // Initial data load
  // ------------------------------------------------------------------
  useEffect(() => {
    // If not authenticated yet, don't try to load — but also don't stay in loading state
    if (!userId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadAll() {
      try {
        setLoading(true);
        setError(null);

        const [
          artistsData,
          artworksData,
          commissionsData,
          feedData,
        ] = await withTimeout(Promise.all([
          fetchArtists(),
          fetchArtworks(),
          fetchCommissions(),
          fetchFeedPosts(),
        ]), 'Catalogue load');

        const userInteractionResults = await Promise.allSettled([
          withTimeout(fetchUserLikes(userId), 'Likes load', 8000),
          withTimeout(fetchUserFollows(userId), 'Follows load', 8000),
          withTimeout(fetchUserWatchlist(userId), 'Watchlist load', 8000),
        ]);

        const likesData = userInteractionResults[0].status === 'fulfilled' ? userInteractionResults[0].value : {};
        const followsData = userInteractionResults[1].status === 'fulfilled' ? userInteractionResults[1].value : {};
        const watchData = userInteractionResults[2].status === 'fulfilled' ? userInteractionResults[2].value : {};

        userInteractionResults.forEach((result) => {
          if (result.status === 'rejected') {
            console.warn('User interaction state unavailable:', result.reason?.message || result.reason);
          }
        });

        if (cancelled) return;

        setArtists(artistsData);
        setArtworks(artworksData);
        setCommissions(commissionsData);
        setFeedPosts(feedData);
        setLikes(likesData);
        setFollows(followsData);
        setWatchlist(watchData);
      } catch (err) {
        console.error('Failed to load marketplace data:', err);
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadAll();

    return () => { cancelled = true; };
  }, [userId]);

  // ------------------------------------------------------------------
  // Helpers (match existing interface)
  // ------------------------------------------------------------------
  const artistById = useCallback(
    (id) => artists.find(a => a.id === id) || { id, name: 'Unknown', handle: '?', accent: '#0E0E0C' },
    [artists]
  );

  const artworkById = useCallback(
    (id) => artworks.find(w => w.id === id) || { id, title: 'Unknown', currentBid: 0 },
    [artworks]
  );

  // ------------------------------------------------------------------
  // Interaction handlers (optimistic UI + Supabase sync)
  // ------------------------------------------------------------------
  const handleToggleLike = useCallback(async (artworkId) => {
    if (!userId) return;

    // Optimistic update
    setLikes(prev => {
      const next = { ...prev };
      if (next[artworkId]) {
        delete next[artworkId];
      } else {
        next[artworkId] = true;
      }
      return next;
    });

    try {
      await apiToggleLike(userId, artworkId);
    } catch (err) {
      console.error('Failed to toggle like:', err);
      // Revert on failure
      setLikes(prev => {
        const next = { ...prev };
        if (next[artworkId]) {
          delete next[artworkId];
        } else {
          next[artworkId] = true;
        }
        return next;
      });
    }
  }, [userId]);

  const handleToggleFollow = useCallback(async (artistId) => {
    if (!userId) return;

    const wasFollowing = !!follows[artistId];

    setFollows(prev => {
      const next = { ...prev };
      if (next[artistId]) delete next[artistId];
      else next[artistId] = true;
      return next;
    });

    try {
      await apiToggleFollow(userId, artistId);
    } catch (err) {
      console.error('Failed to toggle follow:', err);
      setFollows(prev => {
        const next = { ...prev };
        if (wasFollowing) next[artistId] = true;
        else delete next[artistId];
        return next;
      });
    }

    return !wasFollowing;
  }, [userId, follows]);

  const handleToggleWatch = useCallback(async (artworkId) => {
    if (!userId) return;

    const wasWatching = !!watchlist[artworkId];

    setWatchlist(prev => {
      const next = { ...prev };
      if (next[artworkId]) delete next[artworkId];
      else next[artworkId] = true;
      return next;
    });

    try {
      await apiToggleWatch(userId, artworkId);
    } catch (err) {
      console.error('Failed to toggle watchlist:', err);
      setWatchlist(prev => {
        const next = { ...prev };
        if (wasWatching) next[artworkId] = true;
        else delete next[artworkId];
        return next;
      });
    }

    return !wasWatching;
  }, [userId, watchlist]);

  const handlePlaceBid = useCallback(async (artworkId, amount) => {
    if (!userId) return;

    const work = artworkById(artworkId);
    const displayName = profile?.display_name || profile?.email?.split('@')[0] || 'You';

    // Validation using SRS rules (FR-AUC-003)
    const validation = validateBid(amount, work.currentBid);
    if (!validation.valid) {
      return { error: validation.error };
    }

    // Optimistic update
    const newBid = { user: displayName, amount, when: 'just now' };
    setBids(prev => ({
      ...prev,
      [artworkId]: [newBid, ...(prev[artworkId] || [])],
    }));

    // Also update the artwork's current bid optimistically
    setArtworks(prev => prev.map(w =>
      w.id === artworkId
        ? { ...w, currentBid: amount, bids: w.bids + 1 }
        : w
    ));

    try {
      await apiPlaceBid(userId, artworkId, amount, displayName);
      return { success: true };
    } catch (err) {
      console.error('Failed to place bid:', err);
      // Revert
      setBids(prev => {
        const next = { ...prev };
        if (next[artworkId]) next[artworkId] = next[artworkId].slice(1);
        return next;
      });
      setArtworks(prev => prev.map(w =>
        w.id === artworkId
          ? { ...w, currentBid: work.currentBid, bids: work.bids }
          : w
      ));
      return { error: 'Failed to place bid. Please try again.' };
    }
  }, [userId, profile, artworkById]);

  // Load bids for a specific artwork on demand
  const loadBidsForArtwork = useCallback(async (artworkId) => {
    try {
      const bidData = await fetchBidsForArtwork(artworkId);
      setBids(prev => ({ ...prev, [artworkId]: bidData }));
    } catch (err) {
      console.error('Failed to load bids:', err);
    }
  }, []);

  const refreshCommissions = useCallback(async () => {
    try {
      const commissionsData = await withTimeout(fetchCommissions(), 'Commissions refresh', 10000);
      setCommissions(commissionsData);
      return commissionsData;
    } catch (err) {
      console.error('Failed to refresh commissions:', err);
      return null;
    }
  }, []);

  const refreshCatalogue = useCallback(async () => {
    try {
      const [
        artistsData,
        artworksData,
        commissionsData,
        feedData,
      ] = await withTimeout(Promise.all([
        fetchArtists(),
        fetchArtworks(),
        fetchCommissions(),
        fetchFeedPosts(),
      ]), 'Catalogue refresh', 15000);

      setArtists(artistsData);
      setArtworks(artworksData);
      setCommissions(commissionsData);
      setFeedPosts(feedData);
      return { artists: artistsData, artworks: artworksData, commissions: commissionsData, feedPosts: feedData };
    } catch (err) {
      console.error('Failed to refresh catalogue:', err);
      return null;
    }
  }, []);

  return {
    // Catalogue data
    artists,
    artworks,
    commissions,
    feedPosts,

    // Helpers
    artistById,
    artworkById,

    // User interactions
    likes,
    follows,
    watchlist,
    bids,

    // Action handlers
    toggleLike: handleToggleLike,
    toggleFollow: handleToggleFollow,
    toggleWatch: handleToggleWatch,
    placeBid: handlePlaceBid,
    loadBidsForArtwork,
    refreshCommissions,
    refreshCatalogue,

    // Status
    loading,
    error,
  };
}
