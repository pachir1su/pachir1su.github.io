#!/usr/bin/env bash
set -euo pipefail

mkdir -p evidence/screens

# 1) Capture pre-cleanup inventory. Offenders are expected before the sanitizer runs.
set +e
node tools/verify-media-metadata.js > evidence/media-before.json
printf 'media_before_exit=%s\n' "$?" > evidence/media-before-exit.txt
set -e

# 2) Apply the approved #192 composition, idempotently.
python3 <<'PY'
from pathlib import Path

index = Path('index.html')
text = index.read_text(encoding='utf-8')
if 'hero-email-capybara' not in text:
    old = '''<button type="button" class="btn btn-ghost contact-email hero-email" title="클릭하면 복사됩니다">
  <i class="fas fa-envelope"></i><span class="email-addr">capybara@koreatech.ac.kr</span><span class="copy-hint sr-only">복사</span>
</button>'''
    new = '''<div class="hero-email-wrap">
  <img class="hero-email-capybara" src="assets/capybara-mail-peek.webp" width="256" height="256" alt="" aria-hidden="true" decoding="async" draggable="false" />
  <button type="button" class="btn btn-ghost contact-email hero-email" title="클릭하면 복사됩니다">
    <i class="fas fa-envelope"></i><span class="email-addr">capybara@koreatech.ac.kr</span><span class="copy-hint sr-only">복사</span>
  </button>
</div>'''
    if text.count(old) != 1:
        raise SystemExit(f'index email anchor count={text.count(old)}')
    index.write_text(text.replace(old, new), encoding='utf-8')

style = Path('style.css')
css = style.read_text(encoding='utf-8')
if '.hero-email-wrap {' not in css:
    anchor = '''.hero-email {
  max-width: 100%;
}
.hero-email .email-addr {
  overflow-wrap: anywhere;
}'''
    replacement = '''/* #192 — 이메일 버튼 뒤에서 카피바라가 얼굴과 앞발을 내미는 장식. */
.hero-email-wrap {
  position: relative;
  display: inline-flex;
  align-items: flex-end;
  padding-top: 34px;
  isolation: isolate;
}
.hero-email-capybara {
  position: absolute;
  left: 50%;
  bottom: 22px;
  width: 112px;
  max-width: none;
  height: auto;
  transform: translateX(-50%);
  pointer-events: none;
  user-select: none;
  -webkit-user-drag: none;
  z-index: 0;
}
.hero-email {
  position: relative;
  z-index: 1;
  max-width: 100%;
}
.hero-email .email-addr {
  overflow-wrap: anywhere;
}'''
    if css.count(anchor) != 1:
        raise SystemExit(f'style email anchor count={css.count(anchor)}')
    css = css.replace(anchor, replacement)

    mobile = '''@media (max-width: 640px) {
  .hero-btns > * {
    width: 100%;
    justify-content: center;
  }
  .hero-email {
    font-size: 0.78rem;
  }
}'''
    mobile_new = '''@media (max-width: 640px) {
  .hero-btns > * {
    width: 100%;
    justify-content: center;
  }
  .hero-email-wrap {
    width: 100%;
    padding-top: 40px;
  }
  .hero-email-capybara {
    width: 104px;
    bottom: 22px;
  }
  .hero-email-wrap .hero-email {
    width: 100%;
    justify-content: center;
    font-size: 0.78rem;
  }
}'''
    if css.count(mobile) != 1:
        raise SystemExit(f'mobile email anchor count={css.count(mobile)}')
    style.write_text(css.replace(mobile, mobile_new), encoding='utf-8')
PY

# 3) Strip privacy-sensitive metadata without resizing/cropping media.
python3 tools/sanitize-media-metadata.py --report evidence/media-sanitized.json
node tools/verify-media-metadata.js > evidence/media-after.json

# 4) Static/build contracts.
node --check build.js
node --check script.js
node --check detail.js
node --check assets/project-demos.js
node --check tools/verify-media-metadata.js
python3 -m py_compile tools/sanitize-media-metadata.py
node tools/verify-build.js
node build.js
git diff --check
test -s assets/capybara-mail-peek.webp
node <<'NODE'
const fs=require('fs');
const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('style.css','utf8');
const demos=fs.readFileSync('assets/project-demos.js','utf8');
if((html.match(/hero-email-capybara/g)||[]).length!==1) throw new Error('capybara markup');
if(!html.includes('assets/capybara-mail-peek.webp')) throw new Error('capybara asset ref');
if(!css.includes('.hero-email-wrap')||!css.includes('pointer-events: none')) throw new Error('capybara css');
if(!demos.includes('one-click, deterministic, dependency-free')) throw new Error('one-click contract');
for(const id of ['wall','ucast','health','berry','plant']) if(!demos.includes(`function ${id}(`)) throw new Error(`missing ${id}`);
NODE

# 5) Serve and execute 12 HOME + 5 one-click demo cases.
python3 -m http.server 4188 > /tmp/v2-big-pass-http.log 2>&1 &
SERVER_PID=$!
trap 'kill "$SERVER_PID" 2>/dev/null || true' EXIT
for _ in {1..30}; do
  if curl -fsS http://127.0.0.1:4188/ >/dev/null; then break; fi
  sleep 1
done
curl -fsS http://127.0.0.1:4188/ >/dev/null

NODE_PATH="${NODE_PATH:?NODE_PATH is required}" CHROME_PATH="${CHROME_PATH:?CHROME_PATH is required}" node <<'NODE'
const fs=require('fs');
const {chromium}=require('playwright');
const base='http://127.0.0.1:4188';
const failures=[];
const cases=[];
const check=(ok,name,detail='')=>{if(!ok)failures.push({name,detail:String(detail)})};
const h=w=>w<=390?844:w<=768?1024:900;
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH,args:['--no-sandbox']});
  async function open(w,theme='light'){
    const context=await browser.newContext({viewport:{width:w,height:h(w)},colorScheme:theme,reducedMotion:'reduce',hasTouch:w<=390,isMobile:w<=390});
    const page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(`pageerror:${e.message}`));
    page.on('console',m=>{if(m.type()==='error')errors.push(`console:${m.text()}`)});
    await page.addInitScript(({theme})=>{localStorage.setItem('theme',theme);localStorage.setItem('lang','ko')},{theme});
    return {context,page,errors};
  }

  for(const w of [320,360,390,768,1280,1440]) for(const theme of ['light','dark']){
    const label=`root-${w}-${theme}`;
    const {context,page,errors}=await open(w,theme);
    try{
      await page.goto(base+'/',{waitUntil:'networkidle',timeout:60000});
      const s=await page.evaluate(()=>{
        const img=document.querySelector('.hero-email-capybara');
        const btn=document.querySelector('.hero-email');
        const ir=img?.getBoundingClientRect(),br=btn?.getBoundingClientRect();
        return {
          overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth+1,
          imgCount:document.querySelectorAll('.hero-email-capybara').length,
          nw:img?.naturalWidth||0,
          pe:img?getComputedStyle(img).pointerEvents:'',
          hidden:img?.getAttribute('aria-hidden'),
          alt:img?.getAttribute('alt'),
          btnw:br?.width||0,
          above:!!(ir&&br&&ir.top<br.top),
          overlap:!!(ir&&br&&ir.bottom>=br.top-2),
          broken:[...document.images].filter(i=>i.complete&&i.naturalWidth===0).map(i=>i.src)
        };
      });
      check(!s.overflow,`${label}:overflow`,JSON.stringify(s));
      check(s.imgCount===1&&s.nw===256,`${label}:image`,JSON.stringify(s));
      check(s.pe==='none'&&s.hidden==='true'&&s.alt==='',`${label}:a11y`,JSON.stringify(s));
      check(s.above&&s.overlap,`${label}:composition`,JSON.stringify(s));
      check(w>640||s.btnw>w*.72,`${label}:mobile-width`,JSON.stringify(s));
      check(s.broken.length===0,`${label}:broken`,s.broken.join('\n'));
      check(errors.length===0,`${label}:errors`,errors.join('\n'));
      if(w===1440&&theme==='light') await page.screenshot({path:'evidence/screens/root-1440.png'});
      if(w===390&&theme==='light') await page.screenshot({path:'evidence/screens/root-390.png'});
      cases.push(label);
    }catch(e){failures.push({name:label,detail:e.stack||String(e)})}
    await context.close();
  }

  const demos={Wall_Sina:'wall','2026_U-CAST':'ucast',HEALTH_CHECK_PROJECT:'health',BerryIno:'berry',PlantClock:'plant'};
  for(const [dir,id] of Object.entries(demos)){
    const label=`demo-${dir}`;
    const {context,page,errors}=await open(390,'dark');
    try{
      await page.goto(`${base}/projects/${dir}/`,{waitUntil:'networkidle',timeout:60000});
      const root=page.locator(`[data-project-demo="${id}"]`);
      await root.waitFor();
      check(await root.locator('.demo-btn').count()===1,`${label}:one-button`);
      check(await root.locator('input,select,textarea').count()===0,`${label}:no-fine-controls`);
      const before=(await root.locator('.demo-status').innerText()).trim();
      await root.locator('.demo-btn').click();
      await page.waitForFunction(({id})=>{
        const b=document.querySelector(`[data-project-demo="${id}"] .demo-btn`);
        return !!b&&!b.disabled&&/다시 실행|Run again/.test(b.textContent||'');
      },{id},{timeout:5000});
      const after=(await root.locator('.demo-status').innerText()).trim();
      check(after&&after!==before,`${label}:completed`,`${before}->${after}`);
      check(errors.length===0,`${label}:errors`,errors.join('\n'));
      cases.push(label);
    }catch(e){failures.push({name:label,detail:e.stack||String(e)})}
    await context.close();
  }

  await browser.close();
  const result={expected:17,cases:cases.length,failures};
  fs.writeFileSync('evidence/browser-results.json',JSON.stringify(result,null,2));
  console.log(JSON.stringify(result,null,2));
  if(cases.length!==17||failures.length)process.exit(1);
})().catch(e=>{console.error(e);process.exit(1)});
NODE

# 6) Persist every generated production change as one file / one commit.
git status --short | tee evidence/git-status.txt
git config user.name "pachir1su"
git config user.email "crong3323@naver.com"
while IFS= read -r -d '' f; do
  case "$f" in
    index.html) msg="feat: add capybara mail composition [skip ci]" ;;
    style.css) msg="feat: style capybara mail composition [skip ci]" ;;
    *) msg="chore: strip public media metadata $(basename "$f") [skip ci]" ;;
  esac
  git add -- "$f"
  git commit -m "$msg"
done < <(git diff --name-only -z)

test -z "$(git status --porcelain)"
git push origin HEAD:chatgpt/v2-final-big-pass

git fetch origin main chatgpt/v2-final-big-pass
changed=$(git diff --name-only origin/main...origin/chatgpt/v2-final-big-pass | wc -l)
commits=$(git rev-list --count origin/main..origin/chatgpt/v2-final-big-pass)
printf 'changed_files=%s\ncommits=%s\n' "$changed" "$commits" | tee evidence/atomicity.txt
test "$changed" -eq "$commits"
git diff --check origin/main...origin/chatgpt/v2-final-big-pass
