import React, { useState, useEffect } from 'react';
import {
  Search, Bell, User, ShoppingBag, Heart, Eye, Clock, Gavel, Plus,
  ArrowUpRight, ArrowRight, ArrowLeft, MessageCircle, Share2,
  TrendingUp, Users, DollarSign, AlertCircle, Check, X, Menu,
  Image as ImageIcon, Briefcase, Activity, Shield, ChevronRight,
  ChevronDown, Filter, Grid3x3, Rows3, Bookmark, MoreHorizontal,
  Calendar, Tag, MapPin, Hash, Send, Copy, Flag, Sparkles, LogOut
} from 'lucide-react';
import { useAuth } from './contexts/AuthContext';
import AuthPage from './pages/AuthPage';
import ART_VISUALS from './data/visuals';
import { useMarketplace } from './hooks/useMarketplace';
import {
  minimumBidIncrement, minimumNextBid, auctionBuyerPremium,
  auctionTotalCost, auctionUrgency, shouldExtendAuction, FEE_TIERS
} from './lib/domain';
import { useNotifications } from './hooks/useNotifications';

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
      --card-2: #F0EDE2;
      --card-ink: #171914;
      --card-muted: #625D50;
      --accent: #E97864;
      --accent-2: #B9C69A;
      --accent-soft: rgba(233, 120, 100, 0.16);
      --good: #1F6B3A;
      --paper-shadow: 0 20px 52px rgba(14, 14, 12, 0.08);
    }

    .swiss-app * {
      box-sizing: border-box;
      min-width: 0;
    }

    .swiss-app {
      font-family: 'Hanken Grotesk', system-ui, sans-serif;
      background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.28), transparent 22rem),
        var(--bg);
      color: var(--ink);
      font-feature-settings: "ss01", "cv11";
      -webkit-font-smoothing: antialiased;
      letter-spacing: 0;
      overflow-x: hidden;
      position: relative;
      isolation: isolate;
      min-width: 320px;
    }

    .swiss-app::before {
      content: '';
      position: fixed;
      inset: 0;
      z-index: 0;
      pointer-events: none;
      background-image: url("data:image/svg+xml;utf8,<svg viewBox='0 0 240 240' xmlns='http://www.w3.org/2000/svg'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.72' numOctaves='4'/><feColorMatrix values='0 0 0 0 0.09 0 0 0 0 0.08 0 0 0 0 0.05 0 0 0 0.10 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
      mix-blend-mode: multiply;
      opacity: 0.2;
    }

    .swiss-app > * {
      position: relative;
      z-index: 1;
    }

    .display { font-family: 'Bricolage Grotesque', serif; letter-spacing: 0; font-weight: 500; line-height: 0.92; }
    .mono { font-family: 'JetBrains Mono', monospace; font-feature-settings: "ss02"; letter-spacing: 0; }
    .label { font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 0; text-transform: uppercase; color: var(--muted); }
    .label-ink { font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 0; text-transform: uppercase; color: var(--ink); }

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
      mix-blend-mode: soft-light;
      opacity: 0.5;
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

    .swiss-app [class*="bg-[var(--card)]"],
    .swiss-app [style*="background: var(--card)"],
    .auth-form-panel {
      color: var(--card-ink);
      background-image:
        linear-gradient(135deg, rgba(255, 255, 255, 0.28), transparent 46%),
        linear-gradient(0deg, rgba(23, 25, 20, 0.025), rgba(23, 25, 20, 0.025));
      box-shadow: inset 0 0 0 1px rgba(23, 25, 20, 0.02);
    }

    .swiss-app [class*="bg-[var(--card)]"] .label,
    .swiss-app [style*="background: var(--card)"] .label,
    .auth-form-panel .label {
      color: var(--card-muted);
    }

    .swiss-app [class*="bg-[var(--card)]"] [class*="text-[var(--ink)]"],
    .swiss-app [style*="background: var(--card)"] [class*="text-[var(--ink)]"],
    .auth-form-panel [class*="text-[var(--ink)]"] {
      color: var(--card-ink) !important;
    }

    .swiss-app [class*="bg-[var(--card)]"] [class*="text-[var(--ink-2)]"],
    .swiss-app [class*="bg-[var(--card)]"] [class*="text-[var(--muted)]"],
    .swiss-app [style*="background: var(--card)"] [class*="text-[var(--ink-2)]"],
    .swiss-app [style*="background: var(--card)"] [class*="text-[var(--muted)]"],
    .auth-form-panel [class*="text-[var(--ink-2)]"],
    .auth-form-panel [class*="text-[var(--muted)]"] {
      color: var(--card-muted) !important;
    }

    .swiss-app [class*="bg-[var(--card)]"] [class*="bg-[var(--ink)]"],
    .auth-form-panel [class*="bg-[var(--ink)]"] {
      background-color: var(--card-ink) !important;
      border-color: var(--card-ink) !important;
      color: var(--card) !important;
    }

    .swiss-app [class*="bg-[var(--card)]"] .swiss-btn:not(.accent),
    .auth-form-panel .swiss-btn:not(.accent) {
      background: var(--card-ink);
      border-color: var(--card-ink);
      color: var(--card);
    }

    .swiss-app [class*="bg-[var(--card)]"] .swiss-btn.ghost,
    .auth-form-panel .swiss-btn.ghost {
      background: transparent;
      color: var(--card-ink);
    }

    .swiss-app [class*="bg-[var(--card)]"] .swiss-btn:hover,
    .auth-form-panel .swiss-btn:hover {
      background: var(--accent);
      border-color: var(--accent);
      color: white;
    }

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

    .art-card .hair-all.relative {
      background: var(--card);
      box-shadow: var(--paper-shadow);
    }

    .art-card .hair-all.relative::after {
      content: '';
      position: absolute;
      inset: 0;
      z-index: 1;
      pointer-events: none;
      background:
        linear-gradient(128deg, rgba(255, 255, 255, 0.16), transparent 38%),
        linear-gradient(24deg, rgba(233, 120, 100, 0.14), transparent 54%);
      mix-blend-mode: multiply;
      opacity: 0.42;
    }

    .art-card .hair-all.relative > button,
    .art-card .hair-all.relative > .absolute {
      z-index: 2;
    }

    .art-card svg {
      filter: saturate(0.82) contrast(0.96) sepia(0.08);
    }

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

    .auth-form-panel {
      background-color: var(--card);
      border: 1px solid rgba(242, 238, 227, 0.2);
      padding: clamp(1.25rem, 3.5vw, 2.5rem);
      box-shadow: var(--paper-shadow);
    }

    .auth-form-panel input.swiss-input,
    .auth-form-panel textarea.swiss-input {
      color: var(--card-ink);
      border-color: rgba(23, 25, 20, 0.22);
    }

    .auth-form-panel input.swiss-input:focus,
    .auth-form-panel textarea.swiss-input:focus {
      border-color: var(--card-ink);
    }

    .auth-gallery-panel {
      color: #F2EEE3;
      background:
        linear-gradient(145deg, rgba(242, 238, 227, 0.14), transparent 34%),
        linear-gradient(24deg, rgba(233, 120, 100, 0.28), transparent 56%),
        linear-gradient(180deg, #24271F 0%, #171914 100%);
    }

    .auth-gallery-panel::before {
      content: '';
      position: absolute;
      inset: 0;
      pointer-events: none;
      background:
        repeating-linear-gradient(0deg, rgba(242, 238, 227, 0.06) 0 1px, transparent 1px 86px),
        repeating-linear-gradient(90deg, rgba(242, 238, 227, 0.04) 0 1px, transparent 1px 86px);
      mix-blend-mode: screen;
      opacity: 0.5;
    }

    .auth-gallery-panel::after {
      content: '';
      position: absolute;
      inset: 0;
      pointer-events: none;
      background-image: url("data:image/svg+xml;utf8,<svg viewBox='0 0 240 240' xmlns='http://www.w3.org/2000/svg'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.56' numOctaves='4'/><feColorMatrix values='0 0 0 0 0.95 0 0 0 0 0.92 0 0 0 0 0.84 0 0 0 0.20 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
      mix-blend-mode: soft-light;
      opacity: 0.58;
    }

    .ticker-strip,
    .footer-panel {
      background: #171914;
      color: #EFEDE5;
    }

    .swiss-app svg [fill="#0E0E0C"] { fill: var(--card-ink); }
    .swiss-app svg [stroke="#0E0E0C"] { stroke: var(--card-ink); }
    .swiss-app svg [fill="#EFEDE5"],
    .swiss-app svg [fill="#FBFAF5"] { fill: var(--card); }
    .swiss-app svg [fill="#FF3B1F"] { fill: var(--accent); }
    .swiss-app svg [fill="#FFB200"] { fill: #D2BE76; }
    .swiss-app svg [fill="#1A4FFF"] { fill: #6E8D8A; }
    .swiss-app svg [fill="#0E7C3A"] { fill: #748D60; }
    .swiss-app svg [stop-color="#FF3B1F"] { stop-color: var(--accent); }
    .swiss-app svg [stop-color="#FFB200"] { stop-color: #D2BE76; }
    .swiss-app svg [stop-color="#EFEDE5"] { stop-color: var(--card); }
    .swiss-app svg [stop-color="#0E0E0C"] { stop-color: var(--card-ink); }

    .scroll-hide::-webkit-scrollbar { display: none; }
    .scroll-hide { -ms-overflow-style: none; scrollbar-width: none; }

    .swiss-app svg,
    .swiss-app img,
    .swiss-app video,
    .swiss-app canvas {
      max-width: 100%;
    }

    .swiss-app h1,
    .swiss-app h2,
    .swiss-app h3,
    .swiss-app p,
    .swiss-app .display,
    .swiss-app .mono,
    .swiss-app .label {
      overflow-wrap: anywhere;
    }

    .swiss-app [class*="tracking-"] {
      letter-spacing: 0 !important;
    }

    .mobile-only {
      display: none;
    }

    .swiss-app header .display {
      white-space: nowrap;
      overflow-wrap: normal;
    }

    .user-menu-panel a,
    .user-menu-panel button {
      color: var(--card-ink);
    }

    @media (max-width: 1180px) {
      .swiss-app header > div,
      .swiss-app main.max-w-\\[1440px\\],
      .swiss-app main > section,
      .swiss-app footer > div {
        padding-left: 1.25rem !important;
        padding-right: 1.25rem !important;
      }

      .swiss-app [class*="grid-cols-12"] {
        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      }

      .swiss-app [class*="grid-cols-5"],
      .swiss-app [class*="grid-cols-4"],
      .swiss-app [class*="grid-cols-3"] {
        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      }

      .swiss-app [class*="col-span-"] {
        grid-column: 1 / -1 !important;
      }

      .swiss-app h1.display {
        font-size: clamp(3.75rem, 9vw, 6.75rem) !important;
        line-height: 0.96 !important;
      }

      .swiss-app h2.display {
        font-size: clamp(2.5rem, 7vw, 4.75rem) !important;
        line-height: 0.98 !important;
      }

      .swiss-app h3.display {
        font-size: clamp(1.75rem, 5vw, 2.6rem) !important;
      }
    }

    @media (max-width: 860px) {
      .swiss-app header {
        position: sticky;
      }

      .swiss-app header > div {
        height: auto !important;
        min-height: 68px;
        align-items: stretch !important;
        flex-direction: column;
        gap: 0.75rem;
        padding-top: 0.85rem;
        padding-bottom: 0.85rem;
      }

      .swiss-app header > div > div {
        width: 100%;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem !important;
      }

      .swiss-app header nav {
        width: 100%;
        gap: 1rem !important;
        overflow-x: auto;
        padding-bottom: 0.15rem;
        scrollbar-width: none;
      }

      .swiss-app header nav::-webkit-scrollbar {
        display: none;
      }

      .swiss-app header nav a {
        flex: 0 0 auto;
      }

      .swiss-app header > div > div:last-child {
        flex-wrap: wrap;
      }

      .swiss-app header .w-\\[280px\\] {
        width: auto !important;
        flex: 1 1 260px;
      }

      .swiss-app header .hair-all.flex.items-center.divide-x {
        flex: 1 1 100%;
      }

      .swiss-app header .hair-all.flex.items-center.divide-x button {
        flex: 1 1 0;
        min-height: 40px;
      }

      .swiss-app .flex.items-end.justify-between,
      .swiss-app .flex.items-baseline.justify-between,
      .swiss-app .flex.justify-between.items-end {
        align-items: flex-start !important;
        flex-direction: column;
        gap: 1rem;
      }

      .swiss-app .tab-pill,
      .swiss-app .swiss-btn,
      .swiss-app button.hair-all {
        min-height: 40px;
      }

      .swiss-app .tab-pill {
        flex: 1 1 auto;
        text-align: center;
      }
    }

    @media (max-width: 640px) {
      .swiss-app header > div,
      .swiss-app main.max-w-\\[1440px\\],
      .swiss-app main > section,
      .swiss-app footer > div {
        padding-left: 1rem !important;
        padding-right: 1rem !important;
      }

      .swiss-app main.max-w-\\[1440px\\],
      .swiss-app main > section {
        padding-top: 2rem !important;
        padding-bottom: 2rem !important;
      }

      .swiss-app [class*="grid-cols-"] {
        grid-template-columns: minmax(0, 1fr) !important;
      }

      .swiss-app [class*="col-span-"] {
        grid-column: 1 / -1 !important;
      }

      .swiss-app .grid.label.hair-b {
        display: none !important;
      }

      .swiss-app h1.display {
        font-size: clamp(1.9rem, 9vw, 2.6rem) !important;
        line-height: 1 !important;
      }

      .swiss-app h2.display {
        font-size: clamp(2rem, 9vw, 3.1rem) !important;
        line-height: 1 !important;
      }

      .swiss-app header > div > div:first-child {
        align-items: flex-start !important;
        flex-direction: column;
      }

      .swiss-app header > div > div:last-child > button {
        flex: 0 0 44px;
        order: 3;
      }

      .swiss-app header .w-\\[280px\\] {
        flex-basis: 100%;
        order: 1;
      }

      .swiss-app header .hair-all.flex.items-center.divide-x {
        flex-basis: 100%;
        display: grid !important;
        grid-template-columns: minmax(0, 1fr);
        max-width: 100%;
        order: 2;
        overflow: hidden;
        width: 100% !important;
      }

      .swiss-app header .hair-all.flex.items-center.divide-x button {
        min-width: 0;
        padding-left: 0.15rem !important;
        padding-right: 0.15rem !important;
        font-size: 8px !important;
        justify-content: center;
        white-space: nowrap;
      }

      .swiss-app header .user-menu {
        width: 100%;
        order: 3;
      }

      .swiss-app header .user-menu > button {
        width: 100%;
        justify-content: space-between;
      }

      .swiss-app header .user-menu-panel {
        left: 0;
        right: 0;
        width: 100% !important;
      }

      .swiss-app h1.display span.italic {
        display: block;
      }

      .swiss-app .label.flex {
        flex-wrap: wrap;
        line-height: 1.45;
      }

      .swiss-app .label.flex .w-8 {
        display: none;
      }

      .mobile-only {
        display: block;
      }

      .swiss-app .display.text-\\[64px\\],
      .swiss-app .display.text-\\[56px\\],
      .swiss-app .display.text-\\[48px\\],
      .swiss-app .display.text-\\[40px\\],
      .swiss-app .display.text-\\[36px\\] {
        font-size: clamp(1.9rem, 10vw, 3rem) !important;
      }

      .swiss-app .p-16 {
        padding: 1.25rem !important;
      }

      .swiss-app .py-24,
      .swiss-app .py-16 {
        padding-top: 2rem !important;
        padding-bottom: 2rem !important;
      }

      .swiss-app .px-8 {
        padding-left: 1rem !important;
        padding-right: 1rem !important;
      }

      .swiss-app .art-card.flex {
        align-items: flex-start !important;
        gap: 0.9rem !important;
      }

      .swiss-app .art-card.flex > .w-\\[120px\\] {
        width: 84px !important;
      }

      .swiss-app .art-card.flex .grid {
        gap: 0.45rem !important;
      }

      .swiss-app .grid.hair-b:not(.label) {
        row-gap: 0.35rem !important;
        padding-top: 1rem !important;
        padding-bottom: 1rem !important;
      }

      .swiss-app .text-right {
        text-align: left !important;
      }

      .swiss-app p {
        max-width: 100% !important;
      }

      .swiss-app .justify-end {
        justify-content: flex-start !important;
      }

      .swiss-app .swiss-btn {
        width: 100%;
        justify-content: center;
        min-height: 44px;
      }

      .swiss-app .flex.gap-3,
      .swiss-app .flex.gap-2 {
        flex-wrap: wrap;
      }

      .swiss-app footer {
        margin-top: 3rem !important;
      }

      .swiss-app footer .mt-16 {
        margin-top: 2rem !important;
      }

      .swiss-app .fixed.bottom-8 {
        left: 1rem !important;
        right: 1rem !important;
        bottom: 1rem !important;
        transform: none !important;
        text-align: center;
      }
    }

    @media (max-width: 420px) {
      .swiss-app header .w-\\[280px\\] {
        flex-basis: 100%;
      }

      .swiss-app header .label {
        display: none;
      }

      .swiss-app header .hair-all.flex.items-center.divide-x {
        grid-template-columns: minmax(0, 1fr);
      }

      .swiss-app .label,
      .swiss-app .label-ink,
      .swiss-app .mono.text-\\[11px\\],
      .swiss-app .mono.text-\\[10px\\] {
        font-size: 9px !important;
      }

      .swiss-app .art-card.flex > .w-\\[120px\\] {
        width: 72px !important;
      }
    }
  `}</style>
);

// ============================================================
// MODULE-LEVEL DATA — populated by useMarketplace hook on load
// ============================================================
let ARTISTS = [];
let ARTWORKS = [];
let COMMISSIONS = [];
let FEED_POSTS = [];



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
const artistById = (id) => ARTISTS.find(a => a.id === id) || { id, name: 'Unknown', handle: '?', accent: '#0E0E0C', followers: 0, verified: false };
const artworkById = (id) => ARTWORKS.find(w => w.id === id) || { id, title: 'Unknown', currentBid: 0, tags: [] };
const normalizeText = (value) => String(value || '').toLowerCase().trim();

const PRICE_BANDS = [
  { id: 'all', label: 'All prices', match: () => true },
  { id: 'under250', label: 'Under $250', match: (work) => work.currentBid < 250 },
  { id: '250-750', label: '$250-$750', match: (work) => work.currentBid >= 250 && work.currentBid <= 750 },
  { id: 'over750', label: 'Over $750', match: (work) => work.currentBid > 750 },
];

const APP_VIEWS = new Set([
  'home',
  'artwork',
  'artist',
  'commissions',
  'feed',
  'artists',
  'profile',
  'dashboard',
  'studio',
  'admin',
]);

const viewFromHash = () => {
  if (typeof window === 'undefined') return 'home';
  const hashView = window.location.hash.replace(/^#\/?/, '');
  return APP_VIEWS.has(hashView) ? hashView : 'home';
};

// TAG_OPTIONS is computed dynamically from loaded artworks
const getTagOptions = () => ['all', ...Array.from(new Set(ARTWORKS.flatMap(w => w.tags || []))).sort()];

// ============================================================
// SHARED COMPONENTS
// ============================================================
const Logo = ({ onClick }) => (
  <div onClick={onClick} className="flex items-baseline gap-2 cursor-pointer select-none whitespace-nowrap">
    <span className="display text-[26px] tracking-[-0.05em]">FORMA</span>
    <span className="label">/24</span>
  </div>
);

const Ticker = () => (
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

const Header = ({ view, setView, role, notif, query, setQuery, profile, onSignOut }) => (
  <header className="hair-b sticky top-0 z-40" style={{ backgroundColor: 'rgba(239, 237, 229, 0.92)', backdropFilter: 'blur(16px)' }}>
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
          <input
            id="global-search"
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              if (e.target.value.trim()) setView('home');
            }}
            placeholder="Search artists, works, tags…"
            aria-label="Search artists, works, and tags"
            className="bg-transparent outline-none mono text-[11px] flex-1 placeholder:text-[var(--muted)] uppercase tracking-wider"
          />
          <span className="label">⌘K</span>
        </div>
        <button onClick={() => setView('dashboard')} className="hair-all p-2 hover:bg-[var(--ink)] hover:text-[var(--bg)] transition-colors relative">
          <Bell size={14}/>
          {notif > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-[var(--accent)] text-white text-[9px] flex items-center justify-center rounded-full mono">{notif}</span>}
        </button>
        <RoleSwitcher role={role} setView={setView}/>
        <UserMenu profile={profile} role={role} setView={setView} onSignOut={onSignOut}/>
      </div>
    </div>
  </header>
);

const UserMenu = ({ profile, role, setView, onSignOut }) => {
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
        <div className="w-6 h-6 bg-[var(--ink)] flex items-center justify-center">
          <span className="text-[var(--bg)] mono text-[9px] uppercase">{initial}</span>
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
            <div className="mono text-[9px] uppercase tracking-[0.1em] text-[var(--accent)] mt-3">{role} account</div>
          </div>
          <div className="p-2">
            <a href="#profile" onClick={() => goTo('profile')} className="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-[var(--bg-2)] transition-colors" role="menuitem">
              <span className="flex items-center gap-2 text-[13px]"><User size={14}/> Profile</span>
              <ArrowRight size={12}/>
            </a>
            {(role === 'buyer' || role === 'admin') && (
              <a href="#dashboard" onClick={() => goTo('dashboard')} className="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-[var(--bg-2)] transition-colors" role="menuitem">
                <span className="flex items-center gap-2 text-[13px]"><ShoppingBag size={14}/> Buyer dashboard</span>
                <ArrowRight size={12}/>
              </a>
            )}
            {(role === 'artist' || role === 'admin') && (
              <a href="#studio" onClick={() => goTo('studio')} className="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-[var(--bg-2)] transition-colors" role="menuitem">
                <span className="flex items-center gap-2 text-[13px]"><ImageIcon size={14}/> Studio</span>
                <ArrowRight size={12}/>
              </a>
            )}
            {role === 'admin' && (
              <a href="#admin" onClick={() => goTo('admin')} className="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-[var(--bg-2)] transition-colors" role="menuitem">
                <span className="flex items-center gap-2 text-[13px]"><Shield size={14}/> Admin</span>
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

const RoleSwitcher = ({ role, setView }) => {
  // Build available dashboard buttons based on authenticated role
  const dashboards = [];
  if (role === 'buyer' || role === 'admin') {
    dashboards.push({ id: 'buyer', label: 'Dashboard', target: 'dashboard' });
  }
  if (role === 'artist' || role === 'admin') {
    dashboards.push({ id: 'artist', label: 'Studio', target: 'studio' });
  }
  if (role === 'admin') {
    dashboards.push({ id: 'admin', label: 'Admin', target: 'admin' });
  }

  if (dashboards.length === 0) return null;

  return (
    <div className="hair-all flex items-center divide-x divide-[var(--hair)]">
      {dashboards.map(r => (
        <button
          key={r.id}
          onClick={() => setView(r.target)}
          className={`px-3 py-2 mono text-[10px] uppercase tracking-[0.12em] transition-colors text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--bg-2)]`}
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

const ArtCard = ({ work, onClick, likes, toggleLike, watchlist = {}, toggleWatch = null, layout = 'grid' }) => {
  const artist = artistById(work.artist);
  const isHot = work.endsAt < 1000*60*60*3;
  const liked = likes[work.id];
  const watched = watchlist[work.id];
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
        <ArtVisual visual={work.visual}/>
        {isHot && (
          <div className="absolute top-2 left-2 bg-[var(--accent)] text-white px-2 py-0.5 mono text-[9px] tracking-[0.15em]">
            <span className="blink inline-block w-1.5 h-1.5 bg-white rounded-full mr-1.5 align-middle"/>
            ENDING SOON
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

const Footer = () => (
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
const HomeView = ({ goToArtwork, goToArtist, likes, toggleLike, watchlist, toggleWatch, query }) => {
  const [sort, setSort] = useState('ending');
  const [tag, setTag] = useState('all');
  const [edition, setEdition] = useState('all');
  const [priceBand, setPriceBand] = useState('all');
  const [layout, setLayout] = useState('grid');
  const searchTerm = normalizeText(query);
  const priceFilter = PRICE_BANDS.find(b => b.id === priceBand) || PRICE_BANDS[0];
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

      return matchesSearch && matchesTag && matchesEdition && matchesPrice;
    })
    .sort((a,b) => {
      if (sort === 'new') return b.year - a.year || a.endsAt - b.endsAt;
      if (sort === 'priceHigh') return b.currentBid - a.currentBid;
      if (sort === 'priceLow') return a.currentBid - b.currentBid;
      if (sort === 'watched') return b.watchers - a.watchers;
      return a.endsAt - b.endsAt;
    });

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
              return <ArtCard key={id} work={w} onClick={() => goToArtwork(id)} likes={likes} toggleLike={toggleLike} watchlist={watchlist} toggleWatch={toggleWatch} layout="row"/>;
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
          <div className="flex flex-wrap justify-end items-center gap-2">
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
            <div className="hair-l h-6 mx-2"/>
            <button onClick={() => setLayout('grid')} className={`hair-all p-2 ${layout==='grid' ? 'bg-[var(--ink)] text-[var(--bg)]' : ''}`}><Grid3x3 size={14}/></button>
            <button onClick={() => setLayout('row')} className={`hair-all p-2 ${layout==='row' ? 'bg-[var(--ink)] text-[var(--bg)]' : ''}`}><Rows3 size={14}/></button>
          </div>
        </div>

        <div className="mb-5 flex justify-between items-center mono text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">
          <span>{filteredWorks.length} live {filteredWorks.length === 1 ? 'auction' : 'auctions'} matched</span>
          {searchTerm && <button onClick={() => document.getElementById('global-search')?.focus()} className="underline-hover">Search: {query}</button>}
        </div>

        {layout === 'grid' ? (
          <div className="grid grid-cols-4 gap-6">
            {filteredWorks.map(w => (
              <ArtCard key={w.id} work={w} onClick={() => goToArtwork(w.id)} likes={likes} toggleLike={toggleLike} watchlist={watchlist} toggleWatch={toggleWatch}/>
            ))}
          </div>
        ) : (
          <div>
            {filteredWorks.map(w => (
              <ArtCard key={w.id} work={w} onClick={() => goToArtwork(w.id)} likes={likes} toggleLike={toggleLike} watchlist={watchlist} toggleWatch={toggleWatch} layout="row"/>
            ))}
          </div>
        )}
        {filteredWorks.length === 0 && (
          <div className="hair-all p-10 text-center bg-[var(--card)]">
            <div className="display text-[28px]">No auctions matched.</div>
            <p className="text-[14px] text-[var(--muted)] mt-2">Widen the filters or try another artist, tag, or artwork title.</p>
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
  const [bidInput, setBidInput] = useState(minimumNextBid(work.currentBid));
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
                <div className={`mono text-[24px] mt-1 ${auctionUrgency(timeLeft) === 'critical' || auctionUrgency(timeLeft) === 'urgent' ? 'text-[var(--accent)]' : ''}`}>{formatTime(timeLeft)}</div>
                {shouldExtendAuction(timeLeft) && (
                  <div className="mono text-[10px] text-[var(--accent)] mt-1 flex items-center gap-1">
                    <AlertCircle size={10}/> Anti-snipe active · bids extend +5m
                  </div>
                )}
              </div>
              <div>
                <div className="label">Min. next bid</div>
                <div className="mono text-[24px] mt-1">${fmt(minimumNextBid(currentTopBid))}</div>
                <div className="mono text-[10px] text-[var(--muted)] mt-1">
                  Increment: ${fmt(minimumBidIncrement(currentTopBid))}
                </div>
              </div>
            </div>

            <div className="mt-6 hair-t pt-6">
              <div className="label mb-3">Place your bid</div>
              <div className="flex items-center gap-2">
                <div className="hair-all flex-1 flex items-center px-3">
                  <span className="mono text-[12px] text-[var(--muted)]">USD</span>
                  <input value={bidInput} onChange={e => setBidInput(Number(e.target.value)||0)} type="number" className="bg-transparent outline-none mono text-[18px] flex-1 px-3 py-2.5 text-right"/>
                </div>
                <button onClick={() => placeBid(work.id, bidInput)} className="swiss-btn accent py-3" disabled={timeLeft <= 0}>
                  <Gavel size={12}/> {timeLeft <= 0 ? 'Ended' : 'Bid'}
                </button>
              </div>
              <div className="mt-3 hair-all p-3 bg-[var(--bg)]">
                <div className="flex justify-between mono text-[11px]">
                  <span className="text-[var(--muted)]">Your bid</span>
                  <span>${fmt(bidInput)}</span>
                </div>
                <div className="flex justify-between mono text-[11px] mt-1">
                  <span className="text-[var(--muted)]">Buyer's premium (12%)</span>
                  <span>${fmt(auctionBuyerPremium(bidInput))}</span>
                </div>
                <div className="flex justify-between mono text-[11px] mt-1 pt-1 hair-t font-medium">
                  <span>Total if you win</span>
                  <span>${fmt(auctionTotalCost(bidInput))}</span>
                </div>
              </div>
              <div className="mt-2 label">
                Authorised at bid · captured only on winning · refunded if outbid
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
const BuyerDashboard = ({ goToArtwork, likes, toggleLike, bids, watchlist, toggleWatch }) => {
  const [tab, setTab] = useState('bids');
  const watchedWorks = ARTWORKS.filter(w => watchlist[w.id]);

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
          {l:'Watching', v:String(watchedWorks.length), d: watchedWorks.length ? `${watchedWorks.filter(w => w.endsAt < 1000*60*60*24).length} ending today` : 'No saved auctions yet'},
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
        watchedWorks.length ? (
          <div className="grid grid-cols-4 gap-6">
            {watchedWorks.map(w => (
              <ArtCard key={w.id} work={w} onClick={() => goToArtwork(w.id)} likes={likes} toggleLike={toggleLike} watchlist={watchlist} toggleWatch={toggleWatch}/>
            ))}
          </div>
        ) : (
          <div className="hair-all p-10 text-center bg-[var(--card)]">
            <Bookmark size={22} className="mx-auto text-[var(--muted)]"/>
            <div className="display text-[28px] mt-3">No watched auctions yet.</div>
            <p className="text-[14px] text-[var(--muted)] mt-2">Save works from the marketplace to track close times and bids here.</p>
          </div>
        )
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
// PROFILE VIEW - Account and public profile settings
// ============================================================
const ProfileView = ({ user, profile, role, updateProfile, marketplace, setView }) => {
  const [form, setForm] = useState({
    display_name: profile?.display_name || '',
    handle: profile?.handle || '',
    city: profile?.city || '',
    bio: profile?.bio || '',
  });
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    setForm({
      display_name: profile?.display_name || '',
      handle: profile?.handle || '',
      city: profile?.city || '',
      bio: profile?.bio || '',
    });
  }, [profile]);

  const updateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setStatus(null);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    setStatus(null);

    try {
      await updateProfile({
        display_name: form.display_name,
        handle: form.handle,
        city: form.city,
        bio: form.bio,
      });
      setStatus({ type: 'success', text: 'Profile updated.' });
    } catch (err) {
      setStatus({ type: 'error', text: err.message || 'Profile update failed.' });
    } finally {
      setSaving(false);
    }
  };

  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'FORMA user';
  const joined = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : 'New account';
  const likeCount = Object.keys(marketplace.likes || {}).length;
  const followCount = Object.keys(marketplace.follows || {}).length;
  const watchCount = Object.keys(marketplace.watchlist || {}).length;
  const bidCount = Object.values(marketplace.bids || {}).reduce((total, rows) => total + rows.length, 0);

  const shortcuts = [
    { show: role === 'buyer' || role === 'admin', target: 'dashboard', label: 'Buyer dashboard', desc: 'Watchlist, bids, and collecting activity.' },
    { show: role === 'artist' || role === 'admin', target: 'studio', label: 'Artist studio', desc: 'Auctions, commissions, and payout summary.' },
    { show: role === 'admin', target: 'admin', label: 'Admin console', desc: 'Moderation, finance, audit, and user queues.' },
  ].filter(item => item.show);

  return (
    <main className="fade-in max-w-[1440px] mx-auto px-8 py-12">
      <div className="grid grid-cols-12 gap-8">
        <section className="col-span-4">
          <div className="hair-all bg-[var(--card)] p-6 sticky top-28">
            <div className="w-20 h-20 bg-[var(--ink)] text-[var(--bg)] flex items-center justify-center">
              <span className="display text-[42px] leading-none">{displayName[0]}</span>
            </div>
            <div className="label mt-6">Profile</div>
            <h1 className="display text-[48px] mt-2 leading-[0.95]">{displayName}</h1>
            <div className="mono text-[11px] text-[var(--muted)] mt-3 break-all">{profile?.email || user?.email}</div>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="hair-all px-2.5 py-1 mono text-[10px] uppercase tracking-[0.1em]">{role}</span>
              <span className={`px-2.5 py-1 mono text-[10px] uppercase tracking-[0.1em] ${profile?.verified ? 'bg-[var(--good)] text-white' : 'hair-all text-[var(--muted)]'}`}>
                {profile?.verified ? 'Verified' : 'Unverified'}
              </span>
              <span className="hair-all px-2.5 py-1 mono text-[10px] uppercase tracking-[0.1em]">{joined}</span>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-8">
              {[
                ['Watching', watchCount],
                ['Likes', likeCount],
                ['Following', followCount],
                ['Bids', bidCount],
              ].map(([label, value]) => (
                <div key={label} className="hair-all p-4">
                  <div className="display text-[28px]">{value}</div>
                  <div className="label mt-1">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="col-span-8 space-y-8">
          <form onSubmit={handleSave} className="hair-all bg-[var(--card)] p-6">
            <div className="flex justify-between items-start gap-4 hair-b pb-5 mb-6">
              <div>
                <div className="label">Public profile</div>
                <h2 className="display text-[32px] mt-2">Account details.</h2>
              </div>
              <button type="submit" disabled={saving} className={`swiss-btn accent ${saving ? 'opacity-60 cursor-wait' : ''}`}>
                {saving ? 'Saving...' : 'Save profile'} <Check size={12}/>
              </button>
            </div>

            {status && (
              <div className={`hair-all p-3 mb-5 text-[13px] ${status.type === 'error' ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : 'bg-[var(--bg-2)] text-[var(--good)]'}`}>
                {status.text}
              </div>
            )}

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label htmlFor="profile-display-name" className="label mb-2 block">Display name</label>
                <input
                  id="profile-display-name"
                  className="swiss-input"
                  value={form.display_name}
                  onChange={event => updateField('display_name', event.target.value)}
                  placeholder="Your public name"
                  maxLength={80}
                  required
                />
              </div>
              <div>
                <label htmlFor="profile-handle" className="label mb-2 block">Handle</label>
                <input
                  id="profile-handle"
                  className="swiss-input"
                  value={form.handle}
                  onChange={event => updateField('handle', event.target.value)}
                  placeholder="studio.handle"
                  maxLength={40}
                />
              </div>
              <div>
                <label htmlFor="profile-city" className="label mb-2 block">City</label>
                <input
                  id="profile-city"
                  className="swiss-input"
                  value={form.city}
                  onChange={event => updateField('city', event.target.value)}
                  placeholder="Lagos, Berlin, Colombo"
                  maxLength={80}
                />
              </div>
              <div>
                <label className="label mb-2 block">Account role</label>
                <div className="hair-all px-3 py-3 mono text-[11px] uppercase tracking-[0.1em] bg-[var(--bg-2)]">
                  {role}
                </div>
              </div>
              <div className="col-span-2">
                <label htmlFor="profile-bio" className="label mb-2 block">Bio</label>
                <textarea
                  id="profile-bio"
                  className="swiss-input min-h-[120px]"
                  value={form.bio}
                  onChange={event => updateField('bio', event.target.value)}
                  placeholder="Tell collectors what you make, collect, or commission."
                  maxLength={500}
                />
              </div>
            </div>
          </form>

          <div className="grid grid-cols-2 gap-6">
            <div className="hair-all bg-[var(--card)] p-6">
              <div className="label">Account security</div>
              <div className="space-y-4 mt-5">
                {[
                  ['Email confirmed', user?.email_confirmed_at ? 'Complete' : 'Pending'],
                  ['Profile row', profile?.id ? 'Synced' : 'Missing'],
                  ['Role lock', 'Protected'],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between hair-b pb-3 last:border-0 last:pb-0">
                    <span className="text-[14px]">{label}</span>
                    <span className="mono text-[10px] uppercase tracking-[0.1em] text-[var(--muted)]">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="hair-all bg-[var(--card)] p-6">
              <div className="label">Role shortcuts</div>
              <div className="space-y-3 mt-5">
                {shortcuts.map(shortcut => (
                  <button
                    key={shortcut.target}
                    onClick={() => setView(shortcut.target)}
                    className="w-full hair-all p-4 text-left hover:bg-[var(--bg-2)] transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="display text-[20px]">{shortcut.label}</span>
                      <ArrowRight size={14}/>
                    </div>
                    <p className="text-[12px] text-[var(--muted)] mt-2 leading-relaxed">{shortcut.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};

const CatalogueLoadingState = () => (
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

const CatalogueErrorState = ({ error }) => (
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

// ============================================================
// MAIN APP
// ============================================================
export default function App() {
  const { isAuthenticated, loading: authLoading, user, profile, role, signOut, updateProfile } = useAuth();
  const marketplace = useMarketplace();
  const [view, setView] = useState(() => viewFromHash());
  const [selectedArtwork, setSelectedArtwork] = useState(null);
  const [selectedArtist, setSelectedArtist] = useState(null);
  const { unreadCount: notifCount } = useNotifications();
  const [query, setQuery] = useState('');
  const [toast, setToast] = useState(null);

  // Sync hook data → module-level variables so inner components work
  if (marketplace.artists.length) ARTISTS = marketplace.artists;
  if (marketplace.artworks.length) ARTWORKS = marketplace.artworks;
  if (marketplace.commissions.length) COMMISSIONS = marketplace.commissions;
  if (marketplace.feedPosts.length) FEED_POSTS = marketplace.feedPosts;

  // Destructure interaction data from hook
  const { likes, follows, watchlist, bids } = marketplace;

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

  const goToArtwork = (id) => { setSelectedArtwork(id); navigateToView('artwork'); };
  const goToArtist = (id) => { setSelectedArtist(id); navigateToView('artist'); };

  const toggleLike = async (id) => {
    await marketplace.toggleLike(id);
  };

  const toggleWatch = async (id) => {
    const work = artworkById(id);
    const isNowWatching = await marketplace.toggleWatch(id);
    setToast(isNowWatching ? `Watching ${work.title}` : `Removed ${work.title} from watchlist`);
    setTimeout(() => setToast(null), 2400);
  };

  const toggleFollow = async (id) => {
    const isNowFollowing = await marketplace.toggleFollow(id);
    setToast(isNowFollowing ? `Following ${artistById(id).name}` : `Unfollowed ${artistById(id).name}`);
    setTimeout(() => setToast(null), 2400);
  };

  const placeBid = async (workId, amount) => {
    const result = await marketplace.placeBid(workId, amount);
    if (result?.error) {
      setToast(result.error);
    } else {
      const w = artworkById(workId);
      setToast(`Bid of $${fmt(amount)} placed on ${w.title}`);
    }
    setTimeout(() => setToast(null), 2800);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigateToView('home');
    } catch (err) {
      setToast('Sign out failed: ' + err.message);
      setTimeout(() => setToast(null), 2400);
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
  const canViewDashboard = role === 'buyer' || role === 'admin';
  const canViewStudio = role === 'artist' || role === 'admin';
  const canViewAdmin = role === 'admin';

  return (
    <div className="swiss-app min-h-screen">
      <GlobalStyles/>
      <Header view={view} setView={navigateToView} role={role} notif={notifCount} query={query} setQuery={setQuery} profile={profile} onSignOut={handleSignOut}/>
      {marketplace.error && view !== 'profile' ? (
        <CatalogueErrorState error={marketplace.error}/>
      ) : marketplace.loading && view !== 'profile' ? (
        <CatalogueLoadingState/>
      ) : (
        <>
          {view === 'home' && <HomeView goToArtwork={goToArtwork} goToArtist={goToArtist} likes={likes} toggleLike={toggleLike} watchlist={watchlist} toggleWatch={toggleWatch} query={query}/>}
          {view === 'artwork' && selectedArtwork && <ArtworkView workId={selectedArtwork} goToArtwork={goToArtwork} goToArtist={goToArtist} likes={likes} toggleLike={toggleLike} bids={bids} placeBid={placeBid}/>}
          {view === 'artist' && selectedArtist && <ArtistView artistId={selectedArtist} goToArtwork={goToArtwork} follows={follows} toggleFollow={toggleFollow} likes={likes} toggleLike={toggleLike}/>}
          {view === 'commissions' && <CommissionsView goToArtist={goToArtist}/>}
          {view === 'feed' && <FeedView goToArtwork={goToArtwork} goToArtist={goToArtist} follows={follows} toggleFollow={toggleFollow} likes={likes} toggleLike={toggleLike}/>}
          {view === 'artists' && <ArtistsView goToArtist={goToArtist} follows={follows} toggleFollow={toggleFollow}/>}
          {view === 'profile' && <ProfileView user={user} profile={profile} role={role} updateProfile={updateProfile} marketplace={marketplace} setView={navigateToView}/>}
          {view === 'dashboard' && canViewDashboard && <BuyerDashboard goToArtwork={goToArtwork} likes={likes} toggleLike={toggleLike} bids={bids} watchlist={watchlist} toggleWatch={toggleWatch}/>}
          {view === 'studio' && canViewStudio && <StudioDashboard goToArtwork={goToArtwork} likes={likes} toggleLike={toggleLike}/>}
          {view === 'admin' && canViewAdmin && <AdminDashboard goToArtist={goToArtist}/>}
        </>
      )}

      {/* Access denied fallback for role-gated views */}
      {((view === 'dashboard' && !canViewDashboard) || (view === 'studio' && !canViewStudio) || (view === 'admin' && !canViewAdmin)) && (
        <main className="fade-in max-w-[1440px] mx-auto px-8 py-24 text-center">
          <div className="hair-all bg-[var(--card)] p-16 max-w-[560px] mx-auto">
            <Shield size={32} className="mx-auto text-[var(--muted)]"/>
            <div className="display text-[32px] mt-6">Access restricted.</div>
            <p className="text-[14px] text-[var(--muted)] mt-3 leading-relaxed">
              Your account role ({role}) doesn't have access to this section.
            </p>
            <button onClick={() => navigateToView('home')} className="swiss-btn mt-8 mx-auto">
              Back to marketplace <ArrowRight size={12}/>
            </button>
          </div>
        </main>
      )}

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
