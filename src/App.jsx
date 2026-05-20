import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Shield, ArrowRight } from 'lucide-react';
import { useAuth } from './contexts/AuthContext';
import AuthPage from './pages/AuthPage';
import SetNewPassword from './pages/SetNewPassword';
import VerifyEmailPage from './pages/VerifyEmailPage';
import { initialAuthCallback } from './lib/supabase';
import { useMarketplace } from './hooks/useMarketplace';
import { useCommissions } from './hooks/useCommissions';
import { useTrustSafety } from './hooks/useTrustSafety';
import { useNotifications } from './hooks/useNotifications';
import { useFormaMotion } from './hooks/useFormaMotion';
import { createSellerArtist, createSellerArtwork, createSellerCommission, createSellerFeedPost, deleteSellerFeedPost, updateSellerFeedPost, uploadArtworkImage } from './lib/seller';
import { fmt, roleLabel, isBuyerRole, isSellerRole, isAdminRole, isSocialParticipantRole, APP_VIEWS, viewFromHash } from './lib/ui';
import { setCatalogue, artworkById, artistById } from './lib/catalogue';

import { GlobalStyles } from './components/GlobalStyles';
import { Header, Footer, CatalogueLoadingState, CatalogueErrorState } from './components/shared';
import { CommissionBookingView, CommissionThreadModal } from './features/commissions';
import { ReportModal } from './features/ReportModal';
// Code-split each view so the initial bundle stays small.
const named = (p, name) => lazy(() => p().then(m => ({ default: m[name] })));
const HomeView = named(() => import('./pages/HomeView'), 'HomeView');
const ExploreView = named(() => import('./pages/ExploreView'), 'ExploreView');
const ArtworkView = named(() => import('./pages/ArtworkView'), 'ArtworkView');
const ArtistView = named(() => import('./pages/ArtistView'), 'ArtistView');
const CommissionsView = named(() => import('./pages/CommissionsView'), 'CommissionsView');
const FeedView = named(() => import('./pages/FeedView'), 'FeedView');
const ArtistsView = named(() => import('./pages/ArtistsView'), 'ArtistsView');
const ProfileView = named(() => import('./pages/ProfileView'), 'ProfileView');
const BuyerDashboard = named(() => import('./pages/BuyerDashboard'), 'BuyerDashboard');
const StudioDashboard = named(() => import('./pages/StudioDashboard'), 'StudioDashboard');
const AdminDashboard = named(() => import('./pages/AdminDashboard'), 'AdminDashboard');
const InfoView = named(() => import('./pages/InfoView'), 'InfoView');

// ============================================================
// MAIN APP
// ============================================================
export default function App() {
  const { isAuthenticated, loading: authLoading, user, profile, role, signOut, updateProfile, recoveryMode } = useAuth();
  const [verifyMode, setVerifyMode] = useState(initialAuthCallback?.type === 'signup');
  const [verifyError, setVerifyError] = useState(false);
  const marketplace = useMarketplace();
  const ownedArtist = marketplace.artists.find(artist => artist.profileId === user?.id) || null;
  const commissionState = useCommissions(ownedArtist?.id || null);
  const trustState = useTrustSafety();
  const [view, setView] = useState(() => viewFromHash());
  const [selectedArtwork, setSelectedArtwork] = useState(null);
  const [selectedArtist, setSelectedArtist] = useState(null);
  const [bookingCommission, setBookingCommission] = useState(null);
  const [bookingReturnView, setBookingReturnView] = useState('commissions');
  const [threadBooking, setThreadBooking] = useState(null);
  const [adminFocusArtwork, setAdminFocusArtwork] = useState(null);
  const [adminInitialTab, setAdminInitialTab] = useState(null);
  const [sendingThreadMessage, setSendingThreadMessage] = useState(false);
  const [reportTarget, setReportTarget] = useState(null);
  const {
    unreadCount: notifCount,
    notifications,
    markAsRead: markNotificationRead,
    markAllAsRead: markAllNotificationsRead,
    loading: notifLoading,
  } = useNotifications();
  const [query, setQuery] = useState('');
  const [toast, setToast] = useState(null);

  // Sync hook data → shared catalogue store so view modules can read it
  setCatalogue(marketplace);

  // Destructure interaction data from hook
  const { likes, follows, watchlist, postLikes, savedPosts, bids, userBids } = marketplace;

  const navigateToView = (target) => {
    if (!APP_VIEWS.has(target)) return;
    if (target !== 'admin') {
      setAdminFocusArtwork(null);
      setAdminInitialTab(null);
    }
    setView(target);
    if (typeof window !== 'undefined') {
      const nextHash = target === 'home' ? '' : `#${target}`;
      if (window.location.hash !== nextHash) {
        if (nextHash) window.location.hash = nextHash;
        else window.history.pushState('', document.title, window.location.pathname + window.location.search);
      }
      window.scrollTo(0, 0);
    }
  };

  useEffect(() => {
    const onHashChange = () => setView(viewFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    const hashView = viewFromHash();
    if (hashView !== view) setView(hashView);
  });

  useEffect(() => {
    if (view === 'commission-booking' && !bookingCommission) {
      navigateToView(bookingReturnView || 'commissions');
    }
  }, [view, bookingCommission]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        navigateToView('home');
        window.requestAnimationFrame(() => document.getElementById('global-search')?.focus());
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useFormaMotion([authLoading, isAuthenticated, view, marketplace.artworks.length, marketplace.feedPosts.length, marketplace.commissions.length]);

  // Email-verification flow: once auth has settled, strip the access_token
  // fragment from the URL and decide whether to show success or error UI.
  useEffect(() => {
    if (!verifyMode || authLoading) return;
    if (typeof window !== 'undefined' && window.location.hash.includes('access_token')) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
    if (!isAuthenticated) setVerifyError(true);
  }, [verifyMode, authLoading, isAuthenticated]);

  const exitVerify = () => {
    if (typeof window !== 'undefined' && window.location.hash.includes('access_token')) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
    setVerifyMode(false);
    setVerifyError(false);
    navigateToView(isSellerRole(role) ? 'studio' : isAdminRole(role) ? 'admin' : 'home');
  };

  const goToArtwork = (id) => { setSelectedArtwork(id); navigateToView('artwork'); };
  const goToArtist = (id) => { setSelectedArtist(id); navigateToView('artist'); };
  const openAdminModeration = (artworkId = null, initialTab = null) => {
    setAdminFocusArtwork(artworkId || null);
    setAdminInitialTab(initialTab || (artworkId ? 'moderation' : null));
    navigateToView('admin');
  };

  const showToast = (message, delay = 2400) => {
    setToast(message);
    setTimeout(() => setToast(null), delay);
  };

  const requireBuyerAccount = () => {
    if (isBuyerRole(role)) return true;
    showToast('Use a buyer account for collecting actions.');
    return false;
  };

  const requireSocialAccount = (message = 'Sign in to use social actions.') => {
    if (isAuthenticated && isSocialParticipantRole(role)) return true;
    if (isAdminRole(role)) {
      showToast('Admin accounts review social activity from the admin console.');
      return false;
    }
    showToast(message);
    return false;
  };

  const requireSellerAccount = () => {
    if (!isSellerRole(role)) {
      showToast('Use a seller account for studio actions.');
      return false;
    }
    if (profile?.verified !== true) {
      showToast('Complete seller onboarding before publishing.');
      return false;
    }
    return true;
  };

  const toggleLike = async (id) => {
    if (!requireSocialAccount('Sign in to like artworks.')) return false;
    try {
      return await marketplace.toggleLike(id);
    } catch (err) {
      showToast(err.message || 'Could not update like.', 3200);
      return false;
    }
  };

  const toggleWatch = async (id) => {
    if (!requireBuyerAccount()) return;
    const work = artworkById(id);
    const isNowWatching = await marketplace.toggleWatch(id);
    showToast(isNowWatching ? `Watching ${work.title}` : `Removed ${work.title} from watchlist`);
  };

  const toggleFollow = async (id) => {
    if (!requireSocialAccount('Sign in to follow studios.')) return false;
    try {
      const artist = artistById(id);
      const isNowFollowing = await marketplace.toggleFollow(id);
      showToast(isNowFollowing ? `Following ${artist.name}` : `Unfollowed ${artist.name}`);
      return isNowFollowing;
    } catch (err) {
      showToast(err.message || 'Could not update follow.', 3200);
      return false;
    }
  };

  const togglePostLike = async (id) => {
    if (!requireSocialAccount('Sign in to like feed posts.')) return false;
    return marketplace.togglePostLike(id);
  };

  const toggleSavedPost = async (id) => {
    if (!requireSocialAccount('Sign in to save feed posts.')) return false;
    const isSaved = await marketplace.toggleSavedPost(id);
    showToast(isSaved ? 'Saved feed post.' : 'Removed saved feed post.');
    return isSaved;
  };

  const placeBid = async (workId, amount) => {
    if (!requireBuyerAccount()) return { error: 'Use a buyer account to bid.' };
    const result = await marketplace.placeBid(workId, amount);
    if (result?.error) {
      showToast(result.error, 2800);
    } else {
      const w = artworkById(workId);
      showToast(`Bid of $${fmt(amount)} placed on ${w.title}`, 2800);
    }
    return result;
  };

  const openCommissionBooking = (commission) => {
    if (!isBuyerRole(role)) {
      showToast('Use a buyer account to book commission slots.');
      return;
    }
    if (commission.taken >= commission.slots) {
      showToast('This commission board is full.');
      return;
    }
    setBookingReturnView(APP_VIEWS.has(view) && view !== 'commission-booking' ? view : 'commissions');
    setBookingCommission(commission);
    navigateToView('commission-booking');
  };

  const closeCommissionBooking = () => {
    setBookingCommission(null);
    navigateToView(bookingReturnView || 'commissions');
  };

  const confirmCommissionBooking = async (briefText) => {
    if (!bookingCommission) return { error: 'No commission selected.' };
    const result = await commissionState.bookCommission(bookingCommission, briefText);
    if (result?.error) {
      showToast(result.error, 3000);
      return result;
    }
    setBookingCommission(null);
    await marketplace.refreshCommissions();
    if (result?.data) {
      setThreadBooking(result.data);
      await commissionState.openThread(result.data.id);
    }
    navigateToView(bookingReturnView || 'commissions');
    showToast('Commission slot booked. Project thread opened.');
    return result;
  };

  const openCommissionThread = async (booking) => {
    setThreadBooking(booking);
    await commissionState.openThread(booking.id);
  };

  const closeCommissionThread = () => {
    setThreadBooking(null);
    commissionState.closeThread();
  };

  const sendThreadMessage = async (body, isMilestone = false) => {
    setSendingThreadMessage(true);
    const result = await commissionState.sendMessage(body, isMilestone);
    setSendingThreadMessage(false);
    if (result?.error) showToast(result.error, 3000);
    return result;
  };

  const disputeThreadBooking = async (booking) => {
    const result = await commissionState.transitionBooking(booking.id, 'DISPUTED');
    if (result?.error) {
      showToast(result.error, 3200);
      return result;
    }
    await commissionState.sendMessage('A dispute was opened on this commission.', true);
    await commissionState.openThread(booking.id);
    setThreadBooking(prev => prev && prev.id === booking.id ? { ...prev, status: 'DISPUTED' } : prev);
    showToast('Dispute opened. An admin will review.');
    return result;
  };

  const openReport = (target) => {
    setReportTarget(target);
  };

  const submitReport = async (payload) => {
    try {
      await trustState.submitReport(payload);
      setReportTarget(null);
      showToast('Report submitted to trust and safety.');
      return true;
    } catch (err) {
      showToast(err.message || 'Report submission failed.', 3600);
      return false;
    }
  };

  const handleCreateSellerArtist = async (payload) => {
    if (!requireSellerAccount()) return false;
    try {
      await createSellerArtist(payload);
      await marketplace.refreshCatalogue();
      showToast(ownedArtist ? 'Seller studio updated.' : 'Seller studio created.');
      return true;
    } catch (err) {
      showToast(err.message || 'Seller studio creation failed.', 3600);
      return false;
    }
  };

  const handleCreateSellerArtwork = async (payload) => {
    if (!requireSellerAccount()) return false;
    try {
      const created = await createSellerArtwork(payload);
      await marketplace.refreshCatalogue();
      showToast('Artwork listed.');
      if (created?.id) goToArtwork(created.id);
      return true;
    } catch (err) {
      showToast(err.message || 'Artwork listing failed.', 3600);
      return false;
    }
  };

  const handleCreateSellerCommission = async (payload) => {
    if (!requireSellerAccount()) return false;
    try {
      await createSellerCommission(payload);
      await marketplace.refreshCatalogue();
      showToast('Commission board opened.');
      return true;
    } catch (err) {
      showToast(err.message || 'Commission creation failed.', 3600);
      return false;
    }
  };

  const handleCreateFeedPost = async ({ body, type, artworkId }) => {
    if (!requireSellerAccount()) return { error: 'Use a seller account to post.' };
    try {
      await createSellerFeedPost({ body, type, artworkId });
      await marketplace.refreshCatalogue();
      showToast('Posted to your studio feed.');
      return { success: true };
    } catch (err) {
      showToast(err.message || 'Feed post failed.', 3600);
      return { error: err.message || 'Feed post failed.' };
    }
  };

  const handleEditFeedPost = async (postId, { body, type }) => {
    if (!requireSellerAccount()) return { error: 'Use a seller account to edit posts.' };
    try {
      await updateSellerFeedPost(postId, { body, type });
      await marketplace.refreshCatalogue();
      showToast('Feed post updated.');
      return { success: true };
    } catch (err) {
      showToast(err.message || 'Feed post update failed.', 3600);
      return { error: err.message || 'Feed post update failed.' };
    }
  };

  const handleDeleteFeedPost = async (postId) => {
    if (!requireSellerAccount()) return { error: 'Use a seller account to delete feed posts.' };
    try {
      await deleteSellerFeedPost(postId);
      await marketplace.refreshCatalogue();
      showToast('Feed post deleted.');
      return { success: true };
    } catch (err) {
      showToast(err.message || 'Feed post deletion failed.', 3600);
      return { error: err.message || 'Feed post deletion failed.' };
    }
  };

  const openNotification = (notification) => {
    if (!notification) return;
    if (notification.linkType === 'artwork' && notification.linkId) {
      goToArtwork(notification.linkId);
    } else if (notification.linkType === 'commission') {
      navigateToView(isSellerRole(role) ? 'studio' : 'dashboard');
    } else if (notification.linkType === 'artist' && notification.linkId) {
      goToArtist(notification.linkId);
    } else if (notification.linkType === 'feed') {
      navigateToView('feed');
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigateToView('home');
    } catch (err) {
      showToast('Sign out failed: ' + err.message);
    }
  };

  // --- Email-verification gate (takes precedence — user came in via confirm link) ---
  if (verifyMode) {
    return (
      <>
        <GlobalStyles/>
        <VerifyEmailPage
          status={verifyError ? 'error' : 'success'}
          onContinue={exitVerify}
          onBackToSignIn={exitVerify}
        />
      </>
    );
  }

  // --- Loading state ---
  if (authLoading) {
    return (
      <div className="swiss-app min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg)' }}>
        <GlobalStyles/>
        <div className="text-center">
          <div className="display text-[28px]">FORMA</div>
          <div className="mt-4 flex justify-center">
            <div className="w-5 h-5 border-2 border-[var(--ink)] border-t-transparent rounded-full animate-spin"/>
          </div>
          <div className="mono text-[11px] mt-3 text-[var(--muted)]">
            Authenticating...
          </div>
        </div>
      </div>
    );
  }

  // --- Password recovery gate (takes precedence over the app) ---
  if (recoveryMode) {
    return (
      <>
        <GlobalStyles/>
        <SetNewPassword/>
      </>
    );
  }

  // --- Auth gate ---
  if (!isAuthenticated) {
    return (
      <>
        <GlobalStyles/>
        <AuthPage/>
      </>
    );
  }

  // --- Role-gated dashboard access ---
  const canViewDashboard = isBuyerRole(role);
  const canViewStudio = isSellerRole(role);
  const canViewAdmin = isAdminRole(role);

  return (
    <div className="swiss-app min-h-screen">
      <GlobalStyles/>
      <Header view={view} setView={navigateToView} role={role} notif={notifCount} query={query} setQuery={setQuery} profile={profile} onSignOut={handleSignOut} notifications={notifications} notifLoading={notifLoading} onMarkRead={markNotificationRead} onMarkAllRead={markAllNotificationsRead} onOpenNotification={openNotification}/>
      {marketplace.error && view !== 'profile' ? (
        <CatalogueErrorState error={marketplace.error}/>
      ) : marketplace.loading && view !== 'profile' ? (
        <CatalogueLoadingState/>
      ) : (
        <Suspense fallback={<CatalogueLoadingState/>}>
          {view === 'home' && <HomeView goToArtwork={goToArtwork} goToArtist={goToArtist} likes={likes} toggleLike={toggleLike} watchlist={watchlist} toggleWatch={toggleWatch} goExplore={() => navigateToView('explore')} goStudio={() => navigateToView('studio')}/>}
          {view === 'explore' && <ExploreView goToArtwork={goToArtwork} goToArtist={goToArtist} goFeed={() => navigateToView('feed')} likes={likes} toggleLike={toggleLike} watchlist={watchlist} toggleWatch={toggleWatch} query={query}/>}
          {view === 'artwork' && selectedArtwork && <ArtworkView workId={selectedArtwork} goToArtwork={goToArtwork} goToArtist={goToArtist} likes={likes} toggleLike={toggleLike} bids={bids} placeBid={placeBid} purchases={marketplace.purchases} recordPurchase={marketplace.recordArtworkPurchase} loadBidsForArtwork={marketplace.loadBidsForArtwork} onReport={openReport} user={user} role={role} refreshCatalogue={marketplace.refreshCatalogue} onOpenAdminModeration={openAdminModeration}/>}
          {view === 'artist' && selectedArtist && <ArtistView artistId={selectedArtist} goToArtwork={goToArtwork} follows={follows} toggleFollow={toggleFollow} likes={likes} toggleLike={toggleLike} role={role} onBookCommission={openCommissionBooking} onReport={openReport}/>}
          {view === 'commissions' && <CommissionsView goToArtist={goToArtist} role={role} onBookCommission={openCommissionBooking}/>}
          {view === 'commission-booking' && bookingCommission && (
            <CommissionBookingView
              commission={bookingCommission}
              role={role}
              onClose={closeCommissionBooking}
              onConfirm={confirmCommissionBooking}
              getPriceBreakdown={commissionState.getPriceBreakdown}
            />
          )}
          {view === 'feed' && <FeedView goToArtwork={goToArtwork} goToArtist={goToArtist} follows={follows} toggleFollow={toggleFollow} canPost={isSellerRole(role) && profile?.verified === true && !!ownedArtist} onPost={handleCreateFeedPost} user={user} ownedArtist={ownedArtist} feedPosts={marketplace.feedPosts} artists={marketplace.artists} artworks={marketplace.artworks} postLikes={postLikes} togglePostLike={togglePostLike} savedPosts={savedPosts} toggleSavedPost={toggleSavedPost} onDeletePost={handleDeleteFeedPost} onEditPost={handleEditFeedPost} onRefresh={marketplace.refreshCatalogue} onReport={openReport} role={role} onOpenAdmin={() => openAdminModeration(null, 'social')}/>}
          {view === 'artists' && <ArtistsView goToArtist={goToArtist} follows={follows} toggleFollow={toggleFollow} role={role}/>}
          {view === 'profile' && <ProfileView user={user} profile={profile} role={role} updateProfile={updateProfile} marketplace={marketplace} setView={navigateToView} goToArtwork={goToArtwork} goToArtist={goToArtist} toggleFollow={toggleFollow}/>}
          {view === 'dashboard' && canViewDashboard && <BuyerDashboard goToArtwork={goToArtwork} likes={likes} toggleLike={toggleLike} userBids={userBids} purchases={marketplace.purchases} auctionSettlements={marketplace.auctionSettlements} artworks={marketplace.artworks} watchlist={watchlist} toggleWatch={toggleWatch} profile={profile} commissionState={commissionState} onOpenCommissionThread={openCommissionThread} setView={navigateToView}/>}
          {view === 'studio' && canViewStudio && <StudioDashboard goToArtwork={goToArtwork} likes={likes} toggleLike={toggleLike} profile={profile} ownedArtist={ownedArtist} commissionState={commissionState} onOpenCommissionThread={openCommissionThread} onSubmitStudio={handleCreateSellerArtist} onSubmitArtwork={handleCreateSellerArtwork} onUploadArtworkImage={uploadArtworkImage} onSubmitCommission={handleCreateSellerCommission}/>}
          {view === 'admin' && canViewAdmin && <AdminDashboard goToArtist={goToArtist} goToArtwork={goToArtwork} goToFeed={() => navigateToView('feed')} trustState={trustState} profile={profile} user={user} initialModerationArtworkId={adminFocusArtwork} initialTab={adminInitialTab}/>}
          {(view === 'terms' || view === 'privacy' || view === 'trust' || view === 'api') && <InfoView page={view} goBack={() => navigateToView('home')}/>}
        </Suspense>
      )}

      <CommissionThreadModal
        booking={threadBooking}
        activeThread={commissionState.activeThread}
        user={user}
        onClose={closeCommissionThread}
        onSend={sendThreadMessage}
        onDispute={disputeThreadBooking}
        sending={sendingThreadMessage}
      />
      <ReportModal
        target={reportTarget}
        onClose={() => setReportTarget(null)}
        onSubmit={submitReport}
      />

      {/* Access denied fallback for role-gated views */}
      {((view === 'dashboard' && !canViewDashboard) || (view === 'studio' && !canViewStudio) || (view === 'admin' && !canViewAdmin)) && (
        <main className="fade-in max-w-[1440px] mx-auto px-8 py-24 text-center">
          <div className="hair-all bg-[var(--card)] p-16 max-w-[560px] mx-auto">
            <Shield size={32} className="mx-auto text-[var(--muted)]"/>
            <div className="display text-[32px] mt-6">Access restricted.</div>
            <p className="text-[14px] text-[var(--muted)] mt-3 leading-relaxed">
              Your account role ({roleLabel(role)}) doesn't have access to this section.
            </p>
            <button onClick={() => navigateToView('home')} className="swiss-btn mt-8 mx-auto">
              Back to marketplace <ArrowRight size={12}/>
            </button>
          </div>
        </main>
      )}

      <Footer setView={navigateToView}/>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 hair-all px-5 py-3 bg-[var(--ink)] text-[var(--bg)] mono text-[11px] uppercase tracking-[0.12em] fade-in">
          {toast}
        </div>
      )}
    </div>
  );
}
