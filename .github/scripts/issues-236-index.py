from pathlib import Path

path = Path('index.html')
text = path.read_text(encoding='utf-8')

devicon = '''    <!-- Devicon — 역량 기술 로고 (#236) -->
    <link
      rel="stylesheet"
      type="text/css"
      href="https://cdn.jsdelivr.net/gh/devicons/devicon@2.16.0/devicon.min.css"
    />

'''
anchor = '''    <noscript><link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" /></noscript>

'''
if 'devicons/devicon@2.16.0/devicon.min.css' not in text:
    if anchor not in text:
        raise SystemExit('Font Awesome anchor not found')
    text = text.replace(anchor, anchor + devicon, 1)

replacements = {
    '<span class="skill-glyph" aria-hidden="true">Py</span>': '<i class="devicon-python-plain colored" aria-hidden="true"></i>',
    '<span class="skill-glyph" aria-hidden="true">C</span>': '<i class="devicon-c-plain colored" aria-hidden="true"></i>',
    '<span class="skill-glyph" aria-hidden="true">Jv</span>': '<i class="devicon-java-plain colored" aria-hidden="true"></i>',
    '<span class="skill-glyph" aria-hidden="true">JS</span>': '<i class="devicon-javascript-plain colored" aria-hidden="true"></i>',
    '<span class="skill-glyph" aria-hidden="true">Pr</span>': '<i class="devicon-processing-plain colored" aria-hidden="true"></i>',
    '<span class="skill-glyph" aria-hidden="true">ML</span>': '<i class="devicon-scikitlearn-plain colored" aria-hidden="true"></i>',
    '<span class="skill-glyph" aria-hidden="true">Re</span>': '<i class="devicon-react-original colored" aria-hidden="true"></i>',
    '<span class="skill-glyph" aria-hidden="true">Fl</span>': '<i class="devicon-flask-original colored" aria-hidden="true"></i>',
    '<span class="skill-glyph" aria-hidden="true">DB</span>': '<i class="devicon-sqlite-plain colored" aria-hidden="true"></i>',
    '<span class="skill-glyph" aria-hidden="true">Ft</span>': '<i class="devicon-flutter-plain colored" aria-hidden="true"></i>',
    '<span class="skill-glyph" aria-hidden="true">Fg</span>': '<i class="devicon-figma-plain colored" aria-hidden="true"></i>',
    '<span class="skill-glyph" aria-hidden="true">Ar</span>': '<i class="devicon-arduino-plain colored" aria-hidden="true"></i>',
    '<span class="skill-glyph" aria-hidden="true">Nt</span>': '<i class="devicon-notion-plain colored" aria-hidden="true"></i>',
}
for old, new in replacements.items():
    if old not in text and new not in text:
        raise SystemExit(f'skill icon placeholder not found: {old}')
    text = text.replace(old, new)

if 'skill-glyph' in text:
    raise SystemExit('skill-glyph placeholders remain in index.html')

path.write_text(text, encoding='utf-8')
