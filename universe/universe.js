/* =====================================================================
   v3 우주 — 콘텐츠 엔진 (universe.js)

   이동 방식 B · 날아가기 (2026-08-26 확정)

   - 스크롤이 없다. 문서는 한 화면에 고정되고, 카메라가 하늘 위를 옮겨 다닌다.
   - 멀리서 하늘 전체가 보인다. 구역을 누르면 카메라가 그리로 날아가고
     그때 프로젝트 이름이 켜진다. 빈 곳이나 Esc로 물러난다.
   - 별자리는 Sky.placeShape로만 놓는다. 종횡비를 지키므로 어느 화면에서도 같은 모양이다.
   - 그리기는 언제나 완성된 한 장을 남긴다. 지우고 중간에 빠져나가지 않는다.
   - 루프는 카메라가 움직이는 동안과 진입 연출 동안에만 돈다(#16 · #55).
   ===================================================================== */
(() => {
  'use strict';

  const Sky = window.V3Sky;
  if (!Sky) return;

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const clamp = Sky.clamp;
  const lerp = Sky.lerp;

  const HERE = new URL('.', (document.currentScript && document.currentScript.src) || window.location.href);
  const at = (rel) => new URL(rel, HERE).href;

  /* ==================================================================
     1. 언어 — v2와 같은 localStorage.lang을 공유한다.
     ================================================================== */
  const LANG_KEY = 'lang';
  let lang = (() => { try { return localStorage.getItem(LANG_KEY) || 'ko'; } catch (_) { return 'ko'; } })();
  const pick = (v) => (v == null ? '' : typeof v === 'string' ? v : (v[lang] || v.ko || v.en || ''));

  function applyLang(root) {
    $$('[data-ko][data-en]', root).forEach((el) => {
      const v = lang === 'en' ? el.dataset.en : el.dataset.ko;
      if (v != null) el.textContent = v;
    });
    $$('[data-ko-html][data-en-html]', root).forEach((el) => {
      const v = lang === 'en' ? el.dataset.enHtml : el.dataset.koHtml;
      if (v != null) el.innerHTML = v;
    });
    $$('[data-ko-label][data-en-label]', root).forEach((el) => {
      const v = lang === 'en' ? el.dataset.enLabel : el.dataset.koLabel;
      if (v != null) el.setAttribute('aria-label', v);
    });
    document.documentElement.lang = lang === 'en' ? 'en' : 'ko';
  }

  function setLang(next) {
    lang = next === 'en' ? 'en' : 'ko';
    try { localStorage.setItem(LANG_KEY, lang); } catch (_) { /* 저장이 막혀도 화면은 바뀐다 */ }
    applyLang(document);
    document.dispatchEvent(new CustomEvent('v3:lang'));
  }

  function initLangToggle() {
    const btn = $('[data-lang-toggle]');
    if (!btn) return;
    const paint = () => {
      btn.textContent = lang === 'en' ? 'KO' : 'EN';
      btn.setAttribute('aria-label', lang === 'en' ? '한국어로 보기' : 'View in English');
    };
    btn.addEventListener('click', () => { setLang(lang === 'en' ? 'ko' : 'en'); paint(); });
    paint();
  }

  /* ==================================================================
     2. 사운드 — #114에 확정으로 기록된 세 자리만(#232 미확정)
     ================================================================== */
  const CUES = {
    year:   'sfx-04-year-a-wood.wav',
    select: 'sfx-05-select-a-bell.wav',
    enter:  'sfx-06-enter-b-three-notes.wav',
  };
  const sound = {
    muted: false, heard: false, pool: Object.create(null),
    play(cue) {
      if (this.muted || !CUES[cue]) return;
      let el = this.pool[cue];
      if (!el) { el = new Audio(at('assets/audio/' + CUES[cue])); el.volume = 0.5; this.pool[cue] = el; }
      /* 실제로 소리가 난 뒤에만 끄는 단추를 꺼낸다.
         자동 재생이 막힌 브라우저에서 쓸모없는 단추를 띄우지 않기 위해서다. */
      const reveal = () => {
        if (this.heard) return;
        this.heard = true;
        const b = $('[data-mute]'); if (b) b.hidden = false;
      };
      try {
        el.currentTime = 0;
        const p = el.play();
        if (p && p.then) p.then(reveal, () => {}); else reveal();
      } catch (_) { /* 소리가 없어도 화면은 그대로 간다 */ }
    },
  };
  function initMute() {
    const btn = $('[data-mute]');
    if (!btn) return;
    btn.hidden = true;
    btn.addEventListener('click', () => {
      sound.muted = !sound.muted;
      btn.setAttribute('aria-pressed', String(sound.muted));
      btn.textContent = sound.muted ? '♪' : '♫';
    });
  }

  /* ==================================================================
     3. 데이터 — projects.json 하나만 읽는다.
     ================================================================== */
  const YEAR_ORDER = {
    '2026': ['한기대 26학번 신입생 가이드', 'Swordmaster', '기술과사회', '데일리 리포트 AI',
             'MultiMind', 'GitHub Rank Insight', '코리아텍 통합 알림 시스템',
             '라즈베리파이 마인크래프트 서버', '멈춰'],
    '2025': ['헬스 케어 시스템', '공감 봇 & 레시피 AI', '식물 타이머', 'NFC 출석 체크 시스템', '면진봇'],
    '2024': ['해안 장벽 프로젝트', '비밀번호 도어락', '졸음 방지 시스템',
             '산불 조기 감지 알림 시스템', '2024 SFPC'],
  };
  const LINEAGE = {
    '한기대지도': { ko: '실패한 초기 버전 · 후속 기획은 한맵', en: 'Failed first version — succeeded by Hanmap' },
    '한맵': { ko: '한기대 지도 초기 버전의 후속 기획', en: 'Successor to the failed Koreatech Map' },
  };
  const QUARANTINED = 'brawlcraft';

  const strip = (v) => String(v == null ? '' : v).replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
  const bi = (v) => (v == null ? { ko: '', en: '' }
    : typeof v === 'string' ? { ko: strip(v), en: strip(v) }
    : { ko: strip(v.ko || v.en || ''), en: strip(v.en || v.ko || '') });
  const keyOf = (v) => strip(v).replace(/\([^)]*\)/g, '').replace(/[^0-9a-z가-힣]/gi, '').toLowerCase();
  const same = (a, b) => { const x = keyOf(a), y = keyOf(b); return !!x && !!y && (x === y || x.startsWith(y) || y.startsWith(x)); };

  function toCard(raw, kind) {
    const name = bi(raw.title);
    const status = raw.status ? bi(raw.status) : null;
    let stage = 'main';
    if (kind === 'wip') stage = 'proto';
    else if (kind === 'discontinued') stage = 'stalled';
    else if (kind === 'failed') stage = (status && status.ko.indexOf('지연') >= 0) ? 'drift' : 'remnant';
    return {
      key: keyOf(name.ko), name,
      desc: bi(raw.descHtml || raw.desc),
      role: raw.role ? bi(raw.role) : null,
      reason: raw.failedReason ? bi(raw.failedReason) : null,
      tech: Array.isArray(raw.tech) ? raw.tech.map(bi) : [],
      detail: raw.detail || '', status, stage,
    };
  }
  function ordered(cards, order) {
    if (!order) return cards.slice();
    const rest = cards.slice(), out = [];
    order.forEach((w) => { const i = rest.findIndex((c) => same(c.name.ko, w)); if (i >= 0) out.push(rest.splice(i, 1)[0]); });
    return out.concat(rest);
  }
  function normalize(json) {
    const years = {}, wip = [], disc = [], failed = [], vault = [];
    (json.groups || []).forEach((g) => {
      const cards = (g.cards || []).map((raw) => toCard(raw, g.kind));
      if (g.kind === 'year') years[String(g.year)] = ordered(cards, YEAR_ORDER[String(g.year)]);
      else cards.forEach((c) => {
        if (c.key === QUARANTINED) { vault.push(c); return; }
        (g.kind === 'wip' ? wip : g.kind === 'discontinued' ? disc : failed).push(c);
      });
    });
    return { years, adrift: wip.concat(disc, failed), vault };
  }
  const loadData = () => fetch(at('../projects.json'), { cache: 'no-cache' })
    .then((r) => { if (!r.ok) throw new Error('projects.json ' + r.status); return r.json(); })
    .then(normalize);

  /* 성장 사건 — 저장소에 근거가 남은 것만 (#59) */
  const GROWTH = [
    { when: '2024', t: { ko: '처음 팀을 맡다', en: 'First time leading' },
      f: { ko: '비밀번호 도어락 — 팀장 · 4인 팀. 저장소에 기록된 첫 팀 리드.',
           en: 'Password door lock — team lead of 4. The first lead role in the repository.' } },
    { when: '2024', t: { ko: '전국 8위', en: '8th nationwide' },
      f: { ko: '2024 SFPC — 581팀 · 1,661명 중 전체 8위.', en: '2024 SFPC — 8th of 581 teams and 1,661 participants.' } },
    { when: '2024', t: { ko: '대회에서 두 번 불리다', en: 'Called up twice' },
      f: { ko: '디지털새싹 AI 어벤져스상 · 천안 학생 로봇 대회 동상.', en: 'AI Avengers Award and a bronze at the Cheonan robot contest.' } },
    { when: '2025', t: { ko: '가장 큰 팀', en: 'The largest team' },
      f: { ko: 'NFC 출석 체크 시스템 — 팀장 · 6인 팀. 저장소에 기록된 최대 규모.', en: 'NFC attendance — team lead of 6, the largest on record.' } },
    { when: '2025', t: { ko: '실패를 지우지 않다', en: 'Keeping the failures' },
      f: { ko: 'InfoCatch · InvestAI · 건영운세를 실패 기록으로 남겼다.', en: 'InfoCatch, InvestAI and Geonyeong Fortune kept as failure records.' } },
    { when: '2026', t: { ko: '혼자 끝까지', en: 'Solo, end to end' },
      f: { ko: '코리아텍 통합 알림 시스템 · MultiMind · GitHub Rank Insight — 기획부터 배포까지 1인.', en: 'Koreatech notifier, MultiMind and GitHub Rank Insight — solo from plan to deploy.' } },
    { when: '2026', t: { ko: '가르치는 쪽으로', en: 'Toward teaching' },
      f: { ko: '2026 U-CAST — 5팀 멘토, 로컬임팩트상.', en: '2026 U-CAST — mentor to team 5, Local Impact Award.' } },
  ];
  const RANKS = ['C', 'C+', 'B-', 'B', 'B+', 'A-', 'A'];
  const CHAIN = RANKS.length - 1;

  /* 수상 — 등급을 매기지 않는다(서열 기준 미확정) */
  const AWARDS = [
    { t: { ko: '2024 SFPC', en: '2024 SFPC' }, p: { ko: '전체 8위', en: '8th overall' },
      d: { ko: '581팀 · 1,661명 참가', en: '581 teams, 1,661 participants' }, detail: 'projects/2024_SFPC/' },
    { t: { ko: '2024 디지털새싹 AI 메이커톤', en: '2024 Digital Saessak AI Makerthon' }, p: { ko: 'AI 어벤져스상', en: 'AI Avengers Award' },
      d: { ko: '산불 조기 감지 알림 시스템', en: 'Wildfire early detection system' }, detail: 'projects/nonofire/' },
    { t: { ko: '2024 제5회 천안 학생 로봇 대회', en: '2024 5th Cheonan Student Robot Contest' }, p: { ko: '동상', en: 'Bronze' },
      d: { ko: '해커톤 분야 · 97팀', en: 'Hackathon category, 97 teams' }, detail: 'projects/2024_5th_CSRC/' },
    { t: { ko: '2026 U-CAST', en: '2026 U-CAST' }, p: { ko: '로컬임팩트상', en: 'Local Impact Award' },
      d: { ko: '「멈춰 !」 · 5팀 멘토', en: '"Stop!" · mentor to team 5' }, detail: 'projects/2026_U-CAST/' },
  ];

  /* ==================================================================
     4. 하늘의 지도 — 구역이 세계 좌표 위에 놓인다.
        출발점(이름·이메일)이 왼쪽 아래를 쓰므로 구역은 그쪽을 비운다.
     ================================================================== */
  /* 왼쪽 위에서 오른쪽 아래로 읽히도록 놓는다. 화면 왼쪽 아래는
     출발점(이름)과 도착지(연도)가 쓰므로 어떤 구역도 그쪽에 두지 않는다. */
  /* 가로 화면은 옆으로 넓은 배치(x·y), 세로 화면은 아래로 긴 배치(px·py)를 쓴다.
     구역을 빼거나 합치지 않는다. 같은 여섯 곳이 화면 모양에 맞춰 다시 놓일 뿐이다(#10 · #123). */
  const REGIONS = [
    { id: 'trace', kind: 'growth', shape: 'dipper',    x: -1450, y: -780, px: -520, py: -1180, w: 1000,
      title: { ko: '궤적', en: 'Trace' }, note: { ko: '저장소에 근거가 남은 일곱', en: 'Seven with evidence in the repository' } },
    { id: '2026', kind: 'year',   shape: 'orion',      x:  -420, y: -380, px:  480, py:  -760, w:  620,
      title: '2026', note: { ko: '한 해에 끝까지 간 아홉', en: 'Nine that reached the end' } },
    { id: '2025', kind: 'year',   shape: 'cassiopeia', x:   520, y: -820, px: -500, py:  -260, w:  900,
      title: '2025', note: { ko: '다섯 점이 그리는 W', en: 'A W drawn by five' } },
    { id: '2024', kind: 'year',   shape: 'cygnus',     x:  1400, y: -300, px:  430, py:   260, w:  820,
      title: '2024', note: { ko: '북십자, 여섯', en: 'The Northern Cross, six' } },
    { id: 'adrift', kind: 'adrift', shape: null,       x:  1150, y:  560, px: -420, py:   700, w: 1000, h: 620,
      title: { ko: '표류', en: 'Adrift' }, note: { ko: '닿지 못했거나, 아직 닿지 않은', en: 'Never arrived, or not yet' } },
    { id: 'log', kind: 'log', shape: null,             x:   200, y:  700, px:  520, py:  1000, w:  700, h: 520,
      title: { ko: '기록', en: 'Log' }, note: { ko: '바깥에서 확인된 것', en: 'Confirmed from outside' } },
  ];

  /* 세로로 긴 화면인가. 폭이 아니라 화면 모양으로 판단한다. */
  const tall = () => H > W * 1.1;
  const RX = (r) => (tall() && r.px != null ? r.px : r.x);
  const RY = (r) => (tall() && r.py != null ? r.py : r.y);

  /* 구역 안의 별 자리 — 별자리가 없는 구역은 손으로 놓는다. */
  const SCATTER = {
    adrift: [[.08,.30],[.27,.12],[.46,.28],[.65,.10],[.84,.26],[.98,.44],
             [.14,.66],[.36,.82],[.57,.62],[.78,.84],[.95,.70],[.30,.98],[.68,.98]],
    log:    [[.14,.18],[.62,.34],[.24,.62],[.72,.84]],
  };

  const state = {
    level: 'sky',           /* 'sky' 또는 구역 id */
    focus: null,            /* 지금 들어와 있는 구역 */
    selected: null,         /* {region, index} */
    visited: new Set(),
    linked: 0,
    intro: 0, introAt: 0,
  };

  const cam = { x: 0, y: 0, z: 1, tx: 0, ty: 0, tz: 1 };

  /* ==================================================================
     5. 무대
     ================================================================== */
  const canvas = $('.sky-canvas');
  const stage = $('[data-stage]');
  const regionLayer = $('[data-regions]');
  const starLayer = $('[data-stars]');
  const cardEl = $('[data-card]');
  const cardBody = $('[data-card-body]');
  const hereEl = $('[data-here]');
  const rankEl = $('[data-rank]');
  let ctx = null, W = 0, H = 0;

  function measure() {
    const s = Sky.sizeCanvas(canvas);
    ctx = s.ctx; W = s.w; H = s.h;
  }

  /* 구역의 세계 좌표 상자 — 별자리가 있으면 그 종횡비를 그대로 쓴다. */
  function extent(r) {
    if (r.shape) { const sh = Sky.SHAPES[r.shape]; return { w: r.w, h: r.w / sh.ratio }; }
    return { w: r.w, h: r.h || r.w * 0.62 };
  }

  /* 별 하나의 세계 좌표 */
  function starWorld(r, i) {
    const e = extent(r);
    const p = r.shape ? Sky.SHAPES[r.shape].pts[i] : (SCATTER[r.id] || [])[i];
    if (!p) return null;
    return [RX(r) - e.w / 2 + p[0] * e.w, RY(r) - e.h / 2 + p[1] * e.h];
  }

  const toScreen = (wx, wy) => [W / 2 + (wx - cam.x) * cam.z, H / 2 + (wy - cam.y) * cam.z];

  /* 하늘이 살 수 있는 사각형.
     넓은 화면에서는 왼쪽 아래를 글이 쓰므로 오른쪽 위로 비켜 준다(#114 대각 구성).
     좁은 화면에서는 위쪽 절반을 하늘이, 아래쪽을 글이 쓴다. */
  function frame(mode) {
    const narrow = W < 900;
    if (mode === 'region') {
      return narrow
        ? { x: W * .05, y: H * .12, w: W * .90, h: H * .56 }
        : { x: W * .27, y: H * .07, w: W * .68, h: H * .80 };
    }
    return narrow
      ? { x: W * .05, y: H * .05, w: W * .90, h: H * .55 }
      : { x: W * .24, y: H * .06, w: W * .72, h: H * .72 };
  }

  /* 세계 상자를 화면 사각형 안에 넣는 카메라. 비율은 건드리지 않는다. */
  function fitInto(box, f) {
    const z = Math.min(f.w / box.w, f.h / box.h);
    return {
      x: box.cx - (f.x + f.w / 2 - W / 2) / z,
      y: box.cy - (f.y + f.h / 2 - H / 2) / z,
      z,
    };
  }

  function regionsBox() {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    REGIONS.forEach((r) => {
      const e = extent(r);
      x0 = Math.min(x0, RX(r) - e.w / 2); x1 = Math.max(x1, RX(r) + e.w / 2);
      y0 = Math.min(y0, RY(r) - e.h / 2); y1 = Math.max(y1, RY(r) + e.h / 2);
    });
    return { x0, y0, x1, y1 };
  }

  /* 열세 번째 자리 — 여섯 구역 바깥, 아무도 안 보는 구석.
     배치가 바뀌어도 늘 같은 구석에 있도록 지도에서 끌어낸다. */
  function thirteenthAt() {
    const b = regionsBox();
    return tall()
      ? [b.x0 - (b.x1 - b.x0) * .20, b.y1 + (b.y1 - b.y0) * .10]
      : [b.x1 + (b.x1 - b.x0) * .14, b.y1 + (b.y1 - b.y0) * .18];
  }

  function worldBox() {
    const b = regionsBox();
    let { x0, y0, x1, y1 } = b;
    /* 별이 나타나면 하늘이 그만큼 넓어진다. 나타나기 전에는 흔적도 없다. */
    if (thirteenth.shown) {
      const [tx, ty] = thirteenthAt();
      const m = 180;
      x0 = Math.min(x0, tx - m); x1 = Math.max(x1, tx + m);
      y0 = Math.min(y0, ty - m); y1 = Math.max(y1, ty + m);
    }
    return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, w: x1 - x0, h: y1 - y0 };
  }

  function skyView() { return fitInto(worldBox(), frame('sky')); }

  function regionView(r) {
    const e = extent(r);
    /* 별 이름표가 좌우로 뻗으므로 별자리 자체는 조금 더 좁게 잡는다. */
    const pad = W < 900 ? 1.06 : 1.28;
    return fitInto({ cx: RX(r), cy: RY(r), w: e.w * pad, h: e.h * 1.06 }, frame('region'));
  }

  function flyTo(v) { cam.tx = v.x; cam.ty = v.y; cam.tz = v.z; kick(); }

  /* ==================================================================
     6. 그리기 — 언제나 완성된 한 장을 남긴다.
     ================================================================== */
  const FIELD = (() => {
    const r = Sky.rng(4021), out = [];
    for (let i = 0; i < 620; i++) out.push({
      x: (r() - .5) * 7600, y: (r() - .5) * 6200,
      r: .5 + r() * 1.5, a: .18 + r() * .55, gold: r() > .95,
    });
    return out;
  })();
  const CLOUDS = (() => {
    const r = Sky.rng(311), out = [];
    for (let i = 0; i < 9; i++) out.push({
      x: (r() - .5) * 6200, y: (r() - .5) * 4600,
      rx: 700 + r() * 1500, rot: r() * 3.14, a: .16 + r() * .26,
    });
    return out;
  })();

  function draw(t) {
    if (!ctx) return false;
    const T = Sky.theme();
    const L = T.mode === 'light';

    const g = ctx.createLinearGradient(W, 0, 0, H);
    g.addColorStop(0, T.sky0); g.addColorStop(.55, T.sky1); g.addColorStop(1, T.sky2);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    /* 성운 — 아홉 덩이. 카메라를 따라 함께 움직인다. */
    CLOUDS.forEach((c) => {
      const [sx, sy] = toScreen(c.x, c.y);
      const rr = c.rx * cam.z;
      if (sx < -rr * 1.3 || sx > W + rr * 1.3 || sy < -rr * 1.3 || sy > H + rr * 1.3) return;
      ctx.save(); ctx.translate(sx, sy); ctx.rotate(c.rot); ctx.scale(1, .58);
      const rg = ctx.createRadialGradient(rr * .2, -rr * .24, rr * .04, 0, 0, rr);
      const a = c.a * (L ? .92 : 1.25);
      rg.addColorStop(0, Sky.rgba(T.neb, a));
      rg.addColorStop(.3, Sky.rgba(T.neb, a * .6));
      rg.addColorStop(.62, Sky.rgba(T.neb2, a * .24));
      rg.addColorStop(1, Sky.rgba(T.neb2, 0));
      ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(0, 0, rr, 0, 7); ctx.fill(); ctx.restore();
    });

    /* 배경 별 */
    FIELD.forEach((s) => {
      const [sx, sy] = toScreen(s.x, s.y);
      if (sx < -8 || sx > W + 8 || sy < -8 || sy > H + 8) return;
      ctx.globalAlpha = s.a * (L ? .8 : 1);
      ctx.fillStyle = s.gold ? T.gold : T.ink;
      ctx.beginPath(); ctx.arc(sx, sy, s.r * clamp(cam.z * 1.6, .5, 1.6), 0, 7); ctx.fill();
    });
    ctx.globalAlpha = 1;

    /* 진입 연출 — 별이 하나씩 나타나고 선이 이어진다. 1회뿐이다(#55). */
    let busy = false;
    let intro = 1;
    if (state.intro < 1) {
      const e = Sky.prefersReduced() ? 99 : (performance.now() - state.introAt) / 1000;
      intro = clamp(e / 2.4, 0, 1);
      state.intro = intro;
      busy = intro < 1;
    }

    /* 구역 */
    REGIONS.forEach((r, ri) => {
      const focused = state.focus === r.id;
      const dim = state.focus && !focused ? .16 : 1;
      const e = extent(r);
      const n = r.kind === 'growth' ? GROWTH.length : r.kind === 'log' ? AWARDS.length : (r.cards || []).length;
      if (!n) return;

      const pts = [];
      for (let i = 0; i < n; i++) {
        const w = starWorld(r, i);
        pts.push(w ? toScreen(w[0], w[1]) : null);
      }
      const app = clamp(intro * 1.9 - ri * 0.12, 0, 1);
      if (app <= 0) return;

      /* 별자리를 이루지 않는 구역은 성운 자락으로 자리를 잡는다.
         선이 없어도 '어딘가'로 읽히게 하려는 것이고, 흩뿌린 점만 두지 않기 위해서다. */
      if (!r.shape) {
        const [hx, hy] = toScreen(RX(r), RY(r));
        const rx = (e.w / 2) * cam.z * 1.06, ry = (e.h / 2) * cam.z * 1.06;
        if (rx > 6 && hx > -rx * 1.4 && hx < W + rx * 1.4 && hy > -ry * 1.4 && hy < H + ry * 1.4) {
          ctx.save(); ctx.translate(hx, hy); ctx.scale(1, ry / rx);
          const hg = ctx.createRadialGradient(rx * .18, -rx * .22, rx * .06, 0, 0, rx);
          const ha = (L ? .19 : .26) * app * dim;
          hg.addColorStop(0, Sky.rgba(T.neb, ha));
          hg.addColorStop(.46, Sky.rgba(T.neb, ha * .5));
          hg.addColorStop(1, Sky.rgba(T.neb2, 0));
          ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(0, 0, rx, 0, 7); ctx.fill(); ctx.restore();
        }
      }

      if (r.shape) {
        const sh = Sky.SHAPES[r.shape];
        const edges = sh.edges.filter(([a, b]) => a < n && b < n);
        ctx.save(); ctx.lineCap = 'round';
        ctx.lineWidth = clamp(1.1 * Math.sqrt(cam.z / skyBase.z), .8, 1.4);
        edges.forEach(([a, b], i) => {
          if (!pts[a] || !pts[b]) return;
          /* 성장 궤적은 이은 구간만 금빛이다. */
          const linked = r.kind !== 'growth' || (i < CHAIN ? i < state.linked : state.linked >= CHAIN);
          const k = clamp(app * edges.length * 1.2 - i, 0, 1);
          if (k <= 0) return;
          ctx.strokeStyle = linked
            ? Sky.rgba(T.gold, (L ? .52 : .60) * dim)
            : Sky.rgba(T.ink, (L ? .13 : .16) * dim);
          ctx.beginPath();
          ctx.moveTo(pts[a][0], pts[a][1]);
          ctx.lineTo(lerp(pts[a][0], pts[b][0], Sky.easeOut(k)), lerp(pts[a][1], pts[b][1], Sky.easeOut(k)));
          ctx.stroke();
        });
        ctx.restore();
      }

      const R = clamp(Math.min(e.w, e.h) * cam.z * 0.028, 2.4, 13);
      for (let i = 0; i < n; i++) {
        const p = pts[i]; if (!p) continue;
        if (p[0] < -60 || p[0] > W + 60 || p[1] < -60 || p[1] > H + 60) continue;
        const on = state.selected && state.selected.region === r.id && state.selected.index === i;
        const o = objectFor(r, i);
        const shown = clamp(app * 1.4 - i * 0.05, 0, 1);
        if (shown <= 0) continue;
        const target = on ? 1 : 0;
        if (Math.abs(target - o.focus) > 0.01) { o.focus += (target - o.focus) * 0.2; busy = true; } else o.focus = target;
        const f = o.focus * dim;
        const rr = R * shown;
        ctx.globalAlpha = dim;
        /* 멀리서는 무엇이든 빛나는 점 하나다. 가까이 가야 그 별의 사정이 보인다. */
        if (!focused) {
          Sky.star(ctx, p[0], p[1], rr * .30, o.bright ? T.gold : T.ink,
            (L ? .78 : .90), rr * 2.0, (L ? .34 : .14) + f * .16, T);
        }
        else if (o.stage === 'proto' || o.stage === 'stalled') Sky.forms.protostar(ctx, p[0], p[1], rr, T, o, 0, f);
        else if (o.stage === 'remnant') Sky.forms.remnant(ctx, p[0], p[1], rr, T, o, 0, f);
        else if (o.stage === 'drift') Sky.forms.drifted(ctx, p[0], p[1], rr, T, o, 0, f);
        else Sky.forms.mainSequence(ctx, p[0], p[1], rr, T, o, 0, f);
        ctx.globalAlpha = 1;
      }
    });

    if (thirteenth.shown) busy = drawThirteenth(ctx, T) || busy;

    /* 비네트 */
    const S = Math.min(W, H);
    const v = ctx.createRadialGradient(W * .58, H * .40, S * .26, W * .44, H * .58, S * 1.25);
    v.addColorStop(0, Sky.rgba(T.vignette, 0));
    v.addColorStop(1, Sky.rgba(T.vignette, L ? .40 : .48));
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);

    return busy;
  }

  const objects = Object.create(null);
  function objectFor(r, i) {
    const key = r.id + ':' + i;
    if (!objects[key]) {
      const card = r.kind === 'year' || r.kind === 'adrift' ? (r.cards || [])[i] : null;
      objects[key] = {
        stage: card ? card.stage : 'main',
        phase: (i * 1.37) % 6.28, tilt: (i * .73) % 3.14, focus: 0,
        bright: r.kind === 'log',
      };
    }
    return objects[key];
  }

  /* ==================================================================
     7. 버튼 — 구역과 천체는 실제 button이다. 매 프레임 transform만 옮긴다.
     ================================================================== */
  const regionBtns = [], starBtns = [];

  /* 폭이 바뀌면 줄이는 길이도 바뀐다. 이름표를 다시 쓴다. */
  function relabel() {
    starBtns.forEach((b) => {
      const l = $('.star-name', b);
      if (l) l.textContent = nameOf(b._region, b._index);
      b.setAttribute('aria-label', fullName(b._region, b._index));
    });
  }

  function place() {
    REGIONS.forEach((r) => {
      const b = r.btn; if (!b) return;
      const [sx, sy] = toScreen(RX(r), RY(r));
      const e = extent(r);
      const w = Math.max(64, e.w * cam.z), h = Math.max(64, e.h * cam.z);
      b.style.width = w + 'px'; b.style.height = h + 'px';
      b.style.transform = `translate(${sx - w / 2}px, ${sy - h / 2}px)`;
      b.hidden = state.level !== 'sky';
    });
    const live = [];
    starBtns.forEach((b) => {
      const w = starWorld(b._region, b._index);
      if (!w) { b.hidden = true; return; }
      b.hidden = state.focus !== b._region.id;
      if (b.hidden) return;
      const [sx, sy] = toScreen(w[0], w[1]);
      b.style.transform = `translate(${sx}px, ${sy}px)`;
      live.push({ b, x: sx, y: sy });
    });
    if (live.length) layoutLabels(live);
  }

  /* 이름표 배치 — 별에서 바깥쪽으로 뻗되, 서로 겹치면 위아래로 비킨다.
     캔버스의 measureText로 재므로 배치 때문에 레이아웃이 다시 돌지 않는다. */
  const GAP = 26, LINE = 19, EDGE = 14;
  let measurer = null;
  function textWidth(txt) {
    if (!measurer) {
      measurer = document.createElement('canvas').getContext('2d');
      measurer.font = '12.5px ' + getComputedStyle(document.body).fontFamily;
    }
    return measurer.measureText(txt).width;
  }

  function layoutLabels(live) {
    let cx = 0; live.forEach((s) => { cx += s.x; }); cx /= live.length;

    /* 겹쳐 놓은 글이 이미 쓰고 있는 자리 — 이름표는 그 위로 올라가지 않는다.
       도착지 이름은 넓은 화면에서 아래 왼쪽, 좁은 화면에서 위쪽에 있고,
       카드는 좁은 화면에서 아래를 가로로 다 쓴다. 둘 다 여기서 재서 피한다. */
    const keep = [];
    if (hereEl && document.body.classList.contains('stage-far-off')) keep.push(hereEl.getBoundingClientRect());
    if (cardEl && cardEl.classList.contains('is-open')) keep.push(cardEl.getBoundingClientRect());
    const blocked = (l, r, y) => keep.some((k) =>
      r > k.left - 10 && l < k.right + 10 && y > k.top - 12 && y < k.bottom + 12);

    live.forEach((s) => {
      const el = $('.star-name', s.b);
      s.el = el;
      s.w = el ? textWidth(el.textContent) : 0;
      s.right = s.x >= cx;
      s.dy = 0;
    });

    const box = (s, right, y) => {
      const l = right ? s.x + GAP : s.x - GAP - s.w;
      return { l, r: l + s.w, y };
    };
    const outside = (b) => b.l < EDGE || b.r > W - EDGE;
    const cost = (b) => (outside(b) ? 2 : 0) + (blocked(b.l, b.r, b.y) ? 1 : 0);

    /* 화면 밖으로 나가거나 이미 쓰인 자리를 덮으면 반대쪽으로 넘긴다. */
    live.forEach((s) => {
      const a = box(s, s.right, s.y);
      if (!cost(a)) return;
      if (cost(box(s, !s.right, s.y)) < cost(a)) s.right = !s.right;
    });

    /* 밀어내기는 좌우를 나누지 않고 한 번에 한다.
       왼쪽 이름표와 오른쪽 이름표가 가운데서 만나는 경우가 있기 때문이다. */
    const put = [];
    live.slice().sort((a, b) => a.y - b.y).forEach((s) => {
      const b = box(s, s.right, s.y);
      let y = s.y, guard = 0;
      while (guard++ < 60) {
        const hit = put.find((o) => o.r > b.l - 16 && o.l < b.r + 16 && Math.abs(o.y - y) < LINE);
        if (hit) { y = hit.y + LINE; continue; }
        const k = keep.find((kk) => b.r > kk.left - 10 && b.l < kk.right + 10
          && y > kk.top - 12 && y < kk.bottom + 12);
        if (k) { y = (y < (k.top + k.bottom) / 2 ? k.top - LINE : k.bottom + LINE); continue; }
        break;
      }
      s.dy = y - s.y;
      put.push({ l: b.l, r: b.r, y });
    });

    live.forEach((s) => {
      if (!s.el) return;
      const y = clamp(s.y + s.dy, EDGE + 8, H - EDGE - 8) - s.y;
      s.el.style.setProperty('--u-ldx', (s.right ? GAP : -GAP - s.w) + 'px');
      s.el.style.setProperty('--u-ldy', y.toFixed(1) + 'px');
    });
  }

  function buildButtons(data) {
    REGIONS.forEach((r) => {
      if (r.kind === 'year') r.cards = data.years[r.id] || [];
      else if (r.kind === 'adrift') r.cards = data.adrift;
      else if (r.kind === 'growth') r.cards = GROWTH;
      else if (r.kind === 'log') r.cards = AWARDS;

      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'region';
      b.dataset.region = r.id;
      const name = document.createElement('span');
      name.className = 'region-name';
      name.textContent = titleOf(r);
      b.appendChild(name);
      b.setAttribute('aria-label', titleOf(r) + ' — ' + pick(r.note));
      b.addEventListener('click', (ev) => { ev.stopPropagation(); enter(r); });
      regionLayer.appendChild(b);
      r.btn = b; regionBtns.push(b);

      const n = r.cards.length;
      for (let i = 0; i < n; i++) {
        const s = document.createElement('button');
        s.type = 'button';
        s.className = 'star';
        s._region = r; s._index = i;
        s.setAttribute('aria-pressed', 'false');
        const label = document.createElement('span');
        label.className = 'star-name';
        label.textContent = nameOf(r, i);
        s.appendChild(label);
        s.setAttribute('aria-label', fullName(r, i));
        s.addEventListener('click', (ev) => { ev.stopPropagation(); select(r, i); });
        starLayer.appendChild(s);
        starBtns.push(s);
      }
    });
  }

  const titleOf = (r) => (typeof r.title === 'string' ? r.title : pick(r.title));
  function fullName(r, i) {
    const c = r.cards[i];
    if (!c) return '';
    if (r.kind === 'growth' || r.kind === 'log') return pick(c.t);
    return pick(c.name);
  }
  /* 하늘에 거는 이름표는 표지판이다. 부제와 괄호를 떼고 길면 줄인다.
     온전한 이름은 별을 눌렀을 때 카드에서 본다. */
  function nameOf(r, i) {
    let n = fullName(r, i);
    if (!n) return '';
    n = n.split(/\s+[—–-]\s+/)[0].replace(/\s*\([^)]*\)\s*$/, '').trim();
    /* 글자 수가 아니라 실제 폭으로 자른다. 한글과 영문이 같은 자리를 쓰게. */
    const cap = Math.min(W * 0.24, 218);
    if (textWidth(n) <= cap) return n;
    while (n.length > 2 && textWidth(n + '…') > cap) n = n.slice(0, -1);
    return n.trim() + '…';
  }

  /* ==================================================================
     8. 이동과 선택
     ================================================================== */
  const skyBase = { z: 1 };

  /* 지금 있는 곳을 주소에 남긴다. 링크 하나로 같은 자리에 도착한다. */
  function markUrl() {
    if (!window.history || !history.replaceState) return;
    const u = new URL(window.location.href);
    if (state.level === 'sky') u.searchParams.delete('at');
    else u.searchParams.set('at', state.level);
    try { history.replaceState(null, '', u.pathname + u.search + u.hash); } catch (_) { /* file:// 등 */ }
  }

  function enter(r) {
    state.level = r.id; state.focus = r.id;
    state.visited.add(r.id);
    stage.dataset.level = 'region';
    document.body.classList.add('stage-far-off');
    setHere(r);
    rankEl.classList.toggle('is-on', r.kind === 'growth');
    closeCard();
    flyTo(regionView(r));
    markUrl();
    sound.play('year');
    if (['2026', '2025', '2024'].every((y) => state.visited.has(y))) revealThirteenth();
  }

  function pullBack() {
    state.level = 'sky'; state.focus = null;
    stage.dataset.level = 'sky';
    document.body.classList.remove('stage-far-off');
    rankEl.classList.remove('is-on');
    closeCard();
    flyTo(skyView());
    markUrl();
  }

  function setHere(r) {
    $('.here-title', hereEl).textContent = titleOf(r);
    $('.here-note', hereEl).textContent = pick(r.note);
  }

  function select(r, i) {
    if (state.focus !== r.id) { enter(r); }
    state.selected = { region: r.id, index: i };
    starBtns.forEach((b) => b.setAttribute('aria-pressed', String(b._region === r && b._index === i)));
    renderCard(r, i);
    if (r.kind === 'growth') link(i);
    sound.play('select');
    kick();
  }

  function link(to) {
    if (to !== state.linked + 1) return;
    state.linked = to;
    $('[data-rank-now]').textContent = RANKS[Math.min(state.linked, CHAIN)];
    $('[data-rank-rail]').style.setProperty('--u-rank-progress', ((state.linked / CHAIN) * 100) + '%');
  }

  function closeCard() {
    state.selected = null;
    starBtns.forEach((b) => b.setAttribute('aria-pressed', 'false'));
    cardEl.classList.remove('is-open');
    place();
    kick();
  }

  function renderCard(r, i) {
    const c = r.cards[i];
    cardBody.textContent = '';
    if (!c) return;
    const h = document.createElement('h3');
    h.textContent = fullName(r, i);
    cardBody.appendChild(h);

    const roleText = r.kind === 'growth' ? c.when : r.kind === 'log' ? pick(c.p) : (c.role ? pick(c.role) : '');
    if (roleText) {
      const p = document.createElement('p'); p.className = 'card-role'; p.textContent = roleText; cardBody.appendChild(p);
    }
    const lin = c.key && LINEAGE[c.key];
    if (lin) { const p = document.createElement('p'); p.className = 'card-lineage'; p.textContent = pick(lin); cardBody.appendChild(p); }

    const body = r.kind === 'growth' ? c.f : r.kind === 'log' ? c.d : (c.reason || c.desc);
    if (pick(body)) { const p = document.createElement('p'); p.textContent = pick(body); cardBody.appendChild(p); }

    if (c.tech && c.tech.length) {
      const ul = document.createElement('ul'); ul.className = 'card-tech';
      c.tech.slice(0, 6).forEach((t) => { const li = document.createElement('li'); li.textContent = pick(t); ul.appendChild(li); });
      cardBody.appendChild(ul);
    }
    if (c.detail) {
      const a = document.createElement('a');
      a.className = 'card-go'; a.href = at('../' + c.detail);
      a.textContent = lang === 'en' ? 'Open details →' : '상세 보기 →';
      a.addEventListener('click', () => sound.play('enter'));
      cardBody.appendChild(a);
    }
    cardEl.classList.add('is-open');
    /* 카드가 자리를 차지했으니 이름표를 다시 놓는다. */
    place();
  }

  /* ==================================================================
     9. 이스터에그 — 세 해를 모두 들른 뒤에만 이름 없는 별이 뜬다.
        예고하지 않는다. 누르면 뱀주인자리가 그어진다.
     ================================================================== */
  const thirteenth = { shown: false, drawnAt: 0, btn: null, done: false };
  const DRAW_MS = 2400;

  function finishThirteenth() {
    if (thirteenth.done || !thirteenth.drawnAt) return;
    thirteenth.done = true;
    if (thirteenth.btn) {
      thirteenth.btn.classList.add('is-drawn');
      thirteenth.btn.setAttribute('aria-label', lang === 'en' ? 'Open the quarantined record' : '격리된 기록 열기');
    }
    paintNow();
  }

  function revealThirteenth() {
    if (thirteenth.shown) return;
    thirteenth.shown = true;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'star star-unnamed';
    b.setAttribute('aria-label', lang === 'en' ? 'Unnamed star' : '이름 없는 별');
    b.addEventListener('click', (ev) => {
      ev.stopPropagation();
      if (!thirteenth.drawnAt) {
        thirteenth.drawnAt = performance.now();
        sound.play('select');
        /* 다 그어진 시점은 루프가 아니라 시계가 정한다. 프레임이 굶어도 상태는 진행한다. */
        setTimeout(finishThirteenth, DRAW_MS + 120);
      } else if (thirteenth.done) openVault();
      kick();
    });
    starLayer.appendChild(b);
    thirteenth.btn = b;
    /* 하늘이 그만큼 넓어진다. 무엇이 늘었는지는 말하지 않는다. */
    if (state.level === 'sky') flyTo(skyView()); else kick();
  }

  function drawThirteenth(c, T) {
    const [wx, wy] = thirteenthAt();
    const [sx, sy] = toScreen(wx, wy);
    if (thirteenth.btn) {
      thirteenth.btn.hidden = state.level !== 'sky';
      thirteenth.btn.style.transform = `translate(${sx}px, ${sy}px)`;
    }
    const S = Math.min(W, H);
    Sky.star(c, sx, sy, 1.8, T.ink, thirteenth.drawnAt ? .3 : .74, S * .018, T.mode === 'light' ? .32 : .13, T);
    if (!thirteenth.drawnAt) return false;
    const k = clamp((performance.now() - thirteenth.drawnAt) / DRAW_MS, 0, 1);
    const sh = Sky.SHAPES.ophiuchus;
    const box = regionsBox();
    const w = Math.min(760, (box.x1 - box.x0) * .30), h = w / sh.ratio;
    const pts = sh.pts.map(([x, y]) => toScreen(wx - w / 2 + x * w, wy - h / 2 + y * h));
    c.save(); c.globalAlpha = k;
    Sky.constellation(c, pts, sh.edges, T, {
      scale: S, progress: k, bright: sh.bright,
      starRadius: 2.2, haloRadius: 12, lineWidth: 1, lineAlpha: .82,
    });
    c.restore();
    return k < 1;
  }

  /* 격리된 기록 — 뱀주인자리가 다 그어진 뒤, 그 별을 한 번 더 누르면 열린다.
     조건도 존재도 화면 어디에도 적지 않는다(#114). */
  const vaultEl = $('[data-vault]');
  let vaultCards = [];
  let lastFocus = null;

  function openVault() {
    if (!vaultEl || !vaultCards.length) return;
    const list = $('[data-vault-items]', vaultEl);
    list.textContent = '';
    vaultCards.forEach((c) => {
      const box = document.createElement('div');
      box.className = 'vault-item';
      const h = document.createElement('h3');
      h.textContent = pick(c.name);
      box.appendChild(h);
      const body = c.reason || c.desc;
      if (pick(body)) { const p = document.createElement('p'); p.textContent = pick(body); box.appendChild(p); }
      if (c.detail) {
        const a = document.createElement('a');
        a.className = 'card-go'; a.href = at('../' + c.detail);
        a.textContent = lang === 'en' ? 'Open details →' : '상세 보기 →';
        box.appendChild(a);
      }
      list.appendChild(box);
    });
    lastFocus = document.activeElement;
    vaultEl.hidden = false;
    sound.play('enter');
    const close = $('[data-vault-close]', vaultEl);
    if (close) close.focus();
  }

  function closeVault() {
    if (!vaultEl || vaultEl.hidden) return;
    vaultEl.hidden = true;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
    lastFocus = null;
  }

  /* ==================================================================
     10. 루프 — 카메라가 움직이는 동안과 진입 연출 동안에만 돈다.
     ================================================================== */
  let raf = 0;
  function step() {
    raf = 0;
    let moving = false;
    ['x', 'y', 'z'].forEach((k) => {
      const d = cam['t' + k] - cam[k];
      const eps = k === 'z' ? 0.00002 : 0.4;
      if (Math.abs(d) > eps) { cam[k] += d * (Sky.prefersReduced() ? 1 : 0.13); moving = true; }
      else cam[k] = cam['t' + k];
    });
    place();
    const busy = draw(0);
    if (moving || busy) raf = requestAnimationFrame(step);
  }
  function kick() { if (!raf) raf = requestAnimationFrame(step); }
  /* 한 장은 언제나 즉시 완성한다. 루프에 첫 프레임을 맡기지 않는다. */
  function paintNow() { place(); draw(0); }

  /* ==================================================================
     11. 시작
     ================================================================== */
  function boot() {
    applyLang(document);
    initLangToggle();
    initMute();
    if (!document.body.classList.contains('universe')) return;

    measure();

    $('[data-back]').addEventListener('click', pullBack);
    $('[data-card-close]').addEventListener('click', closeCard);
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if (vaultEl && !vaultEl.hidden) closeVault();
      else if (state.selected) closeCard();
      else if (state.level !== 'sky') pullBack();
    });
    /* 빈 곳을 누르면 물러난다. 별과 겹쳐 놓은 글에는 걸리지 않는다. */
    stage.addEventListener('click', () => {
      if (state.selected) closeCard();
      else if (state.level !== 'sky') pullBack();
    });

    const contact = $('[data-copy-email]');
    if (contact) {
      const out = $('.copied', contact);
      contact.addEventListener('click', () => {
        if (!navigator.clipboard || !navigator.clipboard.writeText) return;
        navigator.clipboard.writeText(contact.dataset.copyEmail).then(() => {
          if (!out) return;
          out.textContent = lang === 'en' ? 'Copied' : '복사됨';
          setTimeout(() => { out.textContent = ''; }, 1600);
        }, () => {});
      });
    }

    let tm = 0;
    window.addEventListener('resize', () => {
      clearTimeout(tm);
      tm = setTimeout(() => {
        measure();
        relabel();
        const v = state.level === 'sky' ? skyView() : regionView(REGIONS.find((r) => r.id === state.level));
        skyBase.z = skyView().z;
        cam.x = cam.tx = v.x; cam.y = cam.ty = v.y; cam.z = cam.tz = v.z;
        paintNow();
      }, 140);
    });
    Sky.onThemeChange(paintNow);
    document.addEventListener('v3:lang', () => {
      REGIONS.forEach((r) => {
        if (!r.btn) return;
        $('.region-name', r.btn).textContent = titleOf(r);
        r.btn.setAttribute('aria-label', titleOf(r) + ' — ' + pick(r.note));
      });
      relabel();
      const r = REGIONS.find((x) => x.id === state.level);
      if (r) setHere(r);
      if (state.selected) renderCard(REGIONS.find((x) => x.id === state.selected.region), state.selected.index);
      if (vaultEl && !vaultEl.hidden) openVault();
    });

    const vClose = $('[data-vault-close]');
    if (vClose) vClose.addEventListener('click', closeVault);
    if (vaultEl) vaultEl.addEventListener('click', (e) => { if (e.target === vaultEl) closeVault(); });

    loadData().then((data) => {
      vaultCards = data.vault || [];
      buildButtons(data);
      const v = skyView();
      skyBase.z = v.z;
      cam.x = cam.tx = v.x; cam.y = cam.ty = v.y; cam.z = cam.tz = v.z;
      stage.dataset.level = 'sky';
      state.introAt = performance.now();
      paintNow();

      /* ?at=2026 처럼 구역을 가리키는 주소로 들어오면 거기서 시작한다. */
      let target = null;
      try { target = new URL(window.location.href).searchParams.get('at'); } catch (_) { target = null; }
      const r0 = target && REGIONS.find((r) => r.id === target);
      if (r0) { enter(r0); cam.x = cam.tx; cam.y = cam.ty; cam.z = cam.tz; paintNow(); }
      kick();
      /* 어떤 이유로든 루프가 돌지 않아도 완성된 하늘은 반드시 나온다. */
      setTimeout(() => { state.intro = 1; paintNow(); }, 3000);
    }).catch((err) => {
      console.error('[v3] projects.json', err);
      const note = $('.here-note', hereEl);
      if (note) {
        document.body.classList.add('stage-far-off');
        $('.here-title', hereEl).textContent = '';
        note.textContent = lang === 'en'
          ? 'Could not read projects.json. Serve this folder over HTTP.'
          : 'projects.json을 읽지 못했습니다. 정적 서버로 열어 주세요.';
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.V3 = { setLang, get lang() { return lang; }, sound, loadData, at };
})();
