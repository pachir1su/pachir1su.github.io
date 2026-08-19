#!/usr/bin/env python3
from __future__ import annotations

import re
import shutil
import subprocess
import time
from pathlib import Path

from PIL import Image
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait

ROOT = Path.cwd()
TMP = Path('/tmp/v26-public-media')
TMP.mkdir(parents=True, exist_ok=True)


def run(args, *, capture=False, check=True):
    print('+', ' '.join(str(x) for x in args), flush=True)
    return subprocess.run(
        [str(x) for x in args], cwd=ROOT, check=check, text=True,
        stdout=subprocess.PIPE if capture else None,
        stderr=subprocess.STDOUT if capture else None,
    )


def commit_file(path: Path, message: str):
    rel = path.relative_to(ROOT).as_posix()
    run(['git', 'add', '-A', '--', rel])
    staged = run(['git', 'diff', '--cached', '--name-only'], capture=True).stdout.strip()
    if not staged:
        return False
    run(['git', 'commit', '-m', message])
    return True


def to_webp(png: Path, out: Path):
    out.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(png) as im:
        im = im.convert('RGB')
        if im.width > 1600:
            h = round(im.height * 1600 / im.width)
            im = im.resize((1600, h), Image.Resampling.LANCZOS)
        im.save(out, 'WEBP', quality=82, method=6)
    with Image.open(out) as check:
        return check.size


def figure(src, alt, ko, en, dims):
    w, h = dims
    return f'''                <figure class="detail-figure">\n                  <img src="{src}" width="{w}" height="{h}" loading="lazy" decoding="async" alt="{alt}" />\n                  <figcaption data-en="{en}" data-ko="{ko}">{ko}</figcaption>\n                </figure>'''


def section(title_ko, title_en, figures, key):
    return f'''            <div class="detail-section" data-media-followup="{key}">\n              <h2 data-en="{title_en}" data-ko="{title_ko}">{title_ko}</h2>\n              <div class="detail-gallery">\n{chr(10).join(figures)}\n              </div>\n            </div>\n'''


def insert_media(rel_html: str, block: str, key: str, message: str):
    path = ROOT / rel_html
    html = path.read_text(encoding='utf-8')
    if f'data-media-followup="{key}"' in html:
        return False
    marker = re.search(r'\s*<div class="detail-section"[^>]*>\s*<h2[^>]*data-en="My Role"', html, re.S)
    if not marker:
        raise RuntimeError(f'My Role marker not found in {rel_html}')
    html = html[:marker.start()] + '\n' + block.rstrip() + '\n' + html[marker.start():]
    path.write_text(html, encoding='utf-8')
    return commit_file(path, message)

chrome = shutil.which('google-chrome') or shutil.which('chromium') or shutil.which('chromium-browser')
chromedriver = shutil.which('chromedriver') or shutil.which('chromium-driver')
if not chrome:
    raise RuntimeError('Chrome is unavailable')
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

results = {}


def capture(name: str, url: str, out: Path, wait=8, action=None, reject=None):
    print('capture', name, url, flush=True)
    driver.get(url)
    WebDriverWait(driver, 30).until(lambda d: d.execute_script('return document.readyState') == 'complete')
    time.sleep(wait)
    if action:
        action(driver)
    time.sleep(2)
    source = driver.page_source.lower()
    title = (driver.title or '').lower()
    if reject and reject(source, title, driver.current_url):
        raise RuntimeError(f'rejected non-project page: title={driver.title!r} url={driver.current_url}')
    driver.execute_script('window.scrollTo(0,0)')
    time.sleep(0.5)
    png = TMP / f'{name}.png'
    if not driver.save_screenshot(str(png)) or png.stat().st_size < 12000:
        raise RuntimeError(f'screenshot too small: {png.stat().st_size if png.exists() else 0}')
    dims = to_webp(png, out)
    if out.stat().st_size < 5000:
        raise RuntimeError('webp too small')
    commit_file(out, f'feat: add {name.replace("-", " ")} screenshot')
    results[name] = dims
    print('captured', name, dims, out.stat().st_size, flush=True)
    return dims

# Swordmaster deployed Spaces. Try direct app first, then HF wrapper.
for key, primary, fallback, filename in [
    ('sword-file', 'https://capybaranice-file-swordmaster.hf.space', 'https://huggingface.co/spaces/capybaranice/file_swordmaster', 'file-swordmaster.webp'),
    ('sword-media', 'https://capybaranice-media-swordmaster.hf.space', 'https://huggingface.co/spaces/capybaranice/media_swordmaster', 'media-swordmaster.webp'),
]:
    out = ROOT / 'projects' / 'swordmaster' / 'assets' / 'images' / filename
    for url in [primary, fallback]:
        try:
            capture(key, url, out, wait=12, reject=lambda s,t,u: ('404' in t and 'hugging face' not in t))
            break
        except Exception as exc:
            print('capture failed', key, url, repr(exc), flush=True)
            out.unlink(missing_ok=True)

# Public freshman Notion guide.
guide_out = ROOT / 'projects' / 'koreatech_noob_guide' / 'assets' / 'images' / 'notion-guide.webp'
try:
    capture(
        'freshman-guide',
        'https://capybaracute.notion.site/2026-2fca8de5ee5f806db9e9e64464a9ac78',
        guide_out,
        wait=10,
        reject=lambda s,t,u: ('log in' in s or '로그인' in s) and '26학번' not in s and '2026' not in s,
    )
except Exception as exc:
    print('freshman guide capture failed', repr(exc), flush=True)
    guide_out.unlink(missing_ok=True)

# GitHub Rank Insight public live demo; run a real public analysis if possible.
def rank_action(d):
    field = WebDriverWait(d, 12).until(lambda x: x.find_element(By.ID, 'usernameInput'))
    field.clear(); field.send_keys('pachir1su')
    d.find_element(By.ID, 'analyzeBtn').click()
    try:
        WebDriverWait(d, 20).until(lambda x: 'hidden' not in x.find_element(By.ID, 'results').get_attribute('class').split())
    except Exception:
        pass
    time.sleep(3)

rank_out = ROOT / 'projects' / 'github_rank_insight' / 'assets' / 'images' / 'live-demo.webp'
try:
    capture('github-rank-insight', 'https://pachir1su.github.io/github-rank-insight/', rank_out, wait=4, action=rank_action)
except Exception as exc:
    print('rank insight capture failed', repr(exc), flush=True)
    rank_out.unlink(missing_ok=True)

# HEALTH_CHECK Notion: connected Notion URL may still require a logged-in session in a browser.
# Commit only when the project title/content is actually visible; never commit a login screen.
health_out = ROOT / 'projects' / 'HEALTH_CHECK_PROJECT' / 'assets' / 'images' / 'notion-project.webp'
try:
    capture(
        'health-check-notion',
        'https://app.notion.com/p/1ed78e12a7a280ca902bdeb34f0f9d4b?pvs=204',
        health_out,
        wait=10,
        reject=lambda s,t,u: ('진규야 밥먹자' not in s and '헬스 케어' not in s and 'health' not in s) or ('log in' in s and '진규야 밥먹자' not in s),
    )
except Exception as exc:
    print('health Notion capture unavailable', repr(exc), flush=True)
    health_out.unlink(missing_ok=True)

driver.quit()

# Add only sections whose real screenshots were captured.
figs = []
for key, filename, ko, en, alt in [
    ('sword-file', 'file-swordmaster.webp', 'File Swordmaster 배포 화면', 'File Swordmaster deployment', 'File Swordmaster 실제 배포 웹 화면'),
    ('sword-media', 'media-swordmaster.webp', 'Media Swordmaster 배포 화면', 'Media Swordmaster deployment', 'Media Swordmaster 실제 배포 웹 화면'),
]:
    if key in results:
        figs.append(figure(f'assets/images/{filename}', alt, ko, en, results[key]))
if figs:
    insert_media('projects/swordmaster/index.html', section('실행 화면', 'Live Demos', figs, 'v26-public'), 'v26-public', 'feat: add Swordmaster live media')

if 'freshman-guide' in results:
    insert_media(
        'projects/koreatech_noob_guide/index.html',
        section('노션 가이드 화면', 'Notion Guide', [figure('assets/images/notion-guide.webp', '한기대 26학번 신입생 가이드 공개 Notion 화면', '신입생 가이드 공개 Notion 화면', 'Public Notion freshman guide', results['freshman-guide'])], 'v26-public'),
        'v26-public', 'feat: add freshman guide media'
    )

if 'github-rank-insight' in results:
    insert_media(
        'projects/github_rank_insight/index.html',
        section('Live Demo', 'Live Demo', [figure('assets/images/live-demo.webp', 'GitHub Rank Insight 공개 Live Demo 화면', 'GitHub Rank Insight 공개 데모', 'GitHub Rank Insight live demo', results['github-rank-insight'])], 'v26-public'),
        'v26-public', 'feat: add GitHub Rank Insight media'
    )

if 'health-check-notion' in results:
    insert_media(
        'projects/HEALTH_CHECK_PROJECT/index.html',
        section('프로젝트 자료', 'Project Material', [figure('assets/images/notion-project.webp', 'HEALTH_CHECK_PROJECT 관련 Notion 프로젝트 페이지', '프로젝트 Notion 자료', 'Project Notion material', results['health-check-notion'])], 'v26-public'),
        'v26-public', 'feat: add health check project media'
    )

run(['node', '--check', 'script.js'])
run(['node', 'build.js'])
if run(['git', 'status', '--porcelain', 'index.html'], capture=True).stdout.strip():
    raise RuntimeError('build changed index.html')
run(['node', 'tools/verify-build.js'])
run(['git', 'diff', '--check', 'origin/main...HEAD'])
if run(['git', 'status', '--porcelain'], capture=True).stdout.strip():
    raise RuntimeError('working tree not clean')
run(['git', 'push', 'origin', 'HEAD:agent/v26-structure-media-followup'])
print('RESULTS', results, flush=True)
