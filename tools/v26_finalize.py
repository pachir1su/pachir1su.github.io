from pathlib import Path
import re


INDEX = Path("index.html")
STYLE = Path("style.css")
SCRIPT = Path("script.js")


def replace_once(value: str, old: str, new: str, label: str) -> str:
    count = value.count(old)
    assert count == 1, f"{label}: expected 1 match, got {count}"
    return value.replace(old, new, 1)


def sub_once(value: str, pattern: str, repl: str, label: str, flags: int = 0) -> str:
    result, count = re.subn(pattern, repl, value, count=1, flags=flags)
    assert count == 1, f"{label}: expected 1 match, got {count}"
    return result


def generated_block(value: str) -> str:
    start = value.index("<!-- BUILD:PROJECTS:START")
    end = value.index("<!-- BUILD:PROJECTS:END", start)
    end = value.index("-->", end) + 3
    return value[start:end]


def finalize_index() -> None:
    text = INDEX.read_text(encoding="utf-8")
    before_generated = generated_block(text)

    text = replace_once(
        text,
        '        "alumniOf": {\n          "@type": "CollegeOrUniversity",\n          "name": "한국기술교육대학교"\n        }',
        '        "affiliation": {\n          "@type": "CollegeOrUniversity",\n          "name": "한국기술교육대학교"\n        }',
        "JSON-LD affiliation",
    )

    text = replace_once(
        text,
        '          <li><a href="#home">홈</a></li>\n',
        "",
        "desktop Home nav",
    )
    for href, ko, en in [
        ("projects", "프로젝트", "Projects"),
        ("skills", "역량", "Skills"),
        ("awards", "수상", "Awards"),
        ("about", "비전", "Vision"),
    ]:
        text = replace_once(
            text,
            f'<li><a href="#{href}">{ko}</a></li>',
            f'<li><a href="#{href}" data-ko="{ko}" data-en="{en}">{ko}</a></li>',
            f"desktop {href} nav i18n",
        )

    text = replace_once(
        text,
        '      <a href="#home" onclick="closeMobile()"><i class="fas fa-home"></i> 홈</a>\n',
        "",
        "mobile Home nav",
    )
    for href, icon, ko, en in [
        ("projects", "fa-folder-open", "프로젝트", "Projects"),
        ("skills", "fa-code", "역량", "Skills"),
        ("awards", "fa-trophy", "수상", "Awards"),
        ("about", "fa-user", "비전", "Vision"),
    ]:
        old = (
            f'      <a href="#{href}" onclick="closeMobile()">'
            f'<i class="fas {icon}"></i> {ko}</a>'
        )
        new = (
            f'      <a href="#{href}" data-ko="{ko}" data-en="{en}">'
            f'<i class="fas {icon}"></i> {ko}</a>'
        )
        text = replace_once(text, old, new, f"mobile {href} nav")

    text = sub_once(
        text,
        r'\n\s*<div class="floating-icons" aria-hidden="true">.*?</div>\n',
        "\n",
        "floating icons markup",
        flags=re.S,
    )

    github_button = "\n".join([
        "          <a",
        '            href="https://github.com/pachir1su"',
        '            target="_blank" rel="noopener noreferrer"',
        '            class="btn btn-ghost"',
        '            ><i class="fab fa-github"></i> GitHub</a',
        "          >",
        "",
    ])
    hero_email = "\n".join([
        "          <button",
        '            type="button"',
        '            class="btn btn-ghost contact-email hero-email"',
        '            title="클릭하면 복사됩니다"',
        "          >",
        '            <i class="fas fa-envelope"></i>',
        '            <span class="email-addr">capybara@koreatech.ac.kr</span>',
        '            <span class="copy-hint sr-only" data-ko="복사" data-en="Copy">복사</span>',
        "          </button>",
        "",
    ])
    text = replace_once(text, github_button, github_button + hero_email, "hero email")

    text = replace_once(
        text,
        '<div class="about-edu" aria-label="학력: 한국기술교육대학교 26학번 재학">',
        '<div class="about-edu" aria-label="한국기술교육대학교 26학번">',
        "education aria",
    )
    text = replace_once(
        text,
        '              <span class="edu-school">한국기술교육대학교</span>\n'
        '              <span class="edu-sub">KOREATECH · 26학번 재학 중</span>',
        '              <span class="edu-school" '
        'data-ko="한국기술교육대학교 26학번" '
        'data-en="KOREATECH · Class of 2026">'
        "한국기술교육대학교 26학번</span>",
        "education copy",
    )

    text = sub_once(
        text,
        r'\n\s*<!-- MBTI .*?-->\n\s*<p class="about-note" id="mbti-section".*?</p>\n',
        "\n",
        "MBTI markup",
        flags=re.S,
    )
    text = sub_once(
        text,
        r"\n\s*<!-- 섹션 네비게이터 .*?</nav>\n",
        "\n",
        "section navigator markup",
        flags=re.S,
    )
    text = replace_once(
        text,
        '<span class="copy-hint">복사</span>',
        '<span class="copy-hint" data-ko="복사" data-en="Copy">복사</span>',
        "footer email i18n",
    )

    text = text.replace(
        "         배경: 노트 줄 + 빨간 마진선 / 부유 아이콘 5개 / 타이핑 효과\n",
        "         배경: 노트 줄 + 빨간 마진선 / 타이핑 효과\n",
        1,
    )
    text = text.replace(
        "         부유 아이콘(.fi): JS rAF로 float 및 드래그 가능 (script.js #8)\n",
        "",
        1,
    )

    assert generated_block(text) == before_generated, "BUILD:PROJECTS generated block changed"
    for stale in [
        "mbti-section",
        "floating-icons",
        "sectionNav",
        '"alumniOf"',
        "edu-sub",
    ]:
        assert stale not in text, f"stale HTML remains: {stale}"
    assert text.count('class="btn btn-ghost contact-email hero-email"') == 1
    assert text.count('data-ko="한국기술교육대학교 26학번"') == 1
    INDEX.write_text(text, encoding="utf-8")


def remove_rule(value: str, token: str, label: str) -> str:
    start = value.find(token)
    assert start >= 0, f"{label}: token not found"
    brace = value.find("{", start)
    assert brace >= 0, f"{label}: opening brace not found"
    depth = 0
    i = brace
    while i < len(value):
        if value[i] == "{":
            depth += 1
        elif value[i] == "}":
            depth -= 1
            if depth == 0:
                end = i + 1
                while end < len(value) and value[end] in "\r\n":
                    end += 1
                return value[:start] + value[end:]
        i += 1
    raise AssertionError(f"{label}: closing brace not found")


def remove_section(value: str, start_marker: str, end_marker: str, label: str) -> str:
    start = value.find(start_marker)
    assert start >= 0, f"{label}: start not found"
    end = value.find(end_marker, start)
    assert end >= 0, f"{label}: end not found"
    return value[:start] + value[end:]


def finalize_style() -> None:
    text = STYLE.read_text(encoding="utf-8")

    for token, label in [
        (".floating-icons {", "floating-icons"),
        (".fi {", "base fi"),
        (".fi-1 {", "fi-1"),
        (".fi-2 {", "fi-2"),
        (".fi-3 {", "fi-3"),
        (".fi-4 {", "fi-4"),
        (".fi-5 {", "fi-5"),
        ("@keyframes floatUp {", "floatUp"),
        (".about-edu .edu-sub {", "edu-sub"),
        (".about-note {", "about-note"),
    ]:
        text = remove_rule(text, token, label)

    text = remove_section(
        text,
        "/* ==========================================================================\n"
        "   20. 스티커 (.fi) — 드래그 상태",
        "/* ==========================================================================\n"
        "   21. 형광펜 sweep",
        "draggable fi section",
    )
    text = remove_section(
        text,
        "/* ==========================================================================\n"
        "   28. 🐔 치킨 모드 이스터에그",
        "/* ==========================================================================\n"
        "   51. 진행 중 프로젝트 상태 라벨",
        "chicken mode section",
    )

    nav_start = text.find(
        "/* ==========================================================================\n"
        "   56. 섹션 네비게이터"
    )
    assert nav_start >= 0, "section navigator CSS start not found"
    text = text[:nav_start].rstrip() + "\n"

    text = replace_once(
        text,
        "  .fi {\n    animation: none !important;\n  }\n",
        "",
        "reduced-motion fi",
    )
    text = replace_once(
        text,
        "  .fi-1, .fi-5 {\n"
        "    left: 3%;\n"
        "  }\n"
        "  .fi-2, .fi-4 {\n"
        "    right: 6%;\n"
        "  }\n",
        "",
        "tablet fi",
    )
    text = replace_once(
        text,
        ".fi,\n.progress-bar,\n#btn-back-to-top {\n",
        ".progress-bar,\n#btn-back-to-top {\n",
        "GPU fi hint",
    )

    responsive = """
/* ========================================================================== 
   56. v2.6 contact + adaptive finish (#114, #123, #16)
   ========================================================================== */
.hero-email { max-width: 100%; }
.hero-email .email-addr { overflow-wrap: anywhere; }
.sr-only {
  position: absolute !important;
  width: 1px !important;
  height: 1px !important;
  padding: 0 !important;
  margin: -1px !important;
  overflow: hidden !important;
  clip: rect(0, 0, 0, 0) !important;
  white-space: nowrap !important;
  border: 0 !important;
}
@media (max-width: 1024px) {
  .container {
    padding-left: clamp(16px, 4vw, 24px);
    padding-right: clamp(16px, 4vw, 24px);
  }
  .hero-main,
  .hero-stats { min-width: 0; }
}
@media (max-width: 640px) {
  .hero-btns > * {
    width: 100%;
    justify-content: center;
  }
  .hero-email { font-size: 0.78rem; }
}
"""
    text = text.rstrip() + "\n\n" + responsive.lstrip()

    for label, pattern in {
        "floating icons": r"\.floating-icons\b",
        "fi selectors": r"\.fi(?:\b|-)",
        "floatUp": r"floatUp",
        "MBTI note": r"\.about-note\b",
        "chicken": r"chicken-|egg-toast|egg-rollback",
        "section navigator": r"\.section-nav\b|\.section-nav-item\b|nav-bookmark-",
        "edu sub": r"\.edu-sub\b",
    }.items():
        assert not re.search(pattern, text), f"stale CSS remains: {label}"

    STYLE.write_text(text, encoding="utf-8")


def finalize_script() -> None:
    text = SCRIPT.read_text(encoding="utf-8")

    start_marker = (
        "/* ------------------------------------------------------------- */\n"
        "/* 1. v2.6 DOM normalization"
    )
    end_marker = (
        "/* ------------------------------------------------------------- */\n"
        "/* 2. AOS"
    )
    start = text.find(start_marker)
    end = text.find(end_marker, start)
    assert start >= 0 and end > start, "runtime normalizer markers not found"
    text = text[:start] + text[end:]

    def renumber(match: re.Match[str]) -> str:
        number = int(match.group(1))
        return f"/* {number - 1}." if 2 <= number <= 18 else match.group(0)

    text = re.sub(r"/\* (\d+)\.", renumber, text)

    for stale in [
        "normalizeV26Markup",
        "v26-runtime-layout",
        "mbti-section",
        "floating-icons",
        "sectionNav",
        "alumniOf",
    ]:
        assert stale not in text, f"stale JS remains: {stale}"

    SCRIPT.write_text(text, encoding="utf-8")


def main() -> None:
    finalize_index()
    finalize_style()
    finalize_script()
    print("v2.6.0 source finalization prepared successfully")


if __name__ == "__main__":
    main()
