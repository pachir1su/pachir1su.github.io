/* Shared data and interaction engine for the approved v3 constellation prototypes. */
(() => {
  'use strict';

  const growthEvents = [
    { year: '2024', title: '해안 장벽 MVP 제작', detail: '4인 팀 · 아두이노 개발 총괄' },
    { year: '2024', title: '천안학생로봇대회 동상', detail: '허스키렌즈 기반 졸음 감지 시스템' },
    { year: '2025', title: 'NFC 출석 시스템', detail: '6인 팀 · 팀장' },
    { year: '2025', title: '면진봇 공개', detail: 'Discord 경제 시뮬레이션 봇 · 1인 개발' },
    { year: '2026', title: '코리아텍 통합 알림 시스템', detail: '공지·메일·셔틀·학식·도서관 통합 운영' },
    { year: '2026', title: 'Raspberry Pi 운영', detail: '실사용 서비스의 장시간 운용과 안정화' },
    { year: '2026', title: 'U-CAST 5팀 멘토링', detail: '요구사항·상태 설계·배선 디버깅 지원' },
    { year: '2026', title: '로컬임팩트상', detail: '천안 청소년 도시재생 챌린지' },
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
    { label:'2026', cards:[
      {title:'GitHub Rank Insight',subtitle:'GitHub Stats 등급 분석기',role:'1인 개발 · 전 과정'},
      {title:'코리아텍 통합 알림 시스템',subtitle:'공지·개인 메일·셔틀·학식·도서관 통합 알림',role:'1인 개발'},
      {title:'Daily Report AI',subtitle:'Gemini 기반 디스코드 아침 브리핑 봇',role:'팀장 · 3인 팀'},
      {title:'MultiMind',subtitle:'여러 LLM을 동시에 조작하는 오케스트레이터',role:'1인 개발'},
      {title:'2026 U-CAST 「멈춰!」',subtitle:'돌발 보행자 감지 경고 시스템',role:'5팀 멘토'},
    ]},
    { label:'2025', cards:[
      {title:'NFC 출석 체크 시스템',subtitle:'NFC 태그 기반 자동 출석 체크 IoT',role:'팀장 · 6인 팀'},
      {title:'식물 타이머',subtitle:'식물 관리 스마트 타이머',role:'1인 개발'},
      {title:'헬스 케어 시스템',subtitle:'건강 데이터 기록·모니터링 시스템',role:'팀장 · 4인 팀'},
      {title:'면진봇',subtitle:'Discord 경제 시뮬레이션 봇',role:'1인 개발'},
    ]},
    { label:'2024', cards:[
      {title:'해안 장벽 프로젝트',subtitle:'해수면 상승 대비 수조 기반 MVP',role:'아두이노 개발 총괄 · 4인 팀'},
      {title:'졸음 방지 시스템',subtitle:'허스키렌즈 실시간 졸음 감지',role:'아두이노 개발 · 2인 팀'},
      {title:'비밀번호 도어락',subtitle:'4×4 키패드 기반 장치',role:'팀장 · 4인 팀'},
    ]},
    { label:'진행 중·예정', cards:[
      {title:'한맵',subtitle:'KOREATECH 캠퍼스 인터랙티브 지도',role:'기획 단계'},
      {title:'승기봇',subtitle:'면진봇 개편판 미니게임 봇',role:'개발 중'},
      {title:'CentrifugeAI',subtitle:'Gemini 가상 과학 실험실',role:'마무리 단계'},
    ]},
    { label:'실패한 프로젝트', cards:[
      {title:'InfoCatch',subtitle:'AI 뉴스 요약 웹 애플리케이션',role:'AI 구현 실패'},
      {title:'InvestAI',subtitle:'Fear/Greed 지표 웹 위젯',role:'API 연동 실패'},
      {title:'BrawlCraft',subtitle:'탐사·조합·전투 웹 게임',role:'최적화·디자인 실패'},
    ]},
  ];

  const pageType = document.body.dataset.page || 'unknown';
  const projectState = { groups:fallbackGroups, visited:new Set(), current:'2026' };
  const sequenceState = { expected:0, complete:false, drag:null };
  const audioState = { context:null, nodes:[], stopTimer:0 };

  /* Utility helpers keep malformed optional data from breaking the mockup. */
  function localText(value) {
    if (typeof value === 'string') return value;
    if (value && typeof value === 'object') return value.ko || value.en || '';
    return '';
  }
  function plainText(value) {
    const shell = document.createElement('div');
    shell.innerHTML = localText(value);
    return shell.textContent.trim();
  }
  function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
  function reducedMotion() { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  function svgElement(name, attributes={}) {
    const node = document.createElementNS('http://www.w3.org/2000/svg', name);
    Object.entries(attributes).forEach(([key,value]) => node.setAttribute(key, String(value)));
    return node;
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

  /* The temporary Web Audio score proves the gated 20-second experience without shipping an asset. */
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
    const start = context.currentTime + .04;
    const master = registerAudioNode(context.createGain());
    master.gain.setValueAtTime(.0001, start);
    master.gain.exponentialRampToValueAtTime(.13, start + 1.4);
    master.gain.setValueAtTime(.13, start + 17.7);
    master.gain.exponentialRampToValueAtTime(.0001, start + 20);
    master.connect(context.destination);
    const notes = [293.66,369.99,440,554.37,440,369.99,329.63,493.88];
    notes.forEach((frequency, index) => {
      const tone = registerAudioNode(context.createOscillator());
      const gain = registerAudioNode(context.createGain());
      tone.type = index % 2 ? 'sine' : 'triangle';
      tone.frequency.setValueAtTime(frequency, start + index * 1.9);
      gain.gain.setValueAtTime(.0001, start + index * 1.9);
      gain.gain.exponentialRampToValueAtTime(.12, start + index * 1.9 + .4);
      gain.gain.exponentialRampToValueAtTime(.0001, start + index * 1.9 + 4.4);
      tone.connect(gain); gain.connect(master);
      tone.start(start + index * 1.9); tone.stop(start + index * 1.9 + 4.6);
    });
    const pad = registerAudioNode(context.createOscillator());
    const padGain = registerAudioNode(context.createGain());
    pad.type = 'sine'; pad.frequency.value = 146.83;
    padGain.gain.setValueAtTime(.0001, start);
    padGain.gain.exponentialRampToValueAtTime(.055, start + 3);
    padGain.gain.exponentialRampToValueAtTime(.0001, start + 20);
    pad.connect(padGain); padGain.connect(master); pad.start(start); pad.stop(start + 20.1);
    revealSoundStop(20000);
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
        node.setAttribute('aria-label', `${event.year} ${event.title}`);
        const label = document.createElement('span');
        label.className = `growth-label${index > 5 ? ' reverse' : ''}`; label.dataset.growthLabel = String(index);
        label.style.setProperty('--x', `${x}%`); label.style.setProperty('--y', `${y}%`);
        if (index > 5) label.style.left = `calc(${x}% - 210px)`;
        label.innerHTML = `<b>${event.year} · ${event.title}</b><small>${event.detail}</small>`;
        node.addEventListener('pointerdown', (pointerEvent) => {
          node.dataset.pointerHandled = 'true';
          beginGrowthDrag(pointerEvent,container,index);
          window.setTimeout(() => { delete node.dataset.pointerHandled; },450);
        });
        node.addEventListener('click', () => {
          if (node.dataset.pointerHandled === 'true') { delete node.dataset.pointerHandled; return; }
          selectGrowthEvent(container,index);
        });
        container.append(node, label);
      });
    });
  }
  function selectGrowthEvent(container, index, options={}) {
    const event = growthEvents[index];
    container.querySelectorAll('.growth-node').forEach((node) => node.classList.toggle('selected', Number(node.dataset.growthIndex) === index));
    container.querySelectorAll('.growth-label').forEach((label) => label.classList.toggle('active', Number(label.dataset.growthLabel) === index));
    const summary = document.querySelector('[data-growth-summary]');
    if (summary) summary.textContent = `${event.year} · ${event.title} — ${event.detail}`;
    if (pageType === 'atlas') openAtlasDrawer(`${event.year} · ${event.title}`, event.detail, 'GROWTH CONSTELLATION');
    const clickedNode = container.querySelector(`[data-growth-index="${index}"]`);
    if (sequenceState.complete || clickedNode.classList.contains('seen')) return false;
    if (index !== sequenceState.expected) {
      if (!options.quietWrong) { clickedNode.classList.remove('wrong'); void clickedNode.offsetWidth; clickedNode.classList.add('wrong'); }
      updateSequenceStatus(`${event.year} 기록을 살펴보는 중 · 연결은 ${growthEvents[sequenceState.expected].year}부터`);
      return false;
    }
    clickedNode.classList.add('seen');
    container.querySelector(`[data-growth-line="${index - 1}"]`)?.classList.add('active');
    sequenceState.expected += 1;
    document.querySelectorAll(`[data-growth-index="${index}"]`).forEach((node) => node.classList.add('seen'));
    document.querySelectorAll(`[data-growth-line="${index - 1}"]`).forEach((line) => line.classList.add('active'));
    if (sequenceState.expected === growthEvents.length) {
      sequenceState.complete = true;
      updateSequenceStatus('별자리 완성');
      playConstellationMusic();
    } else updateSequenceStatus(`${sequenceState.expected}번째 별 연결 완료`);
    return true;
  }
  function updateSequenceStatus(message) {
    document.querySelectorAll('[data-sequence-count]').forEach((node) => { node.textContent = `${sequenceState.expected} / ${growthEvents.length}`; });
    document.querySelectorAll('[data-sequence-message]').forEach((node) => { node.textContent = message; });
  }
  function beginGrowthDrag(pointerEvent,container,index) {
    if (pointerEvent.pointerType === 'mouse' && pointerEvent.button !== 0) return;
    pointerEvent.stopPropagation();
    selectGrowthEvent(container,index,{quietWrong:true});
    const sourceIndex = sequenceState.expected - 1;
    if (sequenceState.complete || sourceIndex < 0 || index !== sourceIndex) return;
    pointerEvent.preventDefault();
    const owner = pointerEvent.currentTarget;
    const trace = container.querySelector('[data-growth-trace]');
    if (!trace) return;
    sequenceState.drag = { pointerId:pointerEvent.pointerId, sourceIndex, owner };
    owner.setPointerCapture(pointerEvent.pointerId);
    container.classList.add('dragging'); owner.classList.add('drag-source'); trace.classList.add('active');
    const setTraceStart = (pointIndex) => {
      const [x,y] = growthPoints[pointIndex];
      trace.setAttribute('x1',x); trace.setAttribute('y1',y); trace.setAttribute('x2',x); trace.setAttribute('y2',y);
    };
    setTraceStart(sourceIndex);
    const move = (event) => {
      if (!sequenceState.drag || event.pointerId !== sequenceState.drag.pointerId) return;
      const rect = container.getBoundingClientRect();
      trace.setAttribute('x2',clamp((event.clientX-rect.left)/rect.width*100,0,100));
      trace.setAttribute('y2',clamp((event.clientY-rect.top)/rect.height*100,0,100));
      const targetIndex = sequenceState.expected;
      if (targetIndex >= growthEvents.length) return;
      const target = container.querySelector(`[data-growth-index="${targetIndex}"]`);
      const targetRect = target.getBoundingClientRect();
      const distance = Math.hypot(event.clientX-(targetRect.left+targetRect.width/2),event.clientY-(targetRect.top+targetRect.height/2));
      if (distance <= Math.max(34,targetRect.width*.72) && selectGrowthEvent(container,targetIndex,{quietWrong:true})) {
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
      owner.removeEventListener('pointermove',move); owner.removeEventListener('pointerup',finish); owner.removeEventListener('pointercancel',finish);
    };
    owner.addEventListener('pointermove',move);
    owner.addEventListener('pointerup',finish);
    owner.addEventListener('pointercancel',finish);
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
      shell.querySelectorAll('.growth-label').forEach((label,index) => label.classList.toggle('active', index === activeIndex));
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
        label:group.kind === 'year' ? group.year : localText(group.heading),
        cards:(group.cards || []).map((card) => ({ title:localText(card.title), subtitle:plainText(card.subtitle || card.desc || card.descHtml), role:localText(card.role || card.status || card.failedReason) })),
      })).filter((group) => group.label && group.cards.length);
      return groups.length ? groups : fallbackGroups;
    } catch (error) {
      console.info('Prototype uses embedded project fallback:', error.message);
      return fallbackGroups;
    }
  }
  function renderProjectArchive() {
    const tabs = document.querySelector('[data-year-tabs]');
    const grid = document.querySelector('[data-project-grid]');
    if (!tabs || !grid) return;
    tabs.replaceChildren();
    projectState.groups.forEach((group,index) => {
      const button = document.createElement('button');
      button.type = 'button'; button.role = 'tab'; button.textContent = group.label; button.dataset.groupIndex = String(index);
      button.setAttribute('aria-selected', String(group.label === projectState.current));
      button.addEventListener('click', () => selectProjectGroup(index)); tabs.append(button);
    });
    const initial = Math.max(0, projectState.groups.findIndex((group) => group.label === projectState.current));
    selectProjectGroup(initial);
  }
  function selectProjectGroup(index) {
    const group = projectState.groups[index];
    if (!group) return;
    projectState.current = group.label; projectState.visited.add(group.label);
    document.querySelectorAll('[data-year-tabs] button').forEach((button) => button.setAttribute('aria-selected', String(Number(button.dataset.groupIndex) === index)));
    const grid = document.querySelector('[data-project-grid]');
    if (grid) {
      grid.replaceChildren(...group.cards.map((card) => {
        const article = document.createElement('article'); article.className = 'project-record';
        const type = document.createElement('small'); type.textContent = group.label;
        const title = document.createElement('h3'); title.textContent = card.title;
        const desc = document.createElement('p'); desc.textContent = card.subtitle || '프로젝트 기록';
        const role = document.createElement('span'); role.className = 'project-role'; role.textContent = card.role || '상세 기록 확인';
        article.append(type,title,desc,role); return article;
      }));
    }
    document.querySelectorAll('[data-archive-label]').forEach((node) => { node.textContent = group.label; });
    document.querySelectorAll('[data-project-count]').forEach((node) => { node.textContent = `${group.cards.length}개의 기록`; });
    checkCometUnlock();
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
    document.querySelectorAll('[data-capy-constellation]').forEach((map) => map.classList.add('revealed'));
    playEffect('success');
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
      camera.scale=name==='projects'?.86:name==='moon'?1:.9;
      camera.x=viewport.clientWidth/2-centerX*camera.scale; camera.y=viewport.clientHeight/2-centerY*camera.scale; apply(true);
    };
    atlasApi={focus,apply,camera,viewport,world};
    viewport.addEventListener('pointerdown',(event)=>{if(!desktop()||event.target.closest('button,a,[data-atlas-moon],[data-ophiuchus-trigger]'))return;camera.drag={x:event.clientX,y:event.clientY,cx:camera.x,cy:camera.y};viewport.setPointerCapture(event.pointerId);viewport.classList.add('dragging');});
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
      const button=document.createElement('button');button.type='button';button.className='atlas-station';button.textContent=group.label;
      button.style.setProperty('--x',`${points[index%points.length][0]}%`);button.style.setProperty('--y',`${points[index%points.length][1]}%`);
      button.addEventListener('click',()=>{projectState.visited.add(group.label);button.classList.add('visited');openAtlasDrawer(group.label,`${group.cards.length}개의 프로젝트 기록`, 'PROJECT OBSERVATORY',group.cards);checkCometUnlock();});return button;
    }));
  }
  function openAtlasDrawer(title,description,kicker='OBSERVATORY',cards=[]) {
    const drawer=document.querySelector('[data-atlas-drawer]');if(!drawer)return;
    drawer.querySelector('[data-drawer-kicker]').textContent=kicker;drawer.querySelector('[data-drawer-title]').textContent=title;drawer.querySelector('[data-drawer-description]').textContent=description;
    const grid=drawer.querySelector('[data-drawer-projects]');grid.replaceChildren(...cards.slice(0,7).map((card)=>{const article=document.createElement('article');const strong=document.createElement('b');strong.textContent=card.title;const small=document.createElement('small');small.textContent=card.subtitle||card.role||'';article.append(strong,small);return article;}));drawer.classList.add('open');
  }
  function initAtlasMoon() {
    const moon=document.querySelector('[data-atlas-moon]'),target=document.querySelector('[data-atlas-eclipse-target]');if(!moon||!target)return;
    let drag=null;moon.addEventListener('pointerdown',(event)=>{event.stopPropagation();drag={x:event.clientX,y:event.clientY,left:moon.offsetLeft,top:moon.offsetTop};moon.setPointerCapture(event.pointerId);});
    moon.addEventListener('pointermove',(event)=>{if(!drag)return;const scale=atlasApi?.camera.scale||1;moon.style.left=`${drag.left+(event.clientX-drag.x)/scale}px`;moon.style.top=`${drag.top+(event.clientY-drag.y)/scale}px`;});
    moon.addEventListener('pointerup',()=>{if(!drag)return;drag=null;const a=moon.getBoundingClientRect(),b=target.getBoundingClientRect();if(Math.hypot(a.left+a.width/2-b.left-b.width/2,a.top+a.height/2-b.top-b.height/2)<95)revealEclipse(moon.closest('.atlas-zone'));});
  }

  /* Wall_Sina keeps a physical water control while compressing the source's 110-second sequence to eleven seconds. */
  function initWallSimulator() {
    const switchButton=document.querySelector('[data-system-switch]');if(!switchButton)return;
    const slider=document.querySelector('[data-water-slider]'),run=document.querySelector('[data-simulation-run]'),water=document.querySelector('[data-water]'),barrier=document.querySelector('[data-barrier]');
    const stateLabel=document.querySelector('[data-system-state]'),stateDot=document.querySelector('[data-status-dot]'),output=document.querySelector('[data-water-output]'),sensor=document.querySelector('[data-water-sensor]'),beacon=document.querySelector('[data-alert-beacon]');
    const lights=[...document.querySelectorAll('[data-light]')],alertLeds=[...document.querySelectorAll('[data-alert-led]')],phases=[...document.querySelectorAll('[data-phase]')];
    const tmDisplay=document.querySelector('[data-tm-display]'),motorState=document.querySelector('[data-motor-state]'),buzzerState=document.querySelector('[data-buzzer-state]'),laserState=document.querySelector('[data-laser-state]');
    const sensorLevel=24;
    const system={powered:false,latched:false,waterLevel:0,sequenceFrame:0,fillFrame:0,startedAt:0,lastPhase:'off'};
    const phaseFor=(seconds)=>seconds<27?'deploy':seconds<47?'hold':seconds<70?'yellow-pulse':seconds<90?'red-yellow':seconds<110?'retract':'complete';
    const cancelFrames=()=>{cancelAnimationFrame(system.sequenceFrame);cancelAnimationFrame(system.fillFrame);system.sequenceFrame=0;system.fillFrame=0;};
    const setLight=(type,on)=>lights.find((light)=>light.dataset.light===type)?.classList.toggle('active',on);
    const setAlertLed=(type,on)=>alertLeds.find((light)=>light.dataset.alertLed===type)?.classList.toggle('active',on);
    const displayValue=(phase,seconds)=>{
      if(phase==='off'||phase==='idle')return '----';
      const value=phase==='deploy'?Math.ceil(27-seconds):phase==='hold'?Math.ceil(47-seconds):phase==='yellow-pulse'?Math.ceil(70-seconds):phase==='red-yellow'?Math.ceil(90-seconds):phase==='retract'?Math.floor(seconds):110;
      return String(clamp(value,0,9999)).padStart(4,'0');
    };
    const renderPhase=(phase,seconds=0,now=performance.now())=>{
      const slowPulse=Math.floor(now/600)%2===0,fastPulse=Math.floor(now/280)%2===0,alternate=Math.floor(now/500)%2===0;
      const raised=['deploy','hold','yellow-pulse','red-yellow'].includes(phase);
      barrier.classList.toggle('raised',raised);barrier.classList.toggle('retracting',phase==='retract');sensor.classList.toggle('detected',system.latched||system.waterLevel>=sensorLevel);
      beacon.classList.toggle('active',phase==='red-yellow'||phase==='retract');stateDot.className=`status-dot${system.powered?' on':''}${phase==='red-yellow'||phase==='retract'?' danger':''}`;
      const names={off:'전원 꺼짐',idle:'감지 대기 · 수위 정상',deploy:'수분 감지 · 방벽 상승',hold:'방벽 유지 · 황색 신호', 'yellow-pulse':'주의 · 황색 점멸','red-yellow':'위험 · 적·황 경고',retract:'복구 · 방벽 하강',complete:'시퀀스 완료 · 감지 유지'};
      stateLabel.textContent=names[phase];tmDisplay.textContent=displayValue(phase,seconds);
      setLight('green',phase==='deploy'||phase==='complete');
      setLight('yellow',phase==='hold'||phase==='yellow-pulse'&&slowPulse||phase==='red-yellow'&&fastPulse);
      setLight('red',phase==='red-yellow'&&fastPulse||phase==='retract');
      setAlertLed('red',(phase==='deploy'||phase==='hold')&&alternate||phase==='yellow-pulse'&&slowPulse||phase==='red-yellow'&&fastPulse);
      setAlertLed('blue',(phase==='deploy'||phase==='hold')&&!alternate||phase==='retract'&&slowPulse);
      motorState.textContent=phase==='deploy'?'정회전 · 방벽 상승':phase==='retract'?'역회전 · 방벽 하강':raised?'정지 · 방벽 유지':'정지';
      buzzerState.textContent=phase==='deploy'||phase==='hold'?'1 kHz · ON':'OFF';laserState.textContent=system.powered?'ON':'OFF';
      phases.forEach((row)=>row.classList.toggle('active',row.dataset.phase===phase));
      if(phase!==system.lastPhase){if(phase==='deploy')playEffect('detect');if(phase==='red-yellow')playEffect('danger');system.lastPhase=phase;}
    };
    const setWater=(level,allowTrigger=true)=>{
      system.waterLevel=clamp(level,0,100);water.style.height=`${system.waterLevel}%`;slider.value=String(Math.round(system.waterLevel));output.textContent=`${Math.round(system.waterLevel)}%`;
      sensor.classList.toggle('detected',system.latched||system.powered&&system.waterLevel>=sensorLevel);
      if(allowTrigger&&system.powered&&!system.latched&&system.waterLevel>=sensorLevel)startSequence();
    };
    const startSequence=()=>{
      if(!system.powered||system.latched)return;system.latched=true;system.startedAt=performance.now();run.disabled=true;ensureAudioContext();
      const duration=reducedMotion()?1650:11000;
      const tick=(now)=>{
        const progress=clamp((now-system.startedAt)/duration,0,1);const seconds=progress*110;renderPhase(phaseFor(seconds),seconds,now);
        if(progress<1)system.sequenceFrame=requestAnimationFrame(tick);else{renderPhase('complete',110,now);system.sequenceFrame=0;}
      };
      system.sequenceFrame=requestAnimationFrame(tick);
    };
    switchButton.addEventListener('click',()=>{
      system.powered=!system.powered;switchButton.setAttribute('aria-pressed',String(system.powered));switchButton.textContent=system.powered?'시스템 전원 끄기':'시스템 전원 켜기';slider.disabled=!system.powered;
      if(!system.powered){cancelFrames();system.latched=false;system.lastPhase='off';run.disabled=true;renderPhase('off');setWater(system.waterLevel,false);}
      else{run.disabled=false;system.lastPhase='off';renderPhase('idle');if(system.waterLevel>=sensorLevel)startSequence();}
    });
    slider.addEventListener('input',()=>setWater(Number(slider.value)));
    run.addEventListener('click',()=>{
      if(!system.powered||system.latched)return;ensureAudioContext();run.disabled=true;const from=system.waterLevel,to=Math.max(62,from),started=performance.now(),fillDuration=reducedMotion()?220:950;
      const fill=(now)=>{const progress=clamp((now-started)/fillDuration,0,1);setWater(from+(to-from)*progress);if(progress<1)system.fillFrame=requestAnimationFrame(fill);else system.fillFrame=0;};
      system.fillFrame=requestAnimationFrame(fill);
    });
    setWater(0,false);renderPhase('off');
    document.querySelectorAll('[data-component]').forEach((button)=>button.addEventListener('click',()=>{document.querySelectorAll('[data-component]').forEach((item)=>item.classList.remove('active'));button.classList.add('active');const [title,description]=button.dataset.component.split('|');document.querySelector('[data-component-title]').textContent=title;document.querySelector('[data-component-description]').textContent=description;}));
  }

  /* Boot only the interactions present on the current prototype page. */
  async function boot() {
    createIntroConstellation();createStarfields();createGrowthConstellations();createZodiacBelt();
    document.querySelectorAll('[data-sound-stop]').forEach((button)=>{button.textContent='소리 끄기 ×';button.setAttribute('aria-label','재생 중인 소리 끄기');button.addEventListener('click',stopAudio);});
    if(pageType==='story'){initStoryScroll();initStoryEclipse();projectState.groups=await loadProjectGroups();renderProjectArchive();}
    if(pageType==='atlas'){projectState.groups=await loadProjectGroups();createAtlasStations();initAtlas();document.querySelector('[data-drawer-close]')?.addEventListener('click',()=>document.querySelector('[data-atlas-drawer]')?.classList.remove('open'));}
    if(pageType==='wall')initWallSimulator();
  }
  boot().catch((error)=>console.error('Prototype initialization failed:',error));
})();

