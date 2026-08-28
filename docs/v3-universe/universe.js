/* =====================================================================
   v3 우주 — 세로로 흐르는 하늘 (docs/v3-universe/universe.js)

   문서가 평범하게 세로로 스크롤된다. 다만 섹션이 끊겨 있는 게 아니라
   하나의 하늘이 위에서 아래로 계속 이어진다. 별밭과 성운이 경계에서 끊기지 않고,
   깊이가 다른 층은 다른 속도로 지나간다. 그래서 이동이 몸으로 느껴진다.

   스크롤을 가로채지 않는다 — 스냅도, 정거장도, 진행 안내도 없다.
   굴린 만큼만 하늘이 지나간다.

   #114에서 확정된 것만 쓴다
   - 프로젝트 이름은 언제나 화면에 있다. 눌러야 보이는 것은 역할·설명·링크뿐이다.
   - 상태는 글자가 아니라 형태로 말한다.
   - 별자리는 실제 하늘의 종횡비로만 놓는다. 늘어나지 않는다.
   - 별을 눌러도 별자리 좌표와 선은 움직이지 않는다.
   - 이스터에그는 예고하지 않는다.
   - 상시 rAF 금지. 연출이 도는 동안에만 돈다.
   ===================================================================== */
(() => {
  'use strict';

  const Sky = window.V3Sky;
  if (!Sky) return;

  const { clamp, lerp, rgba, easeOut } = Sky;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  const HERE = new URL('.', (document.currentScript && document.currentScript.src) || location.href);
  const at = (rel) => new URL(rel, HERE).href;
  const SITE = 'https://pachir1su.github.io/';

  /* ==================================================================
     1. 언어 — v2와 같은 localStorage.lang을 공유한다.
     ================================================================== */
  const LANG_KEY = 'lang';
  let lang = (() => { try { return localStorage.getItem(LANG_KEY) || 'ko'; } catch (_) { return 'ko'; } })();
  const pick = (v) => (v == null ? '' : typeof v === 'string' ? v : (v[lang] || v.ko || v.en || ''));

  function applyLang() {
    $$('[data-ko][data-en]').forEach((el) => {
      const v = lang === 'en' ? el.dataset.en : el.dataset.ko;
      if (v != null) el.textContent = v;
    });
    $$('[data-ko-html][data-en-html]').forEach((el) => {
      const v = lang === 'en' ? el.dataset.enHtml : el.dataset.koHtml;
      if (v != null) el.innerHTML = v;
    });
    $$('[data-ko-label][data-en-label]').forEach((el) => {
      const v = lang === 'en' ? el.dataset.enLabel : el.dataset.koLabel;
      if (v != null) el.setAttribute('aria-label', v);
    });
    document.documentElement.lang = lang === 'en' ? 'en' : 'ko';
  }

  /* ==================================================================
     2. 소리 — #114에 확정으로 기록된 세 자리만. 나머지는 무음이다.
     ================================================================== */
  const CUES = {
    area:   'sfx-04-year-a-wood.wav',
    select: 'sfx-05-select-a-bell.wav',
    enter:  'sfx-06-enter-b-three-notes.wav',
  };
  const sound = {
    muted: false, heard: false, pool: Object.create(null),
    play(cue) {
      if (this.muted || !CUES[cue]) return;
      let el = this.pool[cue];
      if (!el) { el = new Audio(at('../../universe/assets/audio/' + CUES[cue])); el.volume = .5; this.pool[cue] = el; }
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

  const strip = (v) => String(v == null ? '' : v).replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
  const bi = (v) => (v == null ? { ko: '', en: '' }
    : typeof v === 'string' ? { ko: strip(v), en: strip(v) }
    : { ko: strip(v.ko || v.en || ''), en: strip(v.en || v.ko || '') });
  const keyOf = (v) => strip(v).replace(/\([^)]*\)/g, '').replace(/[^0-9a-z가-힣]/gi, '').toLowerCase();
  const same = (a, b) => { const x = keyOf(a), y = keyOf(b); return !!x && !!y && (x === y || x.startsWith(y) || y.startsWith(x)); };

  function toCard(raw, kind) {
    const name = bi(raw.title);
    const status = raw.status ? bi(raw.status) : null;
    let form = 'main';
    if (kind === 'wip') form = 'proto';
    else if (kind === 'discontinued') form = 'stalled';
    else if (kind === 'failed') form = (status && status.ko.indexOf('지연') >= 0) ? 'drift' : 'remnant';
    return {
      key: keyOf(name.ko), name,
      desc: bi(raw.descHtml || raw.desc),
      role: raw.role ? bi(raw.role) : null,
      reason: raw.failedReason ? bi(raw.failedReason) : null,
      tech: Array.isArray(raw.tech) ? raw.tech.map(bi) : [],
      detail: raw.detail || '', form,
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
  const loadData = () => fetch(at('../../projects.json'), { cache: 'no-cache' })
    .then((r) => { if (!r.ok) throw new Error('projects.json ' + r.status); return r.json(); })
    .then(normalize);

  /* 성장 사건 — 저장소에 근거가 남은 굵직한 것만 (#59) */
  const GROWTH = [
    { when: '2024', t: { ko: '처음 팀을 맡다', en: 'First time leading' },
      f: { ko: '비밀번호 도어락 — 팀장 · 4인 팀. 저장소에 기록된 첫 팀 리드.',
           en: 'Password door lock — team lead of 4. The first lead role in the repository.' } },
    { when: '2024', t: { ko: '전국 8위', en: '8th nationwide' },
      f: { ko: '2024 SFPC — 581팀 · 1,661명 중 전체 8위.',
           en: '2024 SFPC — 8th of 581 teams and 1,661 participants.' } },
    { when: '2024', t: { ko: '대회에서 두 번 불리다', en: 'Called up twice' },
      f: { ko: '디지털새싹 AI 어벤져스상 · 천안 학생 로봇 대회 동상.',
           en: 'AI Avengers Award and a bronze at the Cheonan robot contest.' } },
    { when: '2025', t: { ko: '가장 큰 팀', en: 'The largest team' },
      f: { ko: 'NFC 출석 체크 시스템 — 팀장 · 6인 팀. 저장소에 기록된 최대 규모.',
           en: 'NFC attendance — team lead of 6, the largest on record.' } },
    { when: '2025', t: { ko: '실패를 지우지 않다', en: 'Keeping the failures' },
      f: { ko: 'InfoCatch · InvestAI · 건영운세를 실패 기록으로 남겼다.',
           en: 'InfoCatch, InvestAI and Geonyeong Fortune kept as failure records.' } },
    { when: '2026', t: { ko: '혼자 끝까지', en: 'Solo, end to end' },
      f: { ko: '코리아텍 통합 알림 시스템 · MultiMind · GitHub Rank Insight — 기획부터 배포까지 1인.',
           en: 'Koreatech notifier, MultiMind and GitHub Rank Insight — solo from plan to deploy.' } },
    { when: '2026', t: { ko: '가르치는 쪽으로', en: 'Toward teaching' },
      f: { ko: '2026 U-CAST — 5팀 멘토, 로컬임팩트상.',
           en: '2026 U-CAST — mentor to team 5, Local Impact Award.' } },
  ];
  const RANKS = ['C', 'C+', 'B-', 'B', 'B+', 'A-', 'A'];
  const CHAIN = RANKS.length - 1;

  /* 수상 — 등급을 매기지 않는다(서열 기준 미확정) */
  const AWARDS = [
    { t: { ko: '2024 SFPC', en: '2024 SFPC' }, p: { ko: '전체 8위', en: '8th overall' },
      f: { ko: '581팀 · 1,661명 참가', en: '581 teams, 1,661 participants' }, detail: 'projects/2024_SFPC/' },
    { t: { ko: '2024 디지털새싹 AI 메이커톤', en: '2024 Digital Saessak AI Makerthon' },
      p: { ko: 'AI 어벤져스상', en: 'AI Avengers Award' },
      f: { ko: '산불 조기 감지 알림 시스템', en: 'Wildfire early detection system' }, detail: 'projects/nonofire/' },
    { t: { ko: '2024 제5회 천안 학생 로봇 대회', en: '2024 5th Cheonan Student Robot Contest' },
      p: { ko: '동상', en: 'Bronze' },
      f: { ko: '해커톤 분야 · 97팀', en: 'Hackathon category, 97 teams' }, detail: 'projects/2024_5th_CSRC/' },
    { t: { ko: '2026 U-CAST', en: '2026 U-CAST' }, p: { ko: '로컬임팩트상', en: 'Local Impact Award' },
      f: { ko: '「멈춰 !」 · 5팀 멘토', en: '"Stop!" · mentor to team 5' }, detail: 'projects/2026_U-CAST/' },
  ];

  /* ==================================================================
     4. 하늘의 순서 — 지금에서 과거로 내려가고, 그 세월이 만든 궤적을 지나,
        닿지 못한 것과 바깥에서 확인된 것으로 끝난다.
     ================================================================== */
  const AREAS = [
    { id: '2026', kind: 'year', shape: 'orion', w: 620, dx: 0.16,
      title: '2026', note: { ko: '한 해에 끝까지 간 아홉', en: 'Nine that reached the end' } },
    { id: '2025', kind: 'year', shape: 'cassiopeia', w: 940, dx: -0.20,
      title: '2025', note: { ko: '다섯 점이 그리는 W', en: 'A W drawn by five' } },
    { id: '2024', kind: 'year', shape: 'cygnus', w: 860, dx: 0.19,
      title: '2024', note: { ko: '북십자, 여섯', en: 'The Northern Cross, six' } },
    { id: 'trace', kind: 'growth', shape: 'dipper', w: 1020, dx: -0.17,
      title: { ko: '궤적', en: 'Trace' }, note: { ko: '저장소에 근거가 남은 일곱', en: 'Seven with evidence in the repository' } },
    { id: 'adrift', kind: 'adrift', shape: null, w: 1220, h: 700, dx: 0.12,
      title: { ko: '표류', en: 'Adrift' }, note: { ko: '닿지 못했거나, 아직 닿지 않은', en: 'Never arrived, or not yet' } },
    { id: 'log', kind: 'log', shape: null, w: 720, h: 520, dx: -0.15,
      title: { ko: '기록', en: 'Log' }, note: { ko: '바깥에서 확인된 것', en: 'Confirmed from outside' } },
  ];

  /* 별자리를 이루지 않는 구역은 손으로 놓는다. */
  const SCATTER = {
    adrift: [[.08,.30],[.27,.12],[.46,.28],[.65,.10],[.84,.26],[.98,.44],
             [.14,.66],[.36,.82],[.57,.62],[.78,.84],[.95,.70],[.30,.98],[.68,.98]],
    log:    [[.14,.18],[.62,.34],[.24,.62],[.72,.84]],
  };

  /* 문 앞의 별자리 — 새로고침마다 북두칠성/전갈자리 50:50 (#114 확정).
     이름표를 붙이지 않는다. 데이터가 아니라 문이다. */
  const DOOR = Math.random() < .5 ? 'dipper' : 'scorpius';

  /* ==================================================================
     5. 무대
     ================================================================== */
  const canvas = $('.sky');
  const starLayer = $('[data-stars]');
  const cardEl = $('[data-card]');
  const cardBody = $('[data-card-body]');
  const hereEl = $('[data-here]');
  const runEl = $('[data-run]');
  const whoEl = $('[data-who]');
  const rankEl = $('[data-rank]');

  let ctx = null, W = 0, H = 0;
  const cam = { y: 0, z: 1 };
  const view = { h: 0, band: 0, lead: 0, top: 0, bottom: 0 };
  const state = { areas: [], selected: null, linked: 0, focus: null, visited: new Set() };
  const objects = Object.create(null);
  const starBtns = [];

  const REDUCED = () => Sky.prefersReduced();

  function measure() {
    const s = Sky.sizeCanvas(canvas);
    ctx = s.ctx; W = s.w; H = s.h;
  }

  const extent = (a) => a.shape
    ? { w: a.w, h: a.w / Sky.SHAPES[a.shape].ratio }
    : { w: a.w, h: a.h || a.w * .62 };

  /* --- 배치 — 한 구역이 대략 한 화면을 쓰도록 화면에서 역산한다.
         기기가 달라져도 내려가는 리듬이 같다. --- */
  function layout() {
    let mw = 0, mh = 0;
    state.areas.forEach((a) => { a.e = extent(a); mw = Math.max(mw, a.e.w); mh = Math.max(mh, a.e.h); });
    const narrow = W < 900;
    const flat = H < 620 && W > H;
    cam.z = Math.min((W * (narrow ? .76 : .80)) / mw, (H * (flat ? .74 : narrow ? .54 : .64)) / mh);

    view.h = H / cam.z;
    view.w = W / cam.z;
    view.band = view.h * 1.16;
    view.lead = view.h * (narrow ? 1.08 : 1.02);
    state.areas.forEach((a, i) => {
      /* 좌우로 엇갈리게 둬서 곧은 기둥으로 읽히지 않게 한다.
         엇갈리는 폭은 화면 폭에서 잰다 — 세로 기준으로 재면 좁은 화면에서 밖으로 나간다. */
      a.x = view.w * a.dx * .5;
      a.y = view.lead + i * view.band;
    });
    /* 맨 위는 문 앞의 별자리, 맨 아래는 마지막 구역 한가운데.
       끝에 빈 하늘이 남아 어디에도 도착하지 못한 채 멈추지 않게 한다. */
    view.top = -view.h / 2;
    view.bottom = view.lead + (state.areas.length - 1) * view.band + view.h / 2;

    runEl.style.height = Math.round((view.bottom - view.top) * cam.z) + 'px';
    seedSky();
  }

  /* --- 배경 — 깊이가 다른 층은 다른 속도로 지나간다.
         이 시차가 '내가 움직이고 있다'를 만든다. --- */
  const LAYERS = [
    { f: .30, n: 0, r: [.4, .9],  a: [.10, .30], scale: .7 },
    { f: .56, n: 0, r: [.5, 1.3], a: [.16, .48], scale: .9 },
    { f: .84, n: 0, r: [.6, 1.7], a: [.24, .62], scale: 1.1 },
  ];
  const DUST = [[], [], []];
  const CLOUDS = [];

  function seedSky() {
    /* 가로 범위는 화면 폭에서 잰다. 시차로 밀리는 만큼 여유를 둔다. */
    const x0 = -view.w * .9, w = view.w * 1.8;
    const y0 = view.top - view.h, h = (view.bottom - view.top) + view.h * 2;

    LAYERS.forEach((L, li) => {
      /* 층마다 다른 속도로 지나가므로 덮어야 하는 세로 길이도 다르다. */
      const span = h * L.f + view.h * 2;
      const count = clamp(Math.round((w * span) / 1e6 * 62 * (1.4 - li * .2)), 260, 1400);
      const r = Sky.rng(4021 + li * 977);
      const out = DUST[li];
      out.length = 0;
      for (let i = 0; i < count; i++) out.push({
        x: x0 + r() * w,
        y: (y0 * L.f) + r() * span,
        r: L.r[0] + r() * (L.r[1] - L.r[0]),
        a: L.a[0] + r() * (L.a[1] - L.a[0]),
        gold: r() > .96,
      });
      L.n = count;
    });

    /* 성운은 드물어야 한다. 겹쳐 쌓이면 하늘이 아니라 뿌연 막이 된다. */
    const span = h * .46 + view.h * 2;
    const count = clamp(Math.round((w * span) / 1e6 * .58), 8, 22);
    const r = Sky.rng(311);
    CLOUDS.length = 0;
    for (let i = 0; i < count; i++) CLOUDS.push({
      x: x0 + r() * w, y: (y0 * .46) + r() * span,
      rx: 480 + r() * 920, rot: r() * 3.14, a: .14 + r() * .22,
    });
  }

  /* 층마다 다른 속도로 흐르는 것이 이 화면의 이동감이지만, 움직임을 줄여 달라는
     요청이 가장 먼저 겨냥하는 것도 바로 그 시차다. 그때는 하늘 전체를 한 판으로
     묶어 같이 움직인다. 깊이는 크기와 밝기에 그대로 남으므로 층은 사라지지 않는다. */
  const toScreen = (wx, wy, f) => [
    W / 2 + (wx - 0) * cam.z,
    H / 2 + (wy - cam.y * (f == null || REDUCED() ? 1 : f)) * cam.z,
  ];

  /* ==================================================================
     6. 별
     ================================================================== */
  function starWorld(a, i) {
    const p = a.shape ? Sky.SHAPES[a.shape].pts[i] : (SCATTER[a.id] || [])[i];
    if (!p) return null;
    return [a.x - a.e.w / 2 + p[0] * a.e.w, a.y - a.e.h / 2 + p[1] * a.e.h];
  }
  function objectFor(a, i) {
    const key = a.id + ':' + i;
    if (!objects[key]) {
      const card = a.kind === 'year' || a.kind === 'adrift' ? a.cards[i] : null;
      objects[key] = {
        form: card ? card.form : 'main',
        phase: (i * 1.37) % 6.28, tilt: (i * .73) % 3.14, focus: 0,
        bright: a.kind === 'log',
      };
    }
    return objects[key];
  }

  const fullName = (a, i) => {
    const c = a.cards[i];
    if (!c) return '';
    return a.kind === 'year' || a.kind === 'adrift' ? pick(c.name) : pick(c.t);
  };

  let measurer = null;
  function textWidth(t) {
    if (!measurer) {
      measurer = document.createElement('canvas').getContext('2d');
      measurer.font = '12.5px ' + getComputedStyle(document.body).fontFamily;
    }
    return measurer.measureText(t).width;
  }
  /* 하늘에 거는 이름은 표지판이다. 부제와 괄호를 떼고 폭이 모자라면 줄인다.
     온전한 이름은 카드와 aria-label에 남는다. */
  function sign(a, i) {
    let n = fullName(a, i);
    if (!n) return '';
    n = n.split(/\s+[—–-]\s+/)[0].replace(/\s*\([^)]*\)\s*$/, '').trim();
    const cap = Math.min(W * .26, 220);
    if (textWidth(n) <= cap) return n;
    while (n.length > 2 && textWidth(n + '…') > cap) n = n.slice(0, -1);
    return n.trim() + '…';
  }

  function buildStars(data) {
    state.areas = AREAS.map((def) => {
      const a = Object.assign({}, def);
      if (a.kind === 'year') a.cards = data.years[a.id] || [];
      else if (a.kind === 'adrift') a.cards = data.adrift;
      else if (a.kind === 'growth') a.cards = GROWTH;
      else a.cards = AWARDS;
      return a;
    });
    layout();

    starLayer.textContent = '';
    starBtns.length = 0;
    state.areas.forEach((a) => {
      for (let i = 0; i < a.cards.length; i++) {
        if (!starWorld(a, i)) continue;
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'star';
        b._area = a; b._index = i;
        b.setAttribute('aria-pressed', 'false');
        b.setAttribute('aria-label', fullName(a, i));
        const label = document.createElement('span');
        label.className = 'star-name';
        label.textContent = sign(a, i);
        b.appendChild(label);
        b.addEventListener('click', (ev) => { ev.stopPropagation(); select(a, i); });
        starLayer.appendChild(b);
        starBtns.push(b);
      }
    });
  }
  function relabel() {
    starBtns.forEach((b) => {
      const l = $('.star-name', b);
      if (l) l.textContent = sign(b._area, b._index);
      b.setAttribute('aria-label', fullName(b._area, b._index));
    });
  }

  /* ==================================================================
     7. 이름표 — 바깥으로 뻗되 겹치면 비킨다. 겹쳐 놓은 글도 피한다.
     ================================================================== */
  const GAP = 26, LINE = 19, EDGE = 14;
  function layoutLabels(live) {
    if (!live.length) return;
    let cx = 0; live.forEach((s) => { cx += s.x; }); cx /= live.length;

    const keep = [];
    if (cardEl.classList.contains('is-open')) keep.push(cardEl.getBoundingClientRect());
    $$('[data-keepout]').forEach((el) => {
      if (getComputedStyle(el).opacity === '0') return;
      keep.push(el.getBoundingClientRect());
    });

    live.forEach((s) => {
      const el = $('.star-name', s.b);
      s.el = el;
      s.w = el ? textWidth(el.textContent) : 0;
      s.right = s.x >= cx;
      s.dy = 0;
    });
    const box = (s, right, y) => { const l = right ? s.x + GAP : s.x - GAP - s.w; return { l, r: l + s.w, y }; };
    const outside = (b) => b.l < EDGE || b.r > W - EDGE;
    const blocked = (b, y) => keep.some((k) => b.r > k.left - 10 && b.l < k.right + 10 && y > k.top - 12 && y < k.bottom + 12);
    const cost = (b) => (outside(b) ? 2 : 0) + (blocked(b, b.y) ? 1 : 0);

    live.forEach((s) => {
      const a = box(s, s.right, s.y);
      if (!cost(a)) return;
      if (cost(box(s, !s.right, s.y)) < cost(a)) s.right = !s.right;
    });

    const put = [];
    live.slice().sort((a, b) => a.y - b.y).forEach((s) => {
      const b = box(s, s.right, s.y);
      let y = s.y, guard = 0;
      while (guard++ < 60) {
        const hit = put.find((o) => o.r > b.l - 16 && o.l < b.r + 16 && Math.abs(o.y - y) < LINE);
        if (hit) { y = hit.y + LINE; continue; }
        const k = keep.find((kk) => b.r > kk.left - 10 && b.l < kk.right + 10 && y > kk.top - 12 && y < kk.bottom + 12);
        if (k) { y = (y < (k.top + k.bottom) / 2 ? k.top - LINE : k.bottom + LINE); continue; }
        break;
      }
      s.dy = y - s.y;
      put.push({ l: b.l, r: b.r, y });
    });

    live.forEach((s) => {
      if (!s.el) return;
      const y = clamp(s.y + s.dy, EDGE + 8, H - EDGE - 8) - s.y;
      s.el.style.setProperty('--ldx', (s.right ? GAP : -GAP - s.w) + 'px');
      s.el.style.setProperty('--ldy', y.toFixed(1) + 'px');
    });
  }

  function place() {
    const live = [];
    starBtns.forEach((b) => {
      const w = starWorld(b._area, b._index);
      if (!w) { b.hidden = true; return; }
      const [sx, sy] = toScreen(w[0], w[1]);
      /* opacity:0 은 눈에만 듣는다. 탭 순서와 클릭 판정에는 아무 말도 하지 않아서,
         아직 드러나지 않은 구역의 별에 키보드 초점이 먼저 가 닿거나 보이지 않는
         별이 눌리곤 했다. 안 보이면 없는 것이어야 한다 — 실제로 칠하는 값과 같은
         값으로 hidden을 함께 끊는다. 임계에서 한 프레임 어긋나는 자리를 남기지 않는다.
         구역의 진행도는 그 구역 전체가 한 프레임에 함께 넘으므로 배치가 흔들리지 않는다. */
      const shown = clamp(((b._area.reveal || 0) - .55) / .3, 0, 1);
      const on = sy > -90 && sy < H + 90 && shown > 0;
      b.hidden = !on;
      if (!on) return;
      b.style.transform = `translate(${sx}px, ${sy}px)`;
      b.style.opacity = String(shown);
      live.push({ b, x: sx, y: sy });
    });
    if (thirteenth.btn) {
      const [sx, sy] = toScreen(thirteenth.x, thirteenth.y);
      const on = sy > -90 && sy < H + 90;
      thirteenth.btn.hidden = !on;
      if (on) thirteenth.btn.style.transform = `translate(${sx}px, ${sy}px)`;
    }
    layoutLabels(live);
  }

  /* ==================================================================
     8. 그리기 — 언제나 완성된 한 장을 남긴다.
     ================================================================== */
  const door = { at: 0, pts: null };

  function draw() {
    if (!ctx) return false;
    const T = Sky.theme();
    const L = T.mode === 'light';
    let busy = false;

    const g = ctx.createLinearGradient(W, 0, 0, H);
    g.addColorStop(0, T.sky0); g.addColorStop(.55, T.sky1); g.addColorStop(1, T.sky2);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    CLOUDS.forEach((c) => {
      const [sx, sy] = toScreen(c.x, c.y, .46);
      const rr = c.rx * cam.z;
      if (sy < -rr * 1.3 || sy > H + rr * 1.3 || sx < -rr * 1.3 || sx > W + rr * 1.3) return;
      ctx.save(); ctx.translate(sx, sy); ctx.rotate(c.rot); ctx.scale(1, .58);
      const rg = ctx.createRadialGradient(rr * .2, -rr * .24, rr * .04, 0, 0, rr);
      const a = c.a * (L ? .92 : 1.25);
      rg.addColorStop(0, rgba(T.neb, a));
      rg.addColorStop(.3, rgba(T.neb, a * .6));
      rg.addColorStop(.62, rgba(T.neb2, a * .24));
      rg.addColorStop(1, rgba(T.neb2, 0));
      ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(0, 0, rr, 0, 7); ctx.fill(); ctx.restore();
    });

    LAYERS.forEach((Lay, li) => {
      const R = clamp(cam.z * Lay.scale * 1.6, .45, 1.7);
      DUST[li].forEach((s) => {
        const [sx, sy] = toScreen(s.x, s.y, Lay.f);
        if (sy < -8 || sy > H + 8 || sx < -8 || sx > W + 8) return;
        ctx.globalAlpha = s.a * (L ? .8 : 1);
        ctx.fillStyle = s.gold ? T.gold : T.ink;
        ctx.beginPath(); ctx.arc(sx, sy, s.r * R, 0, 7); ctx.fill();
      });
    });
    ctx.globalAlpha = 1;

    /* 문 앞의 별자리 — 도착하자마자 한 번 그어진다. 이름표는 없다. */
    if (door.pts) {
      const k = REDUCED() ? 1 : clamp((performance.now() - door.at) / 2400, 0, 1);
      if (k < 1) busy = true;
      const pts = door.pts.map(([x, y]) => toScreen(x, y));
      const S = Math.min(W, H);
      ctx.save();
      ctx.globalAlpha = clamp(1 - (cam.y / (view.h * .95)), 0, 1);
      if (ctx.globalAlpha > .01) {
        Sky.constellation(ctx, pts, Sky.SHAPES[DOOR].edges, T, {
          scale: S, progress: k, bright: Sky.SHAPES[DOOR].bright,
          starRadius: 2.1, haloRadius: S * .017, lineWidth: 1.1, lineAlpha: .58,
        });
      }
      ctx.restore();
    }

    state.areas.forEach((a) => {
      const n = a.cards.length;
      if (!n) return;
      const [, cy] = toScreen(a.x, a.y);
      if (cy < -a.e.h * cam.z - 240 || cy > H + a.e.h * cam.z + 240) return;

      /* 처음 시야에 들어온 순간부터 한 번만 그어진다. */
      if (a.seenAt == null && Math.abs(a.y - cam.y) < view.h * .5 + a.e.h * .55) {
        a.seenAt = performance.now();
        if (state.focus !== a.id) { state.focus = a.id; sound.play('area'); }
        state.visited.add(a.id);
        revealThirteenth();
        setTimeout(() => { a.seenAt = performance.now() - 99999; paintNow(); }, 1700);
      }
      const rev = a.seenAt == null ? 0
        : REDUCED() ? 1 : clamp((performance.now() - a.seenAt) / 1500, 0, 1);
      a.reveal = rev;
      if (rev < 1 && a.seenAt != null) busy = true;
      if (rev <= 0) return;

      const pts = [];
      for (let i = 0; i < n; i++) {
        const w = starWorld(a, i);
        pts.push(w ? toScreen(w[0], w[1]) : null);
      }

      if (!a.shape) {
        /* 선 없는 구역은 성운 자락으로 자리를 잡는다. 흩뿌린 점만 두지 않는다. */
        const [hx, hy] = toScreen(a.x, a.y);
        const rx = (a.e.w / 2) * cam.z * .92, ry = (a.e.h / 2) * cam.z * .92;
        ctx.save(); ctx.translate(hx, hy); ctx.scale(1, ry / rx);
        const hg = ctx.createRadialGradient(rx * .18, -rx * .22, rx * .06, 0, 0, rx);
        const ha = (L ? .10 : .13) * rev;
        hg.addColorStop(0, rgba(T.neb, ha));
        hg.addColorStop(.46, rgba(T.neb, ha * .5));
        hg.addColorStop(1, rgba(T.neb2, 0));
        ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(0, 0, rx, 0, 7); ctx.fill(); ctx.restore();
      } else {
        const sh = Sky.SHAPES[a.shape];
        const edges = sh.edges.filter(([x, y]) => x < n && y < n);
        ctx.save(); ctx.lineCap = 'round'; ctx.lineWidth = 1.1;
        edges.forEach(([x, y], i) => {
          if (!pts[x] || !pts[y]) return;
          const gilded = a.kind !== 'growth' || (i < CHAIN ? i < state.linked : state.linked >= CHAIN);
          const k = clamp(rev * (edges.length + 1) - i, 0, 1);
          if (k <= 0) return;
          ctx.strokeStyle = gilded ? rgba(T.gold, L ? .52 : .60) : rgba(T.ink, L ? .13 : .16);
          ctx.beginPath();
          ctx.moveTo(pts[x][0], pts[x][1]);
          ctx.lineTo(lerp(pts[x][0], pts[y][0], easeOut(k)), lerp(pts[x][1], pts[y][1], easeOut(k)));
          ctx.stroke();
        });
        ctx.restore();
      }

      const R = clamp(Math.min(a.e.w, a.e.h) * cam.z * .028, 3, 14);
      for (let i = 0; i < n; i++) {
        const p = pts[i]; if (!p) continue;
        if (p[1] < -80 || p[1] > H + 80) continue;
        const shown = clamp(rev * 1.5 - i * .04, 0, 1);
        if (shown <= 0) continue;
        const o = objectFor(a, i);
        const on = state.selected && state.selected.area === a.id && state.selected.index === i;
        const target = on ? 1 : 0;
        if (Math.abs(target - o.focus) > .01) { o.focus += (target - o.focus) * .2; busy = true; } else o.focus = target;
        /* 주계열성은 점 하나로 충분하지만 원반·잔해·궤도 이탈은 형태가 곧 상태다.
           같은 반지름을 쓰면 형태가 뭉개져 먼지처럼 읽힌다. */
        const rr = R * shown * (o.form === 'main' ? 1 : 1.75);
        if (o.form === 'proto' || o.form === 'stalled') Sky.forms.protostar(ctx, p[0], p[1], rr, T, o, 0, o.focus);
        else if (o.form === 'remnant') Sky.forms.remnant(ctx, p[0], p[1], rr, T, o, 0, o.focus);
        else if (o.form === 'drift') Sky.forms.drifted(ctx, p[0], p[1], rr, T, o, 0, o.focus);
        else Sky.forms.mainSequence(ctx, p[0], p[1], rr, T, o, 0, o.focus);
      }
    });

    if (thirteenth.shown) busy = drawThirteenth(ctx, T) || busy;

    const S = Math.min(W, H);
    const v = ctx.createRadialGradient(W * .58, H * .40, S * .26, W * .44, H * .58, S * 1.25);
    v.addColorStop(0, rgba(T.vignette, 0));
    v.addColorStop(1, rgba(T.vignette, L ? .40 : .48));
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);

    return busy;
  }

  /* ==================================================================
     9. 이스터에그 — 세 해를 모두 지난 뒤에만 이름 없는 별이 생긴다.
        예고하지 않는다. 누르면 뱀주인자리가 그어지고,
        다 그어진 뒤 한 번 더 누르면 격리된 기록이 열린다.
     ================================================================== */
  const DRAW_MS = 2400;
  const thirteenth = { shown: false, drawnAt: 0, done: false, btn: null, x: 0, y: 0 };

  function revealThirteenth() {
    if (thirteenth.shown) return;
    if (!['2026', '2025', '2024'].every((y) => state.visited.has(y))) return;
    thirteenth.shown = true;
    /* 여섯 구역 바깥, 아무도 안 보는 구석. 표류와 기록 사이 옆쪽이다. */
    const adrift = state.areas.find((a) => a.id === 'adrift');
    thirteenth.x = adrift.x + view.w * .30;
    thirteenth.y = adrift.y + view.band * .52;

    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'star star-unnamed';
    b.setAttribute('aria-label', lang === 'en' ? 'Unnamed star' : '이름 없는 별');
    b.addEventListener('click', (ev) => {
      ev.stopPropagation();
      if (!thirteenth.drawnAt) {
        thirteenth.drawnAt = performance.now();
        sound.play('select');
        /* 다 그어진 시점은 루프가 아니라 시계가 정한다. 프레임이 굶어도 진행한다. */
        setTimeout(finishThirteenth, DRAW_MS + 120);
      } else if (thirteenth.done) openVault();
      kick();
    });
    starLayer.appendChild(b);
    thirteenth.btn = b;
    kick();
  }
  function finishThirteenth() {
    if (thirteenth.done || !thirteenth.drawnAt) return;
    thirteenth.done = true;
    if (thirteenth.btn) {
      thirteenth.btn.classList.add('is-drawn');
      thirteenth.btn.setAttribute('aria-label', lang === 'en' ? 'Open the quarantined record' : '격리된 기록 열기');
    }
    paintNow();
  }
  function drawThirteenth(c, T) {
    const [sx, sy] = toScreen(thirteenth.x, thirteenth.y);
    if (sy < -200 || sy > H + 200) return false;
    const S = Math.min(W, H);
    Sky.star(c, sx, sy, 1.8, T.ink, thirteenth.drawnAt ? .3 : .74, S * .018, T.mode === 'light' ? .32 : .13, T);
    if (!thirteenth.drawnAt) return false;
    const k = REDUCED() ? 1 : clamp((performance.now() - thirteenth.drawnAt) / DRAW_MS, 0, 1);
    const sh = Sky.SHAPES.ophiuchus;
    const w = Math.min(view.w * .34, view.h * .40), h = w / sh.ratio;
    const pts = sh.pts.map(([x, y]) => toScreen(thirteenth.x - w / 2 + x * w, thirteenth.y - h / 2 + y * h));
    c.save(); c.globalAlpha = k;
    Sky.constellation(c, pts, sh.edges, T, {
      scale: S, progress: k, bright: sh.bright,
      starRadius: 2.2, haloRadius: 12, lineWidth: 1, lineAlpha: .82,
    });
    c.restore();
    return k < 1;
  }

  const vaultEl = $('[data-vault]');
  let vaultCards = [], lastFocus = null;
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
      const body = pick(c.reason) || pick(c.desc);
      if (body) { const p = document.createElement('p'); p.textContent = body; box.appendChild(p); }
      if (c.detail) {
        const a = document.createElement('a');
        a.className = 'card-go'; a.href = SITE + c.detail;
        a.target = '_blank'; a.rel = 'noopener';
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

  /* aria-modal="true"는 스크린리더에게만 바깥이 없다고 말한다. Tab은 그 말을 듣지 않아서
     키보드 초점이 열린 금고를 지나 뒤편 하늘로 걸어 나갔다. 두 말이 어긋나지 않게 직접 가둔다. */
  const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';
  function trapVaultTab(e) {
    if (e.key !== 'Tab' || !vaultEl || vaultEl.hidden) return;
    const items = [...vaultEl.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null);
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    /* 초점이 어쩌다 바깥에 있으면 되돌린다 — 금고를 열어 둔 채로는 나갈 곳이 없다. */
    if (!vaultEl.contains(document.activeElement)) { e.preventDefault(); first.focus(); return; }
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  /* ==================================================================
     10. 선택과 카드
     ================================================================== */
  function select(a, i) {
    state.selected = { area: a.id, index: i };
    starBtns.forEach((b) => b.setAttribute('aria-pressed', String(b._area === a && b._index === i)));
    renderCard(a, i);
    if (a.kind === 'growth') link(i);
    sound.play('select');
    paintNow(); kick();
  }
  function link(to) {
    if (to !== state.linked + 1) return;
    state.linked = to;
    $('[data-rank-now]').textContent = RANKS[Math.min(state.linked, CHAIN)];
    $('[data-rank-rail]').style.setProperty('--rank-progress', ((state.linked / CHAIN) * 100) + '%');
  }
  function closeCard() {
    state.selected = null;
    starBtns.forEach((b) => b.setAttribute('aria-pressed', 'false'));
    cardEl.classList.remove('is-open');
    place(); paintNow(); kick();
  }
  function renderCard(a, i) {
    const c = a.cards[i];
    if (!c) return;
    cardBody.textContent = '';
    const h = document.createElement('h3');
    h.textContent = fullName(a, i);
    cardBody.appendChild(h);

    const role = a.kind === 'growth' ? c.when : a.kind === 'log' ? pick(c.p) : (c.role ? pick(c.role) : '');
    if (role) { const p = document.createElement('p'); p.className = 'card-role'; p.textContent = role; cardBody.appendChild(p); }

    const lin = c.key && LINEAGE[c.key];
    if (lin) { const p = document.createElement('p'); p.className = 'card-lineage'; p.textContent = pick(lin); cardBody.appendChild(p); }

    const body = a.kind === 'growth' || a.kind === 'log' ? pick(c.f) : (pick(c.reason) || pick(c.desc));
    if (body) { const p = document.createElement('p'); p.textContent = body; cardBody.appendChild(p); }

    if (c.tech && c.tech.length) {
      const ul = document.createElement('ul'); ul.className = 'card-tech';
      c.tech.slice(0, 6).forEach((t) => { const li = document.createElement('li'); li.textContent = pick(t); ul.appendChild(li); });
      cardBody.appendChild(ul);
    }
    if (c.detail) {
      const a2 = document.createElement('a');
      a2.className = 'card-go'; a2.href = SITE + c.detail;
      a2.target = '_blank'; a2.rel = 'noopener';
      a2.textContent = lang === 'en' ? 'Open details →' : '상세 보기 →';
      a2.addEventListener('click', () => sound.play('enter'));
      cardBody.appendChild(a2);
    }
    cardEl.classList.add('is-open');
    place();
  }

  /* ==================================================================
     11. 스크롤 → 카메라. 이것이 이 화면의 전부다.
     ================================================================== */
  let raf = 0;
  /* draw가 구역의 진행도를 정하고 place가 그 값을 쓴다. 그리기가 먼저다.
     반대로 두면 별 단추가 한 프레임 뒤처져 영영 안 보이는 경우가 생긴다. */
  function paintNow() {
    const busy = draw();
    place();
    if (busy) kick();
  }
  function frame() { raf = 0; paintNow(); }
  function kick() { if (!raf) raf = requestAnimationFrame(frame); }

  function follow() {
    const y = window.scrollY || document.documentElement.scrollTop || 0;
    cam.y = view.top + (y + H / 2) / cam.z;

    const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    const bar = $('[data-depth]');
    if (bar) bar.style.setProperty('--depth', ((y / max) * 100).toFixed(2) + '%');
    whoEl.classList.toggle('is-away', y > H * .46);

    /* 지금 어디쯤인지는 구역 사이 간격으로 잰다. 구역과 구역 사이 짧은 구간에는
       아무 이름도 없다 — 아직 열린 하늘이다. */
    let best = null, bd = Infinity;
    state.areas.forEach((a) => {
      const d = Math.abs(a.y - cam.y) / view.band;
      if (d < bd) { bd = d; best = a; }
    });
    const near = best && bd < .44;
    $('b', hereEl).textContent = near ? pick(best.title) : '';
    $('span', hereEl).textContent = near ? pick(best.note) : '';
    rankEl.classList.toggle('is-on', !!near && best.kind === 'growth');

    paintNow();
  }

  /* ==================================================================
     12. 시작
     ================================================================== */
  function boot() {
    applyLang();
    measure();

    const langBtn = $('[data-lang]');
    if (langBtn) {
      const paint = () => {
        langBtn.textContent = lang === 'en' ? 'KO' : 'EN';
        langBtn.setAttribute('aria-label', lang === 'en' ? '한국어로 보기' : 'View in English');
      };
      langBtn.addEventListener('click', () => {
        lang = lang === 'en' ? 'ko' : 'en';
        try { localStorage.setItem(LANG_KEY, lang); } catch (_) { /* 저장이 막혀도 화면은 바뀐다 */ }
        applyLang(); paint(); relabel();
        if (state.selected) {
          const a = state.areas.find((x) => x.id === state.selected.area);
          if (a) renderCard(a, state.selected.index);
        }
        if (vaultEl && !vaultEl.hidden) openVault();
        follow();
      });
      paint();
    }

    const mute = $('[data-mute]');
    if (mute) {
      mute.hidden = true;
      mute.addEventListener('click', () => {
        sound.muted = !sound.muted;
        mute.setAttribute('aria-pressed', String(sound.muted));
        mute.textContent = sound.muted ? '♪' : '♫';
      });
    }

    $('[data-card-close]').addEventListener('click', closeCard);
    const vc = $('[data-vault-close]');
    if (vc) vc.addEventListener('click', closeVault);
    if (vaultEl) vaultEl.addEventListener('click', (e) => { if (e.target === vaultEl) closeVault(); });
    document.addEventListener('keydown', (e) => {
      trapVaultTab(e);
      if (e.key !== 'Escape') return;
      if (vaultEl && !vaultEl.hidden) closeVault();
      else if (state.selected) closeCard();
    });

    const mail = $('[data-mail]');
    if (mail) mail.addEventListener('click', () => {
      if (!navigator.clipboard) return;
      navigator.clipboard.writeText(mail.dataset.mail).then(() => {
        const out = $('.copied', mail);
        out.textContent = lang === 'en' ? 'Copied' : '복사됨';
        setTimeout(() => { out.textContent = ''; }, 1600);
      }, () => {});
    });

    /* 스크롤은 가로채지 않는다. 브라우저가 굴린 그대로 따라간다. */
    addEventListener('scroll', follow, { passive: true });

    let tm = 0;
    addEventListener('resize', () => {
      clearTimeout(tm);
      tm = setTimeout(() => {
        const before = window.scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight);
        measure(); layout(); relabel();
        placeDoor();
        const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
        window.scrollTo(0, before * max);
        follow();
      }, 140);
    });
    Sky.onThemeChange(() => paintNow());

    loadData().then((data) => {
      vaultCards = data.vault || [];
      buildStars(data);
      placeDoor();
      door.at = performance.now();
      follow();
      kick();
      /* 어떤 이유로든 루프가 굶어도 완성된 하늘은 반드시 나온다. */
      setTimeout(() => { door.at = performance.now() - 9999; paintNow(); }, 3200);
    }).catch((err) => {
      console.error('[v3] projects.json', err);
      $('span', hereEl).textContent = lang === 'en'
        ? 'Could not read projects.json. Serve this folder over HTTP.'
        : 'projects.json을 읽지 못했습니다. 정적 서버로 열어 주세요.';
    });
  }

  /* 문 앞의 별자리는 첫 화면 한가운데 위쪽에 놓는다. 왼쪽 아래는 이름이 쓴다. */
  function placeDoor() {
    const sh = Sky.SHAPES[DOOR];
    const narrow = W < 900;
    /* 북두칠성(2.3)과 전갈자리(0.67)는 종횡비가 크게 다르다.
       같은 상자에 letterbox로 넣어야 어느 쪽이 나와도 위가 잘리지 않는다. */
    const boxW = view.w * (narrow ? .82 : .52);
    const boxH = view.h * (narrow ? .40 : .58);
    let w = boxW, h = w / sh.ratio;
    if (h > boxH) { h = boxH; w = h * sh.ratio; }
    const cx = view.w * (narrow ? .00 : .10);
    const cy = -view.h * (narrow ? .18 : .04);
    door.pts = sh.pts.map(([x, y]) => [cx - w / 2 + x * w, cy - h / 2 + y * h]);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
