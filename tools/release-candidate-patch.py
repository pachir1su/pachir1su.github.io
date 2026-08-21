from pathlib import Path

root = Path(__file__).resolve().parents[1].parent / "final"

# Root v2 home gateway: returning via browser history/bfcache must restore the gateway.
script = root / "script.js"
s = script.read_text(encoding="utf-8")
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

# Percent positioning tied the decorative glow to a changing hero height and produced
# nearly all mobile CLS. Pin it to the viewport instead of content height.
style = root / "style.css"
c = style.read_text(encoding="utf-8")
old = ".hero-glow {\n  position: absolute;\n  width: 480px;\n  height: 480px;\n  top: 18%;"
new = ".hero-glow {\n  position: absolute;\n  width: 480px;\n  height: 480px;\n  top: clamp(120px, 18vh, 180px);"
if old not in c:
    raise SystemExit("hero glow rule missing")
c = c.replace(old, new, 1)
style.write_text(c.rstrip() + "\n", encoding="utf-8")

# Defensive assertions for the combined snapshot.
assert "function resetV3Gateway()" in script.read_text(encoding="utf-8")
assert "function resetGate()" in neb.read_text(encoding="utf-8")
assert "stamp-pop" not in style.read_text(encoding="utf-8")
assert '<main id="main-content">' in index.read_text(encoding="utf-8")
assert 'media="print"' in index.read_text(encoding="utf-8")
print("release candidate integration/performance patches applied")
