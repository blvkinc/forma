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
  // Per-queue failures, so one broken table/migration never blanks the
  // whole console — each section reports its own status independently.
  const [sectionErrors, setSectionErrors] = useState({});

  const refresh = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    setError(null);

    // Each queue loads independently: a failure in one (e.g. a table or
    // function from an un-applied migration) is recorded against that
    // section instead of rejecting the whole load.
    const sections = [
      ['seller applications', fetchSellerApplications, setSellerApplications],
      ['user verification', fetchKycQueue, setKyc],
      ['disputes', fetchDisputes, setDisputes],
      ['moderation', fetchModerationTargets, setModeration],
      ['auction settlements', fetchAuctionSettlements, setAuctionSettlements],
      ['delivery outbox', fetchDeliveryOutbox, setDeliveryOutbox],
      ['payouts', fetchPayouts, setPayouts],
      ['audit log', fetchAuditLog, setAudit],
    ];

    const settled = await Promise.allSettled(sections.map(([, fetcher]) => fetcher()));
    const nextErrors = {};
    settled.forEach((result, index) => {
      const [label, , setter] = sections[index];
      if (result.status === 'fulfilled') {
        setter(result.value);
      } else {
        nextErrors[label] = result.reason?.message || `Failed to load ${label}.`;
        console.error(`Admin queue "${label}" failed:`, result.reason);
      }
    });

    setSectionErrors(nextErrors);
    const failedLabels = Object.keys(nextErrors);
    if (failedLabels.length) {
      const looksLikeMigration = Object.values(nextErrors).some(message =>
        /does not exist|schema cache|could not find|PGRST(202|204)|relation .* does not/i.test(message || '')
      );
      setError(
        `${failedLabels.length} of ${sections.length} admin queues failed to load (${failedLabels.join(', ')}). `
        + (looksLikeMigration
          ? 'This usually means the latest Supabase migrations have not been applied to this database.'
          : 'The other queues below are still live.')
      );
    }
    setLoading(false);
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
    sectionErrors,
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
