/* Project-specific hardware demos — accessible, local-only, dependency-free. */
(() => {
  'use strict';

  const roots = [...document.querySelectorAll('[data-project-demo]')];
  if (!roots.length) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const language = () => (document.documentElement.lang === 'en' ? 'en' : 'ko');
  const translate = (ko, en) => (language() === 'en' ? en : ko);
  const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, reducedMotion ? 0 : ms));

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

  // Recreates the Wall_Sina Arduino sequence from the public source repository.
  function wallDemo(root) {
    prepare(
      root,
      'wall-device-demo',
      '원본 장치처럼 시스템을 켠 뒤 수위 센서에 물을 감지시키세요. 실제 110초 경고 흐름은 짧게 압축됩니다.',
      'Power on the system, then trigger the water sensor. The original 110-second warning sequence is compressed.'
    );

    const layout = create('div', 'hardware-demo-layout wall-layout');
    const controls = create('div', 'hardware-control-panel');
    const controlTitle = create('strong', 'hardware-panel-title');
    setText(controlTitle, '해안 장벽 제어반', 'Coastal barrier controls');
    const powerButton = createButton('시스템 켜기', 'Power on');
    const detectButton = createButton('수위 센서에 물 감지', 'Trigger water sensor');
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
    const city = create('div', 'wall-city');
    city.append(create('span'), create('span'), create('span'));
    const sensor = create('span', 'wall-water-sensor');
    const barrier = create('span', 'wall-barrier-model');
    const water = create('span', 'wall-water-level');
    tank.append(city, sensor, barrier, water);
    rig.append(controller, tank);
    layout.append(controls, rig);
    root.append(layout);

    let powered = false;
    let running = false;
    let sequenceId = 0;

    // Applies one traffic-light phase and mirrors its countdown display.
    function setPhase(phase, value) {
      rig.dataset.phase = phase;
      display.textContent = String(value).padStart(4, '0');
    }

    // Returns every indicator and mechanical part to the source-code idle state.
    function resetDevice(keepPower = false) {
      sequenceId += 1;
      running = false;
      powered = keepPower && powered;
      rig.classList.toggle('is-powered', powered);
      rig.classList.remove('water-detected', 'barrier-raised', 'barrier-lowering', 'buzzer-on');
      rig.dataset.phase = 'off';
      display.textContent = powered ? '0000' : '----';
      detectButton.disabled = !powered;
      setText(powerButton, powered ? '시스템 끄기' : '시스템 켜기', powered ? 'Power off' : 'Power on');
      setText(status, powered ? '시스템 ON · 수위 감지 대기' : '시스템이 꺼져 있습니다.', powered ? 'System ON · waiting for water' : 'The system is powered off.');
    }

    // Runs the five real warning stages on an intentionally compressed timeline.
    async function runWaterSequence() {
      if (!powered || running) return;
      running = true;
      const currentSequence = ++sequenceId;
      detectButton.disabled = true;
      rig.classList.add('water-detected', 'barrier-raised', 'buzzer-on');
      setPhase('green', 27);
      setText(status, '물 감지 · 초록 신호 · 모터 정회전 · 장벽 상승', 'Water detected · green · motor forward · barrier rising');
      await wait(850);
      if (sequenceId !== currentSequence) return;

      rig.classList.remove('buzzer-on');
      setPhase('yellow', 20);
      setText(status, '주의 단계 · 노란 신호 · 모터 정지', 'Caution · yellow signal · motor stopped');
      await wait(650);
      if (sequenceId !== currentSequence) return;

      setPhase('yellow-flash', 23);
      setText(status, '노란 신호와 보조 경고등 점멸', 'Yellow signal and auxiliary warning lights flashing');
      await wait(650);
      if (sequenceId !== currentSequence) return;

      setPhase('danger-flash', 20);
      setText(status, '위험 단계 · 빨강과 노랑 교차 경고', 'Danger · red and yellow alternating');
      await wait(650);
      if (sequenceId !== currentSequence) return;

      rig.classList.add('barrier-lowering');
      setPhase('red', 20);
      setText(status, '복구 단계 · 빨간 신호 · 모터 역회전', 'Recovery · red signal · motor reversing');
      await wait(850);
      if (sequenceId !== currentSequence) return;

      rig.classList.remove('barrier-raised', 'barrier-lowering', 'water-detected');
      setPhase('cycle', 110);
      setText(status, '장벽 복귀 완료 · 신호등 순환 상태', 'Barrier restored · signal cycle active');
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

  // Builds two independent U-CAST channels that can be triggered in any order.
  function ucastDemo(root) {
    prepare(
      root,
      'ucast-device-demo',
      '보행자를 각 구간에 진입시켜 보세요. 두 채널은 서로 독립적으로 경고하고, 끝 센서를 지나면 해당 구간만 꺼집니다.',
      'Send pedestrians into either zone. Each channel warns independently and clears at its own exit sensor.'
    );

    const layout = create('div', 'hardware-demo-layout ucast-layout');
    const controls = create('div', 'hardware-control-panel');
    const controlTitle = create('strong', 'hardware-panel-title');
    setText(controlTitle, '보행자 투입', 'Pedestrian controls');
    const channelButtons = [
      createButton('보행자 A · 1구간 진입', 'Pedestrian A · enter zone 1'),
      createButton('보행자 B · 2구간 진입', 'Pedestrian B · enter zone 2')
    ];
    const resetButton = createButton('모든 구간 초기화', 'Reset all zones', 'demo-action demo-action-secondary');
    const status = createStatus('두 구간 모두 대기 중입니다.', 'Both zones are standing by.');
    controls.append(controlTitle, ...channelButtons, resetButton, status);

    const road = create('div', 'ucast-road');
    const driverWarning = create('div', 'ucast-driver-warning');
    setText(driverWarning, '운전자 경고 OFF', 'Driver warning OFF');
    road.append(driverWarning);
    const channels = [];

    // Creates one independently animated road-safety channel.
    for (let index = 0; index < 2; index += 1) {
      const lane = create('div', 'ucast-channel');
      lane.dataset.channel = String(index + 1);
      const label = create('strong');
      label.textContent = `CH ${index + 1}`;
      const startSensor = create('span', 'ucast-sensor ucast-sensor-start');
      const endSensor = create('span', 'ucast-sensor ucast-sensor-end');
      const strip = create('span', 'ucast-neopixel');
      const pedestrian = create('span', 'ucast-pedestrian');
      pedestrian.textContent = '●';
      const state = create('span', 'ucast-state');
      setText(state, '대기', 'Standby');
      lane.append(label, startSensor, strip, pedestrian, endSensor, state);
      road.append(lane);
      channels.push({ lane, pedestrian, state, version: 0 });
    }

    layout.append(controls, road);
    root.append(layout);

    // Updates the shared driver warning based on active channel count.
    function updateWarning() {
      const activeCount = channels.filter(({ lane }) => lane.classList.contains('is-active')).length;
      road.classList.toggle('has-warning', activeCount > 0);
      setText(
        driverWarning,
        activeCount ? `운전자 경고 ON · ${activeCount}개 구간` : '운전자 경고 OFF',
        activeCount ? `Driver warning ON · ${activeCount} zone${activeCount > 1 ? 's' : ''}` : 'Driver warning OFF'
      );
    }

    // Moves one pedestrian through its start and end sensors.
    async function runChannel(index) {
      const channel = channels[index];
      const currentVersion = ++channel.version;
      channelButtons[index].disabled = true;
      channel.lane.classList.add('is-active', 'is-entering');
      setText(channel.state, '경고', 'Warning');
      setText(status, `CH ${index + 1} 시작 IR 감지`, `CH ${index + 1} start IR detected`);
      updateWarning();
      await wait(1000);
      if (channel.version !== currentVersion) return;
      channel.lane.classList.remove('is-entering');
      channel.lane.classList.add('is-exiting');
      setText(status, `CH ${index + 1} 끝 IR 접근`, `CH ${index + 1} approaching exit sensor`);
      await wait(650);
      if (channel.version !== currentVersion) return;
      channel.lane.classList.remove('is-active', 'is-exiting');
      setText(channel.state, '대기', 'Standby');
      channelButtons[index].disabled = false;
      updateWarning();
      setText(status, `CH ${index + 1} 통과 완료`, `CH ${index + 1} cleared`);
    }

    channelButtons.forEach((button, index) => button.addEventListener('click', () => runChannel(index)));
    resetButton.addEventListener('click', () => {
      channels.forEach((channel, index) => {
        channel.version += 1;
        channel.lane.classList.remove('is-active', 'is-entering', 'is-exiting');
        setText(channel.state, '대기', 'Standby');
        channelButtons[index].disabled = false;
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
    cardIds.forEach((id, index) => {
      const card = create('button', 'berry-student-card');
      card.type = 'button';
      card.draggable = true;
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

    const attendance = new Set();
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
      [...attendance].slice(-4).reverse().forEach((id) => {
        const item = create('li');
        item.textContent = `${id} · ${translate('출석 완료', 'Checked in')}`;
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
      attendance.add(id);
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
    renderAttendance();
  }

  // Recreates PlantClock's timer, watering button, fan lever, LCD and alert devices.
  function plantDemo(root) {
    prepare(
      root,
      'plant-device-demo',
      '시간을 보내 30분 급수 알림을 확인하고, 실제 장치처럼 급수 버튼과 팬 레버를 조작해 보세요.',
      'Advance time to trigger the 30-minute reminder, then use the watering button and fan lever.'
    );

    const layout = create('div', 'hardware-demo-layout plant-layout');
    const controls = create('div', 'hardware-control-panel');
    const controlTitle = create('strong', 'hardware-panel-title');
    setText(controlTitle, 'PlantClock 조작부', 'PlantClock controls');
    const timeButton = createButton('시간 +10분', 'Advance +10 min');
    const waterButton = createButton('급수 기록', 'Log watering');
    const fanButton = createButton('팬 켜기', 'Turn fan on');
    const resetButton = createButton('처음 상태로', 'Reset', 'demo-action demo-action-secondary');
    const status = createStatus('마지막 급수 후 0분 · 알림 없음', '0 minutes since watering · no alert');
    controls.append(controlTitle, timeButton, waterButton, fanButton, resetButton, status);

    const device = create('div', 'plantclock-device');
    const plant = create('div', 'plantclock-pot');
    plant.innerHTML = '<span class="plant-stem"></span><span class="plant-leaf plant-leaf-left"></span><span class="plant-leaf plant-leaf-right"></span>';
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
    const fan = create('span', 'plant-fan');
    indicators.append(alertLed, vibration, buzzer, fan);
    device.append(plant, lcd, displays, indicators);
    layout.append(controls, device);
    root.append(layout);

    let elapsedMinutes = 0;
    let clockMinutes = 9 * 60;
    let lastWaterMinutes = clockMinutes;
    let fanOn = false;

    // Converts minute counts to the four-digit display format used by the device.
    function formatTime(totalMinutes) {
      const hours = Math.floor(totalMinutes / 60) % 24;
      const minutes = totalMinutes % 60;
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }

    // Updates both displays and all physical indicators from current state.
    function renderPlantClock() {
      const alertActive = elapsedMinutes >= 30;
      device.classList.toggle('has-alert', alertActive);
      device.classList.toggle('fan-on', fanOn);
      soilLine.textContent = 'Soil: 612';
      timeLine.textContent = `Time: ${formatTime(clockMinutes)}`;
      lastWater.innerHTML = `<small>${translate('마지막 급수', 'Last water')}</small><strong>${formatTime(lastWaterMinutes)}</strong>`;
      elapsed.innerHTML = `<small>${translate('경과 시간', 'Elapsed')}</small><strong>${elapsedMinutes}</strong>`;
      setText(fanButton, fanOn ? '팬 끄기' : '팬 켜기', fanOn ? 'Turn fan off' : 'Turn fan on');
      setText(
        status,
        alertActive ? `${elapsedMinutes}분 경과 · LED·진동·부저 알림` : `마지막 급수 후 ${elapsedMinutes}분 · 알림 없음`,
        alertActive ? `${elapsedMinutes} min · LED, vibration and buzzer alert` : `${elapsedMinutes} min since watering · no alert`
      );
    }

    timeButton.addEventListener('click', () => {
      elapsedMinutes += 10;
      clockMinutes += 10;
      renderPlantClock();
    });
    waterButton.addEventListener('click', () => {
      lastWaterMinutes = clockMinutes;
      elapsedMinutes = 0;
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
    const power = create('div', 'signal-gorilla-cell');
    power.innerHTML = '<span aria-hidden="true">▰</span><strong>GORILLA CELL</strong>';
    device.append(tower, counter, power);
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
      const steps = [10, 5, 0];
      for (const remaining of steps) {
        if (runId !== currentRun) return;
        setText(status, `20명 도달 · 빨간불 · ${remaining}초 남음`, `20 reached · red light · ${remaining}s remaining`);
        await wait(650);
      }
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

  const demos = {
    wall: wallDemo,
    ucast: ucastDemo,
    berry: berryDemo,
    plant: plantDemo,
    signal: signalCounterDemo
  };

  // Initializes only demos explicitly declared by their project pages.
  roots.forEach((root) => demos[root.dataset.projectDemo]?.(root));

  // Rebuilds translated, dynamically generated controls after a language change.
  window.addEventListener('portfolio:language', () => window.location.reload());
})();
