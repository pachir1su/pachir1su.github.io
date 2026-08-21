/* =====================================================================
   v3 「차가운 성운」 시안 공용 렌더 엔진

   nebula-keyvisual.html : 첫 화면 키비주얼 2장(정적)
   nebula-transit.html   : 별자리 완성 후 전환 화면(상호작용)
   nebula-gateway.html   : v2 홈에 얹는 우주 진입점

   #114에서 확정된 시각 언어를 코드로 옮긴 것이다.
   - 성운은 균일하게 깔지 않는다. 화면 밖 오른쪽 위에 광원이 하나 있고
     모든 덩어리는 그 빛을 받는다. 어두운 먼지 띠가 성운을 가로지른다.
   - 별은 세 계층이다. 먼 먼지 / 일반 별(점) / 별자리 별(옅은 달무리).
   - 별자리 선은 낡은 금빛 실선 하나만 쓴다.
   - 진행 중과 실패는 글자 라벨이 아니라 천체의 상태로 표현한다.
     진행 중 → 별이 태어나는 중(원시성), 실패 → 초신성 잔해, 지연 → 궤도 이탈.
   ===================================================================== */
(() => {
  'use strict';

  /* ------------------------------------------------------------------
     팔레트. 프레임마다 고정으로 쓰므로 CSS 변수를 읽지 않는다.
     ------------------------------------------------------------------ */
  const PALETTE = {
    light: {
      mode: 'light',
      sky0: '#eceef5', sky1: '#e2e5ee', sky2: '#d7dbe7',
      neb: '#706994', neb2: '#8d86ab', lane: '#b9bccd',
      ink: '#242636', gold: '#8f7736', glow: '#ffffff', vignette: '#c9cdda',
    },
    dark: {
      mode: 'dark',
      sky0: '#12161f', sky1: '#0f131b', sky2: '#0b0e15',
      neb: '#4a4468', neb2: '#6d648f', lane: '#080b11',
      ink: '#e6e9f1', gold: '#c9b477', glow: '#cfd3e4', vignette: '#05070c',
    },
  };

  /* 전환 화면 라이트 모드는 키비주얼보다 한 단계 깊게 눌러 우주로 읽히게 한다. */
  const TRANSIT_LIGHT = {
    ...PALETTE.light,
    sky0: '#dfe3ed', sky1: '#d4d9e6', sky2: '#c9d0df',
    neb: '#625b86', neb2: '#7c759e', lane: '#a8adbf',
  };

  /* 화면 밖 오른쪽 위 광원. 성운 덩어리는 전부 이 방향으로 밝아진다. */
  const LIGHT_DIR = [0.62, -0.78];

  /* 북두칠성. 진입 연출에서 전갈자리와 50:50으로 나오는 둘 중 하나다. */
  const DIPPER = {
    pts: [[.125, .617], [.250, .550], [.365, .600], [.480, .525], [.650, .408], [.810, .567], [.620, .725]],
    edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 3]],
    gold: [4, 5],
  };

  /* ------------------------------------------------------------------
     유틸
     ------------------------------------------------------------------ */
  const rng = (seed) => { let s = seed >>> 0; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; };
  const lerp = (a, b, k) => a + (b - a) * k;
  const rgba = (hex, a) => {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  };
  const prefersReduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

  /* 성운 하늘 한 장. 움직이지 않으므로 크기가 바뀔 때만 다시 그린다. */
  function paintSky(c, w, h, T, box, starScale) {
    const S = Math.min(w, h);
    const L = T.mode === 'light';

    const base = c.createLinearGradient(w, 0, 0, h);
    base.addColorStop(0, T.sky0); base.addColorStop(.52, T.sky1); base.addColorStop(1, T.sky2);
    c.fillStyle = base; c.fillRect(0, 0, w, h);

    volume(c, w * .70, h * .30, S * .78, S * .46, -0.42, T.neb, L ? .17 : .50);
    volume(c, w * .52, h * .52, S * .58, S * .40, 0.30, T.neb2, L ? .11 : .30);
    volume(c, w * .86, h * .12, S * .34, S * .26, -0.15, T.neb2, L ? .13 : .38);
    volume(c, w * .22, h * .74, S * .46, S * .28, 0.52, T.neb, L ? .07 : .22);

    softCurve(c, [w * .34, h * .12, w * .58, h * .30, w * .74, h * .30, w * 1.02, h * .52],
      S * .16, T.lane, L ? .16 : .40, 5);
    softCurve(c, [w * .46, h * .96, w * .62, h * .74, w * .84, h * .70, w * 1.04, h * .80],
      S * .10, T.lane, L ? .10 : .26, 5);
    softCurve(c, [w * .58, h * .06, w * .72, h * .16, w * .80, h * .28, w * .96, h * .34],
      S * .006, T.neb2, L ? .035 : .045, 2);

    /* 먼 먼지 — 거의 안 보이지만 표면의 재질을 만든다. */
    const rf = rng(101);
    for (let i = 0; i < 340; i++) {
      const m = rf();
      c.globalAlpha = (L ? .10 : .16) * (.25 + m * .75);
      c.fillStyle = T.ink;
      c.beginPath(); c.arc(rf() * w, rf() * h, .35 + m * .45, 0, 7); c.fill();
    }
    c.globalAlpha = 1;

    /* 일반 별 — 순수한 점만 쓴다. */
    const rs = rng(77);
    for (let i = 0; i < 72; i++) {
      const x = rs() * w, y = rs() * h * .94, m = rs();
      star(c, x, y, .55 + m * 1.15, m > .93 ? T.gold : T.ink,
        (L ? .26 : .34) + m * .40, m > .7 ? 2 + m * 3 : 0, L ? .30 : .10, T);
    }

    /* 별자리 — 금빛 실선 하나와 옅은 달무리를 가진 일곱 별.
       box 가 없으면 이 층을 건너뛴다. 전환 화면은 프로젝트 별을 따로 그리기 때문이다. */
    if (box) {
    const P = DIPPER.pts.map(([x, y]) => [box.x * w + x * box.w * w, box.y * h + y * box.h * h]);
    c.save();
    c.lineCap = 'round';
    c.strokeStyle = rgba(T.gold, L ? .52 : .60);
    c.lineWidth = Math.max(1, S * .0016);
    for (const [a, z] of DIPPER.edges) {
      c.beginPath(); c.moveTo(P[a][0], P[a][1]); c.lineTo(P[z][0], P[z][1]); c.stroke();
    }
    c.restore();
    P.forEach(([x, y], i) => {
      const isGold = DIPPER.gold.includes(i);
      star(c, x, y, S * (isGold ? .0034 : .0028) * starScale, isGold ? T.gold : T.ink,
        L ? .80 : .92, S * .022 * starScale, L ? .42 : .15, T);
    });
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
     상호작용 천체 — 여기만 매 프레임 다시 그린다.
     focus 는 0~1. 포인터를 올렸거나 키보드 포커스가 왔을 때 1로 간다.
     ------------------------------------------------------------------ */

  /* 별이 태어나는 중. 가스 원반이 안으로 빨려 들어가고 코어가 켜지기 시작한다.
     기획 단계는 아직 코어가 없고, 개발 중은 코어가 느리게 맥동한다. */
  function protostar(c, x, y, R, T, o, t, focus) {
    const grow = 1 + focus * .12;
    const pull = 1 - focus * .18;
    const lit = o.stage === 'dev';
    const pulse = lit ? .5 + .5 * Math.sin(t * .9 + o.phase) : 0;

    const gr = R * 2.1 * grow;
    const g = c.createRadialGradient(x, y, 0, x, y, gr);
    const a = (lit ? .17 : .11) + focus * .13 + pulse * .05;
    g.addColorStop(0, rgba(T.glow, a));
    g.addColorStop(.42, rgba(T.neb2, a * .55));
    g.addColorStop(1, rgba(T.neb2, 0));
    c.fillStyle = g; c.beginPath(); c.arc(x, y, gr, 0, 7); c.fill();

    /* 강착 원반 — 기울어진 타원 세 겹이 아주 느리게 돈다. */
    for (let i = 0; i < 3; i++) {
      c.save();
      c.translate(x, y);
      c.rotate(o.tilt + t * (.05 + i * .015));
      c.scale(1, .34);
      c.strokeStyle = rgba(T.glow, Math.max(0, .17 - i * .045) + focus * .16);
      c.lineWidth = 1;
      c.beginPath(); c.arc(0, 0, R * (1.15 + i * .38) * pull * grow, 0, 7); c.stroke();
      c.restore();
    }

    if (lit) {
      const cg = c.createRadialGradient(x, y, 0, x, y, R * 1.15);
      cg.addColorStop(0, rgba(T.gold, .48 + pulse * .22 + focus * .20));
      cg.addColorStop(1, rgba(T.gold, 0));
      c.fillStyle = cg; c.beginPath(); c.arc(x, y, R * 1.15, 0, 7); c.fill();
      c.fillStyle = rgba(T.mode === 'light' ? T.ink : T.glow, .86);
      c.beginPath(); c.arc(x, y, R * (.34 + pulse * .08), 0, 7); c.fill();
    } else {
      /* 아직 점화 전 — 속이 빈 윤곽만 남긴다. */
      c.strokeStyle = rgba(T.mode === 'light' ? T.ink : T.glow, .36 + focus * .30);
      c.lineWidth = 1;
      c.beginPath(); c.arc(x, y, R * .38, 0, 7); c.stroke();
    }
  }

  /* 초신성 잔해. 껍질이 바깥으로 퍼지고 일부가 끊겨 있으며 중심은 비어 있다. */
  function remnant(c, x, y, R, T, o, t, focus) {
    const rr = R * 2.25 * (1 + Math.sin(t * .28 + o.phase) * .018 + focus * .08);
    c.save();
    c.translate(x, y);
    c.rotate(o.tilt * .28);

    /* 완전한 닫힌 윤곽 대신 서로 떨어진 얇은 충격파 조각을 쓴다.
       꽃잎처럼 보이는 폐곡선을 만들지 않는 것이 핵심이다. */
    const halo = c.createRadialGradient(0, 0, rr * .36, 0, 0, rr * 1.18);
    halo.addColorStop(0, rgba(T.gold, 0));
    halo.addColorStop(.70, rgba(T.gold, .045 + focus * .045));
    halo.addColorStop(1, rgba(T.gold, 0));
    c.fillStyle = halo;
    c.beginPath(); c.arc(0, 0, rr * 1.18, 0, 7); c.fill();

    const arcs = [
      [.05, .56, 1.00, .82, -.05],
      [.80, 1.22, .93, .76, .08],
      [1.43, 1.91, 1.08, .87, -.02],
    ];
    c.strokeStyle = rgba(T.gold, .34 + focus * .30);
    c.lineWidth = 1.05;
    c.lineCap = 'round';
    arcs.forEach(([a, z, rx, ry, rot]) => {
      c.beginPath();
      c.ellipse(0, 0, rr * rx, rr * ry, rot, Math.PI * a, Math.PI * z);
      c.stroke();
    });

    /* 껍질 밖으로 흩어진 작은 잔해. 중심은 의도적으로 비워 둔다. */
    for (let i = 0; i < 9; i++) {
      const ang = o.phase + i * .83;
      const dist = rr * (.78 + (i % 4) * .09);
      const px = Math.cos(ang) * dist;
      const py = Math.sin(ang) * dist * .82;
      c.fillStyle = rgba(T.gold, .16 + (i % 3) * .055 + focus * .10);
      c.beginPath(); c.arc(px, py, Math.max(.55, R * (.035 + (i % 2) * .018)), 0, 7); c.fill();
    }

    c.strokeStyle = rgba(T.gold, .13 + focus * .16);
    c.lineWidth = .7;
    for (let i = 0; i < 4; i++) {
      const ang = o.phase * .4 + i * 1.47;
      c.beginPath();
      c.moveTo(Math.cos(ang) * rr * .42, Math.sin(ang) * rr * .34);
      c.lineTo(Math.cos(ang + .08) * rr * .76, Math.sin(ang + .08) * rr * .62);
      c.stroke();
    }
    c.restore();
  }

  /* 궤도 이탈. 별은 아직 살아 있고 다만 축에서 떨어져 나왔다.
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
    star(c, x + dx, y - dx * .4, R * .26, T.ink, .70 + focus * .26, R * 2.0, (T.mode === 'light' ? .30 : .11) + focus * .10, T);
  }

  /* ------------------------------------------------------------------
     데이터 — 실제 projects.json을 쓰고, 열지 못하면 같은 내용의 사본을 쓴다.
     file:// 로 직접 열면 fetch가 막히므로 사본이 반드시 필요하다.
     ------------------------------------------------------------------ */
  const FALLBACK = {
    years: [
      { label: '2026', cards: [
        { name: 'GitHub Rank Insight', note: '1인 개발 · 전 과정 · GitHub Stats 등급 분석기', detail: 'projects/github_rank_insight/' },
        { name: '한기대 26학번 신입생 가이드', note: '1인 개발 · 신입생을 위한 정리 문서', detail: 'projects/koreatech_noob_guide/' },
        { name: 'Swordmaster', note: '1인 개발 · 미디어 처리 실험', detail: 'projects/swordmaster/' },
        { name: '데일리 리포트 AI', note: '팀장 · 3인 팀 · 디스코드 아침 브리핑 봇', detail: 'projects/computingSAGO/' },
        { name: 'MultiMind', note: '1인 개발 · 여러 LLM 동시 오케스트레이터', detail: 'projects/MultiMind/' },
        { name: '기술과사회', note: '팀장 · 5인 팀', detail: 'projects/tech_and_society/' },
        { name: '성현봇', note: '1인 개발 · 면진봇 후속 디스코드 봇', detail: 'projects/SH_bot/' },
        { name: '코리아텍 통합 알림 시스템', note: '1인 개발 · 공지·메일·셔틀·학식·도서관 통합', detail: 'projects/koreatechGongjiAgent/' },
        { name: '라즈베리파이 마인크래프트 서버', note: '1인 개발 · 실사용 서비스 장기 운용', detail: 'projects/raspi-mc-server/' },
        { name: '멈춰! — 2026 U-CAST', note: '5팀 멘토 · 돌발 보행자 감지 경고 시스템', detail: 'projects/2026_U-CAST/' },
      ] },
      { label: '2025', cards: [
        { name: 'NFC 출석 체크 시스템', note: '팀장 · 6인 팀', detail: 'projects/BerryIno/' },
        { name: '식물 타이머', note: '1인 개발', detail: 'projects/PlantClock/' },
        { name: '헬스 케어 시스템', note: '팀장 · 4인 팀', detail: 'projects/HEALTH_CHECK_PROJECT/' },
        { name: '면진봇', note: '1인 개발 · 디스코드 경제 시뮬레이션 봇', detail: 'projects/MZ_bot/' },
        { name: '공감 봇 & 레시피 AI', note: '팀장 · 4인 팀', detail: 'projects/Legend_SakSak_GongGam_AI/' },
      ] },
      { label: '2024', cards: [
        { name: '비밀번호 도어락', note: '팀장 · 4인 팀', detail: 'projects/Master_Creator_Challenge/' },
        { name: '해안 장벽 프로젝트', note: '팀원 · 아두이노 개발 총괄 · 4인 팀', detail: 'projects/Wall_Sina/' },
        { name: '산불 조기 감지 알림 시스템', note: '팀원 · 엔지니어 · 4인 팀', detail: 'projects/nonofire/' },
        { name: '2024 SFPC', note: '팀원 · 4인 팀 · 581팀 중 8위', detail: 'projects/2024_SFPC/' },
        { name: '졸음 방지 시스템', note: '아두이노 개발 · 2인 팀', detail: 'projects/2024_5th_CSRC/' },
      ] },
    ],
    wip: [
      { name: '한맵', note: '기획 단계', stage: 'planned', detail: 'projects/Koreatech_map/' },
      { name: '마법 아카데미', note: '기획 단계 · 저장소 준비 중', stage: 'planned', detail: 'projects/Magic_Academy/' },
      { name: 'DelphiRec', note: '설계 단계 · MVP 범위 확정', stage: 'planned', detail: 'projects/DelphiRec/' },
      { name: '승기봇', note: '핵심 시스템 재설계 중', stage: 'dev', detail: 'projects/SG_bot/' },
      { name: 'HTML Viewer', note: '개발 진행 중 · 미배포', stage: 'dev', detail: 'projects/HTML_Viewer/' },
      { name: 'CentrifugeAI', note: '마무리 단계', stage: 'dev', detail: 'projects/CentrifugeAI/' },
    ],
    failed: [
      { name: 'InfoCatch', note: 'AI 구현 실패 · 당시 웹서버 구축 몰랐음', stage: 'supernova' },
      { name: 'InvestAI', note: 'API 연동 실패', stage: 'supernova' },
      { name: '건영운세', note: '운세 로직 구현 실패', stage: 'supernova' },
      { name: '한기대 지도 (초기 버전)', note: '데이터 수집 난이도 · AI 지도 변환 실패', stage: 'drift' },
    ],
  };

  /* 제51구역으로 격리하기로 확정된 프로젝트는 일반 화면에 올리지 않는다(#114). */
  const QUARANTINED = ['BrawlCraft'];

  const ko = (v) => (v && typeof v === 'object' ? (v.ko || v.en || '') : (v || ''));
  const plain = (v) => ko(v).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

  /* 카드 한 장을 화면에 올릴 최소 정보로 줄인다.
     이름은 항상 보이고, note 는 눌렀을 때 펼쳐진다. */
  function toBody(card, note) {
    return { name: ko(card.title), note: note, detail: card.detail || '' };
  }

  function mapProjects(json) {
    const groups = json.groups || [];
    const years = groups
      .filter((g) => g.kind === 'year' || g.year)
      .map((g) => ({
        label: String(g.year),
        cards: (g.cards || []).map((card) => {
          const role = plain(card.role);
          const sub = plain(card.subtitle);
          return toBody(card, [role, sub].filter(Boolean).join(' · '));
        }),
      }))
      .filter((g) => g.cards.length);

    const wipGroup = groups.find((g) => g.kind === 'wip');
    const failedGroup = groups.find((g) => g.kind === 'failed');
    if (!years.length || !wipGroup || !failedGroup) return null;

    const wip = (wipGroup.cards || []).map((card) => {
      const body = toBody(card, plain(card.status) || plain(card.badge));
      /* 기획 단계는 아직 별이 아니고, 개발 중은 코어가 켜지는 중이다. */
      body.stage = plain(card.badge).indexOf('예정') >= 0 ? 'planned' : 'dev';
      return body;
    });

    const failed = (failedGroup.cards || [])
      .filter((card) => QUARANTINED.indexOf(ko(card.title)) < 0)
      .map((card) => {
        const body = toBody(card, plain(card.failedReason));
        body.stage = plain(card.badge).indexOf('지연') >= 0 ? 'drift' : 'supernova';
        return body;
      });

    if (!wip.length || !failed.length) return null;
    /* 궤도를 이탈한 별은 잔해 무리 바깥에 놓아야 형태 차이가 드러난다. */
    failed.sort((a, b) => (a.stage === 'drift' ? 1 : 0) - (b.stage === 'drift' ? 1 : 0));
    return { years, wip, failed };
  }

  function loadProjects(source) {
    if (!source || !window.fetch) return Promise.resolve(FALLBACK);
    return fetch(source)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => (json && mapProjects(json)) || FALLBACK)
      .catch(() => FALLBACK);
  }

  /* ------------------------------------------------------------------
     캔버스 준비
     ------------------------------------------------------------------ */
  function sizeCanvas(canvas) {
    const box = canvas.getBoundingClientRect();
    if (!box.width || !box.height) return null;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(box.width), h = Math.round(box.height);
    canvas.width = w * dpr; canvas.height = h * dpr;
    const c = canvas.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { c, w, h };
  }

  function observe(elements, run) {
    if ('ResizeObserver' in window) {
      let frame = 0;
      const ro = new ResizeObserver(() => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(run);
      });
      elements.forEach((el) => ro.observe(el));
    } else {
      window.addEventListener('resize', run);
    }
  }

  /* ------------------------------------------------------------------
     페이지 1 — 정적 키비주얼
     ------------------------------------------------------------------ */
  function initKeyvisual() {
    const canvases = Array.from(document.querySelectorAll('canvas[data-mode]'));
    const box = { x: .46, y: .07, w: .48, h: .46 };
    const draw = () => canvases.forEach((canvas) => {
      const ctx = sizeCanvas(canvas);
      if (!ctx) return;
      ctx.c.clearRect(0, 0, ctx.w, ctx.h);
      paintSky(ctx.c, ctx.w, ctx.h, PALETTE[canvas.dataset.mode], box, 1);
    });
    observe(canvases, draw);
    draw();
  }

  /* ------------------------------------------------------------------
     페이지 2 — 전환 화면

     포트폴리오이므로 프로젝트 이름은 언제나 화면에 있어야 한다.
     성도(星圖)가 밝은 별에 이름을 붙여 두는 것과 같은 방식이다.
     눌렀을 때 펼쳐지는 것은 역할과 한 줄 설명뿐이다.
     ------------------------------------------------------------------ */

  /* 연도 별자리 형태. 프로젝트 개수만큼 앞에서부터 쓰고 순서대로 선을 잇는다.
     좌표는 경로 순서로 적어 두었으므로 이어 그으면 별자리처럼 읽힌다. */
  const WIDE_YEAR = {
    10: [[.100, .330], [.175, .505], [.262, .410], [.238, .225], [.352, .262],
         [.398, .430], [.352, .618], [.470, .560], [.520, .372], [.478, .205]],
    5: [[.115, .315], [.215, .480], [.318, .360], [.412, .545], [.505, .300]],
  };
  const NARROW_YEAR = {
    10: [[.140, .170], [.300, .200], [.160, .240], [.320, .272], [.150, .312],
         [.310, .344], [.170, .384], [.330, .414], [.160, .448], [.300, .478]],
    5: [[.150, .180], [.310, .226], [.160, .292], [.320, .348], [.170, .412]],
  };

  const LAYOUTS = {
    wide: {
      year: WIDE_YEAR,
      wip: [[.790, .120], [.880, .168], [.805, .224], [.900, .262], [.775, .312], [.870, .356]],
      failed: [[.095, .800], [.185, .862], [.275, .812], [.360, .876]],
      /* 라벨이 화면 안쪽을 향하도록 편다. 오른쪽 무리는 왼쪽으로 편다. */
      side: { year: 'right', wip: 'left', failed: 'right' },
      scale: 1,
    },
    narrow: {
      year: NARROW_YEAR,
      wip: [[.150, .560], [.330, .596], [.160, .636], [.340, .672], [.150, .712], [.330, .748]],
      failed: [[.150, .820], [.330, .856], [.160, .896], [.340, .930]],
      side: { year: 'right', wip: 'right', failed: 'right' },
      scale: .8,
    },
  };

  function pickShape(table, count) {
    if (table[count]) return table[count];
    const base = table[10];
    if (count >= base.length) return base;
    /* 정의해 둔 개수가 아니면 10점 형태에서 고르게 솎아 낸다. */
    const step = base.length / count;
    const out = [];
    for (let i = 0; i < count; i++) out.push(base[Math.min(base.length - 1, Math.round(i * step))]);
    return out;
  }

  function initTransit() {
    const stage = document.querySelector('[data-stage]');
    const canvas = stage && stage.querySelector('canvas');
    const axis = stage && stage.querySelector('[data-orbit]');
    const loading = stage && stage.querySelector('[data-loading]');
    const mobilePanel = stage && stage.querySelector('[data-mobile-observation]');
    const mobileTitle = mobilePanel && mobilePanel.querySelector('[data-mobile-title]');
    const mobileNote = mobilePanel && mobilePanel.querySelector('[data-mobile-note]');
    const mobileLink = mobilePanel && mobilePanel.querySelector('[data-mobile-link]');
    const mobileClose = mobilePanel && mobilePanel.querySelector('[data-mobile-close]');
    const mobileQuery = window.matchMedia('(max-width:720px)');
    if (!stage || !canvas || !axis) return;

    const configNode = document.getElementById('nebula-config');
    const config = configNode ? JSON.parse(configNode.textContent || '{}') : {};
    const base = config.base || '';

    const sky = document.createElement('canvas');
    const skyCtx = sky.getContext('2d');
    const seeded = rng(9001);

    const state = { t: 0, size: null, dpr: 1, open: null, year: 0, data: null };
    let bodies = [];

    function theme() {
      const forced = document.documentElement.getAttribute('data-theme');
      if (forced === 'dark') return PALETTE.dark;
      if (forced === 'light') return TRANSIT_LIGHT;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? PALETTE.dark : TRANSIT_LIGHT;
    }

    function layout() {
      const s = state.size;
      return (s && s.w / s.h >= 1.35) ? LAYOUTS.wide : LAYOUTS.narrow;
    }

    /* 별 하나에 붙는 버튼. 이름은 항상 보이고 설명만 접혀 있다. */
    function makeBody(item, group, index) {
      const hit = document.createElement('button');
      hit.type = 'button';
      hit.className = `sky-body sky-body--${group}`;
      hit.setAttribute('aria-expanded', 'false');

      const dot = document.createElement('span');
      dot.className = 'sky-dot';
      dot.setAttribute('aria-hidden', 'true');

      const text = document.createElement('span');
      text.className = 'sky-text';

      const name = document.createElement('span');
      name.className = 'sky-name';
      name.textContent = item.name;

      const more = document.createElement('span');
      more.className = 'sky-more';
      more.textContent = item.note || '';
      more.setAttribute('aria-hidden', 'true');

      text.append(name, more);
      hit.append(dot, text);

      if (item.detail) {
        const link = document.createElement('span');
        link.className = 'sky-link';
        link.textContent = '자세히 →';
        link.setAttribute('aria-hidden', 'true');
        text.append(link);
      }

      stage.append(hit);
      const body = {
        item, group, index, hit,
        focus: 0, target: 0,
        phase: seeded() * 6.283,
        tilt: seeded() * 6.283,
        x: 0, y: 0,
      };
      const enter = () => { body.target = 1; still(); };
      const leave = () => { if (state.open !== body) { body.target = 0; still(); } };
      hit.addEventListener('pointerenter', enter);
      hit.addEventListener('pointerleave', leave);
      hit.addEventListener('focus', enter);
      hit.addEventListener('blur', leave);
      hit.addEventListener('click', () => {
        if (state.open === body && item.detail) { window.location.href = base + item.detail; return; }
        toggle(body);
      });
      return body;
    }

    function syncMobilePanel(target) {
      if (!mobilePanel) return;
      if (!mobileQuery.matches || !target) {
        mobilePanel.hidden = true;
        return;
      }
      mobileTitle.textContent = target.item.name || '';
      mobileNote.textContent = target.item.note || '';
      if (target.item.detail) {
        mobileLink.hidden = false;
        mobileLink.href = base + target.item.detail;
      } else {
        mobileLink.hidden = true;
        mobileLink.removeAttribute('href');
      }
      mobilePanel.hidden = false;
    }

    function toggle(next) {
      const target = state.open === next ? null : next;
      if (state.open && state.open !== target) {
        state.open.hit.setAttribute('aria-expanded', 'false');
        state.open.hit.querySelectorAll('.sky-more, .sky-link')
          .forEach((el) => el.setAttribute('aria-hidden', 'true'));
        state.open.target = 0;
      }
      state.open = target;
      if (target) {
        target.hit.setAttribute('aria-expanded', 'true');
        target.hit.querySelectorAll('.sky-more, .sky-link')
          .forEach((el) => el.setAttribute('aria-hidden', String(mobileQuery.matches)));
        target.target = 1;
      }
      syncMobilePanel(target);
      still();
    }

    /* 움직임을 줄인 환경에서는 애니메이션 루프가 돌지 않으므로
       상호작용이 일어난 순간에만 한 장을 다시 그린다. */
    function still() { if (prefersReduced()) frame(1); }

    /* 연도를 바꾸면 그 해 프로젝트 별만 새로 만든다. 나머지 무리는 그대로 둔다. */
    function rebuildYear() {
      bodies.filter((b) => b.group === 'year').forEach((b) => b.hit.remove());
      bodies = bodies.filter((b) => b.group !== 'year');
      if (state.open && state.open.group === 'year') state.open = null;
      const cards = state.data.years[state.year].cards;
      cards.forEach((item, i) => bodies.push(makeBody(item, 'year', i)));
      place();
    }

    function build(data) {
      state.data = data;

      data.years.forEach((group, i) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'orbit-year';
        btn.setAttribute('aria-current', String(i === 0));
        const label = document.createElement('b');
        label.textContent = group.label;
        const mark = document.createElement('i');
        mark.setAttribute('aria-hidden', 'true');
        btn.append(label, mark);
        btn.addEventListener('click', () => {
          state.year = i;
          Array.from(axis.querySelectorAll('.orbit-year'))
            .forEach((other, k) => other.setAttribute('aria-current', String(k === i)));
          rebuildYear();
        });
        axis.append(btn);
      });

      data.wip.forEach((item, i) => bodies.push(makeBody(item, 'wip', i)));
      data.failed.forEach((item, i) => bodies.push(makeBody(item, 'failed', i)));
      rebuildYear();
    }

    /* 버튼을 별 좌표에 맞춘다. 별은 캔버스가 그리므로 버튼은 그 자리를 감쌀 뿐이다. */
    function place() {
      if (!state.size) return;
      const { w, h } = state.size;
      const L = layout();
      bodies.forEach((body) => {
        const shape = body.group === 'year'
          ? pickShape(L.year, state.data.years[state.year].cards.length)
          : L[body.group];
        const pos = shape[body.index % shape.length];
        body.x = pos[0] * w;
        body.y = pos[1] * h;
        body.hit.style.left = `${pos[0] * 100}%`;
        body.hit.style.top = `${pos[1] * 100}%`;
        body.hit.dataset.side = L.side[body.group];
      });
    }

    function resize() {
      const box = canvas.getBoundingClientRect();
      if (!box.width || !box.height) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.round(box.width), h = Math.round(box.height);
      state.size = { w, h }; state.dpr = dpr;

      canvas.width = w * dpr; canvas.height = h * dpr;
      sky.width = w * dpr; sky.height = h * dpr;

      /* 배경 하늘에는 프로젝트 별을 넣지 않는다. 그쪽은 매 프레임 다시 그린다. */
      skyCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      skyCtx.clearRect(0, 0, w, h);
      paintSky(skyCtx, w, h, theme(), null, 1);

      place();
      frame(0);
    }

    /* 성운 하늘은 캐시에서 붙이고, 매 프레임 다시 그리는 것은 천체뿐이다. */
    function frame(dt) {
      if (!state.size) return;
      const { w, h } = state.size;
      const c = canvas.getContext('2d');

      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, canvas.width, canvas.height);
      c.drawImage(sky, 0, 0);
      if (!state.data) return;

      const T = theme();
      const L = layout();
      const R = Math.min(w, h) * .026 * L.scale;
      const k = Math.min(1, dt * 7) || 1;
      c.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);

      /* 그 해의 별자리 — 프로젝트를 순서대로 낡은 금빛 실선으로 잇는다. */
      const yearBodies = bodies.filter((b) => b.group === 'year');
      if (yearBodies.length > 1) {
        c.save();
        c.lineCap = 'round';
        c.strokeStyle = rgba(T.gold, T.mode === 'light' ? .40 : .46);
        c.lineWidth = Math.max(1, Math.min(w, h) * .0014);
        c.beginPath();
        yearBodies.forEach((b, i) => (i ? c.lineTo(b.x, b.y) : c.moveTo(b.x, b.y)));
        c.stroke();
        c.restore();
      }

      bodies.forEach((body) => {
        body.focus = lerp(body.focus, body.target, k);
        if (body.group === 'year') {
          const f = body.focus;
          star(c, body.x, body.y, R * (.30 + f * .10), T.ink,
            (T.mode === 'light' ? .84 : .94), R * (1.5 + f * .9),
            (T.mode === 'light' ? .34 : .13) + f * .12, T);
        } else if (body.group === 'wip') {
          protostar(c, body.x, body.y, R, T, body, state.t, body.focus);
        } else if (body.item.stage === 'drift') {
          drifted(c, body.x, body.y, R, T, body, state.t, body.focus);
        } else {
          remnant(c, body.x, body.y, R, T, body, state.t, body.focus);
        }
      });
    }

    let last = 0, raf = 0, animating = false;
    function loop(now) {
      if (!animating) return;
      const dt = last ? Math.min(.05, (now - last) / 1000) : 0;
      last = now;
      state.t += dt;
      frame(dt);
      raf = requestAnimationFrame(loop);
    }
    function setAnimating(next) {
      if (prefersReduced()) { animating = false; cancelAnimationFrame(raf); if (next) frame(1); return; }
      if (next && !animating) { animating = true; last = 0; raf = requestAnimationFrame(loop); }
      if (!next && animating) { animating = false; cancelAnimationFrame(raf); }
    }

    /* 빈 곳을 누르면 펼쳐 둔 설명을 접는다. */
    stage.addEventListener('pointerdown', (event) => {
      if (!event.target.closest('.sky-body') && state.open) toggle(state.open);
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && state.open) toggle(state.open);
    });
    if (mobileClose) mobileClose.addEventListener('click', () => { if (state.open) toggle(state.open); });
    const onMobileChange = () => {
      if (!state.open) { syncMobilePanel(null); return; }
      state.open.hit.querySelectorAll('.sky-more, .sky-link')
        .forEach((el) => el.setAttribute('aria-hidden', String(mobileQuery.matches)));
      syncMobilePanel(state.open);
    };
    if (mobileQuery.addEventListener) mobileQuery.addEventListener('change', onMobileChange); else mobileQuery.addListener(onMobileChange);

    observe([canvas], resize);
    window.addEventListener('resize', resize);
    resize();

    loadProjects(config.source).then((data) => {
      build(data);
      if (loading) loading.hidden = true;
      resize();
      if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver((entries) => setAnimating(entries.some((entry) => entry.isIntersecting)), { threshold: .01 });
        io.observe(stage);
      } else {
        setAnimating(true);
      }
    });

    const dark = window.matchMedia('(prefers-color-scheme: dark)');
    const onTheme = () => resize();
    if (dark.addEventListener) dark.addEventListener('change', onTheme); else dark.addListener(onTheme);
  }


  /* ------------------------------------------------------------------
     페이지 3 — 진입점

     v2 홈에 얹히는 작은 창 하나. 이 창만이 v2와 v3를 잇는다.
     조작 안내를 두지 않기로 했으므로 형태와 움직임만으로 눌리게 해야 한다.
     - 포인터가 창 밖 어디에 있어도 별이 그쪽으로 미세하게 기운다.
       움직이는 것이 시야에 걸려야 눈길이 간다.
     - 가까이 갈수록 별자리 선이 그어진다. 다 그어지면 완성된 모양이 보인다.
     - 가끔 유성이 하나 지나간다. 가만히 둬도 살아 있다.
     ------------------------------------------------------------------ */
  function initGateway() {
    const gate = document.querySelector('[data-gate]');
    const canvas = gate && gate.querySelector('canvas');
    const wrap = gate && gate.closest('[data-gate-wrap]');
    const mote = wrap && wrap.querySelector('[data-gate-mote]');
    if (!gate || !canvas || !wrap) return;

    /* 새로고침마다 다르되 Hero의 안전 슬롯 밖으로는 나가지 않는다. */
    const random = () => {
      if (window.crypto && crypto.getRandomValues) { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] / 4294967296; }
      return Math.random();
    };
    const mobile = window.matchMedia('(max-width:768px)').matches;
    const slotWidth = mobile ? 170 : 220;
    const width = Math.round((mobile ? 106 : 128) + random() * (mobile ? 42 : 52));
    const ratio = 1.18 + random() * .42;
    const rot = -1.6 + random() * 3.2;
    const aligns = mobile ? ['flex-start','center'] : ['flex-start','center','flex-end'];
    const align = aligns[Math.floor(random() * aligns.length)];
    wrap.style.setProperty('--gate-align', align);
    wrap.style.setProperty('--gate-slot-width', `${slotWidth}px`);
    wrap.style.marginTop = `${Math.round(8 + random() * 12)}px`;
    gate.style.setProperty('--gate-width', `${width}px`);
    gate.style.setProperty('--gate-ratio', ratio.toFixed(3));
    gate.style.setProperty('--gate-rot', `${rot.toFixed(2)}deg`);

    /* 평행한 사각 테두리가 되지 않도록 상하좌우 흔들림을 서로 다르게 준다. */
    const top = [], right = [], bottom = [], left = [];
    [2,14,29,46,63,80,97].forEach((x,i) => top.push(`${x}% ${Math.round(1 + random()*(i%2 ? 13 : 8))}%`));
    [18,39,61,82,96].forEach((y,i) => right.push(`${Math.round(91 + random()*(i%2 ? 9 : 6))}% ${y}%`));
    [86,70,53,36,19,3].forEach((x,i) => bottom.push(`${x}% ${Math.round(88 + random()*(i%2 ? 11 : 8))}%`));
    [82,62,42,23,8].forEach((y,i) => left.push(`${Math.round(random()*(i%2 ? 10 : 6))}% ${y}%`));
    gate.style.setProperty('--tear-clip', `polygon(${[...top,...right,...bottom,...left].join(',')})`);

    if (mote) {
      const baseX = align === 'flex-end' ? slotWidth - width : align === 'center' ? (slotWidth - width) / 2 : 0;
      const height = width / ratio;
      const edge = Math.floor(random() * 3);
      let localX = .65 + random()*.22, localY = .18 + random()*.35, dx = 8 + random()*9, dy = -(7 + random()*10);
      if (edge === 1) { localX = .88 + random()*.07; localY = .38 + random()*.25; dx = 10 + random()*10; dy = -3 + random()*7; }
      if (edge === 2) { localX = .55 + random()*.28; localY = .88 + random()*.07; dx = 5 + random()*9; dy = 8 + random()*10; }
      mote.style.setProperty('--mote-left', `${(baseX + width*localX).toFixed(1)}px`);
      mote.style.setProperty('--mote-top', `${(height*localY).toFixed(1)}px`);
      mote.style.setProperty('--mote-x', `${dx.toFixed(1)}px`);
      mote.style.setProperty('--mote-y', `${dy.toFixed(1)}px`);
      mote.style.setProperty('--mote-duration', `${(9 + random()*5).toFixed(1)}s`);
      mote.style.setProperty('--mote-delay', `${(1 + random()*4).toFixed(1)}s`);
    }

    const cfg = document.getElementById('nebula-config');
    const target = (cfg ? (JSON.parse(cfg.textContent || '{}').target || '') : '') || 'nebula-transit.html';

    /* 창 안은 언제나 밤이다. 페이지가 라이트여도 우주는 어둡다. */
    const T = PALETTE.dark;
    const seeded = rng(613);
    const stars = [];
    for (let i = 0; i < 46; i++) stars.push([seeded(), seeded(), seeded(), seeded()]);

    const state = { w: 0, h: 0, dpr: 1, t: 0, near: 0, nearTarget: 0, px: 0, py: 0, meteor: 4 };
    let visible = true;

    function resize() {
      const box = canvas.getBoundingClientRect();
      if (!box.width || !box.height) return;
      state.dpr = Math.min(window.devicePixelRatio || 1, 2);
      state.w = Math.round(box.width); state.h = Math.round(box.height);
      canvas.width = state.w * state.dpr; canvas.height = state.h * state.dpr;
    }

    /* 창 안에 담을 작은 별자리. 북두칠성을 창 비율에 맞게 눕혔다. */
    const SHAPE = DIPPER.pts.map(([x, y]) => [.10 + x * .80, .18 + y * .64]);

    function frame(dt) {
      if (!state.w) return;
      const c = canvas.getContext('2d');
      const { w, h } = state;
      const S = Math.min(w, h);
      c.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);

      state.near = lerp(state.near, state.nearTarget, Math.min(1, dt * 4) || 1);
      const near = state.near;

      const g = c.createLinearGradient(w, 0, 0, h);
      g.addColorStop(0, T.sky0); g.addColorStop(1, T.sky2);
      c.fillStyle = g; c.fillRect(0, 0, w, h);

      volume(c, w * .68, h * .30, S * .95, S * .58, -.4, T.neb, .40 + near * .18);
      volume(c, w * .30, h * .70, S * .70, S * .42, .5, T.neb2, .22 + near * .12);

      /* 포인터를 따라 층마다 다른 폭으로 밀린다. 이 시차가 깊이를 만든다. */
      stars.forEach(([fx, fy, m, d]) => {
        const depth = .3 + d * .7;
        const x = fx * w + state.px * depth * 9;
        const y = fy * h + state.py * depth * 9;
        star(c, x, y, .5 + m * 1.1, m > .9 ? T.gold : T.ink,
          .28 + m * .42 + near * .18, m > .6 ? 2 + m * 3 : 0, .12, T);
      });

      /* 가까울수록 선이 길게 그어진다. 다 그어지면 별자리가 완성된다. */
      if (near > .02) {
        const P = SHAPE.map(([x, y]) => [x * w + state.px * 6, y * h + state.py * 6]);
        c.save();
        c.lineCap = 'round';
        c.strokeStyle = rgba(T.gold, .70 * near);
        c.lineWidth = 1;
        const total = DIPPER.edges.length;
        DIPPER.edges.forEach(([a, z], i) => {
          const k = Math.max(0, Math.min(1, near * total - i));
          if (k <= 0) return;
          c.beginPath();
          c.moveTo(P[a][0], P[a][1]);
          c.lineTo(P[a][0] + (P[z][0] - P[a][0]) * k, P[a][1] + (P[z][1] - P[a][1]) * k);
          c.stroke();
        });
        c.restore();
        P.forEach(([x, y], i) => {
          const isGold = DIPPER.gold.includes(i);
          star(c, x, y, 1.2 + near * .8, isGold ? T.gold : T.ink, .55 + near * .40, 5 + near * 4, .16 * near, T);
        });
      }

      /* 유성 — 가만히 둬도 창이 살아 있게 하는 유일한 장치다. */
      state.meteor -= dt;
      if (state.meteor < 0 && state.meteor > -.9) {
        const k = (-state.meteor) / .9;
        const x = w * (-.1 + k * 1.3), y = h * (.12 + k * .5);
        const grad = c.createLinearGradient(x - 34, y - 13, x, y);
        grad.addColorStop(0, rgba(T.glow, 0));
        grad.addColorStop(1, rgba(T.glow, .55 * Math.sin(k * Math.PI)));
        c.strokeStyle = grad; c.lineWidth = 1.1; c.lineCap = 'round';
        c.beginPath(); c.moveTo(x - 34, y - 13); c.lineTo(x, y); c.stroke();
      }
      if (state.meteor < -.9) state.meteor = 5 + Math.random() * 6;

      const v = c.createRadialGradient(w * .5, h * .45, S * .1, w * .5, h * .5, S * .95);
      v.addColorStop(0, rgba(T.vignette, 0));
      v.addColorStop(1, rgba(T.vignette, .62));
      c.fillStyle = v; c.fillRect(0, 0, w, h);

      c.save();
      c.globalAlpha = .05;
      c.globalCompositeOperation = 'overlay';
      c.fillStyle = c.createPattern(noise(), 'repeat');
      c.fillRect(0, 0, w, h);
      c.restore();
    }

    /* 포인터가 창 밖에 있어도 반응한다. 창 안에서만 움직이면 아무도 눈치채지 못한다. */
    window.addEventListener('pointermove', (e) => {
      const box = gate.getBoundingClientRect();
      const cx = box.left + box.width / 2, cy = box.top + box.height / 2;
      const dx = (e.clientX - cx) / Math.max(1, window.innerWidth * .5);
      const dy = (e.clientY - cy) / Math.max(1, window.innerHeight * .5);
      state.px = Math.max(-1, Math.min(1, dx));
      state.py = Math.max(-1, Math.min(1, dy));
      /* 창까지의 거리로 별자리가 얼마나 그어질지 정한다. */
      const dist = Math.hypot(e.clientX - cx, e.clientY - cy);
      const reach = Math.max(box.width, box.height) * 2.6;
      state.nearTarget = Math.max(0, Math.min(1, 1 - dist / reach));
      if (prefersReduced() && visible) frame(1);
    });
    gate.addEventListener('pointerenter', () => { state.nearTarget = 1; if (prefersReduced() && visible) frame(1); });
    gate.addEventListener('focus', () => { state.nearTarget = 1; if (prefersReduced() && visible) frame(1); });
    gate.addEventListener('blur', () => { state.nearTarget = 0; if (prefersReduced() && visible) frame(1); });

    /* 창이 화면을 덮으며 우주로 넘어간다. 페이지 전환이 문 열림처럼 보여야 한다. */
    const veil = document.createElement('div');
    veil.className = 'gate-veil';
    document.body.append(veil);
    gate.addEventListener('click', () => {
      const box = gate.getBoundingClientRect();
      veil.style.setProperty('--gx', `${box.left + box.width / 2}px`);
      veil.style.setProperty('--gy', `${box.top + box.height / 2}px`);
      veil.classList.add('open');
      setTimeout(() => { window.location.href = target; }, prefersReduced() ? 200 : 760);
    });

    let last = 0, raf = 0, animating = false;
    function loop(now) {
      if (!animating) return;
      const dt = last ? Math.min(.05, (now - last) / 1000) : 0;
      last = now;
      state.t += dt;
      frame(dt);
      raf = requestAnimationFrame(loop);
    }
    function setAnimating(next) {
      visible = next;
      if (prefersReduced()) { animating = false; cancelAnimationFrame(raf); if (next) frame(1); return; }
      if (next && !animating) { animating = true; last = 0; raf = requestAnimationFrame(loop); }
      if (!next && animating) { animating = false; cancelAnimationFrame(raf); }
    }

    observe([canvas], () => { resize(); frame(0); });
    window.addEventListener('resize', () => { resize(); frame(0); });
    resize();
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => setAnimating(entries.some((entry) => entry.isIntersecting)), { threshold: .01 });
      io.observe(gate);
    } else {
      setAnimating(true);
    }
  }

  const page = document.body.dataset.page;
  if (page === 'nebula-keyvisual') initKeyvisual();
  if (page === 'nebula-transit') initTransit();
  if (page === 'nebula-gateway') initGateway();
})();