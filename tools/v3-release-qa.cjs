const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const base = process.env.QA_BASE || 'http://127.0.0.1:4176';
const out = path.resolve(process.env.QA_OUT || '../v3-release-qa-artifacts');
fs.mkdirSync(out, { recursive: true });
const failures = [];
const cases = [];
const check = (ok, name, detail='assertion failed') => { if (!ok) failures.push({name,detail:String(detail)}); };
const h = w => w <= 390 ? 844 : w <= 768 ? 1024 : 900;

(async () => {
  const browser = await chromium.launch({headless:true, executablePath:process.env.CHROME_PATH});
  async function open(w, theme='light', reduced=false) {
    const context = await browser.newContext({viewport:{width:w,height:h(w)},colorScheme:theme,reducedMotion:reduced?'reduce':'no-preference',hasTouch:w<=390,isMobile:w<=390});
    const page = await context.newPage();
    const errors=[];
    page.on('pageerror', e=>errors.push(`pageerror:${e.message}`));
    page.on('console', m=>{if(m.type()==='error') errors.push(`console:${m.text()}`);});
    await page.addInitScript(({theme})=>{localStorage.setItem('theme',theme);localStorage.setItem('lang','ko');},{theme});
    return {context,page,errors};
  }
  async function basics(page,label){
    await page.waitForTimeout(150);
    const x=await page.evaluate(()=>({sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth,broken:[...document.images].filter(i=>i.complete&&!i.naturalWidth).map(i=>i.src)}));
    check(x.sw<=x.cw+1,`${label}:overflow`,JSON.stringify(x));
    check(x.broken.length===0,`${label}:broken images`,x.broken.join('\n'));
  }

  // The gateway is randomized on every load. Stress four independent layouts per breakpoint/theme,
  // and reject overlap with any visible hero-main or hero-stat content, not only the buttons.
  for (const w of [320,360,390,768,1024,1280,1440]) for (const theme of ['light','dark']) {
    const {context,page,errors}=await open(w,theme,true);
    try {
      for (let attempt=1; attempt<=4; attempt++) {
        const label=`gateway-${w}-${theme}-r${attempt}`;
        await page.goto(`${base}/?gatewayQa=${w}-${theme}-${attempt}-${Date.now()}`,{waitUntil:'load'});
        await page.waitForTimeout(220);
        await basics(page,label);
        const data=await page.locator('[data-v3-gateway]').evaluate((slot)=>{
          const link=slot.querySelector('[data-v3-gateway-link]');
          const r=link.getBoundingClientRect();
          const hero=document.querySelector('.hero').getBoundingClientRect();
          const blockers=[...document.querySelectorAll('.hero-main > *, .hero-stats > *')]
            .filter(x=>x!==slot&&x.getClientRects().length)
            .map(x=>x.getBoundingClientRect());
          const overlap=blockers.some(b=>r.left<b.right+10&&r.right>b.left-10&&r.top<b.bottom+10&&r.bottom>b.top-10);
          const inside=r.left>=hero.left+4&&r.right<=hero.right-4&&r.top>=hero.top+52&&r.bottom<=hero.bottom-4;
          return {w:r.width,h:r.height,overlap,inside,text:(link.textContent||'').trim(),href:link.getAttribute('href'),img:!!link.querySelector('img[src]')};
        });
        check(data.w>=44&&data.h>=44,`${label}:touch target`,JSON.stringify(data));
        check(!data.overlap,`${label}:hero overlap`,JSON.stringify(data));
        check(data.inside,`${label}:inside hero`,JSON.stringify(data));
        check(data.text==='',`${label}:visual-only gateway`,data.text);
        check(data.img,`${label}:gateway asset`);
        cases.push(label);
        if (attempt===1&&[320,768,1440].includes(w)&&theme==='light') await page.screenshot({path:path.join(out,`gateway-${w}-${theme}.png`),fullPage:false});
      }
      check(errors.length===0,`gateway-${w}-${theme}:errors`,errors.join('\n'));
    } catch(e){failures.push({name:`gateway-${w}-${theme}`,detail:e.stack||String(e)});} await context.close();
  }

  // Reduced-motion navigation is 200ms: enter universe, go back, ensure bfcache/history return restores gateway state.
  {
    const {context,page,errors}=await open(390,'dark',true); const label='gateway-return-reset';
    try {
      await page.goto(`${base}/`,{waitUntil:'load'}); await page.waitForTimeout(180);
      await page.locator('[data-v3-gateway-link]').click();
      await page.waitForURL(/nebula-transit\.html/,{timeout:5000});
      await page.goBack({waitUntil:'domcontentloaded'}); await page.waitForTimeout(180);
      const state=await page.evaluate(()=>({entering:document.body.classList.contains('v3-gateway-entering'),slot:document.querySelector('[data-v3-gateway]')?.classList.contains('is-entering'),veil:document.querySelector('.v3-gateway-veil')?.classList.contains('is-open')}));
      check(!state.entering&&!state.slot&&!state.veil,`${label}:reset`,JSON.stringify(state));
      check(await page.locator('[data-v3-gateway-link]').isEnabled(),`${label}:clickable`);
      check(errors.length===0,`${label}:errors`,errors.join('\n')); cases.push(label);
    } catch(e){failures.push({name:label,detail:e.stack||String(e)});} await context.close();
  }

  // Universe transit responsive/interaction matrix.
  for (const w of [320,360,390,768,1024,1440]) for (const theme of ['light','dark']) {
    const label=`transit-${w}-${theme}`; const {context,page,errors}=await open(w,theme,true);
    try {
      await page.goto(`${base}/docs/v3-constellation-prototypes/nebula-transit.html`,{waitUntil:'domcontentloaded'});
      await page.waitForSelector('.sky-body',{timeout:5000}); await basics(page,label);
      const hit=await page.locator('.sky-body').first().evaluate(el=>{const r=el.getBoundingClientRect();return {w:r.width,h:r.height};});
      check(hit.w>=44&&hit.h>=44,`${label}:44px project target`,JSON.stringify(hit));
      await page.locator('.sky-body').first().click(); await page.waitForTimeout(80);
      check((await page.locator('.sky-body[aria-expanded="true"]').count())<=1,`${label}:single detail`);
      const years=page.locator('.orbit-year');
      if(await years.count()>1){await years.nth(1).click();await page.waitForTimeout(100);}
      check(errors.length===0,`${label}:errors`,errors.join('\n')); cases.push(label);
      if ([390,1440].includes(w)&&theme==='light') await page.screenshot({path:path.join(out,`${label}.png`),fullPage:false});
    } catch(e){failures.push({name:label,detail:e.stack||String(e)});} await context.close();
  }

  // Prototype gateway return reset directly (covers #179 behavior absorbed into #180 runtime).
  {
    const {context,page,errors}=await open(390,'light',true); const label='prototype-gateway-reset';
    try {
      await page.goto(`${base}/docs/v3-constellation-prototypes/nebula-gateway.html`,{waitUntil:'domcontentloaded'});
      const gate=page.locator('[data-gate]');
      await gate.click(); await page.waitForURL(/nebula-transit\.html/,{timeout:5000});
      await page.goBack({waitUntil:'domcontentloaded'}); await page.waitForTimeout(120);
      check(await gate.isEnabled(),`${label}:enabled after back`);
      check(!(await page.locator('.gate-veil.open').count()),`${label}:veil reset`);
      check(errors.length===0,`${label}:errors`,errors.join('\n')); cases.push(label);
    } catch(e){failures.push({name:label,detail:e.stack||String(e)});} await context.close();
  }

  await browser.close();
  const result={cases:cases.length,failures};
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(result,null,2));
  console.log(JSON.stringify(result,null,2));
  if(failures.length) process.exit(1);
})().catch(e=>{console.error(e);process.exit(1);});
