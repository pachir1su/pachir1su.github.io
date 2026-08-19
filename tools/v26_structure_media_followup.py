#!/usr/bin/env python3
from __future__ import annotations

import os
import re
import shutil
import socket
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path.cwd()
TMP = Path('/tmp/v26-structure-media')
TMP.mkdir(parents=True, exist_ok=True)
SOURCES = TMP / 'sources'
SOURCES.mkdir(parents=True, exist_ok=True)
PREVIEWS = TMP / 'previews'
PREVIEWS.mkdir(parents=True, exist_ok=True)


def run(args, *, cwd=ROOT, env=None, check=True, capture=False):
    print('+', ' '.join(str(x) for x in args), flush=True)
    return subprocess.run(
        [str(x) for x in args],
        cwd=cwd,
        env=env,
        check=check,
        text=True,
        stdout=subprocess.PIPE if capture else None,
        stderr=subprocess.STDOUT if capture else None,
    )


def commit_paths(paths, message):
    rels = [str(Path(p)) for p in paths]
    run(['git', 'add', '-A', '--', *rels])
    staged = run(['git', 'diff', '--cached', '--name-only'], capture=True).stdout.strip().splitlines()
    if not staged:
        print('skip commit; no staged changes:', message)
        return False
    run(['git', 'commit', '-m', message])
    return True


def write_text_once(path: Path, content: str, message: str):
    old = path.read_text(encoding='utf-8') if path.exists() else None
    if old == content:
        return False
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding='utf-8')
    return commit_paths([path], message)


def clone_repo(name: str):
    dest = SOURCES / name
    if dest.exists():
        return dest
    run(['git', 'clone', '--depth', '1', f'https://github.com/pachir1su/{name}.git', dest], cwd=TMP)
    return dest


def wait_port(port: int, timeout=20):
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            with socket.create_connection(('127.0.0.1', port), timeout=1):
                return True
        except OSError:
            time.sleep(0.4)
    return False


def ffmpeg_webp(src: Path, dst: Path, quality=82):
    dst.parent.mkdir(parents=True, exist_ok=True)
    run([
        'ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', src,
        '-vf', "scale='min(1600,iw)':-2",
        '-c:v', 'libwebp', '-quality', str(quality), '-compression_level', '6', dst,
    ])


def ffprobe_dims(path: Path):
    out = run([
        'ffprobe', '-v', 'error', '-select_streams', 'v:0',
        '-show_entries', 'stream=width,height', '-of', 'csv=s=x:p=0', path,
    ], capture=True).stdout.strip()
    if 'x' not in out:
        return None
    w, h = out.split('x', 1)
    return int(w), int(h)


def install_project_media_file(path: Path, message: str):
    if not path.exists() or path.stat().st_size == 0:
        raise RuntimeError(f'missing generated media: {path}')
    dims = ffprobe_dims(path)
    if path.suffix.lower() in {'.webp', '.png', '.jpg', '.jpeg'} and not dims:
        raise RuntimeError(f'undecodable image: {path}')
    commit_paths([path], message)


# ---------------------------------------------------------------------------
# #151 — colocate project-specific media under projects/<project>/assets/*
# ---------------------------------------------------------------------------
move_pairs = []
for project in ['2024_5th_CSRC', 'BerryIno', 'Master_Creator_Challenge', 'PlantClock', 'Wall_Sina']:
    src_dir = ROOT / 'assets' / 'media' / project
    if src_dir.exists():
        for src in sorted(p for p in src_dir.iterdir() if p.is_file()):
            dst = ROOT / 'projects' / project / 'assets' / 'images' / src.name
            move_pairs.append((src, dst, project))

move_pairs.extend([
    (ROOT / 'assets' / '2026-u-cast-circuit.png', ROOT / 'projects' / '2026_U-CAST' / 'assets' / 'images' / 'circuit.png', '2026_U-CAST'),
    (ROOT / 'assets' / '2026-u-cast-prototype.webp', ROOT / 'projects' / '2026_U-CAST' / 'assets' / 'images' / 'prototype.webp', '2026_U-CAST'),
])

for src, dst, project in move_pairs:
    if not src.exists():
        continue
    dst.parent.mkdir(parents=True, exist_ok=True)
    run(['git', 'mv', src, dst])
    commit_paths([src, dst], f'refactor: colocate {src.name} with {project}')

media_root = ROOT / 'assets' / 'media'
if media_root.exists():
    try:
        shutil.rmtree(media_root)
    except OSError:
        pass


# ---------------------------------------------------------------------------
# #153 — one shared chicken favicon for every HTML page
# ---------------------------------------------------------------------------
favicon = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <text y="0.9em" font-size="90">🐔</text>
</svg>
'''
write_text_once(ROOT / 'assets' / 'favicon.svg', favicon, 'fix: add shared chicken favicon')

LINK_TAG_RE = re.compile(r'<link\b(?:[^>"\']|"[^"]*"|\'[^\']*\')*>', re.I | re.S)
REL_ICON_RE = re.compile(r'\brel\s*=\s*(["\'])?(?:shortcut\s+)?icon\1', re.I)
FAVICON_TAG = '<link rel="icon" type="image/svg+xml" href="/assets/favicon.svg" />'


def apply_shared_favicon(html: str) -> str:
    matches = []
    for m in LINK_TAG_RE.finditer(html):
        if REL_ICON_RE.search(m.group(0)):
            matches.append(m)
    if matches:
        pieces = []
        cursor = 0
        first = True
        for m in matches:
            pieces.append(html[cursor:m.start()])
            if first:
                pieces.append(FAVICON_TAG)
                first = False
            cursor = m.end()
        pieces.append(html[cursor:])
        return ''.join(pieces)

    title_close = re.search(r'</title\s*>', html, re.I)
    if title_close:
        pos = title_close.end()
        return html[:pos] + '\n    ' + FAVICON_TAG + html[pos:]
    head_open = re.search(r'<head\b[^>]*>', html, re.I)
    if head_open:
        pos = head_open.end()
        return html[:pos] + '\n    ' + FAVICON_TAG + html[pos:]
    return html


# ---------------------------------------------------------------------------
# #4 — collect the remaining automatable media
# ---------------------------------------------------------------------------
created_media = {}
processes = []

try:
    from selenium import webdriver
    from selenium.webdriver.chrome.options import Options
    from selenium.webdriver.chrome.service import Service
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC

    chrome = shutil.which('google-chrome') or shutil.which('chromium') or shutil.which('chromium-browser')
    chromedriver = shutil.which('chromedriver') or shutil.which('chromium-driver')
    if not chrome:
        raise RuntimeError('Chrome/Chromium not available')

    opts = Options()
    opts.binary_location = chrome
    for arg in [
        '--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu',
        '--hide-scrollbars', '--ignore-certificate-errors', '--window-size=1440,1000',
        '--lang=ko-KR', '--force-device-scale-factor=1',
    ]:
        opts.add_argument(arg)
    service = Service(chromedriver) if chromedriver else Service()
    driver = webdriver.Chrome(service=service, options=opts)
    driver.set_window_size(1440, 1000)

    def capture(url: str, out: Path, wait=5, after=None):
        print('capture:', url, '->', out)
        driver.get(url)
        WebDriverWait(driver, 25).until(lambda d: d.execute_script('return document.readyState') == 'complete')
        time.sleep(wait)
        if after:
            after(driver)
        driver.execute_script('window.scrollTo(0, 0)')
        time.sleep(1)
        png = PREVIEWS / (out.stem + '.png')
        driver.save_screenshot(str(png))
        if png.stat().st_size < 12000:
            raise RuntimeError(f'screenshot too small: {url} ({png.stat().st_size} bytes)')
        ffmpeg_webp(png, out)
        return ffprobe_dims(out)

    # 공감 봇 & 레시피 AI — actual Flask UI, no model request is sent.
    gonggam = clone_repo('Legend_SakSak_GongGam_AI')
    env = os.environ.copy()
    env['GOOGLE_API_KEY'] = 'portfolio-capture-placeholder'
    proc = subprocess.Popen([
        sys.executable, '-c',
        'from Server import app; app.run(host="127.0.0.1", port=8124, debug=False, use_reloader=False)'
    ], cwd=gonggam, env=env, stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT)
    processes.append(proc)
    if wait_port(8124):
        out = ROOT / 'projects' / 'Legend_SakSak_GongGam_AI' / 'assets' / 'images' / 'app-home.webp'
        created_media['gonggam'] = capture('http://127.0.0.1:8124/', out, wait=2)
        install_project_media_file(out, 'feat: add GongGam app screenshot')
    proc.terminate()

    # KGA — serve the committed frontend itself. API-dependent widgets may show their real loading/error states.
    kga = clone_repo('koreatechGongjiAgent')
    proc = subprocess.Popen([sys.executable, '-m', 'http.server', '8125', '--bind', '127.0.0.1'], cwd=kga, stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT)
    processes.append(proc)
    if wait_port(8125):
        kga_targets = [
            ('kga-home', 'http://127.0.0.1:8125/web/index.html#/home', 'web-home.webp'),
            ('kga-notice', 'http://127.0.0.1:8125/web/index.html#/notice', 'web-notice.webp'),
            ('kga-shuttle', 'http://127.0.0.1:8125/web/index.html#/shuttle', 'web-shuttle.webp'),
            ('kga-admin', 'http://127.0.0.1:8125/web/admin.html', 'web-admin.webp'),
        ]
        for key, url, filename in kga_targets:
            out = ROOT / 'projects' / 'koreatechGongjiAgent' / 'assets' / 'images' / filename
            try:
                created_media[key] = capture(url, out, wait=3)
                install_project_media_file(out, f'feat: add KGA {key.removeprefix("kga-")} screenshot')
            except Exception as exc:
                print('KGA capture skipped:', key, exc)
    proc.terminate()

    # Swordmaster — use the deployed Hugging Face Spaces, falling back to the Space wrapper.
    sword_targets = [
        ('sword-file', 'https://capybaranice-file-swordmaster.hf.space', 'https://huggingface.co/spaces/capybaranice/file_swordmaster', 'file-swordmaster.webp'),
        ('sword-media', 'https://capybaranice-media-swordmaster.hf.space', 'https://huggingface.co/spaces/capybaranice/media_swordmaster', 'media-swordmaster.webp'),
    ]
    for key, primary, fallback, filename in sword_targets:
        out = ROOT / 'projects' / 'swordmaster' / 'assets' / 'images' / filename
        try:
            created_media[key] = capture(primary, out, wait=10)
        except Exception as exc:
            print('Swordmaster direct capture failed; fallback:', exc)
            try:
                created_media[key] = capture(fallback, out, wait=10)
            except Exception as exc2:
                print('Swordmaster capture skipped:', key, exc2)
                continue
        install_project_media_file(out, f'feat: add Swordmaster {key.removeprefix("sword-")} screenshot')

    # Public Notion freshman guide.
    guide_urls = [
        'https://capybaracute.notion.site/2026-2fca8de5ee5f806db9e9e64464a9ac78',
        'https://capybaracute.notion.site/26-2fca8de5ee5f806db9e9e64464a9ac78',
    ]
    out = ROOT / 'projects' / 'koreatech_noob_guide' / 'assets' / 'images' / 'notion-guide.webp'
    for url in guide_urls:
        try:
            created_media['guide'] = capture(url, out, wait=9)
            install_project_media_file(out, 'feat: add freshman guide screenshot')
            break
        except Exception as exc:
            print('Guide capture attempt failed:', url, exc)

    # GitHub Rank Insight — capture a real analysis for the portfolio owner when the public API succeeds.
    def rank_action(d):
        try:
            field = WebDriverWait(d, 10).until(EC.presence_of_element_located((By.ID, 'usernameInput')))
            field.clear()
            field.send_keys('pachir1su')
            d.find_element(By.ID, 'analyzeBtn').click()
            WebDriverWait(d, 18).until(lambda x: 'hidden' not in x.find_element(By.ID, 'results').get_attribute('class').split())
            time.sleep(2)
        except Exception as exc:
            print('Rank analysis interaction did not finish; keeping real initial/error state:', exc)

    out = ROOT / 'projects' / 'github_rank_insight' / 'assets' / 'images' / 'live-demo.webp'
    try:
        created_media['rank'] = capture('https://pachir1su.github.io/github-rank-insight/', out, wait=4, after=rank_action)
        install_project_media_file(out, 'feat: add GitHub Rank Insight demo screenshot')
    except Exception as exc:
        print('Rank Insight capture skipped:', exc)

    driver.quit()

except Exception as exc:
    print('Browser media collection partially unavailable:', repr(exc))
finally:
    for proc in processes:
        try:
            proc.terminate()
        except Exception:
            pass


# Wall_Sina source video — include only if it is short enough for an in-page optimized demo.
try:
    wall = clone_repo('Wall_Sina')
    candidates = list(wall.rglob('*.MP4')) + list(wall.rglob('*.mp4'))
    if candidates:
        src_video = candidates[0]
        duration_raw = run([
            'ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nk=1:nw=1', src_video
        ], capture=True).stdout.strip()
        duration = float(duration_raw)
        print('Wall_Sina source video duration:', duration)
        if duration <= 90:
            out = ROOT / 'projects' / 'Wall_Sina' / 'assets' / 'video' / 'prototype-demo.mp4'
            out.parent.mkdir(parents=True, exist_ok=True)
            run([
                'ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', src_video,
                '-vf', "scale='min(1280,iw)':-2", '-c:v', 'libx264', '-preset', 'medium', '-crf', '28',
                '-movflags', '+faststart', '-an', out,
            ])
            if out.stat().st_size <= 8 * 1024 * 1024:
                commit_paths([out], 'feat: add Wall_Sina prototype demo video')
                created_media['wall-video'] = duration
            else:
                out.unlink(missing_ok=True)
                print('Wall_Sina optimized video still too large; leave for YouTube workflow')
        else:
            print('Wall_Sina video is long; leave for YouTube workflow')
except Exception as exc:
    print('Wall_Sina video processing skipped:', exc)


# ---------------------------------------------------------------------------
# Compose each HTML exactly once: favicon + relocated paths + new media blocks.
# ---------------------------------------------------------------------------
path_replacements = {
    'projects/2024_5th_CSRC/index.html': [('../../assets/media/2024_5th_CSRC/', 'assets/images/')],
    'projects/BerryIno/index.html': [('../../assets/media/BerryIno/', 'assets/images/')],
    'projects/Master_Creator_Challenge/index.html': [('../../assets/media/Master_Creator_Challenge/', 'assets/images/')],
    'projects/PlantClock/index.html': [('../../assets/media/PlantClock/', 'assets/images/')],
    'projects/Wall_Sina/index.html': [('../../assets/media/Wall_Sina/', 'assets/images/')],
    'projects/2026_U-CAST/index.html': [
        ('../../assets/2026-u-cast-circuit.png', 'assets/images/circuit.png'),
        ('../../assets/2026-u-cast-prototype.webp', 'assets/images/prototype.webp'),
    ],
}


def figure(src, alt, ko, en, width=1440, height=1000):
    return f'''                <figure class="detail-figure">\n                  <img src="{src}" width="{width}" height="{height}" loading="lazy" decoding="async" alt="{alt}" />\n                  <figcaption data-en="{en}" data-ko="{ko}">{ko}</figcaption>\n                </figure>'''


def media_section(title_ko, title_en, figures):
    return f'''            <div class="detail-section" data-media-followup="v26">\n              <h2 data-en="{title_en}" data-ko="{title_ko}">{title_ko}</h2>\n              <div class="detail-gallery">\n{chr(10).join(figures)}\n              </div>\n            </div>\n'''


def insert_before_my_role(html, block):
    if 'data-media-followup="v26"' in html and block.strip() in html:
        return html
    marker = re.search(r'\s*<div class="detail-section"[^>]*>\s*<h2[^>]*data-en="My Role"', html, re.S)
    if marker:
        return html[:marker.start()] + '\n' + block.rstrip() + '\n' + html[marker.start():]
    sidebar_marker = '\n          <div class="detail-sidebar">'
    idx = html.find(sidebar_marker)
    if idx != -1:
        main_close = html.rfind('          </div>', 0, idx)
        if main_close != -1:
            return html[:main_close] + block + html[main_close:]
    raise RuntimeError('Could not find detail-main insertion point')


new_blocks = {}
if 'gonggam' in created_media:
    dims = created_media['gonggam'] or (1440, 1000)
    new_blocks['projects/Legend_SakSak_GongGam_AI/index.html'] = media_section(
        '실행 화면', 'App Screenshot',
        [figure('assets/images/app-home.webp', '공감 봇과 레시피 AI의 실제 웹 입력 화면', '공감 봇 & 레시피 AI 웹 화면', 'GongGam & Recipe AI web interface', *dims)]
    )

kga_figs = []
for key, filename, ko, en, alt in [
    ('kga-home', 'web-home.webp', '통합 웹 홈', 'Unified web home', '코리아텍 통합 알림 시스템의 웹 홈 화면'),
    ('kga-notice', 'web-notice.webp', '공지 조회 화면', 'Notice browser', '코리아텍 통합 알림 시스템의 공지 조회 화면'),
    ('kga-shuttle', 'web-shuttle.webp', '셔틀 화면', 'Shuttle view', '코리아텍 통합 알림 시스템의 셔틀 화면'),
    ('kga-admin', 'web-admin.webp', '관리자 웹', 'Admin web', '코리아텍 통합 알림 시스템의 관리자 웹 화면'),
]:
    if key in created_media:
        dims = created_media[key] or (1440, 1000)
        kga_figs.append(figure(f'assets/images/{filename}', alt, ko, en, *dims))
if kga_figs:
    new_blocks['projects/koreatechGongjiAgent/index.html'] = media_section('실행 화면', 'App Screenshots', kga_figs)

sword_figs = []
for key, filename, ko, en, alt in [
    ('sword-file', 'file-swordmaster.webp', 'File Swordmaster', 'File Swordmaster', 'File Swordmaster의 실제 배포 웹 화면'),
    ('sword-media', 'media-swordmaster.webp', 'Media Swordmaster', 'Media Swordmaster', 'Media Swordmaster의 실제 배포 웹 화면'),
]:
    if key in created_media:
        dims = created_media[key] or (1440, 1000)
        sword_figs.append(figure(f'assets/images/{filename}', alt, ko, en, *dims))
if sword_figs:
    new_blocks['projects/swordmaster/index.html'] = media_section('실행 화면', 'Live Demos', sword_figs)

if 'guide' in created_media:
    dims = created_media['guide'] or (1440, 1000)
    new_blocks['projects/koreatech_noob_guide/index.html'] = media_section(
        '노션 가이드 화면', 'Notion Guide',
        [figure('assets/images/notion-guide.webp', '한기대 26학번 신입생 가이드의 실제 공개 Notion 화면', '신입생 가이드 공개 Notion 화면', 'Public Notion freshman guide', *dims)]
    )

if 'rank' in created_media:
    dims = created_media['rank'] or (1440, 1000)
    new_blocks['projects/github_rank_insight/index.html'] = media_section(
        'Live Demo', 'Live Demo',
        [figure('assets/images/live-demo.webp', 'GitHub Rank Insight 공개 Live Demo 화면', 'GitHub Rank Insight 공개 데모', 'GitHub Rank Insight live demo', *dims)]
    )

if 'wall-video' in created_media:
    new_blocks['projects/Wall_Sina/index.html'] = '''            <div class="detail-section" data-media-followup="v26">\n              <h2 data-en="Prototype Demo" data-ko="시제품 동작 영상">시제품 동작 영상</h2>\n              <figure class="detail-figure detail-video-figure">\n                <video class="detail-video" controls preload="metadata" playsinline poster="assets/images/prototype-1.webp">\n                  <source src="assets/video/prototype-demo.mp4" type="video/mp4" />\n                </video>\n                <figcaption data-en="Original prototype operation test video" data-ko="원본 시제품 동작 테스트 영상">원본 시제품 동작 테스트 영상</figcaption>\n              </figure>\n            </div>\n'''

html_files = sorted(p for p in ROOT.rglob('*.html') if '.git' not in p.parts and 'node_modules' not in p.parts)
for path in html_files:
    rel = path.relative_to(ROOT).as_posix()
    original = path.read_text(encoding='utf-8')
    updated = apply_shared_favicon(original)
    for old, new in path_replacements.get(rel, []):
        updated = updated.replace(old, new)
    if rel in new_blocks and 'data-media-followup="v26"' not in updated:
        updated = insert_before_my_role(updated, new_blocks[rel])
    if updated != original:
        path.write_text(updated, encoding='utf-8')
        if rel in new_blocks:
            message = f'feat: update {Path(rel).parent.name} project media'
        elif rel in path_replacements:
            message = f'refactor: update {Path(rel).parent.name} project asset paths'
        else:
            message = f'fix: use shared favicon in {rel}'
        commit_paths([path], message)


# ---------------------------------------------------------------------------
# #152 — prevent grid items from stretching to the tallest photo in each row.
# Also style the source-video block added above.
# ---------------------------------------------------------------------------
style_path = ROOT / 'style.css'
style = style_path.read_text(encoding='utf-8')
if '.detail-gallery {' in style and 'align-items: start;' not in style[style.index('.detail-gallery {'):style.index('.detail-gallery {') + 240]:
    style = style.replace('.detail-gallery {', '.detail-gallery {\n  align-items: start;', 1)
if '.detail-figure {' in style and 'align-self: start;' not in style[style.index('.detail-figure {'):style.index('.detail-figure {') + 220]:
    style = style.replace('.detail-figure {', '.detail-figure {\n  align-self: start;', 1)
if '.detail-video {' not in style:
    anchor = '.detail-figure figcaption {'
    idx = style.find(anchor)
    if idx != -1:
        block_end = style.find('}', idx)
        block_end = style.find('\n', block_end) + 1
        style = style[:block_end] + '''\n.detail-video-figure {\n  width: 100%;\n}\n.detail-video {\n  width: 100%;\n  height: auto;\n  display: block;\n  border-radius: 2px;\n  background: #000;\n}\n''' + style[block_end:]
if style != style_path.read_text(encoding='utf-8'):
    style_path.write_text(style, encoding='utf-8')
    commit_paths([style_path], 'fix: stop project media cards from stretching')


# ---------------------------------------------------------------------------
# Document and enforce the new asset architecture.
# ---------------------------------------------------------------------------
agents_path = ROOT / 'AGENTS.md'
agents = agents_path.read_text(encoding='utf-8')
architecture_note = '''\n\n## Project-local assets\n\n- 프로젝트 하나에서만 쓰는 사진·영상·데이터는 `projects/<project>/assets/{images,video,data}/` 아래에 둔다.\n- 전역 `assets/`에는 favicon, 사이트 로고, GitHub 활동 카드처럼 여러 페이지가 공유하는 자산만 둔다.\n- 새 프로젝트 미디어를 `assets/media/<project>/`에 만들지 않는다. 상세 페이지 URL은 `projects/<project>/`를 유지한다.\n- 모든 HTML 페이지는 공용 `/assets/favicon.svg` 닭 favicon을 사용한다.\n'''
if '## Project-local assets' not in agents:
    agents += architecture_note
    agents_path.write_text(agents, encoding='utf-8')
    commit_paths([agents_path], 'docs: document project-local asset layout')

assets_readme_path = ROOT / 'assets' / 'README.md'
if assets_readme_path.exists():
    assets_readme = assets_readme_path.read_text(encoding='utf-8')
    note = '''\n\n## 전역 자산 원칙\n\n`assets/`는 사이트 공용 자산 전용입니다. 프로젝트 하나에만 속하는 사진·영상·데이터는 `projects/<project>/assets/`에 둡니다.\n\n- 공용: `favicon.svg`, 사이트 로고, 여러 페이지에서 공유하는 통계/브랜드 자산\n- 프로젝트 전용: `projects/<project>/assets/images/`, `video/`, `data/`\n- 폐기된 구조: `assets/media/<project>/`\n'''
    if '## 전역 자산 원칙' not in assets_readme:
        assets_readme += note
        assets_readme_path.write_text(assets_readme, encoding='utf-8')
        commit_paths([assets_readme_path], 'docs: clarify global asset ownership')

verify_path = ROOT / 'tools' / 'verify-build.js'
verify = verify_path.read_text(encoding='utf-8')
if '공용 favicon 정합성' not in verify:
    insertion = r'''

/* --- 4) 공용 favicon 정합성 + 프로젝트 전용 미디어 위치 --- */
function collectHtmlFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === ".git" || entry.name === "node_modules") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collectHtmlFiles(full));
    else if (entry.isFile() && entry.name.endsWith(".html")) out.push(full);
  }
  return out;
}

for (const htmlFile of collectHtmlFiles(root)) {
  const rel = path.relative(root, htmlFile).replaceAll("\\", "/");
  const html = fs.readFileSync(htmlFile, "utf8");
  check(
    html.includes('href="/assets/favicon.svg"'),
    `공용 닭 favicon 누락: ${rel}`
  );
}

check(
  !fs.existsSync(path.join(root, "assets", "media")),
  "폐기된 assets/media 디렉터리가 남아 있습니다. 프로젝트 전용 미디어는 projects/<project>/assets/ 아래에 둡니다."
);

for (const group of data.groups) {
  for (const card of group.cards) {
    if (!card.detail) continue;
    const detailDir = path.join(root, card.detail);
    if (!fs.existsSync(detailDir)) continue;
    const detailHtml = fs.readFileSync(path.join(detailDir, "index.html"), "utf8");
    const localAssetRefs = [...detailHtml.matchAll(/(?:src|poster)="(assets\/[^"]+)"/g)].map((m) => m[1]);
    for (const ref of localAssetRefs) {
      check(fs.existsSync(path.join(detailDir, ref)), `프로젝트 로컬 자산 없음: ${card.detail}${ref}`);
    }
  }
}
'''
    verify = verify.replace('\nif (failures.length === 0) {', insertion + '\nif (failures.length === 0) {')
    verify_path.write_text(verify, encoding='utf-8')
    commit_paths([verify_path], 'chore: verify favicon and project-local assets')


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------
run(['node', '--check', 'script.js'])
run(['node', 'build.js'])
if run(['git', 'status', '--porcelain', 'index.html'], capture=True).stdout.strip():
    raise RuntimeError('node build.js changed index.html; generated block is not idempotent')
run(['node', 'tools/verify-build.js'])
run(['git', 'diff', '--check', 'origin/main...HEAD'])

# Validate all project-local image/video references through ffprobe when applicable.
for project_dir in (ROOT / 'projects').iterdir():
    assets = project_dir / 'assets'
    if not assets.exists():
        continue
    for media in assets.rglob('*'):
        if media.suffix.lower() in {'.webp', '.png', '.jpg', '.jpeg', '.mp4', '.webm'}:
            run(['ffprobe', '-v', 'error', media], check=True)

status = run(['git', 'status', '--porcelain'], capture=True).stdout.strip()
if status:
    raise RuntimeError('working tree not clean at end:\n' + status)

# One logical changed file per commit. GitHub will recognize exact blob moves as renames.
base = 'origin/main'
changed = run(['git', 'diff', '--name-only', f'{base}...HEAD'], capture=True).stdout.strip().splitlines()
commits = run(['git', 'rev-list', '--count', f'{base}..HEAD'], capture=True).stdout.strip()
print(f'FINAL changed paths={len(changed)} commits={commits}')
if int(commits) != len(changed):
    raise RuntimeError(f'atomicity mismatch before push: changed paths={len(changed)}, commits={commits}')

run(['git', 'push', 'origin', 'HEAD:agent/v26-structure-media-followup'])
print('DONE')
