const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const out = path.resolve(process.env.CAPTURE_OUT || '../captures');
fs.mkdirSync(out, { recursive: true });
const chrome = process.env.CHROME_PATH;
const healthUrl = process.env.HEALTH_NOTION_URL;
const kgaBase = process.env.KGA_BASE || 'http://127.0.0.1:4174';

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
      if (!saved) {
        await page.screenshot({ path: path.join(out, 'health-1.png'), fullPage: false });
      }
    } catch (error) {
      console.error('Health Notion capture failed:', error.message);
    }
    await context.close();
  }

  // KGA screenshots are rendered from the current real KGA web/admin source.
  // app.js is blocked so no private/runtime API data is fabricated or accessed.
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 960 }, colorScheme: 'light', deviceScaleFactor: 1 });
    const page = await context.newPage();
    await page.route('**/web/assets/app.js', (route) => route.abort());
    try {
      await page.goto(`${kgaBase}/web/index.html`, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(out, 'kga-home.png'), fullPage: true });

      await page.evaluate(() => {
        document.querySelectorAll('.view').forEach((el) => { el.hidden = true; });
        const shuttle = document.querySelector('#view-shuttle');
        if (shuttle) shuttle.hidden = false;
      });
      await page.waitForTimeout(250);
      await page.screenshot({ path: path.join(out, 'kga-shuttle.png'), fullPage: true });

      await page.goto(`${kgaBase}/web/admin.html`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(out, 'kga-admin.png'), fullPage: true });
    } catch (error) {
      console.error('KGA source render capture failed:', error.message);
    }
    await context.close();
  }

  await browser.close();
  console.log('captures:', fs.readdirSync(out).sort());
})().catch((error) => { console.error(error); process.exit(1); });
