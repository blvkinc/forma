import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  fetchKycQueue, setProfileVerified,
  fetchDisputes, resolveDispute,
  fetchAuditLog, fetchPayouts,
  fetchModerationTargets, setArtworkTakedown, setArtistSuspended,
  fetchAuctionSettlements, closeAuctionForSettlement, markAuctionSettlementPaid,
  fetchDeliveryOutbox, markDeliveryStatus,
  fetchSellerApplications, reviewSellerApplication,
  saveArtworkModerationReview, setArtworkProofStatus,
} from '../lib/admin';

// ============================================================
// useAdmin — loads the admin queues when the user is an admin
// ============================================================
export function useAdmin() {
  const { user, role } = useAuth();
  const isAdmin = role === 'admin' && !!user?.id;

  const [kyc, setKyc] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [audit, setAudit] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [moderation, setModeration] = useState({ artworks: [], artists: [] });
  const [auctionSettlements, setAuctionSettlements] = useState([]);
  const [deliveryOutbox, setDeliveryOutbox] = useState([]);
  const [sellerApplications, setSellerApplications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    setError(null);
    try {
      const [k, d, a, p, m, s, o, sellerApps] = await Promise.all([
        fetchKycQueue(),
        fetchDisputes(),
        fetchAuditLog(),
        fetchPayouts(),
        fetchModerationTargets(),
        fetchAuctionSettlements(),
        fetchDeliveryOutbox(),
        fetchSellerApplications(),
      ]);
      setKyc(k);
      setDisputes(d);
      setAudit(a);
      setPayouts(p);
      setModeration(m);
      setAuctionSettlements(s);
      setDeliveryOutbox(o);
      setSellerApplications(sellerApps);
    } catch (err) {
      setError(err.message || 'Failed to load admin data.');
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => { refresh(); }, [refresh]);

  const verifyProfile = useCallback(async (profileId, verified) => {
    await setProfileVerified(profileId, verified);
    setKyc(prev => prev.map(p => p.id === profileId ? { ...p, verified } : p));
    fetchAuditLog().then(setAudit).catch(() => {});
  }, []);

  const decideDispute = useCallback(async (bookingId, decision) => {
    await resolveDispute(bookingId, decision);
    setDisputes(prev => prev.filter(d => d.id !== bookingId));
    fetchAuditLog().then(setAudit).catch(() => {});
  }, []);

  const toggleArtworkTakedown = useCallback(async (artworkId, value) => {
    await setArtworkTakedown(artworkId, value);
    setModeration(prev => ({
      ...prev,
      artworks: prev.artworks.map(w => w.id === artworkId ? { ...w, takenDown: value } : w),
    }));
    fetchAuditLog().then(setAudit).catch(() => {});
  }, []);

  const reviewArtworkModeration = useCallback(async (artworkId, payload = {}) => {
    if (typeof payload.takenDown === 'boolean') {
      await setArtworkTakedown(artworkId, payload.takenDown);
    }
    await saveArtworkModerationReview(artworkId, payload);
    fetchModerationTargets().then(setModeration).catch(() => {});
    fetchAuditLog().then(setAudit).catch(() => {});
    return true;
  }, []);

  const reviewArtworkProof = useCallback(async (proofId, status) => {
    await setArtworkProofStatus(proofId, status);
    fetchModerationTargets().then(setModeration).catch(() => {});
    fetchAuditLog().then(setAudit).catch(() => {});
    return true;
  }, []);

  const toggleArtistSuspended = useCallback(async (artistId, value) => {
    await setArtistSuspended(artistId, value);
    setModeration(prev => ({
      ...prev,
      artists: prev.artists.map(a => a.id === artistId ? { ...a, suspended: value } : a),
    }));
    fetchAuditLog().then(setAudit).catch(() => {});
  }, []);

  const closeAuction = useCallback(async (artworkId) => {
    await closeAuctionForSettlement(artworkId);
    fetchAuctionSettlements().then(setAuctionSettlements).catch(() => {});
    fetchAuditLog().then(setAudit).catch(() => {});
  }, []);

  const markSettlementPaid = useCallback(async (settlementId) => {
    await markAuctionSettlementPaid(settlementId);
    fetchAuctionSettlements().then(setAuctionSettlements).catch(() => {});
    fetchPayouts().then(setPayouts).catch(() => {});
    fetchAuditLog().then(setAudit).catch(() => {});
  }, []);

  const setDeliveryStatus = useCallback(async (deliveryId, status, errorMessage = null) => {
    await markDeliveryStatus(deliveryId, status, errorMessage);
    fetchDeliveryOutbox().then(setDeliveryOutbox).catch(() => {});
    fetchAuditLog().then(setAudit).catch(() => {});
  }, []);

  const decideSellerApplication = useCallback(async (applicationId, decision, reviewNote = '') => {
    const updated = await reviewSellerApplication(applicationId, decision, reviewNote);
    setSellerApplications(prev => prev.map(app => app.id === applicationId ? updated : app));
    fetchKycQueue().then(setKyc).catch(() => {});
    fetchModerationTargets().then(setModeration).catch(() => {});
    fetchAuditLog().then(setAudit).catch(() => {});
    return updated;
  }, []);

  return {
    isAdmin,
    kyc,
    disputes,
    audit,
    payouts,
    moderation,
    auctionSettlements,
    deliveryOutbox,
    sellerApplications,
    loading,
    error,
    refresh,
    verifyProfile,
    decideDispute,
    toggleArtworkTakedown,
    reviewArtworkModeration,
    reviewArtworkProof,
    toggleArtistSuspended,
    closeAuction,
    markSettlementPaid,
    setDeliveryStatus,
    decideSellerApplication,
  };
}
