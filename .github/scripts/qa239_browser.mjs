import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const BASE = 'http://127.0.0.1:4173';
const results = [];
const failures = [];

function ok(name, detail = '') {
  results.push(`PASS ${name}${detail ? ` — ${detail}` : ''}`);
}
function fail(name, error) {
  const message = error instanceof Error ? error.message : String(error);
  failures.push(`FAIL ${name} — ${message}`);
}
function assert(value, message) {
  if (!value) throw new Error(message);
}
async function run(name, fn) {
  try { await fn(); ok(name); } catch (error) { fail(name, error); }
}

const browser = await chromium.launch({ headless: true });

async function open(path, options = {}) {
  const context = await browser.newContext({
    viewport: options.viewport || { width: 1440, height: 1000 },
    colorScheme: options.colorScheme || 'light',
    reducedMotion: options.reducedMotion || 'reduce',
  });
  const page = await context.newPage();
  const pageErrors = [];
  const localHttpErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('response', (response) => {
    if (response.url().startsWith(BASE) && response.status() >= 400) {
      localHttpErrors.push(`${response.status()} ${response.url()}`);
    }
  });
  await page.addInitScript(() => localStorage.clear());
  await page.goto(`${BASE}/${path}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(250);
  return { context, page, pageErrors, localHttpErrors };
}

async function assertHealthy(session) {
  assert(session.pageErrors.length === 0, `page errors: ${session.pageErrors.join(' | ')}`);
  assert(session.localHttpErrors.length === 0, `local HTTP errors: ${session.localHttpErrors.join(' | ')}`);
}

await run('home desktop + system theme + language', async () => {
  const s = await open('index.html', { viewport: { width: 1440, height: 1000 }, colorScheme: 'light' });
  const { page, context } = s;
  assert(await page.locator('#themeToggle, #themeToggleMobile').count() === 0, 'manual theme controls still exist');
  assert(await page.evaluate(() => document.documentElement.dataset.theme) === 'light', 'initial light scheme not applied');
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await page.waitForTimeout(100);
  assert(await page.evaluate(() => document.documentElement.dataset.theme) === 'dark', 'live dark scheme change not applied');
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
  await page.waitForTimeout(100);
  assert(await page.evaluate(() => document.documentElement.dataset.theme) === 'light', 'live light scheme change not applied');

  await page.locator('#langToggle').click();
  assert(await page.evaluate(() => document.documentElement.lang) === 'en', 'English language toggle failed');
  assert((await page.locator('#projects .section-title').textContent())?.trim() === 'Projects', 'English section title mismatch');
  await page.locator('#langToggle').click();
  assert(await page.evaluate(() => document.documentElement.lang) === 'ko', 'Korean language toggle failed');

  const notion = page.locator('.devicon-notion-plain').first();
  assert(await notion.count() === 1, 'Notion icon missing');
  const notionStyle = await notion.evaluate((el) => ({
    display: getComputedStyle(el).display,
    visibility: getComputedStyle(el).visibility,
    opacity: Number(getComputedStyle(el).opacity),
    pseudo: getComputedStyle(el, '::before').content,
  }));
  assert(notionStyle.display !== 'none' && notionStyle.visibility !== 'hidden' && notionStyle.opacity > 0, 'Notion icon hidden');
  assert(notionStyle.pseudo && notionStyle.pseudo !== 'none' && notionStyle.pseudo !== 'normal', 'Notion glyph did not load');
  await page.screenshot({ path: 'qa-artifacts/home-light-1440.png', fullPage: false });
  await assertHealthy(s);
  await context.close();
});

for (const width of [320, 390, 717]) {
  await run(`home responsive ${width}px`, async () => {
    const s = await open('index.html', { viewport: { width, height: 900 }, colorScheme: 'dark' });
    const { page, context } = s;
    const dims = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      theme: document.documentElement.dataset.theme,
      email: (() => {
        const el = document.querySelector('.hero-email-wrap');
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { left: r.left, right: r.right, width: r.width };
      })(),
    }));
    assert(dims.scrollWidth <= dims.clientWidth + 2, `horizontal overflow ${dims.scrollWidth}/${dims.clientWidth}`);
    assert(dims.theme === 'dark', 'dark scheme not applied');
    assert(dims.email, 'email/capybara wrapper missing');
    assert(dims.email.left >= -1 && dims.email.right <= width + 1, `email wrapper out of viewport: ${JSON.stringify(dims.email)}`);
    if (width === 390) await page.screenshot({ path: 'qa-artifacts/home-dark-390.png', fullPage: false });
    await assertHealthy(s);
    await context.close();
  });
}

await run('GongGam / Recipe screenshot gallery', async () => {
  const s = await open('projects/Legend_SakSak_GongGam_AI/index.html', { colorScheme: 'dark' });
  const { page, context } = s;
  const gallery = page.locator('.detail-gallery-screenshots img');
  assert(await gallery.count() === 4, `expected 4 screenshots, got ${await gallery.count()}`);
  await page.waitForFunction(() => [...document.querySelectorAll('.detail-gallery-screenshots img')].every((img) => img.complete && img.naturalWidth > 0));
  const info = await gallery.evaluateAll((imgs) => imgs.map((img) => ({ src: img.getAttribute('src'), w: img.naturalWidth, h: img.naturalHeight })));
  for (const [file, w, h] of [
    ['empathy-chat.webp', 1000, 643],
    ['recipe-dark.webp', 1000, 622],
    ['recipe-light.webp', 1000, 631],
  ]) {
    const found = info.find((x) => x.src?.endsWith(file));
    assert(found, `${file} missing`);
    assert(found.w === w && found.h === h, `${file} dimensions ${found.w}x${found.h}, expected ${w}x${h}`);
  }
  await page.locator('.detail-gallery-screenshots').scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'qa-artifacts/gonggam-gallery.png', fullPage: false });
  await assertHealthy(s);
  await context.close();
});

await run('Wall_Sina repeatable barrier flow', async () => {
  const s = await open('projects/Wall_Sina/index.html');
  const { page, context } = s;
  await page.getByRole('button', { name: '시스템 켜기' }).click();
  const detect = page.getByRole('button', { name: '해수면 상승 감지' });
  await detect.click();
  await page.waitForTimeout(150);
  assert((await page.locator('.demo-live-status').textContent())?.includes('감시 상태'), 'first cycle did not finish');
  assert(!(await page.locator('.wall-rig').evaluate((el) => el.classList.contains('barrier-raised'))), 'barrier stayed raised after drainage');
  await detect.click();
  await page.waitForTimeout(150);
  assert((await page.locator('.demo-live-status').textContent())?.includes('감시 상태'), 'second cycle did not finish');
  await assertHealthy(s);
  await context.close();
});

await run('U-CAST forward/reverse channels', async () => {
  const s = await open('projects/2026_U-CAST/index.html');
  const { page, context } = s;
  for (const label of ['CH-1 정방향', 'CH-1 역방향', 'CH-2 정방향', 'CH-2 역방향']) {
    await page.getByRole('button', { name: label }).click();
    await page.waitForTimeout(80);
    assert((await page.locator('.demo-live-status').textContent())?.includes('횡단 완료'), `${label} did not complete`);
  }
  assert((await page.locator('.ucast-driver-warning').textContent())?.includes('보행자 없음'), 'warning did not clear');
  await assertHealthy(s);
  await context.close();
});

await run('PlantClock source-aligned interactions', async () => {
  const s = await open('projects/PlantClock/index.html');
  const { page, context } = s;
  const soilBefore = await page.locator('.plantclock-lcd span').first().textContent();
  for (let i = 0; i < 3; i += 1) await page.getByRole('button', { name: '시간 +10분' }).click();
  const soilAfter = await page.locator('.plantclock-lcd span').first().textContent();
  assert(soilBefore !== soilAfter, `soil value stayed fixed: ${soilBefore}`);
  assert(await page.locator('.plantclock-device').evaluate((el) => el.classList.contains('has-alert')), '30-minute alert did not activate');
  await page.getByRole('button', { name: '팬 레버 ON' }).click();
  assert(await page.locator('.plantclock-device').evaluate((el) => el.classList.contains('fan-on')), 'fan did not turn on');
  const fanOnColor = await page.locator('.plant-fan-led').evaluate((el) => getComputedStyle(el).backgroundColor);
  await page.getByRole('button', { name: '팬 레버 OFF' }).click();
  assert(!(await page.locator('.plantclock-device').evaluate((el) => el.classList.contains('fan-on'))), 'fan did not turn off');
  const fanOffColor = await page.locator('.plant-fan-led').evaluate((el) => getComputedStyle(el).backgroundColor);
  assert(fanOnColor !== fanOffColor, 'fan status LED did not change color');
  await assertHealthy(s);
  await context.close();
});

await run('BerryIno attendance timestamp', async () => {
  const s = await open('projects/BerryIno/index.html');
  const { page, context } = s;
  await page.locator('#berry-fictional-id').fill('0004');
  await page.getByRole('button', { name: '직접 출석' }).click();
  const row = (await page.locator('.berry-attendance-list li').first().textContent()) || '';
  assert(row.includes('DEMO-0004'), `attendance ID missing: ${row}`);
  assert(/\d{4}[^\d]+\d{2}[^\d]+\d{2}.*\d{2}:\d{2}:\d{2}/.test(row), `date/time missing: ${row}`);
  await assertHealthy(s);
  await context.close();
});

await run('Password doorlock 123456 + immediate alarm', async () => {
  const s = await open('projects/Master_Creator_Challenge/index.html');
  const { page, context } = s;
  assert(await page.locator('[data-project-demo="doorlock"]').count() === 1, 'doorlock demo root missing');
  for (const key of ['1','2','3','4','5','6','#']) {
    await page.locator('.doorlock-key').filter({ hasText: new RegExp(`^${key === '*' ? '\\*' : key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) }).click();
  }
  assert(await page.locator('.doorlock-rig').evaluate((el) => el.classList.contains('is-unlocked')), 'correct six-digit password did not unlock');
  await page.locator('.doorlock-key').filter({ hasText: /^C$/ }).click();
  await page.locator('.doorlock-key').filter({ hasText: /^1$/ }).click();
  await page.locator('.doorlock-key').filter({ hasText: /^#$/ }).click();
  assert((await page.locator('.demo-live-status').textContent())?.includes('Access Denied'), 'wrong confirmed password did not alarm immediately');
  await assertHealthy(s);
  await context.close();
});

await run('Cafeteria counter and removed Gorilla Cell', async () => {
  const s = await open('projects/meal_queue_signal_counter/index.html');
  const { page, context } = s;
  assert(await page.locator('.signal-gorilla-cell').count() === 0, 'Gorilla Cell visual still present');
  const count = page.getByRole('button', { name: '입장 인원 +1' });
  await count.click(); await count.click(); await count.click();
  await page.waitForTimeout(100);
  assert((await page.locator('.signal-counter-display strong').textContent())?.trim() === '00', 'counter did not reset after red phase');
  assert(await page.locator('.signal-counter-device').evaluate((el) => el.classList.contains('is-green')), 'counter did not return to green');
  await assertHealthy(s);
  await context.close();
});

await browser.close();
const report = [...results, ...failures, '', `passed=${results.length}`, `failed=${failures.length}`].join('\n');
await fs.mkdir('qa-artifacts', { recursive: true });
await fs.writeFile('qa-artifacts/browser-report.txt', report + '\n');
console.log(report);
if (failures.length) process.exit(1);
