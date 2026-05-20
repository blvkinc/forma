// ============================================================
// FORMA — Artist profile / shop
// ============================================================
import React, { useState } from 'react';
import { ArrowLeft, ArrowUpRight, Check, Plus, Flag } from 'lucide-react';
import { ArtCard } from '../components/shared';
import { CommissionCard } from '../features/commissions';
import { fmt } from '../lib/ui';
import { ARTWORKS, COMMISSIONS, artistById } from '../lib/catalogue';

export const ArtistView = ({ artistId, goToArtwork, follows, toggleFollow, likes, toggleLike, onReport }) => {
  const artist = artistById(artistId);
  const works = ARTWORKS.filter(w => w.artist === artistId);
  const liveWorks = works.filter(w => w.endsAt > 0);
  const closedWorks = works.filter(w => w.endsAt <= 0);
  const commissions = COMMISSIONS.filter(c => c.artist === artistId);
  const liveValue = liveWorks.reduce((sum, w) => sum + Number(w.currentBid || 0), 0);
  const [tab, setTab] = useState('works');
  const isFollowing = follows[artistId];
  const followerCount = Number(artist.followers || 0);

  return (
    <main className="fade-in max-w-[1440px] mx-auto px-8 py-10">
      <button onClick={() => window.history.back()} className="mono text-[11px] uppercase tracking-[0.12em] flex items-center gap-2 underline-hover mb-8">
        <ArrowLeft size={12}/> Back
      </button>

      {/* HEADER */}
      <div className="grid grid-cols-12 gap-10 hair-b pb-12">
        <div className="col-span-3">
          <div className="aspect-square hair-all relative" style={{background: artist.accent}}>
            <div className="absolute bottom-3 left-3 right-3 flex justify-between mono text-[10px] uppercase tracking-[0.12em] text-white mix-blend-difference">
              <span>{artist.handle}</span>
              <span>{artist.city}</span>
            </div>
          </div>
        </div>
        <div className="col-span-6">
          <div className="label mb-4">№ STUDIO — {artist.handle}</div>
          <h1 className="display text-[88px] leading-[0.88] tracking-[-0.045em]">
            {artist.name}
            {artist.verified && <span className="text-[var(--accent)] ml-3" style={{fontSize:'40px'}}>●</span>}
          </h1>
          <p className="mt-6 text-[18px] max-w-[520px] leading-relaxed text-[var(--ink-2)]">{artist.bio}</p>
          <div className="mt-8 grid grid-cols-4 gap-6">
            <div className="hair-t pt-3">
              <div className="label">Followers</div>
              <div className="mono text-[24px] mt-1">{fmt(followerCount)}</div>
            </div>
            <div className="hair-t pt-3">
              <div className="label">Works</div>
              <div className="mono text-[24px] mt-1">{works.length}</div>
            </div>
            <div className="hair-t pt-3">
              <div className="label">Live value</div>
              <div className="mono text-[24px] mt-1">${fmt(liveValue)}</div>
            </div>
            <div className="hair-t pt-3">
              <div className="label">Joined</div>
              <div className="mono text-[24px] mt-1">{artist.joined}</div>
            </div>
          </div>
        </div>
        <div className="col-span-3 flex flex-col gap-3 justify-end">
          <button onClick={() => toggleFollow(artistId)} className={`swiss-btn ${isFollowing ? 'ghost' : ''} justify-center`}>
            {isFollowing ? <><Check size={12}/> Following</> : <><Plus size={12}/> Follow</>}
          </button>
          <button onClick={() => setTab('commissions')} className="swiss-btn ghost justify-center"><Plus size={12}/> Commission this studio</button>
          <button onClick={() => onReport({ type: 'artist', id: artist.id, label: artist.name })} className="swiss-btn ghost justify-center"><Flag size={12}/> Report</button>
          <div className="hair-all p-4 mt-2">
            <div className="label">Office hours</div>
            <div className="mono text-[12px] mt-2">MON-THU · 09:00-15:00 CET</div>
            <div className="text-[11px] text-[var(--muted)] mt-1">Studio in {artist.city}. Sends rolled.</div>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="flex gap-2 mt-10 mb-8">
        {[
          {k:'works', l:`Works · ${works.length}`},
          {k:'commissions', l:`Commissions · ${commissions.length}`},
          {k:'sold', l:`Archive · ${closedWorks.length}`},
          {k:'about', l:'About'},
        ].map(t => (
          <button key={t.k} onClick={() => setTab(t.k)} className={`tab-pill ${tab===t.k ? 'active' : ''}`}>{t.l}</button>
        ))}
      </div>

      {tab === 'works' && (
        <div className="grid grid-cols-3 gap-8">
          {works.map(w => (
            <ArtCard key={w.id} work={w} onClick={() => goToArtwork(w.id)} likes={likes} toggleLike={toggleLike}/>
          ))}
        </div>
      )}

      {tab === 'commissions' && (
        <div className="grid grid-cols-2 gap-6">
          {commissions.map(c => (
            <CommissionCard key={c.id} commission={c}/>
          ))}
          {commissions.length === 0 && (
            <div className="hair-all p-12 text-center col-span-2">
              <div className="display text-[28px]">No open commissions</div>
              <div className="mono text-[11px] text-[var(--muted)] uppercase tracking-wider mt-2">Follow to be notified when slots open</div>
            </div>
          )}
        </div>
      )}

      {tab === 'sold' && (
        closedWorks.length ? (
          <div>
            <div className="grid grid-cols-12 gap-4 label hair-b pb-3">
              <div className="col-span-1">№</div>
              <div className="col-span-5">Title</div>
              <div className="col-span-2">Edition</div>
              <div className="col-span-3 text-right">Final bid</div>
              <div className="col-span-1 text-right">View</div>
            </div>
            {closedWorks.map((w, i) => (
              <div key={w.id} onClick={() => goToArtwork(w.id)} className="grid grid-cols-12 gap-4 py-3 hair-b items-center text-[13px] hover:bg-[var(--card)] cursor-pointer">
                <div className="col-span-1 mono text-[11px] text-[var(--muted)]">{String(i+1).padStart(3,'0')}</div>
                <div className="col-span-5 display text-[18px]">{w.title}</div>
                <div className="col-span-2 mono text-[11px]">{w.edition}</div>
                <div className="col-span-3 mono text-right">${fmt(w.currentBid)}</div>
                <div className="col-span-1 text-right"><ArrowUpRight size={14} className="inline"/></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="hair-all p-12 text-center bg-[var(--card)]">
            <div className="display text-[28px]">No closed auctions</div>
            <div className="mono text-[11px] text-[var(--muted)] uppercase tracking-wider mt-2">Ended auctions for this studio will be archived here</div>
          </div>
        )
      )}

      {tab === 'about' && (
        <div className="grid grid-cols-12 gap-10">
          <div className="col-span-7">
            <div className="label mb-4">Statement</div>
            <p className="text-[18px] leading-relaxed">{artist.bio}</p>
          </div>
          <div className="col-span-5">
            <div className="hair-all p-6 bg-[var(--card)]">
              <div className="label">Studio</div>
              <div className="mt-4 grid grid-cols-2 gap-y-3 text-[13px]">
                <span className="text-[var(--muted)]">Handle</span><span>{artist.handle}</span>
                <span className="text-[var(--muted)]">Based in</span><span>{artist.city}</span>
                <span className="text-[var(--muted)]">Active since</span><span>{artist.joined}</span>
                <span className="text-[var(--muted)]">Followers</span><span>{fmt(followerCount)}</span>
                <span className="text-[var(--muted)]">Live works</span><span>{liveWorks.length}</span>
                <span className="text-[var(--muted)]">Verified</span><span>{artist.verified ? 'Yes' : 'Not yet'}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};
