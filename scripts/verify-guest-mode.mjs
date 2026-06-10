// One-off runtime verification: guest browsing + artwork protection.
// Drives the dev server with puppeteer-core against installed Chrome.
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';

const BASE = process.env.VERIFY_BASE_URL || 'http://127.0.0.1:5173/';
const OUT = 'scripts/verify-shots';
mkdirSync(OUT, { recursive: true });

const results = [];
const step = (ok, name, detail = '') => {
  results.push({ ok, name, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
};

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox', '--window-size=1440,1000'],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });
  page.on('pageerror', (err) => console.log('PAGEERROR:', err.message));

  // 1. Guest landing: marketplace home, not the auth page.
  await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise(r => setTimeout(r, 4000)); // catalogue load
  await page.screenshot({ path: `${OUT}/01-guest-home.png` });
  const bodyText = await page.evaluate(() => document.body.innerText);
  const hasSignIn = bodyText.toLowerCase().includes('sign in');
  const isAuthForm = bodyText.includes('Sign in with your email and password');
  step(hasSignIn && !isAuthForm, 'guest lands on marketplace home with Sign in button', `authForm=${isAuthForm}`);

  // 2. Explore renders for guests (live cards, or the intentional empty state
  //    when all seeded auctions are past the 7-day listing window).
  await page.evaluate(() => { window.location.hash = '#explore'; });
  await new Promise(r => setTimeout(r, 2500));
  const explore = await page.evaluate(() => ({
    cards: document.querySelectorAll('.art-card').length,
    emptyState: document.body.innerText.includes('No auctions matched'),
  }));
  await page.screenshot({ path: `${OUT}/02-guest-explore.png` });
  step(explore.cards > 0 || explore.emptyState, 'explore renders for guests', `${explore.cards} cards, emptyState=${explore.emptyState}`);

  // 3. Artists page lists real public studios for guests.
  await page.evaluate(() => { window.location.hash = '#artists'; });
  await new Promise(r => setTimeout(r, 2500));
  const artistsText = await page.evaluate(() => document.body.innerText);
  await page.screenshot({ path: `${OUT}/03-guest-artists.png` });
  step(/follow/i.test(artistsText), 'artists page renders public studios for guests');

  // 4. Commissions page renders public boards for guests.
  await page.evaluate(() => { window.location.hash = '#commissions'; });
  await new Promise(r => setTimeout(r, 2500));
  const commText = await page.evaluate(() => document.body.innerText);
  await page.screenshot({ path: `${OUT}/04-guest-commissions.png` });
  step(/commission/i.test(commText), 'commissions page renders for guests');

  // 5. Artwork detail via deep link → watermark + shield + rights notice.
  await page.goto(`${BASE}#artwork/aw-verify`, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 3500));
  await page.screenshot({ path: `${OUT}/05-guest-artwork.png` });
  const detail = await page.evaluate(() => ({
    hash: window.location.hash,
    bidPanel: document.body.innerText.toLowerCase().includes('current top bid'),
    watermark: !!document.querySelector('.art-watermark'),
    shield: !!document.querySelector('.art-shield'),
    rights: document.body.innerText.toLowerCase().includes('all rights reserved'),
    reportStolen: document.body.innerText.toLowerCase().includes('report stolen work'),
    // The catalogue media is expired in this environment, so validate the
    // protection CSS by mounting an image inside the protected container.
    protectedImgPointerEvents: (() => {
      const host = document.querySelector('.art-protected');
      if (!host) return 'no-host';
      const img = document.createElement('img');
      host.appendChild(img);
      const value = getComputedStyle(img).pointerEvents;
      img.remove();
      return value;
    })(),
  }));
  step(detail.bidPanel, 'artwork detail page renders for guests (deep link)', detail.hash);
  step(detail.watermark, 'artwork hero shows watermark overlay');
  step(detail.shield, 'artwork media covered by anti-save shield');
  step(detail.rights && detail.reportStolen, 'rights notice + report stolen work link present');
  step(detail.protectedImgPointerEvents === 'none', 'protected media ignores pointer events', detail.protectedImgPointerEvents);

  // 6. Write action (like) routes guest to sign-in.
  await page.evaluate(() => {
    const buttons = [...document.querySelectorAll('button[aria-label]')];
    buttons.find(b => /^Like /.test(b.getAttribute('aria-label')))?.click();
  });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: `${OUT}/06-after-like-click.png` });
  const afterLike = await page.evaluate(() => ({
    hash: window.location.hash,
    authVisible: document.body.innerText.includes('Sign in with your email and password'),
    backLink: document.body.innerText.toLowerCase().includes('continue browsing without an account'),
  }));
  step(afterLike.hash === '#auth' && afterLike.authVisible, 'guest like click routes to sign-in page', afterLike.hash);
  step(afterLike.backLink, 'sign-in page offers continue-browsing path back');

  // 7. Probe: back to browsing from the auth page.
  await page.evaluate(() => {
    [...document.querySelectorAll('button')].find(b => b.innerText.toLowerCase().includes('continue browsing'))?.click();
  });
  await new Promise(r => setTimeout(r, 1500));
  const backHome = await page.evaluate(() => window.location.hash === '' || window.location.hash === '#home');
  step(backHome, 'PROBE: continue-browsing returns guest to home');

  // 8. Probe: gated view (#dashboard) as guest → auth page.
  await page.evaluate(() => { window.location.hash = '#dashboard'; });
  await new Promise(r => setTimeout(r, 1500));
  const gated = await page.evaluate(() => document.body.innerText.includes('Sign in with your email and password'));
  await page.screenshot({ path: `${OUT}/07-gated-dashboard.png` });
  step(gated, 'PROBE: guest opening #dashboard gets the sign-in page');

  // 9. Probe: bogus hash falls back to home, no crash.
  await page.evaluate(() => { window.location.hash = '#not-a-view'; });
  await new Promise(r => setTimeout(r, 1200));
  const bogusOk = await page.evaluate(() => document.body.innerText.length > 200);
  step(bogusOk, 'PROBE: unknown hash renders home without crashing');
} finally {
  await browser.close();
}

const failed = results.filter(r => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
