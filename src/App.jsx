import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Shield, ArrowRight } from 'lucide-react';
import { useAuth } from './contexts/AuthContext';
import AuthPage from './pages/AuthPage';
import SetNewPassword from './pages/SetNewPassword';
import { useMarketplace } from './hooks/useMarketplace';
import { useCommissions } from './hooks/useCommissions';
import { useTrustSafety } from './hooks/useTrustSafety';
import { useNotifications } from './hooks/useNotifications';
import { createSellerArtist, createSellerArtwork, createSellerCommission, createSellerFeedPost, deleteSellerFeedPost, updateSellerFeedPost, uploadArtworkImage } from './lib/seller';
import { fmt, roleLabel, isBuyerRole, isSellerRole, isAdminRole, APP_VIEWS, viewFromHash } from './lib/ui';
import { setCatalogue, artworkById, artistById } from './lib/catalogue';

import { GlobalStyles } from './components/GlobalStyles';
import { Header, Footer, CatalogueLoadingState, CatalogueErrorState } from './components/shared';
import { CommissionBookingModal, CommissionThreadModal } from './features/commissions';
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
  const marketplace = useMarketplace();
  const ownedArtist = marketplace.artists.find(artist => artist.profileId === user?.id) || null;
  const commissionState = useCommissions(ownedArtist?.id || null);
  const trustState = useTrustSafety();
  const [view, setView] = useState(() => viewFromHash());
  const [selectedArtwork, setSelectedArtwork] = useState(null);
  const [selectedArtist, setSelectedArtist] = useState(null);
  const [bookingCommission, setBookingCommission] = useState(null);
  const [threadBooking, setThreadBooking] = useState(null);
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

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const root = document.querySelector('.swiss-app');
    if (!root) return undefined;
    root.classList.add('reveal-ready');

    const selector = [
      'main h1.display',
      'main h2.display',
      'main h3.display',
      'main p',
      '.motion-copy',
      '.motion-stat',
      '[data-reveal]',
      '.art-card',
    ].join(',');

    const canObserve = 'IntersectionObserver' in window;
    const observedNodes = new WeakSet();
    let scanTimer = 0;
    let observer;

    const revealNode = (node) => {
      node.classList.add('revealed');
      observer?.unobserve(node);
    };

    const isInRevealRange = (node) => {
      const rect = node.getBoundingClientRect();
      return rect.top < window.innerHeight * 0.92 && rect.bottom > 0;
    };

    const scanVisibleNodes = () => {
      scanTimer = 0;
      root.querySelectorAll('.motion-reveal:not(.revealed)').forEach((node) => {
        if (isInRevealRange(node)) revealNode(node);
      });
    };

    const scheduleVisibleScan = () => {
      if (scanTimer) return;
      scanTimer = window.setTimeout(scanVisibleNodes, 40);
    };

    observer = canObserve ? new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        revealNode(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }) : null;

    const prepareNodes = () => {
      const nodes = Array.from(root.querySelectorAll(selector))
        .filter(node => !node.closest('header, footer'));

      nodes.forEach((node, index) => {
        if (!node.classList.contains('motion-reveal')) {
          node.classList.add('motion-reveal');
          node.style.setProperty('--reveal-delay', `${Math.min(index % 6, 5) * 70}ms`);
        }
        if (!canObserve) {
          revealNode(node);
          return;
        }
        if (!node.classList.contains('revealed') && !observedNodes.has(node)) {
          observedNodes.add(node);
          observer.observe(node);
        }
      });
      scheduleVisibleScan();
    };

    prepareNodes();
    const mutationObserver = new MutationObserver(() => prepareNodes());
    mutationObserver.observe(root, { childList: true, subtree: true });
    window.addEventListener('scroll', scheduleVisibleScan, { passive: true });
    window.addEventListener('resize', scheduleVisibleScan);

    return () => {
      if (scanTimer) window.clearTimeout(scanTimer);
      window.removeEventListener('scroll', scheduleVisibleScan);
      window.removeEventListener('resize', scheduleVisibleScan);
      mutationObserver.disconnect();
      observer?.disconnect();
    };
  }, [view, marketplace.artworks.length, marketplace.feedPosts.length, marketplace.commissions.length]);

  const goToArtwork = (id) => { setSelectedArtwork(id); navigateToView('artwork'); };
  const goToArtist = (id) => { setSelectedArtist(id); navigateToView('artist'); };

  const showToast = (message, delay = 2400) => {
    setToast(message);
    setTimeout(() => setToast(null), delay);
  };

  const requireBuyerAccount = () => {
    if (isBuyerRole(role)) return true;
    showToast('Use a buyer account for collecting actions.');
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
    if (!requireBuyerAccount()) return;
    await marketplace.toggleLike(id);
  };

  const toggleWatch = async (id) => {
    if (!requireBuyerAccount()) return;
    const work = artworkById(id);
    const isNowWatching = await marketplace.toggleWatch(id);
    showToast(isNowWatching ? `Watching ${work.title}` : `Removed ${work.title} from watchlist`);
  };

  const toggleFollow = async (id) => {
    if (!requireBuyerAccount()) return;
    const isNowFollowing = await marketplace.toggleFollow(id);
    showToast(isNowFollowing ? `Following ${artistById(id).name}` : `Unfollowed ${artistById(id).name}`);
  };

  const togglePostLike = async (id) => {
    if (!isAuthenticated) {
      showToast('Sign in to like feed posts.');
      return false;
    }
    return marketplace.togglePostLike(id);
  };

  const toggleSavedPost = async (id) => {
    if (!isAuthenticated) {
      showToast('Sign in to save feed posts.');
      return false;
    }
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
    setBookingCommission(commission);
  };

  const confirmCommissionBooking = async (briefText) => {
    if (!bookingCommission) return;
    const result = await commissionState.bookCommission(bookingCommission, briefText);
    if (result?.error) {
      showToast(result.error, 3000);
      return;
    }
    setBookingCommission(null);
    showToast('Commission slot booked.');
    await marketplace.refreshCommissions();
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
          {view === 'artwork' && selectedArtwork && <ArtworkView workId={selectedArtwork} goToArtwork={goToArtwork} goToArtist={goToArtist} likes={likes} toggleLike={toggleLike} bids={bids} placeBid={placeBid} purchases={marketplace.purchases} recordPurchase={marketplace.recordArtworkPurchase} loadBidsForArtwork={marketplace.loadBidsForArtwork} onReport={openReport} user={user} role={role} refreshCatalogue={marketplace.refreshCatalogue}/>}
          {view === 'artist' && selectedArtist && <ArtistView artistId={selectedArtist} goToArtwork={goToArtwork} follows={follows} toggleFollow={toggleFollow} likes={likes} toggleLike={toggleLike} onReport={openReport}/>}
          {view === 'commissions' && <CommissionsView goToArtist={goToArtist} role={role} onBookCommission={openCommissionBooking}/>}
          {view === 'feed' && <FeedView goToArtwork={goToArtwork} goToArtist={goToArtist} follows={follows} toggleFollow={toggleFollow} canPost={isSellerRole(role) && profile?.verified === true && !!ownedArtist} onPost={handleCreateFeedPost} user={user} ownedArtist={ownedArtist} feedPosts={marketplace.feedPosts} artists={marketplace.artists} artworks={marketplace.artworks} postLikes={postLikes} togglePostLike={togglePostLike} savedPosts={savedPosts} toggleSavedPost={toggleSavedPost} onDeletePost={handleDeleteFeedPost} onEditPost={handleEditFeedPost} onRefresh={marketplace.refreshCatalogue} onReport={openReport}/>}
          {view === 'artists' && <ArtistsView goToArtist={goToArtist} follows={follows} toggleFollow={toggleFollow}/>}
          {view === 'profile' && <ProfileView user={user} profile={profile} role={role} updateProfile={updateProfile} marketplace={marketplace} setView={navigateToView}/>}
          {view === 'dashboard' && canViewDashboard && <BuyerDashboard goToArtwork={goToArtwork} likes={likes} toggleLike={toggleLike} userBids={userBids} purchases={marketplace.purchases} auctionSettlements={marketplace.auctionSettlements} artworks={marketplace.artworks} watchlist={watchlist} toggleWatch={toggleWatch} profile={profile} commissionState={commissionState} onOpenCommissionThread={openCommissionThread} setView={navigateToView}/>}
          {view === 'studio' && canViewStudio && <StudioDashboard goToArtwork={goToArtwork} likes={likes} toggleLike={toggleLike} profile={profile} ownedArtist={ownedArtist} commissionState={commissionState} onOpenCommissionThread={openCommissionThread} onSubmitStudio={handleCreateSellerArtist} onSubmitArtwork={handleCreateSellerArtwork} onUploadArtworkImage={uploadArtworkImage} onSubmitCommission={handleCreateSellerCommission}/>}
          {view === 'admin' && canViewAdmin && <AdminDashboard goToArtist={goToArtist} goToArtwork={goToArtwork} trustState={trustState} profile={profile} user={user}/>}
          {(view === 'terms' || view === 'privacy' || view === 'trust' || view === 'api') && <InfoView page={view} goBack={() => navigateToView('home')}/>}
        </Suspense>
      )}

      <CommissionBookingModal
        commission={bookingCommission}
        role={role}
        onClose={() => setBookingCommission(null)}
        onConfirm={confirmCommissionBooking}
        getPriceBreakdown={commissionState.getPriceBreakdown}
      />
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
