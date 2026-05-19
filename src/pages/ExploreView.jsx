// ============================================================
// FORMA — Explore (live marketplace index)
// ============================================================
import React, { useState } from 'react';
import { Grid3x3, Rows3 } from 'lucide-react';
import { ArtCard } from '../components/shared';
import { normalizeText, PRICE_BANDS, fmt } from '../lib/ui';
import { ARTWORKS, COMMISSIONS, FEED_POSTS, artistById, getTagOptions } from '../lib/catalogue';

export const ExploreView = ({ goToArtwork, goToArtist, goFeed, likes, toggleLike, watchlist, toggleWatch, query }) => {
  const [sort, setSort] = useState('ending');
  const [tag, setTag] = useState('all');
  const [edition, setEdition] = useState('all');
  const [priceBand, setPriceBand] = useState('all');
  const [authFilter, setAuthFilter] = useState('all');
  const [layout, setLayout] = useState('grid');
  const searchTerm = normalizeText(query);
  const priceFilter = PRICE_BANDS.find(b => b.id === priceBand) || PRICE_BANDS[0];
  const authenticityFilters = [
    { id: 'all', label: 'All authenticity', match: () => true },
    { id: 'clear', label: 'Clear', match: (work) => !work.authenticityStatus || work.authenticityStatus === 'clear' },
    { id: 'verified', label: 'Proof verified', match: (work) => work.authenticityStatus === 'verified' },
    { id: 'review', label: 'Community review', match: (work) => ['under_review', 'restricted', 'proof_pending'].includes(work.authenticityStatus) },
  ];
  const authenticityFilter = authenticityFilters.find(filter => filter.id === authFilter) || authenticityFilters[0];
  const filteredWorks = ARTWORKS
    .filter(work => {
      const artist = artistById(work.artist);
      const searchable = normalizeText([
        work.title,
        work.tags.join(' '),
        work.format,
        artist?.name,
        artist?.handle,
        artist?.city,
      ].join(' '));

      const matchesSearch = !searchTerm || searchable.includes(searchTerm);
      const matchesTag = tag === 'all' || work.tags.includes(tag);
      const matchesEdition = edition === 'all' || (edition === 'one' ? work.edition === '1/1' : work.edition !== '1/1');
      const matchesPrice = priceFilter.match(work);
      const matchesAuthenticity = authenticityFilter.match(work);

      return matchesSearch && matchesTag && matchesEdition && matchesPrice && matchesAuthenticity;
    })
    .sort((a,b) => {
      if (sort === 'new') return b.year - a.year || a.endsAt - b.endsAt;
      if (sort === 'priceHigh') return b.currentBid - a.currentBid;
      if (sort === 'priceLow') return a.currentBid - b.currentBid;
      if (sort === 'watched') return b.watchers - a.watchers;
      return a.endsAt - b.endsAt;
    });

  const matchedCommissions = !searchTerm ? [] : COMMISSIONS.filter(c => {
    const artist = artistById(c.artist);
    return normalizeText([c.title, c.brief, artist?.name, artist?.handle].join(' ')).includes(searchTerm);
  });

  const matchedPosts = !searchTerm ? [] : FEED_POSTS.filter(p => {
    const artist = artistById(p.artist);
    return normalizeText([p.text, p.type, artist?.name, artist?.handle].join(' ')).includes(searchTerm);
  });

  return (
    <main className="fade-in max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <section className="hair-b pb-6 mb-8 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
        <div>
          <div className="label mb-3">No. EXPLORE - Live index</div>
          <h1 className="display text-[48px] sm:text-[72px] leading-[0.9]">Explore the market.</h1>
          <p className="text-[15px] text-[var(--muted)] mt-4 max-w-[620px] leading-relaxed">
            Search live artworks, tags, artists, price ranges, editions, and community authenticity states.
          </p>
        </div>
        <div className="hair-all bg-[var(--card)] p-4 min-w-[260px]">
          <div className="label">Matched listings</div>
          <div className="mono text-[32px] mt-1">{filteredWorks.length}</div>
          <div className="text-[12px] text-[var(--muted)] mt-1">{searchTerm ? `Search: ${query}` : 'No search term active'}</div>
        </div>
      </section>

      <section className="mb-8">
        <div className="flex flex-wrap items-center gap-2">
          {[{k:'ending',l:'Ending soon'},{k:'new',l:'Newest'},{k:'priceHigh',l:'Highest bid'},{k:'priceLow',l:'Lowest bid'},{k:'watched',l:'Most watched'}].map(f => (
            <button key={f.k} onClick={() => setSort(f.k)} className={`tab-pill ${sort === f.k ? 'active' : ''}`}>{f.l}</button>
          ))}
          <select value={tag} onChange={e => setTag(e.target.value)} aria-label="Filter auctions by tag" className="tab-pill bg-transparent">
            {getTagOptions().map(t => <option key={t} value={t}>{t === 'all' ? 'All tags' : t}</option>)}
          </select>
          <select value={edition} onChange={e => setEdition(e.target.value)} aria-label="Filter auctions by edition type" className="tab-pill bg-transparent">
            <option value="all">All editions</option>
            <option value="one">1/1 only</option>
            <option value="multi">Multi-edition</option>
          </select>
          <select value={priceBand} onChange={e => setPriceBand(e.target.value)} aria-label="Filter auctions by price" className="tab-pill bg-transparent">
            {PRICE_BANDS.map(b => <option key={b.id} value={b.id}>{b.label}</option>)}
          </select>
          <select value={authFilter} onChange={e => setAuthFilter(e.target.value)} aria-label="Filter auctions by authenticity status" className="tab-pill bg-transparent">
            {authenticityFilters.map(filter => <option key={filter.id} value={filter.id}>{filter.label}</option>)}
          </select>
          <div className="hair-l h-6 mx-2 hidden sm:block"/>
          <button onClick={() => setLayout('grid')} className={`hair-all p-2 ${layout==='grid' ? 'bg-[var(--ink)] text-[var(--bg)]' : ''}`} aria-label="Grid layout"><Grid3x3 size={14}/></button>
          <button onClick={() => setLayout('row')} className={`hair-all p-2 ${layout==='row' ? 'bg-[var(--ink)] text-[var(--bg)]' : ''}`} aria-label="Row layout"><Rows3 size={14}/></button>
        </div>
      </section>

      <div className="mb-5 flex justify-between items-center mono text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">
        <span>{filteredWorks.length} live {filteredWorks.length === 1 ? 'auction' : 'auctions'} matched</span>
        {searchTerm && <button onClick={() => document.getElementById('global-search')?.focus()} className="underline-hover">Edit search</button>}
      </div>

      {layout === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
          {filteredWorks.map(w => (
            <ArtCard key={w.id} work={w} onClick={() => goToArtwork(w.id)} likes={likes} toggleLike={toggleLike} watchlist={watchlist} toggleWatch={toggleWatch}/>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[760px]">
            {filteredWorks.map(w => (
              <ArtCard key={w.id} work={w} onClick={() => goToArtwork(w.id)} likes={likes} toggleLike={toggleLike} watchlist={watchlist} toggleWatch={toggleWatch} layout="row"/>
            ))}
          </div>
        </div>
      )}

      {filteredWorks.length === 0 && (
        <div className="hair-all p-10 text-center bg-[var(--card)]">
          <div className="display text-[28px]">No auctions matched.</div>
          <p className="text-[14px] text-[var(--muted)] mt-2">Widen the filters or try another artist, tag, or artwork title.</p>
        </div>
      )}

      {searchTerm && (matchedCommissions.length > 0 || matchedPosts.length > 0) && (
        <section className="mt-14">
          <div className="hair-b pb-3 mb-6">
            <div className="label mb-1">Also matching “{query}”</div>
            <h2 className="display text-[32px]">Commissions & feed</h2>
          </div>

          {matchedCommissions.length > 0 && (
            <div className="mb-10">
              <div className="label mb-3">Commissions · {matchedCommissions.length}</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {matchedCommissions.map(c => {
                  const artist = artistById(c.artist);
                  const open = Math.max(0, c.slots - c.taken);
                  return (
                    <button key={c.id} onClick={() => goToArtist?.(c.artist)} className="hair-all bg-[var(--card)] p-5 text-left hover:bg-[var(--bg-2)] transition-colors">
                      <div className="flex justify-between items-baseline gap-3">
                        <div className="display text-[20px] leading-tight">{c.title}</div>
                        <span className={`mono text-[9px] uppercase tracking-[0.12em] px-2 py-0.5 ${open > 0 ? 'bg-[var(--good)] text-white' : 'hair-all text-[var(--muted)]'}`}>{open > 0 ? `${open} open` : 'Full'}</span>
                      </div>
                      <div className="mono text-[11px] text-[var(--muted)] mt-1">{artist?.handle} · ${fmt(c.price)} · {c.days}d</div>
                      {c.brief && <p className="text-[13px] text-[var(--ink-2)] mt-3 leading-relaxed line-clamp-3">{c.brief}</p>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {matchedPosts.length > 0 && (
            <div>
              <div className="label mb-3">Feed posts · {matchedPosts.length}</div>
              <div className="space-y-3">
                {matchedPosts.slice(0, 8).map(p => {
                  const artist = artistById(p.artist);
                  return (
                    <button key={p.id} onClick={() => goFeed?.()} className="w-full hair-all bg-[var(--card)] p-4 text-left hover:bg-[var(--bg-2)] transition-colors">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-[13px] font-medium">{artist?.name}<span className="mono text-[10px] text-[var(--muted)] ml-2">{artist?.handle}</span></span>
                        <span className="mono text-[9px] uppercase tracking-[0.12em] hair-all px-2 py-0.5">{p.type}</span>
                      </div>
                      <p className="text-[13px] text-[var(--ink-2)] mt-2 leading-relaxed line-clamp-2">{p.text}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      )}
    </main>
  );
};
