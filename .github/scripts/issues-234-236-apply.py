from pathlib import Path
import json
import re

# #235 — CLAUDE.md에도 AGENTS.md의 자동 체크인 금지 규칙을 명시한다.
claude = Path('CLAUDE.md')
text = claude.read_text(encoding='utf-8')
needle = '- Draft PR까지만 만들고 자동 병합하지 않습니다.\n'
addition = '- 사용자가 명시적으로 요청하지 않은 자동 체크인, 주기적 상태 확인, PR 재검증을 예약하거나 반복 실행하지 않습니다.\n'
if addition not in text:
    if needle not in text:
        raise SystemExit('CLAUDE.md insertion point not found')
    text = text.replace(needle, needle + addition, 1)
    claude.write_text(text, encoding='utf-8')

# #234 — KGA 카드에 Discord 배포 준비 중 액션을 데이터로 추가한다.
projects = Path('projects.json')
data = json.loads(projects.read_text(encoding='utf-8'))
target = None
for group in data['groups']:
    for card in group.get('cards', []):
        if card.get('detail') == 'projects/koreatechGongjiAgent/':
            target = card
            break
    if target:
        break
if not target:
    raise SystemExit('KGA card not found')
notice = {
    'action': 'notice',
    'title': 'Discord · 배포 준비 중',
    'icon': 'fab fa-discord',
    'message': {
        'en': 'Deployment in preparation',
        'ko': '배포 준비 중',
    },
}
links = target.setdefault('links', [])
links = [link for link in links if not (link.get('action') == 'notice' and link.get('icon') == 'fab fa-discord')]
links.append(notice)
target['links'] = links
projects.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

# #234 — build.js가 외부 링크뿐 아니라 안내 버튼도 생성하도록 한다.
build = Path('build.js')
text = build.read_text(encoding='utf-8')
old = '''  for (const link of card.links || []) {
    lines.push(
      `                  <a href="${link.href}" target="_blank" rel="noopener noreferrer" class="plink plink-github" title="${esc(
        link.title
      )}"><i class="${link.icon}"></i></a>`
    );
  }
'''
new = '''  for (const link of card.links || []) {
    if (link.action === "notice") {
      const messageKo = link.message?.ko || "준비 중";
      const messageEn = link.message?.en || "Coming soon";
      lines.push(
        `                  <button type="button" class="plink plink-github plink-notice" title="${esc(
          link.title
        )}" aria-label="${esc(link.title)}: ${esc(messageKo)}" data-notice-ko="${esc(
          messageKo
        )}" data-notice-en="${esc(messageEn)}"><i class="${link.icon}"></i></button>`
      );
      continue;
    }
    lines.push(
      `                  <a href="${link.href}" target="_blank" rel="noopener noreferrer" class="plink plink-github" title="${esc(
        link.title
      )}"><i class="${link.icon}"></i></a>`
    );
  }
'''
if new not in text:
    if old not in text:
        raise SystemExit('build.js link loop not found')
    text = text.replace(old, new, 1)
    build.write_text(text, encoding='utf-8')

# #234 — 안내 버튼 클릭 시 카드 이동 없이 접근 가능한 토스트를 보여준다.
script = Path('script.js')
text = script.read_text(encoding='utf-8')
marker = '''(function initCardLinks() {
  document.querySelectorAll('[data-card-href]').forEach((card) => {
    card.addEventListener('click', (event) => {
      if (event.target.closest('a, button')) return;
      if (window.getSelection()?.toString().trim()) return;
      window.location.href = card.dataset.cardHref;
    });
  });
})();
'''
addition_js = '''

/* ------------------------------------------------------------- */
/* 18-1. Project link notices                                    */
/* ------------------------------------------------------------- */
(function initProjectLinkNotices() {
  const buttons = document.querySelectorAll('.plink-notice');
  if (!buttons.length) return;
  let toast = null;
  let hideTimer = null;

  function showNotice(message) {
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'site-toast';
      toast.setAttribute('role', 'status');
      toast.setAttribute('aria-live', 'polite');
      document.body.appendChild(toast);
    }
    clearTimeout(hideTimer);
    toast.textContent = message;
    toast.classList.add('show');
    hideTimer = setTimeout(() => toast.classList.remove('show'), 1800);
  }

  buttons.forEach((button) => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const lang = localStorage.getItem('lang') || 'ko';
      const message = lang === 'en' ? button.dataset.noticeEn : button.dataset.noticeKo;
      showNotice(message || (lang === 'en' ? 'Coming soon' : '준비 중'));
    });
  });
})();
'''
if 'function initProjectLinkNotices()' not in text:
    if marker not in text:
        raise SystemExit('script.js card-link block not found')
    text = text.replace(marker, marker + addition_js, 1)
    script.write_text(text, encoding='utf-8')

# #234/#236 — 문자형 임시 기술 배지는 제거하고, 공지 토스트 스타일을 추가한다.
style = Path('style.css')
text = style.read_text(encoding='utf-8')
text = re.sub(r'\n?\.skill-glyph \{[^\n]*\}\n?', '\n', text, count=1)
addition_css = '''

/* Project link notice toast (#234) */
.site-toast {
  position: fixed;
  left: 50%;
  bottom: 28px;
  z-index: 2100;
  max-width: min(360px, calc(100vw - 32px));
  padding: 10px 16px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--ink);
  color: var(--card);
  box-shadow: var(--shadow-lift);
  font-family: var(--font-mono);
  font-size: var(--fs-sm);
  text-align: center;
  opacity: 0;
  pointer-events: none;
  transform: translate(-50%, 10px);
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.site-toast.show {
  opacity: 1;
  transform: translate(-50%, 0);
}
@media (prefers-reduced-motion: reduce) {
  .site-toast { transition: none; }
}
'''
if 'Project link notice toast (#234)' not in text:
    text = text.rstrip() + addition_css + '\n'
style.write_text(text, encoding='utf-8')
