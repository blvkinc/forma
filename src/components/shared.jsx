// ============================================================
// FORMA — Shared UI components (extracted from App.jsx)
// ============================================================
import React, { useState, useEffect } from 'react';
import {
  Search, Bell, User, ShoppingBag, Heart, ArrowUpRight, ArrowRight,
  Image as ImageIcon, Shield, ChevronDown, Bookmark, LogOut, AlertCircle,
  CheckCheck,
} from 'lucide-react';
import ART_VISUALS from '../data/visuals';
import {
  fmt, formatTime, relativeTime, authenticityMeta,
  roleLabel, roleHomeView, roleHomeLabel,
  isBuyerRole, isSellerRole, isAdminRole,
} from '../lib/ui';
import { artistById } from '../lib/catalogue';

export const Logo = ({ onClick }) => (
  <div onClick={onClick} className="flex items-baseline gap-2 cursor-pointer select-none whitespace-nowrap">
    <span className="display text-[26px] tracking-[-0.05em]">FORMA</span>
    <span className="label">/24</span>
  </div>
);

export const Ticker = () => (
  <div className="ticker-strip hair-b hair-t overflow-hidden py-2">
    <div className="marquee mono text-[11px] uppercase tracking-[0.15em]">
      {[...Array(2)].flatMap((_,j) => [
        <span key={`${j}-1`}>● Live now — Channel_Err_03 by rfm.works — 1H 06M left</span>,
        <span key={`${j}-2`}>○ New commissions open — kestner.studio — 3 slots</span>,
        <span key={`${j}-3`}>● 22 bids placed in the last hour</span>,
        <span key={`${j}-4`}>○ Index 240 active auctions across 6 categories</span>,
        <span key={`${j}-5`}>● Concrete Light, Study II — 1240 USD — Mira Tanaka</span>,
      ])}
    </div>
  </div>
);

export const Header = ({ view, setView, role, notif, query, setQuery, profile, onSignOut, notifications = [], notifLoading = false, onMarkRead, onMarkAllRead, onOpenNotification }) => (
  <header className="hair-b sticky top-0 z-40" style={{ backgroundColor: 'rgba(239, 237, 229, 0.92)', backdropFilter: 'blur(16px)' }}>
    <div className="max-w-[1440px] mx-auto px-8 h-[68px] flex items-center justify-between">
      <div className="flex items-center gap-10">
        <Logo onClick={() => setView('home')}/>
        <nav className="flex items-center gap-6 mono text-[11px] uppercase tracking-[0.12em]">
          <a onClick={() => setView('home')} className={`cursor-pointer underline-hover ${view==='home' ? 'text-[var(--ink)]' : 'text-[var(--muted)]'}`}>Home</a>
          <a onClick={() => setView('explore')} className={`cursor-pointer underline-hover ${view==='explore' ? 'text-[var(--ink)]' : 'text-[var(--muted)]'}`}>Explore</a>
          <a onClick={() => setView('commissions')} className={`cursor-pointer underline-hover ${view==='commissions' ? 'text-[var(--ink)]' : 'text-[var(--muted)]'}`}>Commissions</a>
          <a onClick={() => setView('feed')} className={`cursor-pointer underline-hover ${view==='feed' ? 'text-[var(--ink)]' : 'text-[var(--muted)]'}`}>Feed</a>
          <a onClick={() => setView('artists')} className={`cursor-pointer underline-hover ${view==='artists' ? 'text-[var(--ink)]' : 'text-[var(--muted)]'}`}>Artists</a>
        </nav>
      </div>

      <div className="flex items-center gap-3">
        <div className="hair-all flex items-center gap-2 px-3 py-1.5 w-[280px]">
          <Search size={13} className="text-[var(--muted)]"/>
          <input
            id="global-search"
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              if (e.target.value.trim()) setView('explore');
            }}
            onFocus={() => {
              if (query.trim()) setView('explore');
            }}
            placeholder="Search artists, works, tags…"
            aria-label="Search artists, works, and tags"
            className="bg-transparent outline-none mono text-[11px] flex-1 placeholder:text-[var(--muted)] uppercase tracking-wider"
          />
          <span className="label">⌘K</span>
        </div>
        <NotificationsMenu
          notifications={notifications}
          unreadCount={notif}
          loading={notifLoading}
          onMarkRead={onMarkRead}
          onMarkAllRead={onMarkAllRead}
          onOpen={onOpenNotification}
        />
        <RoleSwitcher role={role} setView={setView}/>
        <UserMenu profile={profile} role={role} setView={setView} onSignOut={onSignOut}/>
      </div>
    </div>
  </header>
);

export const UserMenu = ({ profile, role, setView, onSignOut }) => {
  const [open, setOpen] = useState(false);
  const displayName = profile?.display_name || profile?.email?.split('@')[0] || 'User';
  const email = profile?.email || '';
  const initial = (displayName || email || '?')[0];

  const goTo = (target) => {
    setView(target);
    setOpen(false);
  };

  const signOut = async () => {
    setOpen(false);
    await onSignOut();
  };

  return (
    <div className="user-menu relative">
      <button
        onClick={() => setOpen(value => !value)}
        className="hair-all flex items-center gap-2 px-3 py-1.5 hover:bg-[var(--card)] transition-colors"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <div className="w-6 h-6 bg-[var(--ink)] flex items-center justify-center overflow-hidden">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt={displayName} className="w-full h-full object-cover"/>
          ) : (
            <span className="text-[var(--bg)] mono text-[9px] uppercase">{initial}</span>
          )}
        </div>
        <span className="mono text-[10px] text-[var(--ink)] uppercase tracking-[0.1em] max-w-[92px] truncate">
          {displayName}
        </span>
        <ChevronDown size={12} className={`text-[var(--muted)] transition-transform ${open ? 'rotate-180' : ''}`}/>
      </button>

      {open && (
        <div
          className="user-menu-panel absolute right-0 top-full mt-2 w-[260px] hair-all bg-[var(--card)] z-50 shadow-[0_18px_50px_rgba(14,14,12,0.16)]"
          role="menu"
        >
          <div className="p-4 hair-b">
            <div className="label">Signed in as</div>
            <div className="display text-[22px] leading-none mt-2">{displayName}</div>
            {email && <div className="mono text-[10px] text-[var(--muted)] mt-2 truncate">{email}</div>}
            <div className="mono text-[9px] uppercase tracking-[0.1em] text-[var(--accent)] mt-3">{roleLabel(role)} account</div>
          </div>
          <div className="p-2">
            <a href="#profile" onClick={() => goTo('profile')} className="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-[var(--bg-2)] transition-colors" role="menuitem">
              <span className="flex items-center gap-2 text-[13px]"><User size={14}/> Profile</span>
              <ArrowRight size={12}/>
            </a>
            {isBuyerRole(role) && (
              <a href="#dashboard" onClick={() => goTo('dashboard')} className="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-[var(--bg-2)] transition-colors" role="menuitem">
                <span className="flex items-center gap-2 text-[13px]"><ShoppingBag size={14}/> Buyer dashboard</span>
                <ArrowRight size={12}/>
              </a>
            )}
            {isSellerRole(role) && (
              <a href="#studio" onClick={() => goTo('studio')} className="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-[var(--bg-2)] transition-colors" role="menuitem">
                <span className="flex items-center gap-2 text-[13px]"><ImageIcon size={14}/> Seller studio</span>
                <ArrowRight size={12}/>
              </a>
            )}
            {isAdminRole(role) && (
              <a href="#admin" onClick={() => goTo('admin')} className="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-[var(--bg-2)] transition-colors" role="menuitem">
                <span className="flex items-center gap-2 text-[13px]"><Shield size={14}/> Admin console</span>
                <ArrowRight size={12}/>
              </a>
            )}
          </div>
          <div className="p-2 hair-t">
            <button onClick={signOut} className="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left text-[var(--accent)] hover:bg-[var(--accent-soft)] transition-colors" role="menuitem">
              <span className="flex items-center gap-2 text-[13px]"><LogOut size={14}/> Log out</span>
              <ArrowRight size={12}/>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export const NotificationsMenu = ({ notifications = [], unreadCount = 0, loading = false, onMarkRead, onMarkAllRead, onOpen }) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    const onDocClick = (event) => {
      if (!event.target.closest?.('.notif-menu')) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const handleClick = (notification) => {
    if (!notification.read) onMarkRead?.(notification.id);
    onOpen?.(notification);
    setOpen(false);
  };

  return (
    <div className="notif-menu relative">
      <button
        onClick={() => setOpen(value => !value)}
        className="hair-all p-2 hover:bg-[var(--ink)] hover:text-[var(--bg)] transition-colors relative"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
      >
        <Bell size={14}/>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 bg-[var(--accent)] text-white text-[9px] flex items-center justify-center rounded-full mono">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[340px] hair-all bg-[var(--card)] z-50 shadow-[0_18px_50px_rgba(14,14,12,0.16)]" role="menu">
          <div className="p-4 hair-b flex items-center justify-between gap-3">
            <div>
              <div className="label">Notifications</div>
              <div className="mono text-[10px] text-[var(--muted)] mt-1">
                {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
              </div>
            </div>
            <button
              onClick={() => onMarkAllRead?.()}
              disabled={unreadCount === 0}
              className={`mono text-[10px] uppercase tracking-[0.1em] flex items-center gap-1.5 px-2 py-1 ${unreadCount === 0 ? 'text-[var(--muted)] cursor-not-allowed' : 'hover:text-[var(--accent)]'}`}
            >
              <CheckCheck size={12}/> Mark all
            </button>
          </div>
          <div className="max-h-[420px] overflow-y-auto">
            {loading ? (
              <div className="p-6 mono text-[11px] text-[var(--muted)] text-center">Loading…</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell size={20} className="mx-auto text-[var(--muted)]"/>
                <div className="text-[13px] mt-3">No notifications yet.</div>
                <p className="text-[11px] text-[var(--muted)] mt-1 leading-relaxed">
                  Bid outcomes, commission updates, and delivery alerts land here.
                </p>
              </div>
            ) : (
              notifications.map(notification => (
                <button
                  key={notification.id}
                  onClick={() => handleClick(notification)}
                  className={`w-full text-left px-4 py-3 hair-b last:border-0 flex gap-3 transition-colors hover:bg-[var(--bg-2)] ${notification.read ? '' : 'bg-[var(--accent-soft)]'}`}
                  role="menuitem"
                >
                  <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${notification.read ? 'bg-transparent' : 'bg-[var(--accent)]'}`}/>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[13px] font-medium truncate">{notification.title}</span>
                      <span className="mono text-[9px] text-[var(--muted)] flex-shrink-0">{relativeTime(notification.createdAt)}</span>
                    </div>
                    <p className="text-[12px] text-[var(--ink-2)] mt-1 leading-relaxed">{notification.body}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const RoleSwitcher = ({ role, setView }) => {
  const target = roleHomeView(role);
  const label = roleHomeLabel(role);

  return (
    <div className="hair-all flex items-center divide-x divide-[var(--hair)]">
      <button
        onClick={() => setView(target)}
        className="px-3 py-2 mono text-[10px] uppercase tracking-[0.12em] transition-colors text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--bg-2)]"
      >
        {label}
      </button>
    </div>
  );
};

export const ArtVisual = ({ visual, imageUrl = '', alt = 'Artwork preview', className = '' }) => (
  <div className={`relative overflow-hidden ${className}`} style={{ aspectRatio: '1/1' }}>
    {imageUrl ? (
      <img
        src={imageUrl}
        alt={alt}
        className="absolute inset-0 w-full h-full object-cover"
        loading="lazy"
      />
    ) : (
      ART_VISUALS[visual]
    )}
  </div>
);

export const ArtCard = ({ work, onClick, likes, toggleLike, watchlist = {}, toggleWatch = null, layout = 'grid' }) => {
  const artist = artistById(work.artist);
  const isHot = work.endsAt < 1000*60*60*3;
  const liked = likes[work.id];
  const watched = watchlist[work.id];
  const authenticity = authenticityMeta(work.authenticityStatus);
  const showAuthenticity = work.authenticityStatus && work.authenticityStatus !== 'clear';
  const [timeLeft, setTimeLeft] = useState(work.endsAt);
  useEffect(() => {
    const i = setInterval(() => setTimeLeft(t => Math.max(0, t - 1000)), 1000);
    return () => clearInterval(i);
  }, []);

  if (layout === 'row') {
    return (
      <div onClick={onClick} className="art-card cursor-pointer group flex items-center hair-b py-5 gap-6">
        <div className="w-[120px] flex-shrink-0 hair-all">
          <ArtVisual visual={work.visual} imageUrl={work.imageUrl} alt={work.title}/>
        </div>
        <div className="flex-1 grid grid-cols-12 gap-4 items-center">
          <div className="col-span-4">
            <div className="display text-[20px]">{work.title}</div>
            {showAuthenticity && (
              <div className="mono text-[9px] text-[var(--accent)] uppercase tracking-[0.12em] mt-1">{authenticity.label}</div>
            )}
            <div className="mono text-[11px] text-[var(--muted)] mt-1">{artist.handle} · {work.year}</div>
          </div>
          <div className="col-span-2 label">{work.edition}</div>
          <div className="col-span-2">
            <div className="label">Current Bid</div>
            <div className="mono font-medium">${fmt(work.currentBid)}</div>
          </div>
          <div className="col-span-2">
            <div className="label">Ends In</div>
            <div className={`mono ${isHot ? 'text-[var(--accent)]' : ''}`}>{formatTime(timeLeft)}</div>
          </div>
          <div className="col-span-2 flex justify-end gap-2">
            {toggleWatch && (
              <button
                onClick={(e)=>{e.stopPropagation(); toggleWatch(work.id);}}
                aria-label={watched ? `Remove ${work.title} from watchlist` : `Add ${work.title} to watchlist`}
                title={watched ? 'Remove from watchlist' : 'Add to watchlist'}
                className={`hair-all p-2 transition-colors ${watched ? 'bg-[var(--ink)] text-[var(--bg)]' : 'hover:bg-[var(--ink)] hover:text-[var(--bg)]'}`}
              >
                <Bookmark size={13} fill={watched ? 'currentColor' : 'none'}/>
              </button>
            )}
            <ArrowUpRight size={20} className="art-arrow"/>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div onClick={onClick} className="art-card cursor-pointer group">
      <div className="hair-all relative overflow-hidden">
        <ArtVisual visual={work.visual} imageUrl={work.imageUrl} alt={work.title}/>
        {isHot && (
          <div className="absolute top-2 left-2 bg-[var(--accent)] text-white px-2 py-0.5 mono text-[9px] tracking-[0.15em]">
            <span className="blink inline-block w-1.5 h-1.5 bg-white rounded-full mr-1.5 align-middle"/>
            ENDING SOON
          </div>
        )}
        {showAuthenticity && (
          <div className={`absolute bottom-2 left-2 px-2 py-0.5 mono text-[9px] tracking-[0.12em] ${work.authenticityStatus === 'restricted' ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg)] hair-all text-[var(--ink)]'}`}>
            {authenticity.label}
          </div>
        )}
        <button
          onClick={(e)=>{e.stopPropagation(); toggleLike(work.id);}}
          aria-label={liked ? `Unlike ${work.title}` : `Like ${work.title}`}
          title={liked ? 'Unlike' : 'Like'}
          className="absolute top-2 right-2 w-7 h-7 bg-[var(--bg)] hair-all flex items-center justify-center hover:bg-[var(--ink)] hover:text-[var(--bg)] transition-colors"
        >
          <Heart size={12} fill={liked ? 'currentColor' : 'none'}/>
        </button>
        {toggleWatch && (
          <button
            onClick={(e)=>{e.stopPropagation(); toggleWatch(work.id);}}
            aria-label={watched ? `Remove ${work.title} from watchlist` : `Add ${work.title} to watchlist`}
            title={watched ? 'Remove from watchlist' : 'Add to watchlist'}
            className={`absolute top-10 right-2 w-7 h-7 bg-[var(--bg)] hair-all flex items-center justify-center transition-colors ${watched ? 'text-[var(--accent)]' : 'hover:bg-[var(--ink)] hover:text-[var(--bg)]'}`}
          >
            <Bookmark size={12} fill={watched ? 'currentColor' : 'none'}/>
          </button>
        )}
        <div className="absolute bottom-2 right-2 bg-[var(--bg)] hair-all px-2 py-0.5">
          <ArrowUpRight size={14} className="art-arrow"/>
        </div>
      </div>
      <div className="pt-3 pb-1">
        <div className="flex justify-between items-baseline">
          <div className="display text-[18px] leading-tight">{work.title}</div>
          <span className="label">{work.edition}</span>
        </div>
        <div className="flex justify-between items-baseline mt-1">
          <div className="mono text-[11px] text-[var(--muted)]">{artist.handle}</div>
          <div className="mono text-[11px]">${fmt(work.currentBid)}</div>
        </div>
        <div className="flex justify-between items-center mt-3 pt-2 hair-t">
          <div className="flex items-center gap-3 label">
            <span>{work.bids} BIDS</span>
            <span>·</span>
            <span>{work.watchers} WATCHING</span>
          </div>
          <div className={`mono text-[11px] ${isHot ? 'text-[var(--accent)]' : 'text-[var(--muted)]'}`}>{formatTime(timeLeft)}</div>
        </div>
      </div>
    </div>
  );
};

export const Footer = ({ setView }) => {
  const go = (target) => () => setView?.(target);
  const navItem = (label, target) => (
    <button key={label} onClick={go(target)} className="block underline-hover cursor-pointer text-left">{label}</button>
  );

  return (
  <footer className="footer-panel hair-t mt-32 py-16">
    <div className="max-w-[1440px] mx-auto px-8">
      <div className="grid grid-cols-12 gap-8">
        <div className="col-span-5">
          <div className="display text-[64px] leading-[0.9]">A market<br/>for digital<br/>artefacts.</div>
        </div>
        <div className="col-span-2"></div>
        <div className="col-span-2">
          <div className="label" style={{color:'#9C988A'}}>Browse</div>
          <div className="mt-3 space-y-1.5 text-[14px]">
            {navItem('Market', 'explore')}
            {navItem('Commissions', 'commissions')}
            {navItem('Artists', 'artists')}
            {navItem('Feed', 'feed')}
          </div>
        </div>
        <div className="col-span-2">
          <div className="label" style={{color:'#9C988A'}}>Platform</div>
          <div className="mt-3 space-y-1.5 text-[14px]">
            {navItem('Open shop', 'studio')}
            {navItem('Fees & payouts', 'studio')}
            {navItem('Trust & safety', 'trust')}
            {navItem('API', 'api')}
          </div>
        </div>
        <div className="col-span-1">
          <div className="label" style={{color:'#9C988A'}}>Legal</div>
          <div className="mt-3 space-y-1.5 text-[14px]">
            {navItem('Terms', 'terms')}
            {navItem('Privacy', 'privacy')}
          </div>
        </div>
      </div>
      <div className="mt-16 pt-6 hair-t flex justify-between items-end mono text-[11px] uppercase tracking-[0.12em]" style={{borderColor:'#2A2A26'}}>
        <div>FORMA — Index 24/26 — Made in five cities</div>
        <div>© 2026 — All rights to the artists.</div>
      </div>
    </div>
  </footer>
  );
};

export const CatalogueLoadingState = () => (
  <main className="fade-in max-w-[1440px] mx-auto px-8 py-24 text-center">
    <div className="hair-all bg-[var(--card)] p-12 max-w-[520px] mx-auto">
      <div className="display text-[28px]">Loading catalogue.</div>
      <div className="mt-5 flex justify-center">
        <div className="w-5 h-5 border-2 border-[var(--ink)] border-t-transparent rounded-full animate-spin"/>
      </div>
      <p className="text-[14px] text-[var(--muted)] mt-5 leading-relaxed">
        Your account is signed in. FORMA is loading marketplace data from Supabase.
      </p>
    </div>
  </main>
);

export const CatalogueErrorState = ({ error }) => (
  <main className="fade-in max-w-[1440px] mx-auto px-8 py-24 text-center">
    <div className="hair-all bg-[var(--card)] p-12 max-w-[560px] mx-auto">
      <AlertCircle size={28} className="mx-auto text-[var(--accent)]"/>
      <div className="display text-[28px] mt-5">Catalogue did not load.</div>
      <p className="text-[14px] text-[var(--muted)] mt-4 leading-relaxed">
        {error}
      </p>
      <p className="text-[12px] text-[var(--muted)] mt-4">
        Your account session is still active. You can open Profile from the menu or retry the catalogue.
      </p>
      <button onClick={() => window.location.reload()} className="swiss-btn mt-6 mx-auto">
        Retry <ArrowRight size={12}/>
      </button>
    </div>
  </main>
);
