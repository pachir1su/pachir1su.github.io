/* =====================================================================
   이동 방식 시안 — 공용 엔진 (docs/v3-universe/move.js)

   같은 무대 · 같은 데이터 · 같은 시각 언어를 세 시안이 공유한다.
   다른 것은 카메라를 무엇이 미느냐뿐이고, 그 부분만 각 시안이 가진다.

   지키는 규칙 (#114 기록)
   - 프로젝트 이름은 언제나 화면에 있다. 눌러야 보이는 것은 역할·설명·링크뿐이다.
   - 상태는 글자가 아니라 형태로 말한다.
   - 별자리는 Sky.SHAPES의 실제 종횡비로만 놓는다. 늘어나지 않는다.
   - 별을 눌러도 별자리 좌표와 선은 움직이지 않는다.
   - 상시 rAF 금지. 카메라가 움직이는 동안과 연출 동안에만 돈다.
   - 그리기는 언제나 완성된 한 장을 남긴다. 첫 장을 루프에 맡기지 않는다.
   ===================================================================== */
(() => {
  'use strict';

  const Sky = window.V3Sky;
  if (!Sky) return;

  const { clamp, lerp, rgba } = Sky;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  const HERE = new URL('.', (document.currentScript && document.currentScript.src) || location.href);
  const at = (rel) => new URL(rel, HERE).href;

  /* ==================================================================
     1. 데이터 — projects.json 하나만 읽는다.
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
  const load = () => fetch(at('../../projects.json'), { cache: 'no-cache' })
    .then((r) => { if (!r.ok) throw new Error('projects.json ' + r.status); return r.json(); })
    .then(normalize);

  /* 성장 사건 — 저장소에 근거가 남은 것만 (#59) */
  const GROWTH = [
    { when: '2024', t: '처음 팀을 맡다', f: '비밀번호 도어락 — 팀장 · 4인 팀. 저장소에 기록된 첫 팀 리드.' },
    { when: '2024', t: '전국 8위', f: '2024 SFPC — 581팀 · 1,661명 중 전체 8위.' },
    { when: '2024', t: '대회에서 두 번 불리다', f: '디지털새싹 AI 어벤져스상 · 천안 학생 로봇 대회 동상.' },
    { when: '2025', t: '가장 큰 팀', f: 'NFC 출석 체크 시스템 — 팀장 · 6인 팀. 저장소에 기록된 최대 규모.' },
    { when: '2025', t: '실패를 지우지 않다', f: 'InfoCatch · InvestAI · 건영운세를 실패 기록으로 남겼다.' },
    { when: '2026', t: '혼자 끝까지', f: '코리아텍 통합 알림 시스템 · MultiMind · GitHub Rank Insight — 기획부터 배포까지 1인.' },
    { when: '2026', t: '가르치는 쪽으로', f: '2026 U-CAST — 5팀 멘토, 로컬임팩트상.' },
  ];
  const RANKS = ['C', 'C+', 'B-', 'B', 'B+', 'A-', 'A'];
  const CHAIN = RANKS.length - 1;

  /* 수상 — 등급을 매기지 않는다(서열 기준 미확정) */
  const AWARDS = [
    { t: '2024 SFPC', p: '전체 8위', f: '581팀 · 1,661명 참가', detail: 'projects/2024_SFPC/' },
    { t: '2024 디지털새싹 AI 메이커톤', p: 'AI 어벤져스상', f: '산불 조기 감지 알림 시스템', detail: 'projects/nonofire/' },
    { t: '2024 제5회 천안 학생 로봇 대회', p: '동상', f: '해커톤 분야 · 97팀', detail: 'projects/2024_5th_CSRC/' },
    { t: '2026 U-CAST', p: '로컬임팩트상', f: '「멈춰 !」 · 5팀 멘토', detail: 'projects/2026_U-CAST/' },
  ];

  /* ==================================================================
     2. 구역 — 좌표는 배치(layout)가 준다. 여기서는 무엇이 들어가는지만 정한다.
     ================================================================== */
  const AREA_DEFS = [
    { id: 'trace',  kind: 'growth', shape: 'dipper',     w: 1000, title: '궤적', note: '저장소에 근거가 남은 일곱' },
    { id: '2026',   kind: 'year',   shape: 'orion',      w:  620, title: '2026', note: '한 해에 끝까지 간 아홉' },
    { id: '2025',   kind: 'year',   shape: 'cassiopeia', w:  900, title: '2025', note: '다섯 점이 그리는 W' },
    { id: '2024',   kind: 'year',   shape: 'cygnus',     w:  820, title: '2024', note: '북십자, 여섯' },
    { id: 'adrift', kind: 'adrift', shape: null,         w: 1000, h: 620, title: '표류', note: '닿지 못했거나, 아직 닿지 않은' },
    { id: 'log',    kind: 'log',    shape: null,         w:  700, h: 520, title: '기록', note: '바깥에서 확인된 것' },
  ];

  /* 별자리가 없는 구역은 손으로 놓는다. */
  const SCATTER = {
    adrift: [[.08,.30],[.27,.12],[.46,.28],[.65,.10],[.84,.26],[.98,.44],
             [.14,.66],[.36,.82],[.57,.62],[.78,.84],[.95,.70],[.30,.98],[.68,.98]],
    log:    [[.14,.18],[.62,.34],[.24,.62],[.72,.84]],
  };

  const extent = (a) => a.shape
    ? { w: a.w, h: a.w / Sky.SHAPES[a.shape].ratio }
    : { w: a.w, h: a.h || a.w * 0.62 };

  /* ==================================================================
     3. 배치 — 이동 방식에 따라 구역을 어디에 놓을지.
     ================================================================== */
  const LAYOUTS = {
    /* 옆으로 퍼진 지도. 왼쪽 위에서 오른쪽 아래로 읽힌다. */
    spread: {
      trace:  [-1450, -780], '2026': [-420, -380], '2025': [520, -820],
      '2024': [1400, -300], adrift: [1150, 560], log: [200, 700],
    },
    /* 아래로 내려가는 하늘. x는 살짝 엇갈리게 둬서 곧은 기둥으로 읽히지 않게 한다. */
    columnOffset: { trace: -230, '2026': 190, '2025': -220, '2024': 210, adrift: -180, log: 220 },
    columnOrder: ['trace', '2026', '2025', '2024', 'adrift', 'log'],
  };

  /* ==================================================================
     4. 무대
     ================================================================== */
  function Stage(opts) {
    const canvas = opts.canvas;
    const starLayer = opts.stars;
    const cardEl = opts.card;
    const cardBody = opts.cardBody;

    let ctx = null, W = 0, H = 0;
    const cam = { x: 0, y: 0, z: 1 };
    const state = { areas: [], selected: null, linked: 0, intro: 0, introAt: 0 };
    const objects = Object.create(null);
    const starBtns = [];

    /* --- 배경 — 하늘이 놓인 범위를 실제로 덮는다.
           배치가 바뀌면 다시 뿌린다. 그러지 않으면 멀리 간 곳이 빈 화면이 된다. --- */
    const FIELD = [];
    const CLOUDS = [];
    function seedSky() {
      const b = worldBox();
      const mx = Math.max(1500, b.w * .30), my = Math.max(1500, b.h * .10);
      const x0 = b.x0 - mx, y0 = b.y0 - my;
      const w = b.w + mx * 2, h = b.h + my * 2;
      const acre = (w * h) / 1e6;
      const nStar = clamp(Math.round(acre * 60), 500, 2800);
      const nCloud = clamp(Math.round(acre * 0.9), 10, 44);

      FIELD.length = 0;
      const r1 = Sky.rng(4021);
      for (let i = 0; i < nStar; i++) FIELD.push({
        x: x0 + r1() * w, y: y0 + r1() * h,
        r: .5 + r1() * 1.5, a: .18 + r1() * .55, gold: r1() > .95,
      });

      CLOUDS.length = 0;
      const r2 = Sky.rng(311);
      for (let i = 0; i < nCloud; i++) CLOUDS.push({
        x: x0 + r2() * w, y: y0 + r2() * h,
        rx: 700 + r2() * 1500, rot: r2() * 3.14, a: .16 + r2() * .26,
      });
    }

    const toScreen = (wx, wy) => [W / 2 + (wx - cam.x) * cam.z, H / 2 + (wy - cam.y) * cam.z];

    function measure() {
      const s = Sky.sizeCanvas(canvas);
      ctx = s.ctx; W = s.w; H = s.h;
    }

    /* --- 구역 만들기 --- */
    function build(data, layout) {
      state.areas = AREA_DEFS.map((def) => {
        const a = Object.assign({}, def);
        if (a.kind === 'year') a.cards = data.years[a.id] || [];
        else if (a.kind === 'adrift') a.cards = data.adrift;
        else if (a.kind === 'growth') a.cards = GROWTH;
        else a.cards = AWARDS;
        a.e = extent(a);
        return a;
      });
      applyLayout(layout);
      buildButtons();
    }

    /* 배치 적용 — 세로 배치는 화면 높이를 알아야 하므로 여기서 계산한다. */
    function applyLayout(kind) {
      state.layout = kind;
      if (kind === 'column') {
        /* 한 구역이 대략 한 화면을 쓰도록 띠 높이를 화면에서 역산한다.
           그래야 기기가 달라져도 내려가는 리듬이 같다. */
        const z = columnZoom();
        const view = H / z;
        const band = view * 1.18;
        LAYOUTS.columnOrder.forEach((id, i) => {
          const a = state.areas.find((x) => x.id === id);
          a.x = LAYOUTS.columnOffset[id];
          a.y = i * band;
        });
        /* 맨 위에서 첫 구역 한가운데, 맨 아래에서 마지막 구역 한가운데에 선다.
           끝에 빈 하늘이 남아 어디에도 도착하지 못한 채 멈추지 않게 한다. */
        state.band = band;
        state.skyTop = -view / 2;
        state.skyBottom = (LAYOUTS.columnOrder.length - 1) * band + view / 2;
      } else {
        state.areas.forEach((a) => {
          const p = LAYOUTS.spread[a.id];
          a.x = p[0]; a.y = p[1];
        });
      }
      seedSky();
    }

    /* 세로 배치의 배율 — 가장 넓은 구역과 가장 높은 구역이 모두 들어가는 값 하나. */
    function columnZoom() {
      let mw = 0, mh = 0;
      state.areas.forEach((a) => { mw = Math.max(mw, a.e.w); mh = Math.max(mh, a.e.h); });
      const narrow = W < 900;
      return Math.min((W * (narrow ? .74 : .78)) / mw, (H * (narrow ? .52 : .62)) / mh);
    }

    /* 전체가 들어가는 상자 */
    function worldBox() {
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      state.areas.forEach((a) => {
        x0 = Math.min(x0, a.x - a.e.w / 2); x1 = Math.max(x1, a.x + a.e.w / 2);
        y0 = Math.min(y0, a.y - a.e.h / 2); y1 = Math.max(y1, a.y + a.e.h / 2);
      });
      return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, w: x1 - x0, h: y1 - y0, x0, y0, x1, y1 };
    }

    /* 화면 사각형 안에 세계 상자를 넣는 카메라 */
    function fitInto(box, f) {
      const z = Math.min(f.w / box.w, f.h / box.h);
      return {
        x: box.cx - (f.x + f.w / 2 - W / 2) / z,
        y: box.cy - (f.y + f.h / 2 - H / 2) / z,
        z,
      };
    }

    /* --- 별의 세계 좌표 --- */
    function starWorld(a, i) {
      const p = a.shape ? Sky.SHAPES[a.shape].pts[i] : (SCATTER[a.id] || [])[i];
      if (!p) return null;
      return [a.x - a.e.w / 2 + p[0] * a.e.w, a.y - a.e.h / 2 + p[1] * a.e.h];
    }

    /* --- 이름 --- */
    function fullName(a, i) {
      const c = a.cards[i];
      if (!c) return '';
      return a.kind === 'year' || a.kind === 'adrift' ? c.name.ko : c.t;
    }
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
    function signName(a, i) {
      let n = fullName(a, i);
      if (!n) return '';
      n = n.split(/\s+[—–-]\s+/)[0].replace(/\s*\([^)]*\)\s*$/, '').trim();
      const cap = Math.min(W * 0.26, 220);
      if (textWidth(n) <= cap) return n;
      while (n.length > 2 && textWidth(n + '…') > cap) n = n.slice(0, -1);
      return n.trim() + '…';
    }

    function buildButtons() {
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
          label.textContent = signName(a, i);
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
        if (l) l.textContent = signName(b._area, b._index);
      });
    }

    /* --- 이름표 배치 — 바깥으로 뻗되 겹치면 비킨다 --- */
    const GAP = 26, LINE = 19, EDGE = 14;
    function layoutLabels(live) {
      if (!live.length) return;
      let cx = 0; live.forEach((s) => { cx += s.x; }); cx /= live.length;

      const keep = [];
      if (cardEl && cardEl.classList.contains('is-open')) keep.push(cardEl.getBoundingClientRect());
      $$('[data-keepout]').forEach((el) => {
        if (el.offsetParent !== null || getComputedStyle(el).position === 'fixed') keep.push(el.getBoundingClientRect());
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
      const hits = (b, y) => keep.some((k) => b.r > k.left - 10 && b.l < k.right + 10 && y > k.top - 12 && y < k.bottom + 12);
      const cost = (b) => (outside(b) ? 2 : 0) + (hits(b, b.y) ? 1 : 0);

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
        const vis = visibleArea(b._area) && sx > -140 && sx < W + 140 && sy > -80 && sy < H + 80;
        b.hidden = !vis;
        if (!vis) return;
        b.style.transform = `translate(${sx}px, ${sy}px)`;
        live.push({ b, x: sx, y: sy });
      });
      layoutLabels(live);
    }

    /* 시안마다 '지금 보이는 구역'의 뜻이 다르다. 가는 채널 하나, 나·다는 전부. */
    let visibleArea = () => true;

    /* --- 천체 --- */
    function objectFor(a, i) {
      const key = a.id + ':' + i;
      if (!objects[key]) {
        const card = a.kind === 'year' || a.kind === 'adrift' ? a.cards[i] : null;
        objects[key] = {
          stage: card ? card.stage : 'main',
          phase: (i * 1.37) % 6.28, tilt: (i * .73) % 3.14, focus: 0,
          bright: a.kind === 'log',
        };
      }
      return objects[key];
    }

    /* --- 그리기 — 언제나 완성된 한 장 --- */
    function draw() {
      if (!ctx) return false;
      const T = Sky.theme();
      const L = T.mode === 'light';

      const g = ctx.createLinearGradient(W, 0, 0, H);
      g.addColorStop(0, T.sky0); g.addColorStop(.55, T.sky1); g.addColorStop(1, T.sky2);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

      CLOUDS.forEach((c) => {
        const [sx, sy] = toScreen(c.x, c.y);
        const rr = c.rx * cam.z;
        if (sx < -rr * 1.3 || sx > W + rr * 1.3 || sy < -rr * 1.3 || sy > H + rr * 1.3) return;
        ctx.save(); ctx.translate(sx, sy); ctx.rotate(c.rot); ctx.scale(1, .58);
        const rg = ctx.createRadialGradient(rr * .2, -rr * .24, rr * .04, 0, 0, rr);
        const a = c.a * (L ? .92 : 1.25);
        rg.addColorStop(0, rgba(T.neb, a));
        rg.addColorStop(.3, rgba(T.neb, a * .6));
        rg.addColorStop(.62, rgba(T.neb2, a * .24));
        rg.addColorStop(1, rgba(T.neb2, 0));
        ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(0, 0, rr, 0, 7); ctx.fill(); ctx.restore();
      });

      FIELD.forEach((s) => {
        const [sx, sy] = toScreen(s.x, s.y);
        if (sx < -8 || sx > W + 8 || sy < -8 || sy > H + 8) return;
        ctx.globalAlpha = s.a * (L ? .8 : 1);
        ctx.fillStyle = s.gold ? T.gold : T.ink;
        ctx.beginPath(); ctx.arc(sx, sy, s.r * clamp(cam.z * 1.6, .5, 1.6), 0, 7); ctx.fill();
      });
      ctx.globalAlpha = 1;

      let busy = false;
      let intro = 1;
      if (state.intro < 1) {
        const e = Sky.prefersReduced() ? 99 : (performance.now() - state.introAt) / 1000;
        intro = clamp(e / 2.2, 0, 1);
        state.intro = intro;
        busy = intro < 1;
      }

      state.areas.forEach((a, ai) => {
        if (!visibleArea(a)) return;
        const n = a.cards.length;
        if (!n) return;
        const app = clamp(intro * 1.9 - ai * 0.1, 0, 1);
        if (app <= 0) return;

        const pts = [];
        for (let i = 0; i < n; i++) {
          const w = starWorld(a, i);
          pts.push(w ? toScreen(w[0], w[1]) : null);
        }

        /* 선 없는 구역은 성운 자락으로 자리를 잡는다. 흩뿌린 점만 두지 않는다. */
        if (!a.shape) {
          const [hx, hy] = toScreen(a.x, a.y);
          const rx = (a.e.w / 2) * cam.z * 1.06, ry = (a.e.h / 2) * cam.z * 1.06;
          if (rx > 6 && hx > -rx * 1.4 && hx < W + rx * 1.4 && hy > -ry * 1.4 && hy < H + ry * 1.4) {
            ctx.save(); ctx.translate(hx, hy); ctx.scale(1, ry / rx);
            const hg = ctx.createRadialGradient(rx * .18, -rx * .22, rx * .06, 0, 0, rx);
            const ha = (L ? .19 : .26) * app;
            hg.addColorStop(0, rgba(T.neb, ha));
            hg.addColorStop(.46, rgba(T.neb, ha * .5));
            hg.addColorStop(1, rgba(T.neb2, 0));
            ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(0, 0, rx, 0, 7); ctx.fill(); ctx.restore();
          }
        } else {
          const sh = Sky.SHAPES[a.shape];
          const edges = sh.edges.filter(([x, y]) => x < n && y < n);
          ctx.save(); ctx.lineCap = 'round';
          ctx.lineWidth = clamp(1.1 * Math.sqrt(cam.z / (state.baseZ || cam.z)), .8, 1.4);
          edges.forEach(([x, y], i) => {
            if (!pts[x] || !pts[y]) return;
            const linked = a.kind !== 'growth' || (i < CHAIN ? i < state.linked : state.linked >= CHAIN);
            const k = clamp(app * edges.length * 1.2 - i, 0, 1);
            if (k <= 0) return;
            ctx.strokeStyle = linked ? rgba(T.gold, L ? .52 : .60) : rgba(T.ink, L ? .13 : .16);
            ctx.beginPath();
            ctx.moveTo(pts[x][0], pts[x][1]);
            ctx.lineTo(lerp(pts[x][0], pts[y][0], Sky.easeOut(k)), lerp(pts[x][1], pts[y][1], Sky.easeOut(k)));
            ctx.stroke();
          });
          ctx.restore();
        }

        const R = clamp(Math.min(a.e.w, a.e.h) * cam.z * 0.028, 2.6, 13);
        for (let i = 0; i < n; i++) {
          const p = pts[i]; if (!p) continue;
          if (p[0] < -70 || p[0] > W + 70 || p[1] < -70 || p[1] > H + 70) continue;
          const shown = clamp(app * 1.4 - i * 0.05, 0, 1);
          if (shown <= 0) continue;
          const o = objectFor(a, i);
          const on = state.selected && state.selected.area === a.id && state.selected.index === i;
          const target = on ? 1 : 0;
          if (Math.abs(target - o.focus) > 0.01) { o.focus += (target - o.focus) * 0.2; busy = true; } else o.focus = target;
          const rr = R * shown;
          /* 작게 보일 때는 무엇이든 점 하나다. 커져야 그 별의 사정이 보인다. */
          if (rr < 6.5) {
            Sky.star(ctx, p[0], p[1], rr * .32, o.bright ? T.gold : T.ink,
              (L ? .78 : .90), rr * 2.0, (L ? .34 : .14) + o.focus * .16, T);
          }
          else if (o.stage === 'proto' || o.stage === 'stalled') Sky.forms.protostar(ctx, p[0], p[1], rr, T, o, 0, o.focus);
          else if (o.stage === 'remnant') Sky.forms.remnant(ctx, p[0], p[1], rr, T, o, 0, o.focus);
          else if (o.stage === 'drift') Sky.forms.drifted(ctx, p[0], p[1], rr, T, o, 0, o.focus);
          else Sky.forms.mainSequence(ctx, p[0], p[1], rr, T, o, 0, o.focus);
        }
      });

      const S = Math.min(W, H);
      const v = ctx.createRadialGradient(W * .58, H * .40, S * .26, W * .44, H * .58, S * 1.25);
      v.addColorStop(0, rgba(T.vignette, 0));
      v.addColorStop(1, rgba(T.vignette, L ? .40 : .48));
      ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);

      return busy;
    }

    /* --- 루프 — 움직이는 동안과 연출 동안에만 --- */
    let raf = 0;
    let stepHook = null;
    function step() {
      raf = 0;
      const moving = stepHook ? stepHook() : false;
      place();
      const busy = draw();
      if (moving || busy) raf = requestAnimationFrame(step);
    }
    function kick() { if (!raf) raf = requestAnimationFrame(step); }
    function paintNow() { place(); draw(); }

    /* --- 선택 --- */
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
      const now = $('[data-rank-now]'), rail = $('[data-rank-rail]');
      if (now) now.textContent = RANKS[Math.min(state.linked, CHAIN)];
      if (rail) rail.style.setProperty('--rank-progress', ((state.linked / CHAIN) * 100) + '%');
    }
    function closeCard() {
      state.selected = null;
      starBtns.forEach((b) => b.setAttribute('aria-pressed', 'false'));
      if (cardEl) cardEl.classList.remove('is-open');
      paintNow(); kick();
    }
    function renderCard(a, i) {
      const c = a.cards[i];
      if (!cardEl || !c) return;
      cardBody.textContent = '';
      const h = document.createElement('h3');
      h.textContent = fullName(a, i);
      cardBody.appendChild(h);

      const roleText = a.kind === 'growth' ? c.when : a.kind === 'log' ? c.p : (c.role ? c.role.ko : '');
      if (roleText) { const p = document.createElement('p'); p.className = 'card-role'; p.textContent = roleText; cardBody.appendChild(p); }

      const lin = c.key && LINEAGE[c.key];
      if (lin) { const p = document.createElement('p'); p.className = 'card-lineage'; p.textContent = lin.ko; cardBody.appendChild(p); }

      const body = a.kind === 'growth' || a.kind === 'log' ? c.f : ((c.reason && c.reason.ko) || (c.desc && c.desc.ko));
      if (body) { const p = document.createElement('p'); p.textContent = body; cardBody.appendChild(p); }

      if (c.tech && c.tech.length) {
        const ul = document.createElement('ul'); ul.className = 'card-tech';
        c.tech.slice(0, 6).forEach((t) => { const li = document.createElement('li'); li.textContent = t.ko; ul.appendChild(li); });
        cardBody.appendChild(ul);
      }
      if (c.detail) {
        const link2 = document.createElement('a');
        link2.className = 'card-go';
        link2.href = 'https://pachir1su.github.io/' + c.detail;
        link2.target = '_blank'; link2.rel = 'noopener';
        link2.textContent = '상세 보기 →';
        link2.addEventListener('click', () => sound.play('enter'));
        cardBody.appendChild(link2);
      }
      cardEl.classList.add('is-open');
      place();
    }

    /* --- 소리 — #114에 확정으로 기록된 세 자리만 --- */
    const CUES = {
      year: 'sfx-04-year-a-wood.wav',
      select: 'sfx-05-select-a-bell.wav',
      enter: 'sfx-06-enter-b-three-notes.wav',
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

    return {
      get cam() { return cam; },
      get W() { return W; },
      get H() { return H; },
      get areas() { return state.areas; },
      get state() { return state; },
      sound,
      measure, build, applyLayout, columnZoom, worldBox, fitInto, extent,
      place, draw, paintNow, kick, closeCard, relabel, initMute,
      setStepHook(fn) { stepHook = fn; },
      setVisibleArea(fn) { visibleArea = fn; },
      startIntro() { state.intro = 0; state.introAt = performance.now(); },
      onCardClose(fn) {
        /* 카드 안에서 찾는다. 한 문서에 무대가 둘 이상 있어도 서로 닫히지 않게. */
        const b = cardEl && $('[data-card-close]', cardEl);
        if (b) b.addEventListener('click', () => { closeCard(); if (fn) fn(); });
      },
    };
  }

  window.V3Move = { load, Stage, AREA_DEFS, LAYOUTS, GROWTH, AWARDS, RANKS, extent, at };
})();
