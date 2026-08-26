from pathlib import Path


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected one target, got {count}: {old!r}')
    p.write_text(text.replace(old, new, 1), encoding='utf-8')


# KGA: user-selected portrait live shuttle screenshot (optimized copy is 600x820).
replace_once(
    'projects/koreatechGongjiAgent/index.html',
    '<img src="assets/images/web-shuttle-live.webp" width="1200" height="833" loading="lazy" decoding="async" alt="코리아텍 통합 알림 시스템 셔틀 화면" />',
    '<img src="assets/images/web-shuttle-live.webp" width="600" height="820" loading="lazy" decoding="async" alt="코리아텍 통합 알림 시스템 셔틀 화면" />',
)

# Meal queue: the actual MP4 is 720x1280. Lock the rendered box to 9:16 so
# the 3:4 poster cannot resize the <video> when playback starts.
replace_once(
    'projects/meal_queue_signal_counter/index.html',
    '<video class="detail-video" width="1080" height="1920" controls preload="metadata" playsinline muted poster="assets/images/green-signal-demo.webp">',
    '<video class="detail-video" width="720" height="1280" style="aspect-ratio: 9 / 16; object-fit: cover" controls preload="metadata" playsinline muted poster="assets/images/green-signal-demo.webp">',
)

# Wall_Sina: ffprobe-confirmed native dimensions. Posters are 3:4, so each
# video also gets its exact native aspect ratio to prevent play-time reflow.
replace_once(
    'projects/Wall_Sina/index.html',
    '<video class="detail-video" width="1920" height="1080" controls preload="metadata" playsinline poster="assets/images/prototype-1.webp">',
    '<video class="detail-video" width="1080" height="1920" style="aspect-ratio: 9 / 16; object-fit: cover" controls preload="metadata" playsinline poster="assets/images/prototype-1.webp">',
)
replace_once(
    'projects/Wall_Sina/index.html',
    '<video class="detail-video" width="1280" height="720" controls preload="metadata" playsinline muted poster="assets/images/final-model-overview.webp">',
    '<video class="detail-video" width="456" height="720" style="aspect-ratio: 19 / 30; object-fit: cover" controls preload="metadata" playsinline muted poster="assets/images/final-model-overview.webp">',
)
replace_once(
    'projects/Wall_Sina/index.html',
    '<video class="detail-video" width="1920" height="1080" controls preload="metadata" playsinline muted poster="assets/images/final-barrier-front.webp">',
    '<video class="detail-video" width="406" height="720" style="aspect-ratio: 203 / 360; object-fit: cover" controls preload="metadata" playsinline muted poster="assets/images/final-barrier-front.webp">',
)
