// ============================================================
// FORMA — Home (landing / featured)
// ============================================================
import React from 'react';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { ArtCard, ArtVisual, Ticker } from '../components/shared';
import { fmt, formatTime } from '../lib/ui';
import { ARTWORKS, ARTISTS, COMMISSIONS, artistById } from '../lib/catalogue';

export const HomeView = ({ goToArtwork, goToArtist, likes, toggleLike, watchlist, toggleWatch, goExplore, goStudio }) => {
  const liveWorks = [...ARTWORKS].filter(w => w.endsAt > 0).sort((a, b) => a.endsAt - b.endsAt);
  // Featured = the highest-value live auction; fall back to the first work.
  const featured = [...ARTWORKS].sort((a, b) => b.currentBid - a.currentBid)[0] || ARTWORKS[0];
  const featuredArtist = featured ? artistById(featured.artist) : null;
  const openCommissionSlots = COMMISSIONS.reduce((s, c) => s + Math.max(0, c.slots - c.taken), 0);
  const liveVolume = ARTWORKS.reduce((s, w) => s + Number(w.currentBid || 0), 0);
  const upcomingDrops = (liveWorks.length ? liveWorks : ARTWORKS).slice(0, 3);
  return (
    <main className="fade-in">
      {/* HERO */}
      <section className="max-w-[1440px] mx-auto px-8 pt-12 pb-16">
        <div className="grid grid-cols-12 gap-8 items-end">
          <div className="col-span-8">
            <div className="label mb-6 flex items-center gap-3">
              <span>№ 01 — Index</span>
              <span className="w-8 hair-t"/>
              <span>Friday, 15 May 2026 — 14:08 CET</span>
            </div>
            <h1 className="display text-[120px] leading-[0.88] tracking-[-0.045em]">
              A market for<br/>
              <span className="italic" style={{fontFamily:'Bricolage Grotesque'}}>digital</span> artefacts —<br/>
              made, sold,<br className="mobile-only"/> signed.
            </h1>
            <p className="mt-8 text-[16px] max-w-[520px] text-[var(--ink-2)] leading-relaxed">
              Auctions and commissions, run by artists, watched by a quiet crowd. No collections, no royalties theatre — just files, prices, deadlines.
            </p>
          </div>
          <div className="col-span-4">
            <div className="hair-all p-6 bg-[var(--card)]">
              <div className="label mb-4">This week</div>
              <div className="space-y-4">
                <div className="flex justify-between items-baseline pb-3 hair-b">
                  <div className="text-[13px]">Live auctions</div>
                  <div className="mono text-[20px]">{liveWorks.length}</div>
                </div>
                <div className="flex justify-between items-baseline pb-3 hair-b">
                  <div className="text-[13px]">Open commission slots</div>
                  <div className="mono text-[20px]">{openCommissionSlots}</div>
                </div>
                <div className="flex justify-between items-baseline pb-3 hair-b">
                  <div className="text-[13px]">Studios in residence</div>
                  <div className="mono text-[20px]">{ARTISTS.length}</div>
                </div>
                <div className="flex justify-between items-baseline">
                  <div className="text-[13px]">Live bid volume</div>
                  <div className="mono text-[20px]">${fmt(liveVolume)}</div>
                </div>
              </div>
              <button onClick={goExplore} className="swiss-btn mt-6 w-full justify-center">
                Browse the index <ArrowRight size={12}/>
              </button>
            </div>
          </div>
        </div>
      </section>

      <Ticker/>

      {/* FEATURED */}
      <section className="max-w-[1440px] mx-auto px-8 py-16">
        <div className="flex items-baseline justify-between mb-8 hair-b pb-4">
          <div className="flex items-baseline gap-4">
            <span className="label">№ 02 — Featured</span>
            <h2 className="display text-[42px]">Editor's pick, this week</h2>
          </div>
          <button onClick={goExplore} className="mono text-[11px] uppercase tracking-[0.12em] underline-hover cursor-pointer">View all selections</button>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {featured && (
            <div onClick={() => goToArtwork(featured.id)} className="col-span-7 art-card cursor-pointer group">
              <div className="hair-all relative">
                <ArtVisual visual={featured.visual} imageUrl={featured.imageUrl} alt={featured.title}/>
                {featured.endsAt > 0 && (
                  <div className="absolute top-3 left-3 bg-[var(--accent)] text-white px-2 py-1 mono text-[9px] tracking-[0.15em]">
                    <span className="blink inline-block w-1.5 h-1.5 bg-white rounded-full mr-1.5 align-middle"/>
                    LIVE — {formatTime(featured.endsAt)}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-6 mt-5">
                <div>
                  <div className="display text-[36px] leading-[0.95]">{featured.title}</div>
                  <div className="mono text-[12px] mt-2 text-[var(--muted)]">
                    {featuredArtist?.handle} · {featuredArtist?.city} · {featured.year} · {featured.edition}
                  </div>
                </div>
                <div className="text-right">
                  <div className="label">Current bid</div>
                  <div className="mono text-[36px] leading-none mt-1">${fmt(featured.currentBid)}</div>
                  <div className="label mt-2">{featured.bids} bids · {featured.watchers} watching</div>
                </div>
              </div>
            </div>
          )}
          <div className="col-span-5 space-y-6">
            {[...ARTWORKS].sort((a,b) => b.currentBid - a.currentBid).slice(1, 3).map(w => (
              <ArtCard key={w.id} work={w} onClick={() => goToArtwork(w.id)} likes={likes} toggleLike={toggleLike} watchlist={watchlist} toggleWatch={toggleWatch} layout="row"/>
            ))}
            <div className="hair-all p-5 bg-[var(--card)]">
              <div className="label">Closing soon</div>
              <div className="mt-3 space-y-2">
                {upcomingDrops.map(w => {
                  const a = artistById(w.artist);
                  return (
                    <button key={w.id} onClick={() => goToArtwork(w.id)} className="w-full flex justify-between text-[13px] text-left hover:bg-[var(--bg-2)] py-1 -mx-1 px-1 transition-colors">
                      <span className="mono text-[11px] text-[var(--accent)] tracking-wider">{w.endsAt > 0 ? formatTime(w.endsAt) : 'CLOSED'}</span>
                      <div className="text-right">
                        <div>{w.title}</div>
                        <div className="mono text-[11px] text-[var(--muted)]">{a?.handle}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PLATFORM TRUST */}
      <section className="max-w-[1440px] mx-auto px-8 py-16">
        <div className="hair-b pb-4 mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <div className="label mb-2">No. 03 - Platform layer</div>
            <h2 className="display text-[42px] md:text-[52px] leading-tight">Browse deeper in Explore.</h2>
          </div>
          <button onClick={goExplore} className="swiss-btn accent md:self-end">
            Open Explore <ArrowRight size={12}/>
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            ['Search lives off the landing page', 'The Explore index handles title, artist, tag, price, edition, and authenticity filters.'],
            ['Community AI review', 'Buyers and sellers can vote when a listing looks AI-generated or lacks convincing process history.'],
            ['Artist proof restores trust', 'Sellers can submit process notes and proof links so questioned listings can return with visible context.'],
          ].map(([title, body], index) => (
            <div key={title} className="hair-all bg-[var(--card)] p-6">
              <div className="mono text-[11px] text-[var(--accent)]">0{index + 1}</div>
              <div className="display text-[24px] mt-4">{title}</div>
              <p className="text-[14px] text-[var(--muted)] mt-3 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURED ARTISTS */}
      <section className="max-w-[1440px] mx-auto px-8 py-16">
        <div className="hair-b pb-4 mb-8 flex items-baseline justify-between">
          <div className="flex items-baseline gap-4">
            <span className="label">№ 04 — Studios</span>
            <h2 className="display text-[42px]">Shops in residence</h2>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-6">
          {ARTISTS.slice(0,6).map(a => (
            <div key={a.id} onClick={() => goToArtist(a.id)} className="hair-all p-6 cursor-pointer hover:bg-[var(--card)] transition-colors group">
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 hair-all" style={{background:a.accent}}/>
                <ArrowUpRight size={16} className="art-arrow text-[var(--muted)] group-hover:text-[var(--ink)]"/>
              </div>
              <div className="mt-6">
                <div className="display text-[22px]">{a.name}{a.verified && <span className="text-[var(--accent)] ml-1.5">●</span>}</div>
                <div className="mono text-[11px] text-[var(--muted)] mt-1">{a.handle} · {a.city}</div>
              </div>
              <p className="text-[13px] text-[var(--ink-2)] mt-4 leading-relaxed">{a.bio}</p>
              <div className="mt-5 pt-4 hair-t flex justify-between label">
                <span>Joined {a.joined}</span>
                <span>{fmt(a.followers)} followers</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA — Open shop */}
      <section className="max-w-[1440px] mx-auto px-8 py-24">
        <div className="hair-all p-16 bg-[var(--card)] relative overflow-hidden">
          <div className="grid grid-cols-12 gap-8 relative z-10">
            <div className="col-span-7">
              <div className="label mb-6">№ 05 — For artists</div>
              <h2 className="display text-[72px] leading-[0.9]">
                Open a shop.<br/>
                Sell to the<br/>
                <span style={{color:'var(--accent)'}}>highest bidder.</span>
              </h2>
              <p className="text-[16px] mt-6 max-w-[480px] text-[var(--ink-2)] leading-relaxed">
                Auctions, prepaid commission slots, follower feed, one-page payouts. Take 12%. We take the rest.
              </p>
              <div className="flex gap-3 mt-8">
                <button onClick={goStudio} className="swiss-btn">Open shop <ArrowRight size={12}/></button>
                <button onClick={goStudio} className="swiss-btn ghost">Read the fee sheet</button>
              </div>
            </div>
            <div className="col-span-5 space-y-3">
              {[
                {n:'01',k:'Auctions',v:'5-day max. Anti-snipe extension built in.'},
                {n:'02',k:'Commissions',v:'Prepaid slots. Escrowed until delivery.'},
                {n:'03',k:'Payouts',v:'Weekly. Bank, USDC, or pause.'},
                {n:'04',k:'Audience',v:'Followers see drops first, by 6 hours.'},
              ].map(row => (
                <div key={row.n} className="hair-b pb-3 flex gap-6 items-baseline">
                  <span className="mono text-[var(--accent)] text-[14px]">{row.n}</span>
                  <div className="flex-1">
                    <div className="display text-[18px]">{row.k}</div>
                    <div className="text-[13px] text-[var(--muted)] mt-1">{row.v}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};
