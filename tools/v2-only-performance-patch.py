from pathlib import Path

root = Path(__file__).resolve().parents[1].parent / "final"

# Root home: keep content identical, but make decorative external CSS non-blocking.
index = root / "index.html"
i = index.read_text(encoding="utf-8")
i = i.replace("family=Space+Mono:wght@400;700&display=swap", "family=Space+Mono:wght@400;700&display=optional", 1)
old = '''      rel="stylesheet"\n    />\n\n    <!-- Font Awesome — 아이콘 라이브러리 (fas, fab 클래스) -->\n    <link\n      rel="stylesheet"\n      href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"\n    />'''
new = '''      rel="stylesheet"\n      media="print"\n      onload="this.media='all'"\n    />\n    <noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;600;700&family=Noto+Sans+KR:wght@300;400;500;700;900&family=Space+Mono:wght@400;700&display=optional" /></noscript>\n\n    <!-- Font Awesome — 아이콘 라이브러리 (첫 페인트를 막지 않게 비동기 적용) -->\n    <link\n      rel="stylesheet"\n      href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"\n      media="print"\n      onload="this.media='all'"\n    />\n    <noscript><link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" /></noscript>'''
if old not in i:
    raise SystemExit("root external stylesheet block missing")
i = i.replace(old, new, 1)

# Add the missing main landmark without changing section content or order.
if '<main id="main-content">' not in i:
    i = i.replace('    <!-- HERO -->\n    <section id="home"', '    <main id="main-content">\n    <!-- HERO -->\n    <section id="home"', 1)
    footer_marker = '    <!-- ============================================================\n         푸터 —'
    if footer_marker not in i:
        raise SystemExit("footer marker missing")
    i = i.replace(footer_marker, '    </main>\n\n' + footer_marker, 1)

i = i.replace('id="langToggle" class="nav-util-btn" title="English" aria-label="언어 전환"',
              'id="langToggle" class="nav-util-btn" title="English" aria-label="EN · English"', 1)
index.write_text(i.rstrip() + "\n", encoding="utf-8")

# Keep the visible KO/EN label inside the accessible name after toggling.
script = root / "script.js"
s = script.read_text(encoding="utf-8")
needle = "    desktop.title = lang === 'ko' ? 'English' : '한국어';\n"
replacement = "    desktop.title = lang === 'ko' ? 'English' : '한국어';\n    desktop.setAttribute('aria-label', lang === 'ko' ? 'EN · English' : 'KO · 한국어');\n    if (mobile) mobile.setAttribute('aria-label', lang === 'ko' ? 'English · 언어 전환' : '한국어 · Switch language');\n"
if needle not in s:
    raise SystemExit("language toggle insertion point missing")
s = s.replace(needle, replacement, 1)
script.write_text(s.rstrip() + "\n", encoding="utf-8")

# Avoid a large viewport-dependent shift of the decorative hero glow.
style = root / "style.css"
c = style.read_text(encoding="utf-8")
old = ".hero-glow {\n  position: absolute;\n  width: 480px;\n  height: 480px;\n  top: 18%;"
new = ".hero-glow {\n  position: absolute;\n  width: 480px;\n  height: 480px;\n  top: clamp(120px, 18vh, 180px);"
if old not in c:
    raise SystemExit("hero glow rule missing")
c = c.replace(old, new, 1)
style.write_text(c.rstrip() + "\n", encoding="utf-8")

# Scope guards: this patch must remain strictly v2-only.
assert '<main id="main-content">' in index.read_text(encoding="utf-8")
assert 'media="print"' in index.read_text(encoding="utf-8")
assert 'EN · English' in script.read_text(encoding="utf-8")
assert 'v3-gateway' not in script.read_text(encoding="utf-8")
assert 'nebula-gateway' not in index.read_text(encoding="utf-8")
print("v2-only performance/accessibility patch applied")
