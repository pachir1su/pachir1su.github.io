from pathlib import Path
import re

root = Path(__file__).resolve().parents[1].parent / "target"

script = root / "script.js"
text = script.read_text(encoding="utf-8")
start = text.find("/* 6. Stamp feedback")
if start != -1:
    divider = text.rfind("/* ------------------------------------------------------------- */", 0, start)
    next_section = text.find("/* 7. Hero stat counter", start)
    if divider != -1 and next_section != -1:
        next_divider = text.rfind("/* ------------------------------------------------------------- */", start, next_section)
        cut_end = next_divider if next_divider != -1 else next_section
        text = text[:divider] + text[cut_end:]
text = text.replace("/* 7. Hero stat counter", "/* 6. Hero stat counter")
script.write_text(text, encoding="utf-8")

style = root / "style.css"
css = style.read_text(encoding="utf-8")
css = css.replace("19. 인터랙션 팩 — 잉크 트레일 / 도장 / 드래그 / 단축키 힌트", "19. 인터랙션 팩 — 잉크 트레일 / 드래그 / 단축키 힌트")
css = css.replace("/* 도장 클릭 효과 */\n", "")

def remove_block(source: str, marker: str) -> str:
    while True:
        pos = source.find(marker)
        if pos < 0:
            return source
        line_start = source.rfind("\n", 0, pos) + 1
        brace = source.find("{", pos)
        if brace < 0:
            return source
        depth = 0
        end = brace
        for i in range(brace, len(source)):
            ch = source[i]
            if ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0:
                    end = i + 1
                    break
        source = source[:line_start] + source[end:].lstrip("\n")

css = remove_block(css, ".stamp-pop")
css = remove_block(css, "@keyframes stamp-pop")
style.write_text(css.rstrip() + "\n", encoding="utf-8")

assert "Stamp feedback" not in script.read_text(encoding="utf-8")
assert "stamp-pop" not in script.read_text(encoding="utf-8")
assert "stamp-pop" not in style.read_text(encoding="utf-8")
print("removed v2 stamp feedback")
