from pathlib import Path


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected one target, got {count}: {old[:100]!r}')
    p.write_text(text.replace(old, new, 1), encoding='utf-8')


# Shared CSS regressions + HOME + U-CAST + PlantClock + doorlock.
style = Path('style.css')
css = style.read_text(encoding='utf-8')
bad_video = '.detail-video { width:100%; height:auto !important; aspect-ratio:auto !important; object-fit:contain !important; }\n\n'
if css.count(bad_video) != 1:
    raise SystemExit('style.css: #251 video override not found exactly once')
css = css.replace(bad_video, '', 1)

replacements = {
    '.hero-email-capybara { width: 88px; bottom: 28px; }': '.hero-email-capybara { width: 84px; bottom: 24px; }',
    '.hero-email-capybara { width: 84px; bottom: 27px; }': '.hero-email-capybara { width: 80px; bottom: 23px; }',
    '.hero-email-capybara { width: 90px; bottom: 28px; }': '.hero-email-capybara { width: 86px; bottom: 24px; }',
    '.hero-email-capybara { display: block; width: 80px; bottom: 27px; }': '.hero-email-capybara { display: block; width: 76px; bottom: 23px; }',
    '.doorlock-keypad { display: grid; grid-template-columns: repeat(4, minmax(42px, 1fr)); gap: 7px; }': '.doorlock-keypad { display: grid; grid-template-columns: repeat(3, minmax(42px, 1fr)); gap: 7px; }',
    'position: relative; min-height: 170px; border: 7px solid #6a4d35;': 'position: relative; height: 170px; min-height: 170px; box-sizing: border-box; border: 7px solid #6a4d35;',
    '.doorlock-keypad { grid-template-columns: repeat(4, minmax(36px, 1fr)); }': '.doorlock-keypad { grid-template-columns: repeat(3, minmax(36px, 1fr)); }',
    '.ucast-channel.is-reverse.is-entering .ucast-pedestrian { left:calc(100% - 88px) !important; transition:none !important; }': '.ucast-channel.is-reverse.is-entering .ucast-pedestrian { left:50% !important; transition:left .95s linear !important; }',
    '.ucast-channel.is-reverse.is-exiting .ucast-pedestrian { left:76px !important; transition:left .68s linear !important; }': '.ucast-channel.is-reverse.is-exiting .ucast-pedestrian { left:76px !important; transition:left .95s linear !important; }',
}
for old, new in replacements.items():
    count = css.count(old)
    if count != 1:
        raise SystemExit(f'style.css: expected one target, got {count}: {old!r}')
    css = css.replace(old, new, 1)

tomato_old = '''.plant-tomato { position:absolute; z-index:3; width:17px; height:17px; border-radius:50%; background:#d94737; border:2px solid #9d2b25; box-shadow:inset -2px -2px 0 rgba(0,0,0,.12); }
.plant-tomato::before { content:""; position:absolute; left:4px; top:-5px; width:6px; height:6px; background:#39743b; clip-path:polygon(50% 0,65% 34%,100% 28%,72% 53%,84% 88%,50% 67%,16% 88%,28% 53%,0 28%,35% 34%); }
.plant-tomato-a { left:31px; top:5px; }
.plant-tomato-b { right:29px; top:21px; width:15px; height:15px; }'''
tomato_new = '''.plant-tomato { position:absolute; z-index:4; width:20px; height:18px; border-radius:48% 52% 52% 48%; background:radial-gradient(circle at 34% 28%,#ff8a73 0 14%,#e94b39 34%,#bd2e28 78%,#99231f 100%); border:1px solid #81231f; box-shadow:0 2px 3px rgba(70,25,18,.28),inset -3px -3px 3px rgba(105,20,16,.18); }
.plant-tomato::before { content:""; position:absolute; left:50%; top:-6px; width:13px; height:9px; transform:translateX(-50%); background:#35733b; clip-path:polygon(50% 0,61% 35%,100% 20%,72% 52%,88% 88%,52% 66%,18% 92%,30% 55%,0 28%,39% 36%); }
.plant-tomato-a { left:25px; top:34px; }
.plant-tomato-b { right:20px; top:48px; width:18px; height:17px; }
.plant-tomato-c { left:48px; top:61px; width:16px; height:15px; }'''
if css.count(tomato_old) != 1:
    raise SystemExit('style.css: old tomato block not found exactly once')
css = css.replace(tomato_old, tomato_new, 1)
old_mobile_tomato = '@media (max-width:640px) { .plant-stem { left:36px !important; bottom:72px !important; height:45px !important; } .plant-leaf { bottom:91px !important; width:30px !important; height:18px !important; } .plant-leaf-left { left:12px !important; } .plant-leaf-right { right:12px !important; } .plant-tomato-a { left:21px; top:5px; width:14px; height:14px; } .plant-tomato-b { right:20px; top:18px; width:13px; height:13px; } }'
new_mobile_tomato = '@media (max-width:640px) { .plant-stem { left:36px !important; bottom:72px !important; height:45px !important; } .plant-leaf { bottom:91px !important; width:30px !important; height:18px !important; } .plant-leaf-left { left:12px !important; } .plant-leaf-right { right:12px !important; } .plant-tomato-a { left:16px; top:28px; width:15px; height:14px; } .plant-tomato-b { right:12px; top:40px; width:14px; height:13px; } .plant-tomato-c { left:33px; top:52px; width:13px; height:12px; } }'
if css.count(old_mobile_tomato) != 1:
    raise SystemExit('style.css: mobile tomato block not found')
css = css.replace(old_mobile_tomato, new_mobile_tomato, 1)
style.write_text(css, encoding='utf-8')

# Hardware demo logic.
demos = Path('assets/project-demos.js')
js = demos.read_text(encoding='utf-8')
wall_waits = [
    ("setText(status, '해수면 상승 감지', 'Rising sea detected');\n      await wait(900);", "setText(status, '해수면 상승 감지', 'Rising sea detected');\n      await wait(1100);"),
    ("setText(status, '장벽 상승 · 도시 방향 유입 차단', 'Barrier rising · protecting the city side');\n      await wait(900);", "setText(status, '장벽 상승 · 도시 방향 유입 차단', 'Barrier rising · protecting the city side');\n      await wait(1100);"),
    ("setText(status, '주의 단계 · 장벽 유지', 'Caution · barrier remains raised');\n      await wait(750);", "setText(status, '주의 단계 · 장벽 유지', 'Caution · barrier remains raised');\n      await wait(900);"),
    ("setText(status, '위험 단계 · 장벽 유지 · 배수 대기', 'Danger · barrier held · waiting to drain');\n      await wait(750);", "setText(status, '위험 단계 · 장벽 유지 · 배수 대기', 'Danger · barrier held · waiting to drain');\n      await wait(900);"),
    ("setText(status, '배수 중 · 장벽은 계속 올라간 상태', 'Draining · barrier stays fully raised');\n      await wait(1450);", "setText(status, '배수 중 · 장벽은 계속 올라간 상태', 'Draining · barrier stays fully raised');\n      await wait(1700);"),
    ("setText(status, '배수 완료 · 장벽 하강', 'Drainage complete · lowering barrier');\n      await wait(900);", "setText(status, '배수 완료 · 장벽 하강', 'Drainage complete · lowering barrier');\n      await wait(1100);"),
]
for old, new in wall_waits:
    if js.count(old) != 1:
        raise SystemExit(f'project-demos.js: wall timing target missing: {old!r}')
    js = js.replace(old, new, 1)

old_reverse_start = """      channel.lane.classList.toggle('is-reverse', reverse);
      channel.lane.classList.add('is-active', 'is-entering');"""
new_reverse_start = """      channel.lane.classList.toggle('is-reverse', reverse);
      channel.lane.classList.remove('is-entering', 'is-exiting');
      if (reverse) void channel.pedestrian.offsetWidth;
      channel.lane.classList.add('is-active', 'is-entering');"""
if js.count(old_reverse_start) != 1:
    raise SystemExit('project-demos.js: reverse start block not found')
js = js.replace(old_reverse_start, new_reverse_start, 1)
old_reverse_wait = """      setText(status, `CH-${index + 1} 반대편 센서 접근`, `CH-${index + 1} approaching opposite sensor`);
      await wait(700);"""
new_reverse_wait = """      setText(status, `CH-${index + 1} 반대편 센서 접근`, `CH-${index + 1} approaching opposite sensor`);
      await wait(reverse ? 1000 : 700);"""
if js.count(old_reverse_wait) != 1:
    raise SystemExit('project-demos.js: reverse wait block not found')
js = js.replace(old_reverse_wait, new_reverse_wait, 1)

old_tomato = "plant.append(create('span', 'plant-tomato plant-tomato-a'), create('span', 'plant-tomato plant-tomato-b'));"
new_tomato = "plant.append(create('span', 'plant-tomato plant-tomato-a'), create('span', 'plant-tomato plant-tomato-b'), create('span', 'plant-tomato plant-tomato-c'));"
if js.count(old_tomato) != 1:
    raise SystemExit('project-demos.js: tomato nodes not found')
js = js.replace(old_tomato, new_tomato, 1)

old_note = "'원본 코드의 4×4 키패드·6자리 비밀번호(123456)·LCD·서보 잠금·성공/실패 신호를 로컬 데모로 재현합니다.',\n      'A local demo of the source 4×4 keypad, six-digit password (123456), LCD, servo lock and success/failure signals.'"
new_note = "'6자리 비밀번호(123456)·LCD·서보 잠금·성공/실패 신호를 숫자 키패드로 재현합니다.',\n      'A numeric-keypad demo of the six-digit password (123456), LCD, servo lock and success/failure signals.'"
if js.count(old_note) != 1:
    raise SystemExit('project-demos.js: door note target missing')
js = js.replace(old_note, new_note, 1)
if js.count("setText(controlTitle, '4×4 키패드', '4×4 keypad');") != 1:
    raise SystemExit('project-demos.js: door title target missing')
js = js.replace("setText(controlTitle, '4×4 키패드', '4×4 keypad');", "setText(controlTitle, '숫자 키패드', 'Numeric keypad');", 1)

old_controls = """    const keypad = create('div', 'doorlock-keypad');
    const status = createStatus('비밀번호를 입력하세요.', 'Enter the password.');
    const closeButton = createButton('닫힘', 'Close / Lock', 'demo-action demo-action-secondary doorlock-close-action');
    controls.append(controlTitle, keypad, closeButton, status);"""
new_controls = """    const keypad = create('div', 'doorlock-keypad');
    const inputButton = createButton('입력', 'Input', 'demo-action doorlock-input-action');
    const closeButton = createButton('닫힘', 'Close / Lock', 'demo-action demo-action-secondary doorlock-close-action');
    const status = createStatus('비밀번호를 입력하세요.', 'Enter the password.');
    controls.append(controlTitle, keypad, inputButton, closeButton, status);"""
if js.count(old_controls) != 1:
    raise SystemExit('project-demos.js: door controls block not found')
js = js.replace(old_controls, new_controls, 1)

old_keypad = """    [['1','2','3','A'],['4','5','6','B'],['7','8','9','C'],['*','0','#','D']].flat().forEach((key) => {
      const button = create('button', 'doorlock-key');
      button.type = 'button';
      button.textContent = key === '*' ? translate('초기화', 'Reset') : key === '#' ? translate('입력', 'Input') : key;
      button.setAttribute('aria-label', key === '*' ? translate('입력 초기화', 'Reset input') : key === '#' ? translate('비밀번호 입력', 'Submit password') : key);
      button.addEventListener('click', () => {
        if (key === '#') {
          if (input === password) unlock(); else alarm();
          return;
        }
        if (key === '*') { clearInput(); return; }
        input += key;
        render('키 입력 · 입력 버튼으로 확인', 'Key entered · press Input to confirm');
      });
      keypad.append(button);
    });
    closeButton.addEventListener('click', () => {"""
new_keypad = """    ['1','2','3','4','5','6','7','8','9','*','0','<-'].forEach((key) => {
      const button = create('button', 'doorlock-key');
      button.type = 'button';
      button.textContent = key === '*' ? translate('초기화', 'Reset') : key;
      button.setAttribute('aria-label', key === '*' ? translate('입력 초기화', 'Reset input') : key === '<-' ? translate('한 글자 지우기', 'Delete one character') : key);
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
    inputButton.addEventListener('click', () => {
      if (input === password) unlock(); else alarm();
    });
    closeButton.addEventListener('click', () => {"""
if js.count(old_keypad) != 1:
    raise SystemExit('project-demos.js: old 4x4 keypad block not found')
js = js.replace(old_keypad, new_keypad, 1)
demos.write_text(js, encoding='utf-8')

# Meal video actual intrinsic dimensions.
replace_once(
    'projects/meal_queue_signal_counter/index.html',
    '<video class="detail-video" controls preload="metadata" playsinline muted poster="assets/images/green-signal-demo.webp">',
    '<video class="detail-video" width="1080" height="1920" controls preload="metadata" playsinline muted poster="assets/images/green-signal-demo.webp">',
)

# Wall_Sina exact owner wording, video dimensions, and caption.
wall = Path('projects/Wall_Sina/index.html')
w = wall.read_text(encoding='utf-8')
old_wall_overview = '''2024 지속 가능한 발전 프로젝트로, 기후 위기로 인한 해수면 상승에
                대비한 해안 장벽 MVP입니다. 수조 안에 가상의 도시와 바다를
                만들고, 이를 분리하는 장벽을 설계하여 해수면 상승 시나리오를
                시뮬레이션하는 프로젝트입니다.'''
new_wall_overview = '''2024 지속 가능한 발전 프로젝트로 기후 위기로 인한 해수면 상승에
                대비한 해안 장벽 MVP입니다. 수조 안에 가상의 도시와 바다를
                만들고 이를 분리하는 장벽을 설계하여 해수면 상승 시나리오를
                시뮬레이션하는 프로젝트입니다.'''
if w.count(old_wall_overview) != 1:
    raise SystemExit('Wall_Sina: overview target missing')
w = w.replace(old_wall_overview, new_wall_overview, 1)
wall_videos = [
    ('<video class="detail-video" controls preload="metadata" playsinline poster="assets/images/prototype-1.webp">', '<video class="detail-video" width="1920" height="1080" controls preload="metadata" playsinline poster="assets/images/prototype-1.webp">'),
    ('<video class="detail-video" controls preload="metadata" playsinline muted poster="assets/images/final-model-overview.webp">', '<video class="detail-video" width="1280" height="720" controls preload="metadata" playsinline muted poster="assets/images/final-model-overview.webp">'),
    ('<video class="detail-video" controls preload="metadata" playsinline muted poster="assets/images/final-barrier-front.webp">', '<video class="detail-video" width="1920" height="1080" controls preload="metadata" playsinline muted poster="assets/images/final-barrier-front.webp">'),
]
for old, new in wall_videos:
    if w.count(old) != 1:
        raise SystemExit(f'Wall_Sina: video target missing: {old}')
    w = w.replace(old, new, 1)
if w.count('data-ko="장벽 수조 테스트">장벽 수조 테스트') != 1:
    raise SystemExit('Wall_Sina: old water-test caption missing')
w = w.replace('data-ko="장벽 수조 테스트">장벽 수조 테스트', 'data-ko="장벽 방수 테스트">장벽 방수 테스트', 1)
wall.write_text(w, encoding='utf-8')

# U-CAST owner-authored wording and operations mentor record.
ucast = Path('projects/2026_U-CAST/index.html')
u = ucast.read_text(encoding='utf-8')
if u.count('data-en="Team Mentor" data-ko="팀 멘토">팀 멘토') != 1:
    raise SystemExit('U-CAST: badge team mentor target missing')
u = u.replace('data-en="Team Mentor" data-ko="팀 멘토">팀 멘토', 'data-en="Team Mentor" data-ko="팀 건영아잘하자">팀 건영아잘하자', 1)
if u.count('data-en="Team Mentor" data-ko="5팀 멘토">5팀 멘토') != 1:
    raise SystemExit('U-CAST: role team mentor target missing')
u = u.replace('data-en="Team Mentor" data-ko="5팀 멘토">5팀 멘토', 'data-en="Team Mentor" data-ko="팀 건영아잘하자">팀 건영아잘하자', 1)
old_en = 'A hardware prototype named &quot;Stop!&quot;, built by Team 5 for the Cheonan Youth Urban Regeneration Challenge (U-CAST). Each curb section pairs a start/end IR sensor with its own NeoPixel strip as one independent channel: when a pedestrian steps toward the road, that channel\'s strip blinks red, a shared driver-facing LED blinks, and a passive buzzer sounds a rising/falling siren, all continuing until that same channel\'s end IR confirms the pedestrian has cleared it. It is a secondary-accident-prevention device — it does not physically block jaywalking, but warns drivers and pedestrians faster once someone has already entered the road (issue #6).'
new_en = 'A hardware prototype named &quot;Stop!&quot;, built by Team 5 for the Cheonan Youth Urban Regeneration Challenge (U-CAST). Each curb section pairs a start/end IR sensor with its own NeoPixel strip as one independent channel: when a pedestrian steps toward the road, that channel\'s strip blinks red, a shared driver-facing LED blinks, and a passive buzzer sounds a rising/falling siren, all continuing until that same channel\'s end IR confirms the pedestrian has cleared it. It is a secondary-accident-prevention device — it does not physically block jaywalking, but warns drivers and pedestrians faster once someone has already entered the road.'
if u.count(old_en) != 1:
    raise SystemExit('U-CAST: English issue #6 target missing')
u = u.replace(old_en, new_en, 1)
old_ko = '천안시 청소년 도시재생 챌린지(U-CAST) 5팀이 만든 하드웨어형 시제품 「멈춰 !」입니다. 구간마다 시작·끝 IR 센서와 네오픽셀 스트립을 하나로 묶어 독립 채널로 삼습니다. 보행자가 도로 쪽으로 들어서면 그 채널의 스트립이 빨간색으로 점멸하고, 공용 운전자 경고 LED가 점멸하며, 수동 부저가 사이렌을 내고, 같은 채널의 끝 IR이 보행자의 통과를 확인할 때까지 유지됩니다. 무단횡단을 물리적으로 막지는 않지만 이미 도로에 진입한 보행자를 운전자·보행자에게 더 빨리 알리는 2차 사고 예방 장치입니다(이슈 #6).'
new_ko = '천안시 청소년 도시재생 챌린지(U-CAST) 5팀이 만든 하드웨어형 시제품 「멈춰 !」입니다. 구간마다 시작·끝 IR 센서와 네오픽셀 스트립을 하나로 묶어 독립 채널로 삼습니다. 보행자가 도로 쪽으로 들어서면 그 채널의 스트립이 빨간색으로 점멸하고 공용 운전자 경고 LED가 점멸하며 수동 부저가 사이렌을 내고 같은 채널의 끝 IR이 보행자의 통과를 확인할 때까지 유지됩니다. 무단횡단을 물리적으로 막지는 않지만 이미 도로에 진입한 보행자를 운전자·보행자에게 더 빨리 알리는 2차 사고 예방 장치입니다.'
if u.count(old_ko) != 1:
    raise SystemExit('U-CAST: Korean overview attr target missing')
u = u.replace(old_ko, new_ko, 1)
old_visible = '''                천안시 청소년 도시재생 챌린지(U-CAST) 5팀이 만든 하드웨어형
                시제품 「멈춰 !」입니다. 구간마다 시작 · 끝 IR 센서와 네오픽셀
                스트립을 하나로 묶었습니다. 보행자가 도로
                쪽으로 들어서면 그 채널의 LED 스트립이 빨간색으로 점멸하고 공용
                운전자 경고 LED가 점멸하며 수동 부저가 사이렌을 내고 같은
                채널의 끝 IR이 보행자의 통과를 확인할 때까지 시스템 작동이 유지됩니다.
                무단횡단을 물리적으로 막지는 않지만 이미 도로에 진입한
                보행자를 운전자 · 보행자에게 더 빨리 알리는 2차 사고 예방
                장치입니다.'''
new_visible = '''                천안시 청소년 도시재생 챌린지(U-CAST) 5팀이 만든 하드웨어형 시제품 「멈춰 !」입니다.
                구간마다 시작·끝 IR 센서와 네오픽셀 스트립을 하나로 묶어 독립 채널로 삼습니다.
                보행자가 도로 쪽으로 들어서면 그 채널의 스트립이 빨간색으로 점멸하고 공용 운전자 경고 LED가 점멸하며
                수동 부저가 사이렌을 내고 같은 채널의 끝 IR이 보행자의 통과를 확인할 때까지 유지됩니다.
                무단횡단을 물리적으로 막지는 않지만 이미 도로에 진입한 보행자를 운전자·보행자에게 더 빨리 알리는
                2차 사고 예방 장치입니다.'''
if u.count(old_visible) != 1:
    raise SystemExit('U-CAST: visible overview target missing')
u = u.replace(old_visible, new_visible, 1)
mentor_anchor = '''              <ul>
                <li data-en="Refined the problem statement, final naming (&quot;Stop!&quot;) and MVP scope">문제 정의, 최종 명칭(「멈춰 !」)과 MVP 범위 구체화</li>
                <li data-en="Guided the redesign from a merged bidirectional state to independent per-channel state machines">병합된 양방향 상태에서 채널별 독립 상태 머신으로의 재설계 지도</li>
                <li data-en="Supported wiring review, debugging and safer configuration boundaries">배선 검토 · 디버깅 · 안전한 설계 지원</li>
                <li data-en="Prepared assembly, troubleshooting and presentation materials with the team">조립 · 문제 해결 · 발표 시연 자료 준비 지원</li>
              </ul>
            </div>'''
mentor_extra = '''
            <div class="detail-section" data-aos="fade-up" data-aos-delay="110">
              <h2 data-en="U-CAST Outstanding Operations Mentor" data-ko="U-CAST 우수 운영 멘토">U-CAST 우수 운영 멘토</h2>
              <ul>
                <li data-en="One mentor recognized by organizers for high on-site contribution" data-ko="운영진 평가 기준 현장 기여도가 높은 멘토 1인">운영진 평가 기준 현장 기여도가 높은 멘토 1인</li>
                <li data-en="Supported student mentoring and completion, photo/video records, team atmosphere, and overall field operations" data-ko="학생 멘토링 및 완주 독려, 사진 및 영상 기록, 팀 분위기 관리 등 전체 현장 운영 협조">학생 멘토링 및 완주 독려, 사진 및 영상 기록, 팀 분위기 관리 등 전체 현장 운영 협조</li>
                <li data-en="Recognition for a mentor who actively contributed to program operations and student support independently of award results" data-ko="수상 결과와 별개로 프로그램 운영과 학생 지원에 적극적으로 기여한 멘토 격려">수상 결과와 별개로 프로그램 운영과 학생 지원에 적극적으로 기여한 멘토 격려</li>
              </ul>
            </div>'''
if u.count(mentor_anchor) != 1:
    raise SystemExit('U-CAST: role anchor missing')
u = u.replace(mentor_anchor, mentor_anchor + mentor_extra, 1)
ucast.write_text(u, encoding='utf-8')
