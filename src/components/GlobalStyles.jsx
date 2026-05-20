// ============================================================
// FORMA — Global styles (Swiss design system)
// ============================================================
import React from 'react';

export const GlobalStyles = () => (
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
      --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
      --ease-soft: cubic-bezier(0.2, 0.75, 0.18, 1);
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

    .swiss-app > header {
      z-index: 100;
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

    /* WCAG 2.2 AA — visible keyboard focus */
    .swiss-app a:focus-visible,
    .swiss-app button:focus-visible,
    .swiss-app input:focus-visible,
    .swiss-app select:focus-visible,
    .swiss-app textarea:focus-visible,
    .swiss-app [tabindex]:focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 2px;
      border-radius: 1px;
    }
    .swiss-app :focus:not(:focus-visible) { outline: none; }

    /* ========================================================
       MOTION — restrained, Swiss: short, eased, purposeful.
       Everything here is disabled under reduced-motion.
       ======================================================== */

    /* Page/view entrance: a touch more presence than a bare fade. */
    .fade-in {
      animation: forma-rise 0.68s var(--ease-out) both;
      opacity: 0;
    }
    @keyframes forma-rise {
      from { opacity: 0; transform: translateY(18px) scale(0.99); filter: blur(4px); }
      to   { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
    }

    /* Header settles in on load. */
    .swiss-app > header {
      animation: forma-header 0.54s var(--ease-soft) both;
    }
    @keyframes forma-header {
      from { opacity: 0; transform: translateY(-8px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    /* Scroll reveal — App attaches an IntersectionObserver and adds
       .reveal-ready to .swiss-app, so without JS cards stay visible. */
    .swiss-app.reveal-ready .motion-card {
      opacity: 0;
      transform:
        perspective(1200px)
        translate3d(0, 26px, 0)
        rotate(var(--card-rotate, 0deg))
        scale(0.982);
      transform-origin: 50% 85%;
      filter: blur(4px);
      will-change: opacity, transform, filter;
    }
    .swiss-app.reveal-ready .motion-card.revealed {
      opacity: 1;
      transform:
        perspective(1200px)
        translate3d(0, 0, 0)
        rotate(0deg)
        scale(1);
      filter: blur(0);
      transition:
        opacity 0.72s ease var(--reveal-delay, 0ms),
        transform 0.9s var(--ease-out) var(--reveal-delay, 0ms),
        filter 0.8s ease var(--reveal-delay, 0ms);
    }

    .swiss-app.reveal-ready .motion-text {
      opacity: 0;
      transform: translate3d(0, 18px, 0);
      clip-path: inset(0 0 18% 0);
      filter: blur(4px);
      will-change: opacity, transform, filter, clip-path;
    }

    .swiss-app.reveal-ready .motion-text.revealed {
      opacity: 1;
      transform: translate3d(0, 0, 0);
      clip-path: inset(0 0 0 0);
      filter: blur(0);
      transition:
        opacity 0.68s ease var(--reveal-delay, 0ms),
        transform 0.82s var(--ease-out) var(--reveal-delay, 0ms),
        clip-path 0.82s var(--ease-out) var(--reveal-delay, 0ms),
        filter 0.75s ease var(--reveal-delay, 0ms);
    }

    .swiss-app.reveal-ready main h1.display.motion-text:not(.revealed),
    .swiss-app.reveal-ready main h2.display.motion-text:not(.revealed),
    .swiss-app.reveal-ready main h3.display.motion-text:not(.revealed) {
      transform: translate3d(0, 0.62em, 0) scale(0.985);
      clip-path: inset(0 0 28% 0);
      filter: blur(6px);
      transform-origin: left bottom;
    }
    .swiss-app.reveal-ready main h1.display.motion-text.revealed,
    .swiss-app.reveal-ready main h2.display.motion-text.revealed,
    .swiss-app.reveal-ready main h3.display.motion-text.revealed {
      transform: translate3d(0, 0, 0) scale(1);
      transition:
        opacity 0.78s ease var(--reveal-delay, 0ms),
        transform 1s var(--ease-out) var(--reveal-delay, 0ms),
        clip-path 1s var(--ease-out) var(--reveal-delay, 0ms),
        filter 0.9s ease var(--reveal-delay, 0ms);
    }

    .swiss-app.reveal-ready .motion-stat.revealed .mono {
      animation: forma-number-settle 0.58s var(--ease-soft) both;
      animation-delay: var(--reveal-delay, 0ms);
    }

    @keyframes forma-number-settle {
      from { opacity: 0; transform: translateY(10px) scale(0.96); }
      60%  { opacity: 1; transform: translateY(0) scale(1.015); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }

    /* Slow, quiet zoom on artwork media while hovering its card. */
    .art-card .hair-all.relative > img,
    .art-card .hair-all.relative > svg,
    .art-card .hair-all.relative > div > img,
    .art-card .hair-all.relative > div > svg {
      transition: transform 0.95s var(--ease-out), filter 0.95s ease;
    }
    .art-card:hover .hair-all.relative img,
    .art-card:hover .hair-all.relative svg {
      transform: scale(1.055);
      filter: saturate(1.02) contrast(1.02);
    }

    /* Tactile press + consistent easing on controls. */
    .swiss-app .swiss-btn,
    .swiss-app .tab-pill,
    .swiss-app button.hair-all {
      transition:
        background-color 0.15s ease,
        color 0.15s ease,
        border-color 0.15s ease,
        box-shadow 0.2s ease,
        transform 0.2s var(--ease-out);
    }
    .swiss-app .swiss-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(14, 14, 12, 0.16);
    }
    .swiss-app .tab-pill:hover {
      transform: translateY(-1px);
    }
    .swiss-app .swiss-btn:active,
    .swiss-app .tab-pill:active,
    .swiss-app button.hair-all:active {
      transform: translateY(1px);
      box-shadow: none;
    }

    /* Modals: overlay fades, panel rises. */
    .swiss-app .fixed.inset-0 { animation: forma-overlay 0.2s ease both; }
    .swiss-app .fixed.inset-0 > form,
    .swiss-app .fixed.inset-0 > div {
      animation: forma-modal 0.26s cubic-bezier(0.2, 0.7, 0.2, 1) both;
    }
    @keyframes forma-overlay { from { opacity: 0; } to { opacity: 1; } }
    @keyframes forma-modal {
      from { opacity: 0; transform: translateY(14px) scale(0.985); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }

    /* Toast slides up from the baseline. */
    .swiss-app .fixed.bottom-8 {
      animation: forma-toast 0.32s cubic-bezier(0.2, 0.7, 0.2, 1) both;
    }
    @keyframes forma-toast {
      from { opacity: 0; transform: translate(-50%, 12px); }
      to   { opacity: 1; transform: translate(-50%, 0); }
    }

    .motion-card:not(.art-card):not(form) {
      position: relative;
      isolation: isolate;
      transition:
        background-color 0.24s ease,
        border-color 0.24s ease,
        box-shadow 0.42s ease,
        transform 0.42s var(--ease-out);
    }

    .motion-card:not(.art-card):not(form)::before {
      content: '';
      position: absolute;
      left: -1px;
      right: -1px;
      top: -1px;
      height: 1px;
      pointer-events: none;
      background: linear-gradient(90deg, transparent, rgba(233, 120, 100, 0.72), transparent);
      opacity: 0;
      transform: translateX(-18%);
      transition: opacity 0.28s ease, transform 0.58s var(--ease-out);
    }

    .motion-card:not(.art-card):not(form):hover {
      transform: translate3d(0, -5px, 0);
      box-shadow: 0 24px 58px rgba(14, 14, 12, 0.11);
    }

    .motion-card:not(.art-card):not(form):hover::before {
      opacity: 1;
      transform: translateX(0);
    }

    /* Live status dots get a soft pulse instead of a hard blink. */
    .blink {
      animation: forma-pulse 1.8s ease-in-out infinite;
    }
    @keyframes forma-pulse {
      0%, 100% { opacity: 1; }
      50%      { opacity: 0.25; }
    }

    @media (prefers-reduced-motion: reduce) {
      .swiss-app *,
      .swiss-app *::before,
      .swiss-app *::after {
        animation-duration: 0.001ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.001ms !important;
        scroll-behavior: auto !important;
      }
      .swiss-app.reveal-ready .motion-card,
      .swiss-app.reveal-ready .motion-text,
      .swiss-app.reveal-ready .motion-reveal {
        opacity: 1;
        transform: none;
        filter: none;
        clip-path: none;
      }
    }

    .art-card {
      transition: transform 0.46s var(--ease-out);
    }
    .art-card:hover { transform: translateY(-7px); }
    .art-card:hover .art-arrow { transform: translate(3px, -3px); }
    .art-arrow { transition: transform 0.36s var(--ease-out); }

    .art-card .hair-all.relative {
      background: var(--card);
      box-shadow: var(--paper-shadow);
      transition: box-shadow 0.46s ease, transform 0.46s var(--ease-out);
    }
    .art-card:hover .hair-all.relative {
      box-shadow: 0 26px 60px rgba(14, 14, 12, 0.16);
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

    .user-menu {
      isolation: isolate;
    }

    .user-menu-panel {
      z-index: 240;
      background-color: var(--card);
      max-height: min(72vh, 520px);
      overflow-y: auto;
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

      .swiss-app .admin-tabs {
        overflow-x: auto;
        padding-bottom: 0.25rem;
        scrollbar-width: none;
      }

      .swiss-app .admin-tabs::-webkit-scrollbar {
        display: none;
      }

      .swiss-app .admin-tabs .tab-pill {
        flex: 0 0 auto;
      }

      .swiss-app .admin-report-row,
      .swiss-app .admin-report-actions {
        flex-direction: column;
        align-items: stretch !important;
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
