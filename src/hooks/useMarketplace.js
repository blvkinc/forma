import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { fetchArtists, fetchArtworks, fetchCommissions, fetchFeedPosts } from '../lib/data';
import { validateBid } from '../lib/domain';
import {
  fetchUserLikes, toggleLike as apiToggleLike,
  fetchUserFollows, toggleFollow as apiToggleFollow,
  fetchUserWatchlist, toggleWatchlist as apiToggleWatch,
  fetchBidsForArtwork, placeBid as apiPlaceBid,
  fetchUserBids,
} from '../lib/interactions';
import { fetchUserPurchases, recordArtworkPurchase as apiRecordArtworkPurchase } from '../lib/purchases';
import { fetchUserAuctionSettlements } from '../lib/auctions';
import {
  fetchUserPostLikes,
  fetchUserSavedPosts,
  togglePostLike as apiTogglePostLike,
  toggleSavedPost as apiToggleSavedPost,
} from '../lib/social';

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

export function useMarketplace() {
  const { user, profile } = useAuth();
  const userId = user?.id;

  const [artists, setArtists] = useState([]);
  const [artworks, setArtworks] = useState([]);
  const [commissions, setCommissions] = useState([]);
  const [feedPosts, setFeedPosts] = useState([]);

  const [likes, setLikes] = useState({});
  const [follows, setFollows] = useState({});
  const [watchlist, setWatchlist] = useState({});
  const [postLikes, setPostLikes] = useState({});
  const [savedPosts, setSavedPosts] = useState({});
  const [bids, setBids] = useState({});
  const [userBids, setUserBids] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [auctionSettlements, setAuctionSettlements] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) {
      setLikes({});
      setFollows({});
      setWatchlist({});
      setPostLikes({});
      setSavedPosts({});
      setBids({});
      setUserBids([]);
      setPurchases([]);
      setAuctionSettlements([]);
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
          withTimeout(fetchUserBids(userId), 'Bid history load', 8000),
          withTimeout(fetchUserPurchases(userId), 'Acquisitions load', 8000),
          withTimeout(fetchUserPostLikes(userId), 'Feed likes load', 8000),
          withTimeout(fetchUserSavedPosts(userId), 'Saved posts load', 8000),
          withTimeout(fetchUserAuctionSettlements(userId), 'Auction invoices load', 8000),
        ]);

        const likesData = userInteractionResults[0].status === 'fulfilled' ? userInteractionResults[0].value : {};
        const followsData = userInteractionResults[1].status === 'fulfilled' ? userInteractionResults[1].value : {};
        const watchData = userInteractionResults[2].status === 'fulfilled' ? userInteractionResults[2].value : {};
        const bidData = userInteractionResults[3].status === 'fulfilled' ? userInteractionResults[3].value : [];
        const purchaseData = userInteractionResults[4].status === 'fulfilled' ? userInteractionResults[4].value : [];
        const postLikeData = userInteractionResults[5].status === 'fulfilled' ? userInteractionResults[5].value : {};
        const savedPostData = userInteractionResults[6].status === 'fulfilled' ? userInteractionResults[6].value : {};
        const settlementData = userInteractionResults[7].status === 'fulfilled' ? userInteractionResults[7].value : [];

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
        setPostLikes(postLikeData);
        setSavedPosts(savedPostData);
        setUserBids(bidData);
        setPurchases(purchaseData);
        setAuctionSettlements(settlementData);
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

  const artistById = useCallback(
    (id) => artists.find(a => a.id === id) || { id, name: 'Unknown', handle: '?', accent: '#0E0E0C' },
    [artists]
  );

  const artworkById = useCallback(
    (id) => artworks.find(w => w.id === id) || { id, title: 'Unknown', currentBid: 0 },
    [artworks]
  );

  const handleToggleLike = useCallback(async (artworkId) => {
    if (!userId) return false;
    const wasLiked = !!likes[artworkId];

    setLikes(prev => {
      const next = { ...prev };
      if (next[artworkId]) delete next[artworkId];
      else next[artworkId] = true;
      return next;
    });
    setArtworks(prev => prev.map(work => work.id === artworkId
      ? { ...work, likes: Math.max(0, Number(work.likes || 0) + (wasLiked ? -1 : 1)) }
      : work
    ));

    try {
      return await apiToggleLike(userId, artworkId);
    } catch (err) {
      console.error('Failed to toggle like:', err);
      setLikes(prev => {
        const next = { ...prev };
        if (wasLiked) next[artworkId] = true;
        else delete next[artworkId];
        return next;
      });
      setArtworks(prev => prev.map(work => work.id === artworkId
        ? { ...work, likes: Math.max(0, Number(work.likes || 0) + (wasLiked ? 1 : -1)) }
        : work
      ));
      return wasLiked;
    }
  }, [userId, likes]);

  const handleToggleFollow = useCallback(async (artistId) => {
    if (!userId) return false;
    const wasFollowing = !!follows[artistId];

    setFollows(prev => {
      const next = { ...prev };
      if (next[artistId]) delete next[artistId];
      else next[artistId] = true;
      return next;
    });
    setArtists(prev => prev.map(artist => artist.id === artistId
      ? { ...artist, followers: Math.max(0, Number(artist.followers || 0) + (wasFollowing ? -1 : 1)) }
      : artist
    ));

    try {
      return await apiToggleFollow(userId, artistId);
    } catch (err) {
      console.error('Failed to toggle follow:', err);
      setFollows(prev => {
        const next = { ...prev };
        if (wasFollowing) next[artistId] = true;
        else delete next[artistId];
        return next;
      });
      setArtists(prev => prev.map(artist => artist.id === artistId
        ? { ...artist, followers: Math.max(0, Number(artist.followers || 0) + (wasFollowing ? 1 : -1)) }
        : artist
      ));
      return wasFollowing;
    }
  }, [userId, follows]);

  const handleToggleWatch = useCallback(async (artworkId) => {
    if (!userId) return false;
    const wasWatching = !!watchlist[artworkId];

    setWatchlist(prev => {
      const next = { ...prev };
      if (next[artworkId]) delete next[artworkId];
      else next[artworkId] = true;
      return next;
    });
    setArtworks(prev => prev.map(work => work.id === artworkId
      ? { ...work, watchers: Math.max(0, Number(work.watchers || 0) + (wasWatching ? -1 : 1)) }
      : work
    ));

    try {
      return await apiToggleWatch(userId, artworkId);
    } catch (err) {
      console.error('Failed to toggle watchlist:', err);
      setWatchlist(prev => {
        const next = { ...prev };
        if (wasWatching) next[artworkId] = true;
        else delete next[artworkId];
        return next;
      });
      setArtworks(prev => prev.map(work => work.id === artworkId
        ? { ...work, watchers: Math.max(0, Number(work.watchers || 0) + (wasWatching ? 1 : -1)) }
        : work
      ));
      return wasWatching;
    }
  }, [userId, watchlist]);

  const handleTogglePostLike = useCallback(async (postId) => {
    if (!userId) return false;
    const wasLiked = !!postLikes[postId];

    setPostLikes(prev => {
      const next = { ...prev };
      if (next[postId]) delete next[postId];
      else next[postId] = true;
      return next;
    });
    setFeedPosts(prev => prev.map(post => post.id === postId
      ? { ...post, likes: Math.max(0, Number(post.likes || 0) + (wasLiked ? -1 : 1)) }
      : post
    ));

    try {
      return await apiTogglePostLike(userId, postId);
    } catch (err) {
      console.error('Failed to toggle feed like:', err);
      setPostLikes(prev => {
        const next = { ...prev };
        if (wasLiked) next[postId] = true;
        else delete next[postId];
        return next;
      });
      setFeedPosts(prev => prev.map(post => post.id === postId
        ? { ...post, likes: Math.max(0, Number(post.likes || 0) + (wasLiked ? 1 : -1)) }
        : post
      ));
      return wasLiked;
    }
  }, [userId, postLikes]);

  const handleToggleSavedPost = useCallback(async (postId) => {
    if (!userId) return false;
    const wasSaved = !!savedPosts[postId];

    setSavedPosts(prev => {
      const next = { ...prev };
      if (next[postId]) delete next[postId];
      else next[postId] = true;
      return next;
    });
    setFeedPosts(prev => prev.map(post => post.id === postId
      ? { ...post, saves: Math.max(0, Number(post.saves || 0) + (wasSaved ? -1 : 1)) }
      : post
    ));

    try {
      return await apiToggleSavedPost(userId, postId);
    } catch (err) {
      console.error('Failed to toggle saved feed post:', err);
      setSavedPosts(prev => {
        const next = { ...prev };
        if (wasSaved) next[postId] = true;
        else delete next[postId];
        return next;
      });
      setFeedPosts(prev => prev.map(post => post.id === postId
        ? { ...post, saves: Math.max(0, Number(post.saves || 0) + (wasSaved ? 1 : -1)) }
        : post
      ));
      return wasSaved;
    }
  }, [userId, savedPosts]);

  const handlePlaceBid = useCallback(async (artworkId, amount) => {
    if (!userId) return { error: 'Authentication is required to place a bid.' };

    const work = artworkById(artworkId);
    const displayName = profile?.display_name || profile?.email?.split('@')[0] || 'You';

    const validation = validateBid(amount, work.currentBid);
    if (!validation.valid) return { error: validation.error };

    const newBid = { user: displayName, amount, when: 'just now' };
    setBids(prev => ({
      ...prev,
      [artworkId]: [newBid, ...(prev[artworkId] || [])],
    }));

    setArtworks(prev => prev.map(w =>
      w.id === artworkId
        ? { ...w, currentBid: amount, bids: w.bids + 1 }
        : w
    ));

    try {
      const saved = await apiPlaceBid(userId, artworkId, amount, displayName);
      if (saved?.bid) {
        setBids(prev => ({
          ...prev,
          [artworkId]: [saved.bid, ...(prev[artworkId] || []).filter(bid => bid.id !== saved.bid.id && bid.when !== 'just now')],
        }));
        setUserBids(prev => [saved.bid, ...prev.filter(bid => bid.id !== saved.bid.id)]);
      }
      if (saved?.artwork) {
        setArtworks(prev => prev.map(w => w.id === artworkId ? saved.artwork : w));
      }
      return { success: true, bid: saved?.bid, artwork: saved?.artwork };
    } catch (err) {
      console.error('Failed to place bid:', err);
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
      return { error: err.message || 'Failed to place bid. Please try again.' };
    }
  }, [userId, profile, artworkById]);

  const loadBidsForArtwork = useCallback(async (artworkId) => {
    try {
      const bidData = await fetchBidsForArtwork(artworkId);
      setBids(prev => ({ ...prev, [artworkId]: bidData }));
    } catch (err) {
      console.error('Failed to load bids:', err);
    }
  }, []);

  const refreshUserBids = useCallback(async () => {
    if (!userId) return [];
    try {
      const bidData = await withTimeout(fetchUserBids(userId), 'Bid history refresh', 10000);
      setUserBids(bidData);
      return bidData;
    } catch (err) {
      console.error('Failed to refresh user bids:', err);
      return [];
    }
  }, [userId]);

  const refreshPurchases = useCallback(async () => {
    if (!userId) return [];
    try {
      const purchaseData = await withTimeout(fetchUserPurchases(userId), 'Acquisitions refresh', 10000);
      setPurchases(purchaseData);
      return purchaseData;
    } catch (err) {
      console.error('Failed to refresh acquisitions:', err);
      return [];
    }
  }, [userId]);

  const refreshAuctionSettlements = useCallback(async () => {
    if (!userId) return [];
    try {
      const settlementData = await withTimeout(fetchUserAuctionSettlements(userId), 'Auction invoices refresh', 10000);
      setAuctionSettlements(settlementData);
      return settlementData;
    } catch (err) {
      console.error('Failed to refresh auction invoices:', err);
      return [];
    }
  }, [userId]);

  const recordArtworkPurchase = useCallback(async (artworkId, amount) => {
    if (!userId) return { error: 'Authentication is required.' };
    const result = await apiRecordArtworkPurchase(userId, artworkId, amount);
    if (result?.error) return result;
    if (result?.data) {
      setPurchases(prev => [result.data, ...prev.filter(p => p.id !== result.data.id && p.artworkId !== result.data.artworkId)]);
    }
    return result;
  }, [userId]);

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
    artists,
    artworks,
    commissions,
    feedPosts,
    artistById,
    artworkById,
    likes,
    follows,
    watchlist,
    postLikes,
    savedPosts,
    bids,
    userBids,
    purchases,
    auctionSettlements,
    toggleLike: handleToggleLike,
    toggleFollow: handleToggleFollow,
    toggleWatch: handleToggleWatch,
    togglePostLike: handleTogglePostLike,
    toggleSavedPost: handleToggleSavedPost,
    placeBid: handlePlaceBid,
    recordArtworkPurchase,
    loadBidsForArtwork,
    refreshUserBids,
    refreshPurchases,
    refreshAuctionSettlements,
    refreshCommissions,
    refreshCatalogue,
    loading,
    error,
  };
}
