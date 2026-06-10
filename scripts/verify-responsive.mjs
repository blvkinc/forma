// One-off runtime verification: responsive layout across device widths.
// Drives the dev server with puppeteer-core against installed Chrome and
// flags horizontal overflow (the classic broken-mobile symptom) per view.
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';

const BASE = process.env.VERIFY_BASE_URL || 'http://127.0.0.1:5173/';
const OUT = 'scripts/verify-shots/responsive';
mkdirSync(OUT, { recursive: true });

const VIEWPORTS = [
  { name: 'mobile-375', width: 375, height: 812 },
  { name: 'mobile-414', width: 414, height: 896 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'laptop-1280', width: 1280, height: 800 },
];

const VIEWS = ['', '#explore', '#artists', '#commissions', '#feed', '#auth'];

const results = [];
const step = (ok, name, detail = '') => {
  results.push({ ok, name, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
};

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox'],
});

try {
  for (const vp of VIEWPORTS) {
    const page = await browser.newPage();
    await page.setViewport({ width: vp.width, height: vp.height, isMobile: vp.width < 800, hasTouch: vp.width < 800 });
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise(r => setTimeout(r, 3500)); // catalogue load

    for (const hash of VIEWS) {
      await page.evaluate(h => { window.location.hash = h; }, hash);
      await new Promise(r => setTimeout(r, 1800));
      const label = hash ? hash.slice(1) : 'home';
      const metrics = await page.evaluate(() => ({
        overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        bodyChars: document.body.innerText.length,
      }));
      await page.screenshot({ path: `${OUT}/${vp.name}-${label}.png` });
      step(
        metrics.overflowX <= 1 && metrics.bodyChars > 100,
        `${vp.name} ${label}`,
        `overflowX=${metrics.overflowX}px, text=${metrics.bodyChars} chars`
      );
    }

    step(pageErrors.length === 0, `${vp.name} no page errors`, pageErrors.slice(0, 3).join(' | '));
    await page.close();
  }
} finally {
  await browser.close();
}

const failed = results.filter(r => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} responsive checks passed`);
process.exit(failed.length ? 1 : 0);
