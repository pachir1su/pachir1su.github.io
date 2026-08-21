from __future__ import annotations

import json
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT.parent / "target"
CAPTURES = ROOT.parent / "captures"

HEALTH_NOTION = "https://pachir1su.notion.site/2025-SDGs-1b9f776d60dc8058976bc03379ceaf06"

DETAIL_JS = r'''/* v2 detail-page lightweight runtime — no AOS / VanillaTilt dependency */
(() => {
  'use strict';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];

  const hamburger = $('#hamburger');
  const mobileMenu = $('#mobileMenu');
  const overlay = $('#sidebarOverlay');
  function closeMobile() {
    mobileMenu?.classList.remove('open');
    hamburger?.classList.remove('open');
    hamburger?.setAttribute('aria-expanded', 'false');
    overlay?.classList.remove('active');
    document.body.style.overflow = '';
  }
  window.closeMobile = closeMobile;
  hamburger?.addEventListener('click', () => {
    const open = mobileMenu?.classList.toggle('open') || false;
    hamburger.classList.toggle('open', open);
    hamburger.setAttribute('aria-expanded', String(open));
    overlay?.classList.toggle('active', open);
    document.body.style.overflow = open ? 'hidden' : '';
  });
  overlay?.addEventListener('click', closeMobile);
  mobileMenu?.querySelectorAll('a').forEach((a) => a.addEventListener('click', closeMobile));

  const back = $('#btn-back-to-top');
  const bar = $('#myBar');
  let scrollTick = 0;
  function syncScroll() {
    scrollTick = 0;
    const top = document.documentElement.scrollTop || document.body.scrollTop;
    const max = Math.max(1, document.documentElement.scrollHeight - document.documentElement.clientHeight);
    bar && (bar.style.transform = `scaleX(${Math.min(1, top / max).toFixed(4)})`);
    back?.classList.toggle('visible', top > 300);
  }
  addEventListener('scroll', () => { if (!scrollTick) scrollTick = requestAnimationFrame(syncScroll); }, { passive: true });
  back?.addEventListener('click', () => scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' }));
  syncScroll();

  const themeDesktop = $('#themeToggle');
  const themeMobile = $('#themeToggleMobile');
  function themeLabel(dark, lang) { return dark ? (lang === 'en' ? 'Light Mode' : '라이트 모드') : (lang === 'en' ? 'Dark Mode' : '다크 모드'); }
  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('theme', theme);
    const dark = theme === 'dark';
    const lang = localStorage.getItem('lang') || 'ko';
    const label = themeLabel(dark, lang);
    const di = $('#themeIcon'); if (di) di.className = dark ? 'fas fa-sun' : 'fas fa-moon';
    const mi = $('#themeIconMobile') || $('.theme-label-mobile')?.previousElementSibling; if (mi?.tagName === 'I') mi.className = dark ? 'fas fa-sun' : 'fas fa-moon';
    const ml = $('.theme-label-mobile'); if (ml) ml.textContent = label;
    if (themeDesktop) themeDesktop.title = label;
  }
  const initialTheme = localStorage.getItem('theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  applyTheme(initialTheme);
  const toggleTheme = () => applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
  themeDesktop?.addEventListener('click', toggleTheme);
  themeMobile?.addEventListener('click', toggleTheme);

  $$('[data-en]:not([data-ko]):not(meta)').forEach((el) => { el.dataset.ko = el.textContent.trim(); });
  $$('[data-en-html]:not([data-ko-html])').forEach((el) => { el.dataset.koHtml = el.innerHTML; });
  const langDesktop = $('#langToggle');
  const langMobile = $('#langToggleMobile');
  let lang = localStorage.getItem('lang') || 'ko';
  function translate(next) {
    lang = next;
    localStorage.setItem('lang', lang);
    document.documentElement.lang = lang;
    $$('[data-en][data-ko]:not(meta)').forEach((el) => {
      const text = lang === 'en' ? el.dataset.en : el.dataset.ko;
      const icon = el.firstElementChild?.tagName === 'I' ? el.firstElementChild.outerHTML : '';
      if (icon) el.innerHTML = `${icon} ${text}`; else el.textContent = text;
    });
    $$('[data-en-html][data-ko-html]').forEach((el) => { el.innerHTML = lang === 'en' ? el.dataset.enHtml : el.dataset.koHtml; });
    $$('meta[data-en][data-ko]').forEach((el) => { el.content = lang === 'en' ? el.dataset.en : el.dataset.ko; });
    const dl = langDesktop?.querySelector('.lang-label'); if (dl) dl.textContent = lang === 'ko' ? 'EN' : 'KO';
    const ml = $('.lang-label-mobile'); if (ml) ml.textContent = lang === 'ko' ? 'English' : '한국어';
    if (langDesktop) langDesktop.title = lang === 'ko' ? 'English' : '한국어';
    applyTheme(document.documentElement.dataset.theme || 'light');
    dispatchEvent(new CustomEvent('portfolio:language', { detail: { lang } }));
  }
  translate(lang);
  langDesktop?.addEventListener('click', () => translate(lang === 'ko' ? 'en' : 'ko'));
  langMobile?.addEventListener('click', () => translate(lang === 'ko' ? 'en' : 'ko'));

  if (!reduced && 'IntersectionObserver' in window) {
    document.documentElement.classList.add('reveal-enabled');
    const io = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-revealed');
      io.unobserve(entry.target);
    }), { rootMargin: '80px 0px', threshold: 0.06 });
    $$('[data-aos]').forEach((el) => {
      const delay = Math.min(240, Number(el.dataset.aosDelay || 0));
      if (delay) el.style.setProperty('--reveal-delay', `${delay}ms`);
      io.observe(el);
    });
  } else {
    $$('[data-aos]').forEach((el) => el.classList.add('is-revealed'));
  }

  addEventListener('keydown', (event) => { if (event.key === 'Escape') closeMobile(); });
})();
'''

DEMO_JS = r'''/* v2 project detail browser demos — static, dependency-free simulations */
(() => {
  'use strict';
  const roots = [...document.querySelectorAll('[data-project-demo]')];
  if (!roots.length) return;
  const lang = () => document.documentElement.lang === 'en' ? 'en' : 'ko';
  const tr = (ko, en) => lang() === 'en' ? en : ko;
  const set = (el, ko, en) => { el.dataset.ko = ko; el.dataset.en = en; el.textContent = tr(ko, en); };
  const button = (ko, en, cls = '') => { const b = document.createElement('button'); b.type='button'; b.className=`demo-btn ${cls}`; set(b,ko,en); return b; };
  const row = (label, control) => { const d=document.createElement('label'); d.className='demo-control'; const s=document.createElement('span'); s.textContent=label; d.append(s,control); return d; };
  const status = () => { const p=document.createElement('p'); p.className='demo-status'; p.setAttribute('role','status'); p.setAttribute('aria-live','polite'); return p; };
  function shell(root, ko, en) {
    root.innerHTML=''; root.classList.add('project-demo');
    const note=document.createElement('p'); note.className='demo-note'; set(note,'실제 프로젝트의 동작 원리를 브라우저에서 재현한 정적 시뮬레이션입니다. 하드웨어나 서버에 연결하지 않습니다.','A static browser simulation of the real project behavior. It does not connect to hardware or a backend.');
    const grid=document.createElement('div'); grid.className='demo-grid'; root.append(note,grid); return grid;
  }
  function wall(root) {
    const grid=shell(root); const controls=document.createElement('div'); controls.className='demo-controls'; const stage=document.createElement('div'); stage.className='demo-stage demo-tank';
    const water=document.createElement('div'); water.className='demo-water'; const barrier=document.createElement('div'); barrier.className='demo-barrier'; stage.append(water,barrier);
    const level=document.createElement('input'); level.type='range'; level.min='0'; level.max='100'; level.value='35'; level.setAttribute('aria-label','Water level');
    const auto=document.createElement('input'); auto.type='checkbox'; auto.checked=true; const manual=button('장벽 수동 전환','Toggle barrier manually'); const st=status();
    controls.append(row(tr('해수면','Sea level'),level),row(tr('센서 자동 제어','Automatic sensor control'),auto),manual,st); grid.append(controls,stage);
    let manualUp=false; function render(){ const n=+level.value, up=auto.checked?n>=62:manualUp; water.style.height=`${n}%`; barrier.style.height=up?'78%':'18%'; st.textContent=up?tr(`수위 ${n}% · 장벽 상승 · 모터 정지`,`Level ${n}% · barrier raised · motor stopped`):tr(`수위 ${n}% · 장벽 대기`,`Level ${n}% · barrier standing by`); }
    level.addEventListener('input',render); auto.addEventListener('change',render); manual.addEventListener('click',()=>{auto.checked=false;manualUp=!manualUp;render();}); render();
  }
  function ucast(root){ const grid=shell(root); const stage=document.createElement('div'); stage.className='demo-stage'; const warn=document.createElement('div'); warn.className='demo-warning'; const channels=[];
    for(let i=1;i<=2;i++){ const c=document.createElement('div'); c.className='demo-channel'; const title=document.createElement('strong'); title.textContent=`CH ${i}`; const strip=document.createElement('div'); strip.className='demo-strip'; const enter=button('시작 IR 감지','Start IR trigger'); const exit=button('끝 IR 감지','End IR trigger'); c.append(title,strip,enter,exit); stage.append(c); channels.push({active:false,strip,enter,exit}); }
    const allOn=button('전체 시작','Start all'), allOff=button('전체 종료','Stop all'); const st=status(); const controls=document.createElement('div'); controls.className='demo-controls'; controls.append(allOn,allOff,st); grid.append(controls,stage);
    function render(){channels.forEach(c=>c.strip.classList.toggle('active',c.active)); const any=channels.some(c=>c.active); warn.textContent=any?tr('운전자 경고 LED ON · 사이렌 ON','Driver warning LED ON · siren ON'):tr('대기 · 경고 OFF','Standby · warning OFF'); warn.classList.toggle('active',any); st.replaceChildren(warn);}
    channels.forEach(c=>{c.enter.addEventListener('click',()=>{c.active=true;render();});c.exit.addEventListener('click',()=>{c.active=false;render();});}); allOn.addEventListener('click',()=>{channels.forEach(c=>c.active=true);render();}); allOff.addEventListener('click',()=>{channels.forEach(c=>c.active=false);render();}); render(); }
  function health(root){ const grid=shell(root); const controls=document.createElement('div'); controls.className='demo-controls'; const stage=document.createElement('div'); stage.className='demo-stage demo-health'; const hr=document.createElement('input'); hr.type='range';hr.min='45';hr.max='150';hr.value='76'; const temp=document.createElement('input');temp.type='range';temp.min='350';temp.max='405';temp.value='367'; const memo=document.createElement('input');memo.type='text';memo.maxLength=60;memo.placeholder=tr('오늘 상태 메모','Today\'s status note'); const st=status(); controls.append(row(tr('심박수','Heart rate'),hr),row(tr('체온','Temperature'),temp),row(tr('상태 메모','Status note'),memo),st); const h=document.createElement('div');h.className='demo-health-card';stage.append(h);grid.append(controls,stage);
    function render(){const t=(+temp.value/10).toFixed(1), pulse=+hr.value; h.innerHTML=`<strong>${pulse} BPM</strong><strong>${t} °C</strong><span>${memo.value||tr('기록 대기','Waiting for note')}</span>`; const flag=pulse<55||pulse>110||+temp.value<360||+temp.value>378; st.textContent=flag?tr('설정한 예시 범위를 벗어난 값이 있어 확인 표시를 냅니다. (의료 판단 아님)','A value is outside this demo\'s example range. (Not medical advice)'):tr('예시 범위 내 · 기록 가능','Within the demo range · ready to log'); st.classList.toggle('warn',flag);} [hr,temp,memo].forEach(x=>x.addEventListener('input',render));render(); }
  function berry(root){ const grid=shell(root); const controls=document.createElement('div');controls.className='demo-controls'; const stage=document.createElement('div');stage.className='demo-stage'; const st=status(); const count=document.createElement('strong'); count.className='demo-big-number'; const log=document.createElement('ol');log.className='demo-log'; const ids=['20250001','20250002','20250003']; ids.forEach(id=>{const b=button(`NFC ${id}`,`NFC ${id}`);b.addEventListener('click',()=>scan(id,'NFC'));controls.append(b);}); const input=document.createElement('input');input.inputMode='numeric';input.placeholder=tr('키패드 학번 입력','Keypad student ID'); const submit=button('키패드 출석','Keypad check-in');controls.append(input,submit,st);stage.append(count,log);grid.append(controls,stage); const seen=new Set(); function scan(id,via){id=(id||'').trim();if(!id)return;if(seen.has(id)){st.textContent=tr(`${id} · 이미 출석 처리됨`,`${id} · already checked in`);return;}seen.add(id);const li=document.createElement('li');li.textContent=`${id} · ${via}`;log.prepend(li);count.textContent=tr(`${seen.size}명 출석`,`${seen.size} checked in`);st.textContent=tr(`${id} 출석 기록 완료`,`${id} check-in recorded`);} submit.addEventListener('click',()=>{scan(input.value,'KEYPAD');input.value='';}); count.textContent=tr('0명 출석','0 checked in'); }
  function plant(root){ const grid=shell(root); const controls=document.createElement('div');controls.className='demo-controls';const stage=document.createElement('div');stage.className='demo-stage demo-plant';const humidity=document.createElement('input');humidity.type='range';humidity.min='0';humidity.max='100';humidity.value='52';const hours=document.createElement('input');hours.type='range';hours.min='0';hours.max='72';hours.value='8';const water=button('방금 물 주기','Water now');const fan=button('팬 전환','Toggle fan');const st=status();controls.append(row(tr('토양 습도','Soil humidity'),humidity),row(tr('마지막 급수 후 시간','Hours since watering'),hours),water,fan,st);const lcd=document.createElement('div');lcd.className='demo-lcd';stage.append(lcd);grid.append(controls,stage);let fanOn=false;function render(){const h=+humidity.value,elapsed=+hours.value,alert=h<35||elapsed>24;lcd.innerHTML=`<b>HUM ${h}%</b><b>${elapsed}h</b><span>FAN ${fanOn?'ON':'OFF'}</span>`;st.textContent=alert?tr('급수 알림 · 부저/진동 ON','Watering alert · buzzer/vibration ON'):tr('상태 정상 · 알림 대기','Status normal · alerts standing by');st.classList.toggle('warn',alert);} humidity.addEventListener('input',render);hours.addEventListener('input',render);water.addEventListener('click',()=>{hours.value=0;humidity.value=Math.max(+humidity.value,65);render();});fan.addEventListener('click',()=>{fanOn=!fanOn;render();});render();}
  const init={wall,ucast,health,berry,plant}; roots.forEach(root=>init[root.dataset.projectDemo]?.(root));
  addEventListener('portfolio:language',()=>location.reload());
})();
'''

DEMO_CSS = r'''
/* ===== v2.8 detail runtime / browser demo / performance ===== */
.reveal-enabled [data-aos] { opacity:0; transform:translateY(14px); transition:opacity .36s ease var(--reveal-delay,0ms), transform .36s ease var(--reveal-delay,0ms); }
.reveal-enabled [data-aos="fade-left"] { transform:translateX(14px); }
.reveal-enabled [data-aos="fade-right"] { transform:translateX(-14px); }
.reveal-enabled [data-aos].is-revealed { opacity:1; transform:none; }
.skill-glyph { display:inline-flex; align-items:center; justify-content:center; width:1.55em; height:1.55em; margin-right:.38em; border:1px solid var(--line); border-radius:5px; font-family:"Space Mono",monospace; font-size:.72em; font-weight:700; color:var(--accent); background:var(--paper); vertical-align:middle; }
@supports (content-visibility:auto) {
  .year-group { content-visibility:auto; contain-intrinsic-size:auto 900px; }
  .detail-main > .detail-section { content-visibility:auto; contain-intrinsic-size:auto 520px; }
}
.project-demo { margin-top:18px; }
.demo-note { margin:0 0 16px; color:var(--text-muted); font-size:.88rem; }
.demo-grid { display:grid; grid-template-columns:minmax(220px,.8fr) minmax(300px,1.2fr); gap:18px; align-items:stretch; }
.demo-controls,.demo-stage { border:1px solid var(--line); border-radius:14px; background:color-mix(in srgb,var(--paper) 93%,var(--accent) 7%); padding:16px; }
.demo-controls { display:flex; flex-direction:column; gap:12px; }
.demo-control { display:grid; gap:7px; font-size:.84rem; font-weight:700; }
.demo-control input[type="range"] { width:100%; min-height:44px; accent-color:var(--accent); }
.demo-control input[type="text"], .demo-controls > input { min-height:44px; width:100%; border:1px solid var(--line); border-radius:8px; background:var(--paper); color:var(--ink); padding:9px 11px; font:inherit; }
.demo-btn { min-height:44px; border:1px solid var(--line); border-radius:9px; background:var(--paper); color:var(--ink); padding:9px 12px; font:600 .86rem inherit; cursor:pointer; }
.demo-btn:hover,.demo-btn:focus-visible { border-color:var(--accent); outline:none; box-shadow:0 0 0 2px color-mix(in srgb,var(--accent) 18%,transparent); }
.demo-status { margin:2px 0 0; min-height:2.7em; color:var(--text-muted); font-size:.84rem; line-height:1.45; }
.demo-status.warn,.demo-warning.active { color:var(--accent); font-weight:700; }
.demo-stage { min-height:250px; position:relative; overflow:hidden; }
.demo-tank { background:linear-gradient(180deg,#e7f3f7 0 55%,#d9c8a8 55%); }
.demo-water { position:absolute; left:0; right:0; bottom:0; height:35%; background:rgba(47,132,181,.48); transition:height .28s ease; }
.demo-barrier { position:absolute; left:50%; bottom:0; width:28px; height:18%; transform:translateX(-50%); border:2px solid #5f6368; border-bottom:0; background:linear-gradient(90deg,#787d82,#d5d7d8,#74797d); transition:height .32s ease; }
.demo-channel { display:grid; grid-template-columns:56px 1fr auto auto; gap:8px; align-items:center; padding:12px 0; border-bottom:1px dashed var(--line); }
.demo-strip { min-height:15px; border-radius:999px; background:#9ca3af; box-shadow:inset 0 0 0 2px rgba(0,0,0,.08); }
.demo-strip.active { background:#d63333; box-shadow:0 0 14px rgba(214,51,51,.55); }
.demo-warning { padding:8px 10px; border-radius:8px; border:1px solid var(--line); }
.demo-health { display:grid; place-items:center; }
.demo-health-card { width:min(100%,330px); display:grid; gap:12px; padding:22px; border:1px solid var(--line); border-radius:14px; background:var(--paper); text-align:center; }
.demo-health-card strong { font:700 clamp(1.3rem,3vw,2rem)/1 "Space Mono",monospace; color:var(--accent); }
.demo-big-number { display:block; margin-bottom:14px; font:700 1.5rem "Space Mono",monospace; }
.demo-log { margin:0; padding-left:22px; line-height:1.8; }
.demo-plant { display:grid; place-items:center; }
.demo-lcd { width:min(100%,340px); min-height:150px; display:grid; place-items:center; gap:3px; padding:18px; border:8px solid #29313a; border-radius:8px; background:#9dc5a1; color:#17251a; font:700 1.12rem "Space Mono",monospace; box-shadow:inset 0 0 18px rgba(0,0,0,.18); }
@media (max-width:720px) { .demo-grid { grid-template-columns:1fr; } .demo-stage { min-height:220px; } .demo-channel { grid-template-columns:44px 1fr; } .demo-channel .demo-btn { grid-column:span 1; } }
@media (prefers-reduced-motion:reduce) { .reveal-enabled [data-aos],.demo-water,.demo-barrier { opacity:1; transform:none; transition:none; } }
'''

NATIVE_REVEAL = r'''/* ------------------------------------------------------------- */
/* 2. Native scroll reveal (AOS replacement)                     */
/* ------------------------------------------------------------- */
(function initReveal() {
  const items = [...document.querySelectorAll('[data-aos]')];
  if (!items.length || prefersReducedMotion || typeof IntersectionObserver === 'undefined') {
    items.forEach((el) => el.classList.add('is-revealed'));
    return;
  }
  document.documentElement.classList.add('reveal-enabled');
  const obs = new IntersectionObserver((entries) => entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('is-revealed');
    obs.unobserve(entry.target);
  }), { rootMargin: '100px 0px', threshold: 0.05 });
  items.forEach((el) => {
    const delay = Math.min(240, Number(el.dataset.aosDelay || 0));
    if (delay) el.style.setProperty('--reveal-delay', `${delay}ms`);
    obs.observe(el);
  });
})();
'''


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def write(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8", newline="\n")


def strip_external_detail_libs(html: str) -> str:
    html = re.sub(r'\s*<link href="https://unpkg\.com/aos@2\.3\.1/dist/aos\.css" rel="stylesheet"\s*/?>', '', html)
    html = re.sub(r'\s*<script(?: defer)? src="https://unpkg\.com/aos@2\.3\.1/dist/aos\.js"></script>', '', html)
    html = re.sub(r'\s*<script(?: defer)? src="https://cdnjs\.cloudflare\.com/ajax/libs/vanilla-tilt/1\.8\.0/vanilla-tilt\.min\.js"></script>', '', html)
    html = re.sub(r'<script(?: defer)? src="\.\./\.\./script\.js"></script>', '<script defer src="../../detail.js"></script>', html)
    return html


def add_demo(html: str, kind: str) -> str:
    if 'data-project-demo=' in html:
        return html
    marker = '<h2 data-en="My Role"'
    idx = html.find(marker)
    if idx < 0:
        raise RuntimeError(f"My Role marker missing for {kind}")
    start = html.rfind('<div class="detail-section"', 0, idx)
    block = f'''            <div class="detail-section" id="live-demo" data-aos="fade-up" data-aos-delay="80">\n              <h2 data-en="Interactive Demo" data-ko="직접 체험 데모">직접 체험 데모</h2>\n              <div data-project-demo="{kind}"></div>\n            </div>\n'''
    html = html[:start] + block + html[start:]
    back = '<a href="../../index.html#projects" class="btn btn-ghost"'
    if back in html and 'href="#live-demo"' not in html:
        html = html.replace(back, '<a href="#live-demo" class="btn btn-ghost"><i class="fas fa-play"></i> <span data-en="Try Demo" data-ko="데모 체험">데모 체험</span></a>\n\n          ' + back, 1)
    if 'project-demos.js' not in html:
        html = html.replace('<script defer src="../../detail.js"></script>', '<script defer src="../../detail.js"></script>\n    <script defer src="../../assets/project-demos.js"></script>')
    return html


def convert_captures() -> list[Path]:
    from PIL import Image
    out: list[Path] = []
    mapping = {
        'kga-home.png': TARGET / 'projects/koreatechGongjiAgent/assets/images/web-home.webp',
        'kga-shuttle.png': TARGET / 'projects/koreatechGongjiAgent/assets/images/web-shuttle-ui.webp',
        'kga-admin.png': TARGET / 'projects/koreatechGongjiAgent/assets/images/web-admin.webp',
    }
    for src_name, dst in mapping.items():
        src = CAPTURES / src_name
        if not src.exists():
            continue
        dst.parent.mkdir(parents=True, exist_ok=True)
        with Image.open(src) as im:
            im = im.convert('RGB')
            if im.width > 1600:
                h = round(im.height * 1600 / im.width)
                im = im.resize((1600, h), Image.Resampling.LANCZOS)
            im.save(dst, 'WEBP', quality=82, method=6)
        out.append(dst)
    health = sorted(CAPTURES.glob('health-*.png'))[:4]
    for i, src in enumerate(health, 1):
        dst = TARGET / f'projects/HEALTH_CHECK_PROJECT/assets/images/notion-{i}.webp'
        dst.parent.mkdir(parents=True, exist_ok=True)
        with Image.open(src) as im:
            im = im.convert('RGB')
            if im.width > 1600:
                h = round(im.height * 1600 / im.width)
                im = im.resize((1600, h), Image.Resampling.LANCZOS)
            im.save(dst, 'WEBP', quality=82, method=6)
        out.append(dst)
    return out


def media_dimensions(path: Path) -> tuple[int, int]:
    from PIL import Image
    with Image.open(path) as im:
        return im.width, im.height


def update_kga(html: str) -> str:
    inserts = []
    candidates = [
        ('web-home.webp', '현재 KGA 소스에서 렌더링한 홈 대시보드', 'Home dashboard rendered from the current KGA source'),
        ('web-shuttle-ui.webp', '현재 KGA 소스의 셔틀 화면 UI', 'Shuttle view rendered from the current KGA source'),
        ('web-admin.webp', '현재 KGA 소스의 관리자 대시보드 UI', 'Admin dashboard rendered from the current KGA source'),
    ]
    for name, ko, en in candidates:
        p = TARGET / 'projects/koreatechGongjiAgent/assets/images' / name
        if not p.exists() or name in html:
            continue
        w,h=media_dimensions(p)
        inserts.append(f'''                <figure class="detail-figure">\n                  <img src="assets/images/{name}" width="{w}" height="{h}" loading="lazy" decoding="async" alt="{ko}" />\n                  <figcaption data-en="{en}" data-ko="{ko}">{ko}</figcaption>\n                </figure>''')
    if inserts:
        needle = '              </div>\n            </div>\n\n            <div class="detail-section" data-aos="fade-up" data-aos-delay="100">'
        pos = html.find(needle, html.find('data-media-followup="v27-kga-audit"'))
        if pos < 0: raise RuntimeError('KGA gallery insertion point missing')
        html = html[:pos] + '\n' + '\n'.join(inserts) + '\n' + html[pos:]
    return html


def update_health(html: str) -> str:
    if HEALTH_NOTION not in html:
        github_anchor = '''<a\n            href="https://github.com/pachir1su/HEALTH_CHECK_PROJECT"'''
        # Hero: insert after GitHub button's closing anchor block, via Back anchor position.
        backpos = html.find('<a href="../../index.html#projects" class="btn btn-ghost"')
        notion_btn = f'''<a href="{HEALTH_NOTION}" target="_blank" rel="noopener noreferrer" class="btn btn-primary"><i class="fas fa-external-link-alt"></i> Notion</a>\n\n          '''
        html = html[:backpos] + notion_btn + html[backpos:]
        # Sidebar link next to GitHub.
        sidebar_needle = '<span data-en="GitHub Repo" data-ko="GitHub 저장소">GitHub 저장소</span></a'
        p = html.find(sidebar_needle)
        if p >= 0:
            close = html.find('>', p + len(sidebar_needle)) + 1
            html = html[:close] + f'''\n                <a href="{HEALTH_NOTION}" target="_blank" rel="noopener noreferrer" class="github-activity-btn"><i class="fas fa-external-link-alt"></i> Notion</a>''' + html[close:]
    imgs = sorted((TARGET / 'projects/HEALTH_CHECK_PROJECT/assets/images').glob('notion-*.webp'))
    if imgs and 'data-media-source="health-notion"' not in html:
        figs=[]
        for i,p in enumerate(imgs,1):
            w,h=media_dimensions(p)
            figs.append(f'''                <figure class="detail-figure">\n                  <img src="assets/images/{p.name}" width="{w}" height="{h}" loading="lazy" decoding="async" alt="공개 Notion에 게시된 헬스 케어 프로젝트 기록 화면 {i}" />\n                  <figcaption data-en="Public Notion project record — {i}" data-ko="공개 Notion 프로젝트 기록 — {i}">공개 Notion 프로젝트 기록 — {i}</figcaption>\n                </figure>''')
        idx = html.find('<h2 data-en="My Role"')
        start = html.rfind('<div class="detail-section"',0,idx)
        block='''            <div class="detail-section" data-aos="fade-up" data-aos-delay="70" data-media-source="health-notion">\n              <h2 data-en="Project Media" data-ko="프로젝트 기록 사진">프로젝트 기록 사진</h2>\n              <div class="detail-gallery">\n'''+'\n'.join(figs)+'''\n              </div>\n            </div>\n'''
        html=html[:start]+block+html[start:]
    return html


def main() -> None:
    if not TARGET.exists(): raise SystemExit('target checkout missing')
    generated_media = convert_captures()

    write(TARGET/'detail.js', DETAIL_JS)
    write(TARGET/'assets/project-demos.js', DEMO_JS)

    # All detail pages: remove AOS/VanillaTilt payload and use detail.js.
    for page in sorted((TARGET/'projects').glob('*/index.html')):
        html = strip_external_detail_libs(read(page))
        kind = {
            'Wall_Sina':'wall', '2026_U-CAST':'ucast', 'HEALTH_CHECK_PROJECT':'health',
            'BerryIno':'berry', 'PlantClock':'plant'
        }.get(page.parent.name)
        if kind: html = add_demo(html, kind)
        if page.parent.name == 'koreatechGongjiAgent': html = update_kga(html)
        if page.parent.name == 'HEALTH_CHECK_PROJECT': html = update_health(html)
        write(page, html)

    # Health Notion is also a project-card external source.
    pj = TARGET/'projects.json'; data=json.loads(read(pj))
    for group in data.get('groups',[]):
        for card in group.get('cards',[]):
            if card.get('detail') == 'projects/HEALTH_CHECK_PROJECT/':
                links=card.setdefault('links',[])
                if not any(x.get('href')==HEALTH_NOTION for x in links):
                    links.append({'href':HEALTH_NOTION,'title':'Notion','icon':'fas fa-external-link-alt'})
    write(pj, json.dumps(data, ensure_ascii=False, indent=2)+'\n')

    # Root: remove AOS + Devicon render-blocking resources, keep icon meaning with tiny glyphs.
    index=TARGET/'index.html'; html=read(index)
    html=re.sub(r'\s*<!-- Devicon[^\n]*\n\s*<link[\s\S]*?devicon\.min\.css"\s*/?>','',html,count=1)
    html=re.sub(r'\s*<!-- AOS[^\n]*\n\s*<link href="https://unpkg\.com/aos@2\.3\.1/dist/aos\.css" rel="stylesheet"\s*/?>','',html,count=1)
    html=re.sub(r'\s*<!-- AOS 라이브러리 JS[^\n]*\n\s*<script defer src="https://unpkg\.com/aos@2\.3\.1/dist/aos\.js"></script>','',html,count=1)
    glyphs={'python':'Py','c':'C','java':'Jv','javascript':'JS','processing':'Pr','scikitlearn':'ML','react':'Re','flask':'Fl','sqlite':'DB','flutter':'Ft','figma':'Fg','arduino':'Ar','notion':'Nt'}
    def repl(m):
        name=m.group(1); return f'<span class="skill-glyph" aria-hidden="true">{glyphs.get(name,"•")}</span>'
    html=re.sub(r'<i class="devicon-([a-z0-9]+)-[^\"]+ colored"></i>',repl,html)
    write(index,html)

    # Root JS: native reveal + rAF-throttled shadow follow.
    sj=TARGET/'script.js'; js=read(sj)
    js=re.sub(r'/\* ------------------------------------------------------------- \*/\n/\* 2\. AOS[\s\S]*?\n\}\n\n',NATIVE_REVEAL+'\n',js,count=1)
    old='''  function move(event) {\n    const card = event.currentTarget;\n    const rect = card._v26Rect || card.getBoundingClientRect();\n    const x = (event.clientX - rect.left) / rect.width - 0.5;\n    const y = (event.clientY - rect.top) / rect.height - 0.5;\n    card.style.setProperty('--shadow-x', `${-x * 7}px`);\n    card.style.setProperty('--shadow-y', `${-y * 7 + 4}px`);\n  }'''
    new='''  function move(event) {\n    const card = event.currentTarget;\n    card._v27Pointer = { x: event.clientX, y: event.clientY };\n    if (card._v27Raf) return;\n    card._v27Raf = requestAnimationFrame(() => {\n      card._v27Raf = 0;\n      const rect = card._v26Rect || card.getBoundingClientRect();\n      const point = card._v27Pointer;\n      const x = (point.x - rect.left) / rect.width - 0.5;\n      const y = (point.y - rect.top) / rect.height - 0.5;\n      card.style.setProperty('--shadow-x', `${-x * 7}px`);\n      card.style.setProperty('--shadow-y', `${-y * 7 + 4}px`);\n    });\n  }'''
    if old not in js: raise RuntimeError('shadow move block changed')
    js=js.replace(old,new,1)
    js=js.replace("    delete card._v26Rect;\n    card.style.setProperty('--shadow-x', '0px');", "    delete card._v26Rect;\n    if (card._v27Raf) cancelAnimationFrame(card._v27Raf);\n    card._v27Raf = 0;\n    card.style.setProperty('--shadow-x', '0px');",1)
    write(sj,js)

    css=TARGET/'style.css'; text=read(css)
    if 'v2.8 detail runtime / browser demo / performance' not in text: text=text.rstrip()+"\n"+DEMO_CSS+"\n"
    write(css,text)

    # Regenerate only BUILD:PROJECTS after projects.json link update.
    import subprocess
    subprocess.run(['node','build.js'],cwd=TARGET,check=True)
    print(json.dumps({'generated_media':[str(p.relative_to(TARGET)) for p in generated_media], 'detail_pages':len(list((TARGET/'projects').glob('*/index.html')))},ensure_ascii=False))

if __name__ == '__main__': main()
