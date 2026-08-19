from __future__ import annotations

import html
import re
import shutil
import subprocess
import time
import urllib.request
from pathlib import Path

ROOT = Path.cwd()
SOURCES = Path("/tmp/v26-media-sources")


def run(args, **kwargs):
    print("+", " ".join(map(str, args)))
    return subprocess.run(args, check=True, text=True, **kwargs)


def output(args) -> str:
    return subprocess.check_output(args, text=True).strip()


if output(["git", "rev-list", "--count", "origin/main..HEAD"]) != "0":
    raise SystemExit("target branch is not cleanly based on current origin/main")

if SOURCES.exists():
    shutil.rmtree(SOURCES)
SOURCES.mkdir(parents=True)

repos = [
    "2024_5th_CSRC",
    "Master_Creator_Challenge",
    "Wall_Sina",
    "PlantClock",
    "BerryIno",
]
for repo in repos:
    run(["git", "clone", "--depth", "1", f"https://github.com/pachir1su/{repo}.git", str(SOURCES / repo)])

media_root = ROOT / "assets" / "media"
for repo in repos:
    (media_root / repo).mkdir(parents=True, exist_ok=True)


def convert(source: Path, dest: Path):
    run([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
        "-i", str(source),
        "-vf", "scale='min(1200,iw)':-2",
        "-c:v", "libwebp", "-quality", "80", "-compression_level", "6",
        str(dest),
    ])


jobs = [
    ("2024_5th_CSRC", "media/CSRC_LED.jpg", "csrc-led.webp"),
    ("2024_5th_CSRC", "media/CSRC_LED2.jpg", "csrc-led-2.webp"),
    ("2024_5th_CSRC", "media/CSRC_SSAKSSAK.jpg", "csrc-build-1.webp"),
    ("2024_5th_CSRC", "media/CSRC_SSAKSSAK2.jpg", "csrc-build-2.webp"),
    ("2024_5th_CSRC", "media/CSRC_SSAKSSAK3.jpg", "csrc-build-3.webp"),
    ("2024_5th_CSRC", "media/CSRC_hall.jpg", "csrc-hall.webp"),
    ("Master_Creator_Challenge", "tray01.jpg", "doorlock-1.webp"),
    ("Master_Creator_Challenge", "tray02.jpg", "doorlock-2.webp"),
    ("Master_Creator_Challenge", "tray03.jpg", "doorlock-3.webp"),
    ("Wall_Sina", "plan.png", "plan-1.webp"),
    ("Wall_Sina", "plan2.jpg", "plan-2.webp"),
    ("Wall_Sina", "plan3.png", "plan-3.webp"),
    ("Wall_Sina", "tray.jpg", "prototype-1.webp"),
    ("Wall_Sina", "tray2.jpg", "prototype-2.webp"),
    ("Wall_Sina", "tray3.jpg", "prototype-3.webp"),
    ("PlantClock", "media/2025PlantClock.jpg", "plantclock.webp"),
    ("BerryIno", "img/LCD.png", "nfc-lcd.webp"),
    ("BerryIno", "img/웹서버.png", "nfc-web-dashboard.webp"),
    ("BerryIno", "img/tlqkf.jpeg", "nfc-photo-1.webp"),
    ("BerryIno", "img/tlqkf2.jpeg", "nfc-photo-2.webp"),
    ("BerryIno", "img/맞짱.jpeg", "nfc-photo-3.webp"),
]
for repo, source, dest in jobs:
    convert(SOURCES / repo / source, media_root / repo / dest)


def dims(asset: Path):
    value = output([
        "ffprobe", "-v", "error", "-select_streams", "v:0",
        "-show_entries", "stream=width,height", "-of", "csv=s=x:p=0", str(asset)
    ])
    width, height = value.split("x")
    return int(width), int(height)


def figure(project, filename, alt_ko, ko, en):
    asset = media_root / project / filename
    width, height = dims(asset)
    src = f"../../assets/media/{project}/{filename}"
    return f'''                <figure class="detail-figure">
                  <img src="{src}" width="{width}" height="{height}" loading="lazy" decoding="async" alt="{html.escape(alt_ko, quote=True)}" />
                  <figcaption data-en="{html.escape(en, quote=True)}" data-ko="{html.escape(ko, quote=True)}">{html.escape(ko)}</figcaption>
                </figure>'''


galleries = {
    "projects/2024_5th_CSRC/index.html": [
        figure("2024_5th_CSRC", "csrc-led.webp", "졸음 방지 시스템 완성 단계 시제품의 전면 제어부와 센서 구성", "완성 단계 시제품 — 전면 제어부와 센서 구성", "Near-final prototype — front controls and sensor assembly"),
        figure("2024_5th_CSRC", "csrc-led-2.webp", "졸음 방지 시스템 시제품의 LED 출력 동작 상태", "시제품 동작 상태 — LED 출력 확인", "Prototype in operation — LED output check"),
        figure("2024_5th_CSRC", "csrc-build-1.webp", "졸음 방지 시스템 본체를 조립하고 배선하는 제작 과정", "제작 과정 — 본체 조립과 배선 작업", "Build process — body assembly and wiring"),
        figure("2024_5th_CSRC", "csrc-build-2.webp", "졸음 방지 시스템 내부 하드웨어 배선 제작 과정", "제작 과정 — 내부 하드웨어 배선", "Build process — internal hardware wiring"),
        figure("2024_5th_CSRC", "csrc-build-3.webp", "졸음 방지 시스템 프로토타입 내부의 아두이노와 브레드보드 배선", "프로토타입 내부 아두이노·브레드보드 배선", "Arduino and breadboard wiring inside the prototype"),
        figure("2024_5th_CSRC", "csrc-hall.webp", "제5회 천안학생로봇대회 행사 현장", "제5회 천안학생로봇대회 현장", "5th Cheonan Student Robot Competition venue"),
    ],
    "projects/Master_Creator_Challenge/index.html": [
        figure("Master_Creator_Challenge", "doorlock-1.webp", "제작 및 배선 작업 중인 비밀번호 도어락 시제품", "제작 및 배선 작업 중인 도어락 시제품", "Door-lock prototype during assembly and wiring"),
        figure("Master_Creator_Challenge", "doorlock-2.webp", "파란색과 흰색으로 제작한 비밀번호 도어락 완성 모형 정면", "비밀번호 도어락 완성 모형 — 정면", "Completed password door-lock model — front"),
        figure("Master_Creator_Challenge", "doorlock-3.webp", "비밀번호 도어락 완성 모형의 측면과 내부 배선", "비밀번호 도어락 완성 모형 — 측면", "Completed password door-lock model — side"),
    ],
    "projects/Wall_Sina/index.html": [
        figure("Wall_Sina", "plan-1.webp", "해수면 상승에 따라 장벽이 올라가는 해안 장벽 작동 개념도", "해수면 상승 시 장벽 작동 개념도", "Concept diagram of the barrier rising with sea level"),
        figure("Wall_Sina", "plan-2.webp", "해안 장벽 프로젝트 초기 아이디어를 정리한 화이트보드 스케치", "초기 아이디어 화이트보드 스케치", "Early concept sketch on a whiteboard"),
        figure("Wall_Sina", "plan-3.webp", "물 감지 센서와 방수천 및 모터 구조를 나타낸 해안 장벽 시스템 구조도", "센서·방수천·모터를 포함한 시스템 구조도", "System diagram with sensors, waterproof sheet, and motor"),
        figure("Wall_Sina", "prototype-1.webp", "수조 안에 설치한 해안 장벽 시제품 정면", "수조에 설치한 해안 장벽 시제품 — 정면", "Coastal barrier prototype installed in the tank — front"),
        figure("Wall_Sina", "prototype-2.webp", "수조 안에 설치한 해안 장벽 시제품 측면", "해안 장벽 시제품 — 측면", "Coastal barrier prototype — side"),
        figure("Wall_Sina", "prototype-3.webp", "수조 내부의 도시와 해안 장벽 모형 전경", "수조 내부 도시·장벽 모형 전경", "Overview of the city and barrier model inside the tank"),
    ],
    "projects/PlantClock/index.html": [
        figure("PlantClock", "plantclock.webp", "LCD와 버튼 및 팬이 결합된 식물 타이머 완성 시제품", "식물 타이머 완성 시제품", "Completed Plant Timer prototype"),
    ],
    "projects/BerryIno/index.html": [
        figure("BerryIno", "nfc-lcd.webp", "NFC 출석 체크 시스템의 LCD와 키패드 모듈을 테스트하는 모습", "LCD·키패드 모듈 테스트", "LCD and keypad module test"),
        figure("BerryIno", "nfc-photo-1.webp", "분홍색 케이스에 LCD와 키패드를 장착한 출석 체크 시스템 시제품 정면", "출석 체크 시스템 케이스 시제품 — 정면", "Attendance-system enclosure prototype — front"),
        figure("BerryIno", "nfc-photo-2.webp", "출석 체크 시스템 케이스 내부의 아두이노와 배선", "케이스 내부 하드웨어와 배선", "Hardware and wiring inside the enclosure"),
        figure("BerryIno", "nfc-photo-3.webp", "흰색 케이스로 제작한 출석 체크 시스템 시제품 외형", "출석 체크 시스템 케이스 시제품 — 외형", "Attendance-system enclosure prototype — exterior"),
        figure("BerryIno", "nfc-web-dashboard.webp", "웹 브라우저에 표시된 출석 현황 대시보드", "실시간 출석 현황 웹 화면", "Real-time attendance status web dashboard"),
    ],
}

marker = '''            <div class="detail-section" data-aos="fade-up" data-aos-delay="100">
              <h2 data-en="My Role" data-ko="나의 역할">나의 역할</h2>'''

for page_name, figures in galleries.items():
    page = ROOT / page_name
    text = page.read_text(encoding="utf-8")
    if 'data-media-pass="v26"' in text:
        raise SystemExit(f"media gallery already exists: {page_name}")
    if text.count(marker) != 1:
        raise SystemExit(f"expected one My Role marker in {page_name}, found {text.count(marker)}")
    gallery = '''            <div class="detail-section" data-aos="fade-up" data-aos-delay="75" data-media-pass="v26">
              <h2 data-en="Project Media" data-ko="프로젝트 사진">프로젝트 사진</h2>
              <div class="detail-gallery">
''' + "\n".join(figures) + '''
              </div>
            </div>'''
    page.write_text(text.replace(marker, gallery + "\n" + marker, 1), encoding="utf-8")

expected = {
    "projects/2024_5th_CSRC/index.html": 6,
    "projects/Master_Creator_Challenge/index.html": 3,
    "projects/Wall_Sina/index.html": 6,
    "projects/PlantClock/index.html": 1,
    "projects/BerryIno/index.html": 5,
}
assert len(list(media_root.glob("*/*.webp"))) == 21
for asset in media_root.glob("*/*.webp"):
    dims(asset)

for page_name, count in expected.items():
    text = (ROOT / page_name).read_text(encoding="utf-8")
    assert text.count('data-media-pass="v26"') == 1
    section = text.split('data-media-pass="v26"', 1)[1].split("</div>\n            </div>", 1)[0]
    assert section.count('<figure class="detail-figure">') == count
    tags = re.findall(r'<img\s+[^>]*>', section)
    assert len(tags) == count
    for tag in tags:
        assert 'loading="lazy"' in tag
        assert 'decoding="async"' in tag
        assert re.search(r'width="\d+"', tag)
        assert re.search(r'height="\d+"', tag)
        assert re.search(r'alt="[^"]+"', tag)
        src = re.search(r'src="([^"]+)"', tag).group(1)
        local = ((ROOT / page_name).parent / src).resolve()
        assert local.exists(), (page_name, src)

run(["node", "--check", "script.js"])
run(["node", "build.js"])
run(["git", "diff", "--exit-code", "--", "index.html"])
run(["node", "tools/verify-build.js"])
run(["git", "diff", "--check"])

server = subprocess.Popen(
    ["python3", "-m", "http.server", "8000"],
    stdout=subprocess.DEVNULL,
    stderr=subprocess.DEVNULL,
)
try:
    time.sleep(1)
    for page in ["2024_5th_CSRC", "Master_Creator_Challenge", "Wall_Sina", "PlantClock", "BerryIno"]:
        with urllib.request.urlopen(f"http://127.0.0.1:8000/projects/{page}/", timeout=5) as response:
            assert response.status == 200
    for asset in media_root.glob("*/*.webp"):
        rel = asset.relative_to(ROOT).as_posix()
        with urllib.request.urlopen(f"http://127.0.0.1:8000/{rel}", timeout=5) as response:
            assert response.status == 200
finally:
    server.terminate()
    server.wait(timeout=5)

run(["git", "config", "user.name", "github-actions[bot]"])
run(["git", "config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com"])

for asset in sorted(media_root.glob("*/*.webp")):
    rel = asset.relative_to(ROOT).as_posix()
    run(["git", "add", "--", rel])
    run(["git", "commit", "-m", f"feat: add {asset.stem} project media", "--", rel])

for page_name in expected:
    project = Path(page_name).parent.name
    run(["git", "add", "--", page_name])
    run(["git", "commit", "-m", f"feat: add {project} media gallery", "--", page_name])

commits = int(output(["git", "rev-list", "--count", "origin/main..HEAD"]))
files = [line for line in output(["git", "diff", "--name-only", "origin/main...HEAD"]).splitlines() if line]
if commits != 26 or len(files) != 26:
    raise SystemExit(f"atomicity mismatch: {commits} commits / {len(files)} files")
if output(["git", "status", "--porcelain"]):
    raise SystemExit("working tree is not clean")

run(["git", "push", "origin", "HEAD:agent/v26-media-pass"])
print("v2.6 media pass implementation pushed successfully")
