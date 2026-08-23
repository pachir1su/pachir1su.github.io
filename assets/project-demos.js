/* v2 project detail browser demos — one-click, deterministic, dependency-free */
(() => {
  'use strict';

  const roots = [...document.querySelectorAll('[data-project-demo]')];
  if (!roots.length) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const lang = () => (document.documentElement.lang === 'en' ? 'en' : 'ko');
  const tr = (ko, en) => (lang() === 'en' ? en : ko);
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, reduced ? 0 : ms));

  function setText(el, ko, en) {
    el.dataset.ko = ko;
    el.dataset.en = en;
    el.textContent = tr(ko, en);
  }

  function status() {
    const p = document.createElement('p');
    p.className = 'demo-status';
    p.setAttribute('role', 'status');
    p.setAttribute('aria-live', 'polite');
    return p;
  }

  function shell(root, noteKo, noteEn, actionKo = '시연 시작', actionEn = 'Run demo') {
    root.innerHTML = '';
    root.classList.add('project-demo');

    const note = document.createElement('p');
    note.className = 'demo-note';
    setText(note, noteKo, noteEn);

    const grid = document.createElement('div');
    grid.className = 'demo-grid';
    const controls = document.createElement('div');
    controls.className = 'demo-controls';
    const stage = document.createElement('div');
    stage.className = 'demo-stage';

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'demo-btn';
    setText(button, actionKo, actionEn);

    const live = status();
    controls.append(button, live);
    grid.append(controls, stage);
    root.append(note, grid);

    let busy = false;
    let played = false;
    async function run(task) {
      if (busy) return;
      busy = true;
      button.disabled = true;
      setText(button, '시연 중…', 'Running…');
      try {
        await task();
        played = true;
      } finally {
        busy = false;
        button.disabled = false;
        setText(button, played ? '다시 실행' : actionKo, played ? 'Run again' : actionEn);
      }
    }

    return { stage, button, live, run };
  }

  function wall(root) {
    const ui = shell(
      root,
      '버튼 한 번으로 해수면 상승 → 센서 감지 → 장벽 상승 흐름을 재현합니다.',
      'One click replays sea-level rise → sensor detection → barrier lift.',
      '해수면 상승 시연',
      'Run sea-level demo'
    );
    ui.stage.classList.add('demo-tank');

    const water = document.createElement('div');
    water.className = 'demo-water';
    const barrier = document.createElement('div');
    barrier.className = 'demo-barrier';
    ui.stage.append(water, barrier);

    function reset() {
      water.style.height = '30%';
      barrier.style.height = '18%';
      setText(ui.live, '시연 버튼을 누르면 작동합니다.', 'Press the button to run the demo.');
      ui.live.classList.remove('warn');
    }
    reset();

    ui.button.addEventListener('click', () => ui.run(async () => {
      reset();
      setText(ui.live, '해수면 상승 중', 'Sea level rising');
      water.style.height = '68%';
      await wait(650);
      setText(ui.live, '임계 수위 감지 → 모터 작동', 'Threshold detected → motor activated');
      ui.live.classList.add('warn');
      barrier.style.height = '78%';
      await wait(700);
      setText(ui.live, '장벽 상승 완료 · 모터 정지', 'Barrier raised · motor stopped');
    }));
  }

  function ucast(root) {
    const ui = shell(
      root,
      '버튼 한 번으로 보행자 진입 감지 → 구간 경고 → 종료 감지 흐름을 재현합니다.',
      'One click replays pedestrian entry → channel warning → exit detection.',
      '보행자 감지 시연',
      'Run pedestrian demo'
    );

    const warning = document.createElement('div');
    warning.className = 'demo-warning';
    const channels = [];
    for (let i = 1; i <= 2; i += 1) {
      const row = document.createElement('div');
      row.className = 'demo-channel';
      const title = document.createElement('strong');
      title.textContent = `CH ${i}`;
      const strip = document.createElement('div');
      strip.className = 'demo-strip';
      const state = document.createElement('span');
      state.style.cssText = 'font-size:.72rem;font-weight:700;text-align:right;color:var(--text-muted)';
      setText(state, '대기', 'Standby');
      row.append(title, strip, state);
      ui.stage.append(row);
      channels.push({ strip, state });
    }
    ui.stage.append(warning);

    function setChannel(index, active) {
      channels[index].strip.classList.toggle('active', active);
      setText(channels[index].state, active ? '경고' : '대기', active ? 'Warning' : 'Standby');
    }
    function reset() {
      channels.forEach((_, index) => setChannel(index, false));
      warning.classList.remove('active');
      setText(warning, '운전자 경고 OFF · 사이렌 OFF', 'Driver warning OFF · siren OFF');
      setText(ui.live, '시연 버튼을 누르면 작동합니다.', 'Press the button to run the demo.');
    }
    reset();

    ui.button.addEventListener('click', () => ui.run(async () => {
      reset();
      setChannel(0, true);
      warning.classList.add('active');
      setText(warning, '운전자 경고 LED ON · 사이렌 ON', 'Driver warning LED ON · siren ON');
      setText(ui.live, 'CH 1 시작 IR 감지', 'CH 1 start IR detected');
      await wait(550);
      setChannel(1, true);
      setText(ui.live, 'CH 2 시작 IR 감지 · 두 구간 독립 경고', 'CH 2 start IR detected · independent channel warning');
      await wait(850);
      setChannel(0, false);
      setText(ui.live, 'CH 1 끝 IR 감지 · CH 2 경고 유지', 'CH 1 end IR detected · CH 2 remains active');
      await wait(550);
      setChannel(1, false);
      warning.classList.remove('active');
      setText(warning, '운전자 경고 OFF · 사이렌 OFF', 'Driver warning OFF · siren OFF');
      setText(ui.live, '모든 구간 통과 완료 · 대기 상태 복귀', 'All channels cleared · returned to standby');
    }));
  }

  function health(root) {
    const ui = shell(
      root,
      '버튼 한 번으로 예시 측정값을 읽고 한 건의 건강 기록을 만드는 흐름을 보여줍니다. 의료 판단 기능이 아닙니다.',
      'One click shows an example measurement and creates one health log. This is not medical advice.',
      '건강 기록 시연',
      'Run health-log demo'
    );
    ui.stage.classList.add('demo-health');

    const card = document.createElement('div');
    card.className = 'demo-health-card';
    const pulse = document.createElement('strong');
    const temp = document.createElement('strong');
    const memo = document.createElement('span');
    card.append(pulse, temp, memo);
    ui.stage.append(card);

    function reset() {
      pulse.textContent = '— BPM';
      temp.textContent = '— °C';
      setText(memo, '측정 대기', 'Waiting for measurement');
      setText(ui.live, '시연 버튼을 누르면 예시 기록을 생성합니다.', 'Press the button to create an example log.');
      ui.live.classList.remove('warn');
    }
    reset();

    ui.button.addEventListener('click', () => ui.run(async () => {
      reset();
      setText(ui.live, '센서 값 읽는 중', 'Reading sensor values');
      await wait(450);
      pulse.textContent = '76 BPM';
      temp.textContent = '36.7 °C';
      setText(memo, '상태 메모: 컨디션 양호', 'Status note: feeling well');
      await wait(450);
      setText(ui.live, '예시 기록 1건 저장 완료 · 의료 판단 없음', 'Example log saved · no medical diagnosis');
    }));
  }

  function berry(root) {
    const ui = shell(
      root,
      '버튼 한 번으로 NFC 태그 3개가 순서대로 출석 처리되는 흐름을 재현합니다.',
      'One click replays three NFC tags being checked in one by one.',
      'NFC 출석 시연',
      'Run NFC check-in demo'
    );

    const count = document.createElement('strong');
    count.className = 'demo-big-number';
    const log = document.createElement('ol');
    log.className = 'demo-log';
    ui.stage.append(count, log);
    const ids = ['20250001', '20250002', '20250003'];

    function reset() {
      log.replaceChildren();
      setText(count, '0명 출석', '0 checked in');
      setText(ui.live, '시연 버튼을 누르면 NFC 태그 입력을 재현합니다.', 'Press the button to replay NFC tag input.');
    }
    reset();

    ui.button.addEventListener('click', () => ui.run(async () => {
      reset();
      for (let i = 0; i < ids.length; i += 1) {
        await wait(i === 0 ? 250 : 500);
        const li = document.createElement('li');
        li.textContent = `${ids[i]} · NFC`;
        log.prepend(li);
        setText(count, `${i + 1}명 출석`, `${i + 1} checked in`);
        setText(ui.live, `${ids[i]} 출석 기록 완료`, `${ids[i]} check-in recorded`);
      }
      await wait(350);
      setText(ui.live, '3명 출석 처리 완료', '3 check-ins completed');
    }));
  }

  function plant(root) {
    const ui = shell(
      root,
      '버튼 한 번으로 건조 상태 감지 → 급수 → 알림 해제 흐름을 재현합니다.',
      'One click replays dry-soil detection → watering → alert cleared.',
      '식물 관리 시연',
      'Run plant-care demo'
    );
    ui.stage.classList.add('demo-plant');

    const lcd = document.createElement('div');
    lcd.className = 'demo-lcd';
    const humidity = document.createElement('b');
    const elapsed = document.createElement('b');
    const alert = document.createElement('span');
    lcd.append(humidity, elapsed, alert);
    ui.stage.append(lcd);

    function dry() {
      humidity.textContent = 'HUM 28%';
      elapsed.textContent = '30h';
      alert.textContent = 'ALERT ON';
      setText(ui.live, '토양 건조 · 급수 알림 상태', 'Dry soil · watering alert active');
      ui.live.classList.add('warn');
    }
    dry();

    ui.button.addEventListener('click', () => ui.run(async () => {
      dry();
      setText(ui.live, '건조 상태 감지 → 급수 시작', 'Dry state detected → watering started');
      await wait(650);
      humidity.textContent = 'HUM 68%';
      elapsed.textContent = '0h';
      alert.textContent = 'ALERT OFF';
      ui.live.classList.remove('warn');
      setText(ui.live, '급수 기록 완료 · 알림 해제', 'Watering logged · alert cleared');
    }));
  }

  const init = { wall, ucast, health, berry, plant };
  roots.forEach((root) => init[root.dataset.projectDemo]?.(root));

  addEventListener('portfolio:language', () => location.reload());
})();
