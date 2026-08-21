const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const base = 'http://127.0.0.1:4173';
const outDir = path.resolve(process.env.QA_OUT || 'qa-artifacts');
fs.mkdirSync(outDir, { recursive: true });

const widths = [320, 360, 390, 768, 1024, 1280, 1440];
const themes = ['light', 'dark'];
const failures = [];
const cases = [];

function fail(name, detail) {
  failures.push({ name, detail: String(detail) });
}
function assert(cond, name, detail) {
  if (!cond) fail(name, detail || 'assertion failed');
}
function heightFor(w) {
  if (w <= 390) return 844;
  if (w <= 768) return 1024;
  return 900;
}

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH });

  async function newPage(width, theme, reduced = false, touch = false) {
    const context = await browser.newContext({
      viewport: { width, height: heightFor(width) },
      colorScheme: theme,
      reducedMotion: reduced ? 'reduce' : 'no-preference',
      hasTouch: touch,
      isMobile: touch && width <= 390,
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
    page.on('console', m => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
    return { context, page, errors };
  }

  async function common(page, label) {
    const dims = await page.evaluate(() => ({
      sw: document.documentElement.scrollWidth,
      cw: document.documentElement.clientWidth,
      bodySw: document.body.scrollWidth,
    }));
    assert(dims.sw <= dims.cw + 1 && dims.bodySw <= dims.cw + 1, `${label}: horizontal overflow`, JSON.stringify(dims));
  }

  for (const width of widths) {
    for (const theme of themes) {
      const label = `gateway-${width}-${theme}`;
      const { context, page, errors } = await newPage(width, theme, false, width <= 390);
      try {
        await page.goto(`${base}/docs/v3-constellation-prototypes/nebula-gateway.html`, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('[data-gate]');
        await page.waitForTimeout(250);
        await common(page, label);
        const info = await page.evaluate(() => {
          const gate = document.querySelector('[data-gate]');
          const r = gate.getBoundingClientRect();
          return {
            bodyFont: getComputedStyle(document.body).fontFamily,
            gate: { left:r.left, right:r.right, width:r.width, height:r.height },
          };
        });
        assert(/Noto Sans KR/i.test(info.bodyFont), `${label}: v2 body font polluted`, info.bodyFont);
        assert(info.gate.left >= -1 && info.gate.right <= width + 1, `${label}: gate outside viewport`, JSON.stringify(info.gate));
        assert(info.gate.width <= (width <= 768 ? 221 : 261), `${label}: gate too wide`, JSON.stringify(info.gate));
        if ([320, 768, 1440].includes(width)) {
          await page.screenshot({ path: path.join(outDir, `${label}.png`), fullPage: true });
        }
        if (width === 390 && theme === 'dark') {
          await page.focus('[data-gate]');
          const before = await page.locator('[data-gate] canvas').evaluate(c => c.toDataURL());
          await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' });
          await page.evaluate(() => document.querySelector('[data-gate]').blur());
          const blurred = await page.locator('[data-gate] canvas').evaluate(c => c.toDataURL());
          await page.focus('[data-gate]');
          const focused = await page.locator('[data-gate] canvas').evaluate(c => c.toDataURL());
          assert(blurred !== focused || before !== focused, `${label}: reduced-motion focus did not redraw`, 'canvas unchanged');
        }
        assert(errors.length === 0, `${label}: browser errors`, errors.join('\n'));
        cases.push({ label, ok: errors.length === 0 });
      } catch (e) { fail(label, e.stack || e); }
      await context.close();
    }
  }

  for (const width of widths) {
    for (const theme of themes) {
      const label = `transit-${width}-${theme}`;
      const { context, page, errors } = await newPage(width, theme, false, width <= 390);
      try {
        await page.goto(`${base}/docs/v3-constellation-prototypes/nebula-transit.html`, { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => document.querySelectorAll('.sky-body').length === 20, null, { timeout: 10000 });
        await page.waitForFunction(() => document.querySelector('[data-loading]')?.hidden === true, null, { timeout: 10000 });
        await common(page, label);
        const counts = await page.evaluate(() => ({
          years: document.querySelectorAll('.orbit-year').length,
          bodies: document.querySelectorAll('.sky-body').length,
          back: document.querySelector('.stage-back')?.getAttribute('href'),
        }));
        assert(counts.years === 3, `${label}: year count`, JSON.stringify(counts));
        assert(counts.bodies === 20, `${label}: initial body count`, JSON.stringify(counts));
        assert(counts.back === '../../', `${label}: portfolio back path`, JSON.stringify(counts));

        const rects = await page.locator('.sky-body').evaluateAll((els) => els.map(el => {
          const r = el.getBoundingClientRect();
          return { name: el.querySelector('.sky-name')?.textContent, left:r.left, right:r.right, top:r.top, bottom:r.bottom, width:r.width, height:r.height };
        }));
        for (const r of rects) {
          assert(r.width >= 43.5 && r.height >= 43.5, `${label}: touch target <44px`, JSON.stringify(r));
          assert(r.left >= -1 && r.right <= width + 1, `${label}: label outside viewport`, JSON.stringify(r));
        }

        const first = page.locator('.sky-body').first();
        await first.click();
        assert((await first.getAttribute('aria-expanded')) === 'true', `${label}: expand aria`, await first.getAttribute('aria-expanded'));
        assert((await first.locator('.sky-more').getAttribute('aria-hidden')) === 'false', `${label}: expanded content aria-hidden`, await first.locator('.sky-more').getAttribute('aria-hidden'));
        await page.keyboard.press('Escape');
        assert((await first.getAttribute('aria-expanded')) === 'false', `${label}: Escape collapse`, await first.getAttribute('aria-expanded'));
        assert((await first.locator('.sky-more').getAttribute('aria-hidden')) === 'true', `${label}: collapsed content aria-hidden`, await first.locator('.sky-more').getAttribute('aria-hidden'));

        const yearButtons = page.locator('.orbit-year');
        await yearButtons.nth(1).click();
        await page.waitForFunction(() => document.querySelectorAll('.sky-body').length === 15);
        await yearButtons.nth(2).click();
        await page.waitForFunction(() => document.querySelectorAll('.sky-body').length === 15);
        await yearButtons.nth(0).click();
        await page.waitForFunction(() => document.querySelectorAll('.sky-body').length === 20);

        if ([320, 768, 1440].includes(width)) {
          await page.screenshot({ path: path.join(outDir, `${label}.png`), fullPage: true });
        }
        assert(errors.length === 0, `${label}: browser errors`, errors.join('\n'));
        cases.push({ label, ok: errors.length === 0 });
      } catch (e) { fail(label, e.stack || e); }
      await context.close();
    }
  }

  for (const width of [390, 1440]) {
    const label = `transit-${width}-dark-reduced`;
    const { context, page, errors } = await newPage(width, 'dark', true, width <= 390);
    try {
      await page.goto(`${base}/docs/v3-constellation-prototypes/nebula-transit.html`, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => document.querySelectorAll('.sky-body').length === 20, null, { timeout: 10000 });
      await page.locator('.sky-body').first().focus();
      await page.waitForTimeout(100);
      await common(page, label);
      assert(errors.length === 0, `${label}: browser errors`, errors.join('\n'));
      cases.push({ label, ok: errors.length === 0 });
    } catch (e) { fail(label, e.stack || e); }
    await context.close();
  }

  await browser.close();
  const result = { cases: cases.length, failures, widths, themes };
  fs.writeFileSync(path.join(outDir, 'results.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
  if (failures.length) process.exit(1);
})().catch((e) => { console.error(e); process.exit(1); });
