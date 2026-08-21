const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const base = process.env.QA_BASE || 'http://127.0.0.1:4173';
const target = path.resolve(process.env.TARGET_DIR || '../target');
const out = path.resolve(process.env.QA_OUT || '../v2-phase-qa-artifacts');
fs.mkdirSync(out, { recursive: true });
const widths = [320, 360, 390, 768, 1024, 1280, 1440];
const failures = [];
const cases = [];
function check(ok, name, detail='assertion failed') { if (!ok) failures.push({ name, detail: String(detail) }); }
function heightFor(w) { return w <= 390 ? 844 : w <= 768 ? 1024 : 900; }

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH });
  async function open(w, theme='light', reduced=false) {
    const context = await browser.newContext({ viewport:{width:w,height:heightFor(w)}, colorScheme:theme, reducedMotion:reduced?'reduce':'no-preference', hasTouch:w<=390, isMobile:w<=390 });
    const page = await context.newPage();
    const errors=[]; const forbidden=[];
    page.on('pageerror', e => errors.push(`pageerror:${e.message}`));
    page.on('console', m => { if(m.type()==='error') errors.push(`console:${m.text()}`); });
    page.on('request', req => { const u=req.url(); if(/aos@|vanilla-tilt|devicons\/devicon/i.test(u)) forbidden.push(u); });
    await page.addInitScript(({theme}) => { localStorage.setItem('theme',theme); localStorage.setItem('lang','ko'); }, {theme});
    return {context,page,errors,forbidden};
  }
  async function verifyPage(page, label) {
    await page.waitForTimeout(120);
    const v=await page.evaluate(()=>({sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth,theme:document.documentElement.dataset.theme||'',lang:document.documentElement.lang,imgs:[...document.images].filter(i=>i.complete&&!i.naturalWidth).map(i=>i.src)}));
    check(v.sw<=v.cw+1,`${label}:overflow`,JSON.stringify(v));
    check(v.imgs.length===0,`${label}:broken images`,v.imgs.join('\n'));
  }

  for (const w of widths) for (const theme of ['light','dark']) {
    const label=`root-${w}-${theme}`; const {context,page,errors,forbidden}=await open(w,theme);
    try {
      await page.goto(`${base}/`,{waitUntil:'domcontentloaded'});
      await verifyPage(page,label);
      check(errors.length===0,`${label}:errors`,errors.join('\n'));
      check(forbidden.length===0,`${label}:forbidden third-party`,forbidden.join('\n'));
      if (w === 390 && theme === 'light') {
        const clickable = page.locator('.pfilter, .btn, .plink').first();
        if (await clickable.count()) await clickable.click();
        await page.waitForTimeout(80);
        check((await page.locator('.stamp-pop').count())===0,`${label}:stamp feedback removed`);
      }
      cases.push(label);
      if([320,768,1440].includes(w)&&theme==='light') await page.screenshot({path:path.join(out,`${label}.png`),fullPage:false});
    } catch(e){failures.push({name:label,detail:e.stack||String(e)});} await context.close();
  }

  const detailDirs = fs.readdirSync(path.join(target,'projects')).filter(d=>fs.existsSync(path.join(target,'projects',d,'index.html'))).sort();
  const redirectOnly = new Set(['Sibal_Life_Smoking']);
  for (const d of detailDirs) for (const w of [390,1440]) for (const theme of ['light','dark']) {
    const label=`detail-${d}-${w}-${theme}`; const {context,page,errors,forbidden}=await open(w,theme);
    try {
      await page.goto(`${base}/projects/${encodeURIComponent(d)}/`,{waitUntil:'domcontentloaded'});
      await page.waitForTimeout(80);
      if (redirectOnly.has(d)) {
        const pathname = new URL(page.url()).pathname;
        check(pathname === '/' || pathname === '/index.html',`${label}:redirect target`,page.url());
      } else {
        await verifyPage(page,label);
        check(errors.length===0,`${label}:errors`,errors.join('\n'));
        check(forbidden.length===0,`${label}:forbidden libraries`,forbidden.join('\n'));
        const hasDetail=await page.locator('script[src$="detail.js"]').count();
        check(hasDetail===1,`${label}:detail runtime missing`,hasDetail);
      }
      cases.push(label);
    } catch(e){failures.push({name:label,detail:e.stack||String(e)});} await context.close();
  }

  const demos={
    'Wall_Sina': async page => { const r=page.locator('[data-project-demo="wall"] input[type="range"]'); await r.fill('85'); check((await page.locator('.demo-status').innerText()).length>3,'wall:status'); },
    '2026_U-CAST': async page => { const b=page.locator('[data-project-demo="ucast"] .demo-channel .demo-btn').first(); await b.click(); check(await page.locator('.demo-warning').evaluate(el=>el.classList.contains('active')),'ucast:warning'); },
    'HEALTH_CHECK_PROJECT': async page => { const r=page.locator('[data-project-demo="health"] input[type="range"]').first(); await r.fill('130'); check((await page.locator('.demo-status').innerText()).length>3,'health:status'); },
    'BerryIno': async page => { await page.locator('[data-project-demo="berry"] .demo-btn').first().click(); check((await page.locator('.demo-log li').count())===1,'berry:attendance log'); },
    'PlantClock': async page => { const r=page.locator('[data-project-demo="plant"] input[type="range"]').first(); await r.fill('20'); check(await page.locator('.demo-status').evaluate(el=>el.classList.contains('warn')),'plant:alert'); },
  };
  for (const [d, test] of Object.entries(demos)) {
    const {context,page,errors}=await open(390,'dark',true); const label=`demo-${d}`;
    try { await page.goto(`${base}/projects/${d}/`,{waitUntil:'domcontentloaded'}); await page.waitForSelector('[data-project-demo]'); await test(page); await page.locator('#langToggle').click(); check((await page.locator('[data-project-demo]').count())===1,`${label}:lang rerender`); check(errors.length===0,`${label}:errors`,errors.join('\n')); cases.push(label); await page.screenshot({path:path.join(out,`${label}.png`),fullPage:false}); } catch(e){failures.push({name:label,detail:e.stack||String(e)});} await context.close();
  }

  {
    const {context,page}=await open(1440,'light');
    await page.goto(`${base}/projects/koreatechGongjiAgent/`,{waitUntil:'domcontentloaded'}); const kga=await page.locator('[data-media-followup="v27-kga-audit"] img').count(); check(kga>=2,'kga:additional media',`count=${kga}`); await context.close();
  }
  {
    const {context,page}=await open(1440,'light');
    await page.goto(`${base}/projects/HEALTH_CHECK_PROJECT/`,{waitUntil:'domcontentloaded'}); const notion=await page.locator('a[href*="pachir1su.notion.site/2025-SDGs"]').count(); check(notion>=2,'health:notion links',`count=${notion}`); const media=await page.locator('[data-media-source="health-notion"] img').count(); check(media>=1,'health:notion media',`count=${media}`); await context.close();
  }

  await browser.close();
  const result={cases:cases.length,detailPages:detailDirs.length,widths,failures};
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(result,null,2)); console.log(JSON.stringify(result,null,2));
  if(failures.length) process.exit(1);
})().catch(e=>{console.error(e);process.exit(1);});
