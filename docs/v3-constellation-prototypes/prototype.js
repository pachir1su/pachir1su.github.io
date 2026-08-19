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
  const sequenceState = { expected:0, complete:false };
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
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.classList.add('growth-lines'); svg.setAttribute('viewBox', '0 0 100 100'); svg.setAttribute('preserveAspectRatio', 'none');
      growthPoints.slice(1).forEach((point, index) => {
        const previous = growthPoints[index];
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', previous[0]); line.setAttribute('y1', previous[1]); line.setAttribute('x2', point[0]); line.setAttribute('y2', point[1]);
        line.dataset.growthLine = String(index); svg.append(line);
      });
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
        node.addEventListener('click', () => selectGrowthEvent(container, index));
        container.append(node, label);
      });
    });
  }
  function selectGrowthEvent(container, index) {
    const event = growthEvents[index];
    container.querySelectorAll('.growth-label').forEach((label) => label.classList.toggle('active', Number(label.dataset.growthLabel) === index));
    const summary = document.querySelector('[data-growth-summary]');
    if (summary) summary.textContent = `${event.year} · ${event.title} — ${event.detail}`;
    if (pageType === 'atlas') openAtlasDrawer(`${event.year} · ${event.title}`, event.detail, 'GROWTH CONSTELLATION');
    const clickedNode = container.querySelector(`[data-growth-index="${index}"]`);
    if (sequenceState.complete || clickedNode.classList.contains('seen')) return;
    if (index !== sequenceState.expected) {
      clickedNode.classList.remove('wrong'); void clickedNode.offsetWidth; clickedNode.classList.add('wrong');
      updateSequenceStatus(`다음 별은 ${growthEvents[sequenceState.expected].year} · ${growthEvents[sequenceState.expected].title}`);
      return;
    }
    clickedNode.classList.add('seen');
    container.querySelector(`[data-growth-line="${index - 1}"]`)?.classList.add('active');
    sequenceState.expected += 1;
    document.querySelectorAll(`[data-growth-index="${index}"]`).forEach((node) => node.classList.add('seen'));
    document.querySelectorAll(`[data-growth-line="${index - 1}"]`).forEach((line) => line.classList.add('active'));
    if (sequenceState.expected === growthEvents.length) {
      sequenceState.complete = true;
      updateSequenceStatus('별자리 완성 · 숨은 20초 신호 재생 중');
      playConstellationMusic();
    } else updateSequenceStatus(`${sequenceState.expected}번째 별 연결 완료`);
  }
  function updateSequenceStatus(message) {
    document.querySelectorAll('[data-sequence-count]').forEach((node) => { node.textContent = `${sequenceState.expected} / ${growthEvents.length}`; });
    document.querySelectorAll('[data-sequence-message]').forEach((node) => { node.textContent = message; });
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
    viewport.addEventListener('pointerdown',(event)=>{if(!desktop()||event.target.closest('button,a,[data-atlas-moon]'))return;camera.drag={x:event.clientX,y:event.clientY,cx:camera.x,cy:camera.y};viewport.setPointerCapture(event.pointerId);viewport.classList.add('dragging');});
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

  /* Wall_Sina simulator compresses the repository's staged physical behavior into ten seconds. */
  function initWallSimulator() {
    const switchButton=document.querySelector('[data-system-switch]');if(!switchButton)return;
    const slider=document.querySelector('[data-water-slider]'),run=document.querySelector('[data-simulation-run]'),water=document.querySelector('[data-water]'),barrier=document.querySelector('[data-barrier]');
    const stateLabel=document.querySelector('[data-system-state]'),stateDot=document.querySelector('[data-status-dot]'),output=document.querySelector('[data-water-output]'),sensor=document.querySelector('[data-water-sensor]'),beacon=document.querySelector('[data-alert-beacon]');
    const lights=[...document.querySelectorAll('[data-light]')],phases=[...document.querySelectorAll('[data-phase]')];
    let powered=false,frame=0,lastPhase='off';
    const phaseFor=(level,recovering=false)=>recovering?'recover':level<20?'safe':level<45?'detect':level<70?'caution':'danger';
    const render=(level,recovering=false)=>{
      const phase=powered?phaseFor(level,recovering):'off';water.style.height=`${level}%`;slider.value=String(Math.round(level));output.textContent=`${Math.round(level)}%`;
      barrier.classList.toggle('raised',powered&&level>=20&&!recovering);barrier.classList.toggle('recovering',powered&&recovering);sensor.classList.toggle('detected',powered&&level>=20);
      beacon.classList.toggle('active',phase==='danger');stateDot.className=`status-dot${powered?' on':''}${phase==='danger'?' danger':''}`;
      const names={off:'전원 꺼짐',safe:'대기 · 수위 정상',detect:'수분 감지 · 장벽 상승',caution:'주의 · 황색 신호',danger:'위험 · 적색 경고',recover:'복구 · 장벽 초기화'};stateLabel.textContent=names[phase];
      lights.forEach((light)=>light.classList.toggle('active',(phase==='safe'||phase==='detect')&&light.dataset.light==='green'||phase==='caution'&&light.dataset.light==='yellow'||(phase==='danger'||phase==='recover')&&light.dataset.light==='red'));
      phases.forEach((row)=>row.classList.toggle('active',row.dataset.phase===phase));
      if(phase!==lastPhase){if(phase==='detect')playEffect('detect');if(phase==='danger')playEffect('danger');lastPhase=phase;}
    };
    switchButton.addEventListener('click',()=>{powered=!powered;switchButton.setAttribute('aria-pressed',String(powered));switchButton.textContent=powered?'시스템 전원 끄기':'시스템 전원 켜기';slider.disabled=!powered;run.disabled=!powered;if(!powered){cancelAnimationFrame(frame);render(0);}else render(Number(slider.value));});
    slider.addEventListener('input',()=>render(Number(slider.value)));
    run.addEventListener('click',()=>{if(!powered)return;cancelAnimationFrame(frame);ensureAudioContext();run.disabled=true;const started=performance.now();const duration=reducedMotion()?1200:10000;const animate=(now)=>{const elapsed=now-started;const progress=clamp(elapsed/duration,0,1);let level,recovering=false;if(progress<.78)level=progress/.78*100;else{recovering=true;level=(1-(progress-.78)/.22)*100;}render(clamp(level,0,100),recovering);if(progress<1)frame=requestAnimationFrame(animate);else{render(0);run.disabled=false;}};frame=requestAnimationFrame(animate);});
    render(0);
    document.querySelectorAll('[data-component]').forEach((button)=>button.addEventListener('click',()=>{document.querySelectorAll('[data-component]').forEach((item)=>item.classList.remove('active'));button.classList.add('active');const [title,description]=button.dataset.component.split('|');document.querySelector('[data-component-title]').textContent=title;document.querySelector('[data-component-description]').textContent=description;}));
  }

  /* Boot only the interactions present on the current prototype page. */
  async function boot() {
    createStarfields(); createGrowthConstellations();
    document.querySelectorAll('[data-sound-stop]').forEach((button)=>button.addEventListener('click',stopAudio));
    if(pageType==='story'){initStoryScroll();initStoryEclipse();projectState.groups=await loadProjectGroups();renderProjectArchive();}
    if(pageType==='atlas'){projectState.groups=await loadProjectGroups();createAtlasStations();initAtlas();document.querySelector('[data-drawer-close]')?.addEventListener('click',()=>document.querySelector('[data-atlas-drawer]')?.classList.remove('open'));}
    if(pageType==='wall')initWallSimulator();
  }
  boot().catch((error)=>console.error('Prototype initialization failed:',error));
})();

