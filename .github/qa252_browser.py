import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait

BASE = 'http://127.0.0.1:8000/'

opts = Options()
opts.add_argument('--headless=new')
opts.add_argument('--no-sandbox')
opts.add_argument('--disable-dev-shm-usage')
opts.add_argument('--autoplay-policy=no-user-gesture-required')
opts.add_argument('--window-size=1440,1000')

driver = webdriver.Chrome(options=opts)
wait = WebDriverWait(driver, 15)


def rect(el):
    return driver.execute_script(
        'const r=arguments[0].getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height};',
        el,
    )


def same_size(a, b, tol=1.5):
    return abs(a['w'] - b['w']) <= tol and abs(a['h'] - b['h']) <= tol


def no_overflow(label):
    ok = driver.execute_script(
        'return document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1'
    )
    assert ok, f'horizontal overflow: {label}'


def set_lang(lang):
    driver.execute_script("localStorage.setItem('lang', arguments[0]);", lang)
    driver.refresh()
    wait.until(lambda d: d.execute_script('return document.readyState') == 'complete')
    assert driver.execute_script('return document.documentElement.lang') == lang


try:
    # HOME: smaller and closer, with a deliberate but limited overlap behind the button.
    driver.get(BASE + 'index.html')
    driver.execute_script("localStorage.setItem('lang','ko')")
    driver.refresh()
    cap = wait.until(lambda d: d.find_element(By.CSS_SELECTOR, '.hero-email-capybara'))
    email = driver.find_element(By.CSS_SELECTOR, '.hero-email-wrap .hero-email')
    cr, er = rect(cap), rect(email)
    overlap = min(cr['y'] + cr['h'], er['y'] + er['h']) - max(cr['y'], er['y'])
    assert 4 <= overlap <= 34, ('home overlap', cr, er, overlap)
    assert cr['w'] <= 86, ('home cap size', cr)
    no_overflow('HOME desktop')

    # KGA: user-selected portrait shuttle capture is actually loaded.
    driver.get(BASE + 'projects/koreatechGongjiAgent/index.html')
    shuttle = wait.until(
        lambda d: d.find_element(By.CSS_SELECTOR, 'img[src="assets/images/web-shuttle-live.webp"]')
    )
    wait.until(lambda d: d.execute_script('return arguments[0].complete', shuttle))
    dims = driver.execute_script(
        'return [arguments[0].naturalWidth, arguments[0].naturalHeight];', shuttle
    )
    assert dims == [600, 820], ('KGA shuttle dimensions', dims)
    assert rect(shuttle)['h'] > rect(shuttle)['w'], ('KGA shuttle not portrait', rect(shuttle))
    no_overflow('KGA desktop')

    # Video regression: native dimensions are correct and play() must not resize the box.
    video_cases = [
        ('projects/meal_queue_signal_counter/index.html', [(720, 1280)]),
        ('projects/Wall_Sina/index.html', [(1080, 1920), (456, 720), (406, 720)]),
    ]
    for page, expected_dims in video_cases:
        driver.get(BASE + page)
        vids = wait.until(lambda d: d.find_elements(By.CSS_SELECTOR, 'video.detail-video'))
        assert len(vids) == len(expected_dims), (page, len(vids), len(expected_dims))
        for index, (video, expected_native) in enumerate(zip(vids, expected_dims)):
            driver.execute_script("arguments[0].scrollIntoView({block:'center'});", video)
            wait.until(lambda d: d.execute_script('return arguments[0].readyState >= 1', video))
            native = driver.execute_script(
                'return [arguments[0].videoWidth, arguments[0].videoHeight];', video
            )
            assert native == list(expected_native), (page, index, 'native', native, expected_native)
            before = rect(video)
            driver.execute_script(
                'arguments[0].muted=true; const p=arguments[0].play(); if(p&&p.catch)p.catch(()=>{});',
                video,
            )
            time.sleep(0.9)
            after = rect(video)
            driver.execute_script('arguments[0].pause();', video)
            assert same_size(before, after), (page, index, before, after)

    # U-CAST reverse: movement begins immediately and stays progressive.
    driver.get(BASE + 'projects/2026_U-CAST/index.html#live-demo')
    reverse = wait.until(
        lambda d: next(
            (b for b in d.find_elements(By.CSS_SELECTOR, '.ucast-device-demo .demo-action') if 'CH-1 역방향' in b.text),
            None,
        )
    )
    ped = driver.find_elements(By.CSS_SELECTOR, '.ucast-channel .ucast-pedestrian')[0]
    reverse.click()
    x0 = rect(ped)['x']
    time.sleep(0.42)
    x1 = rect(ped)['x']
    time.sleep(0.62)
    x2 = rect(ped)['x']
    time.sleep(0.45)
    x3 = rect(ped)['x']
    time.sleep(0.58)
    x4 = rect(ped)['x']
    assert x0 > x1 > x2 > x3 > x4, ('U-CAST reverse positions', x0, x1, x2, x3, x4)
    assert (x0 - x1) > 8 and (x2 - x3) > 8, ('U-CAST reverse movement', x0, x1, x2, x3, x4)

    # U-CAST KO/EN content contract.
    set_lang('en')
    body_text = driver.find_element(By.TAG_NAME, 'body').text
    assert 'Team Mentor' in body_text
    assert 'U-CAST Outstanding Operations Mentor' in body_text
    assert '(issue #6)' not in driver.page_source
    set_lang('ko')
    body_text = driver.find_element(By.TAG_NAME, 'body').text
    assert '팀 건영아잘하자' in body_text
    assert 'U-CAST 우수 운영 멘토' in body_text
    assert '(이슈 #6)' not in driver.page_source

    # Wall_Sina: longer flow completes reliably three times.
    driver.get(BASE + 'projects/Wall_Sina/index.html#live-demo')
    power = wait.until(
        lambda d: next(
            (b for b in d.find_elements(By.CSS_SELECTOR, '.wall-device-demo .demo-action') if '시스템 켜기' in b.text),
            None,
        )
    )
    power.click()
    for cycle in range(3):
        detect = wait.until(
            lambda d: next(
                (b for b in d.find_elements(By.CSS_SELECTOR, '.wall-device-demo .demo-action') if '해수면 상승 감지' in b.text and b.is_enabled()),
                None,
            )
        )
        started = time.monotonic()
        detect.click()
        wait.until(
            lambda d: '장벽 복귀 완료' in d.find_element(By.CSS_SELECTOR, '.wall-device-demo .demo-live-status').text
        )
        elapsed = time.monotonic() - started
        assert elapsed >= 6.4, ('Wall_Sina cycle too short', cycle + 1, elapsed)

    # PlantClock: tomato visual changed; previously passed interactions still work.
    driver.get(BASE + 'projects/PlantClock/index.html#live-demo')
    wait.until(lambda d: len(d.find_elements(By.CSS_SELECTOR, '.plant-tomato')) == 3)
    pbuttons = driver.find_elements(By.CSS_SELECTOR, '.plant-device-demo .demo-action')
    next(b for b in pbuttons if '시간 +10분' in b.text).click()
    assert '10분' in driver.find_element(By.CSS_SELECTOR, '.plant-device-demo .demo-live-status').text
    next(b for b in pbuttons if '급수 버튼' in b.text).click()
    assert '급수 시각' in driver.find_element(By.CSS_SELECTOR, '.plant-device-demo .demo-live-status').text
    next(b for b in pbuttons if '팬 레버' in b.text).click()
    assert 'fan-on' in driver.find_element(By.CSS_SELECTOR, '.plantclock-device').get_attribute('class')

    # Doorlock: numeric-only keypad, one-character delete, separate Input/Close, stable door box.
    driver.get(BASE + 'projects/Master_Creator_Challenge/index.html#live-demo')
    keys = wait.until(lambda d: d.find_elements(By.CSS_SELECTOR, '.doorlock-key'))
    texts = [k.text for k in keys]
    assert all(x not in texts for x in ['A', 'B', 'C', 'D', '#']), texts
    assert '<-' in texts and '초기화' in texts, texts
    door = driver.find_element(By.CSS_SELECTOR, '.doorlock-door')
    locked_rect = rect(door)

    def press_key(text):
        next(k for k in driver.find_elements(By.CSS_SELECTOR, '.doorlock-key') if k.text == text).click()

    for n in '12345':
        press_key(n)
    press_key('<-')
    assert 'Password: 1234' in driver.find_element(By.CSS_SELECTOR, '.doorlock-lcd').text
    press_key('5')
    press_key('6')
    input_button = next(
        b for b in driver.find_elements(By.CSS_SELECTOR, '.doorlock-device-demo .demo-action') if b.text == '입력'
    )
    input_button.click()
    assert 'OPEN' in driver.find_element(By.CSS_SELECTOR, '.doorlock-lcd').text
    open_rect = rect(door)
    assert same_size(locked_rect, open_rect), ('door box changed', locked_rect, open_rect)
    close_button = next(
        b for b in driver.find_elements(By.CSS_SELECTOR, '.doorlock-device-demo .demo-action') if b.text == '닫힘'
    )
    close_button.click()
    assert 'LOCKED' in driver.find_element(By.CSS_SELECTOR, '.doorlock-lcd').text

    # Wrong password + reset remain deterministic.
    for _ in range(6):
        press_key('1')
    input_button.click()
    assert 'Access Denied' in driver.find_element(By.CSS_SELECTOR, '.doorlock-device-demo .demo-live-status').text
    press_key('1')
    press_key('초기화')
    assert 'Password:' not in driver.find_element(By.CSS_SELECTOR, '.doorlock-lcd').text

    # Dynamic doorlock labels in English.
    set_lang('en')
    dtexts = [b.text for b in driver.find_elements(By.CSS_SELECTOR, '.doorlock-device-demo button')]
    assert 'Reset' in dtexts and 'Input' in dtexts and 'Close / Lock' in dtexts, dtexts
    set_lang('ko')

    # Mobile smoke: changed pages only, no horizontal overflow.
    driver.set_window_size(390, 844)
    for page in [
        'index.html',
        'projects/koreatechGongjiAgent/index.html',
        'projects/meal_queue_signal_counter/index.html',
        'projects/Wall_Sina/index.html',
        'projects/2026_U-CAST/index.html',
        'projects/PlantClock/index.html',
        'projects/Master_Creator_Challenge/index.html',
    ]:
        driver.get(BASE + page)
        wait.until(lambda d: d.execute_script('return document.readyState') == 'complete')
        no_overflow(page)

finally:
    driver.quit()
