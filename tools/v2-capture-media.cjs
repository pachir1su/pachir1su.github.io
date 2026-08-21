const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const out = path.resolve(process.env.CAPTURE_OUT || '../captures');
fs.mkdirSync(out, { recursive: true });
const chrome = process.env.CHROME_PATH;
const healthUrl = process.env.HEALTH_NOTION_URL;
const runnerBase = process.env.RUNNER_BASE || 'http://127.0.0.1:4175';

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: chrome });

  // Public Notion source: collect only large rendered image elements. If none are
  // exposed as standalone images, keep a real page screenshot rather than inventing media.
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    try {
      await page.goto(healthUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(2500);
      for (let i = 0; i < 8; i++) {
        await page.evaluate(() => window.scrollBy(0, Math.max(600, innerHeight * 0.8)));
        await page.waitForTimeout(450);
      }
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(500);
      const imgs = page.locator('img');
      let saved = 0;
      for (let i = 0, n = await imgs.count(); i < n && saved < 4; i++) {
        const img = imgs.nth(i);
        const info = await img.evaluate((el) => {
          const r = el.getBoundingClientRect();
          return { nw: el.naturalWidth, nh: el.naturalHeight, w: r.width, h: r.height, alt: el.alt || '', src: el.currentSrc || el.src || '' };
        }).catch(() => null);
        if (!info || info.nw < 500 || info.nh < 280 || info.w < 260 || info.h < 140) continue;
        if (/avatar|icon|logo|emoji/i.test(`${info.alt} ${info.src}`)) continue;
        await img.scrollIntoViewIfNeeded();
        await page.waitForTimeout(150);
        await img.screenshot({ path: path.join(out, `health-${++saved}.png`) }).catch(() => { saved--; });
      }
      if (!saved) await page.screenshot({ path: path.join(out, 'health-1.png'), fullPage: false });
    } catch (error) {
      console.error('Health Notion capture failed:', error.message);
    }
    await context.close();
  }

  // KGA: render only material derived from the repository's reviewed design sources.
  // These are source-design screenshots, not live-operation screenshots. The portfolio
  // keeps the existing web-shuttle.webp as the separately verified live screen.
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1050 }, colorScheme: 'light', deviceScaleFactor: 1 });
    const page = await context.newPage();
    await page.goto(`${runnerBase}/tools/kga-source-snapshots.html`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.locator('#kga-design-hub .desktop').screenshot({ path: path.join(out, 'kga-home.png') });
    await page.locator('#kga-mobile-source .phone').screenshot({ path: path.join(out, 'kga-shuttle.png') });
    await context.close();
  }

  await browser.close();
  console.log('captures:', fs.readdirSync(out).sort());
})().catch((error) => { console.error(error); process.exit(1); });
