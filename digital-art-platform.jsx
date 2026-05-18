import React, { useState, useEffect, useRef } from 'react';
import {
  Search, Bell, User, ShoppingBag, Heart, Eye, Clock, Gavel, Plus,
  ArrowUpRight, ArrowRight, ArrowLeft, MessageCircle, Share2,
  TrendingUp, Users, DollarSign, AlertCircle, Check, X, Menu,
  Image as ImageIcon, Briefcase, Activity, Shield, ChevronRight,
  ChevronDown, Filter, Grid3x3, Rows3, Bookmark, MoreHorizontal,
  Calendar, Tag, MapPin, Hash, Send, Copy, Flag, Sparkles
} from 'lucide-react';

// ============================================================
// GLOBAL STYLES — Swiss design system
// ============================================================
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,300..800&family=Hanken+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');

    :root {
      --bg: #EFEDE5;
      --bg-2: #E6E3D8;
      --ink: #0E0E0C;
      --ink-2: #2A2A26;
      --muted: #6E6B62;
      --hair: #D6D2C4;
      --hair-2: #C4BFAD;
      --card: #FBFAF5;
      --accent: #FF3B1F;
      --accent-soft: #FFE7E0;
      --good: #1F6B3A;
    }

    .swiss-app * {
      box-sizing: border-box;
    }

    .swiss-app {
      font-family: 'Hanken Grotesk', system-ui, sans-serif;
      background: var(--bg);
      color: var(--ink);
      font-feature-settings: "ss01", "cv11";
      -webkit-font-smoothing: antialiased;
      letter-spacing: -0.005em;
    }

    .display { font-family: 'Bricolage Grotesque', serif; letter-spacing: -0.04em; font-weight: 500; line-height: 0.92; }
    .mono { font-family: 'JetBrains Mono', monospace; font-feature-settings: "ss02"; }
    .label { font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); }
    .label-ink { font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ink); }

    .hair-t { border-top: 1px solid var(--hair); }
    .hair-b { border-bottom: 1px solid var(--hair); }
    .hair-l { border-left: 1px solid var(--hair); }
    .hair-r { border-right: 1px solid var(--hair); }
    .hair-all { border: 1px solid var(--hair); }

    .underline-hover { position: relative; }
    .underline-hover::after {
      content: '';
      position: absolute;
      left: 0;
      bottom: -2px;
      width: 0;
      height: 1px;
      background: currentColor;
      transition: width 0.3s ease;
    }
    .underline-hover:hover::after { width: 100%; }

    .grid-bg {
      background-image:
        linear-gradient(to right, rgba(14,14,12,0.04) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(14,14,12,0.04) 1px, transparent 1px);
      background-size: 80px 80px;
    }

    .noise {
      position: relative;
    }
    .noise::after {
      content: '';
      position: absolute; inset: 0;
      background-image: url("data:image/svg+xml;utf8,<svg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.08 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
      pointer-events: none;
      mix-blend-mode: multiply;
      opacity: 0.6;
    }

    .marquee {
      display: flex;
      gap: 3rem;
      animation: marquee 40s linear infinite;
      white-space: nowrap;
    }
    @keyframes marquee {
      from { transform: translateX(0); }
      to { transform: translateX(-50%); }
    }

    .fade-in {
      animation: fadeIn 0.5s ease forwards;
      opacity: 0;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .blink { animation: blink 1.4s steps(2) infinite; }
    @keyframes blink { 50% { opacity: 0.2; } }

    .swiss-btn {
      display: inline-flex; align-items: center; gap: 0.5rem;
      padding: 0.65rem 1.1rem;
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase;
      border: 1px solid var(--ink);
      background: var(--ink); color: var(--bg);
      transition: all 0.15s ease;
      cursor: pointer;
    }
    .swiss-btn:hover { background: var(--accent); border-color: var(--accent); color: white; }
    .swiss-btn.ghost { background: transparent; color: var(--ink); }
    .swiss-btn.ghost:hover { background: var(--ink); color: var(--bg); }
    .swiss-btn.accent { background: var(--accent); border-color: var(--accent); color: white; }
    .swiss-btn.accent:hover { background: var(--ink); border-color: var(--ink); }

    .tab-pill {
      padding: 0.4rem 0.85rem;
      font-family: 'JetBrains Mono', monospace;
      font-size: 10.5px; letter-spacing: 0.1em; text-transform: uppercase;
      border: 1px solid var(--hair);
      background: transparent; color: var(--muted);
      cursor: pointer; transition: all 0.15s;
    }
    .tab-pill:hover { color: var(--ink); border-color: var(--ink); }
    .tab-pill.active { background: var(--ink); color: var(--bg); border-color: var(--ink); }

    .art-card { transition: transform 0.3s ease; }
    .art-card:hover { transform: translateY(-2px); }
    .art-card:hover .art-arrow { transform: translate(2px, -2px); }
    .art-arrow { transition: transform 0.25s ease; }

    input.swiss-input, textarea.swiss-input {
      background: transparent;
      border: none;
      border-bottom: 1px solid var(--hair);
      padding: 0.6rem 0;
      font-family: 'Hanken Grotesk', sans-serif;
      font-size: 14px;
      color: var(--ink);
      width: 100%;
      outline: none;
      transition: border-color 0.2s;
    }
    input.swiss-input:focus, textarea.swiss-input:focus { border-color: var(--ink); }

    .scroll-hide::-webkit-scrollbar { display: none; }
    .scroll-hide { -ms-overflow-style: none; scrollbar-width: none; }
  `}</style>
);

// ============================================================
// MOCK DATA
// ============================================================
const ARTISTS = [
  { id: 'a1', handle: 'kestner.studio', name: 'Lou Kestner', city: 'Zürich', joined: '2024', followers: 4218, bio: 'Generative type, halftone studies, post-grid systems.', verified: true, accent: '#FF3B1F' },
  { id: 'a2', handle: 'mira.tanaka', name: 'Mira Tanaka', city: 'Kyoto', joined: '2023', followers: 8902, bio: 'Architectural drawing, light + concrete + nothing else.', verified: true, accent: '#0E0E0C' },
  { id: 'a3', handle: 'okonkwo.studio', name: 'Ada Okonkwo', city: 'Lagos', joined: '2025', followers: 1402, bio: 'Color systems, Bauhaus reissues, weekly print drops.', verified: false, accent: '#1A4FFF' },
  { id: 'a4', handle: 'rfm.works', name: 'Reza Farahani-M.', city: 'Berlin', joined: '2022', followers: 12881, bio: 'Glitch as ornament. Type as architecture. 1/1 only.', verified: true, accent: '#0E0E0C' },
  { id: 'a5', handle: 'pauline.s', name: 'Pauline Schreiber', city: 'Lausanne', joined: '2024', followers: 3009, bio: 'Topographies, contour drawings, slow geometry.', verified: false, accent: '#FF8A00' },
  { id: 'a6', handle: 'fjeld.no', name: 'Henrik Fjeld', city: 'Oslo', joined: '2023', followers: 6644, bio: 'Risograph-only. Editions of 25. Sent rolled.', verified: true, accent: '#0E7C3A' },
];

// 12 abstract SVG artworks — each rendered programmatically
const ART_VISUALS = {
  v1: (
    <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
      <rect width="400" height="400" fill="#EFEDE5"/>
      {Array.from({length: 12}).map((_, r) =>
        Array.from({length: 12}).map((_, c) => (
          <circle key={`${r}-${c}`} cx={20 + c*32} cy={20 + r*32} r={Math.max(1, ((r+c)%6)*1.5)} fill="#0E0E0C"/>
        ))
      )}
    </svg>
  ),
  v2: (
    <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="g2" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FF3B1F"/>
          <stop offset="0.5" stopColor="#FFB200"/>
          <stop offset="1" stopColor="#EFEDE5"/>
        </linearGradient>
      </defs>
      <rect width="400" height="400" fill="url(#g2)"/>
      <rect x="60" y="60" width="280" height="280" fill="none" stroke="#0E0E0C" strokeWidth="1"/>
      <text x="60" y="50" fontFamily="JetBrains Mono" fontSize="10" fill="#0E0E0C">FIELD STUDY №14</text>
    </svg>
  ),
  v3: (
    <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
      <rect width="400" height="400" fill="#0E0E0C"/>
      <rect x="0" y="0" width="200" height="200" fill="#FF3B1F"/>
      <rect x="200" y="200" width="200" height="200" fill="#FBFAF5"/>
      <rect x="280" y="0" width="120" height="80" fill="#1A4FFF"/>
      <line x1="200" y1="0" x2="200" y2="400" stroke="#0E0E0C" strokeWidth="2"/>
      <line x1="0" y1="200" x2="400" y2="200" stroke="#0E0E0C" strokeWidth="2"/>
    </svg>
  ),
  v4: (
    <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
      <rect width="400" height="400" fill="#FBFAF5"/>
      {Array.from({length: 40}).map((_,i) => (
        <line key={i} x1="0" y1={i*10 + Math.sin(i)*5} x2="400" y2={i*10 + Math.cos(i)*15} stroke="#0E0E0C" strokeWidth="0.5"/>
      ))}
      <circle cx="200" cy="200" r="80" fill="#EFEDE5"/>
      <circle cx="200" cy="200" r="80" fill="none" stroke="#0E0E0C"/>
    </svg>
  ),
  v5: (
    <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
      <rect width="400" height="400" fill="#EFEDE5"/>
      <text x="20" y="180" fontFamily="Bricolage Grotesque" fontSize="220" fontWeight="700" fill="#0E0E0C" letterSpacing="-15">A</text>
      <text x="180" y="380" fontFamily="Bricolage Grotesque" fontSize="220" fontWeight="700" fill="#FF3B1F" letterSpacing="-15">Z</text>
      <rect x="20" y="20" width="360" height="360" fill="none" stroke="#0E0E0C" strokeWidth="1"/>
    </svg>
  ),
  v6: (
    <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
      <defs>
        <radialGradient id="g6" cx="0.5" cy="0.5">
          <stop offset="0" stopColor="#FFB200"/>
          <stop offset="0.6" stopColor="#FF3B1F"/>
          <stop offset="1" stopColor="#0E0E0C"/>
        </radialGradient>
      </defs>
      <rect width="400" height="400" fill="url(#g6)"/>
    </svg>
  ),
  v7: (
    <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
      <rect width="400" height="400" fill="#FBFAF5"/>
      {Array.from({length: 15}).map((_,i) => (
        <ellipse key={i} cx="200" cy="200" rx={20+i*12} ry={10+i*6} fill="none" stroke="#0E0E0C" strokeWidth="0.6" opacity={1 - i*0.05}/>
      ))}
    </svg>
  ),
  v8: (
    <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
      <rect width="400" height="400" fill="#0E0E0C"/>
      {Array.from({length: 30}).map((_,i) => (
        <rect key={i} x={Math.random()*400} y={i*14} width={Math.random()*200+50} height="3" fill="#FF3B1F" opacity={Math.random()}/>
      ))}
      <text x="40" y="380" fontFamily="JetBrains Mono" fontSize="11" fill="#FBFAF5">CHANNEL_ERR_03</text>
    </svg>
  ),
  v9: (
    <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
      <rect width="400" height="400" fill="#EFEDE5"/>
      <polygon points="200,40 360,360 40,360" fill="none" stroke="#0E0E0C" strokeWidth="1.2"/>
      <polygon points="200,100 310,320 90,320" fill="none" stroke="#FF3B1F" strokeWidth="1.2"/>
      <polygon points="200,160 270,290 130,290" fill="#0E0E0C"/>
      <circle cx="200" cy="240" r="14" fill="#EFEDE5"/>
    </svg>
  ),
  v10: (
    <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
      <rect width="400" height="400" fill="#1A4FFF"/>
      <rect x="40" y="40" width="320" height="320" fill="#FBFAF5"/>
      <circle cx="200" cy="200" r="100" fill="#FFB200"/>
      <rect x="100" y="180" width="200" height="40" fill="#0E0E0C"/>
    </svg>
  ),
  v11: (
    <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
      <rect width="400" height="400" fill="#FBFAF5"/>
      {Array.from({length: 20}).map((_,r) =>
        Array.from({length: 20}).map((_,c) => {
          const ch = ['/','\\','|','-','+','#','.',' '][Math.floor((r*c+r+c)%8)];
          return <text key={`${r}-${c}`} x={20+c*18} y={30+r*18} fontFamily="JetBrains Mono" fontSize="14" fill="#0E0E0C">{ch}</text>;
        })
      )}
    </svg>
  ),
  v12: (
    <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
      <rect width="400" height="400" fill="#0E7C3A"/>
      <rect x="0" y="0" width="400" height="200" fill="#EFEDE5"/>
      <rect x="40" y="160" width="80" height="80" fill="#FF3B1F"/>
      <circle cx="280" cy="120" r="60" fill="#0E0E0C"/>
      <line x1="0" y1="200" x2="400" y2="200" stroke="#0E0E0C" strokeWidth="3"/>
    </svg>
  ),
};

const ARTWORKS = [
  { id: 'w01', title: 'Halftone Field №14', visual: 'v1', artist: 'a1', year: 2026, dim: '4096×4096', edition: '1/1', startBid: 280, currentBid: 480, bids: 14, watchers: 92, endsAt: 1000*60*60*5.2, tags: ['halftone','generative','print-ready'], likes: 211, format: 'PNG + raw .glyph' },
  { id: 'w02', title: 'Concrete Light, Study II', visual: 'v2', artist: 'a2', year: 2026, dim: '3000×3000', edition: '1/3', startBid: 600, currentBid: 1240, bids: 22, watchers: 188, endsAt: 1000*60*60*22, tags: ['architecture','gradient','photo'], likes: 540, format: 'TIFF' },
  { id: 'w03', title: 'Mondrian Reissue', visual: 'v3', artist: 'a3', year: 2025, dim: '5000×5000', edition: '1/1', startBid: 320, currentBid: 320, bids: 0, watchers: 41, endsAt: 1000*60*60*48, tags: ['bauhaus','color-blocks','print'], likes: 88, format: 'SVG + PNG' },
  { id: 'w04', title: 'Topographic Drift', visual: 'v4', artist: 'a5', year: 2026, dim: '4500×4500', edition: '1/5', startBid: 180, currentBid: 245, bids: 5, watchers: 67, endsAt: 1000*60*60*2.5, tags: ['line-art','topography'], likes: 134, format: 'SVG' },
  { id: 'w05', title: 'A to Z', visual: 'v5', artist: 'a1', year: 2026, dim: '6000×6000', edition: '1/1', startBid: 540, currentBid: 820, bids: 9, watchers: 102, endsAt: 1000*60*60*14, tags: ['typography','poster'], likes: 312, format: 'AI + PDF' },
  { id: 'w06', title: 'Sun, Receding', visual: 'v6', artist: 'a5', year: 2025, dim: '4000×4000', edition: '1/10', startBid: 120, currentBid: 160, bids: 3, watchers: 33, endsAt: 1000*60*60*70, tags: ['gradient','minimal'], likes: 76, format: 'PNG' },
  { id: 'w07', title: 'Orbit, Inner', visual: 'v7', artist: 'a2', year: 2026, dim: '3000×3000', edition: '1/1', startBid: 400, currentBid: 615, bids: 11, watchers: 124, endsAt: 1000*60*60*9, tags: ['line-art','geometry'], likes: 198, format: 'SVG + PNG' },
  { id: 'w08', title: 'Channel Error 03', visual: 'v8', artist: 'a4', year: 2026, dim: '3840×2160', edition: '1/1', startBid: 700, currentBid: 1450, bids: 28, watchers: 312, endsAt: 1000*60*60*1.1, tags: ['glitch','1/1'], likes: 822, format: 'PNG' },
  { id: 'w09', title: 'Three Triangles', visual: 'v9', artist: 'a3', year: 2026, dim: '4000×4000', edition: '1/8', startBid: 90, currentBid: 90, bids: 0, watchers: 18, endsAt: 1000*60*60*96, tags: ['geometry','bauhaus'], likes: 41, format: 'SVG' },
  { id: 'w10', title: 'Hot Sun, Cold Sky', visual: 'v10', artist: 'a6', year: 2025, dim: '2000×2000', edition: '12/25', startBid: 60, currentBid: 60, bids: 0, watchers: 9, endsAt: 1000*60*60*120, tags: ['riso','print'], likes: 27, format: 'TIFF + RISO sep.' },
  { id: 'w11', title: 'Terminal Garden', visual: 'v11', artist: 'a4', year: 2026, dim: 'TXT/4096w', edition: '1/1', startBid: 240, currentBid: 360, bids: 7, watchers: 58, endsAt: 1000*60*60*36, tags: ['ascii','code-art'], likes: 144, format: 'TXT + PNG' },
  { id: 'w12', title: 'Field, Divided', visual: 'v12', artist: 'a6', year: 2026, dim: '4000×4000', edition: '1/15', startBid: 80, currentBid: 145, bids: 4, watchers: 22, endsAt: 1000*60*60*60, tags: ['riso','color-blocks'], likes: 63, format: 'TIFF' },
];

const COMMISSIONS = [
  { id: 'c1', artist: 'a1', title: 'Custom typographic poster', slots: 3, taken: 1, price: 480, days: 14, brief: 'Single letterform, your message, A2 print-ready, source files included.' },
  { id: 'c2', artist: 'a2', title: 'Architectural study, 1 building', slots: 2, taken: 2, price: 1200, days: 28, brief: 'I shoot one building you love. Two final compositions, raw + treated.' },
  { id: 'c3', artist: 'a3', title: 'Brand color system', slots: 5, taken: 0, price: 700, days: 10, brief: 'Bauhaus-method palette, 12 swatches, usage doc, web tokens.' },
  { id: 'c4', artist: 'a4', title: 'Glitched 1/1 portrait', slots: 1, taken: 0, price: 2000, days: 21, brief: 'Send me one photo. Get back a destroyed, beautiful piece. 1/1, no prints.' },
  { id: 'c5', artist: 'a5', title: 'Topographic map, any place', slots: 4, taken: 2, price: 320, days: 12, brief: 'Pick any coordinates. Contour drawing, large format, signed.' },
  { id: 'c6', artist: 'a6', title: '2-color risograph print', slots: 6, taken: 3, price: 220, days: 18, brief: 'Riso edition of 25, two colors of your choice, A3, sent rolled.' },
];

const FEED_POSTS = [
  { id: 'p1', artist: 'a4', type: 'drop', when: '2h', text: 'New 1/1 live. Channel_Err_03. 22 minutes of editing for 4 seconds of decision.', artwork: 'w08', likes: 211, comments: 18 },
  { id: 'p2', artist: 'a2', type: 'process', when: '5h', text: 'Shot at 04:40, before the caretaker shows up. The concrete is warmer than the light.', likes: 89, comments: 6 },
  { id: 'p3', artist: 'a1', type: 'note', when: '8h', text: 'Opening 3 commission slots tomorrow at 09:00 CET. Single letterforms. Probably the last batch this quarter.', likes: 142, comments: 23 },
  { id: 'p4', artist: 'a3', type: 'drop', when: '1d', text: 'Three Triangles — starting bid 90. Editions of 8. Going slow this week.', artwork: 'w09', likes: 41, comments: 4 },
  { id: 'p5', artist: 'a5', type: 'process', when: '1d', text: 'Twelve drafts of one ridge. The map is not the territory but the draft is not the map either.', likes: 76, comments: 11 },
  { id: 'p6', artist: 'a6', type: 'sold', when: '2d', text: 'Field, Divided — edition 4/15 sold. Sending rolled tomorrow.', artwork: 'w12', likes: 53, comments: 2 },
];

// ============================================================
// HELPERS
// ============================================================
const formatTime = (ms) => {
  if (ms <= 0) return 'ENDED';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  if (h > 24) return `${Math.floor(h/24)}D ${h%24}H`;
  if (h > 0) return `${h}H ${String(m).padStart(2,'0')}M`;
  return `${String(m).padStart(2,'0')}M ${String(s).padStart(2,'0')}S`;
};
const fmt = (n) => n.toLocaleString('en-US');
const artistById = (id) => ARTISTS.find(a => a.id === id);
const artworkById = (id) => ARTWORKS.find(w => w.id === id);

// ============================================================
// SHARED COMPONENTS
// ============================================================
const Logo = ({ onClick }) => (
  <div onClick={onClick} className="flex items-baseline gap-2 cursor-pointer select-none">
    <span className="display text-[26px] tracking-[-0.05em]">FORMA</span>
    <span className="label">/24</span>
  </div>
);

const Ticker = () => (
  <div className="hair-b hair-t overflow-hidden bg-[#0E0E0C] text-[#EFEDE5] py-2">
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

const Header = ({ view, setView, role, setRole, notif, query, setQuery }) => (
  <header className="hair-b sticky top-0 z-40" style={{ background: 'var(--bg)' }}>
    <div className="max-w-[1440px] mx-auto px-8 h-[68px] flex items-center justify-between">
      <div className="flex items-center gap-10">
        <Logo onClick={() => setView('home')}/>
        <nav className="flex items-center gap-6 mono text-[11px] uppercase tracking-[0.12em]">
          <a onClick={() => setView('home')} className={`cursor-pointer underline-hover ${view==='home' ? 'text-[var(--ink)]' : 'text-[var(--muted)]'}`}>Market</a>
          <a onClick={() => setView('commissions')} className={`cursor-pointer underline-hover ${view==='commissions' ? 'text-[var(--ink)]' : 'text-[var(--muted)]'}`}>Commissions</a>
          <a onClick={() => setView('feed')} className={`cursor-pointer underline-hover ${view==='feed' ? 'text-[var(--ink)]' : 'text-[var(--muted)]'}`}>Feed</a>
          <a onClick={() => setView('artists')} className={`cursor-pointer underline-hover ${view==='artists' ? 'text-[var(--ink)]' : 'text-[var(--muted)]'}`}>Artists</a>
        </nav>
      </div>

      <div className="flex items-center gap-3">
        <div className="hair-all flex items-center gap-2 px-3 py-1.5 w-[280px]">
          <Search size={13} className="text-[var(--muted)]"/>
          <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search artists, works, tags…" className="bg-transparent outline-none mono text-[11px] flex-1 placeholder:text-[var(--muted)] uppercase tracking-wider"/>
          <span className="label">⌘K</span>
        </div>
        <button onClick={() => setView('dashboard')} className="hair-all p-2 hover:bg-[var(--ink)] hover:text-[var(--bg)] transition-colors relative">
          <Bell size={14}/>
          {notif > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-[var(--accent)] text-white text-[9px] flex items-center justify-center rounded-full mono">{notif}</span>}
        </button>
        <RoleSwitcher role={role} setRole={setRole} setView={setView}/>
      </div>
    </div>
  </header>
);

const RoleSwitcher = ({ role, setRole, setView }) => {
  const roles = [
    { id: 'buyer', label: 'Buyer', target: 'dashboard' },
    { id: 'artist', label: 'Artist', target: 'studio' },
    { id: 'admin', label: 'Admin', target: 'admin' },
  ];
  return (
    <div className="hair-all flex items-center divide-x divide-[var(--hair)]">
      {roles.map(r => (
        <button
          key={r.id}
          onClick={() => { setRole(r.id); setView(r.target); }}
          className={`px-3 py-2 mono text-[10px] uppercase tracking-[0.12em] transition-colors ${role === r.id ? 'bg-[var(--ink)] text-[var(--bg)]' : 'text-[var(--muted)] hover:text-[var(--ink)]'}`}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
};

const ArtVisual = ({ visual, className = '' }) => (
  <div className={`relative overflow-hidden ${className}`} style={{ aspectRatio: '1/1' }}>
    {ART_VISUALS[visual]}
  </div>
);

const ArtCard = ({ work, onClick, likes, toggleLike, layout = 'grid' }) => {
  const artist = artistById(work.artist);
  const isHot = work.endsAt < 1000*60*60*3;
  const liked = likes[work.id];
  const [timeLeft, setTimeLeft] = useState(work.endsAt);
  useEffect(() => {
    const i = setInterval(() => setTimeLeft(t => Math.max(0, t - 1000)), 1000);
    return () => clearInterval(i);
  }, []);

  if (layout === 'row') {
    return (
      <div onClick={onClick} className="art-card cursor-pointer group flex items-center hair-b py-5 gap-6">
        <div className="w-[120px] flex-shrink-0 hair-all">
          <ArtVisual visual={work.visual}/>
        </div>
        <div className="flex-1 grid grid-cols-12 gap-4 items-center">
          <div className="col-span-4">
            <div className="display text-[20px]">{work.title}</div>
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
          <div className="col-span-2 flex justify-end">
            <ArrowUpRight size={20} className="art-arrow"/>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div onClick={onClick} className="art-card cursor-pointer group">
      <div className="hair-all relative overflow-hidden">
        <ArtVisual visual={work.visual}/>
        {isHot && (
          <div className="absolute top-2 left-2 bg-[var(--accent)] text-white px-2 py-0.5 mono text-[9px] tracking-[0.15em]">
            <span className="blink inline-block w-1.5 h-1.5 bg-white rounded-full mr-1.5 align-middle"/>
            ENDING SOON
          </div>
        )}
        <button onClick={(e)=>{e.stopPropagation(); toggleLike(work.id);}} className="absolute top-2 right-2 w-7 h-7 bg-[var(--bg)] hair-all flex items-center justify-center hover:bg-[var(--ink)] hover:text-[var(--bg)] transition-colors">
          <Heart size={12} fill={liked ? 'currentColor' : 'none'}/>
        </button>
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

const Footer = () => (
  <footer className="hair-t mt-32 py-16 bg-[#0E0E0C] text-[#EFEDE5]">
    <div className="max-w-[1440px] mx-auto px-8">
      <div className="grid grid-cols-12 gap-8">
        <div className="col-span-5">
          <div className="display text-[64px] leading-[0.9]">A market<br/>for digital<br/>artefacts.</div>
        </div>
        <div className="col-span-2"></div>
        <div className="col-span-2">
          <div className="label" style={{color:'#9C988A'}}>Browse</div>
          <div className="mt-3 space-y-1.5 text-[14px]">
            <div className="underline-hover cursor-pointer">Market</div>
            <div className="underline-hover cursor-pointer">Commissions</div>
            <div className="underline-hover cursor-pointer">Artists</div>
            <div className="underline-hover cursor-pointer">Editions</div>
          </div>
        </div>
        <div className="col-span-2">
          <div className="label" style={{color:'#9C988A'}}>Platform</div>
          <div className="mt-3 space-y-1.5 text-[14px]">
            <div className="underline-hover cursor-pointer">Open shop</div>
            <div className="underline-hover cursor-pointer">Fees & payouts</div>
            <div className="underline-hover cursor-pointer">Trust & safety</div>
            <div className="underline-hover cursor-pointer">API</div>
          </div>
        </div>
        <div className="col-span-1">
          <div className="label" style={{color:'#9C988A'}}>Legal</div>
          <div className="mt-3 space-y-1.5 text-[14px]">
            <div className="underline-hover cursor-pointer">Terms</div>
            <div className="underline-hover cursor-pointer">Privacy</div>
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

// ============================================================
// HOMEPAGE — Marketplace
// ============================================================
const HomeView = ({ goToArtwork, goToArtist, likes, toggleLike }) => {
  const [filter, setFilter] = useState('all');
  const [layout, setLayout] = useState('grid');
  const filteredWorks = filter === 'all'
    ? ARTWORKS
    : filter === 'ending'
      ? [...ARTWORKS].sort((a,b) => a.endsAt - b.endsAt)
      : filter === 'new'
        ? [...ARTWORKS].sort((a,b) => b.year - a.year)
        : [...ARTWORKS].sort((a,b) => b.currentBid - a.currentBid);

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
              made, sold, signed.
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
                  <div className="text-[13px]">Active auctions</div>
                  <div className="mono text-[20px]">{ARTWORKS.length * 20}</div>
                </div>
                <div className="flex justify-between items-baseline pb-3 hair-b">
                  <div className="text-[13px]">Open commissions</div>
                  <div className="mono text-[20px]">{COMMISSIONS.reduce((s,c) => s + (c.slots - c.taken), 0)}</div>
                </div>
                <div className="flex justify-between items-baseline pb-3 hair-b">
                  <div className="text-[13px]">Artists onboarded</div>
                  <div className="mono text-[20px]">{ARTISTS.length * 43}</div>
                </div>
                <div className="flex justify-between items-baseline">
                  <div className="text-[13px]">Volume (30d)</div>
                  <div className="mono text-[20px]">$<span>284K</span></div>
                </div>
              </div>
              <button onClick={() => document.getElementById('grid-section')?.scrollIntoView({behavior:'smooth'})} className="swiss-btn mt-6 w-full justify-center">
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
          <a className="mono text-[11px] uppercase tracking-[0.12em] underline-hover cursor-pointer">View all selections →</a>
        </div>

        <div className="grid grid-cols-12 gap-6">
          <div onClick={() => goToArtwork('w08')} className="col-span-7 art-card cursor-pointer group">
            <div className="hair-all relative">
              <ArtVisual visual="v8"/>
              <div className="absolute top-3 left-3 bg-[var(--accent)] text-white px-2 py-1 mono text-[9px] tracking-[0.15em]">
                <span className="blink inline-block w-1.5 h-1.5 bg-white rounded-full mr-1.5 align-middle"/>
                LIVE — 01H 06M
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6 mt-5">
              <div>
                <div className="display text-[36px] leading-[0.95]">Channel Error 03</div>
                <div className="mono text-[12px] mt-2 text-[var(--muted)]">rfm.works · Berlin · 2026 · 1/1</div>
              </div>
              <div className="text-right">
                <div className="label">Current bid</div>
                <div className="mono text-[36px] leading-none mt-1">$1,450</div>
                <div className="label mt-2">28 bids · 312 watching</div>
              </div>
            </div>
          </div>
          <div className="col-span-5 space-y-6">
            {['w02','w05'].map(id => {
              const w = artworkById(id);
              return <ArtCard key={id} work={w} onClick={() => goToArtwork(id)} likes={likes} toggleLike={toggleLike} layout="row"/>;
            })}
            <div className="hair-all p-5 bg-[var(--card)]">
              <div className="label">Drop calendar</div>
              <div className="mt-3 space-y-2">
                {[
                  {when:'TODAY 18:00', what:'Halftone Field №14', who:'kestner.studio'},
                  {when:'SAT 21:00', what:'Riso series (4 pcs)', who:'fjeld.no'},
                  {when:'MON 12:00', what:'Color systems vol.2', who:'okonkwo.studio'},
                ].map((d,i) => (
                  <div key={i} className="flex justify-between text-[13px]">
                    <span className="mono text-[11px] text-[var(--accent)] tracking-wider">{d.when}</span>
                    <div className="text-right">
                      <div>{d.what}</div>
                      <div className="mono text-[11px] text-[var(--muted)]">{d.who}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* GRID OF ALL WORKS */}
      <section id="grid-section" className="max-w-[1440px] mx-auto px-8 py-16">
        <div className="flex items-end justify-between mb-8 hair-b pb-4">
          <div>
            <div className="label mb-2">№ 03 — Index</div>
            <h2 className="display text-[52px]">All live auctions</h2>
          </div>
          <div className="flex items-center gap-2">
            {[{k:'all',l:'All'},{k:'ending',l:'Ending soon'},{k:'new',l:'Newest'},{k:'price',l:'Highest bid'}].map(f => (
              <button key={f.k} onClick={() => setFilter(f.k)} className={`tab-pill ${filter === f.k ? 'active' : ''}`}>{f.l}</button>
            ))}
            <div className="hair-l h-6 mx-2"/>
            <button onClick={() => setLayout('grid')} className={`hair-all p-2 ${layout==='grid' ? 'bg-[var(--ink)] text-[var(--bg)]' : ''}`}><Grid3x3 size={14}/></button>
            <button onClick={() => setLayout('row')} className={`hair-all p-2 ${layout==='row' ? 'bg-[var(--ink)] text-[var(--bg)]' : ''}`}><Rows3 size={14}/></button>
          </div>
        </div>

        {layout === 'grid' ? (
          <div className="grid grid-cols-4 gap-6">
            {filteredWorks.map(w => (
              <ArtCard key={w.id} work={w} onClick={() => goToArtwork(w.id)} likes={likes} toggleLike={toggleLike}/>
            ))}
          </div>
        ) : (
          <div>
            {filteredWorks.map(w => (
              <ArtCard key={w.id} work={w} onClick={() => goToArtwork(w.id)} likes={likes} toggleLike={toggleLike} layout="row"/>
            ))}
          </div>
        )}
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
                <button className="swiss-btn">Open shop <ArrowRight size={12}/></button>
                <button className="swiss-btn ghost">Read the fee sheet</button>
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

// ============================================================
// ARTWORK DETAIL — Auction view
// ============================================================
const ArtworkView = ({ workId, goToArtwork, goToArtist, likes, toggleLike, bids, placeBid }) => {
  const work = artworkById(workId);
  const artist = artistById(work.artist);
  const [bidInput, setBidInput] = useState(work.currentBid + 20);
  const [tab, setTab] = useState('bids');
  const [timeLeft, setTimeLeft] = useState(work.endsAt);
  useEffect(() => {
    const i = setInterval(() => setTimeLeft(t => Math.max(0, t - 1000)), 1000);
    return () => clearInterval(i);
  }, []);
  const localBids = bids[work.id] || [
    { user: '0xCarmen', amount: work.currentBid, when: '2m ago' },
    { user: 'thora.k', amount: work.currentBid - 40, when: '14m ago' },
    { user: 'studio_ng', amount: work.currentBid - 80, when: '42m ago' },
    { user: '0xCarmen', amount: work.currentBid - 120, when: '1h ago' },
    { user: 'merrick', amount: work.startBid, when: '4h ago' },
  ];
  const currentTopBid = localBids[0]?.amount || work.currentBid;

  return (
    <main className="fade-in max-w-[1440px] mx-auto px-8 py-10">
      <div className="hair-b pb-4 mb-8 flex items-center justify-between">
        <button onClick={() => window.history.back()} className="mono text-[11px] uppercase tracking-[0.12em] flex items-center gap-2 underline-hover">
          <ArrowLeft size={12}/> Back to index
        </button>
        <div className="label">№ {work.id.toUpperCase()} — Live auction</div>
      </div>

      <div className="grid grid-cols-12 gap-10">
        {/* LEFT — visual */}
        <div className="col-span-7">
          <div className="hair-all sticky top-[88px]">
            <ArtVisual visual={work.visual}/>
            <div className="hair-t p-4 flex justify-between items-center mono text-[11px]">
              <div className="flex gap-4">
                <span className="text-[var(--muted)]">{work.dim}</span>
                <span>·</span>
                <span className="text-[var(--muted)]">{work.format}</span>
              </div>
              <div className="flex gap-3">
                <button className="hair-all w-7 h-7 flex items-center justify-center hover:bg-[var(--ink)] hover:text-[var(--bg)]"><Eye size={12}/></button>
                <button onClick={() => toggleLike(work.id)} className="hair-all w-7 h-7 flex items-center justify-center hover:bg-[var(--ink)] hover:text-[var(--bg)]"><Heart size={12} fill={likes[work.id] ? 'currentColor' : 'none'}/></button>
                <button className="hair-all w-7 h-7 flex items-center justify-center hover:bg-[var(--ink)] hover:text-[var(--bg)]"><Share2 size={12}/></button>
                <button className="hair-all w-7 h-7 flex items-center justify-center hover:bg-[var(--ink)] hover:text-[var(--bg)]"><Bookmark size={12}/></button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT — info & bid */}
        <div className="col-span-5 space-y-8">
          <div>
            <div onClick={() => goToArtist(artist.id)} className="cursor-pointer inline-flex items-center gap-3 hair-all p-2 pr-4 hover:bg-[var(--card)]">
              <div className="w-8 h-8" style={{background:artist.accent}}/>
              <div>
                <div className="text-[12px] font-medium">{artist.name}{artist.verified && <span className="text-[var(--accent)] ml-1">●</span>}</div>
                <div className="mono text-[10px] text-[var(--muted)]">{artist.handle}</div>
              </div>
              <ArrowUpRight size={14} className="ml-2"/>
            </div>
            <h1 className="display text-[64px] leading-[0.9] mt-5 tracking-[-0.04em]">{work.title}</h1>
            <div className="mono text-[11px] mt-4 text-[var(--muted)] uppercase tracking-[0.1em]">
              {work.year} · Edition {work.edition} · {work.dim}
            </div>
          </div>

          {/* AUCTION PANEL */}
          <div className="hair-all bg-[var(--card)] p-6">
            <div className="flex justify-between items-baseline">
              <div className="label">Current top bid</div>
              <div className="label">{localBids.length} bids placed</div>
            </div>
            <div className="display text-[64px] leading-none mt-2">${fmt(currentTopBid)}</div>
            <div className="mt-4 hair-t pt-4 grid grid-cols-2 gap-4">
              <div>
                <div className="label">Ends in</div>
                <div className={`mono text-[24px] mt-1 ${timeLeft < 1000*60*60*3 ? 'text-[var(--accent)]' : ''}`}>{formatTime(timeLeft)}</div>
              </div>
              <div>
                <div className="label">Min. next bid</div>
                <div className="mono text-[24px] mt-1">${fmt(currentTopBid + 20)}</div>
              </div>
            </div>

            <div className="mt-6 hair-t pt-6">
              <div className="label mb-3">Place your bid</div>
              <div className="flex items-center gap-2">
                <div className="hair-all flex-1 flex items-center px-3">
                  <span className="mono text-[12px] text-[var(--muted)]">USD</span>
                  <input value={bidInput} onChange={e => setBidInput(Number(e.target.value)||0)} type="number" className="bg-transparent outline-none mono text-[18px] flex-1 px-3 py-2.5 text-right"/>
                </div>
                <button onClick={() => placeBid(work.id, bidInput)} className="swiss-btn accent py-3">
                  <Gavel size={12}/> Bid
                </button>
              </div>
              <div className="mt-2 label">
                + 12% buyer's premium · Refunded if outbid
              </div>
              <div className="flex gap-2 mt-3">
                {[20, 50, 100, 250].map(inc => (
                  <button key={inc} onClick={() => setBidInput(currentTopBid + inc)} className="tab-pill flex-1">+{inc}</button>
                ))}
              </div>
            </div>
          </div>

          {/* TABS */}
          <div>
            <div className="flex gap-1 hair-b">
              {[{k:'bids', l:'Bid history'},{k:'about',l:'About'},{k:'comments',l:'Comments · 8'}].map(t => (
                <button key={t.k} onClick={() => setTab(t.k)} className={`mono text-[11px] uppercase tracking-[0.12em] px-3 py-2.5 ${tab===t.k ? 'border-b border-[var(--ink)] -mb-px text-[var(--ink)]' : 'text-[var(--muted)]'}`}>{t.l}</button>
              ))}
            </div>
            <div className="pt-5">
              {tab === 'bids' && (
                <div className="space-y-0">
                  {localBids.map((b, i) => (
                    <div key={i} className="flex items-center justify-between hair-b py-3">
                      <div className="flex items-center gap-3">
                        <span className="mono text-[10px] text-[var(--muted)] w-6">{String(i+1).padStart(2,'0')}</span>
                        <span className="text-[13px]">{b.user}</span>
                        {i === 0 && <span className="bg-[var(--good)] text-white mono text-[9px] px-1.5 py-0.5 tracking-wider">TOP</span>}
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="mono text-[11px] text-[var(--muted)]">{b.when}</span>
                        <span className="mono text-[14px]">${fmt(b.amount)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {tab === 'about' && (
                <div className="text-[14px] leading-relaxed text-[var(--ink-2)] space-y-4">
                  <p>A study in destruction-as-finish. Source captured on a CRT monitor, exported, then run through six passes of channel-shifting until exactly four seconds of the original remained legible.</p>
                  <p>Sold as a single PNG, 3840×2160, plus the .glyph source. Edition {work.edition}.</p>
                  <div className="hair-t pt-4 grid grid-cols-2 gap-y-2 mono text-[11px]">
                    <span className="text-[var(--muted)]">PROVENANCE</span><span>Artist studio, 2026</span>
                    <span className="text-[var(--muted)]">SIGNED</span><span>Digital signature embedded</span>
                    <span className="text-[var(--muted)]">DELIVERY</span><span>Instant — files unlock at sale</span>
                    <span className="text-[var(--muted)]">LICENSE</span><span>Personal display, non-commercial</span>
                  </div>
                </div>
              )}
              {tab === 'comments' && (
                <div className="space-y-4">
                  {[
                    {who:'thora.k', when:'2h', text:'The center cut is doing something I can\'t look away from.'},
                    {who:'studio_ng', when:'4h', text:'Have you tried this technique on motion? Would love to see it.'},
                    {who:'merrick', when:'18h', text:'Bidding again at the end.'},
                  ].map((c,i) => (
                    <div key={i} className="hair-b pb-3">
                      <div className="flex justify-between items-baseline">
                        <div className="text-[13px] font-medium">{c.who}</div>
                        <div className="mono text-[10px] text-[var(--muted)]">{c.when} ago</div>
                      </div>
                      <p className="text-[13px] mt-1 text-[var(--ink-2)]">{c.text}</p>
                    </div>
                  ))}
                  <div className="hair-all p-3 flex gap-2">
                    <input className="swiss-input flex-1 border-none" placeholder="Add a comment..."/>
                    <button className="swiss-btn"><Send size={12}/></button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="label mb-3">Tags</div>
            <div className="flex flex-wrap gap-2">
              {work.tags.map(t => (
                <span key={t} className="hair-all px-2.5 py-1 mono text-[10px] uppercase tracking-[0.1em] cursor-pointer hover:bg-[var(--ink)] hover:text-[var(--bg)]">#{t}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* RELATED */}
      <section className="mt-24">
        <div className="hair-b pb-4 mb-8 flex justify-between items-baseline">
          <h3 className="display text-[32px]">More from {artist.name}</h3>
          <a onClick={() => goToArtist(artist.id)} className="mono text-[11px] uppercase tracking-[0.12em] underline-hover cursor-pointer">Visit shop →</a>
        </div>
        <div className="grid grid-cols-4 gap-6">
          {ARTWORKS.filter(w => w.artist === artist.id && w.id !== work.id).slice(0,4).map(w => (
            <ArtCard key={w.id} work={w} onClick={() => goToArtwork(w.id)} likes={likes} toggleLike={toggleLike}/>
          ))}
          {ARTWORKS.filter(w => w.artist !== artist.id).slice(0, Math.max(0, 4 - ARTWORKS.filter(w => w.artist === artist.id && w.id !== work.id).length)).map(w => (
            <ArtCard key={w.id} work={w} onClick={() => goToArtwork(w.id)} likes={likes} toggleLike={toggleLike}/>
          ))}
        </div>
      </section>
    </main>
  );
};

// ============================================================
// ARTIST PROFILE / SHOP
// ============================================================
const ArtistView = ({ artistId, goToArtwork, follows, toggleFollow, likes, toggleLike }) => {
  const artist = artistById(artistId);
  const works = ARTWORKS.filter(w => w.artist === artistId);
  const commissions = COMMISSIONS.filter(c => c.artist === artistId);
  const [tab, setTab] = useState('works');
  const isFollowing = follows[artistId];

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
              <div className="mono text-[24px] mt-1">{fmt(artist.followers + (isFollowing?1:0))}</div>
            </div>
            <div className="hair-t pt-3">
              <div className="label">Works</div>
              <div className="mono text-[24px] mt-1">{works.length}</div>
            </div>
            <div className="hair-t pt-3">
              <div className="label">Sold</div>
              <div className="mono text-[24px] mt-1">{works.length * 6}</div>
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
          <button className="swiss-btn ghost justify-center"><MessageCircle size={12}/> Message</button>
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
          {k:'sold', l:'Sold archive'},
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
        <div>
          <div className="grid grid-cols-12 gap-4 label hair-b pb-3">
            <div className="col-span-1">№</div>
            <div className="col-span-4">Title</div>
            <div className="col-span-2">Sold to</div>
            <div className="col-span-2">When</div>
            <div className="col-span-2 text-right">Price</div>
            <div className="col-span-1 text-right">View</div>
          </div>
          {Array.from({length:8}).map((_,i) => (
            <div key={i} className="grid grid-cols-12 gap-4 py-3 hair-b items-center text-[13px] hover:bg-[var(--card)] cursor-pointer">
              <div className="col-span-1 mono text-[11px] text-[var(--muted)]">{String(i+1).padStart(3,'0')}</div>
              <div className="col-span-4 display text-[18px]">{['Halftone №09','Halftone №10','Letter F-2','Field, Old','Greys/03','Sun, Setting','Note №14','Print 22'][i]}</div>
              <div className="col-span-2 mono text-[11px]">{['0xCarmen','thora.k','studio_ng','merrick','0xCarmen','j.lim','novak','quint'][i]}</div>
              <div className="col-span-2 mono text-[11px] text-[var(--muted)]">{['12 Apr','03 Apr','28 Mar','17 Mar','02 Mar','19 Feb','11 Feb','01 Feb']} 2026</div>
              <div className="col-span-2 mono text-right">${fmt([1280,840,420,1640,720,360,2200,540][i])}</div>
              <div className="col-span-1 text-right"><ArrowUpRight size={14} className="inline"/></div>
            </div>
          ))}
        </div>
      )}

      {tab === 'about' && (
        <div className="grid grid-cols-12 gap-10">
          <div className="col-span-7">
            <div className="label mb-4">Statement</div>
            <p className="text-[18px] leading-relaxed">
              {artist.bio} I work mostly mornings, mostly alone, mostly in {artist.city}. The work is digital but the rhythm is analogue — paper notes, then files, then more paper. Commissions are open in batches; auctions run Sunday to Thursday.
            </p>
            <div className="label mt-8 mb-4">Selected exhibitions</div>
            <div className="space-y-2">
              {[
                {y:'2026', t:'Solo — Halftones, Index Gallery, Zurich'},
                {y:'2025', t:'Group — Print/Now, MK Centre, Antwerp'},
                {y:'2024', t:'Online — FORMA artists in residence, vol. 02'},
              ].map((e,i)=>(
                <div key={i} className="hair-b py-3 flex gap-6">
                  <span className="mono text-[12px] text-[var(--muted)]">{e.y}</span>
                  <span className="text-[14px]">{e.t}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="col-span-5">
            <div className="hair-all p-6 bg-[var(--card)]">
              <div className="label">Studio</div>
              <div className="mt-4 grid grid-cols-2 gap-y-3 text-[13px]">
                <span className="text-[var(--muted)]">Based in</span><span>{artist.city}</span>
                <span className="text-[var(--muted)]">Active since</span><span>{artist.joined}</span>
                <span className="text-[var(--muted)]">Tools</span><span>Cinema 4D, custom code</span>
                <span className="text-[var(--muted)]">Ships to</span><span>Worldwide (DHL)</span>
                <span className="text-[var(--muted)]">Languages</span><span>EN, DE</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

// ============================================================
// COMMISSIONS BOARD
// ============================================================
const CommissionCard = ({ commission }) => {
  const a = artistById(commission.artist);
  const left = commission.slots - commission.taken;
  const full = left === 0;
  return (
    <div className={`hair-all p-6 bg-[var(--card)] transition-all ${full ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10" style={{background:a.accent}}/>
          <div>
            <div className="text-[13px] font-medium">{a.name}</div>
            <div className="mono text-[10px] text-[var(--muted)]">{a.handle}</div>
          </div>
        </div>
        <span className={`mono text-[10px] uppercase tracking-[0.12em] px-2 py-1 ${full ? 'bg-[var(--ink)] text-[var(--bg)]' : 'bg-[var(--accent-soft)] text-[var(--accent)]'}`}>
          {full ? 'FULL' : `${left} OF ${commission.slots} LEFT`}
        </span>
      </div>
      <div className="display text-[28px] mt-5">{commission.title}</div>
      <p className="text-[13px] mt-3 text-[var(--ink-2)] leading-relaxed">{commission.brief}</p>

      <div className="grid grid-cols-3 gap-3 mt-6 hair-t pt-4">
        <div>
          <div className="label">Price</div>
          <div className="mono text-[20px] mt-1">${fmt(commission.price)}</div>
        </div>
        <div>
          <div className="label">Delivery</div>
          <div className="mono text-[20px] mt-1">{commission.days}d</div>
        </div>
        <div>
          <div className="label">Slots</div>
          <div className="mono text-[20px] mt-1">{commission.taken}/{commission.slots}</div>
        </div>
      </div>

      {/* Slot bar */}
      <div className="mt-4 flex gap-1">
        {Array.from({length: commission.slots}).map((_,i) => (
          <div key={i} className={`flex-1 h-2 hair-all ${i < commission.taken ? 'bg-[var(--ink)]' : ''}`}/>
        ))}
      </div>

      <button disabled={full} className={`swiss-btn w-full mt-5 justify-center ${full ? 'opacity-50 cursor-not-allowed' : 'accent'}`}>
        {full ? <>Waitlist <Plus size={12}/></> : <>Book a slot <ArrowRight size={12}/></>}
      </button>
    </div>
  );
};

const CommissionsView = ({ goToArtist }) => {
  const [filter, setFilter] = useState('all');
  let visible = COMMISSIONS;
  if (filter === 'open') visible = visible.filter(c => c.slots - c.taken > 0);
  if (filter === 'cheap') visible = [...visible].sort((a,b) => a.price - b.price);
  if (filter === 'fast') visible = [...visible].sort((a,b) => a.days - b.days);

  return (
    <main className="fade-in max-w-[1440px] mx-auto px-8 py-12">
      <div className="grid grid-cols-12 gap-8 mb-16">
        <div className="col-span-7">
          <div className="label mb-6">№ 06 — Commissions</div>
          <h1 className="display text-[96px] leading-[0.9] tracking-[-0.045em]">
            Book a slot.<br/>
            Pay up front.<br/>
            <span style={{color:'var(--accent)'}}>Get it made.</span>
          </h1>
        </div>
        <div className="col-span-5">
          <p className="text-[16px] mt-6 leading-relaxed text-[var(--ink-2)] max-w-[420px]">
            Every commission is prepaid into escrow and released to the artist when you accept delivery. Refunded automatically if the deadline passes.
          </p>
          <div className="hair-all p-5 mt-8">
            <div className="label">How it works</div>
            <div className="mt-3 space-y-2 text-[13px]">
              {['Pick a slot from an open commission.','Pay the full amount — held in escrow.','Brief the artist. Approve drafts.','Funds release on delivery, or refund on miss.'].map((s,i)=>(
                <div key={i} className="flex gap-3 hair-b pb-2 last:hair-b-0">
                  <span className="mono text-[var(--accent)] text-[12px]">0{i+1}</span>
                  <span>{s}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="hair-b pb-4 flex justify-between items-baseline mb-8">
        <h2 className="display text-[36px]">Open boards</h2>
        <div className="flex gap-2">
          {[{k:'all',l:'All'},{k:'open',l:'Open slots'},{k:'cheap',l:'Lowest first'},{k:'fast',l:'Fastest'}].map(f => (
            <button key={f.k} onClick={() => setFilter(f.k)} className={`tab-pill ${filter===f.k ? 'active':''}`}>{f.l}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {visible.map(c => <CommissionCard key={c.id} commission={c}/>)}
      </div>
    </main>
  );
};

// ============================================================
// SOCIAL FEED
// ============================================================
const FeedView = ({ goToArtwork, goToArtist, follows, toggleFollow, likes, toggleLike }) => {
  const [tab, setTab] = useState('latest');
  const [composer, setComposer] = useState('');

  return (
    <main className="fade-in max-w-[1440px] mx-auto px-8 py-10">
      <div className="hair-b pb-4 mb-8 flex justify-between items-end">
        <div>
          <div className="label mb-2">№ 07 — Feed</div>
          <h1 className="display text-[64px] leading-[0.9]">What the studios are saying.</h1>
        </div>
        <div className="flex gap-2">
          {[{k:'latest',l:'Latest'},{k:'following',l:'Following'},{k:'drops',l:'Drops only'}].map(t => (
            <button key={t.k} onClick={() => setTab(t.k)} className={`tab-pill ${tab===t.k ? 'active':''}`}>{t.l}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-10">
        {/* MAIN COLUMN */}
        <div className="col-span-7">
          <div className="hair-all p-5 mb-8 bg-[var(--card)]">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 bg-[var(--ink)] flex-shrink-0"/>
              <textarea value={composer} onChange={e => setComposer(e.target.value)} className="swiss-input border-none flex-1 resize-none" rows="2" placeholder="Post a note, share a process shot, announce a drop..."/>
            </div>
            <div className="flex justify-between items-center mt-3 hair-t pt-3">
              <div className="flex gap-3 label">
                <span className="cursor-pointer hover:text-[var(--ink)] flex items-center gap-1"><ImageIcon size={12}/> Image</span>
                <span className="cursor-pointer hover:text-[var(--ink)] flex items-center gap-1"><Tag size={12}/> Tag work</span>
                <span className="cursor-pointer hover:text-[var(--ink)] flex items-center gap-1"><Hash size={12}/> Topic</span>
              </div>
              <button className="swiss-btn" disabled={!composer}>Post <Send size={12}/></button>
            </div>
          </div>

          <div className="space-y-0">
            {FEED_POSTS.map(p => {
              const a = artistById(p.artist);
              const w = p.artwork ? artworkById(p.artwork) : null;
              return (
                <div key={p.id} className="hair-b py-8">
                  <div className="flex items-start gap-4">
                    <div onClick={() => goToArtist(a.id)} className="w-11 h-11 flex-shrink-0 cursor-pointer" style={{background:a.accent}}/>
                    <div className="flex-1">
                      <div className="flex items-baseline justify-between">
                        <div>
                          <span onClick={() => goToArtist(a.id)} className="font-medium text-[14px] cursor-pointer underline-hover">{a.name}</span>
                          {a.verified && <span className="text-[var(--accent)] ml-1 text-[11px]">●</span>}
                          <span className="mono text-[11px] text-[var(--muted)] ml-2">{a.handle}</span>
                          <span className="mono text-[11px] text-[var(--muted)] ml-2">· {p.when}</span>
                        </div>
                        <span className={`mono text-[9px] uppercase tracking-[0.15em] px-2 py-0.5 ${p.type==='drop'?'bg-[var(--accent)] text-white':p.type==='sold'?'bg-[var(--good)] text-white':'hair-all'}`}>{p.type}</span>
                      </div>
                      <p className="mt-3 text-[15px] leading-relaxed">{p.text}</p>
                      {w && (
                        <div onClick={() => goToArtwork(w.id)} className="mt-4 hair-all cursor-pointer flex gap-4 p-3 group hover:bg-[var(--card)]">
                          <div className="w-20 h-20 hair-all flex-shrink-0">
                            <ArtVisual visual={w.visual}/>
                          </div>
                          <div className="flex-1 flex flex-col justify-between">
                            <div>
                              <div className="display text-[20px] leading-tight">{w.title}</div>
                              <div className="mono text-[10px] text-[var(--muted)] mt-1">{w.dim} · {w.edition}</div>
                            </div>
                            <div className="flex justify-between items-baseline">
                              <div className="mono text-[11px]">Now at <span className="text-[var(--ink)] font-medium">${fmt(w.currentBid)}</span></div>
                              <ArrowUpRight size={16} className="art-arrow"/>
                            </div>
                          </div>
                        </div>
                      )}
                      <div className="flex gap-5 mt-4 label">
                        <span className="cursor-pointer hover:text-[var(--accent)] flex items-center gap-1.5"><Heart size={11}/> {p.likes}</span>
                        <span className="cursor-pointer hover:text-[var(--ink)] flex items-center gap-1.5"><MessageCircle size={11}/> {p.comments}</span>
                        <span className="cursor-pointer hover:text-[var(--ink)] flex items-center gap-1.5"><Share2 size={11}/> Share</span>
                        <span className="cursor-pointer hover:text-[var(--ink)] flex items-center gap-1.5 ml-auto"><Bookmark size={11}/> Save</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* SIDEBAR */}
        <div className="col-span-5 space-y-8">
          <div className="hair-all p-6 bg-[var(--card)]">
            <div className="label mb-4">Suggested studios</div>
            {ARTISTS.slice(0,4).map(a => {
              const f = follows[a.id];
              return (
                <div key={a.id} className="flex items-center justify-between py-3 hair-b last:border-0">
                  <div onClick={() => goToArtist(a.id)} className="flex items-center gap-3 cursor-pointer flex-1 min-w-0">
                    <div className="w-9 h-9 flex-shrink-0" style={{background:a.accent}}/>
                    <div className="min-w-0">
                      <div className="text-[13px] font-medium truncate">{a.name}{a.verified && <span className="text-[var(--accent)] ml-1 text-[11px]">●</span>}</div>
                      <div className="mono text-[10px] text-[var(--muted)] truncate">{a.handle} · {fmt(a.followers)}</div>
                    </div>
                  </div>
                  <button onClick={() => toggleFollow(a.id)} className={`mono text-[10px] uppercase tracking-[0.1em] px-3 py-1.5 transition-colors ${f ? 'hair-all text-[var(--muted)]' : 'bg-[var(--ink)] text-[var(--bg)]'}`}>
                    {f ? 'Following' : 'Follow'}
                  </button>
                </div>
              );
            })}
          </div>

          <div className="hair-all p-6">
            <div className="label mb-4">Trending tags</div>
            <div className="flex flex-wrap gap-2">
              {['halftone','riso','typography','glitch','bauhaus','topography','color-blocks','ascii','1/1','minimal','print-ready','generative'].map(t => (
                <span key={t} className="hair-all px-2.5 py-1 mono text-[10px] uppercase tracking-[0.1em] cursor-pointer hover:bg-[var(--ink)] hover:text-[var(--bg)]">#{t}</span>
              ))}
            </div>
          </div>

          <div className="hair-all p-6 bg-[var(--ink)] text-[var(--bg)]">
            <div className="label" style={{color:'#9C988A'}}>Drop alerts</div>
            <div className="display text-[28px] mt-3 leading-tight">Get notified 6 hours before public drops.</div>
            <input className="swiss-input mt-5 text-[var(--bg)] border-[#3a3a36]" placeholder="your@email"/>
            <button className="swiss-btn accent w-full justify-center mt-3">Subscribe <ArrowRight size={12}/></button>
          </div>
        </div>
      </div>
    </main>
  );
};

// ============================================================
// ARTISTS DIRECTORY
// ============================================================
const ArtistsView = ({ goToArtist, follows, toggleFollow }) => (
  <main className="fade-in max-w-[1440px] mx-auto px-8 py-12">
    <div className="grid grid-cols-12 gap-8 mb-12 hair-b pb-12">
      <div className="col-span-8">
        <div className="label mb-4">№ 08 — Directory</div>
        <h1 className="display text-[96px] leading-[0.9] tracking-[-0.045em]">
          {ARTISTS.length * 43} studios.<br/>
          Six in residence.
        </h1>
      </div>
      <div className="col-span-4 flex items-end">
        <p className="text-[15px] text-[var(--ink-2)] leading-relaxed">
          Every artist on FORMA is vetted, takes a flat fee, and runs their own shop. Filter by city, medium, or availability.
        </p>
      </div>
    </div>
    <div className="grid grid-cols-2 gap-6">
      {ARTISTS.map(a => {
        const works = ARTWORKS.filter(w => w.artist === a.id);
        const f = follows[a.id];
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
                <div className="flex gap-4 label">
                  <span>{fmt(a.followers)} followers</span>
                  <span>{works.length} works</span>
                </div>
                <button onClick={() => toggleFollow(a.id)} className={`mono text-[10px] uppercase tracking-[0.1em] px-3 py-1.5 transition-colors ${f ? 'hair-all text-[var(--muted)]' : 'bg-[var(--ink)] text-[var(--bg)]'}`}>
                  {f ? <><Check size={10} className="inline mr-1"/> Following</> : <><Plus size={10} className="inline mr-1"/> Follow</>}
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  </main>
);

// ============================================================
// BUYER DASHBOARD
// ============================================================
const BuyerDashboard = ({ goToArtwork, likes, toggleLike, bids }) => {
  const [tab, setTab] = useState('bids');

  return (
    <main className="fade-in max-w-[1440px] mx-auto px-8 py-10">
      <div className="hair-b pb-4 mb-8 flex justify-between items-end">
        <div>
          <div className="label mb-2">№ DASHBOARD — Buyer / 0xCarmen</div>
          <h1 className="display text-[56px] leading-tight">Hello, Carmen.</h1>
        </div>
        <button className="swiss-btn ghost">Account settings</button>
      </div>

      <div className="grid grid-cols-4 gap-5 mb-10">
        {[
          {l:'Active bids', v:'7', d:'2 leading'},
          {l:'In escrow', v:'$1,840', d:'1 commission'},
          {l:'Acquired', v:'14 works', d:'$8,420 lifetime'},
          {l:'Watching', v:'23', d:'4 ending today'},
        ].map((s,i) => (
          <div key={i} className="hair-all p-5 bg-[var(--card)]">
            <div className="label">{s.l}</div>
            <div className="mono text-[36px] mt-2 leading-none">{s.v}</div>
            <div className="text-[12px] text-[var(--muted)] mt-2">{s.d}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-6">
        {[{k:'bids',l:'My bids'},{k:'watching',l:'Watching'},{k:'acquired',l:'Acquired'},{k:'commissions',l:'Commissions'}].map(t => (
          <button key={t.k} onClick={() => setTab(t.k)} className={`tab-pill ${tab===t.k?'active':''}`}>{t.l}</button>
        ))}
      </div>

      {tab === 'bids' && (
        <div>
          <div className="grid grid-cols-12 gap-4 label hair-b pb-3">
            <div className="col-span-1">№</div>
            <div className="col-span-5">Work</div>
            <div className="col-span-2">Your bid</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2 text-right">Ends in</div>
          </div>
          {ARTWORKS.slice(0,7).map((w,i) => {
            const isLeading = i % 3 === 0;
            const isOutbid = i % 3 === 1;
            return (
              <div key={w.id} onClick={() => goToArtwork(w.id)} className="grid grid-cols-12 gap-4 py-4 hair-b items-center cursor-pointer hover:bg-[var(--card)] transition-colors">
                <div className="col-span-1 mono text-[11px] text-[var(--muted)]">{String(i+1).padStart(3,'0')}</div>
                <div className="col-span-5 flex items-center gap-3">
                  <div className="w-12 h-12 hair-all flex-shrink-0">
                    <ArtVisual visual={w.visual}/>
                  </div>
                  <div>
                    <div className="text-[14px] font-medium">{w.title}</div>
                    <div className="mono text-[11px] text-[var(--muted)]">{artistById(w.artist).handle}</div>
                  </div>
                </div>
                <div className="col-span-2 mono text-[14px]">${fmt(w.currentBid - 20)}</div>
                <div className="col-span-2">
                  <span className={`mono text-[9px] uppercase tracking-[0.12em] px-2 py-1 ${isLeading ? 'bg-[var(--good)] text-white' : isOutbid ? 'bg-[var(--accent)] text-white' : 'hair-all'}`}>
                    {isLeading ? 'LEADING' : isOutbid ? 'OUTBID' : 'WATCHING'}
                  </span>
                </div>
                <div className="col-span-2 text-right mono text-[13px]">{formatTime(w.endsAt)}</div>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'watching' && (
        <div className="grid grid-cols-4 gap-6">
          {ARTWORKS.slice(2,10).map(w => (
            <ArtCard key={w.id} work={w} onClick={() => goToArtwork(w.id)} likes={likes} toggleLike={toggleLike}/>
          ))}
        </div>
      )}

      {tab === 'acquired' && (
        <div className="grid grid-cols-2 gap-6">
          {ARTWORKS.slice(4,8).map(w => (
            <div key={w.id} className="hair-all p-5 bg-[var(--card)] flex gap-5">
              <div className="w-32 h-32 hair-all flex-shrink-0"><ArtVisual visual={w.visual}/></div>
              <div className="flex-1">
                <div className="display text-[22px]">{w.title}</div>
                <div className="mono text-[11px] text-[var(--muted)] mt-1">{artistById(w.artist).handle} · won 23 Mar 2026</div>
                <div className="mt-4 grid grid-cols-2 gap-y-2 text-[12px]">
                  <span className="text-[var(--muted)]">Paid</span><span className="mono">${fmt(w.currentBid)}</span>
                  <span className="text-[var(--muted)]">Format</span><span>{w.format}</span>
                </div>
                <button className="swiss-btn mt-4 text-[10px]">Download files</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'commissions' && (
        <div className="space-y-4">
          {[
            {title:'Custom typographic poster', artist:'kestner.studio', stage:2, total:4, status:'In progress', due:'5d', amount:480},
            {title:'Topographic map, Faroe Islands', artist:'pauline.s', stage:4, total:4, status:'Awaiting review', due:'Now', amount:320},
          ].map((c,i) => (
            <div key={i} className="hair-all p-6 bg-[var(--card)]">
              <div className="flex justify-between items-start">
                <div>
                  <div className="display text-[24px]">{c.title}</div>
                  <div className="mono text-[11px] text-[var(--muted)] mt-1">with {c.artist}</div>
                </div>
                <span className="mono text-[9px] uppercase tracking-[0.15em] px-2 py-1 bg-[var(--accent-soft)] text-[var(--accent)]">{c.status}</span>
              </div>
              <div className="mt-5 flex gap-1">
                {['Booked','Brief','Drafts','Delivery'].map((s,j) => (
                  <div key={j} className="flex-1">
                    <div className={`h-1.5 ${j < c.stage ? 'bg-[var(--ink)]' : 'bg-[var(--hair)]'}`}/>
                    <div className="mono text-[9px] uppercase tracking-[0.1em] mt-2 text-[var(--muted)]">0{j+1} {s}</div>
                  </div>
                ))}
              </div>
              <div className="mt-5 pt-4 hair-t grid grid-cols-4 gap-4">
                <div><div className="label">Amount</div><div className="mono mt-1">${fmt(c.amount)}</div></div>
                <div><div className="label">Status</div><div className="mt-1 text-[13px]">Escrowed</div></div>
                <div><div className="label">Due</div><div className="mono mt-1">{c.due}</div></div>
                <div className="flex justify-end items-end"><button className="swiss-btn">Open thread <ArrowRight size={12}/></button></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
};

// ============================================================
// ARTIST STUDIO DASHBOARD
// ============================================================
const StudioDashboard = ({ goToArtwork, likes, toggleLike }) => {
  const [tab, setTab] = useState('overview');

  return (
    <main className="fade-in max-w-[1440px] mx-auto px-8 py-10">
      <div className="hair-b pb-4 mb-8 flex justify-between items-end">
        <div>
          <div className="label mb-2">№ STUDIO — Artist / kestner.studio</div>
          <h1 className="display text-[56px] leading-tight">Studio, today.</h1>
        </div>
        <div className="flex gap-3">
          <button className="swiss-btn ghost"><Plus size={12}/> New commission</button>
          <button className="swiss-btn"><Plus size={12}/> List new work</button>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-5 mb-10">
        {[
          {l:'Live auctions',v:'4',d:'2 ending today'},
          {l:'Open slots',v:'3 / 6',d:'Across 2 commissions'},
          {l:'In escrow',v:'$2,640',d:'4 commissions'},
          {l:'Payout (Mon)',v:'$3,920',d:'After 12% fee'},
          {l:'Followers',v:'+87',d:'Last 7 days'},
        ].map((s,i) => (
          <div key={i} className="hair-all p-5 bg-[var(--card)]">
            <div className="label">{s.l}</div>
            <div className="mono text-[28px] mt-2 leading-none">{s.v}</div>
            <div className="text-[12px] text-[var(--muted)] mt-2">{s.d}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-8">
        {[{k:'overview',l:'Overview'},{k:'auctions',l:'Auctions'},{k:'commissions',l:'Commissions'},{k:'payouts',l:'Payouts'},{k:'audience',l:'Audience'}].map(t => (
          <button key={t.k} onClick={() => setTab(t.k)} className={`tab-pill ${tab===t.k?'active':''}`}>{t.l}</button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-8">
            <div className="hair-b pb-3 mb-5 flex justify-between items-baseline">
              <h3 className="display text-[28px]">Revenue, 90 days</h3>
              <span className="mono text-[11px] text-[var(--muted)]">USD</span>
            </div>
            <div className="hair-all bg-[var(--card)] p-6">
              <svg viewBox="0 0 800 240" className="w-full">
                {/* Grid lines */}
                {[0,1,2,3,4].map(i => (
                  <line key={i} x1="0" y1={i*60} x2="800" y2={i*60} stroke="#D6D2C4" strokeWidth="0.5"/>
                ))}
                {/* Bars */}
                {Array.from({length: 30}).map((_,i) => {
                  const h = 30 + Math.abs(Math.sin(i*0.6)*100) + Math.random()*40;
                  return <rect key={i} x={i*26+4} y={240-h} width="20" height={h} fill={i === 22 ? '#FF3B1F' : '#0E0E0C'}/>;
                })}
                <line x1="0" y1="240" x2="800" y2="240" stroke="#0E0E0C"/>
              </svg>
              <div className="flex justify-between mono text-[10px] text-[var(--muted)] mt-2 px-1">
                <span>FEB 14</span><span>MAR 01</span><span>MAR 14</span><span>APR 01</span><span>APR 14</span><span>MAY 01</span><span>MAY 14</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-5 mt-5">
              <div className="hair-all p-4">
                <div className="label">Total</div>
                <div className="mono text-[24px] mt-1">$12,840</div>
              </div>
              <div className="hair-all p-4">
                <div className="label">Auctions</div>
                <div className="mono text-[24px] mt-1">$8,290</div>
              </div>
              <div className="hair-all p-4">
                <div className="label">Commissions</div>
                <div className="mono text-[24px] mt-1">$4,550</div>
              </div>
            </div>
          </div>
          <div className="col-span-4">
            <div className="hair-b pb-3 mb-5">
              <h3 className="display text-[24px]">To do</h3>
            </div>
            <div className="space-y-3">
              {[
                {p:'!', t:'Deliver: Halftone poster for thora.k', sub:'Due in 2 days · $480 in escrow'},
                {p:'·', t:'Approve draft from buyer: J. Lim', sub:'Brief approved 4h ago'},
                {p:'·', t:'Halftone Field №14 ends today', sub:'14 bids · $480 current top'},
                {p:'·', t:'Reply to 3 commission inquiries', sub:'Oldest 2 days ago'},
              ].map((todo,i) => (
                <div key={i} className="hair-all p-3 flex items-start gap-3 cursor-pointer hover:bg-[var(--card)]">
                  <span className={`mono text-[14px] ${todo.p === '!' ? 'text-[var(--accent)]' : 'text-[var(--muted)]'}`}>{todo.p}</span>
                  <div className="flex-1">
                    <div className="text-[13px] font-medium">{todo.t}</div>
                    <div className="text-[11px] text-[var(--muted)] mt-0.5">{todo.sub}</div>
                  </div>
                  <ChevronRight size={14} className="text-[var(--muted)]"/>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'auctions' && (
        <div>
          <div className="grid grid-cols-12 gap-4 label hair-b pb-3">
            <div className="col-span-1">№</div>
            <div className="col-span-4">Work</div>
            <div className="col-span-2">Bids</div>
            <div className="col-span-2">Current</div>
            <div className="col-span-2">Ends</div>
            <div className="col-span-1 text-right">Actions</div>
          </div>
          {ARTWORKS.filter(w => w.artist === 'a1').map((w,i) => (
            <div key={w.id} className="grid grid-cols-12 gap-4 py-4 hair-b items-center">
              <div className="col-span-1 mono text-[11px] text-[var(--muted)]">{String(i+1).padStart(3,'0')}</div>
              <div className="col-span-4 flex items-center gap-3">
                <div className="w-12 h-12 hair-all"><ArtVisual visual={w.visual}/></div>
                <div>
                  <div className="text-[14px] font-medium">{w.title}</div>
                  <div className="mono text-[11px] text-[var(--muted)]">Listed 5d ago</div>
                </div>
              </div>
              <div className="col-span-2 mono">{w.bids}</div>
              <div className="col-span-2 mono font-medium">${fmt(w.currentBid)}</div>
              <div className="col-span-2 mono text-[13px]">{formatTime(w.endsAt)}</div>
              <div className="col-span-1 text-right"><button className="hair-all w-7 h-7 inline-flex items-center justify-center"><MoreHorizontal size={14}/></button></div>
            </div>
          ))}
          <button className="swiss-btn mt-8"><Plus size={12}/> List new auction</button>
        </div>
      )}

      {tab === 'commissions' && (
        <div className="grid grid-cols-2 gap-6">
          {COMMISSIONS.filter(c => c.artist === 'a1').map(c => <CommissionCard key={c.id} commission={c}/>)}
          <div className="hair-all p-6 bg-[var(--card)] flex flex-col items-center justify-center text-center min-h-[300px]">
            <Plus size={24} className="text-[var(--muted)]"/>
            <div className="display text-[22px] mt-4">Open new commission</div>
            <div className="text-[12px] text-[var(--muted)] mt-1 max-w-[200px]">Set price, slots, brief, and delivery window.</div>
            <button className="swiss-btn mt-5">Create commission</button>
          </div>
        </div>
      )}

      {tab === 'payouts' && (
        <div>
          <div className="hair-all p-6 mb-8 bg-[var(--card)] grid grid-cols-4 gap-6">
            <div className="col-span-2">
              <div className="label">Next payout</div>
              <div className="display text-[48px] mt-2 leading-none">$3,920.00</div>
              <div className="mono text-[11px] text-[var(--muted)] mt-2">Monday 18 May · DE89 3704 …8910</div>
            </div>
            <div>
              <div className="label">Gross</div>
              <div className="mono text-[20px] mt-1">$4,454.55</div>
              <div className="label mt-3">Platform fee</div>
              <div className="mono text-[14px] text-[var(--muted)] mt-1">−$534.55 (12%)</div>
            </div>
            <div className="flex flex-col justify-end">
              <button className="swiss-btn ghost mb-2">Pause payouts</button>
              <button className="swiss-btn">Change account</button>
            </div>
          </div>

          <div className="hair-b pb-3 mb-4">
            <h3 className="display text-[24px]">Recent transactions</h3>
          </div>
          <div className="grid grid-cols-12 gap-4 label hair-b pb-2">
            <div className="col-span-1">№</div>
            <div className="col-span-3">Type</div>
            <div className="col-span-4">Reference</div>
            <div className="col-span-2">Date</div>
            <div className="col-span-2 text-right">Amount</div>
          </div>
          {[
            {t:'Auction won',r:'Halftone №09 — to 0xCarmen',d:'12 May',a:1280},
            {t:'Commission release',r:'Custom poster — j.lim',d:'10 May',a:480},
            {t:'Payout',r:'To DE89…8910',d:'06 May',a:-2840},
            {t:'Auction won',r:'A to Z — to thora.k',d:'03 May',a:840},
            {t:'Commission booked',r:'Slot 02 — k.osman',d:'01 May',a:480},
          ].map((tx,i) => (
            <div key={i} className="grid grid-cols-12 gap-4 py-3 hair-b items-center text-[13px]">
              <div className="col-span-1 mono text-[11px] text-[var(--muted)]">{String(i+1).padStart(3,'0')}</div>
              <div className="col-span-3">{tx.t}</div>
              <div className="col-span-4 text-[var(--muted)]">{tx.r}</div>
              <div className="col-span-2 mono text-[11px]">{tx.d} 2026</div>
              <div className={`col-span-2 mono text-right font-medium ${tx.a < 0 ? 'text-[var(--muted)]' : ''}`}>{tx.a < 0 ? '−' : '+'}${fmt(Math.abs(tx.a))}</div>
            </div>
          ))}
        </div>
      )}

      {tab === 'audience' && (
        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-8">
            <div className="hair-b pb-3 mb-5">
              <h3 className="display text-[28px]">Followers, 90 days</h3>
            </div>
            <div className="hair-all p-6 bg-[var(--card)]">
              <svg viewBox="0 0 800 200" className="w-full">
                <polyline
                  fill="none"
                  stroke="#0E0E0C"
                  strokeWidth="1.5"
                  points={Array.from({length:40}).map((_,i)=>`${i*20.5},${180 - i*3 - Math.sin(i*0.3)*15}`).join(' ')}
                />
                <polyline
                  fill="rgba(255,59,31,0.08)"
                  stroke="none"
                  points={`0,200 ${Array.from({length:40}).map((_,i)=>`${i*20.5},${180 - i*3 - Math.sin(i*0.3)*15}`).join(' ')} 800,200`}
                />
                {[0,1,2,3].map(i => (
                  <line key={i} x1="0" y1={i*50} x2="800" y2={i*50} stroke="#D6D2C4" strokeWidth="0.5"/>
                ))}
              </svg>
            </div>
            <div className="mt-8 hair-b pb-3 mb-5">
              <h3 className="display text-[28px]">Recent followers</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {['0xCarmen','thora.k','studio_ng','merrick','j.lim','novak','quint','rye'].map((u,i) => (
                <div key={i} className="hair-all p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[var(--ink)]"/>
                    <div>
                      <div className="text-[13px]">{u}</div>
                      <div className="mono text-[10px] text-[var(--muted)]">{i+1}h ago</div>
                    </div>
                  </div>
                  <button className="mono text-[10px] uppercase tracking-[0.1em] hair-all px-2 py-1">Follow back</button>
                </div>
              ))}
            </div>
          </div>
          <div className="col-span-4">
            <div className="hair-all p-5 bg-[var(--card)]">
              <div className="label">Reach this week</div>
              <div className="space-y-3 mt-4 text-[13px]">
                {[
                  {l:'Profile views',v:'2,840',c:'+18%'},
                  {l:'Work views',v:'12,902',c:'+9%'},
                  {l:'Feed impressions',v:'48,210',c:'+24%'},
                  {l:'Avg. time on work',v:'1m 12s',c:'+3%'},
                ].map((r,i) => (
                  <div key={i} className="hair-b pb-3 flex justify-between items-baseline">
                    <span className="text-[var(--muted)]">{r.l}</span>
                    <div className="text-right">
                      <div className="mono">{r.v}</div>
                      <div className="mono text-[10px] text-[var(--good)]">{r.c}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

// ============================================================
// ADMIN PANEL
// ============================================================
const AdminDashboard = ({ goToArtist }) => {
  const [tab, setTab] = useState('overview');

  return (
    <main className="fade-in max-w-[1440px] mx-auto px-8 py-10">
      <div className="hair-b pb-4 mb-8 flex justify-between items-end">
        <div>
          <div className="label mb-2 text-[var(--accent)]">№ ADMIN — Internal use only</div>
          <h1 className="display text-[56px] leading-tight">Operations.</h1>
        </div>
        <div className="flex items-center gap-3 mono text-[11px] uppercase tracking-[0.12em]">
          <span className="text-[var(--muted)]">Logged in as</span>
          <span>m.werner@forma.studio</span>
          <span className="bg-[var(--accent)] text-white px-2 py-0.5">SUPER</span>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-5 mb-10">
        {[
          {l:'Users (24h)',v:'+204',d:'12 artists, 192 buyers',hot:true},
          {l:'GMV today',v:'$48.2K',d:'+18% vs 7d avg'},
          {l:'Live auctions',v:'240',d:'18 ending in <1h'},
          {l:'In escrow',v:'$84,910',d:'62 commissions'},
          {l:'Open reports',v:'7',d:'2 high priority',hot:true},
        ].map((s,i) => (
          <div key={i} className={`p-5 ${s.hot ? 'hair-all bg-[var(--accent)] text-white' : 'hair-all bg-[var(--card)]'}`}>
            <div className={`label ${s.hot ? 'text-white opacity-70' : ''}`}>{s.l}</div>
            <div className="mono text-[28px] mt-2 leading-none">{s.v}</div>
            <div className={`text-[12px] mt-2 ${s.hot ? 'opacity-90' : 'text-[var(--muted)]'}`}>{s.d}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-8">
        {[
          {k:'overview',l:'Overview'},
          {k:'users',l:'Users'},
          {k:'auctions',l:'Auctions'},
          {k:'disputes',l:'Disputes · 7'},
          {k:'finance',l:'Finance'},
          {k:'audit',l:'Audit log'},
        ].map(t => (
          <button key={t.k} onClick={() => setTab(t.k)} className={`tab-pill ${tab===t.k?'active':''}`}>{t.l}</button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-8">
            <div className="hair-b pb-3 mb-5">
              <h3 className="display text-[28px]">Volume, 30 days</h3>
            </div>
            <div className="hair-all p-6 bg-[var(--card)]">
              <svg viewBox="0 0 800 220" className="w-full">
                {[0,1,2,3,4].map(i => <line key={i} x1="0" y1={i*55} x2="800" y2={i*55} stroke="#D6D2C4" strokeWidth="0.5"/>)}
                {Array.from({length:30}).map((_,i) => {
                  const h1 = 40 + Math.abs(Math.cos(i*0.4)*60);
                  const h2 = 20 + Math.abs(Math.sin(i*0.5)*40);
                  return (
                    <g key={i}>
                      <rect x={i*26+4} y={220-h1} width="10" height={h1} fill="#0E0E0C"/>
                      <rect x={i*26+15} y={220-h2} width="10" height={h2} fill="#FF3B1F"/>
                    </g>
                  );
                })}
                <line x1="0" y1="220" x2="800" y2="220" stroke="#0E0E0C"/>
              </svg>
              <div className="flex gap-4 mt-4 mono text-[11px]">
                <div className="flex items-center gap-2"><span className="w-3 h-3 bg-[var(--ink)] inline-block"/> Auctions</div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 bg-[var(--accent)] inline-block"/> Commissions</div>
              </div>
            </div>

            <div className="mt-8 hair-b pb-3 mb-5 flex justify-between items-baseline">
              <h3 className="display text-[28px]">Live high-value auctions</h3>
              <span className="mono text-[11px] text-[var(--muted)]">Real-time</span>
            </div>
            <div className="grid grid-cols-12 gap-4 label hair-b pb-2">
              <div className="col-span-1">№</div>
              <div className="col-span-4">Work</div>
              <div className="col-span-2">Artist</div>
              <div className="col-span-2">Bid</div>
              <div className="col-span-2">Ends</div>
              <div className="col-span-1 text-right">Flag</div>
            </div>
            {ARTWORKS.filter(w => w.currentBid > 400).slice(0,6).map((w,i) => (
              <div key={w.id} className="grid grid-cols-12 gap-4 py-3 hair-b items-center text-[13px]">
                <div className="col-span-1 mono text-[11px] text-[var(--muted)]">{w.id.toUpperCase()}</div>
                <div className="col-span-4">{w.title}</div>
                <div className="col-span-2 mono text-[11px]">{artistById(w.artist).handle}</div>
                <div className="col-span-2 mono font-medium">${fmt(w.currentBid)}</div>
                <div className="col-span-2 mono text-[11px]">{formatTime(w.endsAt)}</div>
                <div className="col-span-1 text-right"><Flag size={12} className="inline cursor-pointer text-[var(--muted)] hover:text-[var(--accent)]"/></div>
              </div>
            ))}
          </div>

          <div className="col-span-4 space-y-6">
            <div className="hair-all p-5">
              <div className="label mb-4">System health</div>
              <div className="space-y-2">
                {[
                  {l:'API latency p95',v:'124ms',ok:true},
                  {l:'Payment provider',v:'OK',ok:true},
                  {l:'Anti-snipe queue',v:'OK',ok:true},
                  {l:'File CDN',v:'Degraded',ok:false},
                  {l:'KYC backlog',v:'12 pending',ok:true},
                ].map((m,i) => (
                  <div key={i} className="flex justify-between items-center hair-b py-2 last:border-0">
                    <span className="text-[13px]">{m.l}</span>
                    <span className={`mono text-[11px] flex items-center gap-1.5 ${m.ok ? 'text-[var(--good)]' : 'text-[var(--accent)]'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${m.ok ? 'bg-[var(--good)]' : 'bg-[var(--accent)]'}`}/>
                      {m.v}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="hair-all p-5 bg-[var(--accent)] text-white">
              <div className="label text-white opacity-80">Action required</div>
              <div className="text-[15px] mt-3 leading-relaxed">2 disputes are above the 48h SLA threshold. One involves a commission worth $2,000.</div>
              <button className="swiss-btn mt-4 bg-white text-[var(--accent)] border-white">Review disputes</button>
            </div>
          </div>
        </div>
      )}

      {tab === 'users' && (
        <div>
          <div className="flex justify-between items-center mb-5">
            <div className="flex gap-2">
              <button className="tab-pill active">All</button>
              <button className="tab-pill">Artists</button>
              <button className="tab-pill">Buyers</button>
              <button className="tab-pill">Pending KYC</button>
              <button className="tab-pill">Suspended</button>
            </div>
            <div className="hair-all flex items-center gap-2 px-3 py-1.5">
              <Search size={12}/>
              <input className="bg-transparent outline-none mono text-[11px] uppercase tracking-wider w-[200px]" placeholder="search handle, email…"/>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-4 label hair-b pb-2">
            <div className="col-span-1">№</div>
            <div className="col-span-3">User</div>
            <div className="col-span-2">Role</div>
            <div className="col-span-2">Joined</div>
            <div className="col-span-1">KYC</div>
            <div className="col-span-2">Volume</div>
            <div className="col-span-1 text-right">Action</div>
          </div>
          {[
            ...ARTISTS.map(a => ({...a, role:'Artist', vol: 8400 + Math.floor(Math.random()*20000)})),
            {handle:'0xCarmen', name:'Carmen Adagio', role:'Buyer', joined:'2024', accent:'#0E0E0C', vol:8420},
            {handle:'thora.k', name:'Thora Karlsen', role:'Buyer', joined:'2025', accent:'#FF8A00', vol:4280},
            {handle:'studio_ng', name:'Ngozi Eze', role:'Buyer', joined:'2025', accent:'#1A4FFF', vol:12400},
          ].slice(0, 9).map((u,i) => (
            <div key={i} className="grid grid-cols-12 gap-4 py-3 hair-b items-center text-[13px] hover:bg-[var(--card)]">
              <div className="col-span-1 mono text-[11px] text-[var(--muted)]">U-{String(i+1024).padStart(4,'0')}</div>
              <div className="col-span-3 flex items-center gap-3">
                <div className="w-7 h-7 hair-all" style={{background:u.accent}}/>
                <div>
                  <div className="font-medium">{u.name}</div>
                  <div className="mono text-[10px] text-[var(--muted)]">@{u.handle}</div>
                </div>
              </div>
              <div className="col-span-2 mono text-[11px]">{u.role}</div>
              <div className="col-span-2 mono text-[11px]">{u.joined||'2024'}</div>
              <div className="col-span-1">
                <span className={`mono text-[9px] uppercase tracking-[0.1em] px-1.5 py-0.5 ${i % 5 === 4 ? 'bg-[var(--accent)] text-white' : 'hair-all'}`}>
                  {i % 5 === 4 ? 'PENDING' : 'VERIFIED'}
                </span>
              </div>
              <div className="col-span-2 mono">${fmt(u.vol)}</div>
              <div className="col-span-1 text-right"><MoreHorizontal size={14} className="inline cursor-pointer"/></div>
            </div>
          ))}
        </div>
      )}

      {tab === 'auctions' && (
        <div>
          <div className="grid grid-cols-12 gap-4 label hair-b pb-2">
            <div className="col-span-1">ID</div>
            <div className="col-span-4">Work</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2">Bid</div>
            <div className="col-span-2">Ends</div>
            <div className="col-span-1 text-right">Mod</div>
          </div>
          {ARTWORKS.map((w,i) => (
            <div key={w.id} className="grid grid-cols-12 gap-4 py-3 hair-b items-center text-[13px]">
              <div className="col-span-1 mono text-[11px] text-[var(--muted)]">{w.id.toUpperCase()}</div>
              <div className="col-span-4 flex items-center gap-3">
                <div className="w-9 h-9 hair-all"><ArtVisual visual={w.visual}/></div>
                <div>
                  <div>{w.title}</div>
                  <div className="mono text-[10px] text-[var(--muted)]">{artistById(w.artist).handle}</div>
                </div>
              </div>
              <div className="col-span-2">
                <span className={`mono text-[9px] uppercase tracking-[0.1em] px-1.5 py-0.5 ${w.endsAt < 1000*60*60*2 ? 'bg-[var(--accent)] text-white' : 'bg-[var(--good)] text-white'}`}>
                  {w.endsAt < 1000*60*60*2 ? 'ENDING' : 'LIVE'}
                </span>
              </div>
              <div className="col-span-2 mono">${fmt(w.currentBid)}</div>
              <div className="col-span-2 mono text-[11px]">{formatTime(w.endsAt)}</div>
              <div className="col-span-1 text-right flex gap-1 justify-end">
                <button className="hair-all w-6 h-6 inline-flex items-center justify-center"><Flag size={11}/></button>
                <button className="hair-all w-6 h-6 inline-flex items-center justify-center"><X size={11}/></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'disputes' && (
        <div className="space-y-4">
          {[
            {id:'D-0042', buyer:'thora.k', artist:'rfm.works', subject:'Commission not delivered by deadline', amount:2000, opened:'52h ago', priority:'high'},
            {id:'D-0041', buyer:'merrick', artist:'okonkwo.studio', subject:'Files corrupted on download', amount:320, opened:'18h ago', priority:'medium'},
            {id:'D-0040', buyer:'novak', artist:'fjeld.no', subject:'Shipping never arrived', amount:220, opened:'4d ago', priority:'high'},
            {id:'D-0039', buyer:'studio_ng', artist:'kestner.studio', subject:'Buyer requesting refund post-delivery', amount:480, opened:'1d ago', priority:'low'},
          ].map(d => (
            <div key={d.id} className="hair-all bg-[var(--card)] p-5">
              <div className="flex justify-between items-start">
                <div className="flex gap-4 items-start">
                  <span className={`mono text-[10px] uppercase tracking-[0.12em] px-2 py-1 ${d.priority==='high'?'bg-[var(--accent)] text-white':d.priority==='medium'?'bg-[#FFB200] text-[var(--ink)]':'hair-all'}`}>{d.priority}</span>
                  <div>
                    <div className="mono text-[11px] text-[var(--muted)]">{d.id} · Opened {d.opened}</div>
                    <div className="display text-[22px] mt-1">{d.subject}</div>
                    <div className="mono text-[11px] mt-2 text-[var(--muted)]">{d.buyer} vs. {d.artist} · ${fmt(d.amount)} in escrow</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="swiss-btn ghost">View thread</button>
                  <button className="swiss-btn">Resolve</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'finance' && (
        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-8">
            <div className="hair-b pb-3 mb-5">
              <h3 className="display text-[28px]">Platform revenue (12% take)</h3>
            </div>
            <div className="hair-all p-6 bg-[var(--card)]">
              <div className="grid grid-cols-3 gap-6 mb-6">
                <div><div className="label">This month</div><div className="display text-[36px] mt-1">$34.1K</div></div>
                <div><div className="label">Last month</div><div className="display text-[36px] mt-1 text-[var(--muted)]">$28.9K</div></div>
                <div><div className="label">YTD</div><div className="display text-[36px] mt-1">$184K</div></div>
              </div>
              <svg viewBox="0 0 800 160" className="w-full">
                {Array.from({length:12}).map((_,i) => {
                  const h = 40 + Math.abs(Math.sin(i*0.5)*70);
                  return <rect key={i} x={i*65+10} y={160-h} width="50" height={h} fill={i===10?'#FF3B1F':'#0E0E0C'}/>;
                })}
                <line x1="0" y1="160" x2="800" y2="160" stroke="#0E0E0C"/>
              </svg>
            </div>
          </div>
          <div className="col-span-4">
            <div className="hair-all p-5 bg-[var(--ink)] text-[var(--bg)]">
              <div className="label" style={{color:'#9C988A'}}>Monday payout run</div>
              <div className="display text-[40px] mt-2 leading-none">$48,290</div>
              <div className="mono text-[11px] mt-2" style={{color:'#9C988A'}}>To 86 artists · 18 May 09:00 UTC</div>
              <button className="swiss-btn accent w-full justify-center mt-5">Approve run</button>
            </div>
            <div className="hair-all p-5 mt-5">
              <div className="label">Fee adjustments</div>
              <div className="space-y-2 text-[13px] mt-3">
                <div className="hair-b pb-2 flex justify-between"><span>Standard fee</span><span className="mono">12.0%</span></div>
                <div className="hair-b pb-2 flex justify-between"><span>Verified artist</span><span className="mono">10.0%</span></div>
                <div className="hair-b pb-2 flex justify-between"><span>Residency</span><span className="mono">8.0%</span></div>
                <div className="flex justify-between"><span>Commissions</span><span className="mono">15.0%</span></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'audit' && (
        <div>
          <div className="grid grid-cols-12 gap-4 label hair-b pb-2">
            <div className="col-span-1">TS</div>
            <div className="col-span-2">Actor</div>
            <div className="col-span-3">Action</div>
            <div className="col-span-3">Target</div>
            <div className="col-span-2">Source</div>
            <div className="col-span-1 text-right">IP</div>
          </div>
          {[
            {t:'14:08:22', a:'m.werner', act:'approved.payout_run', tgt:'PR-2026-19', src:'admin.console'},
            {t:'14:02:11', a:'system', act:'auction.extended', tgt:'W08 (+90s)', src:'anti-snipe'},
            {t:'13:58:04', a:'b.hess', act:'resolved.dispute', tgt:'D-0038 (refund)', src:'admin.console'},
            {t:'13:54:00', a:'system', act:'kyc.verified', tgt:'U-1042', src:'persona.api'},
            {t:'13:48:33', a:'m.werner', act:'flagged.work', tgt:'W11 (review)', src:'admin.console'},
            {t:'13:40:12', a:'system', act:'payout.released', tgt:'$840 → DE89…8910', src:'stripe'},
            {t:'13:38:09', a:'a.ott', act:'updated.fees', tgt:'commissions 14→15%', src:'admin.console'},
          ].map((row,i) => (
            <div key={i} className="grid grid-cols-12 gap-4 py-2.5 hair-b items-center mono text-[11px]">
              <div className="col-span-1 text-[var(--muted)]">{row.t}</div>
              <div className="col-span-2">{row.a}</div>
              <div className="col-span-3 text-[var(--accent)]">{row.act}</div>
              <div className="col-span-3">{row.tgt}</div>
              <div className="col-span-2 text-[var(--muted)]">{row.src}</div>
              <div className="col-span-1 text-right text-[var(--muted)]">10.2.0.{i+12}</div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
};

// ============================================================
// MAIN APP
// ============================================================
export default function App() {
  const [view, setView] = useState('home');
  const [role, setRole] = useState('buyer');
  const [selectedArtwork, setSelectedArtwork] = useState(null);
  const [selectedArtist, setSelectedArtist] = useState(null);
  const [likes, setLikes] = useState({});
  const [follows, setFollows] = useState({});
  const [bids, setBids] = useState({});
  const [notif, setNotif] = useState(3);
  const [query, setQuery] = useState('');
  const [toast, setToast] = useState(null);

  const goToArtwork = (id) => { setSelectedArtwork(id); setView('artwork'); window.scrollTo(0,0); };
  const goToArtist = (id) => { setSelectedArtist(id); setView('artist'); window.scrollTo(0,0); };
  const toggleLike = (id) => setLikes(l => ({...l, [id]: !l[id]}));
  const toggleFollow = (id) => {
    setFollows(f => {
      const next = !f[id];
      setToast(next ? `Following ${artistById(id).name}` : `Unfollowed ${artistById(id).name}`);
      setTimeout(() => setToast(null), 2400);
      return {...f, [id]: next};
    });
  };
  const placeBid = (workId, amount) => {
    const w = artworkById(workId);
    if (amount < w.currentBid + 20) {
      setToast(`Bid must be at least $${fmt(w.currentBid + 20)}`);
      setTimeout(() => setToast(null), 2400);
      return;
    }
    setBids(b => ({
      ...b,
      [workId]: [{user:'0xCarmen', amount, when:'just now'}, ...(b[workId] || [
        { user: '0xCarmen', amount: w.currentBid, when: '2m ago' },
        { user: 'thora.k', amount: w.currentBid - 40, when: '14m ago' },
        { user: 'studio_ng', amount: w.currentBid - 80, when: '42m ago' },
      ])]
    }));
    setToast(`Bid of $${fmt(amount)} placed on ${w.title}`);
    setTimeout(() => setToast(null), 2800);
  };

  return (
    <div className="swiss-app min-h-screen">
      <GlobalStyles/>
      <Header view={view} setView={setView} role={role} setRole={setRole} notif={notif} query={query} setQuery={setQuery}/>

      {view === 'home' && <HomeView goToArtwork={goToArtwork} goToArtist={goToArtist} likes={likes} toggleLike={toggleLike}/>}
      {view === 'artwork' && selectedArtwork && <ArtworkView workId={selectedArtwork} goToArtwork={goToArtwork} goToArtist={goToArtist} likes={likes} toggleLike={toggleLike} bids={bids} placeBid={placeBid}/>}
      {view === 'artist' && selectedArtist && <ArtistView artistId={selectedArtist} goToArtwork={goToArtwork} follows={follows} toggleFollow={toggleFollow} likes={likes} toggleLike={toggleLike}/>}
      {view === 'commissions' && <CommissionsView goToArtist={goToArtist}/>}
      {view === 'feed' && <FeedView goToArtwork={goToArtwork} goToArtist={goToArtist} follows={follows} toggleFollow={toggleFollow} likes={likes} toggleLike={toggleLike}/>}
      {view === 'artists' && <ArtistsView goToArtist={goToArtist} follows={follows} toggleFollow={toggleFollow}/>}
      {view === 'dashboard' && <BuyerDashboard goToArtwork={goToArtwork} likes={likes} toggleLike={toggleLike} bids={bids}/>}
      {view === 'studio' && <StudioDashboard goToArtwork={goToArtwork} likes={likes} toggleLike={toggleLike}/>}
      {view === 'admin' && <AdminDashboard goToArtist={goToArtist}/>}

      <Footer/>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 hair-all px-5 py-3 bg-[var(--ink)] text-[var(--bg)] mono text-[11px] uppercase tracking-[0.12em] fade-in">
          {toast}
        </div>
      )}
    </div>
  );
}
