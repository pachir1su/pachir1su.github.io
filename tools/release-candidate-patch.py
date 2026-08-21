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

# Defensive assertions for the combined snapshot.
assert "function resetV3Gateway()" in script.read_text(encoding="utf-8")
assert "function resetGate()" in neb.read_text(encoding="utf-8")
assert "stamp-pop" not in (root / "style.css").read_text(encoding="utf-8")
print("release candidate integration patches applied")
