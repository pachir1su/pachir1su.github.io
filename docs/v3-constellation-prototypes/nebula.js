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
  function paintSky(c, w, h, T, box, starScale, scene) {
    const S = Math.min(w, h);
    const L = T.mode === 'light';
    const transitLight = scene === 'transit' && L;
    const density = transitLight ? 1.35 : 1;

    const base = c.createLinearGradient(w, 0, 0, h);
    base.addColorStop(0, T.sky0); base.addColorStop(.52, T.sky1); base.addColorStop(1, T.sky2);
    c.fillStyle = base; c.fillRect(0, 0, w, h);

    volume(c, w * .70, h * .30, S * .78, S * .46, -0.42, T.neb, L ? .17 * density : .50);
    volume(c, w * .52, h * .52, S * .58, S * .40, 0.30, T.neb2, L ? .11 * density : .30);
    volume(c, w * .86, h * .12, S * .34, S * .26, -0.15, T.neb2, L ? .13 * density : .38);
    volume(c, w * .22, h * .74, S * .46, S * .28, 0.52, T.neb, L ? .07 * density : .22);

    softCurve(c, [w * .34, h * .12, w * .58, h * .30, w * .74, h * .30, w * 1.02, h * .52],
      S * .16, T.lane, L ? .16 : .40, 5);
    softCurve(c, [w * .46, h * .96, w * .62, h * .74, w * .84, h * .70, w * 1.04, h * .80],
      S * .10, T.lane, L ? .10 : .26, 5);
    softCurve(c, [w * .58, h * .06, w * .72, h * .16, w * .80, h * .28, w * .96, h * .34],
      S * .012, L ? T.neb : T.glow, L ? .055 : .075, 3);

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

    const gr = R * 2.0 * grow;
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
      c.strokeStyle = rgba(T.glow, Math.max(0, .14 - i * .035) + focus * .14);
      c.lineWidth = 1;
      c.beginPath(); c.arc(0, 0, R * (1.05 + i * .38) * pull * grow, 0, 7); c.stroke();
      c.restore();
    }

    if (lit) {
      const cg = c.createRadialGradient(x, y, 0, x, y, R * .84);
      cg.addColorStop(0, rgba(T.gold, .62 + pulse * .22 + focus * .20));
      cg.addColorStop(1, rgba(T.gold, 0));
      c.fillStyle = cg; c.beginPath(); c.arc(x, y, R * .84, 0, 7); c.fill();
      c.fillStyle = rgba(T.mode === 'light' ? T.ink : T.glow, .86);
      c.beginPath(); c.arc(x, y, R * (.34 + pulse * .07), 0, 7); c.fill();
    } else {
      /* 아직 점화 전 — 속이 빈 윤곽만 남긴다. */
      c.strokeStyle = rgba(T.mode === 'light' ? T.ink : T.glow, .36 + focus * .30);
      c.lineWidth = 1;
      c.beginPath(); c.arc(x, y, R * .34, 0, 7); c.stroke();
    }
  }

  /* 초신성 잔해. 껍질이 바깥으로 퍼지고 일부가 끊겨 있으며 중심은 비어 있다. */
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
      { name: 'BrawlCraft', note: '게임 시스템 구현 실패', stage: 'supernova' },
      { name: 'InfoCatch', note: 'AI 구현 실패 · 당시 웹서버 구축 몰랐음', stage: 'supernova' },
      { name: 'InvestAI', note: 'API 연동 실패', stage: 'supernova' },
      { name: '건영운세', note: '운세 로직 구현 실패', stage: 'supernova' },
      { name: '한기대 지도 (초기 버전)', note: '데이터 수집 난이도 · AI 지도 변환 실패', stage: 'drift' },
    ],
  };

  /* 사용자가 #114에서 직접 확정한 연도별 순서와 상태. 원본 projects.json은
     운영 데이터라 바꾸지 않고, v3 시안 안에서만 이 성도를 만든다. 승기봇은
     완료 별자리와 진행 중 무리에 모두 지정된 상태를 그대로 반영한다. */
  const YEAR_PROJECTS = {
    2026: {
      complete: ['한기대 26학번 신입생 가이드', 'Swordmaster', '기술과사회', '데일리 리포트 AI', 'MultiMind', '성현봇', '승기봇', 'GithubRankInsight', '코리아텍 통합 알림 시스템', '라즈베리파이 마인크래프트 서버', '멈춰!'],
      failed: ['BrawlCraft', '한기대 지도'],
      wip: ['한맵', 'CentrifugeAI', '마법 아카데미', '승기봇', 'HTML Viewer', 'DelphiRec'],
    },
    2025: {
      complete: ['헬스 케어 시스템', '공감 봇 & 레시피 AI', '식물 타이머', 'NFC 출석 체크 시스템', '면진봇'],
      failed: ['InfoCatch', 'InvestAI', '건영운세'],
      wip: [],
    },
    2024: {
      complete: ['해안 장벽 프로젝트', '비밀번호 도어락', '졸음 방지 시스템', '산불 조기 감지 알림 시스템', '2024 SFPC'],
      failed: [],
      wip: [],
    },
  };
  const YEAR_SEQUENCE = ['2026', '2025', '2024'];
  const PROJECT_DISPLAY_NAMES = {
    '성현봇': '성현봇',
    '한맵': '한맵',
    '한기대지도': '한기대 지도',
    '멈춰': '멈춰!',
  };
  /* 같은 지도 계열이지만 한기대 지도는 실패한 초기 버전, 한맵은 현재 이어 가는
     후속 기획이다. 이름만 보고 중복으로 읽히지 않게 펼친 정보에서 관계를 밝힌다. */
  const PROJECT_LINEAGE = {
    '한기대지도': '초기 버전 · 후속 기획은 한맵',
    '한맵': '한기대 지도 초기 버전의 후속 기획',
  };

  const ko = (v) => (v && typeof v === 'object' ? (v.ko || v.en || '') : (v || ''));
  const plain = (v) => ko(v).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  const projectKey = (v) => plain(v)
    .replace(/\([^)]*\)/g, '')
    .replace(/[^0-9a-z가-힣]/gi, '')
    .toLowerCase();
  const stableProjectKey = (v) => {
    const key = projectKey(v);
    if (key.indexOf('멈춰') === 0) return '멈춰';
    return key;
  };
  const displayProjectName = (name) => PROJECT_DISPLAY_NAMES[stableProjectKey(name)] || plain(name);

  /* 카드 한 장을 화면에 올릴 최소 정보로 줄인다.
     이름은 항상 보이고, note 는 눌렀을 때 펼쳐진다. */
  function toBody(card, note) {
    const sourceName = card.name || ko(card.title);
    const key = stableProjectKey(sourceName);
    const sourceNote = note || card.note || '';
    const lineage = PROJECT_LINEAGE[key] || '';
    return {
      name: displayProjectName(sourceName), key,
      note: [sourceNote, lineage].filter(Boolean).join(sourceNote && lineage ? ' · ' : ''),
      detail: card.detail || '', stage: card.stage,
    };
  }

  /* 사용자가 적어 준 순서대로만 반환한다. 완료 목록에만 있는 승기봇은
     진행 중 원본 카드를 참조해 같은 상세 링크를 유지한다. */
  function inRequestedOrder(order, primary, all) {
    const lookup = new Map();
    primary.concat(all).forEach((item) => {
      if (!lookup.has(item.key)) lookup.set(item.key, item);
    });
    return order.map((name) => lookup.get(stableProjectKey(name))).filter(Boolean)
      .map((item) => ({ ...item }));
  }

  function organizeByYear(source) {
    const prepare = (items) => items.map((item) => item.key ? item : toBody(item, item.note));
    const years = source.years.map((group) => ({ ...group, cards: prepare(group.cards) }));
    const wip = prepare(source.wip);
    const failed = prepare(source.failed);
    const all = years.flatMap((group) => group.cards).concat(wip, failed);
    const yearLookup = new Map(years.map((group) => [group.label, group.cards]));
    return {
      years: YEAR_SEQUENCE.map((label) => {
        const guide = YEAR_PROJECTS[label];
        return {
          label,
          cards: inRequestedOrder(guide.complete, yearLookup.get(label) || [], all),
          wip: inRequestedOrder(guide.wip, wip, all),
          failed: inRequestedOrder(guide.failed, failed, all),
        };
      }).filter((group) => group.cards.length),
    };
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

    const failed = (failedGroup.cards || []).map((card) => {
        const body = toBody(card, plain(card.failedReason));
        body.stage = plain(card.badge).indexOf('지연') >= 0 ? 'drift' : 'supernova';
        return body;
      });

    if (!wip.length || !failed.length) return null;
    return organizeByYear({ years, wip, failed });
  }

  function loadProjects(source) {
    if (!source || !window.fetch) return Promise.resolve(organizeByYear(FALLBACK));
    return fetch(source)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => (json && mapProjects(json)) || organizeByYear(FALLBACK))
      .catch(() => organizeByYear(FALLBACK));
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

  /* #114 사운드 2차 판정에서 실제 우주 동작에 연결된 세 개만 재생한다.
     같은 동작을 빠르게 연속 입력했을 때 파일이 겹쳐 울리지 않도록 cue별로
     바로 앞 재생을 멈춘다. 오디오 실패(자동 재생 정책 등)는 화면 동작을 막지 않는다. */
  const APPROVED_SFX = {
    year: 'assets/audio/sfx-04-year-a-wood.wav',
    select: 'assets/audio/sfx-05-select-a-bell.wav',
    enter: 'assets/audio/sfx-06-enter-b-three-notes.wav',
  };
  const activeSfx = new Map();
  function playApprovedSfx(cue) {
    const source = APPROVED_SFX[cue];
    if (!source) return;
    const previous = activeSfx.get(cue);
    if (previous) { previous.pause(); previous.currentTime = 0; }
    const audio = new Audio(source);
    audio.preload = 'auto';
    audio.volume = cue === 'year' ? .48 : .58;
    activeSfx.set(cue, audio);
    audio.addEventListener('ended', () => {
      if (activeSfx.get(cue) === audio) activeSfx.delete(cue);
    }, { once:true });
    audio.play().catch(() => {
      if (activeSfx.get(cue) === audio) activeSfx.delete(cue);
    });
  }

  /* v2→v3 게이트웨이 전용 신규 후보음. #114 최종 지시대로 상세/우주 진입에
     쓰는 SFX-06 B(세 음의 벨)를 그대로 재사용하지 않고, 다른 방향(느리게
     열리는 낮은 스웰 + 위로 미끄러지는 글리산도)으로 새로 합성한다.
     아직 사용자 판정 전이므로 확정 파일로 만들지 않고 Web Audio로만 재생하며,
     같은 판정은 nebula-sound.html에 SFX-14 후보로도 기록해 둔다. */
  let gatewaySfxCtx = null;
  function playGatewayEnterSfx() {
    if (prefersReduced()) return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      if (!gatewaySfxCtx) gatewaySfxCtx = new Ctx();
      const ctx = gatewaySfxCtx;
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      const at = ctx.currentTime + 0.01;

      /* 저역 스웰 — 문이 천천히 열리는 느낌으로 3초 가까이 부풀렸다가 잦아든다. */
      const swell = ctx.createOscillator();
      swell.type = 'sine';
      swell.frequency.setValueAtTime(90, at);
      swell.frequency.exponentialRampToValueAtTime(58, at + 3.1);
      const swellGain = ctx.createGain();
      swellGain.gain.setValueAtTime(0.0001, at);
      swellGain.gain.exponentialRampToValueAtTime(0.16, at + 1.3);
      swellGain.gain.exponentialRampToValueAtTime(0.0001, at + 3.3);
      swell.connect(swellGain).connect(ctx.destination);
      swell.start(at); swell.stop(at + 3.4);

      /* 위로 미끄러지는 글리산도 — 문이 열리며 빛이 새어드는 인상을 준다.
         SFX-06 B의 세 개 개별 타건과 달리 끊기지 않는 연속 상승이다. */
      const rise = ctx.createOscillator();
      rise.type = 'triangle';
      rise.frequency.setValueAtTime(220, at + 0.6);
      rise.frequency.exponentialRampToValueAtTime(660, at + 3.0);
      const riseGain = ctx.createGain();
      riseGain.gain.setValueAtTime(0.0001, at + 0.6);
      riseGain.gain.exponentialRampToValueAtTime(0.05, at + 1.8);
      riseGain.gain.exponentialRampToValueAtTime(0.0001, at + 3.2);
      rise.connect(riseGain).connect(ctx.destination);
      rise.start(at + 0.6); rise.stop(at + 3.3);
    } catch (err) {
      /* 오디오 실패는 화면 전환을 막지 않는다. */
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
    11: [[.100, .520], [.185, .365], [.300, .470], [.402, .255], [.518, .385], [.448, .565],
         [.585, .665], [.422, .725], [.280, .610], [.165, .735], [.075, .620]],
    10: [[.100, .520], [.185, .365], [.300, .470], [.402, .255], [.518, .385],
         [.448, .565], [.585, .665], [.422, .725], [.280, .610], [.165, .735]],
    5: [[.135, .520], [.270, .335], [.435, .455], [.360, .650], [.180, .675]],
    /* 2024와 2025는 완료 별이 둘 다 5개라 위 5점 형태가 그대로 겹쳐 보였다.
       #114 3차 지시대로 같은 개수라도 연도가 다르면 다른 별자리로 읽히도록,
       가로로 눕고 궤적이 반대로 도는 형태를 따로 둔다(pickShape가 2024에 배정). */
    '5b': [[.115, .350], [.310, .270], [.470, .430], [.400, .630], [.560, .715]],
  };
  const TABLET_YEAR = {
    11: [[.125, .315], [.290, .245], [.435, .350], [.310, .460], [.475, .535], [.330, .625],
         [.485, .705], [.315, .785], [.165, .695], [.105, .560], [.185, .440]],
    10: [[.125, .315], [.290, .245], [.435, .350], [.310, .460], [.475, .535],
         [.330, .625], [.485, .705], [.315, .785], [.165, .695], [.105, .560]],
    5: [[.150, .385], [.330, .300], [.490, .435], [.340, .635], [.145, .600]],
    '5b': [[.130, .270], [.330, .215], [.480, .360], [.410, .560], [.560, .640]],
  };
  /* 폰은 화면 폭이 좁은 대신 무대를 세로로 쓴다. 별 사이의 세로 간격은
     44px 터치 영역보다 항상 크게 잡는다. 이전 좌표(.035 간격)는 폴드에서
     약 46px밖에 안 되어 긴 프로젝트 이름이 만나는 근본 원인이었다. */
  const MOBILE_YEAR = {
    11: [[.145, .185], [.715, .240], [.145, .295], [.715, .350], [.145, .405], [.715, .460],
         [.145, .515], [.715, .570], [.145, .625], [.715, .680], [.145, .735]],
    10: [[.145, .195], [.715, .255], [.145, .315], [.715, .375], [.145, .435],
         [.715, .495], [.145, .555], [.715, .615], [.145, .675], [.715, .735]],
    5: [[.155, .275], [.710, .385], [.155, .495], [.710, .605], [.155, .715]],
    '5b': [[.500, .240], [.220, .360], [.780, .430], [.280, .565], [.680, .700]],
  };
  /* 접힌 폴드는 이름이 두 줄이 되는 경우가 많으므로, 모바일보다 한 단계
     더 길게 벌린 전용 성도다. 양쪽을 번갈아 읽을 수 있게 궤적도 지그재그로 둔다. */
  const FOLD_YEAR = {
    11: [[.135, .180], [.760, .240], [.135, .300], [.760, .360], [.135, .420], [.760, .480],
         [.135, .540], [.760, .600], [.135, .660], [.760, .720], [.135, .780]],
    10: [[.135, .190], [.760, .255], [.135, .320], [.760, .385], [.135, .450],
         [.760, .515], [.135, .580], [.760, .645], [.135, .710], [.760, .775]],
    5: [[.145, .285], [.755, .405], [.145, .525], [.755, .645], [.145, .765]],
    '5b': [[.480, .200], [.180, .360], [.760, .440], [.240, .600], [.640, .760]],
  };

  const LAYOUTS = {
    wide: {
      year: WIDE_YEAR,
      wip: [[.790, .120], [.880, .168], [.805, .224], [.900, .262], [.775, .312], [.870, .356]],
      failed: [[.095, .800], [.185, .862], [.275, .812], [.360, .876]],
      /* 가까운 별끼리의 이름이 겹치지 않도록 완료 별은 좌우로 번갈아 편다. */
      side: { year: 'balanced', wip: 'left', failed: 'right' },
      scale: 1,
    },
    tablet: {
      year: TABLET_YEAR,
      wip: [[.760, .465], [.875, .540], [.750, .615], [.885, .690], [.765, .765], [.875, .840]],
      failed: [[.100, .845], [.245, .920], [.110, .970]],
      side: { year: 'balanced', wip: 'left', failed: 'right' },
      scale: .86,
    },
    mobile: {
      year: MOBILE_YEAR,
      wip: [[.100, .800], [.100, .835], [.100, .870], [.100, .905], [.100, .940], [.100, .975]],
      failed: [[.900, .820], [.900, .890], [.900, .960]],
      side: { year: 'alternate', wip: 'right', failed: 'left' },
      scale: .76,
    },
    fold: {
      year: FOLD_YEAR,
      wip: [[.105, .810], [.105, .842], [.105, .874], [.105, .906], [.105, .938], [.105, .970]],
      failed: [[.895, .830], [.895, .900], [.895, .965]],
      side: { year: 'alternate', wip: 'right', failed: 'left' },
      scale: .70,
    },
  };

  /* 완료 별 개수가 같은 두 연도가 같은 형태를 쓰면 별자리가 겹쳐 보인다(2024·2025가
     둘 다 5개였던 경우). yearLabel이 대체 형태(count+'b')를 가리키면 그쪽을 우선한다. */
  /* 별 개수가 우연히 같은 연도끼리 겹치지 않도록, 개수별로 대체 형태를 받을
     연도를 하나씩 지정한다. 현재는 2024·2025가 둘 다 5개라 2024를 '5b'로 돌린다. */
  const SHAPE_VARIANT_YEARS = { '5': '2024' };

  function pickShape(table, count, yearLabel) {
    const altKey = count + 'b';
    if (yearLabel && SHAPE_VARIANT_YEARS[String(count)] === yearLabel && table[altKey]) return table[altKey];
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
    if (!stage || !canvas || !axis) return;

    const configNode = document.getElementById('nebula-config');
    const config = configNode ? JSON.parse(configNode.textContent || '{}') : {};
    const base = config.base || '';

    const sky = document.createElement('canvas');
    const skyCtx = sky.getContext('2d');
    const seeded = rng(9001);

    const state = {
      t: 0, size: null, dpr: 1, open: null, year: 0, data: null,
      yearTransition: null,
    };
    let bodies = [];

    function theme() {
      const forced = document.documentElement.getAttribute('data-theme');
      if (forced === 'dark') return PALETTE.dark;
      if (forced === 'light') return PALETTE.light;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? PALETTE.dark : PALETTE.light;
    }

    function layout() {
      const s = state.size;
      if (!s) return LAYOUTS.wide;
      if (s.w <= 390) return LAYOUTS.fold;
      if (s.w <= 640) return LAYOUTS.mobile;
      if (s.w <= 1200 || s.w / s.h < 1.35) return LAYOUTS.tablet;
      return LAYOUTS.wide;
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

      text.append(name, more);
      hit.append(dot, text);

      if (item.detail) {
        const link = document.createElement('span');
        link.className = 'sky-link';
        link.textContent = '상세 보기 →';
        text.append(link);
      }

      stage.append(hit);
      const body = {
        item, group, index, hit,
        focus: 0, target: 0,
        phase: seeded() * 6.283,
        tilt: seeded() * 6.283,
        yearPhase: 'steady',
        yearAlpha: 1,
        x: 0, y: 0,
      };
      const enter = () => { body.target = 1; still(); };
      const leave = () => { if (state.open !== body) { body.target = 0; still(); } };
      hit.addEventListener('pointerenter', enter);
      hit.addEventListener('pointerleave', leave);
      hit.addEventListener('focus', enter);
      hit.addEventListener('blur', leave);
      hit.addEventListener('click', () => {
        if (state.open === body && item.detail) {
          playApprovedSfx('enter');
          window.setTimeout(() => { window.location.href = base + item.detail; }, 140);
          return;
        }
        playApprovedSfx('select');
        toggle(body);
      });
      return body;
    }

    function toggle(next) {
      const target = state.open === next ? null : next;
      if (state.open && state.open !== target) {
        state.open.hit.setAttribute('aria-expanded', 'false');
        state.open.target = 0;
      }
      state.open = target;
      if (target) {
        target.hit.setAttribute('aria-expanded', 'true');
        target.target = 1;
      }
      /* 카드가 펼쳐진 실제 높이까지 다시 재서 다른 클릭 영역을 비킨다. */
      place();
      still();
    }

    /* 움직임을 줄인 환경에서는 애니메이션 루프가 돌지 않으므로
       상호작용이 일어난 순간에만 한 장을 다시 그린다. */
    function still() { if (prefersReduced()) frame(1); }

    function setYearAlpha(body, alpha) {
      body.yearAlpha = Math.max(0, Math.min(1, alpha));
      body.hit.style.opacity = String(body.yearAlpha);
      body.hit.style.filter = `blur(${((1 - body.yearAlpha) * 1.6).toFixed(2)}px)`;
    }

    function appendYearBodies(phase) {
      const cards = state.data.years[state.year].cards;
      cards.forEach((item, i) => {
        const body = makeBody(item, 'year', i);
        body.yearPhase = phase;
        setYearAlpha(body, phase === 'enter' ? 0 : 1);
        bodies.push(body);
      });
    }

    function appendStatusBodies() {
      const group = state.data.years[state.year];
      group.wip.forEach((item, i) => bodies.push(makeBody(item, 'wip', i)));
      group.failed.forEach((item, i) => bodies.push(makeBody(item, 'failed', i)));
    }

    function discardStatusBodies() {
      bodies.filter((body) => body.group === 'wip' || body.group === 'failed')
        .forEach((body) => body.hit.remove());
      bodies = bodies.filter((body) => body.group === 'year');
    }

    function discardYearBodies() {
      bodies.filter((b) => b.group === 'year').forEach((b) => b.hit.remove());
      bodies = bodies.filter((b) => b.group !== 'year');
      state.yearTransition = null;
      stage.classList.remove('year-changing');
    }

    /* 연도 전환은 이전 별자리가 흐려져 빠져나가고 새 별자리가 들어오는 방식이다. */
    function rebuildYear(nextYear, animate) {
      if (state.yearTransition) discardYearBodies();
      const previous = bodies.filter((b) => b.group === 'year');
      if (state.open && state.open.group === 'year') state.open = null;
      state.year = nextYear;
      discardStatusBodies();
      appendStatusBodies();

      if (!animate || prefersReduced()) {
        previous.forEach((b) => b.hit.remove());
        bodies = bodies.filter((b) => b.group !== 'year');
        appendYearBodies('steady');
        place();
        return;
      }

      previous.forEach((body) => {
        body.yearPhase = 'leave';
        body.hit.setAttribute('aria-hidden', 'true');
        body.hit.style.pointerEvents = 'none';
        body.hit.classList.add('year-leaving');
        setYearAlpha(body, 1);
      });
      appendYearBodies('enter');
      state.yearTransition = { speed: 3.6 };
      place();
      stage.classList.remove('year-changing');
      void stage.offsetWidth;
      stage.classList.add('year-changing');
    }

    function clearBodies() {
      bodies.forEach((body) => body.hit.remove());
      bodies = [];
      axis.querySelectorAll('.orbit-year').forEach((button) => button.remove());
      state.open = null;
      state.yearTransition = null;
      stage.classList.remove('year-changing');
    }

    function build(data) {
      clearBodies();
      state.data = data;
      state.year = Math.min(state.year, Math.max(0, data.years.length - 1));

      data.years.forEach((group, i) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'orbit-year';
        btn.setAttribute('aria-current', String(i === state.year));
        const label = document.createElement('b');
        label.textContent = group.label;
        const mark = document.createElement('i');
        mark.setAttribute('aria-hidden', 'true');
        btn.append(label, mark);
        btn.addEventListener('click', () => {
          if (state.year === i && !state.yearTransition) return;
          playApprovedSfx('year');
          Array.from(axis.querySelectorAll('.orbit-year'))
            .forEach((other, k) => other.setAttribute('aria-current', String(k === i)));
          rebuildYear(i, true);
        });
        axis.append(btn);
      });

      rebuildYear(state.year, false);
    }

    function positionBody(body, x, y) {
      body.x = x; body.y = y;
      body.hit.style.left = `${x}px`;
      body.hit.style.top = `${y}px`;
    }

    /* 별과 선은 항상 이 좌표로 그린다. 카드가 펼쳐져 라벨(hit)이 충돌을
       피해 옆으로 밀려도, 캔버스가 그리는 성도 자체는 흔들리지 않는다. */
    function setBase(body, x, y) {
      body.baseX = x; body.baseY = y;
    }

    function stageRect(element, root) {
      const rect = element.getBoundingClientRect();
      return {
        left: rect.left - root.left, top: rect.top - root.top,
        right: rect.right - root.left, bottom: rect.bottom - root.top,
      };
    }

    function collides(a, b, gap) {
      const pad = gap || 10;
      return a.left < b.right + pad && a.right > b.left - pad && a.top < b.bottom + pad && a.bottom > b.top - pad;
    }

    /* 레이아웃 좌표만 믿지 않고 실제 라벨 폭까지 계산해 궤도·메모·다른 별과
       겹치는 천체를 옮긴다. 화면 폭과 글꼴이 달라도 클릭 영역은 겹치지 않는다. */
    function resolveInteractiveCollisions(L) {
      if (!state.size) return;
      const root = stage.getBoundingClientRect();
      const { w, h } = state.size;
      const controls = Array.from(axis.querySelectorAll('.orbit-year'))
        .concat(Array.from(stage.querySelectorAll('.orbit-back-note')))
        .map((element) => stageRect(element, root));
      const interactive = bodies.filter((body) => body.yearPhase !== 'leave');
      const placed = controls.slice();
      const labelMargin = (L === LAYOUTS.mobile || L === LAYOUTS.fold) ? w * .40 : w * .27;
      /* 좁은 폭일수록 라벨이 서로 밀어낼 여지가 적으므로 충돌 판정 여백과
         시도 횟수를 넓게 잡는다. 폴드에서 재현되던 잔여 겹침은 72회 시도가
         부족해 attempt 상한 안에서 자리를 못 찾고 멈춘 것이 원인이었다. */
      const gap = L === LAYOUTS.fold ? 16 : L === LAYOUTS.mobile ? 14 : 10;
      const attempts = (L === LAYOUTS.fold || L === LAYOUTS.mobile) ? 140 : 96;

      interactive.forEach((body) => {
        const side = body.hit.dataset.side;
        const minX = side === 'left' ? labelMargin : 18;
        const maxX = side === 'right' ? w - labelMargin : w - 18;
        for (let attempt = 0; attempt < attempts; attempt++) {
          const rect = stageRect(body.hit, root);
          const conflict = placed.find((other) => collides(rect, other, gap));
          if (!conflict) { placed.push(rect); break; }

          const direction = side === 'left' ? -1 : 1;
          const horizontal = direction > 0
            ? conflict.right - rect.left + 18
            : conflict.left - rect.right - 18;
          const nextX = Math.max(minX, Math.min(maxX, body.x + horizontal));
          const stuck = Math.abs(nextX - body.x) < 1;
          const down = rect.bottom - conflict.top + 24;
          const up = conflict.bottom - rect.top + 24;
          /* 휴대 기기에서는 좌우 여백이 이미 라벨 폭으로 꽉 차 있으므로
             수평 이동이 막히면 빈 세로 행으로 보낸다. 위/아래 중 덜 먼 쪽을 쓴다. */
          const vertical = down <= up || body.y - up < 36 ? down : -up;
          const nextY = Math.min(h - 32, Math.max(32, body.y + (stuck ? vertical : 0)));
          positionBody(body, nextX, nextY);
        }
      });
    }

    /* 버튼을 별 좌표에 맞춘다. 별은 캔버스가 그리므로 버튼은 그 자리를 감쌀 뿐이다. */
    function place() {
      if (!state.size) return;
      const { w, h } = state.size;
      const L = layout();
      bodies.forEach((body) => {
        if (body.group === 'year' && body.yearPhase === 'leave') return;
        const shape = body.group === 'year'
          ? pickShape(L.year, state.data.years[state.year].cards.length, state.data.years[state.year].label)
          : L[body.group];
        const pos = shape[body.index % shape.length];
        const requestedSide = L.side[body.group];
        body.hit.dataset.side = requestedSide === 'alternate'
          ? (pos[0] > .5 ? 'left' : 'right')
          : requestedSide === 'balanced'
            ? ((body.index % 2 && pos[0] > .16) || pos[0] > .68 ? 'left' : 'right')
            : requestedSide;
        setBase(body, pos[0] * w, pos[1] * h);
        positionBody(body, pos[0] * w, pos[1] * h);
      });
      resolveInteractiveCollisions(L);
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
      paintSky(skyCtx, w, h, theme(), null, 1, 'transit');

      place();
      frame(0);
    }

    /* 성운 하늘은 캐시에서 붙이고, 매 프레임 다시 그리는 것은 천체뿐이다. */
    function frame(dt) {
      if (!state.size || !state.data) return;
      const { w, h } = state.size;
      const T = theme();
      const L = layout();
      const R = Math.min(w, h) * .026 * L.scale;
      const c = canvas.getContext('2d');
      const k = Math.min(1, dt * 7) || 1;

      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, canvas.width, canvas.height);
      c.drawImage(sky, 0, 0);
      c.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);

      if (state.yearTransition && dt) {
        const entering = [];
        const leaving = [];
        bodies.forEach((body) => {
          if (body.group !== 'year') return;
          if (body.yearPhase === 'enter') {
            setYearAlpha(body, Math.min(1, body.yearAlpha + dt * state.yearTransition.speed));
            entering.push(body);
            if (body.yearAlpha >= 1) body.yearPhase = 'steady';
          } else if (body.yearPhase === 'leave') {
            setYearAlpha(body, Math.max(0, body.yearAlpha - dt * state.yearTransition.speed));
            leaving.push(body);
          }
        });
        leaving.filter((body) => body.yearAlpha <= 0).forEach((body) => body.hit.remove());
        bodies = bodies.filter((body) => body.yearPhase !== 'leave' || body.yearAlpha > 0);
        if (!bodies.some((body) => body.yearPhase === 'enter' || body.yearPhase === 'leave')) {
          state.yearTransition = null;
          stage.classList.remove('year-changing');
        }
      }

      /* 그 해의 별자리 — 프로젝트를 순서대로 낡은 금빛 실선으로 잇는다. */
      const yearBodies = bodies.filter((b) => b.group === 'year');
      const drawYearLine = (lineBodies) => {
        if (lineBodies.length < 2) return;
        const alpha = lineBodies.reduce((sum, body) => sum + body.yearAlpha, 0) / lineBodies.length;
        c.save();
        c.lineCap = 'round';
        c.strokeStyle = rgba(T.gold, (T.mode === 'light' ? .40 : .46) * alpha);
        c.lineWidth = Math.max(1, Math.min(w, h) * .0014);
        c.beginPath();
        lineBodies.forEach((b, i) => (i ? c.lineTo(b.baseX, b.baseY) : c.moveTo(b.baseX, b.baseY)));
        c.stroke();
        c.restore();
      };
      drawYearLine(yearBodies.filter((b) => b.yearPhase === 'leave'));
      drawYearLine(yearBodies.filter((b) => b.yearPhase !== 'leave'));

      bodies.forEach((body) => {
        body.focus = lerp(body.focus, body.target, k);
        if (body.group === 'year') {
          const f = body.focus;
          star(c, body.baseX, body.baseY, R * (.30 + f * .10), T.ink,
            (T.mode === 'light' ? .84 : .94) * body.yearAlpha, R * (1.5 + f * .9),
            ((T.mode === 'light' ? .34 : .13) + f * .12) * body.yearAlpha, T);
        } else if (body.group === 'wip') {
          protostar(c, body.baseX, body.baseY, R, T, body, state.t, body.focus);
        } else if (body.item.stage === 'drift') {
          drifted(c, body.baseX, body.baseY, R, T, body, state.t, body.focus);
        } else {
          remnant(c, body.baseX, body.baseY, R, T, body, state.t, body.focus);
        }
      });
    }

    let last = 0;
    function loop(now) {
      const dt = last ? Math.min(.05, (now - last) / 1000) : 0;
      last = now;
      state.t += dt;
      frame(dt);
      requestAnimationFrame(loop);
    }

    /* 빈 곳을 누르면 펼쳐 둔 설명을 접는다. */
    stage.addEventListener('pointerdown', (event) => {
      if (!event.target.closest('.sky-body') && state.open) toggle(state.open);
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && state.open) toggle(state.open);
    });

    /* fallback으로 먼저 그린 뒤 실제 데이터가 오면 같은 자리에 교체한다. */
    build(organizeByYear(FALLBACK));
    observe([canvas], resize);
    window.addEventListener('resize', resize);
    resize();
    if (prefersReduced()) frame(1); else requestAnimationFrame(loop);

    loadProjects(config.source).then((data) => {
      build(data);
      resize();
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
  function initGatewayLegacyCanvas() {
    const gate = document.querySelector('[data-gate]');
    const canvas = gate && gate.querySelector('canvas');
    if (!gate || !canvas) return;

    const cfg = document.getElementById('nebula-config');
    const target = (cfg ? (JSON.parse(cfg.textContent || '{}').target || '') : '') || 'nebula-transit.html';

    /* 창 안은 언제나 밤이다. 페이지가 라이트여도 우주는 어둡다. */
    const T = PALETTE.dark;
    const visitSeed = (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
    const seeded = rng(visitSeed);
    const tearSeeded = rng(visitSeed ^ 0x9e3779b9);
    const leakSeeded = rng(visitSeed ^ 0x7f4a7c15);
    const stars = [];
    for (let i = 0; i < 46; i++) stars.push([seeded(), seeded(), seeded(), seeded()]);

    const state = { w: 0, h: 0, dpr: 1, t: 0, near: 0, nearTarget: 0, px: 0, py: 0, meteor: 4 };

    function resize() {
      const box = canvas.getBoundingClientRect();
      if (!box.width || !box.height) return;
      state.dpr = Math.min(window.devicePixelRatio || 1, 2);
      state.w = Math.round(box.width); state.h = Math.round(box.height);
      canvas.width = state.w * state.dpr; canvas.height = state.h * state.dpr;
    }

    /* 창 안에 담을 작은 별자리. 배경을 가두는 찢긴 선보다 더 오른쪽에
       놓아 일부가 종이 바깥으로 튀어나오게 한다. */
    const SHAPE = DIPPER.pts.map(([x, y]) => [.10 + x * 1.08, .12 + y * .76]);

    /* 방문마다 형태 자체가 달라지는 찢긴 구멍. 네 변을 흔든 사각형이 아니라
       종이 한가운데를 손으로 뜯어 낸 비대칭 타원이라서 규칙적인 창처럼 보이지 않는다. */
    function makeGateTear(random) {
      const count = 27 + Math.floor(random() * 15);
      const weights = Array.from({ length: count }, () => .38 + random() * 1.85);
      const total = weights.reduce((sum, weight) => sum + weight, 0);
      const cx = .50 + (random() - .5) * .08;
      const cy = .50 + (random() - .5) * .07;
      const rx = .43 + (random() - .5) * .06;
      const ry = .42 + (random() - .5) * .08;
      const points = [];
      let angle = -Math.PI / 2;
      weights.forEach((weight, index) => {
        angle += Math.PI * 2 * weight / total;
        const coarse = (random() - .5) * .16;
        const tear = random() < .17 ? (random() - .5) * .34 : 0;
        const ripple = Math.sin(index * 2.31 + random() * 2) * .035;
        const radius = Math.max(.66, Math.min(1.18, 1 + coarse + tear + ripple));
        points.push([
          Math.max(.025, Math.min(.975, cx + Math.cos(angle) * rx * radius)),
          Math.max(.025, Math.min(.975, cy + Math.sin(angle) * ry * radius)),
        ]);
      });
      return points;
    }

    /* 배경만 찢어진 종이 안에 가둔다. 별과 선은 경계를 넘어 나올 수 있어야 한다. */
    const GATE_TEAR = makeGateTear(tearSeeded);
    const gateClip = `polygon(${GATE_TEAR.map(([x, y]) => `${(x * 100).toFixed(2)}% ${(y * 100).toFixed(2)}%`).join(', ')})`;
    gate.style.setProperty('--gate-clip', gateClip);

    const edgeSeeded = rng(visitSeed ^ 0x2468ace1);
    const outwardNormal = (x, y) => {
      const dx = x - .5, dy = y - .5;
      const len = Math.max(.001, Math.hypot(dx, dy));
      return { nx: dx / len, ny: dy / len };
    };

    /* 종이 섬유는 윤곽을 따라 일렬로 그리지 않는다. 일부만 길고 일부는
       안쪽으로 꺾여 실제 뜯긴 단면처럼 흐트러지게 만든다. */
    const fibres = Array.from({ length: 34 }, () => {
      const index = Math.floor(edgeSeeded() * GATE_TEAR.length);
      const [x, y] = GATE_TEAR[index];
      const normal = outwardNormal(x, y);
      return {
        x, y, nx: normal.nx, ny: normal.ny,
        length: .012 + edgeSeeded() * .040,
        side: edgeSeeded() > .28 ? 1 : -1,
        bend: (edgeSeeded() - .5) * .018,
      };
    });

    /* 찢김의 바깥쪽에서 작은 입자들이 흘러나온다. 둥근 구멍의 방사형 법선을
       따라 움직이므로 별이 경계 밖으로 샌다. */
    const leaks = Array.from({ length: 20 }, () => GATE_TEAR[Math.floor(leakSeeded() * GATE_TEAR.length)])
      .map(([x, y]) => {
        const normal = outwardNormal(x, y);
        return {
          x, y, nx: normal.nx, ny: normal.ny,
          phase: leakSeeded(), speed: .18 + leakSeeded() * .22,
          size: .42 + leakSeeded() * .70, bend: (leakSeeded() - .5) * .024,
        };
      });

    function drawTornEdge(c, w, h, S) {
      c.save();
      c.lineJoin = 'round';
      c.strokeStyle = 'rgba(230, 220, 195, .30)';
      c.lineWidth = .55;
      c.beginPath();
      GATE_TEAR.forEach(([x, y], index) => {
        if (index === 0) c.moveTo(x * w, y * h); else c.lineTo(x * w, y * h);
      });
      c.closePath();
      c.stroke();

      fibres.forEach((fibre) => {
        const x = fibre.x * w, y = fibre.y * h;
        const length = fibre.length * S * fibre.side;
        const bendX = -fibre.ny * fibre.bend * S;
        const bendY = fibre.nx * fibre.bend * S;
        c.strokeStyle = fibre.side > 0 ? 'rgba(237, 228, 207, .36)' : 'rgba(18, 17, 20, .46)';
        c.lineWidth = fibre.side > 0 ? .48 : .72;
        c.beginPath();
        c.moveTo(x, y);
        c.quadraticCurveTo(x + fibre.nx * length * .45 + bendX, y + fibre.ny * length * .45 + bendY,
          x + fibre.nx * length, y + fibre.ny * length);
        c.stroke();
      });
      c.restore();
    }

    function drawLeaks(c, w, h, S, near) {
      leaks.forEach((leak) => {
        const travel = (state.t * leak.speed + leak.phase) % 1;
        const distance = S * (.008 + travel * .065);
        const x = leak.x * w + leak.nx * distance;
        const y = leak.y * h + leak.ny * distance;
        const bendX = leak.ny * leak.bend * S;
        const bendY = -leak.nx * leak.bend * S;
        c.save();
        c.globalAlpha = .28 + near * .34;
        c.strokeStyle = rgba(T.gold, .32);
        c.lineWidth = .38;
        c.beginPath();
        c.moveTo(leak.x * w, leak.y * h);
        c.quadraticCurveTo((leak.x * w + x) / 2 + bendX, (leak.y * h + y) / 2 + bendY, x, y);
        c.stroke();
        star(c, x, y, leak.size, leak.size > .8 ? T.gold : T.ink, .48 + near * .24, S * .014, .12, T);
        c.restore();
      });
    }

    function clipGate(c, w, h) {
      c.beginPath();
      GATE_TEAR.forEach(([x, y], i) => {
        if (i === 0) c.moveTo(x * w, y * h);
        else c.lineTo(x * w, y * h);
      });
      c.closePath();
      c.clip();
    }

    function frame(dt) {
      if (!state.w) return;
      const c = canvas.getContext('2d');
      const { w, h } = state;
      const S = Math.min(w, h);
      c.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
      c.clearRect(0, 0, w, h);

      state.near = lerp(state.near, state.nearTarget, Math.min(1, dt * 4) || 1);
      const near = state.near;

      /* 배경과 먼 별은 찢어진 종이 안에만 남긴다. */
      c.save();
      clipGate(c, w, h);

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
      c.restore();

      drawTornEdge(c, w, h, S);
      drawLeaks(c, w, h, S, near);

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
    });
    gate.addEventListener('pointerenter', () => { state.nearTarget = 1; });
    gate.addEventListener('focus', () => { state.nearTarget = 1; });

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

    let last = 0;
    function loop(now) {
      const dt = last ? Math.min(.05, (now - last) / 1000) : 0;
      last = now;
      state.t += dt;
      frame(dt);
      requestAnimationFrame(loop);
    }

    observe([canvas], () => { resize(); frame(0); });
    window.addEventListener('resize', () => { resize(); frame(0); });
    resize();
    if (prefersReduced()) frame(1); else requestAnimationFrame(loop);
  }

  /* 실제 종이 재질 자산을 쓰는 홈 진입점. 이전의 작은 캔버스 창 대신
     서로 다른 찢김 사진과 난수 배치를 조합한다. 자산 자체에 찢긴 섬유,
     말린 종이, 구멍 밖의 별/혜성 꼬리가 있어 종이 위젯으로 읽히지 않는다. */
  function initGateway() {
    const field = document.querySelector('[data-gate-field]');
    const gate = document.querySelector('[data-gate]');
    const art = document.querySelector('[data-gate-art]');
    const burstCanvas = document.querySelector('[data-gate-burst]');
    if (!field || !gate || !art) return;

    const cfg = document.getElementById('nebula-config');
    const target = (cfg ? (JSON.parse(cfg.textContent || '{}').target || '') : '') || 'nebula-transit.html';
    const random = rng((Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0);
    const variants = [
      { src:'assets/gateway/torn-portal-wide-v1.png', scale:1.04, glint:[65,45] },
      { src:'assets/gateway/torn-portal-trail-v1.png', scale:1.07, glint:[57,52] },
      { src:'assets/gateway/torn-portal-diagonal-v1.png', scale:1.03, glint:[62,42] },
    ];
    const variant = variants[Math.floor(random() * variants.length)];
    const profile = { lane:Math.floor(random() * 3), size:.92 + random() * .24, rotation:(random() - .5) * 12 };
    art.src = variant.src;
    art.style.setProperty('--gate-art-scale', String(variant.scale));
    field.dataset.variant = String(profile.lane);
    field.style.setProperty('--gate-glint-x', `${variant.glint[0]}%`);
    field.style.setProperty('--gate-glint-y', `${variant.glint[1]}%`);

    /* 텍스트/지표와 겹치지 않는 홈 여백 세 곳만 후보로 둔다. 해상도별로 같은
       여백을 다시 계산하므로 폴드·폰·태블릿·노트북에서도 위치가 무너지지 않는다. */
    function placeGateway() {
      const w = window.innerWidth;
      let lanes;
      if (w <= 390) {
        lanes = [[55,84], [62,88], [49,90]];
      } else if (w <= 640) {
        lanes = [[55,85], [62,89], [49,91]];
      } else if (w <= 1200) {
        lanes = [[67,72], [68,78], [67,57]];
      } else {
        lanes = [[61.5,71], [62.5,78], [63,53]];
      }
      const base = w <= 390 ? .77 : w <= 640 ? .74 : w <= 1200 ? .30 : .22;
      const min = w <= 390 ? 218 : w <= 640 ? 238 : w <= 1200 ? 270 : 290;
      const max = w <= 390 ? 290 : w <= 640 ? 350 : w <= 1200 ? 395 : 420;
      const size = Math.max(min, Math.min(max, w * base * profile.size));
      field.style.setProperty('--gate-size', `${Math.round(size)}px`);
      field.style.setProperty('--gate-rot', `${profile.rotation.toFixed(2)}deg`);

      /* 장식의 투명 영역도 버튼이므로 실제 v2 버튼·지표와 한 픽셀도 겹치지
         않아야 한다. 난수 후보를 순환하며 렌더된 클릭 영역 기준으로 고른다. */
      const blockers = Array.from(document.querySelectorAll('.hero-btns > *, .hero-stats > *'));
      const intersects = (a, b) => a.left < b.right + 10 && a.right > b.left - 10 && a.top < b.bottom + 10 && a.bottom > b.top - 10;
      for (let step = 0; step < lanes.length; step++) {
        const lane = lanes[(profile.lane + step) % lanes.length];
        field.style.setProperty('--gate-x', `${lane[0]}%`);
        field.style.setProperty('--gate-y', `${lane[1]}%`);
        const box = field.getBoundingClientRect();
        if (blockers.every((blocker) => !intersects(box, blocker.getBoundingClientRect()))) return;
      }

      /* 극도로 좁거나 폴드가 열린 비율처럼 후보가 모두 만나는 경우에만 한 단계
         줄인 뒤 다시 찾는다. 이름·버튼을 가리는 것보다 진입점을 작게 두는 편이 낫다. */
      field.style.setProperty('--gate-size', `${Math.round(size * .82)}px`);
      for (let step = 0; step < lanes.length; step++) {
        const lane = lanes[(profile.lane + step) % lanes.length];
        field.style.setProperty('--gate-x', `${lane[0]}%`);
        field.style.setProperty('--gate-y', `${lane[1]}%`);
        const box = field.getBoundingClientRect();
        if (blockers.every((blocker) => !intersects(box, blocker.getBoundingClientRect()))) return;
      }
    }
    placeGateway();
    window.addEventListener('resize', placeGateway, { passive:true });

    /* 종이 바깥에서도 고개를 아주 작게 돌린다. 과한 반복 애니메이션 대신
       사용자가 가까이 왔을 때만 공간감이 생긴다. */
    window.addEventListener('pointermove', (event) => {
      const box = field.getBoundingClientRect();
      const dx = Math.max(-1, Math.min(1, (event.clientX - (box.left + box.width / 2)) / Math.max(1, window.innerWidth * .5)));
      const dy = Math.max(-1, Math.min(1, (event.clientY - (box.top + box.height / 2)) / Math.max(1, window.innerHeight * .5)));
      art.style.setProperty('--gate-shift-x', `${(dx * 5).toFixed(2)}px`);
      art.style.setProperty('--gate-shift-y', `${(dy * 4).toFixed(2)}px`);
    }, { passive:true });

    /* 진입은 단순 확대가 아니라, 찢긴 가장자리 밖에 있던 별가루·짧은 선들이
       안쪽으로 빨려 들어가며 우주가 자리를 차지하는 한 번의 사건이다. 캔버스는
       이 순간에만 살아나므로 홈 화면을 계속 산만하게 만들지 않는다. */
    let burstFrame = 0;
    function drawEntryBurst(origin) {
      if (!burstCanvas || prefersReduced()) return;
      cancelAnimationFrame(burstFrame);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = window.innerWidth, h = window.innerHeight;
      burstCanvas.width = Math.max(1, Math.round(w * dpr));
      burstCanvas.height = Math.max(1, Math.round(h * dpr));
      const ctx = burstCanvas.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const particleRandom = rng((Date.now() ^ Math.floor(origin.x * 71 + origin.y * 131)) >>> 0);
      const particles = Array.from({ length:96 }, (_, index) => {
        const angle = particleRandom() * Math.PI * 2;
        return {
          angle, distance:72 + Math.pow(particleRandom(), .46) * Math.min(Math.max(w, h) * .48, 610),
          size:index % 13 === 0 ? 2.9 : .55 + particleRandom() * 1.5,
          warm:index % 4 !== 0, delay:particleRandom() * .18, twist:(particleRandom() - .5) * .68,
        };
      });
      const start = performance.now();
      burstCanvas.classList.add('is-active');

      function easeInQuint(value) { return value * value * value * value * value; }
      function easeOutQuart(value) { return 1 - Math.pow(1 - value, 4); }
      function frame(now) {
        const elapsed = Math.max(0, (now - start) / 1120);
        const progress = Math.min(1, elapsed);
        ctx.clearRect(0, 0, w, h);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        /* 얇은 궤적은 처음에는 종이 바깥으로 퍼져 있다가, 중앙의 찢긴 면에
           합쳐진다. 원형 링은 쓰지 않아 구멍이 인공적인 포털처럼 보이지 않는다. */
        particles.forEach((particle) => {
          const local = Math.max(0, Math.min(1, (progress - particle.delay) / (1 - particle.delay)));
          const pull = easeInQuint(local);
          const radius = particle.distance * (1 - pull) + 5 * pull;
          const angle = particle.angle + particle.twist * (1 - local) * Math.sin(local * Math.PI);
          const x = origin.x + Math.cos(angle) * radius;
          const y = origin.y + Math.sin(angle) * radius * .68;
          const tailRadius = radius + Math.max(9, particle.distance * (.045 + .11 * (1 - local)));
          const tailX = origin.x + Math.cos(angle - particle.twist * .35) * tailRadius;
          const tailY = origin.y + Math.sin(angle - particle.twist * .35) * tailRadius * .68;
          const alpha = (1 - easeOutQuart(Math.max(0, (progress - .55) / .45))) * (.32 + particle.size * .16);
          ctx.strokeStyle = particle.warm
            ? `rgba(245, 204, 119, ${alpha.toFixed(3)})`
            : `rgba(179, 206, 255, ${(alpha * .82).toFixed(3)})`;
          ctx.lineWidth = particle.size > 2 ? 1.25 : .55;
          ctx.beginPath(); ctx.moveTo(tailX, tailY); ctx.lineTo(x, y); ctx.stroke();
          ctx.fillStyle = particle.warm
            ? `rgba(255, 232, 174, ${(alpha * 1.6).toFixed(3)})`
            : `rgba(207, 224, 255, ${(alpha * 1.35).toFixed(3)})`;
          ctx.beginPath(); ctx.arc(x, y, particle.size * (1 - local * .42), 0, Math.PI * 2); ctx.fill();
        });

        /* 한두 개의 큰 별은 화면 바깥까지 선을 남긴다. 사용자가 요청한
           ‘구멍 밖으로 새는 별’이 클릭 순간에는 궤적으로 이어진다. */
        const flare = Math.sin(Math.min(1, progress * 1.65) * Math.PI);
        for (let i = 0; i < 5; i++) {
          const angle = (i / 5) * Math.PI * 2 + .36;
          const length = 130 + i * 42 + progress * 215;
          const x = origin.x + Math.cos(angle) * length;
          const y = origin.y + Math.sin(angle) * length * .58;
          const gradient = ctx.createLinearGradient(origin.x, origin.y, x, y);
          gradient.addColorStop(0, `rgba(255,234,182,${(flare * .78).toFixed(3)})`);
          gradient.addColorStop(1, 'rgba(255,234,182,0)');
          ctx.strokeStyle = gradient; ctx.lineWidth = 1.05;
          ctx.beginPath(); ctx.moveTo(origin.x, origin.y); ctx.lineTo(x, y); ctx.stroke();
        }
        ctx.restore();

        if (progress < 1) burstFrame = requestAnimationFrame(frame);
        else {
          burstCanvas.classList.remove('is-active');
          ctx.clearRect(0, 0, w, h);
        }
      }
      burstFrame = requestAnimationFrame(frame);
    }

    const veil = document.createElement('div');
    veil.className = 'gate-veil';
    document.body.append(veil);
    let entering = false;

    /* 진입점을 리셋한다. 클릭 뒤 v2로 되돌아오면(뒤로 가기, bfcache 복원)
       gate.disabled와 is-opening이 그대로 남아 진입점이 다시는 눌리지 않는
       것처럼 보이는 원인이었다. 페이지가 다시 보일 때마다 원상태로 되돌린다. */
    function resetGate() {
      entering = false;
      gate.disabled = false;
      field.classList.remove('is-opening');
      veil.classList.remove('open');
      if (burstCanvas) burstCanvas.classList.remove('is-active');
    }

    gate.addEventListener('click', () => {
      if (entering) return;
      entering = true;
      gate.disabled = true;
      const box = gate.getBoundingClientRect();
      playGatewayEnterSfx();
      veil.style.setProperty('--gx', `${box.left + box.width / 2}px`);
      veil.style.setProperty('--gy', `${box.top + box.height / 2}px`);
      field.classList.add('is-opening');
      drawEntryBurst({ x:box.left + box.width / 2, y:box.top + box.height / 2 });
      veil.classList.add('open');
      /* v2→v3 진입은 기존 1.2초보다 훨씬 길게 늘여 약 4초로 잡는다.
         새 게이트웨이 전용 사운드(비확정 후보, SFX-06 B와는 다른 방향)의
         잔향과 화면 전환이 같은 끝점에서 만나야 한다. */
      window.setTimeout(() => { window.location.href = target; }, prefersReduced() ? 200 : 4000);
    });

    /* bfcache로 복원되거나(pageshow persisted), 탭이 다시 보이게 될 때도
       같은 이유로 리셋한다. v2 홈의 진입점이 다시는 반응하지 않는 문제의 대응. */
    window.addEventListener('pageshow', (event) => { if (event.persisted) resetGate(); });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && gate.disabled) resetGate();
    });
  }

  const page = document.body.dataset.page;
  if (page === 'nebula-keyvisual') initKeyvisual();
  if (page === 'nebula-transit') initTransit();
  if (page === 'nebula-gateway') initGateway();
})();
