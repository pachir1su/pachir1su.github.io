/* Project-specific hardware demos — accessible, local-only, dependency-free. */
(() => {
  'use strict';

  const roots = [...document.querySelectorAll('[data-project-demo]')];
  if (!roots.length) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const languageRefreshers = [];
  const language = () => (document.documentElement.lang === 'en' ? 'en' : 'ko');
  const translate = (ko, en) => (language() === 'en' ? en : ko);
  const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, reducedMotion ? 0 : ms));

  // Refreshes generated text after a language change without resetting demo state.
  function registerLanguageRefresher(callback) {
    if (typeof callback === 'function') languageRefreshers.push(callback);
  }

  // Creates a DOM element with an optional class name.
  function create(tagName, className = '') {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    return element;
  }

  // Stores both translations so the global language switch can reuse them.
  function setText(element, ko, en) {
    element.dataset.ko = ko;
    element.dataset.en = en;
    element.textContent = translate(ko, en);
  }

  // Creates a translated button with the shared demo button style.
  function createButton(ko, en, className = 'demo-action') {
    const button = create('button', className);
    button.type = 'button';
    setText(button, ko, en);
    return button;
  }

  // Creates an accessible status region for changing device states.
  function createStatus(ko, en) {
    const status = create('p', 'demo-live-status');
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    setText(status, ko, en);
    return status;
  }

  // Builds the common heading only; each project supplies its own physical layout.
  function prepare(root, className, noteKo, noteEn) {
    root.replaceChildren();
    root.className = `project-demo ${className}`;
    const note = create('p', 'demo-note');
    setText(note, noteKo, noteEn);
    root.append(note);
    return root;
  }

  // Recreates the Wall_Sina warning flow with the user-reviewed physical orientation.
  function wallDemo(root) {
    prepare(
      root,
      'wall-device-demo',
      '왼쪽 해수면이 천천히 차오른 뒤 장벽이 올라가 도시 유입을 막고, 배수가 끝난 뒤에만 장벽이 내려갑니다.',
      'The sea level rises slowly on the left; the barrier protects the city and lowers only after drainage finishes.'
    );

    const layout = create('div', 'hardware-demo-layout wall-layout');
    const controls = create('div', 'hardware-control-panel');
    const controlTitle = create('strong', 'hardware-panel-title');
    setText(controlTitle, '해안 장벽 제어반', 'Coastal barrier controls');
    const powerButton = createButton('시스템 켜기', 'Power on');
    const detectButton = createButton('해수면 상승 감지', 'Detect rising water');
    const resetButton = createButton('처음 상태로', 'Reset', 'demo-action demo-action-secondary');
    const status = createStatus('시스템이 꺼져 있습니다.', 'The system is powered off.');
    controls.append(controlTitle, powerButton, detectButton, resetButton, status);

    const rig = create('div', 'wall-rig');
    const controller = create('div', 'wall-controller');
    const operation = create('span', 'wall-operation-light');
    const traffic = create('div', 'wall-traffic-light');
    const red = create('span', 'signal-lamp signal-red');
    const yellow = create('span', 'signal-lamp signal-yellow');
    const green = create('span', 'signal-lamp signal-green');
    const display = create('strong', 'wall-countdown');
    display.textContent = '----';
    const alertLights = create('div', 'wall-alert-lights');
    alertLights.append(create('span'), create('span'));
    const buzzer = create('span', 'wall-buzzer');
    buzzer.setAttribute('aria-label', translate('부저 상태', 'Buzzer state'));
    traffic.append(red, yellow, green);
    controller.append(operation, traffic, display, alertLights, buzzer);

    const tank = create('div', 'wall-tank');
    const water = create('span', 'wall-water-level');
    const sensor = create('span', 'wall-water-sensor');
    const barrier = create('span', 'wall-barrier-model');
    const city = create('div', 'wall-city');
    city.append(create('span'), create('span'), create('span'));
    tank.append(water, sensor, barrier, city);
    rig.append(controller, tank);
    layout.append(controls, rig);
    root.append(layout);

    let powered = false;
    let running = false;
    let sequenceId = 0;

    function setPhase(phase, value) {
      rig.dataset.phase = phase;
      display.textContent = String(value).padStart(4, '0');
    }

    function resetDevice(keepPower = false) {
      sequenceId += 1;
      running = false;
      powered = keepPower && powered;
      rig.classList.toggle('is-powered', powered);
      rig.classList.remove('water-detected', 'water-draining', 'barrier-raised', 'barrier-lowering', 'buzzer-on');
      rig.dataset.phase = 'off';
      display.textContent = powered ? '0000' : '----';
      detectButton.disabled = !powered;
      setText(powerButton, powered ? '시스템 끄기' : '시스템 켜기', powered ? 'Power off' : 'Power on');
      setText(status, powered ? '시스템 ON · 해수면 감지 대기' : '시스템이 꺼져 있습니다.', powered ? 'System ON · monitoring sea level' : 'The system is powered off.');
    }

    async function runWaterSequence() {
      if (!powered || running) return;
      running = true;
      const currentSequence = ++sequenceId;
      detectButton.disabled = true;
      rig.classList.add('water-detected');
      setPhase('green', 27);
      setText(status, '해수면 상승 감지', 'Rising sea detected');
      await wait(1100);
      if (sequenceId !== currentSequence) return;

      rig.classList.add('barrier-raised', 'buzzer-on');
      setText(status, '장벽 상승 · 도시 방향 유입 차단', 'Barrier rising · protecting the city side');
      await wait(1100);
      if (sequenceId !== currentSequence) return;

      rig.classList.remove('buzzer-on');
      setPhase('yellow', 20);
      setText(status, '주의 단계 · 장벽 유지', 'Caution · barrier remains raised');
      await wait(900);
      if (sequenceId !== currentSequence) return;

      setPhase('danger-flash', 20);
      setText(status, '위험 단계 · 장벽 유지 · 배수 대기', 'Danger · barrier held · waiting to drain');
      await wait(900);
      if (sequenceId !== currentSequence) return;

      rig.classList.remove('water-detected');
      rig.classList.add('water-draining');
      setPhase('red', 20);
      setText(status, '배수 중 · 장벽은 계속 올라간 상태', 'Draining · barrier stays fully raised');
      await wait(1700);
      if (sequenceId !== currentSequence) return;

      rig.classList.remove('water-draining');
      rig.classList.add('barrier-lowering');
      setText(status, '배수 완료 · 장벽 하강', 'Drainage complete · lowering barrier');
      await wait(1100);
      if (sequenceId !== currentSequence) return;

      rig.classList.remove('barrier-raised', 'barrier-lowering');
      setPhase('cycle', 110);
      setText(status, '장벽 복귀 완료 · 감시 상태', 'Barrier restored · monitoring active');
      running = false;
      detectButton.disabled = false;
    }

    powerButton.addEventListener('click', () => {
      if (running) return;
      powered = !powered;
      resetDevice(true);
    });
    detectButton.addEventListener('click', runWaterSequence);
    resetButton.addEventListener('click', () => {
      powered = false;
      resetDevice(false);
    });
    resetDevice(false);
  }

  // Builds two independent U-CAST channels with forward and reverse crossing.
  function ucastDemo(root) {
    prepare(
      root,
      'ucast-device-demo',
      '각 채널에서 정방향·역방향 횡단을 모두 시험할 수 있습니다. 어느 쪽 센서에서 시작해도 해당 채널만 경고하고 반대편 센서를 지나면 해제됩니다.',
      'Test either direction on each channel. Entering from either sensor triggers only that channel and clears at the opposite sensor.'
    );

    const layout = create('div', 'hardware-demo-layout ucast-layout');
    const controls = create('div', 'hardware-control-panel');
    const controlTitle = create('strong', 'hardware-panel-title');
    setText(controlTitle, '보행자 횡단', 'Pedestrian crossing');
    const configs = [
      { channel: 0, reverse: false, ko: 'CH-1 정방향', en: 'CH-1 forward' },
      { channel: 0, reverse: true, ko: 'CH-1 역방향', en: 'CH-1 reverse' },
      { channel: 1, reverse: false, ko: 'CH-2 정방향', en: 'CH-2 forward' },
      { channel: 1, reverse: true, ko: 'CH-2 역방향', en: 'CH-2 reverse' }
    ];
    const channelButtons = configs.map((config) => createButton(config.ko, config.en));
    const resetButton = createButton('모든 구간 초기화', 'Reset all zones', 'demo-action demo-action-secondary');
    const status = createStatus('두 구간 모두 대기 중입니다.', 'Both zones are standing by.');
    controls.append(controlTitle, ...channelButtons, resetButton, status);

    const road = create('div', 'ucast-road');
    const driverWarning = create('div', 'ucast-driver-warning');
    setText(driverWarning, '보행자 없음', 'No pedestrian');
    road.append(driverWarning);
    const channels = [];

    for (let index = 0; index < 2; index += 1) {
      const lane = create('div', 'ucast-channel');
      lane.dataset.channel = String(index + 1);
      const label = create('strong');
      label.textContent = `CH-${index + 1}`;
      const startSensor = create('span', 'ucast-sensor ucast-sensor-start');
      const strip = create('span', 'ucast-neopixel');
      const endSensor = create('span', 'ucast-sensor ucast-sensor-end');
      const pedestrian = create('span', 'ucast-pedestrian');
      pedestrian.textContent = '●';
      const state = create('span', 'ucast-state');
      setText(state, '대기', 'Standby');
      lane.append(label, startSensor, strip, endSensor, state, pedestrian);
      road.append(lane);
      channels.push({ lane, pedestrian, state, version: 0 });
    }

    layout.append(controls, road);
    root.append(layout);

    function setChannelDisabled(index, disabled) {
      configs.forEach((config, buttonIndex) => {
        if (config.channel === index) channelButtons[buttonIndex].disabled = disabled;
      });
    }

    function updateWarning() {
      const activeCount = channels.filter(({ lane }) => lane.classList.contains('is-active')).length;
      road.classList.toggle('has-warning', activeCount > 0);
      setText(
        driverWarning,
        activeCount ? `보행자 횡단 중 · ${activeCount}개 구간` : '보행자 없음',
        activeCount ? `Pedestrian crossing · ${activeCount} zone${activeCount > 1 ? 's' : ''}` : 'No pedestrian'
      );
    }

    async function runChannel(index, reverse) {
      const channel = channels[index];
      const currentVersion = ++channel.version;
      setChannelDisabled(index, true);
      /* 이전 횡단 종점에서 새 방향으로 애니메이션하지 않도록
         출발 센서 위치를 transition 없이 먼저 확정한다. */
      channel.lane.classList.remove(
        'is-active',
        'is-entering',
        'is-exiting',
        'is-reverse',
        'is-forward-complete',
        'is-reverse-complete',
        'is-preparing'
      );
      channel.lane.classList.toggle('is-reverse', reverse);
      channel.lane.classList.add('is-preparing');
      void channel.pedestrian.offsetWidth;
      channel.lane.classList.remove('is-preparing');
      channel.lane.classList.add('is-active', 'is-entering');
      setText(channel.state, reverse ? '역방향 경고' : '정방향 경고', reverse ? 'Reverse warning' : 'Forward warning');
      setText(
        status,
        `CH-${index + 1} ${reverse ? '오른쪽' : '왼쪽'} 진입 센서 감지`,
        `CH-${index + 1} ${reverse ? 'right' : 'left'} entry sensor detected`
      );
      updateWarning();
      await wait(1000);
      if (channel.version !== currentVersion) return;
      channel.lane.classList.remove('is-entering');
      channel.lane.classList.add('is-exiting');
      setText(status, `CH-${index + 1} 반대편 센서 접근`, `CH-${index + 1} approaching opposite sensor`);
      await wait(1000);
      if (channel.version !== currentVersion) return;
      channel.lane.classList.remove('is-active', 'is-exiting', 'is-reverse');
      channel.lane.classList.add(reverse ? 'is-reverse-complete' : 'is-forward-complete');
      setText(channel.state, '대기', 'Standby');
      setChannelDisabled(index, false);
      updateWarning();
      setText(status, `CH-${index + 1} 횡단 완료`, `CH-${index + 1} crossing complete`);
    }

    configs.forEach((config, buttonIndex) => {
      channelButtons[buttonIndex].addEventListener('click', () => runChannel(config.channel, config.reverse));
    });
    resetButton.addEventListener('click', () => {
      channels.forEach((channel, index) => {
        channel.version += 1;
        channel.lane.classList.remove('is-active', 'is-entering', 'is-exiting', 'is-reverse', 'is-forward-complete', 'is-reverse-complete', 'is-preparing');
        setText(channel.state, '대기', 'Standby');
        setChannelDisabled(index, false);
      });
      updateWarning();
      setText(status, '두 구간 모두 초기화했습니다.', 'Both zones were reset.');
    });
    updateWarning();
  }

  // Builds the BerryIno keypad and RFID attendance workflow with fictional IDs only.
  function berryDemo(root) {
    prepare(
      root,
      'berry-device-demo',
      '가상 학생 번호를 직접 입력하거나, 학생증을 RFID 리더에 드래그하세요. 모바일에서는 학생증을 누른 뒤 리더를 누르면 됩니다.',
      'Enter a fictional student ID or drag a card onto the RFID reader. On mobile, tap a card and then the reader.'
    );

    const layout = create('div', 'hardware-demo-layout berry-layout');
    const controls = create('div', 'berry-control-panel');
    const label = create('label', 'berry-input-label');
    setText(label, '가상 학생 번호 직접 입력', 'Enter a fictional student ID');
    const inputRow = create('div', 'berry-input-row');
    const input = create('input', 'berry-id-input');
    input.type = 'text';
    input.id = 'berry-fictional-id';
    input.inputMode = 'numeric';
    input.maxLength = 4;
    input.placeholder = '0004';
    input.setAttribute('aria-label', translate('가상 학생 번호 4자리', 'Four-digit fictional student ID'));
    label.htmlFor = input.id;
    const submitButton = createButton('직접 출석', 'Manual check-in');
    inputRow.append(input, submitButton);
    const resetButton = createButton('출석 기록 초기화', 'Clear attendance', 'demo-action demo-action-secondary');
    const status = createStatus('출석 입력을 기다리고 있습니다.', 'Waiting for a check-in.');
    controls.append(label, inputRow, resetButton, status);

    const workbench = create('div', 'berry-workbench');
    const cards = create('div', 'berry-card-stack');
    const cardIds = ['DEMO-0001', 'DEMO-0002', 'DEMO-0003'];
    const cardElements = [];
    const supportsPointerDrag = window.matchMedia?.('(hover: hover) and (pointer: fine)').matches ?? true;
    cardIds.forEach((id, index) => {
      const card = create('button', 'berry-student-card');
      card.type = 'button';
      /* 터치에서는 브라우저의 길게 누르기 선택/드래그 대신 탭 흐름만 제공한다. */
      card.draggable = supportsPointerDrag;
      card.dataset.studentId = id;
      card.style.setProperty('--card-index', String(index));
      card.innerHTML = `<span aria-hidden="true">KOREATECH</span><strong>${id}</strong><small>${translate('가상 학생증', 'Demo student card')}</small>`;
      card.setAttribute('aria-label', translate(`${id} 가상 학생증 선택`, `Select fictional card ${id}`));
      cards.append(card);
      cardElements.push(card);
    });

    const reader = create('button', 'berry-rfid-reader');
    reader.type = 'button';
    reader.innerHTML = `<span class="berry-rfid-wave" aria-hidden="true">)))</span><strong>RC522</strong><small>RFID</small>`;
    reader.setAttribute('aria-label', translate('RFID 리더에 선택한 학생증 태그', 'Scan selected card on the RFID reader'));
    const dashboard = create('div', 'berry-dashboard');
    const count = create('strong', 'berry-attendance-count');
    const list = create('ol', 'berry-attendance-list');
    dashboard.append(count, list);
    workbench.append(cards, reader, dashboard);
    layout.append(controls, workbench);
    root.append(layout);

    const attendance = new Map();
    let selectedId = '';

    // Converts exactly four typed digits into an explicit demo-only namespace.
    function normalizeId(value) {
      const digits = value.replace(/\D/g, '').slice(-4);
      if (digits.length !== 4) return '';
      return `DEMO-${digits}`;
    }

    // Repaints the attendance dashboard without storing or transmitting data.
    function renderAttendance() {
      count.textContent = translate(`${attendance.size}명 출석`, `${attendance.size} checked in`);
      list.replaceChildren();
      [...attendance.entries()].slice(-4).reverse().forEach(([id, checkedAt]) => {
        const item = create('li');
        const date = checkedAt.toLocaleDateString(language() === 'en' ? 'en-CA' : 'ko-KR', {
          year: 'numeric', month: '2-digit', day: '2-digit'
        });
        const time = checkedAt.toLocaleTimeString(language() === 'en' ? 'en-GB' : 'ko-KR', {
          hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
        });
        item.textContent = `${id} · ${date} ${time} · ${translate('출석 완료', 'Checked in')}`;
        list.append(item);
      });
      cardElements.forEach((card) => card.classList.toggle('is-checked', attendance.has(card.dataset.studentId)));
    }

    // Records one fictional ID and rejects duplicate scans.
    function checkIn(id, methodKo, methodEn) {
      if (!id) {
        setText(status, '가상 학생 번호 4자리를 입력하세요.', 'Enter four digits for a fictional ID.');
        status.classList.add('is-error');
        return;
      }
      status.classList.remove('is-error');
      if (attendance.has(id)) {
        setText(status, `${id} · 이미 출석 처리된 학생입니다.`, `${id} · already checked in.`);
        reader.classList.add('is-duplicate');
        window.setTimeout(() => reader.classList.remove('is-duplicate'), 500);
        return;
      }
      attendance.set(id, new Date());
      renderAttendance();
      setText(status, `${id} · ${methodKo} 출석 완료`, `${id} · checked in by ${methodEn}`);
      reader.classList.add('is-success');
      window.setTimeout(() => reader.classList.remove('is-success'), 650);
    }

    submitButton.addEventListener('click', () => {
      const id = normalizeId(input.value);
      checkIn(id, '직접 입력', 'manual entry');
      if (id) input.value = '';
    });
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') submitButton.click();
    });
    cardElements.forEach((card) => {
      card.addEventListener('click', () => {
        selectedId = card.dataset.studentId;
        cardElements.forEach((candidate) => candidate.classList.toggle('is-selected', candidate === card));
        setText(status, `${selectedId} 학생증 선택 · 리더를 누르세요.`, `${selectedId} selected · tap the reader.`);
      });
      card.addEventListener('dragstart', (event) => {
        selectedId = card.dataset.studentId;
        event.dataTransfer?.setData('text/plain', selectedId);
      });
    });
    reader.addEventListener('dragover', (event) => event.preventDefault());
    reader.addEventListener('drop', (event) => {
      event.preventDefault();
      const id = event.dataTransfer?.getData('text/plain') || selectedId;
      checkIn(id, 'RFID 태그', 'RFID');
    });
    reader.addEventListener('click', () => {
      if (!selectedId) {
        setText(status, '먼저 가상 학생증을 선택하세요.', 'Select a fictional card first.');
        return;
      }
      checkIn(selectedId, 'RFID 태그', 'RFID');
    });
    resetButton.addEventListener('click', () => {
      attendance.clear();
      selectedId = '';
      input.value = '';
      cardElements.forEach((card) => card.classList.remove('is-selected', 'is-checked'));
      renderAttendance();
      setText(status, '출석 기록을 초기화했습니다.', 'Attendance was cleared.');
    });
    registerLanguageRefresher(() => {
      cardElements.forEach((card) => {
        const label = card.querySelector('small');
        if (label) setText(label, '가상 학생증', 'Demo student card');
        card.setAttribute('aria-label', translate(`${card.dataset.studentId} 가상 학생증 선택`, `Select fictional card ${card.dataset.studentId}`));
      });
      reader.setAttribute('aria-label', translate('RFID 리더에 선택한 학생증 태그', 'Scan selected card on the RFID reader'));
      renderAttendance();
    });
    renderAttendance();
  }

  // Recreates PlantClock from the public Arduino source: RTC/FND, live soil reading, lever-controlled fan and RGB state.
  function plantDemo(root) {
    prepare(
      root,
      'plant-device-demo',
      '원본 코드처럼 급수 시각·경과 시간·토양 습도를 표시하고, 레버로 팬을 켜면 RGB 상태 LED가 빨강에서 초록으로 바뀝니다.',
      'Like the source device, this shows watering time, elapsed time and soil moisture; the fan lever changes its RGB state from red to green.'
    );

    const layout = create('div', 'hardware-demo-layout plant-layout');
    const controls = create('div', 'hardware-control-panel');
    const controlTitle = create('strong', 'hardware-panel-title');
    setText(controlTitle, 'PlantClock 조작부', 'PlantClock controls');
    const timeButton = createButton('시간 +10분', 'Advance +10 min');
    const waterButton = createButton('급수 버튼', 'Watering button');
    const fanButton = createButton('팬 레버 ON', 'Fan lever ON');
    const resetButton = createButton('처음 상태로', 'Reset', 'demo-action demo-action-secondary');
    const status = createStatus('마지막 급수 후 0분 · 알림 없음', '0 minutes since watering · no alert');
    controls.append(controlTitle, timeButton, waterButton, fanButton, resetButton, status);

    const device = create('div', 'plantclock-device');
    const plant = create('div', 'plantclock-pot');
    plant.innerHTML = '<span class="plant-pot-body"><span class="plant-soil"></span></span><span class="plant-stem"></span><span class="plant-branch plant-branch-left"></span><span class="plant-branch plant-branch-right"></span><span class="plant-leaf plant-leaf-left"></span><span class="plant-leaf plant-leaf-right"></span>';
    plant.append(create('span', 'plant-tomato plant-tomato-a'), create('span', 'plant-tomato plant-tomato-b'), create('span', 'plant-tomato plant-tomato-c'));
    const lcd = create('div', 'plantclock-lcd');
    const soilLine = create('span');
    const timeLine = create('span');
    lcd.append(soilLine, timeLine);
    const displays = create('div', 'plantclock-fnd-row');
    const lastWater = create('div', 'plantclock-fnd');
    const elapsed = create('div', 'plantclock-fnd');
    displays.append(lastWater, elapsed);
    const indicators = create('div', 'plantclock-indicators');
    const alertLed = create('span', 'plant-alert-led');
    const vibration = create('span', 'plant-vibration');
    const buzzer = create('span', 'plant-buzzer');
    const fanUnit = create('div', 'plant-fan-unit');
    const fanLed = create('span', 'plant-fan-led');
    const fanRotor = create('span', 'plant-fan-rotor');
    fanRotor.textContent = '';
    fanRotor.setAttribute('aria-hidden', 'true');
    const fanLabel = create('small', 'plant-fan-label');
    fanLabel.textContent = 'FAN';
    fanUnit.append(fanLed, fanRotor, fanLabel);
    indicators.append(alertLed, vibration, buzzer, fanUnit);
    device.append(plant, lcd, displays, indicators);
    layout.append(controls, device);
    root.append(layout);

    let elapsedMinutes = 0;
    let clockMinutes = 9 * 60;
    let lastWaterMinutes = clockMinutes;
    let fanOn = false;
    let soilValue = 612;

    function formatTime(totalMinutes) {
      const hours = Math.floor(totalMinutes / 60) % 24;
      const minutes = totalMinutes % 60;
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }

    function renderPlantClock() {
      const alertActive = elapsedMinutes >= 30;
      device.classList.toggle('has-alert', alertActive);
      device.classList.toggle('fan-on', fanOn);
      soilLine.textContent = `Soil: ${soilValue}`;
      timeLine.textContent = `Time: ${formatTime(clockMinutes)}`;
      lastWater.innerHTML = `<small>${translate('마지막 급수', 'Last water')}</small><strong>${formatTime(lastWaterMinutes)}</strong>`;
      elapsed.innerHTML = `<small>${translate('경과 시간', 'Elapsed')}</small><strong>${elapsedMinutes}</strong>`;
      setText(fanButton, fanOn ? '팬 레버 OFF' : '팬 레버 ON', fanOn ? 'Fan lever OFF' : 'Fan lever ON');
      setText(
        status,
        alertActive ? `${elapsedMinutes}분 경과 · LED·진동·부저 알림` : `마지막 급수 후 ${elapsedMinutes}분 · 토양 ${soilValue} · 알림 없음`,
        alertActive ? `${elapsedMinutes} min · LED, vibration and buzzer alert` : `${elapsedMinutes} min since watering · soil ${soilValue} · no alert`
      );
    }

    registerLanguageRefresher(renderPlantClock);

    timeButton.addEventListener('click', () => {
      elapsedMinutes += 10;
      clockMinutes += 10;
      soilValue = Math.max(260, soilValue - 18);
      renderPlantClock();
    });
    waterButton.addEventListener('click', () => {
      lastWaterMinutes = clockMinutes;
      elapsedMinutes = 0;
      soilValue = Math.min(900, soilValue + 165);
      renderPlantClock();
      setText(status, '급수 시각을 기록하고 알림을 해제했습니다.', 'Watering time saved and alert cleared.');
    });
    fanButton.addEventListener('click', () => {
      fanOn = !fanOn;
      renderPlantClock();
    });
    resetButton.addEventListener('click', () => {
      elapsedMinutes = 0;
      clockMinutes = 9 * 60;
      lastWaterMinutes = clockMinutes;
      fanOn = false;
      soilValue = 612;
      renderPlantClock();
    });
    renderPlantClock();
  }

  // Builds the cafeteria counter from 17 people and compresses the ten-second red phase.
  function signalCounterDemo(root) {
    prepare(
      root,
      'signal-counter-device-demo',
      '17명부터 시작합니다. 실제 계수 버튼을 세 번 눌러 20명에 도달하면 빨간불이 켜지고, 실제 10초 대기는 짧게 압축됩니다.',
      'Start at 17 people. Press the physical counter three times; at 20, the red phase begins and the real ten-second wait is compressed.'
    );

    const layout = create('div', 'hardware-demo-layout signal-counter-layout');
    const controls = create('div', 'hardware-control-panel');
    const countButton = createButton('입장 인원 +1', 'Count one entry', 'demo-action signal-physical-button');
    const resetButton = createButton('17명으로 초기화', 'Reset to 17', 'demo-action demo-action-secondary');
    const status = createStatus('17명 · 입장 가능', '17 people · entry open');
    controls.append(countButton, resetButton, status);

    const device = create('div', 'signal-counter-device');
    const tower = create('div', 'signal-counter-tower');
    const red = create('span', 'signal-lamp signal-red');
    const yellow = create('span', 'signal-lamp signal-yellow');
    const green = create('span', 'signal-lamp signal-green');
    tower.append(red, yellow, green);
    const counter = create('div', 'signal-counter-display');
    const counterNumber = create('strong');
    const counterLabel = create('span');
    setText(counterLabel, '현재 입장 인원', 'Current entries');
    counter.append(counterNumber, counterLabel);
    device.append(tower, counter);
    layout.append(controls, device);
    root.append(layout);

    let count = 17;
    let locked = false;
    let runId = 0;

    // Repaints the counter and traffic light from the current admission state.
    function renderSignal() {
      counterNumber.textContent = String(count).padStart(2, '0');
      device.classList.toggle('is-red', locked);
      device.classList.toggle('is-green', !locked);
      countButton.disabled = locked;
    }

    // Compresses the real ten-second red light into a short visual countdown.
    async function runRedPhase() {
      locked = true;
      const currentRun = ++runId;
      renderSignal();
      setText(status, '20명 도달 · 빨간불 · 실기 기준 약 10초 대기', '20 reached · red light · about 10s on hardware');
      await wait(1950);
      if (runId !== currentRun) return;
      count = 0;
      locked = false;
      renderSignal();
      setText(status, '대기 종료 · 초록불 · 계수 0명', 'Wait complete · green light · count reset to 0');
    }

    countButton.addEventListener('click', () => {
      if (locked) return;
      count += 1;
      renderSignal();
      if (count >= 20) {
        runRedPhase();
      } else {
        setText(status, `${count}명 · 입장 가능`, `${count} people · entry open`);
      }
    });
    resetButton.addEventListener('click', () => {
      runId += 1;
      count = 17;
      locked = false;
      renderSignal();
      setText(status, '17명 · 입장 가능', '17 people · entry open');
    });
    renderSignal();
  }

  // Password door-lock demo based on pachir1su/Master_Creator_Challenge/main.ino.
  function doorlockDemo(root) {
    prepare(
      root,
      'doorlock-device-demo',
      '6자리 비밀번호(123456)·LCD·서보 잠금·성공/실패 신호를 숫자 키패드로 재현합니다.',
      'A numeric-keypad demo of the six-digit password (123456), LCD, servo lock and success/failure signals.'
    );

    const layout = create('div', 'hardware-demo-layout doorlock-layout');
    const controls = create('div', 'hardware-control-panel');
    const controlTitle = create('strong', 'hardware-panel-title');
    setText(controlTitle, '숫자 키패드', 'Numeric keypad');
    const keypad = create('div', 'doorlock-keypad');
    const inputButton = createButton('입력', 'Input', 'demo-action doorlock-input-action');
    const closeButton = createButton('닫힘', 'Close / Lock', 'demo-action demo-action-secondary doorlock-close-action');
    const status = createStatus('비밀번호를 입력하세요.', 'Enter the password.');
    controls.append(controlTitle, keypad, inputButton, closeButton, status);

    const rig = create('div', 'doorlock-rig');
    const lcd = create('div', 'doorlock-lcd');
    const door = create('div', 'doorlock-door');
    const bolt = create('span', 'doorlock-bolt');
    door.append(bolt);
    const lights = create('div', 'doorlock-lights');
    const red = create('span', 'doorlock-lamp doorlock-red');
    const green = create('span', 'doorlock-lamp doorlock-green');
    lights.append(red, green);
    rig.append(lcd, door, lights);
    layout.append(controls, rig);
    root.append(layout);

    const password = '123456';
    let input = '';
    let locked = true;

    function render(messageKo = '', messageEn = '') {
      rig.classList.toggle('is-unlocked', !locked);
      lcd.innerHTML = `<strong>${locked ? 'LOCKED' : 'OPEN'}</strong><br>${input ? `Password: ${input}` : 'Enter Password:'}`;
      if (messageKo || messageEn) setText(status, messageKo, messageEn);
    }

    function clearInput() {
      input = '';
      render('입력을 초기화했습니다.', 'Input cleared.');
    }
    function unlock() {
      locked = false; input = '';
      render('Access Granted · 서보 90° · 초록 신호', 'Access Granted · servo 90° · green signal');
    }
    function lock() {
      locked = true; input = '';
      render('Door Locked · 서보 0° · 빨간 신호', 'Door Locked · servo 0° · red signal');
    }
    function alarm() {
      locked = true; input = '';
      rig.classList.add('is-alarm');
      render('Access Denied · 경보음 및 빨간 신호', 'Access Denied · alarm and red signal');
      window.setTimeout(() => rig.classList.remove('is-alarm'), 1300);
    }

    const keyButtons = [];
    ['1','2','3','4','5','6','7','8','9','*','0','<-'].forEach((key) => {
      const button = create('button', 'doorlock-key');
      button.type = 'button';
      keyButtons.push({ key, button });
      button.addEventListener('click', () => {
        if (key === '*') { clearInput(); return; }
        if (key === '<-') {
          if (input) input = input.slice(0, -1);
          render(input ? '마지막 한 글자를 지웠습니다.' : '입력값이 없습니다.', input ? 'Deleted the last character.' : 'No input to delete.');
          return;
        }
        if (input.length >= password.length) {
          render('비밀번호는 6자리입니다.', 'The password is six digits.');
          return;
        }
        input += key;
        render('키 입력 · 입력 버튼으로 확인', 'Key entered · press Input to confirm');
      });
      keypad.append(button);
    });
    function refreshKeypadLanguage() {
      keyButtons.forEach(({ key, button }) => {
        if (key === '*') {
          setText(button, '초기화', 'Reset');
          button.setAttribute('aria-label', translate('입력 초기화', 'Reset input'));
          return;
        }
        button.textContent = key;
        button.setAttribute('aria-label', key === '<-' ? translate('한 글자 지우기', 'Delete one character') : key);
      });
    }
    registerLanguageRefresher(refreshKeypadLanguage);
    refreshKeypadLanguage();
    inputButton.addEventListener('click', () => {
      if (input === password) unlock(); else alarm();
    });
    closeButton.addEventListener('click', () => {
      if (locked) {
        setText(status, '이미 잠긴 상태입니다.', 'The door is already locked.');
        return;
      }
      lock();
    });
    render();
  }


  const demos = {
    wall: wallDemo,
    ucast: ucastDemo,
    berry: berryDemo,
    plant: plantDemo,
    signal: signalCounterDemo,
    doorlock: doorlockDemo
  };

  // Initializes only demos explicitly declared by their project pages.
  roots.forEach((root) => demos[root.dataset.projectDemo]?.(root));

  // Refreshes dynamic fragments after a language change while preserving scroll and demo state.
  window.addEventListener('portfolio:language', () => {
    languageRefreshers.forEach((refresh) => {
      try {
        refresh();
      } catch (error) {
        console.warn('Unable to refresh a project demo language fragment.', error);
      }
    });
  });
})();
