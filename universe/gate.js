/* =====================================================================
   v3 우주 진입점 (universe/gate.js)

   v2 홈에 뚫린 찢긴 종이 구멍 하나. 이 구멍이 v2와 v3을 잇는 유일한 길이다.

   운영 index.html이 로드하는 유일한 v3 스크립트이므로 **홀로 선다.**
   sky.js · universe.js를 끌어오지 않는다. 홈 첫 화면이 우주 엔진 전체
   (90KB)를 받게 되면 성능 감사(#113)가 지적한 자리로 되돌아간다.
   그래서 캔버스 보조 함수 몇 개만 여기 다시 둔다.

   확정 사항 (#114 2026-08-21)
   - 이름표 · 안내 문구 · confirm 확인창을 두지 않는다.
   - 새로고침 · 재진입마다 자산 · 위치 · 크기 · 기울기가 달라진다.
   - 별과 먼지는 찢긴 경계 밖으로도 새어 나온다.
   - 누르면 약 4초 동안 별가루가 구멍으로 빨려 들어가고 성운 막이 열린다.
   - v2로 돌아온 뒤에도 진입점은 다시 살아 있어야 한다.

   이 스크립트가 실패해도 v2는 그대로 동작해야 한다. 전체를 try로 감싼다.
   ===================================================================== */
(() => {
  'use strict';

  const HERE = new URL('.', (document.currentScript && document.currentScript.src) || window.location.href);
  const at = (rel) => new URL(rel, HERE).href;

  /* 찢김 마스크. 원본 RGBA 사진에서 알파만 뽑아 회색조+알파로 다시 쓴 것이라
     한 장이 25~43KB다(tools/build-gateway-masks.js). ratio는 원본 비율이며,
     이 값으로 높이를 정해야 자산이 눌리지 않는다. */
  const TEARS = [
    { src: 'assets/gateway/tear-wide.png', ratio: 1.4988 },
    { src: 'assets/gateway/tear-diagonal.png', ratio: 0.6672 },
    { src: 'assets/gateway/tear-trail.png', ratio: 1.4988 },
  ];

  /* 상세 진입과 같은 자리에 쓰는 확정 음원 — SFX-06 B (#114). */
  const ENTER_SFX = 'assets/audio/sfx-06-enter-b-three-notes.wav';

  /* 목적지는 진입점을 놓은 쪽이 정한다.
     운영 홈은 기본값 /universe/ 를 쓰고, 시안 페이지는 data-gate-to 로 자기 목적지를 준다. */
  const DEFAULT_TARGET = at('./');
  const targetOf = (gate) => {
    const host = gate.closest('[data-gate-host]');
    const to = host && host.dataset.gateTo;
    return to ? new URL(to, window.location.href).href : DEFAULT_TARGET;
  };

  /* 구멍 안은 페이지가 라이트여도 언제나 밤이다. */
  const NIGHT = {
    sky0: '#141926', sky1: '#0f131b', sky2: '#090c12',
    neb: '#6d648f', glow: '#cfd3e4', gold: '#c9b477',
  };

  const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const easeOut = (k) => 1 - Math.pow(1 - clamp(k, 0, 1), 3);
  const lerp = (a, b, k) => a + (b - a) * k;
  const rng = (seed) => { let s = seed >>> 0; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; };

  function fit(canvas, cssW, cssH) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(cssW * dpr));
    canvas.height = Math.max(1, Math.round(cssH * dpr));
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return ctx;
  }

  function scratch(w, h) {
    const c = document.createElement('canvas');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = Math.max(1, Math.round(w * dpr));
    c.height = Math.max(1, Math.round(h * dpr));
    const ctx = c.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { canvas: c, ctx };
  }

  /* 별 하나 — 점과 옅은 무리. 밤 안에서만 쓰므로 팔레트가 고정이다. */
  function star(ctx, x, y, r, color, alpha, haloR) {
    if (haloR > 0) {
      const g = ctx.createRadialGradient(x, y, 0, x, y, haloR);
      g.addColorStop(0, `rgba(207,211,228,${0.18 * alpha})`);
      g.addColorStop(1, 'rgba(207,211,228,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, haloR, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    ctx.globalAlpha = 1;
  }

  function nebulaBlob(ctx, cx, cy, rx, ry, rot, color, alpha) {
    ctx.save();
    ctx.translate(cx, cy); ctx.rotate(rot); ctx.scale(1, ry / rx);
    const g = ctx.createRadialGradient(rx * 0.19, -rx * 0.24, rx * 0.04, 0, 0, rx);
    g.addColorStop(0, `rgba(109,100,143,${alpha})`);
    g.addColorStop(0.42, `rgba(109,100,143,${alpha * 0.42})`);
    g.addColorStop(1, 'rgba(109,100,143,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, rx, 0, 7); ctx.fill();
    ctx.restore();
  }

  /* ------------------------------------------------------------------
     진입점 하나
     ------------------------------------------------------------------ */
  function mount(host) {
    const lang = (() => { try { return localStorage.getItem('lang') || 'ko'; } catch (_) { return 'ko'; } })();

    const gate = document.createElement('button');
    gate.type = 'button';
    gate.className = 'v3-gate';
    gate.dataset.entering = 'false';
    /* 화면에 이름표를 두지 않는다. 목적지는 스크린리더에만 말한다. */
    gate.setAttribute('aria-label', lang === 'en' ? 'Open the constellation space' : '별자리 공간 열기');

    const canvas = document.createElement('canvas');
    gate.appendChild(canvas);
    host.appendChild(gate);

    let shot = null;
    let mask = null;

    /* v2의 등장 연출은 요소에 transform을 걸어 둔다. getBoundingClientRect로 재면
       아직 제자리가 아닌 사각형을 피하게 되고, 구멍이 결국 글 위에 앉는다.
       그래서 transform이 섞이지 않는 레이아웃 상자로 잰다. */
    function layoutRect(el) {
      let x = 0, y = 0, n = el;
      while (n) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
      const l = x - window.scrollX, t = y - window.scrollY;
      return { left: l, top: t, right: l + el.offsetWidth, bottom: t + el.offsetHeight };
    }

    /* 블록 요소의 상자는 한 단을 통째로 차지한다. 그 상자를 그대로 피하면
       좁은 화면에서는 비어 있는 자리가 하나도 남지 않는다. 그래서 글이 실제로
       놓인 줄만 잰다. 줄 사각형은 transform이 섞이므로 레이아웃 상자와의
       차이만큼 되돌려 놓는다. */
    function inkRects(el) {
      const lay = layoutRect(el);
      let rects = [];
      try {
        const rg = document.createRange();
        rg.selectNodeContents(el);
        rects = Array.prototype.slice.call(rg.getClientRects());
      } catch (_) { rects = []; }
      if (!rects.length) return [lay];
      const box = el.getBoundingClientRect();
      const dx = lay.left - box.left, dy = lay.top - box.top;
      return rects
        .filter((r) => r.width > 0 && r.height > 0)
        .map((r) => ({ left: r.left + dx, top: r.top + dy, right: r.right + dx, bottom: r.bottom + dy }));
    }

    /* --- 매번 달라지는 값 --- */
    function reroll() {
      const rect = host.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      const wide = rect.width > 780;
      const tear = TEARS[(Math.random() * TEARS.length) | 0];
      /* 크기는 매번 달라지되 히어로를 덮지 않는 범위 안에서만 움직인다. */
      const spread = 0.82 + Math.random() * 0.34;
      let w = Math.round(Math.min(rect.width * (wide ? 0.26 : 0.44) * spread, wide ? 300 : 226));
      let h = Math.round(w / tear.ratio);
      const hCap = rect.height * (wide ? 0.52 : 0.34);
      if (h > hCap) { h = Math.round(hCap); w = Math.round(h * tear.ratio); }
      const rot = (Math.random() * 13 - 6.5).toFixed(2);

      shot = { w, h, tear, seed: (Math.random() * 1e6) | 0 };
      gate.style.width = w + 'px';
      gate.style.height = h + 'px';
      gate.style.setProperty('--gate-rot', rot + 'deg');

      /* 자리 — 후보를 순서대로 놓아 보고, 렌더된 v2 요소와 실제 사각형으로
         겹치는지 검사한다. 좌표를 미리 못 박으면 폭이 바뀔 때마다 다시 겹친다. */
      const avoid = Array.from(document.querySelectorAll(
        '.hero-btns, .hero-stats, .hero-name, .hero-role, .hero-desc, .hero-tag, .scroll-hint, .nav, header'
      /* 넓은 화면에는 여백이 있으므로 요소 상자를 통째로 피한다.
         좁은 화면은 한 단뿐이라 상자를 그대로 피하면 남는 자리가 없다.
         그때만 글이 실제로 놓인 줄을 재서 옆의 빈 자리를 쓴다. */
      )).reduce((acc, el) => acc.concat(wide ? [layoutRect(el)] : inkRects(el)), [])
        .filter((r) => r.right > r.left && r.bottom > r.top);

      const spots = wide
        ? [[0.78, 0.30], [0.82, 0.66], [0.70, 0.16], [0.66, 0.82], [0.88, 0.46]]
        : [[0.79, 0.19], [0.21, 0.86], [0.79, 0.86], [0.21, 0.17], [0.50, 0.93]];

      /* 겹치는 넓이를 재서 가장 적게 겹치는 자리를 고른다.
         전부 걸리면 구멍을 줄여서 다시 찾는다 — v2의 글 위에 앉느니 작은 편이 낫다. */
      let chosen = spots[0];
      let bestCost = Infinity;
      for (let pass = 0; pass < 6; pass++) {
        chosen = spots[0]; bestCost = Infinity;
        for (const [nx, ny] of spots) {
          const left = rect.left + rect.width * nx - w / 2;
          const top = rect.top + rect.height * ny - h / 2;
          const box = { left, top, right: left + w, bottom: top + h };

          let cost = 0;
          for (const r of avoid) {
            const ox = Math.min(box.right, r.right + 12) - Math.max(box.left, r.left - 12);
            const oy = Math.min(box.bottom, r.bottom + 12) - Math.max(box.top, r.top - 12);
            if (ox > 0 && oy > 0) cost += ox * oy;
          }
          /* 히어로 밖으로 잘리는 것은 겹침보다 나쁘다. overflow:hidden에 잘린 구멍은
             찢김이 아니라 잘못 놓인 상자로 보인다. */
          const outX = Math.max(0, rect.left + 4 - box.left) + Math.max(0, box.right - (rect.right - 4));
          const outY = Math.max(0, rect.top + 4 - box.top) + Math.max(0, box.bottom - (rect.bottom - 4));
          cost += (outX + outY) * Math.max(w, h) * 12;

          if (cost < bestCost) { bestCost = cost; chosen = [nx, ny]; }
          if (cost === 0) break;
        }
        if (bestCost === 0 || w < 92) break;
        w = Math.round(w * 0.82); h = Math.round(h * 0.82);
      }

      shot.w = w; shot.h = h;
      gate.style.width = w + 'px';
      gate.style.height = h + 'px';
      gate.style.left = `calc(${(chosen[0] * 100).toFixed(2)}% - ${w / 2}px)`;
      gate.style.top = `calc(${(chosen[1] * 100).toFixed(2)}% - ${h / 2}px)`;

      loadMask(tear.src);
    }

    function loadMask(src) {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => { mask = img; paint(); };
      /* 마스크를 못 읽으면 사각형 창이 되지 않도록 아예 접는다.
         v2 히어로에 정체 모를 검은 상자를 남기는 것보다 없는 편이 낫다. */
      img.onerror = () => { gate.remove(); };
      img.src = at(src);
    }

    /* --- 렌더 --- */
    function paint() {
      if (!shot || !mask) return;
      const { w, h } = shot;
      const ctx = fit(canvas, w, h);
      ctx.clearRect(0, 0, w, h);

      /* 1. 종이 두께 — 찢긴 면 아래로 지는 그림자.
            마스크를 살짝 밀어 어둡게 깔면 구멍이 종이보다 아래로 읽힌다. */
      ctx.save();
      ctx.globalAlpha = 0.26;
      if ('filter' in ctx) ctx.filter = 'blur(3px)';
      ctx.drawImage(mask, 1.5, 3.5, w, h);
      ctx.restore();

      /* 2. 구멍 안의 밤 — 마스크 모양 안에만 그린다. */
      const inside = scratch(w, h);
      const ic = inside.ctx;
      ic.drawImage(mask, 0, 0, w, h);
      ic.globalCompositeOperation = 'source-atop';

      const sky = ic.createLinearGradient(w, 0, 0, h);
      sky.addColorStop(0, NIGHT.sky0);
      sky.addColorStop(0.55, NIGHT.sky1);
      sky.addColorStop(1, NIGHT.sky2);
      ic.fillStyle = sky;
      ic.fillRect(0, 0, w, h);
      nebulaBlob(ic, w * 0.72, h * 0.3, Math.max(w, h) * 0.62, Math.max(w, h) * 0.4, -0.42, NIGHT.neb, 0.44);
      nebulaBlob(ic, w * 0.3, h * 0.72, Math.max(w, h) * 0.44, Math.max(w, h) * 0.3, 0.5, NIGHT.neb, 0.24);

      const r = rng(shot.seed);
      const count = Math.round(clamp((w * h) / 900, 26, 70));
      for (let i = 0; i < count; i++) {
        const m = r();
        star(ic, r() * w, r() * h, 0.5 + m * 1.1, m > 0.9 ? NIGHT.gold : NIGHT.glow,
          0.32 + m * 0.5, m > 0.7 ? 3 + m * 4 : 0);
      }
      ctx.drawImage(inside.canvas, 0, 0, w, h);

      /* 3. 찢긴 섬유 — 마스크에서 살짝 줄인 마스크를 빼면 가장자리 띠만 남는다.
            그 띠에 종이 빛을 올리면 찢어진 결이 선다. */
      const rim = scratch(w, h);
      const rc = rim.ctx;
      rc.drawImage(mask, 0, 0, w, h);
      rc.globalCompositeOperation = 'destination-out';
      const k = 0.982;
      rc.drawImage(mask, (w * (1 - k)) / 2, (h * (1 - k)) / 2, w * k, h * k);
      rc.globalCompositeOperation = 'source-in';
      const rimFill = rc.createLinearGradient(0, 0, w, h);
      rimFill.addColorStop(0, 'rgba(255,250,236,.62)');
      rimFill.addColorStop(1, 'rgba(226,214,186,.30)');
      rc.fillStyle = rimFill;
      rc.fillRect(0, 0, w, h);
      ctx.drawImage(rim.canvas, 0, 0, w, h);

      /* 4. 경계 밖 — 별과 먼지가 찢긴 면 바깥에도 남는다.
            구멍 안에만 갇히면 '위젯'으로 읽힌다. */
      const r2 = rng(shot.seed + 977);
      for (let i = 0; i < 16; i++) {
        const x = r2() * w, y = r2() * h;
        const edge = x < w * 0.16 || x > w * 0.84 || y < h * 0.16 || y > h * 0.84;
        if (!edge) continue;
        star(ctx, x, y, 0.6 + r2() * 0.9, NIGHT.gold, 0.3 + r2() * 0.34, 4);
      }
    }

    /* --- 소리 — 확정된 SFX-06 B 하나. 조작 이후에만 난다. --- */
    let audio = null;
    function chime() {
      try {
        if (!audio) { audio = new Audio(at(ENTER_SFX)); audio.volume = 0.5; }
        audio.currentTime = 0;
        const p = audio.play();
        if (p && p.catch) p.catch(() => {});
      } catch (_) { /* 소리가 막혀도 이동은 계속된다 */ }
    }

    gate.addEventListener('click', () => {
      if (gate.dataset.entering === 'true') return;
      gate.dataset.entering = 'true';
      chime();
      openDoor(gate);
    });

    reroll();
    /* 웹폰트가 늦게 오면 히어로의 글 높이가 바뀐다. 그때 자리를 한 번 더 고른다. */
    if (document.fonts && document.fonts.ready && document.fonts.ready.then) {
      document.fonts.ready.then(() => { if (gate.dataset.entering !== 'true') reroll(); });
    }

    let timer = 0;
    window.addEventListener('resize', () => { clearTimeout(timer); timer = setTimeout(reroll, 180); }, { passive: true });

    /* v3에서 뒤로 돌아왔을 때 진입점이 죽어 있으면 안 된다.
       bfcache 복원은 load를 다시 쏘지 않으므로 pageshow로 되살린다. */
    function revive() {
      gate.dataset.entering = 'false';
      const veil = document.querySelector('.gate-veil');
      if (veil) veil.remove();
      reroll();
    }
    window.addEventListener('pageshow', (e) => { if (e.persisted) revive(); });
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && gate.dataset.entering === 'true') revive();
    });
  }

  /* ------------------------------------------------------------------
     문이 열린다 — 약 4초. 종이 밖 별가루가 구멍으로 빨려 들어가고
     성운 막이 그 자리에서 화면 전체로 번진다.
     ------------------------------------------------------------------ */
  function openDoor(gate) {
    const TARGET = targetOf(gate);
    const rect = gate.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    const veil = document.createElement('div');
    veil.className = 'gate-veil';
    document.body.appendChild(veil);

    if (reduced()) {
      veil.style.background = NIGHT.sky1;
      requestAnimationFrame(() => veil.classList.add('is-open'));
      setTimeout(() => { window.location.href = TARGET; }, 360);
      return;
    }

    const canvas = document.createElement('canvas');
    veil.appendChild(canvas);
    const ctx = fit(canvas, window.innerWidth, window.innerHeight);
    requestAnimationFrame(() => veil.classList.add('is-open'));

    const W = window.innerWidth, H = window.innerHeight;
    const reach = Math.hypot(W, H);
    const r = rng(7);
    const motes = Array.from({ length: 140 }, () => {
      const a = r() * Math.PI * 2;
      const d = (0.28 + r() * 1.0) * reach * 0.62;
      return { a, d0: d, size: 0.6 + r() * 1.5, gold: r() > 0.74, speed: 0.62 + r() * 0.8 };
    });

    const started = performance.now();
    const DURATION = 4000;
    let done = false;

    function frame() {
      const k = clamp((performance.now() - started) / DURATION, 0, 1);
      ctx.clearRect(0, 0, W, H);

      /* 성운 막이 구멍에서부터 열린다. */
      const radius = Math.max(1, easeOut(k) * reach * 1.08);
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      g.addColorStop(0, 'rgba(9,12,18,1)');
      g.addColorStop(0.62, 'rgba(15,19,27,.97)');
      g.addColorStop(1, 'rgba(15,19,27,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(cx, cy, radius, 0, 7); ctx.fill();

      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, radius, 0, 7); ctx.clip();
      nebulaBlob(ctx, cx + W * 0.16, cy - H * 0.18, W * 0.56, H * 0.4, -0.42, NIGHT.neb, 0.34 * k);
      ctx.restore();

      /* 별가루가 안으로 빨려 들어간다. */
      motes.forEach((m) => {
        const d = m.d0 * (1 - easeOut(k) * m.speed);
        if (d < 2) return;
        star(ctx, cx + Math.cos(m.a) * d, cy + Math.sin(m.a) * d,
          m.size, m.gold ? NIGHT.gold : NIGHT.glow, 0.2 + k * 0.6, m.size * 4);
      });

      if (k < 1) requestAnimationFrame(frame);
      else if (!done) { done = true; window.location.href = TARGET; }
    }
    requestAnimationFrame(frame);

    /* 탭을 떠났다가 돌아오면 rAF가 멈춰 있는 동안 시간이 흐른다.
       그 경우 연출을 기다리지 않고 바로 넘긴다. */
    setTimeout(() => { if (!done) { done = true; window.location.href = TARGET; } }, DURATION + 1200);
  }

  function boot() {
    try {
      const hosts = document.querySelectorAll('[data-gate-host]');
      hosts.forEach(mount);
    } catch (err) {
      /* 진입점이 실패해도 v2는 그대로 동작해야 한다. */
      console.error('[v3 gate]', err);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
