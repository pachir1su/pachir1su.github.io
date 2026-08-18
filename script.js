/* =============================================================
   pachir1su.github.io — 노트/인덱스 카드 인터랙션

   v2.6.0 정리 원칙
   - 정보 탐색에 필요한 인터랙션만 유지
   - 홈의 부유/드래그 프로그래밍 언어 장식 제거 (#119)
   - 치킨 모드 제거 (#119)
   - 위치(nth-child)에 기대는 내비게이션 번역 제거 (#122)
   - prefers-reduced-motion 및 포인터 능력 존중
   ============================================================= */

const finePointerQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
const hasFinePointer = () => finePointerQuery.matches;
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function onMediaChange(query, handler) {
  if (typeof query.addEventListener === 'function') query.addEventListener('change', handler);
  else if (typeof query.addListener === 'function') query.addListener(handler);
}

/* ------------------------------------------------------------- */
/* 1. AOS                                                        */
/* ------------------------------------------------------------- */
if (typeof AOS !== 'undefined') {
  AOS.init({ once: true, duration: 400, easing: 'ease-out-cubic' });
}

/* ------------------------------------------------------------- */
/* 2. Back-to-top                                                */
/* ------------------------------------------------------------- */
const backBtn = document.getElementById('btn-back-to-top');
const myBar = document.getElementById('myBar');

if (backBtn) {
  backBtn.style.alignItems = 'center';
  backBtn.style.justifyContent = 'center';
  backBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
  });
}

/* ------------------------------------------------------------- */
/* 3. 타이핑 효과                                                */
/* ------------------------------------------------------------- */
(function initTyping() {
  const defaultWords = ['메이커', '엔지니어', '팀 리더'];
  let wordIndex = 0;
  let charIndex = 0;
  let isDeleting = false;
  let timerId = null;

  function type() {
    const el = document.getElementById('typing-text');
    if (!el) {
      timerId = setTimeout(type, 250);
      return;
    }

    const words = window._typingWords || defaultWords;
    const currentWord = words[wordIndex % words.length];

    if (prefersReducedMotion) {
      el.textContent = currentWord;
      return;
    }

    el.textContent = isDeleting
      ? currentWord.substring(0, Math.max(0, charIndex - 1))
      : currentWord.substring(0, charIndex + 1);

    isDeleting ? charIndex-- : charIndex++;
    let typeSpeed = isDeleting ? 50 : 100;

    if (!isDeleting && charIndex === currentWord.length) {
      isDeleting = true;
      typeSpeed = 2000;
    } else if (isDeleting && charIndex === 0) {
      isDeleting = false;
      wordIndex = (wordIndex + 1) % words.length;
      typeSpeed = 500;
    }

    timerId = setTimeout(type, typeSpeed);
  }

  window._restartTyping = function () {
    clearTimeout(timerId);
    wordIndex = 0;
    charIndex = 0;
    isDeleting = false;
    const el = document.getElementById('typing-text');
    if (el) el.textContent = '';
    type();
  };

  type();
})();

/* ------------------------------------------------------------- */
/* 4. 모바일 메뉴                                                */
/* ------------------------------------------------------------- */
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');
const sidebarOverlay = document.getElementById('sidebarOverlay');

function closeMobile() {
  if (mobileMenu) mobileMenu.classList.remove('open');
  if (hamburger) {
    hamburger.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
  }
  if (sidebarOverlay) sidebarOverlay.classList.remove('active');
  document.body.style.overflow = '';
}

if (hamburger && mobileMenu) {
  hamburger.addEventListener('click', () => {
    const open = mobileMenu.classList.toggle('open');
    hamburger.classList.toggle('open', open);
    hamburger.setAttribute('aria-expanded', String(open));
    if (sidebarOverlay) sidebarOverlay.classList.toggle('active', open);
    document.body.style.overflow = open ? 'hidden' : '';
  });
}

if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeMobile);

/* ------------------------------------------------------------- */
/* 5. 도장 클릭 효과                                             */
/* ------------------------------------------------------------- */
(function initStampClick() {
  if (prefersReducedMotion) return;
  const stampWords = ['확인', 'OK', '!!', '@@', 'GOOD', '체크'];
  const targets = '.btn, .plink, .chip, .wip-badge, .stat-item, .nav-github, #btn-back-to-top';

  document.querySelectorAll(targets).forEach((el) => {
    el.addEventListener('click', (e) => {
      const stamp = document.createElement('div');
      stamp.className = 'stamp-pop';
      stamp.textContent = stampWords[Math.floor(Math.random() * stampWords.length)];
      stamp.style.setProperty('--stamp-rot', (-8 + Math.random() * 16) + 'deg');
      stamp.style.left = e.clientX + 'px';
      stamp.style.top = e.clientY + 'px';
      document.body.appendChild(stamp);
      setTimeout(() => stamp.remove(), 500);
    });
  });
})();

/* ------------------------------------------------------------- */
/* 6. 히어로 통계 카운트업                                      */
/* ------------------------------------------------------------- */
(function initStatCounter() {
  const stats = document.querySelectorAll('.stat-num');
  if (!stats.length) return;

  const statLang = localStorage.getItem('lang') || 'ko';
  stats.forEach((el) => {
    const match = el.textContent.trim().match(/^(\d+)(.*)$/);
    if (!match) return;
    el.dataset.target = match[1];
    if (el.dataset.suffixKo === undefined) el.dataset.suffixKo = match[2];
    if (el.dataset.suffixEn === undefined) el.dataset.suffixEn = match[2];
    el.dataset.suffix = statLang === 'en' ? el.dataset.suffixEn : el.dataset.suffixKo;
    el.textContent = '0' + el.dataset.suffix;
  });

  if (typeof IntersectionObserver === 'undefined') {
    stats.forEach((el) => {
      if (el.dataset.target) el.textContent = el.dataset.target + (el.dataset.suffix || '');
    });
    return;
  }

  const obs = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = parseInt(el.dataset.target, 10);
      const suffix = el.dataset.suffix || '';
      if (Number.isNaN(target)) return;

      if (prefersReducedMotion) {
        el.textContent = target + suffix;
        obs.unobserve(el);
        return;
      }

      const duration = 500;
      const start = performance.now();
      function tick(t) {
        const progress = Math.min(1, (t - start) / duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.round(target * eased) + suffix;
        if (progress < 1) requestAnimationFrame(tick);
        else el.textContent = target + suffix;
      }
      requestAnimationFrame(tick);
      obs.unobserve(el);
    });
  }, { threshold: 0.5 });

  stats.forEach((el) => obs.observe(el));
})();

/* ------------------------------------------------------------- */
/* 7. 통합 스크롤 핸들러                                         */
/* ------------------------------------------------------------- */
(function initScroll() {
  let ticking = false;

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const winScroll = document.documentElement.scrollTop || document.body.scrollTop;
      const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const ratio = height > 0 ? winScroll / height : 0;

      if (myBar) myBar.style.transform = 'scaleX(' + ratio.toFixed(4) + ')';
      if (backBtn) backBtn.classList.toggle('visible', winScroll > 300);
      document.documentElement.style.setProperty('--scroll-progress', ratio.toFixed(3));
      ticking = false;
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

/* ------------------------------------------------------------- */
/* 8. 카드 그림자 포인터 추적                                    */
/* ------------------------------------------------------------- */
(function initShadowFollow() {
  if (prefersReducedMotion) return;
  const cards = Array.from(
    document.querySelectorAll('.skill-card, .project-card, .award-card, .about-card')
  );
  if (!cards.length) return;

  let activeCard = null;
  let activeRect = null;
  let pointerX = 0;
  let pointerY = 0;
  let frame = null;

  function flush() {
    frame = null;
    if (!activeCard || !activeRect) return;
    const x = (pointerX - activeRect.left) / activeRect.width - 0.5;
    const y = (pointerY - activeRect.top) / activeRect.height - 0.5;
    activeCard.style.setProperty('--shadow-x', (-x * 7) + 'px');
    activeCard.style.setProperty('--shadow-y', (-y * 7 + 4) + 'px');
  }

  function activate(card) {
    activeCard = card;
    activeRect = card.getBoundingClientRect();
  }

  function onEnter(e) {
    activate(e.currentTarget);
  }

  function onMove(e) {
    if (e.currentTarget !== activeCard) activate(e.currentTarget);
    pointerX = e.clientX;
    pointerY = e.clientY;
    if (frame === null) frame = requestAnimationFrame(flush);
  }

  function onLeave(e) {
    const card = e.currentTarget;
    card.style.setProperty('--shadow-x', '0px');
    card.style.setProperty('--shadow-y', '6px');
    if (card === activeCard) {
      activeCard = null;
      activeRect = null;
    }
  }

  function invalidateRect() {
    if (activeCard) activeRect = activeCard.getBoundingClientRect();
  }

  let installed = false;
  function syncShadowFollow() {
    const enable = hasFinePointer();
    if (enable === installed) return;
    installed = enable;

    if (enable) {
      cards.forEach((card) => {
        card.addEventListener('mouseenter', onEnter);
        card.addEventListener('mousemove', onMove);
        card.addEventListener('mouseleave', onLeave);
      });
      window.addEventListener('scroll', invalidateRect, { passive: true });
      window.addEventListener('resize', invalidateRect);
    } else {
      cards.forEach((card) => {
        card.removeEventListener('mouseenter', onEnter);
        card.removeEventListener('mousemove', onMove);
        card.removeEventListener('mouseleave', onLeave);
        card.style.setProperty('--shadow-x', '0px');
        card.style.setProperty('--shadow-y', '6px');
      });
      window.removeEventListener('scroll', invalidateRect);
      window.removeEventListener('resize', invalidateRect);
      activeCard = null;
      activeRect = null;
    }
  }

  syncShadowFollow();
  onMediaChange(finePointerQuery, syncShadowFollow);
})();

/* ------------------------------------------------------------- */
/* 9. 키보드 단축키                                              */
/* ------------------------------------------------------------- */
(function initShortcuts() {
  const sections = ['#home', '#projects', '#skills', '#awards', '#about'];

  document.addEventListener('keydown', (e) => {
    if (e.target && e.target.matches('input, textarea, select, [contenteditable="true"]')) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    const key = e.key.toLowerCase();
    if (key >= '1' && key <= '5') {
      const selector = sections[parseInt(key, 10) - 1];
      const target = document.querySelector(selector);
      if (target) {
        target.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
        flashHint(selector.slice(1).toUpperCase());
      }
    } else if (key === 'escape') {
      closeMobile();
    } else if (key === 't') {
      window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
      flashHint('TOP');
    } else if (key === 'g') {
      flashHint('OPEN GITHUB');
      setTimeout(() => window.open('https://github.com/pachir1su', '_blank', 'noopener'), 200);
    }
  });

  function flashHint(text) {
    const hint = document.createElement('div');
    hint.className = 'key-hint';
    hint.textContent = text;
    document.body.appendChild(hint);
    requestAnimationFrame(() => hint.classList.add('show'));
    setTimeout(() => hint.classList.remove('show'), 400);
    setTimeout(() => hint.remove(), 650);
  }
})();

/* ------------------------------------------------------------- */
/* 10. 카드 진입 효과                                            */
/* ------------------------------------------------------------- */
(function initCardEntry() {
  if (prefersReducedMotion || typeof IntersectionObserver === 'undefined') return;
  const cards = document.querySelectorAll('.project-card, .skill-card, .award-card');
  const obs = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('taped');
      obs.unobserve(entry.target);
    });
  }, { threshold: 0.2 });
  cards.forEach((card) => obs.observe(card));
})();

/* ------------------------------------------------------------- */
/* 11. 콘솔 이스터에그                                           */
/* ------------------------------------------------------------- */
(function consoleEgg() {
  const lines = [
    '%c┌─────────────────────────────────────────────┐',
    '│  안녕, 종이 너머에서 코드를 읽는 사람.     │',
    '│  이 페이지는 노트입니다.                    │',
    '│                                             │',
    '│  단축키:                                    │',
    '│    1~5 → 섹션 점프                          │',
    '│    T   → 맨 위로                            │',
    '│    G   → GitHub                             │',
    '│    Esc → 모바일 메뉴 닫기                   │',
    '└─────────────────────────────────────────────┘',
  ];
  const style = 'color:#c63b3b; font-family:monospace; font-size:12px; line-height:1.4;';
  console.log(lines.join('\n'), style);
})();

/* ------------------------------------------------------------- */
/* 12. 프로젝트 카테고리 필터                                    */
/* ------------------------------------------------------------- */
(function initProjectFilter() {
  const buttons = document.querySelectorAll('.pfilter');
  const groups = document.querySelectorAll('.year-group');
  if (!buttons.length || !groups.length) return;

  const failedToggle = document.querySelector('.failed-toggle');
  const failedGrid = document.getElementById('failed-grid');

  function setFailedExpanded(expanded) {
    if (!failedToggle || !failedGrid) return;
    failedToggle.setAttribute('aria-expanded', String(expanded));
    failedGrid.classList.toggle('is-collapsed', !expanded);
  }

  function applyFilter(filter) {
    groups.forEach((group) => {
      let visibleCount = 0;
      group.querySelectorAll('.project-card').forEach((card) => {
        const categories = (card.dataset.category || '').split(' ');
        const isWip = card.classList.contains('project-wip');
        const isFailed = card.classList.contains('project-failed');
        const show =
          filter === 'all' ||
          (filter === 'wip' && isWip) ||
          (filter === 'failed' && isFailed) ||
          categories.includes(filter);

        card.style.display = show ? '' : 'none';
        if (show) visibleCount++;
      });
      group.style.display = visibleCount ? '' : 'none';
    });

    setFailedExpanded(filter !== 'all');
  }

  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      buttons.forEach((item) => item.classList.remove('active'));
      button.classList.add('active');
      applyFilter(button.dataset.filter || 'all');
    });
  });
})();

/* ------------------------------------------------------------- */
/* 13. 이메일 복사                                               */
/* ------------------------------------------------------------- */
(function initEmailCopy() {
  const buttons = document.querySelectorAll('.contact-email');
  if (!buttons.length) return;

  buttons.forEach((button) => {
    const addr = button.querySelector('.email-addr');
    const hint = button.querySelector('.copy-hint');
    const email = addr ? addr.textContent.trim() : 'capybara@koreatech.ac.kr';

    button.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(email);
      } catch (clipboardError) {
        try {
          const textarea = document.createElement('textarea');
          textarea.value = email;
          textarea.style.position = 'fixed';
          textarea.style.opacity = '0';
          document.body.appendChild(textarea);
          textarea.focus();
          textarea.select();
          document.execCommand('copy');
          textarea.remove();
        } catch (fallbackError) {
          return;
        }
      }

      if (hint) {
        const previous = hint.textContent;
        button.classList.add('copied');
        hint.textContent = (localStorage.getItem('lang') || 'ko') === 'en' ? 'Copied!' : '복사됨!';
        setTimeout(() => {
          button.classList.remove('copied');
          hint.textContent = previous;
        }, 1500);
      }
    });
  });
})();

/* ------------------------------------------------------------- */
/* 14. 프로젝트 수 배지                                          */
/* ------------------------------------------------------------- */
window._updateProjectCount = function () {
  const badge = document.getElementById('projectTotalCount');
  if (!badge) return;

  let done = 0;
  let wip = 0;
  document.querySelectorAll('.project-card').forEach((card) => {
    if (card.classList.contains('project-wip')) wip++;
    else if (!card.classList.contains('project-failed')) done++;
  });

  const lang = localStorage.getItem('lang') || 'ko';
  badge.textContent = lang === 'en'
    ? done + ' done · ' + wip + ' upcoming'
    : done + '개 완료 · ' + wip + '개 예정';
};
window._updateProjectCount();

/* ------------------------------------------------------------- */
/* 15. 실패 프로젝트 접기/펼치기                                 */
/* ------------------------------------------------------------- */
(function initFailedCollapse() {
  const toggle = document.querySelector('.failed-toggle');
  const grid = document.getElementById('failed-grid');
  if (!toggle || !grid) return;

  toggle.addEventListener('click', () => {
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!expanded));
    grid.classList.toggle('is-collapsed', expanded);
  });
})();

/* ------------------------------------------------------------- */
/* 16. 다크 모드                                                 */
/* ------------------------------------------------------------- */
(function initDarkMode() {
  const toggle = document.getElementById('themeToggle');
  const toggleMobile = document.getElementById('themeToggleMobile');
  const icon = document.getElementById('themeIcon');
  const iconMobile = document.getElementById('themeIconMobile');
  const labelMobile = document.querySelector('.theme-label-mobile');

  function getPreferred() {
    const saved = localStorage.getItem('theme');
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    const isDark = theme === 'dark';
    const lang = localStorage.getItem('lang') || 'ko';

    if (icon) icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
    if (iconMobile) iconMobile.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
    if (labelMobile) {
      labelMobile.textContent = isDark
        ? (lang === 'en' ? 'Light Mode' : '라이트 모드')
        : (lang === 'en' ? 'Dark Mode' : '다크 모드');
    }
    if (toggle) {
      toggle.title = isDark
        ? (lang === 'en' ? 'Light Mode' : '라이트 모드')
        : (lang === 'en' ? 'Dark Mode' : '다크 모드');
    }
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    apply(current === 'dark' ? 'light' : 'dark');
  }

  apply(getPreferred());
  if (toggle) toggle.addEventListener('click', toggleTheme);
  if (toggleMobile) toggleMobile.addEventListener('click', toggleTheme);
})();

/* ------------------------------------------------------------- */
/* 17. 영어/한국어 전환                                          */
/* ------------------------------------------------------------- */
(function initLangToggle() {
  const toggle = document.getElementById('langToggle');
  const toggleMobile = document.getElementById('langToggleMobile');
  if (!toggle) return;

  const translations = {
    en: {
      '.hero-tag': 'Hello',
      '.hero-role': { html: 'Full-Stack Developer &amp; <span class="typing-wrap"><span id="typing-text"></span><span class="typing-cursor"></span></span>' },
      '.hero-desc': { html: 'I build things that actually run — a <strong>campus notification bot</strong>, a <strong>multi-LLM desktop tool</strong>, a <strong>Raspberry Pi server</strong>.<br />Long term, I aim to be an entrepreneur pursuing innovation beyond profit.' },
      '.btn-primary': { html: '<i class="fas fa-folder-open"></i> Projects' },
      '.stat-label': ['Projects', 'Awards', 'out of 581'],
      '#about .section-title': 'Vision',
      '#skills .section-title': 'Skills',
      '#awards .section-title': 'Awards',
      '#projects .section-title': 'Projects',
      '.about-quote': '"An innovator who turns ideas into reality"',
      '.about-body': { html: '<p>Hello, I\'m <strong>Lee Geon Yeong</strong>, someone who goes beyond simple development to plan and create services that can change the world. I aspire to be an <strong>entrepreneur</strong>, not just a businessman — creating value that did not exist before through technology.</p><p>Whenever an idea strikes, I write it down and then build it, mostly across three areas: <strong>AI automation, embedded &amp; IoT, and web backends</strong>.</p>' },
      '.chip:nth-child(1)': { html: '<i class="fas fa-rocket"></i> Goal: 1M Monthly Users' },
      '.chip:nth-child(2)': { html: '<i class="fas fa-users"></i> Team Lead on 6 Projects' },
      '.github-activity-btn': { html: '<i class="fab fa-github"></i> GitHub Activity' },
      '.github-activity .subsection-label': { html: '<i class="fab fa-github"></i> GitHub Activity' },
      '.cert-block .subsection-label': { html: '<i class="fas fa-certificate"></i> Certifications' },
      '#featured-section > .subsection-label': { html: '<i class="fas fa-star"></i> Featured Projects' },
      '#all-projects-section': { html: '<i class="fas fa-folder-open"></i> All Projects <span id="projectTotalCount" class="project-count-badge"></span>' },
      '.pfilter[data-filter="all"]': 'All',
      '.pfilter[data-filter="ai"]': 'AI · ML',
      '.pfilter[data-filter="hardware"]': 'Hardware',
      '.pfilter[data-filter="discord"]': 'Discord Bot',
      '.pfilter[data-filter="web"]': 'Web',
      '.pfilter[data-filter="contest"]': 'Contest',
      '.pfilter[data-filter="wip"]': 'WIP',
      '.pfilter[data-filter="failed"]': 'Failed',
      '.year-group-wip .year-heading': 'In Progress / Planned',
      '.year-group-failed .year-heading': 'Failed Projects',
      '.footer-copy': '© 2026 Lee Geon Yeong. All rights reserved.',
      '.copy-hint': 'Copy',
      '#btn-back-to-top': { attr: { title: 'Back to top', 'aria-label': 'Back to top' } },
      '.scroll-hint span': 'Scroll',
    },
    ko: {
      '.hero-tag': '안녕하세요',
      '.hero-role': { html: '풀스택 개발자 &amp; <span class="typing-wrap"><span id="typing-text"></span><span class="typing-cursor"></span></span>' },
      '.hero-desc': { html: '<strong>공지 알림 봇</strong> · <strong>멀티 LLM 도구</strong> · <strong>라즈베리파이 서버</strong>처럼 실제로 돌아가는 것을 만듭니다.<br />길게는 이윤을 넘어 혁신을 추구하는 기업가를 목표로 합니다.' },
      '.btn-primary': { html: '<i class="fas fa-folder-open"></i> 프로젝트 보기' },
      '.stat-label': ['프로젝트', '수상 경력', '581 팀 중'],
      '#about .section-title': '비전',
      '#skills .section-title': '역량',
      '#awards .section-title': '수상',
      '#projects .section-title': '프로젝트',
      '.about-quote': '"아이디어를 현실로 만드는 혁신가"',
      '.about-body': { html: '<p>안녕하세요, 저는 단순한 개발을 넘어 세상을 바꿀 서비스를 기획하고 만드는 <strong>이건영</strong>입니다. 저는 사업가가 아닌 <strong>기업가</strong>를 지향합니다. 이윤을 쫓기보다 기술로 세상에 없던 가치를 만들고 싶습니다.</p><p>떠오르는 아이디어는 기록해 두고 직접 만들어 확인합니다. 지금까지 만든 것은 대부분 <strong>AI 자동화, 임베디드·IoT, 웹 백엔드</strong> 세 갈래에 있습니다.</p>' },
      '.chip:nth-child(1)': { html: '<i class="fas fa-rocket"></i> 목표 : 월 100만명 유저 서비스' },
      '.chip:nth-child(2)': { html: '<i class="fas fa-users"></i> 팀장으로 참여한 프로젝트 6개' },
      '.github-activity-btn': { html: '<i class="fab fa-github"></i> GitHub 활동 보러가기' },
      '.github-activity .subsection-label': { html: '<i class="fab fa-github"></i> GitHub 활동' },
      '.cert-block .subsection-label': { html: '<i class="fas fa-certificate"></i> 자격증' },
      '#featured-section > .subsection-label': { html: '<i class="fas fa-star"></i> 대표 프로젝트' },
      '#all-projects-section': { html: '<i class="fas fa-folder-open"></i> 전체 프로젝트 <span id="projectTotalCount" class="project-count-badge"></span>' },
      '.pfilter[data-filter="all"]': '전체',
      '.pfilter[data-filter="ai"]': 'AI · ML',
      '.pfilter[data-filter="hardware"]': '하드웨어',
      '.pfilter[data-filter="discord"]': 'Discord 봇',
      '.pfilter[data-filter="web"]': '웹',
      '.pfilter[data-filter="contest"]': '대회',
      '.pfilter[data-filter="wip"]': 'WIP',
      '.pfilter[data-filter="failed"]': '실패',
      '.year-group-wip .year-heading': '진행 중 · 예정',
      '.year-group-failed .year-heading': '실패한 프로젝트',
      '.footer-copy': '© 2026 Lee Geon Yeong. All rights reserved.',
      '.copy-hint': '복사',
      '#btn-back-to-top': { attr: { title: '맨 위로', 'aria-label': '맨 위로' } },
      '.scroll-hint span': '스크롤',
    },
  };

  const typingWordsEN = ['Maker', 'Engineer', 'Team Leader'];
  const typingWordsKO = ['메이커', '엔지니어', '팀 리더'];
  let currentLang = localStorage.getItem('lang') || 'ko';

  function applyMappedTranslation(map) {
    Object.entries(map).forEach(([selector, value]) => {
      if (Array.isArray(value)) {
        document.querySelectorAll(selector).forEach((el, index) => {
          if (index < value.length) el.textContent = value[index];
        });
        return;
      }

      if (typeof value === 'object') {
        const el = document.querySelector(selector);
        if (!el) return;
        if (value.html !== undefined) el.innerHTML = value.html;
        if (value.attr) {
          Object.entries(value.attr).forEach(([key, val]) => el.setAttribute(key, val));
        }
        return;
      }

      const el = document.querySelector(selector);
      if (el) el.textContent = value;
    });
  }

  function applyDataTranslations(lang) {
    document.querySelectorAll('[data-en]:not([data-ko])').forEach((el) => {
      el.setAttribute('data-ko', el.textContent.trim());
    });
    document.querySelectorAll('[data-en-html]:not([data-ko-html])').forEach((el) => {
      el.setAttribute('data-ko-html', el.innerHTML.trim());
    });

    document.querySelectorAll('[data-en][data-ko]:not(meta)').forEach((el) => {
      const text = lang === 'en' ? el.dataset.en : el.dataset.ko;
      const first = el.firstElementChild;
      if (first && first.tagName === 'I') el.innerHTML = first.outerHTML + ' ' + text;
      else el.textContent = text;
    });

    document.querySelectorAll('[data-en-html][data-ko-html]').forEach((el) => {
      el.innerHTML = lang === 'en' ? el.dataset.enHtml : el.dataset.koHtml;
    });
  }

  function applyLang(lang) {
    currentLang = lang;
    localStorage.setItem('lang', lang);
    const map = translations[lang];
    if (!map) return;

    applyMappedTranslation(map);
    applyDataTranslations(lang);

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const themeLabel = document.querySelector('.theme-label-mobile');
    const themeToggleButton = document.getElementById('themeToggle');
    if (themeLabel) {
      themeLabel.textContent = isDark
        ? (lang === 'en' ? 'Light Mode' : '라이트 모드')
        : (lang === 'en' ? 'Dark Mode' : '다크 모드');
    }
    if (themeToggleButton) {
      themeToggleButton.title = isDark
        ? (lang === 'en' ? 'Light Mode' : '라이트 모드')
        : (lang === 'en' ? 'Dark Mode' : '다크 모드');
    }

    document.querySelectorAll('.contact-email').forEach((button) => {
      button.title = lang === 'en' ? 'Click to copy' : '클릭하면 복사됩니다';
    });

    document.documentElement.setAttribute('lang', lang);

    const titlePairs = [
      ['이건영 포트폴리오', 'Lee Geon Yeong Portfolio'],
      ['이건영 | Developer', 'Lee Geon Yeong | Developer'],
    ];
    let nextTitle = document.title;
    titlePairs.forEach((pair) => {
      nextTitle = lang === 'en'
        ? nextTitle.split(pair[0]).join(pair[1])
        : nextTitle.split(pair[1]).join(pair[0]);
    });
    document.title = nextTitle;

    document.querySelectorAll('meta[data-en][data-ko]').forEach((meta) => {
      meta.setAttribute('content', lang === 'en' ? meta.dataset.en : meta.dataset.ko);
    });

    document.querySelectorAll('.stat-num[data-suffix-en]').forEach((el) => {
      const suffix = lang === 'en' ? el.dataset.suffixEn : el.dataset.suffixKo;
      el.dataset.suffix = suffix;
      const num = (el.textContent.match(/\d+/) || ['0'])[0];
      el.textContent = num + suffix;
    });

    if (typeof window._updateProjectCount === 'function') window._updateProjectCount();

    window._typingWords = lang === 'en' ? typingWordsEN : typingWordsKO;
    if (typeof window._restartTyping === 'function') window._restartTyping();

    const langLabel = toggle.querySelector('.lang-label');
    const langLabelMobile = document.querySelector('.lang-label-mobile');
    if (langLabel) langLabel.textContent = lang === 'ko' ? 'EN' : 'KO';
    if (langLabelMobile) langLabelMobile.textContent = lang === 'ko' ? 'English' : '한국어';
    toggle.title = lang === 'ko' ? 'English' : '한국어';
  }

  function toggleLang() {
    applyLang(currentLang === 'ko' ? 'en' : 'ko');
  }

  window._typingWords = currentLang === 'en' ? typingWordsEN : typingWordsKO;
  if (currentLang !== 'ko') applyLang(currentLang);

  toggle.addEventListener('click', toggleLang);
  if (toggleMobile) toggleMobile.addEventListener('click', toggleLang);
})();

/* ------------------------------------------------------------- */
/* 18. 우측 섹션 네비게이터                                      */
/* ------------------------------------------------------------- */
(function initSectionNav() {
  const navItems = Array.from(document.querySelectorAll('.section-nav-item'));
  if (!navItems.length || typeof IntersectionObserver === 'undefined') return;

  const sectionMap = navItems
    .map((item) => {
      const href = item.getAttribute('href');
      if (!href || !href.startsWith('#')) return null;
      const section = document.querySelector(href);
      return section ? { item, section } : null;
    })
    .filter(Boolean);

  if (!sectionMap.length) return;

  navItems.forEach((item) => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.querySelector(item.getAttribute('href'));
      if (target) target.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    });
  });

  const obs = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      navItems.forEach((item) => {
        item.classList.toggle('active', item.getAttribute('href') === '#' + entry.target.id);
      });
    });
  }, {
    threshold: 0,
    rootMargin: '-20% 0px -70% 0px',
  });

  sectionMap.forEach(({ section }) => obs.observe(section));
})();

/* ------------------------------------------------------------- */
/* 19. 카드 전체 클릭 → 상세 페이지 이동                         */
/* ------------------------------------------------------------- */
(function initCardLinks() {
  const cards = document.querySelectorAll('[data-card-href]');
  if (!cards.length) return;

  cards.forEach((card) => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('a, button')) return;
      const selection = window.getSelection();
      if (selection && selection.toString().trim()) return;
      window.location.href = card.dataset.cardHref;
    });
  });
})();
