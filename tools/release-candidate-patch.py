from pathlib import Path
import re

root = Path(__file__).resolve().parents[1].parent / "final"

# Root v2 home gateway: use collision-aware placement that rechecks after late font/layout changes.
script = root / "script.js"
s = script.read_text(encoding="utf-8")
placement_pattern = re.compile(r"  function placeGateway\(\) \{.*?\n  \}\n  placeGateway\(\);", re.S)
placement_replacement = r'''  function placeGateway() {
    const width = window.innerWidth;
    const base = width <= 390 ? .76 : width <= 640 ? .72 : width <= 1024 ? .34 : .23;
    const min = width <= 390 ? 210 : width <= 640 ? 236 : width <= 1024 ? 250 : 290;
    const max = width <= 390 ? 292 : width <= 640 ? 342 : width <= 1024 ? 360 : 430;
    const initialSize = Math.max(min, Math.min(max, width * base * profile.size));
    const heroRect = hero.getBoundingClientRect();
    const blockers = Array.from(hero.querySelectorAll('.hero-main > *, .hero-stats > *'))
      .filter((node) => node !== slot && node.getClientRects().length);
    const blockerRects = blockers.map((node) => node.getBoundingClientRect());
    const intersects = (a, b) => a.left < b.right + 12 && a.right > b.left - 12 && a.top < b.bottom + 12 && a.bottom > b.top - 12;
    const insideHero = (rect) => rect.left >= heroRect.left + 8 && rect.right <= heroRect.right - 8 && rect.top >= heroRect.top + 58 && rect.bottom <= heroRect.bottom - 10;
    const lanes = width <= 390
      ? [[50, 87], [36, 88], [64, 88], [50, 91]]
      : width <= 640
        ? [[50, 86], [34, 87], [66, 87], [50, 91]]
        : width <= 1024
          ? [[68, 84], [32, 84], [50, 88], [72, 90], [28, 90]]
          : [[72, 70], [70, 82], [66, 55], [82, 68], [58, 78]];
    const scales = width <= 1024 ? [1, .9, .8, .7] : [1, .9, .8];

    function tryCandidate(lane, candidateSize) {
      slot.style.setProperty('--v3-gate-size', `${Math.round(candidateSize)}px`);
      slot.style.setProperty('--v3-gate-x', `${lane[0]}%`);
      slot.style.setProperty('--v3-gate-y', `${lane[1]}%`);
      const rect = slot.getBoundingClientRect();
      return insideHero(rect) && blockerRects.every((blocker) => !intersects(rect, blocker));
    }

    for (const scale of scales) {
      const candidateSize = Math.max(184, initialSize * scale);
      for (let index = 0; index < lanes.length; index++) {
        const lane = lanes[(profile.lane + index) % lanes.length];
        if (tryCandidate(lane, candidateSize)) return;
      }
    }

    /* 마지막 후보는 전용 하단 여백의 중앙에 둔다. 작은 화면에서는 CSS가
       Gateway용 bottom padding을 확보하므로 텍스트/버튼 위에 덮지 않는다. */
    let fallbackSize = Math.max(176, initialSize * .66);
    for (let attempt = 0; attempt < 4; attempt++) {
      const halfHeight = fallbackSize / 3;
      const lastBlockerBottom = blockerRects.reduce((value, rect) => Math.max(value, rect.bottom), heroRect.top + 58);
      const minCenter = lastBlockerBottom + 18 + halfHeight;
      const maxCenter = heroRect.bottom - 14 - halfHeight;
      const center = Math.min(maxCenter, Math.max(minCenter, heroRect.top + heroRect.height * .86));
      slot.style.setProperty('--v3-gate-size', `${Math.round(fallbackSize)}px`);
      slot.style.setProperty('--v3-gate-x', '50%');
      slot.style.setProperty('--v3-gate-y', `${Math.max(72, center - heroRect.top)}px`);
      const rect = slot.getBoundingClientRect();
      if (insideHero(rect) && blockerRects.every((blocker) => !intersects(rect, blocker))) return;
      fallbackSize *= .84;
    }
  }
  placeGateway();
  window.addEventListener('load', placeGateway, { once: true });
  document.fonts?.ready?.then(placeGateway).catch(() => {});
  if ('ResizeObserver' in window) new ResizeObserver(placeGateway).observe(hero);'''
s, count = placement_pattern.subn(placement_replacement, s, count=1)
if count != 1:
    raise SystemExit(f"root gateway placement replacement count={count}")

# Root v2 home gateway: returning via browser history/bfcache must restore the gateway.
needle = """  let entering = false;\n  link.addEventListener('click', (event) => {\n"""
replacement = """  let entering = false;\n  function resetV3Gateway() {\n    entering = false;\n    document.body.classList.remove('v3-gateway-entering');\n    slot.classList.remove('is-entering');\n    veil.classList.remove('is-open');\n    burstCanvas.classList.remove('is-active');\n    cancelAnimationFrame(burstFrame);\n  }\n  window.addEventListener('pageshow', (event) => {\n    if (event.persisted) resetV3Gateway();\n  });\n  document.addEventListener('visibilitychange', () => {\n    if (document.visibilityState === 'visible' && entering) resetV3Gateway();\n  });\n  link.addEventListener('click', (event) => {\n"""
if needle not in s:
    raise SystemExit("root gateway insertion point missing")
s = s.replace(needle, replacement, 1)

# Keep the visible language label inside the accessible name (Lighthouse WCAG 2.5.3).
needle = """    desktop.title = lang === 'ko' ? 'English' : '한국어';\n"""
replacement = """    desktop.title = lang === 'ko' ? 'English' : '한국어';\n    desktop.setAttribute('aria-label', lang === 'ko' ? 'EN · English' : 'KO · 한국어');\n    if (mobile) mobile.setAttribute('aria-label', lang === 'ko' ? 'English · 언어 전환' : '한국어 · Switch language');\n"""
if needle not in s:
    raise SystemExit("language toggle insertion point missing")
s = s.replace(needle, replacement, 1)
if "stamp-pop" in s or "Stamp feedback" in s:
    raise SystemExit("removed v2 stamp feedback reappeared after merge")
script.write_text(s.rstrip() + "\n", encoding="utf-8")

# Prototype gateway: absorb the useful #179 bfcache/return fix into #180's newer runtime.
neb = root / "docs/v3-constellation-prototypes/nebula.js"
n = neb.read_text(encoding="utf-8")
needle = """    let entering = false;\n    gate.addEventListener('click', () => {\n"""
replacement = """    let entering = false;\n    function resetGate() {\n      entering = false;\n      gate.disabled = false;\n      field.classList.remove('is-opening');\n      veil.classList.remove('open');\n      burstCanvas.classList.remove('is-active');\n      cancelAnimationFrame(burstFrame);\n    }\n    window.addEventListener('pageshow', (event) => {\n      if (event.persisted) resetGate();\n    });\n    document.addEventListener('visibilitychange', () => {\n      if (document.visibilityState === 'visible' && gate.disabled) resetGate();\n    });\n    gate.addEventListener('click', () => {\n"""
if needle not in n:
    raise SystemExit("prototype gateway insertion point missing")
n = n.replace(needle, replacement, 1)
neb.write_text(n.rstrip() + "\n", encoding="utf-8")

# Home performance + accessibility: external decorative fonts/icons may load after
# first paint, while system fallbacks render the LCP text immediately.
index = root / "index.html"
i = index.read_text(encoding="utf-8")
i = i.replace("family=Space+Mono:wght@400;700&display=swap", "family=Space+Mono:wght@400;700&display=optional", 1)
old = '''      rel="stylesheet"\n    />\n\n    <!-- Font Awesome — 아이콘 라이브러리 (fas, fab 클래스) -->\n    <link\n      rel="stylesheet"\n      href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"\n    />'''
new = '''      rel="stylesheet"\n      media="print"\n      onload="this.media='all'"\n    />\n    <noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;600;700&family=Noto+Sans+KR:wght@300;400;500;700;900&family=Space+Mono:wght@400;700&display=optional" /></noscript>\n\n    <!-- Font Awesome — 아이콘 라이브러리 (첫 페인트를 막지 않게 비동기 적용) -->\n    <link\n      rel="stylesheet"\n      href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"\n      media="print"\n      onload="this.media='all'"\n    />\n    <noscript><link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" /></noscript>'''
if old not in i:
    raise SystemExit("external stylesheet block missing")
i = i.replace(old, new, 1)
# Main landmark without changing the existing section semantics/classes.
i = i.replace("    <!-- HERO -->\n    <section id=\"home\"", "    <main id=\"main-content\">\n    <!-- HERO -->\n    <section id=\"home\"", 1)
footer_marker = "    <!-- ============================================================\n         푸터 —"
if footer_marker not in i:
    raise SystemExit("footer marker missing")
i = i.replace(footer_marker, "    </main>\n\n" + footer_marker, 1)
i = i.replace('id="langToggle" class="nav-util-btn" title="English" aria-label="언어 전환"', 'id="langToggle" class="nav-util-btn" title="English" aria-label="EN · English"', 1)
index.write_text(i.rstrip() + "\n", encoding="utf-8")

# Rendering stability plus a dedicated tablet Gateway landing zone.
style = root / "style.css"
c = style.read_text(encoding="utf-8")
old = ".hero-glow {\n  position: absolute;\n  width: 480px;\n  height: 480px;\n  top: 18%;"
new = ".hero-glow {\n  position: absolute;\n  width: 480px;\n  height: 480px;\n  top: clamp(120px, 18vh, 180px);"
if old not in c:
    raise SystemExit("hero glow rule missing")
c = c.replace(old, new, 1)
needle = """@media (max-width: 1024px) {\n  .v3-gateway-slot { --v3-gate-x: 65%; --v3-gate-y: 80%; --v3-gate-size: clamp(260px, 40vw, 380px); }\n}"""
replacement = """@media (max-width: 1024px) {\n  .hero.hero--has-v3-gateway { padding-bottom: 280px; }\n  .v3-gateway-slot { --v3-gate-x: 65%; --v3-gate-y: 84%; --v3-gate-size: clamp(250px, 38vw, 360px); }\n}"""
if needle not in c:
    raise SystemExit("gateway tablet media rule missing")
c = c.replace(needle, replacement, 1)
# Existing narrower rules intentionally override the tablet padding.
style.write_text(c.rstrip() + "\n", encoding="utf-8")

# Defensive assertions for the combined snapshot.
assert "function resetV3Gateway()" in script.read_text(encoding="utf-8")
assert "ResizeObserver(placeGateway)" in script.read_text(encoding="utf-8")
assert "function resetGate()" in neb.read_text(encoding="utf-8")
assert "stamp-pop" not in style.read_text(encoding="utf-8")
assert '<main id="main-content">' in index.read_text(encoding="utf-8")
assert 'media="print"' in index.read_text(encoding="utf-8")
print("release candidate integration/performance/gateway patches applied")
