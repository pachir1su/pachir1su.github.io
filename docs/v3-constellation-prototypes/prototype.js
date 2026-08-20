/* Shared data and interaction engine for the approved v3 constellation prototypes. */
(() => {
  'use strict';

  const languageState = { current:localStorage.getItem('lang') === 'en' ? 'en' : 'ko' };
  const uiText = {
    ko:{
      firstStar:'첫 번째 별에서 시작합니다', viewingRecord:'{year} 기록을 보고 있습니다', constellationComplete:'별자리 완성',
      records:'{count}개의 기록', projectRecord:'프로젝트 기록', detailRecord:'상세 기록 확인', openDetail:'{title} 상세 기록 열기',
      lostOrbit:'궤도 이탈', supernovaRemnant:'초신성 잔해', vanishedStar:'소실된 별', area51:'제51구역',
      area51Description:'격리된 실험 기록', soundStop:'소리 끄기 ×', soundStopLabel:'재생 중인 소리 끄기',
    },
    en:{
      firstStar:'Begin with the first star', viewingRecord:'Viewing the {year} record', constellationComplete:'Constellation complete',
      records:'{count} records', projectRecord:'Project record', detailRecord:'Open full record', openDetail:'Open the {title} record',
      lostOrbit:'Orbital departure', supernovaRemnant:'Supernova remnant', vanishedStar:'Vanished star', area51:'Area 51',
      area51Description:'Isolated experiment record', soundStop:'Mute ×', soundStopLabel:'Mute the playing sound',
    },
  };
  const growthEvents = [
    { year:'2024', title:{ko:'해안 장벽 MVP 제작',en:'Coastal Barrier MVP'}, detail:{ko:'4인 팀 · 아두이노 개발 총괄',en:'4-person team · Arduino development lead'} },
    { year:'2024', title:{ko:'천안학생로봇대회 동상',en:'Cheonan Student Robot Contest Bronze'}, detail:{ko:'허스키렌즈 기반 졸음 감지 시스템',en:'HuskyLens-based drowsiness detection system'} },
    { year:'2025', title:{ko:'NFC 출석 시스템',en:'NFC Attendance System'}, detail:{ko:'6인 팀 · 팀장',en:'Team lead · 6-person team'} },
    { year:'2025', title:{ko:'면진봇 공개',en:'MZ Bot Released'}, detail:{ko:'Discord 경제 시뮬레이션 봇 · 1인 개발',en:'Discord economy simulation bot · Solo development'} },
    { year:'2026', title:{ko:'코리아텍 통합 알림 시스템',en:'KOREATECH Unified Alert System'}, detail:{ko:'공지·메일·셔틀·학식·도서관 통합 운영',en:'Unified notices, mail, shuttle, cafeteria, and library operations'} },
    { year:'2026', title:{ko:'Raspberry Pi 운영',en:'Raspberry Pi Operations'}, detail:{ko:'실사용 서비스의 장시간 운용과 안정화',en:'Long-running production service operation and stabilization'} },
    { year:'2026', title:{ko:'U-CAST 5팀 멘토링',en:'U-CAST Team 5 Mentoring'}, detail:{ko:'요구사항·상태 설계·배선 디버깅 지원',en:'Requirements, state design, and wiring debugging support'} },
    { year:'2026', title:{ko:'로컬임팩트상',en:'Local Impact Award'}, detail:{ko:'천안 청소년 도시재생 챌린지',en:'Cheonan Youth Urban Regeneration Challenge'} },
  ];
  const growthPoints = [[9,68],[23,39],[37,63],[49,27],[61,51],[72,20],[84,48],[92,75]];
  const introConstellations = [
    {
      id:'dipper',
      points:[[125,370],[250,330],[365,360],[480,315],[650,245],[810,340],[620,435]],
      edges:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,3]],
    },
    {
      id:'scorpio',
      points:[[135,170],[245,250],[320,185],[350,300],[430,380],[530,440],[650,445],[750,395],[810,315],[850,235],[910,275],[925,205]],
      edges:[[0,1],[2,1],[1,3],[3,4],[4,5],[5,6],[6,7],[7,8],[8,9],[9,10],[9,11]],
    },
  ];
  const zodiacGlyphs = [
    { points:[[8,48],[28,17],[48,45],[70,16],[92,48]], edges:[[0,1],[1,2],[2,3],[3,4]] },
    { points:[[15,18],[34,36],[50,68],[66,36],[85,18],[50,68],[50,94]], edges:[[0,1],[1,2],[2,3],[3,4],[2,5],[5,6]] },
    { points:[[22,15],[22,82],[78,15],[78,82],[22,48],[78,48]], edges:[[0,1],[2,3],[4,5]] },
    { points:[[18,25],[50,15],[82,28],[68,52],[87,78],[50,67],[13,78],[32,52],[18,25]], edges:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8]] },
    { points:[[12,62],[35,35],[62,22],[88,40],[72,70],[40,82],[12,62]], edges:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6]] },
    { points:[[18,18],[42,37],[55,15],[51,64],[28,88],[76,87]], edges:[[0,1],[1,2],[1,3],[3,4],[3,5]] },
    { points:[[12,47],[88,47],[26,25],[74,25],[32,70],[68,70]], edges:[[0,1],[2,3],[4,5]] },
    { points:[[12,18],[31,34],[46,55],[62,73],[80,62],[91,39],[78,22]], edges:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6]] },
    { points:[[15,82],[38,62],[58,42],[78,20],[72,49],[91,68]], edges:[[0,1],[1,2],[2,3],[2,4],[4,5]] },
    { points:[[13,30],[36,18],[58,36],[79,20],[89,49],[65,76],[34,82],[13,30]], edges:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7]] },
    { points:[[12,31],[34,44],[52,27],[72,41],[91,24],[30,72],[52,58],[74,73]], edges:[[0,1],[1,2],[2,3],[3,4],[5,6],[6,7]] },
    { points:[[12,28],[35,45],[51,30],[66,48],[88,34],[67,72],[46,61],[25,77]], edges:[[0,1],[1,2],[2,3],[3,4],[3,5],[5,6],[6,7]] },
  ];
  const fallbackGroups = [
    { id:'2026', kind:'year', label:'2026', cards:[
      {title:'GitHub Rank Insight',subtitle:{ko:'GitHub Stats 등급 분석기',en:'GitHub Stats rank analyzer'},role:{ko:'1인 개발 · 전 과정',en:'Solo development · Full process'}},
      {title:{ko:'코리아텍 통합 알림 시스템',en:'KOREATECH Unified Alert System'},subtitle:{ko:'공지·개인 메일·셔틀·학식·도서관 통합 알림',en:'Unified campus notices, mail, shuttle, cafeteria, and library alerts'},role:{ko:'1인 개발',en:'Solo development'}},
      {title:'Daily Report AI',subtitle:{ko:'Gemini 기반 디스코드 아침 브리핑 봇',en:'Gemini-based Discord morning briefing bot'},role:{ko:'팀장 · 3인 팀',en:'Team lead · 3-person team'}},
      {title:'MultiMind',subtitle:{ko:'여러 LLM을 동시에 조작하는 오케스트레이터',en:'Orchestrator controlling multiple LLMs'},role:{ko:'1인 개발',en:'Solo development'}},
      {title:{ko:'2026 U-CAST 「멈춰!」',en:'2026 U-CAST “Stop!”'},subtitle:{ko:'돌발 보행자 감지 경고 시스템',en:'Sudden pedestrian detection warning system'},role:{ko:'5팀 멘토',en:'Team 5 mentor'}},
    ]},
    { id:'2025', kind:'year', label:'2025', cards:[
      {title:{ko:'NFC 출석 체크 시스템',en:'NFC Attendance System'},subtitle:{ko:'NFC 태그 기반 자동 출석 체크 IoT',en:'NFC tag-based automatic attendance IoT'},role:{ko:'팀장 · 6인 팀',en:'Team lead · 6-person team'}},
      {title:{ko:'식물 타이머',en:'Plant Timer'},subtitle:{ko:'식물 관리 스마트 타이머',en:'Smart plant-care timer'},role:{ko:'1인 개발',en:'Solo development'}},
      {title:{ko:'헬스 케어 시스템',en:'Health Care System'},subtitle:{ko:'건강 데이터 기록·모니터링 시스템',en:'Health data logging and monitoring system'},role:{ko:'팀장 · 4인 팀',en:'Team lead · 4-person team'}},
      {title:{ko:'면진봇',en:'MZ Bot'},subtitle:{ko:'Discord 경제 시뮬레이션 봇',en:'Discord economy simulation bot'},role:{ko:'1인 개발',en:'Solo development'}},
    ]},
    { id:'2024', kind:'year', label:'2024', cards:[
      {title:{ko:'해안 장벽 프로젝트',en:'Coastal Barrier Project'},subtitle:{ko:'해수면 상승 대비 수조 기반 MVP',en:'Tank-based MVP for rising sea levels'},role:{ko:'아두이노 개발 총괄 · 4인 팀',en:'Arduino development lead · 4-person team'}},
      {title:{ko:'졸음 방지 시스템',en:'Drowsiness Prevention System'},subtitle:{ko:'허스키렌즈 실시간 졸음 감지',en:'HuskyLens real-time drowsiness detection'},role:{ko:'아두이노 개발 · 2인 팀',en:'Arduino development · 2-person team'}},
      {title:{ko:'비밀번호 도어락',en:'Password Door Lock'},subtitle:{ko:'4×4 키패드 기반 장치',en:'4×4 keypad-based device'},role:{ko:'팀장 · 4인 팀',en:'Team lead · 4-person team'}},
    ]},
    { id:'wip', kind:'wip', label:{ko:'진행 중·예정',en:'In progress · Planned'}, cards:[
      {title:{ko:'한맵',en:'Koreatech Map'},subtitle:{ko:'KOREATECH 캠퍼스 인터랙티브 지도',en:'Interactive KOREATECH campus map'},role:{ko:'기획 단계',en:'Planning'}},
      {title:{ko:'승기봇',en:'SG Bot'},subtitle:{ko:'면진봇 개편판 미니게임 봇',en:'Rebuilt MZ Bot mini-game bot'},role:{ko:'개발 중',en:'In development'}},
      {title:'CentrifugeAI',subtitle:{ko:'Gemini 가상 과학 실험실',en:'Gemini virtual science laboratory'},role:{ko:'마무리 단계',en:'Finalizing'}},
    ]},
    { id:'failed', kind:'failed', label:{ko:'실패한 프로젝트',en:'Failed projects'}, cards:[
      {title:'InfoCatch',subtitle:{ko:'AI 뉴스 요약 웹 애플리케이션',en:'AI news summarization web app'},failedReason:{ko:'AI 구현 실패 · 당시 웹서버 구축 경험 부족',en:'AI implementation failed · Lacked web-server experience at the time'}},
      {title:'InvestAI',subtitle:{ko:'Fear/Greed 지표 웹 위젯',en:'Fear/Greed index web widget'},failedReason:{ko:'API 연동 실패',en:'API integration failed'}},
      {title:{ko:'건영운세',en:'GY Fortune'},subtitle:{ko:'날짜 기반 운세 생성 웹앱',en:'Date-based fortune generator'},failedReason:{ko:'운세 로직 구현 실패',en:'Fortune logic implementation failed'}},
      {title:{ko:'한기대 지도 (초기 버전)',en:'KOREATECH Map (Early Ver.)'},subtitle:{ko:'캠퍼스 내부 지도 데이터 수집 프로젝트',en:'Campus indoor map data collection project'},failedReason:{ko:'데이터 수집 난이도 · AI 지도 변환 실패',en:'Data collection difficulty · AI map conversion failed'}},
      {title:'BrawlCraft',subtitle:{ko:'탐사·조합·전투 웹 게임',en:'Exploration, crafting, and combat web game'},failedReason:{ko:'최적화·디자인 실패',en:'Optimization and design failed'}},
    ]},
  ];

  const pageType = document.body.dataset.page || 'unknown';
  const projectState = { groups:fallbackGroups, visited:new Set(), current:'2026' };
  const sequenceState = { expected:1, complete:false, drag:null, status:{key:'firstStar',values:{}} };
  const audioState = { context:null, nodes:[], stopTimer:0 };
  let bootComplete = false;

  /* Utility helpers keep malformed optional data from breaking the mockup. */
  function localText(value, language=languageState.current) {
    if (typeof value === 'string') return value;
    if (value && typeof value === 'object') return value[language] || value.ko || value.en || '';
    return '';
  }
  function plainText(value) {
    const shell = document.createElement('div');
    shell.innerHTML = localText(value);
    return shell.textContent.trim();
  }
  function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
  function translate(key, values={}) {
    let output = uiText[languageState.current]?.[key] || uiText.ko[key] || key;
    Object.entries(values).forEach(([name,value]) => { output = output.replaceAll(`{${name}}`, String(value)); });
    return output;
  }
  function reducedMotion() { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  function svgElement(name, attributes={}) {
    const node = document.createElementNS('http://www.w3.org/2000/svg', name);
    Object.entries(attributes).forEach(([key,value]) => node.setAttribute(key, String(value)));
    return node;
  }

  /* v2's bilingual contract remains, while theme selection stays system-only. */
  function applyStaticLanguage() {
    const language = languageState.current;
    document.documentElement.lang = language;
    document.querySelectorAll('[data-ko][data-en]').forEach((node) => {
      node.textContent = language === 'en' ? node.dataset.en : node.dataset.ko;
    });
    document.querySelectorAll('[data-ko-html][data-en-html]').forEach((node) => {
      node.innerHTML = language === 'en' ? node.dataset.enHtml : node.dataset.koHtml;
    });
    document.querySelectorAll('[data-language-switch]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.languageSwitch === language));
    });
    document.querySelectorAll('[data-sound-stop]').forEach((button) => {
      button.textContent = translate('soundStop');
      button.setAttribute('aria-label', translate('soundStopLabel'));
    });
  }
  function refreshLocalizedViews() {
    refreshGrowthLanguage();
    if (pageType === 'story' || pageType === 'celestial') {
      renderProjectArchive();
      renderLostStarArchive();
    }
    if (pageType === 'atlas') {
      createAtlasStations();
      renderArea51Records();
      document.querySelector('[data-atlas-drawer]')?.classList.remove('open');
    }
    if (pageType === 'celestial') refreshOrreryLanguage();
  }
  function setLanguage(language) {
    languageState.current = language === 'en' ? 'en' : 'ko';
    localStorage.setItem('lang', languageState.current);
    applyStaticLanguage();
    if (bootComplete) refreshLocalizedViews();
  }
  function initLanguage() {
    document.querySelectorAll('[data-language-switch]').forEach((button) => {
      button.addEventListener('click', () => setLanguage(button.dataset.languageSwitch));
    });
    applyStaticLanguage();
  }

  /* Canvas gives the first scene depth while remaining dependency-free on GitHub Pages. */
  function createCosmosCanvases() {
    document.querySelectorAll('[data-cosmos-canvas]').forEach((canvas, canvasIndex) => {
      const context = canvas.getContext('2d');
      if (!context) return;
      const pattern = introConstellations[Math.random() < .5 ? 0 : 1];
      const state = {
        width:0,
        height:0,
        dpr:1,
        visible:true,
        frame:0,
        lastFrame:0,
        started:performance.now(),
        pointerX:0,
        pointerY:0,
        targetX:0,
        targetY:0,
      };
      let seed = 1741 + canvasIndex * 307;
      const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
      const stars = Array.from({ length:190 }, (_, index) => ({
        x:random(),
        y:random(),
        radius:.35 + random() * (index % 17 === 0 ? 2.1 : 1.05),
        alpha:.1 + random() * .48,
        depth:.18 + random() * .82,
        phase:random() * Math.PI * 2,
      }));

      const resize = () => {
        const bounds = canvas.getBoundingClientRect();
        state.dpr = Math.min(window.devicePixelRatio || 1, 2);
        state.width = Math.max(1, bounds.width);
        state.height = Math.max(1, bounds.height);
        canvas.width = Math.round(state.width * state.dpr);
        canvas.height = Math.round(state.height * state.dpr);
        context.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
      };

      const mapPoint = ([sourceX,sourceY]) => {
        const desktop = state.width > 760;
        const left = desktop ? .47 : .08;
        const top = desktop ? .07 : .025;
        const width = desktop ? .5 : .84;
        const height = desktop ? .78 : .49;
        return [
          state.width * (left + sourceX / 1000 * width) + state.pointerX * 18,
          state.height * (top + sourceY / 680 * height) + state.pointerY * 13,
        ];
      };

      const draw = (time) => {
        state.frame = 0;
        if (!state.visible) return;
        if (time - state.lastFrame < 30 && !reducedMotion()) {
          state.frame = requestAnimationFrame(draw);
          return;
        }
        state.lastFrame = time;
        state.pointerX += (state.targetX - state.pointerX) * .055;
        state.pointerY += (state.targetY - state.pointerY) * .055;
        const styles = getComputedStyle(document.documentElement);
        const ink = styles.getPropertyValue('--ink').trim() || '#262637';
        const violet = styles.getPropertyValue('--violet').trim() || '#706994';
        const gold = styles.getPropertyValue('--gold').trim() || '#a9914d';
        const surface = styles.getPropertyValue('--surface-raised').trim() || '#f6f6fa';
        const elapsed = reducedMotion() ? 100000 : time - state.started;
        context.clearRect(0, 0, state.width, state.height);

        /* Three apparent depths create restrained pointer parallax and star scintillation. */
        stars.forEach((star) => {
          const pulse = reducedMotion() ? 1 : .78 + Math.sin(time * .00055 + star.phase) * .22;
          const x = star.x * state.width + state.pointerX * star.depth * 17;
          const y = star.y * state.height + state.pointerY * star.depth * 13;
          context.globalAlpha = star.alpha * pulse;
          context.fillStyle = star.depth > .72 ? gold : violet;
          context.beginPath();
          context.arc(x, y, star.radius, 0, Math.PI * 2);
          context.fill();
        });

        /* Constellation stars arrive independently before their edges are drawn. */
        pattern.edges.forEach(([from,to], edgeIndex) => {
          const progress = clamp((elapsed - 820 - edgeIndex * 145) / 620, 0, 1);
          if (progress <= 0) return;
          const [x1,y1] = mapPoint(pattern.points[from]);
          const [x2,y2] = mapPoint(pattern.points[to]);
          const eased = 1 - Math.pow(1 - progress, 3);
          const gradient = context.createLinearGradient(x1,y1,x2,y2);
          gradient.addColorStop(0, violet);
          gradient.addColorStop(1, gold);
          context.globalAlpha = .56 * progress;
          context.strokeStyle = gradient;
          context.lineWidth = 1.15;
          context.beginPath();
          context.moveTo(x1,y1);
          context.lineTo(x1 + (x2 - x1) * eased, y1 + (y2 - y1) * eased);
          context.stroke();
        });

        pattern.points.forEach((point,index) => {
          const progress = clamp((elapsed - 180 - index * 92) / 420, 0, 1);
          if (progress <= 0) return;
          const [x,y] = mapPoint(point);
          const radius = (index % 4 === 0 ? 3.8 : 2.7) * (1 - Math.pow(1 - progress, 3));
          context.globalAlpha = .16 * progress;
          context.fillStyle = gold;
          context.beginPath();
          context.arc(x,y,radius * 4.6,0,Math.PI * 2);
          context.fill();
          context.globalAlpha = .96 * progress;
          context.fillStyle = surface;
          context.beginPath();
          context.arc(x,y,radius,0,Math.PI * 2);
          context.fill();
          context.globalAlpha = .86 * progress;
          context.strokeStyle = ink;
          context.lineWidth = .6;
          context.stroke();
        });
        context.globalAlpha = 1;
        if (!reducedMotion()) state.frame = requestAnimationFrame(draw);
      };

      const hero = canvas.parentElement;
      hero?.addEventListener('pointermove', (event) => {
        const bounds = hero.getBoundingClientRect();
        state.targetX = clamp((event.clientX - bounds.left) / bounds.width * 2 - 1, -1, 1);
        state.targetY = clamp((event.clientY - bounds.top) / bounds.height * 2 - 1, -1, 1);
        if (!state.frame && state.visible) state.frame = requestAnimationFrame(draw);
      }, { passive:true });
      hero?.addEventListener('pointerleave', () => { state.targetX = 0; state.targetY = 0; });
      new ResizeObserver(resize).observe(canvas);
      new IntersectionObserver(([entry]) => {
        state.visible = entry.isIntersecting;
        if (state.visible && !state.frame) state.frame = requestAnimationFrame(draw);
        if (!state.visible && state.frame) { cancelAnimationFrame(state.frame); state.frame = 0; }
      }, { rootMargin:'120px' }).observe(canvas);
      resize();
      state.frame = requestAnimationFrame(draw);
    });
  }

  /* Each refresh chooses one familiar silhouette without exposing its name in the interface. */
  function createIntroConstellation() {
    const sky = document.querySelector('[data-intro-sky]');
    const lineLayer = sky?.querySelector('[data-intro-lines]');
    const starLayer = sky?.querySelector('[data-intro-stars]');
    if (!sky || !lineLayer || !starLayer) return;
    const pattern = introConstellations[Math.random() < .5 ? 0 : 1];
    sky.dataset.pattern = pattern.id;
    lineLayer.replaceChildren(...pattern.edges.map(([from,to],index) => {
      const [x1,y1] = pattern.points[from], [x2,y2] = pattern.points[to];
      const line = svgElement('line',{x1,y1,x2,y2});
      line.style.animationDelay = `${.78 + index * .13}s`;
      return line;
    }));
    starLayer.replaceChildren(...pattern.points.map(([cx,cy],index) => {
      const circle = svgElement('circle',{cx,cy,r:index % 4 === 0 ? 9 : index % 2 === 0 ? 7 : 6});
      circle.style.animationDelay = `${.2 + index * .09}s`;
      return circle;
    }));
  }

  /* A deterministic field avoids layout changes between screenshots and reloads. */
  function createStarfields() {
    document.querySelectorAll('[data-starfield]').forEach((field, fieldIndex) => {
      let seed = 913 + fieldIndex * 97;
      const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
      for (let index = 0; index < 92; index += 1) {
        const star = document.createElement('i');
        star.className = 'ambient-star';
        star.style.left = `${random() * 100}%`;
        star.style.top = `${random() * 100}%`;
        star.style.setProperty('--opacity', String(.12 + random() * .37));
        star.style.setProperty('--scale', String(.7 + random() * 1.5));
        star.dataset.depth = String(.25 + random() * .75);
        field.append(star);
      }
    });
    if (!window.matchMedia('(pointer:fine)').matches || reducedMotion()) return;
    window.addEventListener('pointermove', (event) => {
      const x = (event.clientX / window.innerWidth - .5) * 2;
      const y = (event.clientY / window.innerHeight - .5) * 2;
      document.querySelectorAll('.ambient-star').forEach((star) => {
        const depth = Number(star.dataset.depth || .5);
        star.style.setProperty('--px', `${x * depth * 7}px`);
        star.style.setProperty('--py', `${y * depth * 5}px`);
      });
    }, { passive:true });
  }

  /* The temporary Web Audio score proves the gated 11-second experience without shipping an asset. */
  function ensureAudioContext() {
    if (!audioState.context) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return null;
      audioState.context = new AudioContextClass();
    }
    if (audioState.context.state === 'suspended') audioState.context.resume().catch(() => {});
    return audioState.context;
  }
  function registerAudioNode(node) { audioState.nodes.push(node); return node; }
  function stopAudio() {
    window.clearTimeout(audioState.stopTimer);
    audioState.nodes.forEach((node) => { try { node.stop?.(); node.disconnect?.(); } catch (_) { /* already stopped */ } });
    audioState.nodes = [];
    document.querySelectorAll('[data-sound-stop]').forEach((button) => { button.hidden = true; });
  }
  function revealSoundStop(duration) {
    document.querySelectorAll('[data-sound-stop]').forEach((button) => { button.hidden = false; });
    window.clearTimeout(audioState.stopTimer);
    audioState.stopTimer = window.setTimeout(stopAudio, duration + 500);
  }
  function playConstellationMusic() {
    const context = ensureAudioContext();
    if (!context) return;
    stopAudio();
    const musicDuration = 11;
    const noteSpacing = 1.15;
    const start = context.currentTime + .04;
    const master = registerAudioNode(context.createGain());
    master.gain.setValueAtTime(.0001, start);
    master.gain.exponentialRampToValueAtTime(.13, start + 1.1);
    master.gain.setValueAtTime(.13, start + 9.5);
    master.gain.exponentialRampToValueAtTime(.0001, start + musicDuration);
    master.connect(context.destination);
    const notes = [293.66,369.99,440,554.37,440,369.99,329.63,493.88];
    notes.forEach((frequency, index) => {
      const tone = registerAudioNode(context.createOscillator());
      const gain = registerAudioNode(context.createGain());
      const noteStart = start + index * noteSpacing;
      tone.type = index % 2 ? 'sine' : 'triangle';
      tone.frequency.setValueAtTime(frequency, noteStart);
      gain.gain.setValueAtTime(.0001, noteStart);
      gain.gain.exponentialRampToValueAtTime(.12, noteStart + .32);
      gain.gain.exponentialRampToValueAtTime(.0001, noteStart + 2.65);
      tone.connect(gain); gain.connect(master);
      tone.start(noteStart); tone.stop(noteStart + 2.75);
    });
    const pad = registerAudioNode(context.createOscillator());
    const padGain = registerAudioNode(context.createGain());
    pad.type = 'sine'; pad.frequency.value = 146.83;
    padGain.gain.setValueAtTime(.0001, start);
    padGain.gain.exponentialRampToValueAtTime(.055, start + 3);
    padGain.gain.exponentialRampToValueAtTime(.0001, start + musicDuration);
    pad.connect(padGain); padGain.connect(master); pad.start(start); pad.stop(start + musicDuration + .1);
    revealSoundStop(musicDuration * 1000);
  }
  function playEffect(kind) {
    const context = ensureAudioContext();
    if (!context) return;
    const start = context.currentTime + .02;
    const oscillator = registerAudioNode(context.createOscillator());
    const gain = registerAudioNode(context.createGain());
    oscillator.type = kind === 'danger' ? 'square' : 'sine';
    oscillator.frequency.setValueAtTime(kind === 'danger' ? 185 : 420, start);
    oscillator.frequency.exponentialRampToValueAtTime(kind === 'danger' ? 120 : 650, start + .22);
    gain.gain.setValueAtTime(.0001, start);
    gain.gain.exponentialRampToValueAtTime(kind === 'danger' ? .07 : .045, start + .03);
    gain.gain.exponentialRampToValueAtTime(.0001, start + .3);
    oscillator.connect(gain); gain.connect(context.destination); oscillator.start(start); oscillator.stop(start + .32);
    window.setTimeout(() => { audioState.nodes = audioState.nodes.filter((node) => node !== oscillator && node !== gain); }, 500);
  }

  /* Growth constellations share facts but expose each page's navigation model. */
  function createGrowthConstellations() {
    document.querySelectorAll('[data-growth-constellation]').forEach((container) => {
      const svg = svgElement('svg');
      svg.classList.add('growth-lines'); svg.setAttribute('viewBox', '0 0 100 100'); svg.setAttribute('preserveAspectRatio', 'none');
      growthPoints.slice(1).forEach((point, index) => {
        const previous = growthPoints[index];
        const line = svgElement('line');
        line.setAttribute('x1', previous[0]); line.setAttribute('y1', previous[1]); line.setAttribute('x2', point[0]); line.setAttribute('y2', point[1]);
        line.dataset.growthLine = String(index); svg.append(line);
      });
      const trace = svgElement('line',{x1:growthPoints[0][0],y1:growthPoints[0][1],x2:growthPoints[0][0],y2:growthPoints[0][1]});
      trace.classList.add('growth-trace'); trace.dataset.growthTrace = ''; svg.append(trace);
      container.append(svg);
      growthEvents.forEach((event, index) => {
        const [x,y] = growthPoints[index];
        const node = document.createElement('button');
        node.type = 'button'; node.className = 'growth-node'; node.dataset.growthIndex = String(index);
        node.style.setProperty('--x', `${x}%`); node.style.setProperty('--y', `${y}%`);
        node.setAttribute('aria-label', `${event.year} ${localText(event.title)}`);
        const label = document.createElement('span');
        label.className = `growth-label${index > 5 ? ' reverse' : ''}`; label.dataset.growthLabel = String(index);
        label.style.setProperty('--x', `${x}%`); label.style.setProperty('--y', `${y}%`);
        if (index > 5) label.style.left = `calc(${x}% - 210px)`;
        label.innerHTML = `<b>${event.year} · ${localText(event.title)}</b><small>${localText(event.detail)}</small>`;
        node.addEventListener('pointerdown', (pointerEvent) => {
          selectGrowthEvent(container,index);
          beginGrowthDrag(pointerEvent,container,index);
        });
        node.addEventListener('click', () => {
          selectGrowthEvent(container,index);
          if (index === sequenceState.expected) connectGrowthEvent(container,index);
        });
        container.append(node, label);
      });
      container.querySelector('[data-growth-index="0"]')?.classList.add('seen','selected');
      container.querySelector('[data-growth-label="0"]')?.classList.add('active');
    });
    updateSequenceStatus('firstStar');
  }
  function refreshGrowthLanguage() {
    document.querySelectorAll('[data-growth-constellation]').forEach((container) => {
      growthEvents.forEach((event,index) => {
        const node = container.querySelector(`[data-growth-index="${index}"]`);
        const label = container.querySelector(`[data-growth-label="${index}"]`);
        node?.setAttribute('aria-label', `${event.year} ${localText(event.title)}`);
        if (label) label.innerHTML = `<b>${event.year} · ${localText(event.title)}</b><small>${localText(event.detail)}</small>`;
      });
      const selected = Number(container.querySelector('.growth-node.selected')?.dataset.growthIndex || 0);
      const selectedEvent = growthEvents[selected];
      const summary = document.querySelector('[data-growth-summary]');
      if (summary && selectedEvent) summary.textContent = `${selectedEvent.year} · ${localText(selectedEvent.title)} — ${localText(selectedEvent.detail)}`;
    });
    updateSequenceStatus(sequenceState.status.key, sequenceState.status.values);
  }
  function selectGrowthEvent(container, index, options={}) {
    const event = growthEvents[index];
    if (!event) return false;
    container.querySelectorAll('.growth-node').forEach((node) => node.classList.toggle('selected', Number(node.dataset.growthIndex) === index));
    container.querySelectorAll('.growth-label').forEach((label) => label.classList.toggle('active', Number(label.dataset.growthLabel) === index));
    const summary = document.querySelector('[data-growth-summary]');
    if (summary) summary.textContent = `${event.year} · ${localText(event.title)} — ${localText(event.detail)}`;
    if (pageType === 'atlas') openAtlasDrawer(`${event.year} · ${localText(event.title)}`, localText(event.detail), 'GROWTH CONSTELLATION');
    if (!options.quietStatus && !sequenceState.complete && index !== sequenceState.expected) {
      updateSequenceStatus('viewingRecord',{year:event.year});
    }
    return true;
  }

  /* Each accepted step is drawn once from its source instead of appearing abruptly. */
  function revealGrowthConnection(line) {
    if (!line) return;
    line.classList.add('active');
    if (reducedMotion() || typeof line.animate !== 'function') return;
    let length = 100;
    try { length = Math.max(1,line.getTotalLength()); } catch (_) { /* SVG geometry may not be measurable before layout. */ }
    line.animate([
      { strokeDasharray:`${length} ${length}`, strokeDashoffset:length, opacity:.28 },
      { strokeDasharray:`${length} ${length}`, strokeDashoffset:0, opacity:.9 },
    ], { duration:760, easing:'cubic-bezier(.22,.72,.2,1)' });
  }

  /* The destination star answers the line with one restrained arrival pulse. */
  function pulseGrowthDestination(node) {
    if (!node || reducedMotion() || typeof node.animate !== 'function') return;
    node.animate([
      { transform:'scale(.82)', filter:'brightness(1)' },
      { transform:'scale(1.32)', filter:'brightness(1.2)', offset:.58 },
      { transform:'scale(1.18)', filter:'brightness(1)' },
    ], { duration:620, easing:'cubic-bezier(.2,.78,.24,1)' });
  }

  /* Selection is free; only the chronological path has an order. */
  function connectGrowthEvent(container, index) {
    if (sequenceState.complete || index !== sequenceState.expected) return false;
    const node = container.querySelector(`[data-growth-index="${index}"]`);
    if (!node) return false;
    node.classList.add('seen');
    document.querySelectorAll(`[data-growth-index="${index}"]`).forEach((node) => node.classList.add('seen'));
    document.querySelectorAll(`[data-growth-line="${index - 1}"]`).forEach(revealGrowthConnection);
    pulseGrowthDestination(node);
    sequenceState.expected += 1;
    if (sequenceState.expected === growthEvents.length) {
      sequenceState.complete = true;
      updateSequenceStatus('constellationComplete');
      playConstellationMusic();
    } else updateSequenceStatus('progress');
    return true;
  }
  function updateSequenceStatus(key='progress', values={}) {
    sequenceState.status = {key,values};
    document.querySelectorAll('[data-sequence-count]').forEach((node) => { node.textContent = `${sequenceState.expected} / ${growthEvents.length}`; });
    const message = key === 'progress' ? `${sequenceState.expected} / ${growthEvents.length}` : translate(key,values);
    document.querySelectorAll('[data-sequence-message]').forEach((node) => { node.textContent = message; });
  }
  function beginGrowthDrag(pointerEvent,container,index) {
    if (pointerEvent.pointerType === 'mouse' && pointerEvent.button !== 0) return;
    pointerEvent.stopPropagation();
    const sourceIndex = sequenceState.expected - 1;
    if (sequenceState.complete || sourceIndex < 0 || index !== sourceIndex) return;
    pointerEvent.preventDefault();
    const owner = pointerEvent.currentTarget;
    const trace = container.querySelector('[data-growth-trace]');
    if (!trace) return;
    sequenceState.drag = {
      pointerId:pointerEvent.pointerId,
      sourceIndex,
      owner,
      startX:pointerEvent.clientX,
      startY:pointerEvent.clientY,
      moved:false,
    };
    try { owner.setPointerCapture(pointerEvent.pointerId); } catch (_) { /* Window listeners still retain the drag. */ }
    container.classList.add('dragging'); owner.classList.add('drag-source'); trace.classList.add('active');
    const setTraceStart = (pointIndex) => {
      const [x,y] = growthPoints[pointIndex];
      trace.setAttribute('x1',x); trace.setAttribute('y1',y); trace.setAttribute('x2',x); trace.setAttribute('y2',y);
    };
    setTraceStart(sourceIndex);
    const move = (event) => {
      if (!sequenceState.drag || event.pointerId !== sequenceState.drag.pointerId) return;
      event.preventDefault();
      if (Math.hypot(event.clientX-sequenceState.drag.startX,event.clientY-sequenceState.drag.startY) > 5) sequenceState.drag.moved = true;
      const rect = container.getBoundingClientRect();
      trace.setAttribute('x2',clamp((event.clientX-rect.left)/rect.width*100,0,100));
      trace.setAttribute('y2',clamp((event.clientY-rect.top)/rect.height*100,0,100));
      const targetIndex = sequenceState.expected;
      if (targetIndex >= growthEvents.length) return;
      const target = container.querySelector(`[data-growth-index="${targetIndex}"]`);
      const targetRect = target.getBoundingClientRect();
      const distance = Math.hypot(event.clientX-(targetRect.left+targetRect.width/2),event.clientY-(targetRect.top+targetRect.height/2));
      if (distance <= Math.max(38,targetRect.width*.82) && connectGrowthEvent(container,targetIndex)) {
        selectGrowthEvent(container,targetIndex,{quietStatus:true});
        sequenceState.drag.sourceIndex = targetIndex;
        container.querySelectorAll('.drag-source').forEach((node) => node.classList.remove('drag-source'));
        target.classList.add('drag-source');
        setTraceStart(targetIndex);
        if (sequenceState.complete) finish();
      }
    };
    const finish = () => {
      if (!sequenceState.drag) return;
      try { owner.releasePointerCapture(sequenceState.drag.pointerId); } catch (_) { /* capture may already be released */ }
      sequenceState.drag = null; container.classList.remove('dragging'); trace.classList.remove('active');
      container.querySelectorAll('.drag-source').forEach((node) => node.classList.remove('drag-source'));
      window.removeEventListener('pointermove',move); window.removeEventListener('pointerup',finish); window.removeEventListener('pointercancel',finish);
    };
    window.addEventListener('pointermove',move,{passive:false});
    window.addEventListener('pointerup',finish);
    window.addEventListener('pointercancel',finish);
  }
  function initStoryScroll() {
    const shell = document.querySelector('.growth-scroll');
    if (!shell) return;
    let queued = false;
    const update = () => {
      queued = false;
      const rect = shell.getBoundingClientRect();
      const travel = Math.max(1, shell.offsetHeight - window.innerHeight);
      const progress = clamp(-rect.top / travel, 0, .999);
      const activeIndex = Math.min(growthEvents.length - 1, Math.floor(progress * growthEvents.length));
      shell.querySelectorAll('.growth-node').forEach((node,index) => node.classList.toggle('current', index === activeIndex));
    };
    window.addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(update); } }, { passive:true });
    update();
  }

  /* Project data uses projects.json when available and a factual fallback for standalone previews. */
  async function loadProjectGroups() {
    const configNode = document.querySelector('#prototype-config');
    if (!configNode) return fallbackGroups;
    try {
      const config = JSON.parse(configNode.textContent);
      const response = await fetch(config.source, { cache:'no-store' });
      if (!response.ok) throw new Error(`projects.json ${response.status}`);
      const payload = await response.json();
      const groups = payload.groups.map((group) => ({
        id:group.kind === 'year' ? group.year : group.kind,
        kind:group.kind,
        label:group.kind === 'year' ? group.year
          : group.kind === 'wip' ? {ko:localText(group.heading,'ko'),en:'In progress · Planned'}
          : group.kind === 'failed' ? {ko:localText(group.heading,'ko'),en:'Failed projects'}
          : group.heading,
        cards:(group.cards || []).map((card) => ({
          title:card.title,
          subtitle:card.subtitle || card.desc || card.descHtml,
          role:card.role || card.status || card.failedReason,
          failedReason:card.failedReason,
          tech:Array.isArray(card.tech) ? card.tech : [],
          detail:typeof card.detail === 'string' ? card.detail : '',
        })),
      })).filter((group) => group.label && group.cards.length);
      return groups.length ? groups : fallbackGroups;
    } catch (error) {
      console.info('Prototype uses embedded project fallback:', error.message);
      return fallbackGroups;
    }
  }
  function projectDetailHref(card) {
    const detail = (card.detail || '').replace(/^\.\//,'').replace(/^\/+/, '');
    if (!detail) return '';
    return /(^|\/)Wall_Sina\/?$/i.test(detail) ? 'wall-sina.html' : `../../${detail}`;
  }
  function projectGroupLabel(group) { return localText(group?.label); }
  function renderProjectArchive() {
    const tabs = document.querySelector('[data-year-tabs]');
    const grid = document.querySelector('[data-project-grid]');
    if (!tabs || !grid) return;
    tabs.replaceChildren();
    projectState.groups.forEach((group,index) => {
      const button = document.createElement('button');
      button.type = 'button'; button.role = 'tab'; button.textContent = projectGroupLabel(group); button.dataset.groupIndex = String(index);
      button.setAttribute('aria-selected', String(group.id === projectState.current));
      button.addEventListener('click', () => selectProjectGroup(index)); tabs.append(button);
    });
    const initial = Math.max(0, projectState.groups.findIndex((group) => group.id === projectState.current));
    selectProjectGroup(initial);
  }
  function selectProjectGroup(index) {
    const group = projectState.groups[index];
    if (!group) return;
    projectState.current = group.id; projectState.visited.add(group.id);
    document.querySelectorAll('[data-year-tabs] button').forEach((button) => button.setAttribute('aria-selected', String(Number(button.dataset.groupIndex) === index)));
    document.querySelectorAll('[data-orbit-years] button').forEach((button) => button.setAttribute('aria-pressed', String(Number(button.dataset.groupIndex) === index)));
    const grid = document.querySelector('[data-project-grid]');
    if (grid) {
      grid.replaceChildren(...group.cards.map((card) => {
        const detailHref = projectDetailHref(card);
        const article = document.createElement(detailHref ? 'a' : 'article');
        article.className = 'project-record';
        if (detailHref) {
          article.href = detailHref;
          article.style.color = 'inherit';
          article.style.textDecoration = 'none';
          article.setAttribute('aria-label', translate('openDetail',{title:localText(card.title)}));
        }
        const type = document.createElement('small'); type.textContent = projectGroupLabel(group);
        const title = document.createElement('h3'); title.textContent = localText(card.title);
        const desc = document.createElement('p'); desc.textContent = plainText(card.subtitle) || translate('projectRecord');
        const role = document.createElement('span'); role.className = 'project-role'; role.textContent = plainText(card.role) || translate('detailRecord');
        article.append(type,title,desc,role); return article;
      }));
    }
    document.querySelectorAll('[data-archive-label]').forEach((node) => { node.textContent = projectGroupLabel(group); });
    document.querySelectorAll('[data-project-count]').forEach((node) => { node.textContent = translate('records',{count:group.cards.length}); });
    checkCometUnlock();
  }

  /* The public archive shows four factual failures; BrawlCraft remains classified in the Atlas study. */
  function failedProjectGroup() { return projectState.groups.find((group) => group.kind === 'failed' || group.id === 'failed'); }
  function classifyFailedProject(card) {
    const title = localText(card.title,'ko');
    if (title.includes('한기대 지도')) return {state:'orbit',labelKey:'lostOrbit'};
    if (title === 'InfoCatch' || title === 'InvestAI') return {state:'supernova',labelKey:'supernovaRemnant'};
    if (title.includes('건영운세')) return {state:'vanished',labelKey:'vanishedStar'};
    return {state:'classified',labelKey:'area51'};
  }
  function renderLostStarArchive() {
    const group = failedProjectGroup();
    if (!group) return;
    const points = [[18,35],[42,68],[67,27],[82,67]];
    document.querySelectorAll('[data-lost-stars]').forEach((section) => {
      const field = section.querySelector('[data-lost-star-field]');
      const record = section.querySelector('[data-lost-star-record]');
      if (!field || !record) return;
      const cards = group.cards.filter((card) => classifyFailedProject(card).state !== 'classified').slice(0,4);
      field.replaceChildren(...cards.map((card,index) => {
        const classification = classifyFailedProject(card);
        const button = document.createElement('button');
        button.type = 'button'; button.className = 'lost-star'; button.dataset.lostState = classification.state;
        button.style.setProperty('--x',`${points[index][0]}%`); button.style.setProperty('--y',`${points[index][1]}%`);
        button.setAttribute('aria-label',`${localText(card.title)} · ${translate(classification.labelKey)}`);
        const visual = document.createElement('span'); visual.className = 'lost-star-visual'; visual.setAttribute('aria-hidden','true');
        const name = document.createElement('span'); name.className = 'lost-star-name'; name.textContent = localText(card.title);
        button.append(visual,name);
        button.addEventListener('click',() => {
          field.querySelectorAll('.lost-star').forEach((node) => node.classList.toggle('active',node === button));
          const status = document.createElement('small'); status.textContent = translate(classification.labelKey);
          const title = document.createElement('h3'); title.textContent = localText(card.title);
          const summary = document.createElement('p'); summary.textContent = plainText(card.subtitle);
          const reason = document.createElement('p'); reason.textContent = plainText(card.failedReason || card.role);
          record.replaceChildren(status,title,summary,reason); record.hidden = false;
        });
        return button;
      }));
      record.hidden = true;
    });
  }

  /* Two deliberate turns reveal the orrery's unlabelled eclipse event. */
  function revealOrreryEclipse(shell) {
    if (shell.dataset.eclipse === 'true') return;
    const core = shell.querySelector('.orrery-core');
    const moon = core?.querySelector('span');
    if (!core || !moon) return;
    shell.dataset.eclipse = 'true';
    if (reducedMotion() || typeof moon.animate !== 'function') {
      moon.style.opacity = '1';
      moon.style.transform = 'scale(5.55)';
    } else {
      moon.animate([
        { opacity:.08, transform:'translateX(-360%) scale(.7)' },
        { opacity:.92, transform:'translateX(-45%) scale(3.8)', offset:.72 },
        { opacity:1, transform:'translateX(0) scale(5.55)' },
      ], { duration:2200, easing:'cubic-bezier(.22,.72,.2,1)', fill:'forwards' });
      core.animate([
        { filter:'brightness(1)' },
        { filter:'brightness(.58)', offset:.82 },
        { filter:'brightness(.7)' },
      ], { duration:2200, easing:'ease-out', fill:'forwards' });
      shell.querySelectorAll('.orrery-ring').forEach((ring,index) => {
        ring.animate([
          { opacity:1 },
          { opacity:.22, offset:.65 },
          { opacity:.68 },
        ], { duration:1800, delay:index*90, easing:'ease-out' });
      });
    }
    playConstellationMusic();
  }

  /* The third direction treats project years as a tactile celestial instrument. */
  function initOrrery() {
    const shell = document.querySelector('[data-orrery]');
    const yearLayer = document.querySelector('[data-orbit-years]');
    if (!shell || !yearLayer) return;
    const state = { rotation:0, drag:null, travel:0 };
    const apply = () => shell.style.setProperty('--rotation', `${state.rotation}deg`);
    yearLayer.replaceChildren(...projectState.groups.map((group,index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.groupIndex = String(index);
      button.style.setProperty('--angle', `${index * 360 / projectState.groups.length}deg`);
      button.setAttribute('aria-pressed', String(group.id === projectState.current));
      const year = document.createElement('b');
      year.textContent = projectGroupLabel(group);
      const count = document.createElement('small');
      count.textContent = `${group.cards.length}`;
      button.append(year,count);
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        selectProjectGroup(index);
        state.rotation = -(index * 360 / projectState.groups.length);
        apply();
      });
      return button;
    }));
    shell.addEventListener('pointerdown', (event) => {
      if (event.target.closest('button,a')) return;
      state.drag = { pointerId:event.pointerId, lastX:event.clientX, startRotation:state.rotation, startTravel:state.travel };
      try { shell.setPointerCapture(event.pointerId); } catch (_) { /* Pointer stays usable without capture. */ }
      shell.classList.add('dragging');
    });
    shell.addEventListener('pointermove', (event) => {
      if (!state.drag || event.pointerId !== state.drag.pointerId) return;
      const delta = (event.clientX - state.drag.lastX) * .32;
      state.drag.lastX = event.clientX;
      state.rotation += delta;
      state.travel += Math.abs(delta);
      apply();
      if (state.travel >= 720) revealOrreryEclipse(shell);
    });
    const finish = () => {
      if (!state.drag) return;
      const step = 360 / projectState.groups.length;
      const normalized = ((-state.rotation % 360) + 360) % 360;
      const index = Math.round(normalized / step) % projectState.groups.length;
      state.rotation = -index * step;
      state.drag = null;
      shell.classList.remove('dragging');
      selectProjectGroup(index);
      apply();
    };
    const cancel = () => {
      if (!state.drag) return;
      state.rotation = state.drag.startRotation;
      state.travel = state.drag.startTravel;
      state.drag = null;
      shell.classList.remove('dragging');
      apply();
    };
    shell.addEventListener('pointerup',finish);
    shell.addEventListener('pointercancel',cancel);
    apply();
  }
  function refreshOrreryLanguage() {
    document.querySelectorAll('[data-orbit-years] button').forEach((button) => {
      const group = projectState.groups[Number(button.dataset.groupIndex)];
      const label = button.querySelector('b');
      const count = button.querySelector('small');
      if (label && group) label.textContent = projectGroupLabel(group);
      if (count && group) count.textContent = String(group.cards.length);
    });
  }
  function checkCometUnlock() {
    if (projectState.visited.size < projectState.groups.length) return;
    document.querySelectorAll('[data-comet-event]').forEach((comet) => {
      if (comet.dataset.played === 'true') return;
      comet.dataset.played = 'true'; comet.setAttribute('aria-hidden','false'); comet.setAttribute('role','button'); comet.tabIndex = 0;
      comet.classList.add('active');
      const reveal = () => comet.classList.add('capy-revealed');
      comet.addEventListener('click', reveal, { once:true });
      comet.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') reveal(); }, { once:true });
    });
  }

  /* Pointer and keyboard eclipse puzzles share the same reveal state. */
  function revealEclipse(scene) {
    scene?.classList.add('eclipsed');
    renderCapybaraNebula(scene);
    playEffect('success');
  }

  /* A soft particle silhouette reads as a capybara only after the eclipse. */
  function renderCapybaraNebula(scene) {
    const canvas = scene?.querySelector('[data-capy-nebula]');
    const context = canvas?.getContext('2d');
    if (!canvas || !context || canvas.dataset.rendered === 'true') return;
    const bounds = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1,bounds.width);
    const height = Math.max(1,bounds.height);
    canvas.width = Math.round(width*dpr);
    canvas.height = Math.round(height*dpr);
    context.setTransform(dpr,0,0,dpr,0,0);
    let seed = 98317;
    const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    const insideEllipse = (x,y,cx,cy,rx,ry) => ((x-cx)/rx)**2 + ((y-cy)/ry)**2 <= 1;
    const insideShape = (x,y) => (
      insideEllipse(x,y,.42,.57,.31,.205) ||
      insideEllipse(x,y,.72,.49,.17,.155) ||
      insideEllipse(x,y,.845,.545,.115,.08) ||
      insideEllipse(x,y,.68,.34,.045,.055) ||
      insideEllipse(x,y,.785,.36,.04,.05) ||
      insideEllipse(x,y,.26,.76,.065,.17) ||
      insideEllipse(x,y,.51,.77,.065,.16)
    );
    const styles = getComputedStyle(document.documentElement);
    const violet = styles.getPropertyValue('--violet').trim() || '#706994';
    const gold = styles.getPropertyValue('--gold').trim() || '#a9914d';
    const points = [];
    while (points.length < 620) {
      const x = random();
      const y = random();
      if (insideShape(x,y)) points.push({x:x*width,y:y*height,r:.35+random()*1.45,a:.12+random()*.55,gold:random()>.77});
    }
    const start = performance.now();
    const draw = (time) => {
      const progress = reducedMotion() ? 1 : clamp((time-start)/1450,0,1);
      context.clearRect(0,0,width,height);
      points.forEach((point,index) => {
        const arrival = clamp(progress*1.22-index/points.length*.22,0,1);
        if (!arrival) return;
        context.globalAlpha = point.a*arrival;
        context.fillStyle = point.gold ? gold : violet;
        context.shadowBlur = point.r*5;
        context.shadowColor = point.gold ? gold : violet;
        context.beginPath();
        context.arc(point.x,point.y,point.r*arrival,0,Math.PI*2);
        context.fill();
      });
      context.shadowBlur = 0;
      context.globalAlpha = .82*progress;
      context.fillStyle = violet;
      context.beginPath();
      context.arc(width*.79,height*.475,Math.max(1.5,width*.004),0,Math.PI*2);
      context.fill();
      context.globalAlpha = 1;
      if (progress < 1) requestAnimationFrame(draw);
      else canvas.dataset.rendered = 'true';
    };
    requestAnimationFrame(draw);
  }
  function initStoryEclipse() {
    const moon = document.querySelector('[data-moon-drag]');
    const scene = document.querySelector('[data-eclipse-scene]');
    const target = scene?.querySelector('.eclipse-target');
    if (!moon || !scene || !target) return;
    let drag = null;
    moon.addEventListener('pointerdown', (event) => { drag={x:event.clientX,y:event.clientY,left:moon.offsetLeft,top:moon.offsetTop}; moon.setPointerCapture(event.pointerId); moon.classList.add('dragging'); });
    moon.addEventListener('pointermove', (event) => {
      if (!drag) return;
      moon.style.left = `${clamp(drag.left + event.clientX - drag.x,0,scene.clientWidth-moon.offsetWidth)}px`;
      moon.style.top = `${clamp(drag.top + event.clientY - drag.y,0,scene.clientHeight-moon.offsetHeight)}px`;
    });
    const finish = () => {
      if (!drag) return; drag=null; moon.classList.remove('dragging');
      const moonRect=moon.getBoundingClientRect(), targetRect=target.getBoundingClientRect();
      const distance=Math.hypot(moonRect.left+moonRect.width/2-targetRect.left-targetRect.width/2,moonRect.top+moonRect.height/2-targetRect.top-targetRect.height/2);
      if (distance < 75) { moon.style.left=`${target.offsetLeft+(target.offsetWidth-moon.offsetWidth)/2}px`; moon.style.top=`${target.offsetTop+(target.offsetHeight-moon.offsetHeight)/2}px`; revealEclipse(scene); }
    };
    moon.addEventListener('pointerup',finish); moon.addEventListener('pointercancel',finish);
    moon.addEventListener('keydown',(event)=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();revealEclipse(scene);}});
  }

  /* The zodiac sits outside the named atlas zones and reveals no labels or instructions. */
  function createZodiacBelt() {
    const world = document.querySelector('[data-atlas-world]');
    if (!world) return;
    const belt = svgElement('svg',{viewBox:'0 0 1900 1250','aria-hidden':'true'});
    belt.classList.add('zodiac-belt'); belt.dataset.zodiacBelt = '';
    belt.append(svgElement('ellipse',{cx:950,cy:625,rx:825,ry:535,class:'zodiac-orbit'}));
    belt.append(svgElement('ellipse',{cx:950,cy:625,rx:755,ry:470,class:'zodiac-orbit zodiac-orbit-inner'}));
    zodiacGlyphs.forEach((glyph,index) => {
      const angle = -90 + index * 30;
      const radians = angle * Math.PI / 180;
      const x = 950 + Math.cos(radians) * 790;
      const y = 625 + Math.sin(radians) * 505;
      const group = svgElement('g',{transform:`translate(${x-42} ${y-36}) scale(.84)`,class:'zodiac-glyph'});
      glyph.edges.forEach(([from,to]) => {
        const [x1,y1] = glyph.points[from], [x2,y2] = glyph.points[to];
        group.append(svgElement('line',{x1,y1,x2,y2}));
      });
      glyph.points.forEach(([cx,cy],pointIndex) => group.append(svgElement('circle',{cx,cy,r:pointIndex % 3 === 0 ? 3.5 : 2.4})));
      belt.append(group);
    });
    const trigger = svgElement('path',{d:'M 1120 1080 Q 950 1195 780 1080',class:'zodiac-secret-trigger'});
    trigger.dataset.ophiuchusTrigger = '';
    belt.append(trigger);
    const hidden = svgElement('g',{transform:'translate(875 965) scale(1.55)',class:'ophiuchus-glyph'});
    const hiddenPoints = [[50,5],[35,22],[65,22],[42,42],[58,42],[30,63],[70,63],[38,91],[62,91],[4,38],[19,52],[81,52],[96,38]];
    const hiddenEdges = [[0,1],[0,2],[1,3],[2,4],[3,4],[3,5],[4,6],[5,7],[6,8],[9,10],[10,3],[4,11],[11,12]];
    hiddenEdges.forEach(([from,to]) => {
      const [x1,y1] = hiddenPoints[from], [x2,y2] = hiddenPoints[to];
      hidden.append(svgElement('line',{x1,y1,x2,y2}));
    });
    hiddenPoints.forEach(([cx,cy]) => hidden.append(svgElement('circle',{cx,cy,r:3.2})));
    belt.append(hidden); world.prepend(belt);

    let trace = null;
    trigger.addEventListener('pointerdown',(event) => {
      if (world.classList.contains('ophiuchus-revealed')) return;
      event.preventDefault(); event.stopPropagation(); trigger.setPointerCapture(event.pointerId);
      trace = {pointerId:event.pointerId,x:event.clientX,y:event.clientY,distance:0}; belt.classList.add('tracing');
    });
    trigger.addEventListener('pointermove',(event) => {
      if (!trace || event.pointerId !== trace.pointerId) return;
      trace.distance += Math.hypot(event.clientX-trace.x,event.clientY-trace.y); trace.x=event.clientX; trace.y=event.clientY;
      if (trace.distance >= 125) {
        world.classList.add('ophiuchus-revealed'); belt.classList.remove('tracing'); trace=null; playEffect('success');
      }
    });
    const finish = () => { trace=null; belt.classList.remove('tracing'); };
    trigger.addEventListener('pointerup',finish); trigger.addEventListener('pointercancel',finish);

    /* Mobile keeps the twelve constellations without shrinking the desktop atlas. */
    const mobileBelt = svgElement('svg',{viewBox:'0 0 720 170','aria-hidden':'true'});
    mobileBelt.classList.add('zodiac-belt-mobile');
    mobileBelt.append(svgElement('path',{d:'M 18 83 Q 360 10 702 83 Q 360 156 18 83',class:'zodiac-orbit'}));
    zodiacGlyphs.forEach((glyph,index) => {
      const x = 20 + (index % 6) * 116;
      const y = 7 + Math.floor(index / 6) * 78;
      const group = svgElement('g',{transform:`translate(${x} ${y}) scale(.58)`,class:'zodiac-glyph'});
      glyph.edges.forEach(([from,to]) => {
        const [x1,y1] = glyph.points[from], [x2,y2] = glyph.points[to];
        group.append(svgElement('line',{x1,y1,x2,y2}));
      });
      glyph.points.forEach(([cx,cy],pointIndex) => group.append(svgElement('circle',{cx,cy,r:pointIndex % 3 === 0 ? 3.5 : 2.4})));
      mobileBelt.append(group);
    });
    const mobileTrigger = svgElement('path',{d:'M 260 84 Q 360 122 460 84',class:'zodiac-secret-trigger'});
    const mobileHidden = svgElement('g',{transform:'translate(320 43) scale(.8)',class:'ophiuchus-glyph'});
    hiddenEdges.forEach(([from,to]) => {
      const [x1,y1] = hiddenPoints[from], [x2,y2] = hiddenPoints[to];
      mobileHidden.append(svgElement('line',{x1,y1,x2,y2}));
    });
    hiddenPoints.forEach(([cx,cy]) => mobileHidden.append(svgElement('circle',{cx,cy,r:3.2})));
    mobileBelt.append(mobileTrigger,mobileHidden); world.append(mobileBelt);

    let mobileTrace = null;
    mobileTrigger.addEventListener('pointerdown',(event) => {
      if (world.classList.contains('ophiuchus-revealed')) return;
      event.preventDefault(); event.stopPropagation(); mobileTrigger.setPointerCapture(event.pointerId);
      mobileTrace = {pointerId:event.pointerId,x:event.clientX,y:event.clientY,distance:0}; mobileBelt.classList.add('tracing');
    });
    mobileTrigger.addEventListener('pointermove',(event) => {
      if (!mobileTrace || event.pointerId !== mobileTrace.pointerId) return;
      mobileTrace.distance += Math.hypot(event.clientX-mobileTrace.x,event.clientY-mobileTrace.y); mobileTrace.x=event.clientX; mobileTrace.y=event.clientY;
      if (mobileTrace.distance >= 90) {
        world.classList.add('ophiuchus-revealed'); mobileBelt.classList.remove('tracing'); mobileTrace=null; playEffect('success');
      }
    });
    const finishMobileTrace = () => { mobileTrace=null; mobileBelt.classList.remove('tracing'); };
    mobileTrigger.addEventListener('pointerup',finishMobileTrace); mobileTrigger.addEventListener('pointercancel',finishMobileTrace);
  }

  /* Atlas camera provides direct manipulation on desktop and becomes static sections on mobile. */
  let atlasApi = null;
  function initAtlas() {
    const viewport=document.querySelector('[data-atlas-viewport]'), world=document.querySelector('[data-atlas-world]');
    if (!viewport || !world) return;
    const camera={x:0,y:0,scale:.76,drag:null};
    const desktop=()=>window.matchMedia('(min-width:901px)').matches;
    const apply=(animated=false)=>{
      world.style.transition=animated?'transform .72s cubic-bezier(.2,.78,.24,1)':'none';
      world.style.transform=`translate3d(${camera.x}px,${camera.y}px,0) scale(${camera.scale})`;
      world.classList.toggle('zodiac-visible',camera.scale <= .68);
      const coordinate=document.querySelector('[data-atlas-coordinate]'); if(coordinate)coordinate.textContent=`ATLAS · ${Math.round(-camera.x)}, ${Math.round(-camera.y)} · ${Math.round(camera.scale*100)}%`;
      if(animated)window.setTimeout(()=>{world.style.transition='none';},760);
    };
    const focus=(name)=>{
      if(!desktop())return; const zone=world.querySelector(`[data-zone="${name}"]`); if(!zone)return;
      const centerX=zone.offsetLeft+zone.offsetWidth/2,centerY=zone.offsetTop+zone.offsetHeight/2;
      camera.scale=name==='projects'?.86:name==='moon'?1:name==='area51'?.94:.9;
      camera.x=viewport.clientWidth/2-centerX*camera.scale; camera.y=viewport.clientHeight/2-centerY*camera.scale; apply(true);
    };
    atlasApi={focus,apply,camera,viewport,world};
    viewport.addEventListener('pointerdown',(event)=>{if(!desktop()||event.target.closest('button,a,[data-atlas-moon],[data-ophiuchus-trigger],[data-area51-star]'))return;camera.drag={x:event.clientX,y:event.clientY,cx:camera.x,cy:camera.y};viewport.setPointerCapture(event.pointerId);viewport.classList.add('dragging');});
    viewport.addEventListener('pointermove',(event)=>{if(!camera.drag)return;camera.x=camera.drag.cx+event.clientX-camera.drag.x;camera.y=camera.drag.cy+event.clientY-camera.drag.y;apply();});
    const endDrag=()=>{camera.drag=null;viewport.classList.remove('dragging');}; viewport.addEventListener('pointerup',endDrag);viewport.addEventListener('pointercancel',endDrag);
    viewport.addEventListener('wheel',(event)=>{if(!desktop())return;event.preventDefault();const old=camera.scale;const next=clamp(old*(event.deltaY>0?.9:1.1),.55,1.35);const rect=viewport.getBoundingClientRect(),px=event.clientX-rect.left,py=event.clientY-rect.top;camera.x=px-(px-camera.x)*(next/old);camera.y=py-(py-camera.y)*(next/old);camera.scale=next;apply();},{passive:false});
    document.querySelector('[data-atlas-reset]')?.addEventListener('click',()=>focus('growth'));
    document.querySelectorAll('[data-atlas-focus]').forEach((button)=>button.addEventListener('click',()=>focus(button.dataset.atlasFocus)));
    window.addEventListener('resize',()=>{if(desktop())focus('growth');else world.style.transform='none';});
    window.setTimeout(()=>focus('growth'),60);
    initAtlasMoon();
  }
  function createAtlasStations() {
    const shell=document.querySelector('[data-atlas-stations]'); if(!shell)return;
    const points=[[18,26],[67,19],[40,51],[76,67],[26,79]];
    shell.replaceChildren(...projectState.groups.map((group,index)=>{
      const button=document.createElement('button');button.type='button';button.className='atlas-station';button.textContent=projectGroupLabel(group);
      button.style.setProperty('--x',`${points[index%points.length][0]}%`);button.style.setProperty('--y',`${points[index%points.length][1]}%`);
      button.classList.toggle('visited',projectState.visited.has(group.id));
      button.addEventListener('click',()=>{projectState.visited.add(group.id);button.classList.add('visited');openAtlasDrawer(projectGroupLabel(group),translate('records',{count:group.cards.length}), 'PROJECT OBSERVATORY',group.cards);checkCometUnlock();});return button;
    }));
  }
  function openAtlasDrawer(title,description,kicker='OBSERVATORY',cards=[]) {
    const drawer=document.querySelector('[data-atlas-drawer]');if(!drawer)return;
    drawer.querySelector('[data-drawer-kicker]').textContent=kicker;drawer.querySelector('[data-drawer-title]').textContent=title;drawer.querySelector('[data-drawer-description]').textContent=description;
    const grid=drawer.querySelector('[data-drawer-projects]');grid.replaceChildren(...cards.slice(0,7).map((card)=>{
      const detailHref=projectDetailHref(card),record=document.createElement(detailHref?'a':'article');record.className='drawer-project-record';
      if(detailHref){record.href=detailHref;record.setAttribute('aria-label',translate('openDetail',{title:localText(card.title)}));}
      const strong=document.createElement('b');strong.textContent=localText(card.title);const small=document.createElement('small');small.textContent=plainText(card.subtitle||card.role);record.append(strong,small);return record;
    }));drawer.classList.add('open');
  }
  function initAtlasMoon() {
    const moon=document.querySelector('[data-atlas-moon]'),target=document.querySelector('[data-atlas-eclipse-target]');if(!moon||!target)return;
    let drag=null;moon.addEventListener('pointerdown',(event)=>{event.stopPropagation();drag={x:event.clientX,y:event.clientY,left:moon.offsetLeft,top:moon.offsetTop};moon.setPointerCapture(event.pointerId);});
    moon.addEventListener('pointermove',(event)=>{if(!drag)return;const scale=atlasApi?.camera.scale||1;moon.style.left=`${drag.left+(event.clientX-drag.x)/scale}px`;moon.style.top=`${drag.top+(event.clientY-drag.y)/scale}px`;});
    moon.addEventListener('pointerup',()=>{if(!drag)return;drag=null;const a=moon.getBoundingClientRect(),b=target.getBoundingClientRect();if(Math.hypot(a.left+a.width/2-b.left-b.width/2,a.top+a.height/2-b.top-b.height/2)<95)revealEclipse(moon.closest('.atlas-zone'));});
  }

  /* Dragging the unnamed anomaly through the broken boundary reveals Area 51. */
  function area51Cards() {
    const failed = failedProjectGroup();
    if (!failed) return [];
    const brawlCraft = failed.cards.find((card) => localText(card.title,'ko') === 'BrawlCraft');
    return brawlCraft ? [brawlCraft] : failed.cards.slice(-1);
  }
  function renderArea51Records() {
    const shell = document.querySelector('[data-area51-records]');
    if (!shell) return;
    shell.replaceChildren(...area51Cards().map((card) => {
      const record = document.createElement('article'); record.className = 'area51-record';
      const title = document.createElement('b'); title.textContent = localText(card.title);
      const summary = document.createElement('span'); summary.textContent = plainText(card.subtitle);
      const reason = document.createElement('span'); reason.textContent = plainText(card.failedReason || card.role);
      record.append(title,summary,reason); return record;
    }));
  }
  function revealArea51() {
    const world = document.querySelector('[data-atlas-world]');
    const zone = document.querySelector('[data-area51-zone]');
    if (!world || !zone || world.classList.contains('area51-revealed')) return;
    world.classList.add('area51-revealed'); zone.setAttribute('aria-hidden','false');
    renderArea51Records(); playEffect('danger');
    window.setTimeout(() => {
      if (window.matchMedia('(min-width:901px)').matches) atlasApi?.focus('area51');
      else zone.scrollIntoView({behavior:reducedMotion()?'auto':'smooth',block:'center'});
    },420);
    window.setTimeout(() => openAtlasDrawer(translate('area51'),translate('area51Description'),'CLASSIFIED',area51Cards()),920);
  }
  function initArea51() {
    const star=document.querySelector('[data-area51-star]'),target=document.querySelector('[data-area51-target]');
    if(!star||!target)return;
    let drag=null,offsetX=0,offsetY=0,keyboardMoved=false;
    const scale=()=>window.matchMedia('(min-width:901px)').matches ? atlasApi?.camera.scale||1 : 1;
    const apply=()=>{star.style.transform=`translate3d(${offsetX}px,${offsetY}px,0)`;};
    const closeEnough=()=>{
      const a=star.getBoundingClientRect(),b=target.getBoundingClientRect();
      return Math.hypot(a.left+a.width/2-b.left-b.width/2,a.top+a.height/2-b.top-b.height/2)<=58;
    };
    const reset=()=>{
      offsetX=0;offsetY=0;
      if(reducedMotion()||typeof star.animate!=='function'){apply();return;}
      const animation=star.animate([{transform:star.style.transform||'none'},{transform:'translate3d(0,0,0)'}],{duration:520,easing:'cubic-bezier(.2,.78,.24,1)'});
      animation.addEventListener('finish',apply,{once:true});
    };
    star.addEventListener('pointerdown',(event)=>{
      if(event.pointerType==='mouse'&&event.button!==0)return;
      event.preventDefault();event.stopPropagation();
      drag={pointerId:event.pointerId,x:event.clientX,y:event.clientY,startX:offsetX,startY:offsetY,moved:false};
      try{star.setPointerCapture(event.pointerId);}catch(_){/* Window listeners retain the drag. */}
      star.classList.add('dragging');
    });
    star.addEventListener('pointermove',(event)=>{
      if(!drag||event.pointerId!==drag.pointerId)return;
      event.preventDefault();
      const divisor=scale();offsetX=drag.startX+(event.clientX-drag.x)/divisor;offsetY=drag.startY+(event.clientY-drag.y)/divisor;
      drag.moved=drag.moved||Math.hypot(event.clientX-drag.x,event.clientY-drag.y)>6;apply();
    });
    const finish=()=>{
      if(!drag)return;
      const moved=drag.moved;drag=null;star.classList.remove('dragging');
      if(moved&&closeEnough())revealArea51();
      else{if(!moved){star.classList.remove('touched');void star.offsetWidth;star.classList.add('touched');}reset();}
    };
    star.addEventListener('pointerup',finish);star.addEventListener('pointercancel',()=>{drag=null;star.classList.remove('dragging');reset();});
    star.addEventListener('keydown',(event)=>{
      const movement={ArrowLeft:[-14,0],ArrowRight:[14,0],ArrowUp:[0,-14],ArrowDown:[0,14]}[event.key];
      if(!movement)return;event.preventDefault();keyboardMoved=true;offsetX+=movement[0];offsetY+=movement[1];apply();
      if(keyboardMoved&&closeEnough())revealArea51();
    });
  }

  /* The detail prototype compares real planning material with the photographed MVP. */
  function initWallCompare() {
    document.querySelectorAll('[data-wall-compare]').forEach((section) => {
      const frame = section.querySelector('.compare-frame');
      const range = section.querySelector('[data-compare-range]');
      if (!frame || !range) return;
      const apply = () => {
        const reveal = clamp(Number(range.value),0,100);
        frame.style.setProperty('--reveal', `${reveal}%`);
        range.setAttribute('aria-valuenow', String(reveal));
      };
      range.addEventListener('input',apply);
      apply();
    });
  }

  /* Boot only the interactions present on the current prototype page. */
  async function boot() {
    initLanguage();
    createCosmosCanvases();createIntroConstellation();createStarfields();createGrowthConstellations();createZodiacBelt();
    document.querySelectorAll('[data-sound-stop]').forEach((button)=>button.addEventListener('click',stopAudio));
    if(pageType==='story'){initStoryScroll();initStoryEclipse();projectState.groups=await loadProjectGroups();renderProjectArchive();renderLostStarArchive();}
    if(pageType==='atlas'){projectState.groups=await loadProjectGroups();createAtlasStations();initAtlas();initArea51();document.querySelector('[data-drawer-close]')?.addEventListener('click',()=>document.querySelector('[data-atlas-drawer]')?.classList.remove('open'));}
    if(pageType==='celestial'){projectState.groups=await loadProjectGroups();renderProjectArchive();renderLostStarArchive();initOrrery();}
    if(pageType==='wall')initWallCompare();
    bootComplete = true;
  }
  boot().catch((error)=>console.error('Prototype initialization failed:',error));
})();

