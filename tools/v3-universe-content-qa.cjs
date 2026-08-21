const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const base = process.env.QA_BASE || 'http://127.0.0.1:4177';
const out = path.resolve(process.env.QA_OUT || 'universe-content-qa');
fs.mkdirSync(out, { recursive: true });
const failures = [];
const cases = [];
const check = (ok, name, detail = '') => { if (!ok) failures.push({ name, detail: String(detail) }); };

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH });
  const widths = [320, 390, 768, 1440];
  const themes = ['light', 'dark'];

  async function open(width, theme, reduced = false) {
    const context = await browser.newContext({
      viewport: { width, height: width <= 390 ? 844 : width <= 768 ? 1024 : 900 },
      colorScheme: theme,
      reducedMotion: reduced ? 'reduce' : 'no-preference',
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(`pageerror:${error.message}`));
    page.on('console', message => { if (message.type() === 'error') errors.push(`console:${message.text()}`); });
    return { context, page, errors };
  }

  async function basics(page, label) {
    await page.waitForTimeout(120);
    const data = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      broken: [...document.images].filter(img => img.complete && !img.naturalWidth).map(img => img.src),
    }));
    check(data.scrollWidth <= data.clientWidth + 1, `${label}:overflow`, JSON.stringify(data));
    check(data.broken.length === 0, `${label}:broken-images`, data.broken.join('\n'));
  }

  for (const width of widths) for (const theme of themes) {
    const label = `growth-${width}-${theme}`;
    const { context, page, errors } = await open(width, theme);
    try {
      await page.goto(`${base}/docs/v3-constellation-prototypes/nebula-growth.html`, { waitUntil: 'domcontentloaded' });
      await basics(page, label);
      const stars = page.locator('.growth-star');
      check(await stars.count() === 7, `${label}:star-count`, await stars.count());
      const hits = await stars.evaluateAll(nodes => nodes.map(node => { const r = node.getBoundingClientRect(); return [r.width, r.height]; }));
      check(hits.every(([w, h]) => w >= 44 && h >= 44), `${label}:44px`, JSON.stringify(hits));
      await stars.nth(6).click();
      check((await page.locator('[data-growth-time]').textContent()) === '2026.06', `${label}:select-last`);
      await stars.nth(0).focus();
      await page.keyboard.press('ArrowRight');
      check(await stars.nth(1).evaluate(node => document.activeElement === node), `${label}:arrow-key`);
      check(await page.locator('.rank-point').count() === 7, `${label}:rank-count`);
      check((await page.locator('.rank-point').last().locator('b').textContent()) === 'A', `${label}:rank-end`);
      check(errors.length === 0, `${label}:errors`, errors.join('\n'));
      cases.push(label);
      if (theme === 'light' && [320, 1440].includes(width)) await page.screenshot({ path: path.join(out, `${label}.png`), fullPage: true });
    } catch (error) { failures.push({ name: label, detail: error.stack || String(error) }); }
    await context.close();
  }

  for (const width of widths) for (const theme of themes) {
    const label = `observatory-${width}-${theme}`;
    const { context, page, errors } = await open(width, theme);
    try {
      await page.goto(`${base}/docs/v3-constellation-prototypes/nebula-observatory.html`, { waitUntil: 'domcontentloaded' });
      await basics(page, label);

      await page.locator('[data-wall-power]').click();
      await page.locator('[data-wall-sensor]').evaluate(el => { el.value = '501'; el.dispatchEvent(new Event('input', { bubbles: true })); });
      check((await page.locator('[data-wall-latch]').textContent()) === 'true', `${label}:wall-latch`);
      check(!(await page.locator('[data-wall-time]').isDisabled()), `${label}:wall-time-enabled`);
      const wallCases = [
        [26, '초록', '1000 Hz', '정방향'],
        [27, '노랑', '1000 Hz', '추가 스텝 없음'],
        [47, '노랑 점멸', 'OFF', '추가 스텝 없음'],
        [70, '빨강+노랑 점멸', 'OFF', '추가 스텝 없음'],
        [90, '빨강', 'OFF', '역방향'],
        [110, '3색 교차', 'OFF', '정지'],
      ];
      for (const [second, phase, buzzer, motor] of wallCases) {
        await page.locator('[data-wall-time]').evaluate((el, value) => { el.value = String(value); el.dispatchEvent(new Event('input', { bubbles: true })); }, second);
        check((await page.locator('[data-wall-phase]').textContent()) === phase, `${label}:wall-${second}-phase`);
        check((await page.locator('[data-wall-buzzer]').textContent()) === buzzer, `${label}:wall-${second}-buzzer`);
        check((await page.locator('[data-wall-motor]').textContent()) === motor, `${label}:wall-${second}-motor`);
      }

      await page.locator('[data-ucast-entry="0"]').click();
      check((await page.locator('[data-ucast-state="0"]').textContent()) === 'WARNING', `${label}:ucast-ch1-start`);
      check((await page.locator('[data-ucast-state="1"]').textContent()) === 'IDLE', `${label}:ucast-ch2-idle`);
      check((await page.locator('[data-ucast-common]').textContent()) === 'WARNING', `${label}:ucast-common-on`);
      const hz = Number((await page.locator('[data-ucast-siren]').textContent()).replace(/\D/g, ''));
      check(hz >= 800 && hz <= 1800, `${label}:ucast-siren-range`, hz);
      await page.locator('[data-ucast-entry="1"]').click();
      await page.locator('[data-ucast-exit="0"]').click();
      check((await page.locator('[data-ucast-state="0"]').textContent()) === 'IDLE', `${label}:ucast-ch1-exit`);
      check((await page.locator('[data-ucast-state="1"]').textContent()) === 'WARNING', `${label}:ucast-ch2-stays`);
      check((await page.locator('[data-ucast-common]').textContent()) === 'WARNING', `${label}:ucast-common-stays`);
      await page.locator('[data-ucast-exit="1"]').click();
      check((await page.locator('[data-ucast-common]').textContent()) === 'IDLE', `${label}:ucast-common-off`);
      await page.locator('[data-ucast-all-start]').click();
      check((await page.locator('[data-ucast-state="0"]').textContent()) === 'WARNING' && (await page.locator('[data-ucast-state="1"]').textContent()) === 'WARNING', `${label}:ucast-all-start`);
      await page.locator('[data-ucast-all-stop]').click();
      check((await page.locator('[data-ucast-common]').textContent()) === 'IDLE', `${label}:ucast-all-stop`);

      const anomaly = page.locator('[data-anomaly-star]');
      const hit = await anomaly.evaluate(node => { const r = node.getBoundingClientRect(); return [r.width, r.height]; });
      check(hit[0] >= 44 && hit[1] >= 44, `${label}:area51-hit`, JSON.stringify(hit));
      await anomaly.click();
      check((await page.locator('[data-area51-panel]').getAttribute('aria-hidden')) === 'false', `${label}:area51-open`);
      check((await page.locator('[data-area51-panel]').textContent()).includes('BrawlCraft'), `${label}:area51-record`);
      check(errors.length === 0, `${label}:errors`, errors.join('\n'));
      cases.push(label);
      if (theme === 'light' && [320, 1440].includes(width)) await page.screenshot({ path: path.join(out, `${label}.png`), fullPage: true });
    } catch (error) { failures.push({ name: label, detail: error.stack || String(error) }); }
    await context.close();
  }

  {
    const label = 'transit-dock';
    const { context, page, errors } = await open(390, 'dark', true);
    try {
      await page.goto(`${base}/docs/v3-constellation-prototypes/nebula-transit.html`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('.sky-body', { timeout: 5000 });
      await basics(page, label);
      const links = page.locator('.universe-dock a');
      check(await links.count() === 2, `${label}:count`);
      const hrefs = await links.evaluateAll(nodes => nodes.map(node => node.getAttribute('href')));
      check(hrefs.includes('nebula-growth.html') && hrefs.includes('nebula-observatory.html'), `${label}:hrefs`, JSON.stringify(hrefs));
      const hits = await links.evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().height));
      check(hits.every(height => height >= 44), `${label}:44px`, JSON.stringify(hits));
      check(errors.length === 0, `${label}:errors`, errors.join('\n'));
      cases.push(label);
    } catch (error) { failures.push({ name: label, detail: error.stack || String(error) }); }
    await context.close();
  }

  {
    const label = 'observatory-reduced-motion';
    const { context, page, errors } = await open(390, 'light', true);
    try {
      await page.goto(`${base}/docs/v3-constellation-prototypes/nebula-observatory.html`, { waitUntil: 'domcontentloaded' });
      await page.locator('[data-ucast-entry="0"]').click();
      await page.waitForTimeout(80);
      check((await page.locator('[data-ucast-common]').textContent()) === 'WARNING', `${label}:state`);
      check(errors.length === 0, `${label}:errors`, errors.join('\n'));
      cases.push(label);
    } catch (error) { failures.push({ name: label, detail: error.stack || String(error) }); }
    await context.close();
  }

  await browser.close();
  const result = { cases: cases.length, failures };
  fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
  if (failures.length) process.exit(1);
})().catch(error => { console.error(error); process.exit(1); });
