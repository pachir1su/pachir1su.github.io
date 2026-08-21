const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const base = 'http://127.0.0.1:4173';
const outDir = path.resolve(process.env.QA_OUT || 'v3-integration-qa-artifacts');
fs.mkdirSync(outDir, { recursive: true });
const failures = [], cases = [];
const widths = [320,360,390,768,1024,1280,1440];
const themes = ['light','dark'];
const assetNames = new Set(['torn-portal-wide-v1.png','torn-portal-trail-v1.png','torn-portal-diagonal-v1.png']);
const fail = (name, detail) => failures.push({ name, detail:String(detail) });
const check = (cond, name, detail='assertion failed') => { if (!cond) fail(name, detail); };
const heightFor = w => w <= 390 ? 844 : w <= 768 ? 1024 : 900;

(async () => {
  const browser = await chromium.launch({ headless:true, executablePath:process.env.CHROME_PATH });

  async function open(width, theme='dark', reduced=false, touch=width<=390) {
    const context = await browser.newContext({ viewport:{width,height:heightFor(width)}, colorScheme:theme, reducedMotion:reduced?'reduce':'no-preference', hasTouch:touch, isMobile:touch, deviceScaleFactor:1 });
    await context.addInitScript(() => {
      window.__qaPlays = [];
      const original = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function() {
        window.__qaPlays.push(this.src || this.getAttribute('src') || '');
        try { this.pause(); } catch (_) {}
        return Promise.resolve();
      };
      window.__qaOriginalPlay = !!original;
    });
    const page = await context.newPage();
    const errors=[];
    page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
    page.on('console', m => { if (m.type()==='error') errors.push(`console: ${m.text()}`); });
    return {context,page,errors};
  }
  async function noOverflow(page,label) {
    const d=await page.evaluate(()=>({sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth}));
    check(d.sw<=d.cw+1,`${label}: horizontal overflow`,JSON.stringify(d));
  }

  // Gateway matrix: v2 integrity + live Canvas + material layer + no autoplay.
  for (const width of widths) for (const theme of themes) {
    const label=`gateway-${width}-${theme}`;
    const {context,page,errors}=await open(width,theme,false,width<=390);
    try {
      await page.goto(`${base}/docs/v3-constellation-prototypes/nebula-gateway.html`,{waitUntil:'domcontentloaded'});
      await page.waitForSelector('[data-gate-art]');
      await page.waitForFunction(()=>{const a=document.querySelector('[data-gate-art]'); return a && a.complete && a.naturalWidth>0;},null,{timeout:10000});
      await noOverflow(page,label);
      const info=await page.evaluate(()=>{
        const gate=document.querySelector('[data-gate]'), canvas=gate.querySelector('canvas'), art=gate.querySelector('[data-gate-art]'), wrap=document.querySelector('[data-gate-wrap]');
        const r=gate.getBoundingClientRect(), wr=wrap.getBoundingClientRect(), ar=art.getBoundingClientRect();
        return {w:r.width,left:r.left,right:r.right,wrapLeft:wr.left,wrapRight:wr.right,artLeft:ar.left,artRight:ar.right,asset:art.dataset.variant,nw:art.naturalWidth,nh:art.naturalHeight,parentClip:getComputedStyle(gate).clipPath,canvasClip:getComputedStyle(canvas).clipPath,bodyFont:getComputedStyle(document.body).fontFamily,plays:window.__qaPlays.slice(),mote:!!document.querySelector('[data-gate-mote]')};
      });
      const min=width<=768?106:127, max=width<=768?152:184;
      check(info.w>=min&&info.w<=max,`${label}: gate width`,JSON.stringify(info));
      check(info.left>=info.wrapLeft-1&&info.right<=info.wrapRight+1,`${label}: gate escaped safe slot`,JSON.stringify(info));
      check(info.left>=-1&&info.right<=width+1,`${label}: gate escaped viewport`,JSON.stringify(info));
      check(assetNames.has(info.asset),`${label}: unknown tear asset`,info.asset);
      check(info.nw>0&&info.nh>0,`${label}: tear asset not loaded`,JSON.stringify(info));
      check(info.parentClip==='none',`${label}: material layer still parent-clipped`,info.parentClip);
      check(info.canvasClip&&info.canvasClip!=='none',`${label}: live canvas tear clip missing`,info.canvasClip);
      check(/Noto Sans KR/i.test(info.bodyFont),`${label}: v2 font polluted`,info.bodyFont);
      check(info.plays.length===0,`${label}: audio before user gesture`,JSON.stringify(info.plays));
      check(info.mote,`${label}: escaped mote missing`);
      check(errors.length===0,`${label}: browser errors`,errors.join('\n'));
      if ([320,768,1440].includes(width)) await page.screenshot({path:path.join(outDir,`${label}.png`),fullPage:true});
      cases.push(label);
    } catch(e){fail(label,e.stack||e);} await context.close();
  }

  // 24 reloads: all three real tear assets must appear while staying safe.
  {
    const label='gateway-random-materials';
    const {context,page,errors}=await open(1440,'light',false,false); const seen=new Set();
    try {
      for(let i=0;i<24;i++){
        await page.goto(`${base}/docs/v3-constellation-prototypes/nebula-gateway.html?sample=${i}`,{waitUntil:'domcontentloaded'});
        await page.waitForFunction(()=>{const a=document.querySelector('[data-gate-art]');return a&&a.complete&&a.naturalWidth>0;});
        const v=await page.evaluate(()=>{const g=document.querySelector('[data-gate]'),w=document.querySelector('[data-gate-wrap]'),a=document.querySelector('[data-gate-art]');const r=g.getBoundingClientRect(),wr=w.getBoundingClientRect();return{asset:a.dataset.variant,left:r.left,right:r.right,wl:wr.left,wr:wr.right,width:Math.round(r.width)};});
        seen.add(v.asset); check(v.left>=v.wl-1&&v.right<=v.wr+1,`${label}: unsafe sample`,JSON.stringify(v));
      }
      check(seen.size===3,`${label}: not all three assets appeared`,JSON.stringify([...seen]));
      check(errors.length===0,`${label}: browser errors`,errors.join('\n')); cases.push(label);
    }catch(e){fail(label,e.stack||e);} await context.close();
  }

  // Gateway user gesture should emit only approved enter sound.
  {
    const label='gateway-approved-audio'; const {context,page,errors}=await open(1024,'dark',true,false);
    try {
      await page.goto(`${base}/docs/v3-constellation-prototypes/nebula-gateway.html`,{waitUntil:'domcontentloaded'});
      await page.click('[data-gate]'); await page.waitForTimeout(30);
      const plays=await page.evaluate(()=>window.__qaPlays.slice());
      check(plays.length===1&&plays[0].includes('sfx-06-enter-b-three-notes.wav'),`${label}: wrong enter sound`,JSON.stringify(plays));
      check(errors.length===0,`${label}: browser errors`,errors.join('\n')); cases.push(label);
    }catch(e){fail(label,e.stack||e);} await context.close();
  }

  // Transit matrix: panel, targets, years, accessibility, no autoplay.
  for (const width of widths) for (const theme of themes) {
    const label=`transit-${width}-${theme}`, mobile=width<=720;
    const {context,page,errors}=await open(width,theme,false,width<=390);
    try {
      await page.goto(`${base}/docs/v3-constellation-prototypes/nebula-transit.html`,{waitUntil:'domcontentloaded'});
      await page.waitForFunction(()=>document.querySelectorAll('.sky-body').length===20,null,{timeout:10000}); await noOverflow(page,label);
      const init=await page.evaluate(()=>({plays:window.__qaPlays.slice(),years:document.querySelectorAll('.orbit-year').length,bodies:document.querySelectorAll('.sky-body').length,minHit:Math.min(...[...document.querySelectorAll('.sky-body')].map(el=>el.getBoundingClientRect().height))}));
      check(init.plays.length===0,`${label}: audio before gesture`,JSON.stringify(init.plays)); check(init.years===3,`${label}: years !=3`,init.years); check(init.bodies===20,`${label}: bodies !=20`,init.bodies); check(init.minHit>=43.5,`${label}: hit target <44`,init.minHit);
      const first=page.locator('.sky-body').first(); const expected=((await first.locator('.sky-name').textContent())||'').trim(); await first.click(); await page.waitForTimeout(20);
      let plays=await page.evaluate(()=>window.__qaPlays.slice()); check(plays.some(x=>x.includes('sfx-05-select-a-bell.wav')),`${label}: select sound missing`,JSON.stringify(plays));
      const panel=page.locator('[data-mobile-observation]');
      if(mobile){check(!(await panel.isHidden()),`${label}: mobile panel hidden`);check(((await panel.locator('[data-mobile-title]').textContent())||'').trim()===expected,`${label}: panel title mismatch`);await panel.locator('[data-mobile-close]').click();}
      else {check(await panel.isHidden(),`${label}: desktop panel visible`);await page.keyboard.press('Escape');}
      const years=page.locator('.orbit-year'); await years.nth(1).click(); await page.waitForFunction(()=>document.querySelectorAll('.sky-body').length===15); plays=await page.evaluate(()=>window.__qaPlays.slice()); check(plays.some(x=>x.includes('sfx-04-year-a-wood.wav')),`${label}: year sound missing`,JSON.stringify(plays));
      await years.nth(2).click(); await page.waitForFunction(()=>document.querySelectorAll('.sky-body').length===15); await years.nth(0).click(); await page.waitForFunction(()=>document.querySelectorAll('.sky-body').length===20);
      const back=await page.locator('.stage-back').evaluate(el=>{const r=el.getBoundingClientRect();return{href:el.getAttribute('href'),h:r.height}}); check(back.href==='../../',`${label}: return path`,JSON.stringify(back)); if(mobile)check(back.h>=43.5,`${label}: return target <44`,JSON.stringify(back));
      check(errors.length===0,`${label}: browser errors`,errors.join('\n')); if([320,768,1440].includes(width)&&theme==='dark')await page.screenshot({path:path.join(outDir,`${label}.png`),fullPage:true}); cases.push(label);
    }catch(e){fail(label,e.stack||e);} await context.close();
  }

  // Reduced motion checks for both entry and transit.
  for (const target of ['nebula-gateway.html','nebula-transit.html']) {
    const label=`reduced-${target}`; const {context,page,errors}=await open(390,'dark',true,true);
    try { await page.goto(`${base}/docs/v3-constellation-prototypes/${target}`,{waitUntil:'domcontentloaded'}); if(target.includes('transit'))await page.waitForFunction(()=>document.querySelectorAll('.sky-body').length===20); const anim=await page.evaluate(()=>{const m=document.querySelector('[data-gate-mote]');return m?{display:getComputedStyle(m).display,animation:getComputedStyle(m).animationName}:null;}); if(anim)check(anim.display==='none'||anim.animation==='none',`${label}: mote animates`,JSON.stringify(anim)); check(errors.length===0,`${label}: browser errors`,errors.join('\n')); cases.push(label);}catch(e){fail(label,e.stack||e);} await context.close();
  }

  await browser.close();
  const result={cases:cases.length,failures,widths,themes}; fs.writeFileSync(path.join(outDir,'results.json'),JSON.stringify(result,null,2)); console.log(JSON.stringify(result,null,2)); if(failures.length)process.exit(1);
})().catch(e=>{console.error(e);process.exit(1);});
