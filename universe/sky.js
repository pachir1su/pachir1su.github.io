/* =====================================================================
   v3 우주 — 렌더 엔진 (sky.js)

   #114에서 확정된 시각 언어를 코드로 옮긴 것이다.
   - 성운은 균일하게 깔지 않는다. 화면 밖 오른쪽 위에 광원이 하나 있고
     모든 덩어리가 그 빛을 받는다. 어두운 먼지 띠가 성운을 가로지른다.
   - 별은 세 계층이다. 먼 먼지 / 일반 별(순수한 점) / 별자리 별(옅은 달무리).
   - 별자리 선은 낡은 금빛 실선 하나만 쓴다.
   - 진행 중과 실패는 글자가 아니라 천체의 생애로 표현한다.

   이 파일은 그리기만 한다. 무엇을 그릴지는 universe.js가 정한다.
   ===================================================================== */
(() => {
  'use strict';

  /* ------------------------------------------------------------------
     팔레트 — 프레임마다 고정으로 쓰므로 CSS 변수를 매번 읽지 않는다.
     라이트는 인쇄된 성도(흰 종이 위의 어두운 별),
     다크는 밤하늘이다. 역할이 반전될 뿐 좌표는 같다.
     ------------------------------------------------------------------ */
  const PALETTE = {
    light: {
      mode: 'light',
      sky0: '#f2f3f8', sky1: '#e4e7f0', sky2: '#c9cfe1',
      neb: '#6a6390', neb2: '#8d86ab', lane: '#b9bccd',
      ink: '#242636', gold: '#8f7736', glow: '#ffffff', vignette: '#aeb6cc',
    },
    dark: {
      mode: 'dark',
      sky0: '#12161f', sky1: '#0f131b', sky2: '#0b0e15',
      neb: '#4a4468', neb2: '#6d648f', lane: '#080b11',
      ink: '#e6e9f1', gold: '#c9b477', glow: '#cfd3e4', vignette: '#05070c',
    },
  };

  /* 화면 밖 오른쪽 위 광원. 성운 덩어리는 전부 이 방향으로 밝아진다. */
  const LIGHT_DIR = [0.62, -0.78];

  const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  const theme = () => (darkQuery.matches ? PALETTE.dark : PALETTE.light);
  const prefersReduced = () => motionQuery.matches;

  /* ------------------------------------------------------------------
     별자리 원형. 실제 하늘의 형태를 화면 비율에 맞게 단순화한 값이다.
     연도마다 서로 다른 별자리를 쓴다 — 2024와 2025가 같은 모양으로
     보이던 문제(#114 2026-08-21)를 형태 자체로 없앤다.
     좌표는 0~1 정규화이고, 별의 개수가 맞지 않으면 universe.js가
     앞에서부터 필요한 만큼만 쓰거나 남은 별을 궤도로 이어 붙인다.
     ------------------------------------------------------------------ */
  /* 좌표는 **자기 bounding box를 꽉 채우도록** 정규화되어 있고, 실제 하늘에서의
     종횡비를 ratio로 따로 가진다. 그리기는 fitBox()가 ratio를 지켜 letterbox 한다.
     1차 구현은 x와 y를 상자 폭·높이에 각각 곱해서 별자리를 기기마다 1.66~3.04배씩
     다르게 늘였다. ratio를 데이터에 두는 것이 그 결함군의 근본 수정이다. */
  const SHAPES = {
    /* 북두칠성 — 진입 연출 50:50 중 하나이자 성장 사건 7개의 성도 */
    dipper: {
      name: { ko: '북두칠성', en: 'Big Dipper' }, ratio: 2.30,
      pts: [[0, .659], [.182, .448], [.350, .606], [.518, .369], [.766, 0], [1, .502], [.723, 1]],
      edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 3]],
      bright: [4, 5],
    },
    /* 전갈자리 — 진입 연출 50:50 중 나머지. 머리 셋이 안타레스로 모이고
       꼬리가 오른쪽 아래에서 갈고리처럼 말려 올라간다. */
    scorpius: {
      name: { ko: '전갈자리', en: 'Scorpius' }, ratio: 0.67,
      pts: [[.027, .125], [0, .349], [.128, 0], [.181, .266], [.309, .465], [.416, .648],
            [.537, .806], [.678, .930], [.819, 1], [.946, .930], [1, .748]],
      edges: [[0, 3], [1, 3], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 10]],
      bright: [3, 8],
    },
    /* 오리온자리 — 2026. 어깨 둘 · 머리 · 삼태성 · 검 · 발 둘로 아홉 점이다. */
    orion: {
      name: { ko: '오리온자리', en: 'Orion' }, ratio: 0.62,
      pts: [[.451, 0], [0, .191], [.912, .165], [.209, .540], [.462, .572],
            [.714, .601], [.411, .759], [.110, .991], [1, 1]],
      edges: [[0, 1], [0, 2], [1, 3], [2, 5], [3, 4], [4, 5], [4, 6], [3, 7], [5, 8]],
      bright: [1, 8],
    },
    /* 카시오페이아 — 2025. 다섯 점이 그리는 W. */
    cassiopeia: {
      name: { ko: '카시오페이아자리', en: 'Cassiopeia' }, ratio: 2.20,
      pts: [[0, 1], [.258, .103], [.503, .910], [.761, 0], [1, .808]],
      edges: [[0, 1], [1, 2], [2, 3], [3, 4]],
      bright: [1, 3],
    },
    /* 백조자리 — 2024. 북십자. 데네브에서 알비레오까지 세로축에 양 날개가 뻗는다. */
    cygnus: {
      name: { ko: '백조자리', en: 'Cygnus' }, ratio: 1.55,
      pts: [[.500, 0], [.500, .412], [0, .339], [1, .291], [.500, .679], [.500, 1]],
      edges: [[0, 1], [1, 2], [1, 3], [1, 4], [4, 5]],
      bright: [0, 5],
    },
    /* 뱀주인자리 — 황도를 지나지만 12궁에서 빠진 열세 번째. 이스터에그로만 쓴다. */
    ophiuchus: {
      name: { ko: '뱀주인자리', en: 'Ophiuchus' }, ratio: 0.93,
      pts: [[.512, 0], [.110, .238], [.915, .226], [0, .537], [1, .518],
            [.256, .780], [.768, .774], [.512, 1]],
      edges: [[0, 1], [0, 2], [1, 3], [2, 4], [3, 5], [4, 6], [5, 7], [6, 7], [1, 2]],
      bright: [0],
    },
  };

  /* ------------------------------------------------------------------
     유틸
     ------------------------------------------------------------------ */
  const rng = (seed) => { let s = seed >>> 0; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; };
  const lerp = (a, b, k) => a + (b - a) * k;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const easeOut = (k) => 1 - Math.pow(1 - clamp(k, 0, 1), 3);

  const rgba = (hex, a) => {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  };

  /* 필름 입자는 256px 타일 하나를 만들어 패턴으로 재사용한다. */
  let noiseTile = null;
  function noise() {
    if (noiseTile) return noiseTile;
    noiseTile = document.createElement('canvas');
    noiseTile.width = noiseTile.height = 256;
    const nc = noiseTile.getContext('2d');
    const img = nc.createImageData(256, 256), d = img.data, r = rng(4242);
    for (let i = 0; i < d.length; i += 4) { const v = (r() * 255) | 0; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
    nc.putImageData(img, 0, 0);
    return noiseTile;
  }

  /* 별자리를 상자 안에 넣되 **종횡비를 지킨다.** 남는 쪽에 여백이 생길 뿐
     좌표가 늘어나지 않는다. 이 함수를 거치지 않고 별자리를 그리지 않는다. */
  function fitBox(w, h, ratio, inset) {
    const pad = inset == null ? 0.08 : inset;
    const availW = w * (1 - pad * 2);
    const availH = h * (1 - pad * 2);
    let bw = availW, bh = bw / ratio;
    if (bh > availH) { bh = availH; bw = bh * ratio; }
    return { x: (w - bw) / 2, y: (h - bh) / 2, w: bw, h: bh };
  }

  /* 정규화 좌표를 실제 픽셀로 편다. 별자리는 항상 이 경로로만 배치된다. */
  function placeShape(shape, w, h, inset) {
    const box = fitBox(w, h, shape.ratio, inset);
    return shape.pts.map(([x, y]) => [box.x + x * box.w, box.y + y * box.h]);
  }

  /* 캔버스를 CSS 크기에 맞춰 잡는다. dpr은 2로 잘라 저사양 기기에서
     성운 한 장을 다시 그리는 비용이 폭발하지 않게 한다. */
  function sizeCanvas(canvas) {
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const c = canvas.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx: c, w, h, dpr };
  }

  /* ------------------------------------------------------------------
     배경 레이어
     ------------------------------------------------------------------ */

  /* 한 방향에서 빛을 받는 성운 덩어리. 코어를 광원 쪽으로 밀어 입체를 만든다. */
  function volume(c, cx, cy, rx, ry, rot, col, alpha) {
    c.save();
    c.translate(cx, cy); c.rotate(rot); c.scale(1, ry / rx);
    const ox = LIGHT_DIR[0] * rx * .30, oy = LIGHT_DIR[1] * rx * .30;
    const g = c.createRadialGradient(ox, oy, rx * .04, 0, 0, rx);
    g.addColorStop(0, rgba(col, alpha));
    g.addColorStop(.30, rgba(col, alpha * .62));
    g.addColorStop(.62, rgba(col, alpha * .24));
    g.addColorStop(.86, rgba(col, alpha * .06));
    g.addColorStop(1, rgba(col, 0));
    c.fillStyle = g;
    c.beginPath(); c.arc(0, 0, rx, 0, 7); c.fill();
    c.restore();
  }

  /* 곡선을 여러 겹으로 부드럽게 긋는다. 어두운 먼지 띠와 밝은 결에 함께 쓴다. */
  function softCurve(c, p, width, col, alpha, passes) {
    c.save();
    c.lineCap = 'round'; c.lineJoin = 'round';
    c.strokeStyle = rgba(col, alpha / passes);
    for (let i = passes; i >= 1; i--) {
      c.lineWidth = width * (i / passes);
      c.beginPath();
      c.moveTo(p[0], p[1]);
      c.bezierCurveTo(p[2], p[3], p[4], p[5], p[6], p[7]);
      c.stroke();
    }
    c.restore();
  }

  /* 별 하나. 라이트 모드에서는 어두운 점 둘레에 밝은 무리를 둘러
     '종이에 뚫린 구멍'처럼 읽히게 한다. 흰 배경에 어두운 점만 찍으면 먼지로 보인다. */
  function star(c, x, y, r, col, alpha, haloR, haloA, T) {
    if (haloR > 0) {
      const hc = T.mode === 'light' ? T.glow : col;
      const g = c.createRadialGradient(x, y, 0, x, y, haloR);
      g.addColorStop(0, rgba(hc, haloA));
      g.addColorStop(.45, rgba(hc, haloA * .38));
      g.addColorStop(1, rgba(hc, 0));
      c.fillStyle = g;
      c.beginPath(); c.arc(x, y, haloR, 0, 7); c.fill();
    }
    c.globalAlpha = alpha; c.fillStyle = col;
    c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
    c.globalAlpha = 1;
  }

  /* 성운 하늘 한 장. 움직이지 않으므로 크기가 바뀔 때만 다시 그린다.
     seed를 바꾸면 같은 문법 안에서 다른 하늘이 나온다 — 장면마다
     같은 별 배치를 반복해 '복사한 배경'으로 읽히는 것을 막는다. */
  function paintSky(c, w, h, T, opts) {
    const o = opts || {};
    const seed = o.seed || 1;
    const S = Math.min(w, h);
    const L = T.mode === 'light';
    const density = o.density || 1;

    const base = c.createLinearGradient(w, 0, 0, h);
    base.addColorStop(0, T.sky0); base.addColorStop(.52, T.sky1); base.addColorStop(1, T.sky2);
    c.fillStyle = base; c.fillRect(0, 0, w, h);

    volume(c, w * .70, h * .30, S * .78, S * .46, -0.42, T.neb, (L ? .17 : .50) * density);
    volume(c, w * .52, h * .52, S * .58, S * .40, 0.30, T.neb2, (L ? .11 : .30) * density);
    volume(c, w * .86, h * .12, S * .34, S * .26, -0.15, T.neb2, (L ? .13 : .38) * density);
    volume(c, w * .22, h * .74, S * .46, S * .28, 0.52, T.neb, (L ? .07 : .22) * density);

    softCurve(c, [w * .34, h * .12, w * .58, h * .30, w * .74, h * .30, w * 1.02, h * .52],
      S * .16, T.lane, L ? .16 : .40, 5);
    softCurve(c, [w * .46, h * .96, w * .62, h * .74, w * .84, h * .70, w * 1.04, h * .80],
      S * .10, T.lane, L ? .10 : .26, 5);
    softCurve(c, [w * .58, h * .06, w * .72, h * .16, w * .80, h * .28, w * .96, h * .34],
      S * .012, L ? T.neb : T.glow, L ? .055 : .075, 3);

    /* 1계층 · 먼 먼지 — 거의 안 보이지만 표면의 재질을 만든다. */
    const rf = rng(101 + seed);
    const dust = Math.round(340 * Math.min(1.6, (w * h) / (1280 * 720)));
    for (let i = 0; i < dust; i++) {
      const m = rf();
      c.globalAlpha = (L ? .10 : .16) * (.25 + m * .75);
      c.fillStyle = T.ink;
      c.beginPath(); c.arc(rf() * w, rf() * h, .35 + m * .45, 0, 7); c.fill();
    }
    c.globalAlpha = 1;

    /* 2계층 · 일반 별 — 순수한 점만 쓴다. 아주 드물게 금빛이 섞인다. */
    const rs = rng(77 + seed * 13);
    const count = Math.round(72 * Math.min(1.6, (w * h) / (1280 * 720)));
    for (let i = 0; i < count; i++) {
      const x = rs() * w, y = rs() * h * .96, m = rs();
      star(c, x, y, .55 + m * 1.15, m > .93 ? T.gold : T.ink,
        (L ? .26 : .34) + m * .40, m > .7 ? 2 + m * 3 : 0, L ? .30 : .10, T);
    }

    /* 비네트 — 광원 반대쪽 모서리를 눌러 시선을 가운데로 모은다. */
    const v = c.createRadialGradient(w * .62, h * .34, S * .18, w * .40, h * .60, S * 1.18);
    v.addColorStop(0, rgba(T.vignette, 0));
    v.addColorStop(1, rgba(T.vignette, L ? .30 : .58));
    c.fillStyle = v; c.fillRect(0, 0, w, h);

    c.save();
    c.globalAlpha = L ? .028 : .036;
    c.globalCompositeOperation = 'overlay';
    c.fillStyle = c.createPattern(noise(), 'repeat');
    c.fillRect(0, 0, w, h);
    c.restore();
  }

  /* ------------------------------------------------------------------
     3계층 · 별자리 별과 선. 상호작용하는 층이라 매 프레임 다시 그린다.
     progress는 0~1이고 선이 그어지는 진행이다.
     ------------------------------------------------------------------ */
  function constellation(c, pts, edges, T, opts) {
    const o = opts || {};
    const S = o.scale || Math.min(c.canvas.width, c.canvas.height);
    const L = T.mode === 'light';
    const progress = o.progress == null ? 1 : o.progress;
    const total = edges.length;

    c.save();
    c.lineCap = 'round';
    c.strokeStyle = rgba(T.gold, (L ? .52 : .60) * (o.lineAlpha == null ? 1 : o.lineAlpha));
    c.lineWidth = o.lineWidth || 1.1;
    edges.forEach(([a, z], i) => {
      const k = clamp(progress * total - i, 0, 1);
      if (k <= 0) return;
      const [ax, ay] = pts[a], [zx, zy] = pts[z];
      c.beginPath();
      c.moveTo(ax, ay);
      c.lineTo(lerp(ax, zx, easeOut(k)), lerp(ay, zy, easeOut(k)));
      c.stroke();
    });
    c.restore();

    pts.forEach(([x, y], i) => {
      const appear = o.appear ? clamp(o.appear[i], 0, 1) : 1;
      if (appear <= 0) return;
      const isBright = (o.bright || []).includes(i);
      const r = (o.starRadius || S * .0030) * (isBright ? 1.22 : 1);
      star(c, x, y, r * (.55 + .45 * appear), isBright ? T.gold : T.ink,
        (L ? .80 : .92) * appear, (o.haloRadius || S * .022) * appear, (L ? .42 : .15) * appear, T);
    });
  }

  /* ------------------------------------------------------------------
     상호작용 천체 — 여기만 매 프레임 다시 그린다.
     focus는 0~1. 포인터를 올렸거나 키보드 포커스가 왔을 때 1로 간다.
     ------------------------------------------------------------------ */

  /* 주계열성 — 완성된 프로젝트. 또렷한 점과 옅은 달무리. */
  function mainSequence(c, x, y, R, T, o, t, focus) {
    const breathe = 1 + Math.sin(t * .55 + o.phase) * .03;
    star(c, x, y, R * .30 * breathe, o.bright ? T.gold : T.ink,
      (T.mode === 'light' ? .82 : .94), R * (2.1 + focus * .9),
      (T.mode === 'light' ? .40 : .16) + focus * .16, T);
  }

  /* 별이 태어나는 중. 가스 원반이 안으로 빨려 들어가고 코어가 켜지기 시작한다.
     기획 단계는 아직 코어가 없고, 개발 중단은 코어가 어둡게 맥동한다. */
  function protostar(c, x, y, R, T, o, t, focus) {
    const grow = 1 + focus * .12;
    const pull = 1 - focus * .18;
    const lit = o.stage === 'stalled';
    const pulse = lit ? .5 + .5 * Math.sin(t * .9 + o.phase) : 0;

    const gr = R * 2.0 * grow;
    const g = c.createRadialGradient(x, y, 0, x, y, gr);
    const a = (lit ? .17 : .11) + focus * .13 + pulse * .05;
    g.addColorStop(0, rgba(T.glow, a));
    g.addColorStop(.42, rgba(T.neb2, a * .55));
    g.addColorStop(1, rgba(T.neb2, 0));
    c.fillStyle = g; c.beginPath(); c.arc(x, y, gr, 0, 7); c.fill();

    /* 강착 원반 — 기울어진 타원 세 겹이 아주 느리게 돈다.
       중단된 별은 원반이 흩어져 간격이 벌어진다. */
    for (let i = 0; i < 3; i++) {
      c.save();
      c.translate(x, y);
      c.rotate(o.tilt + t * (.05 + i * .015) * (lit ? -1 : 1));
      c.scale(1, .34);
      c.strokeStyle = rgba(T.glow, Math.max(0, .14 - i * .035) + focus * .14);
      c.lineWidth = 1;
      if (lit) c.setLineDash([R * .5, R * .7]);
      c.beginPath(); c.arc(0, 0, R * (1.05 + i * (lit ? .52 : .38)) * pull * grow, 0, 7); c.stroke();
      c.restore();
    }

    if (lit) {
      /* 점화 실패 — 코어는 켜졌지만 어둡게 맥동할 뿐 자라지 않는다. */
      const cg = c.createRadialGradient(x, y, 0, x, y, R * .84);
      cg.addColorStop(0, rgba(T.gold, .38 + pulse * .16 + focus * .18));
      cg.addColorStop(1, rgba(T.gold, 0));
      c.fillStyle = cg; c.beginPath(); c.arc(x, y, R * .84, 0, 7); c.fill();
      c.fillStyle = rgba(T.mode === 'light' ? T.ink : T.glow, .72);
      c.beginPath(); c.arc(x, y, R * (.30 + pulse * .05), 0, 7); c.fill();
    } else {
      /* 아직 점화 전 — 속이 빈 윤곽만 남긴다. */
      c.strokeStyle = rgba(T.mode === 'light' ? T.ink : T.glow, .36 + focus * .30);
      c.lineWidth = 1;
      c.beginPath(); c.arc(x, y, R * .34, 0, 7); c.stroke();
    }
  }

  /* 초신성 잔해 — 크게 시도했고 남은 것은 껍질뿐이다. 중심은 비어 있다. */
  function remnant(c, x, y, R, T, o, t, focus) {
    const rr = R * 1.72 * (1 + Math.sin(t * .35 + o.phase) * .025 + focus * .10);

    c.save();
    c.translate(x, y); c.rotate(o.tilt);

    const g = c.createRadialGradient(0, 0, rr * .18, 0, 0, rr);
    g.addColorStop(0, rgba(T.gold, 0));
    g.addColorStop(.74, rgba(T.gold, .07 + focus * .08));
    g.addColorStop(1, rgba(T.gold, 0));
    c.fillStyle = g;
    c.beginPath(); c.ellipse(0, 0, rr, rr * .86, 0, 0, 7); c.fill();

    /* 껍질 — 이어진 둥근 선이 아니라 폭발 뒤에 남은 짧은 파편 호들이다. */
    c.strokeStyle = rgba(T.gold, .32 + focus * .30);
    c.lineWidth = .9;
    for (let i = 0; i < 7; i++) {
      const start = o.phase + i * .91 + Math.sin(i * 3.7 + o.phase) * .18;
      const length = .30 + (i % 3) * .075;
      c.beginPath();
      for (let p = 0; p <= 10; p++) {
        const ang = start + length * p / 10;
        const wob = 1 + Math.sin(ang * 4 + o.phase) * .045 + Math.sin(ang * 9 + o.phase) * .025;
        const px = Math.cos(ang) * rr * wob, py = Math.sin(ang) * rr * wob * .84;
        if (p === 0) c.moveTo(px, py); else c.lineTo(px, py);
      }
      c.stroke();
    }

    /* 필라멘트 — 중심에서 껍질로 뻗은 가는 줄기. */
    c.strokeStyle = rgba(T.gold, .17 + focus * .22);
    c.lineWidth = .8;
    for (let i = 0; i < 6; i++) {
      const ang = o.phase + i * 1.07;
      c.beginPath();
      c.moveTo(Math.cos(ang) * rr * .34, Math.sin(ang) * rr * .28);
      c.lineTo(Math.cos(ang) * rr * (.72 + (i % 2) * .22), Math.sin(ang) * rr * (.62 + (i % 2) * .18));
      c.stroke();
    }
    c.restore();

    /* 별이 있던 자리. 남은 것은 잔해뿐이다. */
    c.fillStyle = rgba(T.ink, .32 + focus * .26);
    c.beginPath(); c.arc(x, y, R * .16, 0, 7); c.fill();
  }

  /* 궤도 이탈 — 별은 아직 살아 있고 다만 축에서 떨어져 나왔다.
     '실패'가 아니라 '지연'이라는 것이 잔해와 다른 형태로 구분된다. */
  function drifted(c, x, y, R, T, o, t, focus) {
    c.save();
    c.translate(x, y); c.rotate(o.tilt);
    c.strokeStyle = rgba(T.gold, .26 + focus * .30);
    c.lineWidth = 1;
    c.setLineDash([2, 6]);
    c.beginPath();
    c.arc(0, R * 3.4, R * 3.6, -Math.PI * .80, -Math.PI * .16);
    c.stroke();
    c.restore();

    const dx = Math.sin(t * .3 + o.phase) * R * .14;
    star(c, x + dx, y - dx * .4, R * .26, T.ink,
      .70 + focus * .26, R * 2.0, (T.mode === 'light' ? .30 : .11) + focus * .10, T);
  }

  /* 유성 자국 — 수상 기록. 등급을 매기지 않고 같은 무게로 남긴다. */
  function meteorTrail(c, x, y, len, angle, T, focus) {
    const L = T.mode === 'light';
    c.save();
    c.translate(x, y); c.rotate(angle);
    const g = c.createLinearGradient(0, 0, -len, 0);
    g.addColorStop(0, rgba(T.gold, (L ? .48 : .58) + focus * .22));
    g.addColorStop(1, rgba(T.gold, 0));
    c.strokeStyle = g;
    c.lineWidth = 1 + focus * .8;
    c.lineCap = 'round';
    c.beginPath(); c.moveTo(0, 0); c.lineTo(-len, 0); c.stroke();
    c.restore();
    star(c, x, y, 1.6 + focus * .8, T.gold, .92, 9 + focus * 6, (L ? .34 : .20) + focus * .12, T);
  }

  /* ------------------------------------------------------------------
     공용 루프 — 상시 rAF를 돌리지 않는다(#113 P1-1 회귀 금지).
     구독자가 하나라도 '지금 그려야 한다'고 말할 때만 프레임이 돈다.
     탭이 숨거나 reduced-motion이면 루프를 세우고, 대신 한 장만 다시 그린다.
     ------------------------------------------------------------------ */
  const painters = new Set();
  let raf = 0;
  let startedAt = 0;

  /* painter의 계약: **호출될 때마다 완성된 한 장을 남긴다.**
     지우고 나서 중간에 return하는 경로를 두지 않는다. 반환값은 '다음 프레임이
     더 필요한가'일 뿐이고, false를 돌려줘도 방금 그린 장면은 화면에 남는다.
     1차 구현은 이 계약을 어겨서 캔버스가 지워진 채 멈추는 순서가 있었다. */
  function frame(now) {
    raf = 0;
    if (!startedAt) startedAt = now;
    const t = (now - startedAt) / 1000;
    let wants = false;
    painters.forEach((p) => { if (p(t) !== false) wants = true; });
    if (wants && !document.hidden && !prefersReduced()) raf = requestAnimationFrame(frame);
  }

  function kick() {
    if (raf || document.hidden) return;
    raf = requestAnimationFrame(frame);
  }

  /* reduced-motion이나 숨은 탭에서는 정지 화면 한 장만 필요하다. */
  function paintOnce() {
    const now = performance.now();
    if (!startedAt) startedAt = now;
    const t = (now - startedAt) / 1000;
    painters.forEach((p) => p(t));
  }

  function addPainter(fn) {
    painters.add(fn);
    if (prefersReduced()) paintOnce(); else kick();
    return () => painters.delete(fn);
  }

  document.addEventListener('visibilitychange', () => { if (!document.hidden) kick(); else paintOnce(); });
  window.addEventListener('focus', kick);
  motionQuery.addEventListener('change', () => { if (prefersReduced()) paintOnce(); else kick(); });

  window.V3Sky = {
    PALETTE, SHAPES, LIGHT_DIR,
    theme, prefersReduced, rgba, rng, lerp, clamp, easeOut, noise, sizeCanvas,
    fitBox, placeShape,
    volume, softCurve, star, paintSky, constellation,
    forms: { mainSequence, protostar, remnant, drifted, meteorTrail },
    addPainter, kick, paintOnce,
    onThemeChange(fn) { darkQuery.addEventListener('change', fn); },
  };
})();
