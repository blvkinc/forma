// ============================================================
// FORMA — Artists directory
// ============================================================
import React, { useMemo, useState } from 'react';
import { ArrowUpRight, Check, Plus } from 'lucide-react';
import { fmt, normalizeText, isAdminRole } from '../lib/ui';
import { ARTISTS, ARTWORKS, COMMISSIONS } from '../lib/catalogue';

export const ArtistsView = ({ goToArtist, follows, toggleFollow, role }) => {
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('all');
  const [openOnly, setOpenOnly] = useState(false);
  const isAdmin = isAdminRole(role);

  const cities = useMemo(
    () => ['all', ...Array.from(new Set(ARTISTS.map(a => a.city).filter(Boolean))).sort()],
    []
  );

  const artistsWithOpenSlots = useMemo(() => {
    const set = new Set();
    COMMISSIONS.forEach(c => {
      if (Math.max(0, c.slots - c.taken) > 0) set.add(c.artist);
    });
    return set;
  }, []);

  const term = normalizeText(search);
  const filtered = ARTISTS.filter(a => {
    const haystack = normalizeText([a.name, a.handle, a.city, a.bio].join(' '));
    const matchesSearch = !term || haystack.includes(term);
    const matchesCity = city === 'all' || a.city === city;
    const matchesOpen = !openOnly || artistsWithOpenSlots.has(a.id);
    return matchesSearch && matchesCity && matchesOpen;
  });

  return (
    <main className="fade-in max-w-[1440px] mx-auto px-8 py-12">
      <div className="grid grid-cols-12 gap-8 mb-12 hair-b pb-12">
        <div className="col-span-8">
          <div className="label mb-4">№ 08 — Directory</div>
          <h1 className="display text-[96px] leading-[0.9] tracking-[-0.045em]">
            {ARTISTS.length} {ARTISTS.length === 1 ? 'studio' : 'studios'}.<br/>
            One index.
          </h1>
        </div>
        <div className="col-span-4 flex items-end">
          <p className="text-[15px] text-[var(--ink-2)] leading-relaxed">
            Every artist on FORMA is vetted, takes a flat fee, and runs their own shop. Filter by name, city, or open availability.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-8">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search studios, handles, cities…"
          aria-label="Search studios"
          className="swiss-input flex-1 min-w-[220px]"
        />
        <select value={city} onChange={e => setCity(e.target.value)} aria-label="Filter by city" className="tab-pill bg-transparent">
          {cities.map(c => <option key={c} value={c}>{c === 'all' ? 'All cities' : c}</option>)}
        </select>
        <button
          type="button"
          onClick={() => setOpenOnly(v => !v)}
          aria-pressed={openOnly}
          className={`tab-pill ${openOnly ? 'active' : ''}`}
        >
          Open commissions
        </button>
        <span className="mono text-[11px] uppercase tracking-[0.12em] text-[var(--muted)] ml-auto">
          {filtered.length} {filtered.length === 1 ? 'studio' : 'studios'} matched
        </span>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {filtered.map(a => {
          const works = ARTWORKS.filter(w => w.artist === a.id);
          const f = follows[a.id];
          const hasOpen = artistsWithOpenSlots.has(a.id);
          return (
            <div key={a.id} className="hair-all p-6 bg-[var(--card)] flex gap-6 group">
              <div onClick={() => goToArtist(a.id)} className="w-32 h-32 flex-shrink-0 hair-all cursor-pointer" style={{background:a.accent}}/>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <div onClick={() => goToArtist(a.id)} className="display text-[26px] cursor-pointer">
                      {a.name}{a.verified && <span className="text-[var(--accent)] ml-1.5">●</span>}
                    </div>
                    <div className="mono text-[11px] text-[var(--muted)] mt-1">{a.handle} · {a.city} · joined {a.joined}</div>
                  </div>
                  <ArrowUpRight onClick={() => goToArtist(a.id)} size={18} className="art-arrow cursor-pointer"/>
                </div>
                <p className="text-[13px] mt-3 text-[var(--ink-2)] leading-relaxed">{a.bio}</p>
                <div className="flex justify-between items-center mt-4 pt-3 hair-t">
                  <div className="flex gap-4 label items-center">
                    <span>{fmt(a.followers)} followers</span>
                    <span>{works.length} works</span>
                    {hasOpen && <span className="text-[var(--good)]">Open slots</span>}
                  </div>
                  {isAdmin ? (
                    <button onClick={() => goToArtist(a.id)} className="mono text-[10px] uppercase tracking-[0.1em] px-3 py-1.5 transition-colors hair-all hover:bg-[var(--ink)] hover:text-[var(--bg)]">
                      Open
                    </button>
                  ) : (
                    <button onClick={() => toggleFollow(a.id)} className={`mono text-[10px] uppercase tracking-[0.1em] px-3 py-1.5 transition-colors ${f ? 'hair-all text-[var(--muted)]' : 'bg-[var(--ink)] text-[var(--bg)]'}`}>
                      {f ? <><Check size={10} className="inline mr-1"/> Following</> : <><Plus size={10} className="inline mr-1"/> Follow</>}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="hair-all p-12 text-center bg-[var(--card)]">
          <div className="display text-[28px]">No studios matched.</div>
          <p className="text-[14px] text-[var(--muted)] mt-2">Clear the search or widen the city / availability filters.</p>
        </div>
      )}
    </main>
  );
};
