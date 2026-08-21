const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const base = 'http://127.0.0.1:4173';
const outDir = path.resolve(process.env.QA_OUT || 'gateway-qa-artifacts');
fs.mkdirSync(outDir, { recursive: true });

const failures = [];
const cases = [];
const widths = [320, 360, 390, 768, 1024, 1280, 1440];
const themes = ['light', 'dark'];

function fail(name, detail) { failures.push({ name, detail: String(detail) }); }
function check(cond, name, detail = 'assertion failed') { if (!cond) fail(name, detail); }
function heightFor(w) { return w <= 390 ? 844 : w <= 768 ? 1024 : 900; }

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH });

  async function open(width, theme = 'dark', reduced = false, touch = width <= 390) {
    const context = await browser.newContext({
      viewport: { width, height: heightFor(width) },
      colorScheme: theme,
      reducedMotion: reduced ? 'reduce' : 'no-preference',
      hasTouch: touch,
      isMobile: touch,
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
    page.on('console', m => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
    return { context, page, errors };
  }

  async function noOverflow(page, label) {
    const d = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
    check(d.sw <= d.cw + 1, `${label}: horizontal overflow`, JSON.stringify(d));
  }

  // Existing regression matrix plus new gateway constraints.
  for (const width of widths) {
    for (const theme of themes) {
      const label = `gateway-${width}-${theme}`;
      const { context, page, errors } = await open(width, theme, false, width <= 390);
      try {
        await page.goto(`${base}/docs/v3-constellation-prototypes/nebula-gateway.html`, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('[data-gate]');
        await page.waitForTimeout(180);
        await noOverflow(page, label);
        const info = await page.evaluate(() => {
          const gate = document.querySelector('[data-gate]');
          const wrap = document.querySelector('[data-gate-wrap]');
          const r = gate.getBoundingClientRect();
          const wr = wrap.getBoundingClientRect();
          return {
            gateName: !!document.querySelector('.gate-name'),
            mote: !!document.querySelector('[data-gate-mote]'),
            width: r.width, left: r.left, right: r.right,
            wrapLeft: wr.left, wrapRight: wr.right,
            clip: getComputedStyle(gate).clipPath,
            rot: getComputedStyle(gate).transform,
            bodyFont: getComputedStyle(document.body).fontFamily,
          };
        });
        const min = width <= 768 ? 107 : 131;
        const max = width <= 768 ? 151 : 183;
        check(info.width >= min && info.width <= max, `${label}: randomized width out of range`, JSON.stringify(info));
        check(info.left >= info.wrapLeft - 1 && info.right <= info.wrapRight + 1, `${label}: gate escaped safe slot`, JSON.stringify(info));
        check(info.left >= -1 && info.right <= width + 1, `${label}: gate escaped viewport`, JSON.stringify(info));
        check(!info.gateName, `${label}: CONSTELLATION label remains`);
        check(info.mote, `${label}: escaped mote missing`);
        check(info.clip && info.clip !== 'none', `${label}: torn clip missing`, info.clip);
        check(/Noto Sans KR/i.test(info.bodyFont), `${label}: v2 font polluted`, info.bodyFont);
        check(errors.length === 0, `${label}: browser errors`, errors.join('\n'));
        if ([320, 768, 1440].includes(width)) await page.screenshot({ path: path.join(outDir, `${label}.png`), fullPage: true });
        cases.push(label);
      } catch (e) { fail(label, e.stack || e); }
      await context.close();
    }
  }

  // Randomization must materially vary while staying within the safe slot.
  for (const width of [390, 1440]) {
    const label = `gateway-random-${width}`;
    const { context, page, errors } = await open(width, 'light', false, width <= 390);
    try {
      const variants = new Set();
      for (let i = 0; i < 8; i++) {
        await page.goto(`${base}/docs/v3-constellation-prototypes/nebula-gateway.html?sample=${i}`, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('[data-gate]');
        const v = await page.evaluate(() => {
          const gate = document.querySelector('[data-gate]');
          const wrap = document.querySelector('[data-gate-wrap]');
          const r = gate.getBoundingClientRect();
          const wr = wrap.getBoundingClientRect();
          return { width: Math.round(r.width), left: Math.round(r.left), right: Math.round(r.right), wrapLeft: Math.round(wr.left), wrapRight: Math.round(wr.right), clip: getComputedStyle(gate).clipPath };
        });
        variants.add(`${v.width}|${v.left}|${v.clip}`);
        check(v.left >= v.wrapLeft - 1 && v.right <= v.wrapRight + 1, `${label}: sample escaped safe slot`, JSON.stringify(v));
      }
      check(variants.size >= 4, `${label}: insufficient refresh variation`, `variants=${variants.size}`);
      check(errors.length === 0, `${label}: browser errors`, errors.join('\n'));
      cases.push(label);
    } catch (e) { fail(label, e.stack || e); }
    await context.close();
  }

  // Reduced motion: no escaped mote animation.
  {
    const label = 'gateway-390-dark-reduced';
    const { context, page, errors } = await open(390, 'dark', true, true);
    try {
      await page.goto(`${base}/docs/v3-constellation-prototypes/nebula-gateway.html`, { waitUntil: 'domcontentloaded' });
      const mote = await page.locator('[data-gate-mote]').evaluate(el => ({ display:getComputedStyle(el).display, animation:getComputedStyle(el).animationName }));
      check(mote.display === 'none' || mote.animation === 'none', `${label}: mote still animates`, JSON.stringify(mote));
      await page.focus('[data-gate]');
      check(errors.length === 0, `${label}: browser errors`, errors.join('\n'));
      cases.push(label);
    } catch (e) { fail(label, e.stack || e); }
    await context.close();
  }

  // Transit: regression matrix and mobile observation panel behavior.
  for (const width of widths) {
    for (const theme of themes) {
      const label = `transit-${width}-${theme}`;
      const mobile = width <= 720;
      const { context, page, errors } = await open(width, theme, false, width <= 390);
      try {
        await page.goto(`${base}/docs/v3-constellation-prototypes/nebula-transit.html`, { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => document.querySelectorAll('.sky-body').length === 20, null, { timeout: 10000 });
        await noOverflow(page, label);
        const back = await page.locator('.stage-back').evaluate(el => { const r=el.getBoundingClientRect(); return { href:el.getAttribute('href'), width:r.width, height:r.height, bottom:r.bottom }; });
        check(back.href === '../../', `${label}: wrong return path`, JSON.stringify(back));
        if (mobile) check(back.height >= 43.5, `${label}: mobile return target <44px`, JSON.stringify(back));

        const first = page.locator('.sky-body').first();
        const expectedTitle = (await first.locator('.sky-name').textContent())?.trim();
        await first.click();
        check((await first.getAttribute('aria-expanded')) === 'true', `${label}: star did not expand`);
        const panel = page.locator('[data-mobile-observation]');
        if (mobile) {
          check(!(await panel.isHidden()), `${label}: mobile panel stayed hidden`);
          const title = (await panel.locator('[data-mobile-title]').textContent())?.trim();
          check(title === expectedTitle, `${label}: mobile panel title mismatch`, `${title} != ${expectedTitle}`);
          check((await first.locator('.sky-more').getAttribute('aria-hidden')) === 'true', `${label}: inline detail exposed on mobile`);
          const pr = await panel.evaluate(el => { const r=el.getBoundingClientRect(); return { left:r.left, right:r.right, top:r.top, bottom:r.bottom }; });
          check(pr.left >= -1 && pr.right <= width + 1, `${label}: panel outside viewport`, JSON.stringify(pr));
          if ([320, 390].includes(width) && theme === 'dark') await page.screenshot({ path:path.join(outDir, `${label}-panel.png`), fullPage:true });
          await panel.locator('[data-mobile-close]').click();
          check(await panel.isHidden(), `${label}: mobile panel did not close`);
          check((await first.getAttribute('aria-expanded')) === 'false', `${label}: close did not collapse star`);
        } else {
          check(await panel.isHidden(), `${label}: desktop mobile panel visible`);
          check((await first.locator('.sky-more').getAttribute('aria-hidden')) === 'false', `${label}: desktop inline detail hidden`);
          await page.keyboard.press('Escape');
          check((await first.getAttribute('aria-expanded')) === 'false', `${label}: Escape failed`);
        }

        const years = page.locator('.orbit-year');
        await years.nth(1).click();
        await page.waitForFunction(() => document.querySelectorAll('.sky-body').length === 15);
        await years.nth(2).click();
        await page.waitForFunction(() => document.querySelectorAll('.sky-body').length === 15);
        await years.nth(0).click();
        await page.waitForFunction(() => document.querySelectorAll('.sky-body').length === 20);
        check(errors.length === 0, `${label}: browser errors`, errors.join('\n'));
        if ([768,1440].includes(width) && theme === 'dark') await page.screenshot({ path:path.join(outDir, `${label}.png`), fullPage:true });
        cases.push(label);
      } catch (e) { fail(label, e.stack || e); }
      await context.close();
    }
  }

  await browser.close();
  const result = { cases: cases.length, failures, widths, themes };
  fs.writeFileSync(path.join(outDir, 'results.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
  if (failures.length) process.exit(1);
})().catch(e => { console.error(e); process.exit(1); });
