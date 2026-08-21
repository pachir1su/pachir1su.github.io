/* =============================================================
   pachir1su.github.io — v2.7.x interactions
   정보 탐색에 필요한 동작만 유지하고 오래된 장식/중복 내비게이션은 제거한다.
   ============================================================= */

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointerQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
const hasFinePointer = () => finePointerQuery.matches;

function onMediaChange(query, handler) {
  if (typeof query.addEventListener === 'function') query.addEventListener('change', handler);
  else if (typeof query.addListener === 'function') query.addListener(handler);
}

function scrollBehavior() {
  return prefersReducedMotion ? 'auto' : 'smooth';
}

/* ------------------------------------------------------------- */
/* 2. Native scroll reveal (AOS replacement)                     */
/* ------------------------------------------------------------- */
(function initReveal() {
  const items = [...document.querySelectorAll('[data-aos]')];
  if (!items.length || prefersReducedMotion || typeof IntersectionObserver === 'undefined') {
    items.forEach((el) => el.classList.add('is-revealed'));
    return;
  }
  document.documentElement.classList.add('reveal-enabled');
  const obs = new IntersectionObserver((entries) => entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('is-revealed');
    obs.unobserve(entry.target);
  }), { rootMargin: '100px 0px', threshold: 0.05 });
  items.forEach((el) => {
    const delay = Math.min(240, Number(el.dataset.aosDelay || 0));
    if (delay) el.style.setProperty('--reveal-delay', `${delay}ms`);
    obs.observe(el);
  });
})();

/* ------------------------------------------------------------- */
/* 3. Back-to-top + scroll progress                              */
/* ------------------------------------------------------------- */
const backBtn = document.getElementById('btn-back-to-top');
const myBar = document.getElementById('myBar');

if (backBtn) {
  backBtn.style.alignItems = 'center';
  backBtn.style.justifyContent = 'center';
  backBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: scrollBehavior() }));
}

(function initScroll() {
  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const top = document.documentElement.scrollTop || document.body.scrollTop;
      const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const ratio = height > 0 ? top / height : 0;
      if (myBar) myBar.style.transform = `scaleX(${ratio.toFixed(4)})`;
      if (backBtn) backBtn.classList.toggle('visible', top > 300);
      document.documentElement.style.setProperty('--scroll-progress', ratio.toFixed(3));
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

/* ------------------------------------------------------------- */
/* 4. Typing                                                    */
/* ------------------------------------------------------------- */
(function initTyping() {
  const defaults = ['풀스택 개발자', '메이커', '아이디어 뱅크', '팀 리더', '엔지니어'];
  let wordIndex = 0;
  let charIndex = 0;
  let deleting = false;
  let timer = null;

  function type() {
    const el = document.getElementById('typing-text');
    if (!el) return;
    const words = window._typingWords || defaults;
    const word = words[wordIndex % words.length];

    if (prefersReducedMotion) {
      el.textContent = word;
      return;
    }

    el.textContent = deleting
      ? word.substring(0, Math.max(0, charIndex - 1))
      : word.substring(0, charIndex + 1);
    deleting ? charIndex-- : charIndex++;

    let delay = deleting ? 50 : 100;
    if (!deleting && charIndex === word.length) {
      deleting = true;
      delay = 2000;
    } else if (deleting && charIndex === 0) {
      deleting = false;
      wordIndex = (wordIndex + 1) % words.length;
      delay = 500;
    }
    timer = setTimeout(type, delay);
  }

  window._restartTyping = function () {
    clearTimeout(timer);
    wordIndex = 0;
    charIndex = 0;
    deleting = false;
    const el = document.getElementById('typing-text');
    if (el) el.textContent = '';
    type();
  };
  type();
})();

/* ------------------------------------------------------------- */
/* 5. Mobile menu                                               */
/* ------------------------------------------------------------- */
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');
const sidebarOverlay = document.getElementById('sidebarOverlay');

function closeMobile() {
  mobileMenu?.classList.remove('open');
  if (hamburger) {
    hamburger.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
  }
  sidebarOverlay?.classList.remove('active');
  document.body.style.overflow = '';
}

if (hamburger && mobileMenu) {
  hamburger.addEventListener('click', () => {
    const open = mobileMenu.classList.toggle('open');
    hamburger.classList.toggle('open', open);
    hamburger.setAttribute('aria-expanded', String(open));
    sidebarOverlay?.classList.toggle('active', open);
    document.body.style.overflow = open ? 'hidden' : '';
  });
}
sidebarOverlay?.addEventListener('click', closeMobile);
mobileMenu?.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMobile));

/* ------------------------------------------------------------- */
/* 6. Hero stat counter                                         */
/* ------------------------------------------------------------- */
(function initStatCounter() {
  const stats = document.querySelectorAll('.stat-num');
  if (!stats.length) return;
  const lang = localStorage.getItem('lang') || 'ko';

  stats.forEach((el) => {
    const match = el.textContent.trim().match(/^(\d+)(.*)$/);
    if (!match) return;
    el.dataset.target = match[1];
    if (el.dataset.suffixKo === undefined) el.dataset.suffixKo = match[2];
    if (el.dataset.suffixEn === undefined) el.dataset.suffixEn = match[2];
    el.dataset.suffix = lang === 'en' ? el.dataset.suffixEn : el.dataset.suffixKo;
    el.textContent = `0${el.dataset.suffix}`;
  });

  const finish = (el) => {
    if (el.dataset.target) el.textContent = `${el.dataset.target}${el.dataset.suffix || ''}`;
  };
  if (prefersReducedMotion || typeof IntersectionObserver === 'undefined') {
    stats.forEach(finish);
    return;
  }

  const obs = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = Number.parseInt(el.dataset.target, 10);
      if (Number.isNaN(target)) return;
      const suffix = el.dataset.suffix || '';
      const start = performance.now();
      const tick = (now) => {
        const p = Math.min(1, (now - start) / 500);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = `${Math.round(target * eased)}${suffix}`;
        if (p < 1) requestAnimationFrame(tick);
        else finish(el);
      };
      requestAnimationFrame(tick);
      obs.unobserve(el);
    });
  }, { threshold: 0.5 });
  stats.forEach((el) => obs.observe(el));
})();

/* ------------------------------------------------------------- */
/* 8. Card shadow follow                                        */
/* ------------------------------------------------------------- */
(function initShadowFollow() {
  if (prefersReducedMotion) return;
  const cards = [...document.querySelectorAll('.skill-card, .project-card, .award-card, .about-card')];
  if (!cards.length) return;
  let installed = false;

  function enter(event) {
    event.currentTarget._v26Rect = event.currentTarget.getBoundingClientRect();
  }
  function move(event) {
    const card = event.currentTarget;
    card._v27Pointer = { x: event.clientX, y: event.clientY };
    if (card._v27Raf) return;
    card._v27Raf = requestAnimationFrame(() => {
      card._v27Raf = 0;
      const rect = card._v26Rect || card.getBoundingClientRect();
      const point = card._v27Pointer;
      const x = (point.x - rect.left) / rect.width - 0.5;
      const y = (point.y - rect.top) / rect.height - 0.5;
      card.style.setProperty('--shadow-x', `${-x * 7}px`);
      card.style.setProperty('--shadow-y', `${-y * 7 + 4}px`);
    });
  }
  function leave(event) {
    const card = event.currentTarget;
    delete card._v26Rect;
    if (card._v27Raf) cancelAnimationFrame(card._v27Raf);
    card._v27Raf = 0;
    card.style.setProperty('--shadow-x', '0px');
    card.style.setProperty('--shadow-y', '6px');
  }
  function sync() {
    const enable = hasFinePointer();
    if (enable === installed) return;
    installed = enable;
    cards.forEach((card) => {
      const method = enable ? 'addEventListener' : 'removeEventListener';
      card[method]('mouseenter', enter);
      card[method]('mousemove', move);
      card[method]('mouseleave', leave);
      if (!enable) leave({ currentTarget: card });
    });
  }
  sync();
  onMediaChange(finePointerQuery, sync);
})();

/* ------------------------------------------------------------- */
/* 9. Keyboard shortcuts                                        */
/* ------------------------------------------------------------- */
(function initShortcuts() {
  const sections = ['#home', '#projects', '#skills', '#awards', '#about'];
  document.addEventListener('keydown', (event) => {
    if (event.target?.matches('input, textarea, select, [contenteditable="true"]')) return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const key = event.key.toLowerCase();
    if (key >= '1' && key <= '5') {
      document.querySelector(sections[Number.parseInt(key, 10) - 1])?.scrollIntoView({ behavior: scrollBehavior() });
    } else if (key === 'escape') closeMobile();
    else if (key === 't') window.scrollTo({ top: 0, behavior: scrollBehavior() });
    else if (key === 'g') window.open('https://github.com/pachir1su', '_blank', 'noopener');
  });
})();

/* ------------------------------------------------------------- */
/* 10. Card entry                                               */
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
/* 11. Console egg — lightweight only                           */
/* ------------------------------------------------------------- */
console.log('%c{ GY } portfolio · 1~5 sections · T top · G GitHub', 'color:#c63b3b;font-family:monospace');

/* ------------------------------------------------------------- */
/* 12. Project filter                                            */
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
      let visible = 0;
      group.querySelectorAll('.project-card').forEach((card) => {
        const categories = (card.dataset.category || '').split(' ');
        const show = filter === 'all'
          || (filter === 'wip' && card.classList.contains('project-wip'))
          || (filter === 'failed' && card.classList.contains('project-failed'))
          || categories.includes(filter);
        card.style.display = show ? '' : 'none';
        if (show) visible++;
      });
      group.style.display = visible ? '' : 'none';
    });
    setFailedExpanded(filter !== 'all');
  }
  buttons.forEach((button) => button.addEventListener('click', () => {
    buttons.forEach((item) => item.classList.remove('active'));
    button.classList.add('active');
    applyFilter(button.dataset.filter || 'all');
  }));
})();

/* ------------------------------------------------------------- */
/* 13. Email copy                                                */
/* ------------------------------------------------------------- */
(function initEmailCopy() {
  document.querySelectorAll('.contact-email').forEach((button) => {
    const addr = button.querySelector('.email-addr');
    const hint = button.querySelector('.copy-hint');
    const email = addr?.textContent.trim() || 'capybara@koreatech.ac.kr';
    button.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(email);
      } catch (error) {
        const textarea = document.createElement('textarea');
        textarea.value = email;
        textarea.style.cssText = 'position:fixed;opacity:0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        textarea.remove();
      }
      if (hint) {
        const previous = hint.textContent;
        hint.textContent = (localStorage.getItem('lang') || 'ko') === 'en' ? 'Copied!' : '복사됨!';
        setTimeout(() => { hint.textContent = previous; }, 1500);
      }
    });
  });
})();

/* ------------------------------------------------------------- */
/* 14. Project count                                             */
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
  badge.textContent = (localStorage.getItem('lang') || 'ko') === 'en'
    ? `${done} done · ${wip} upcoming`
    : `${done}개 완료 · ${wip}개 예정`;
};
window._updateProjectCount();

/* ------------------------------------------------------------- */
/* 15. Failed project collapse                                   */
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
/* 16. Theme                                                     */
/* ------------------------------------------------------------- */
(function initTheme() {
  const desktop = document.getElementById('themeToggle');
  const mobile = document.getElementById('themeToggleMobile');
  const desktopIcon = document.getElementById('themeIcon');
  const mobileIcon = document.getElementById('themeIconMobile');
  const mobileLabel = document.querySelector('.theme-label-mobile');

  function preferred() {
    return localStorage.getItem('theme')
      || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  }
  function apply(theme) {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('theme', theme);
    const dark = theme === 'dark';
    const lang = localStorage.getItem('lang') || 'ko';
    if (desktopIcon) desktopIcon.className = dark ? 'fas fa-sun' : 'fas fa-moon';
    if (mobileIcon) mobileIcon.className = dark ? 'fas fa-sun' : 'fas fa-moon';
    const label = dark
      ? (lang === 'en' ? 'Light Mode' : '라이트 모드')
      : (lang === 'en' ? 'Dark Mode' : '다크 모드');
    if (mobileLabel) mobileLabel.textContent = label;
    if (desktop) desktop.title = label;
  }
  function toggle() {
    apply((document.documentElement.dataset.theme || 'light') === 'dark' ? 'light' : 'dark');
  }
  apply(preferred());
  desktop?.addEventListener('click', toggle);
  mobile?.addEventListener('click', toggle);
})();

/* ------------------------------------------------------------- */
/* 17. Language                                                  */
/* ------------------------------------------------------------- */
(function initLanguage() {
  const desktop = document.getElementById('langToggle');
  const mobile = document.getElementById('langToggleMobile');
  if (!desktop) return;

  const map = {
    en: {
      '.hero-tag': 'Hello',
      '.hero-role': { html: 'Innovator &amp; <span class="typing-wrap"><span id="typing-text"></span><span class="typing-cursor"></span></span>' },
      '.hero-desc': { html: 'I dream of being an entrepreneur who pursues <strong>innovation</strong> beyond profit.<br /><strong>1 million monthly users</strong> — that\'s my goal.' },
      '.btn-primary': { html: '<i class="fas fa-folder-open"></i> Projects' },
      '.stat-label': ['Projects', 'Awards', 'out of 581'],
      '#projects .section-title': 'Projects',
      '#skills .section-title': 'Skills',
      '#awards .section-title': 'Awards',
      '#about .section-title': 'Vision',
      '.about-quote': '"An innovator who turns ideas into reality"',
      '.github-activity-btn': { html: '<i class="fab fa-github"></i> GitHub Activity' },
      '.github-activity .subsection-label': { html: '<i class="fab fa-github"></i> GitHub Activity' },
      '.cert-block .subsection-label': { html: '<i class="fas fa-certificate"></i> Certifications' },
      '#featured-section > .subsection-label': { html: '<i class="fas fa-star"></i> Featured Projects' },
      '#all-projects-section': { html: '<i class="fas fa-folder-open"></i> All Projects <span id="projectTotalCount" class="project-count-badge"></span>' },
      '.pfilter[data-filter="all"]': 'All',
      '.pfilter[data-filter="hardware"]': 'Hardware',
      '.pfilter[data-filter="discord"]': 'Discord Bot',
      '.pfilter[data-filter="web"]': 'Web',
      '.pfilter[data-filter="contest"]': 'Contest',
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
      '.hero-role': { html: '혁신의 기업가 &amp; <span class="typing-wrap"><span id="typing-text"></span><span class="typing-cursor"></span></span>' },
      '.hero-desc': { html: '이윤을 넘어 <strong>혁신</strong>을 추구하는 기업가를 꿈꿉니다.<br /><strong>월 100만 명</strong>이 사용하는 서비스를 만드는 것이 목표입니다.' },
      '.btn-primary': { html: '<i class="fas fa-folder-open"></i> 프로젝트 보기' },
      '.stat-label': ['프로젝트', '수상 경력', '581 팀 중'],
      '#projects .section-title': '프로젝트',
      '#skills .section-title': '역량',
      '#awards .section-title': '수상',
      '#about .section-title': '비전',
      '.about-quote': '"아이디어를 현실로 만드는 혁신가"',
      '.github-activity-btn': { html: '<i class="fab fa-github"></i> GitHub 활동 보러가기' },
      '.github-activity .subsection-label': { html: '<i class="fab fa-github"></i> GitHub 활동' },
      '.cert-block .subsection-label': { html: '<i class="fas fa-certificate"></i> 자격증' },
      '#featured-section > .subsection-label': { html: '<i class="fas fa-star"></i> 대표 프로젝트' },
      '#all-projects-section': { html: '<i class="fas fa-folder-open"></i> 전체 프로젝트 <span id="projectTotalCount" class="project-count-badge"></span>' },
      '.pfilter[data-filter="all"]': '전체',
      '.pfilter[data-filter="hardware"]': '하드웨어',
      '.pfilter[data-filter="discord"]': 'Discord 봇',
      '.pfilter[data-filter="web"]': '웹',
      '.pfilter[data-filter="contest"]': '대회',
      '.pfilter[data-filter="failed"]': '실패',
      '.year-group-wip .year-heading': '진행 중 · 예정',
      '.year-group-failed .year-heading': '실패한 프로젝트',
      '.footer-copy': '© 2026 Lee Geon Yeong. All rights reserved.',
      '.copy-hint': '복사',
      '#btn-back-to-top': { attr: { title: '맨 위로', 'aria-label': '맨 위로' } },
      '.scroll-hint span': '스크롤',
    },
  };

  const typingWords = {
    ko: ['풀스택 개발자', '메이커', '아이디어 뱅크', '팀 리더', '엔지니어'],
    en: ['Full-Stack Dev', 'Maker', 'Idea Bank', 'Team Leader', 'Engineer'],
  };
  let current = localStorage.getItem('lang') || 'ko';

  function applyValue(selector, value) {
    if (Array.isArray(value)) {
      document.querySelectorAll(selector).forEach((el, index) => {
        if (index < value.length) el.textContent = value[index];
      });
      return;
    }
    const el = document.querySelector(selector);
    if (!el) return;
    if (typeof value === 'object') {
      if (value.html !== undefined) el.innerHTML = value.html;
      if (value.attr) Object.entries(value.attr).forEach(([key, val]) => el.setAttribute(key, val));
    } else el.textContent = value;
  }

  function applyDataTranslations(lang) {
    document.querySelectorAll('[data-en][data-ko]:not(meta)').forEach((el) => {
      const text = lang === 'en' ? el.dataset.en : el.dataset.ko;
      const icon = el.firstElementChild?.tagName === 'I' ? el.firstElementChild.outerHTML : '';
      if (icon) el.innerHTML = `${icon} ${text}`;
      else el.textContent = text;
    });
    document.querySelectorAll('[data-en-html][data-ko-html]').forEach((el) => {
      el.innerHTML = lang === 'en' ? el.dataset.enHtml : el.dataset.koHtml;
    });
  }

  function apply(lang) {
    current = lang;
    localStorage.setItem('lang', lang);
    Object.entries(map[lang]).forEach(([selector, value]) => applyValue(selector, value));
    applyDataTranslations(lang);
    document.documentElement.lang = lang;

    document.querySelectorAll('meta[data-en][data-ko]').forEach((meta) => {
      meta.content = lang === 'en' ? meta.dataset.en : meta.dataset.ko;
    });
    document.querySelectorAll('.stat-num[data-suffix-en]').forEach((el) => {
      const suffix = lang === 'en' ? el.dataset.suffixEn : el.dataset.suffixKo;
      el.dataset.suffix = suffix;
      const num = (el.textContent.match(/\d+/) || ['0'])[0];
      el.textContent = `${num}${suffix}`;
    });
    document.querySelectorAll('.contact-email').forEach((button) => {
      button.title = lang === 'en' ? 'Click to copy' : '클릭하면 복사됩니다';
    });

    window._typingWords = typingWords[lang];
    window._restartTyping?.();
    window._updateProjectCount?.();

    desktop.querySelector('.lang-label').textContent = lang === 'ko' ? 'EN' : 'KO';
    const mobileLabel = document.querySelector('.lang-label-mobile');
    if (mobileLabel) mobileLabel.textContent = lang === 'ko' ? 'English' : '한국어';
    desktop.title = lang === 'ko' ? 'English' : '한국어';
    desktop.setAttribute('aria-label', lang === 'ko' ? 'EN · English' : 'KO · 한국어');
    if (mobile) mobile.setAttribute('aria-label', lang === 'ko' ? 'English · 언어 전환' : '한국어 · Switch language');
  }

  window._typingWords = typingWords[current];
  apply(current);
  desktop.addEventListener('click', () => apply(current === 'ko' ? 'en' : 'ko'));
  mobile?.addEventListener('click', () => apply(current === 'ko' ? 'en' : 'ko'));
})();

/* ------------------------------------------------------------- */
/* 18. Card links                                                */
/* ------------------------------------------------------------- */
(function initCardLinks() {
  document.querySelectorAll('[data-card-href]').forEach((card) => {
    card.addEventListener('click', (event) => {
      if (event.target.closest('a, button')) return;
      if (window.getSelection()?.toString().trim()) return;
      window.location.href = card.dataset.cardHref;
    });
  });
})();

/* ------------------------------------------------------------- */
/* 19. v3 nebula gateway                                        */
/* ------------------------------------------------------------- */
(function initV3NebulaGateway() {
  const slot = document.querySelector('[data-v3-gateway]');
  const link = document.querySelector('[data-v3-gateway-link]');
  const art = document.querySelector('[data-v3-gateway-art]');
  const burstCanvas = document.querySelector('[data-v3-gateway-burst]');
  const hero = document.querySelector('.hero');
  if (!slot || !link || !art || !burstCanvas || !hero) return;

  const variants = [
    { src: 'assets/images/nebula-gateway/torn-portal-wide-v1.png', scale: 1.04, glint: [65, 45] },
    { src: 'assets/images/nebula-gateway/torn-portal-trail-v1.png', scale: 1.07, glint: [57, 52] },
    { src: 'assets/images/nebula-gateway/torn-portal-diagonal-v1.png', scale: 1.03, glint: [62, 42] },
  ];
  const profile = {
    lane: Math.floor(Math.random() * 3),
    size: .92 + Math.random() * .22,
    rotation: (Math.random() - .5) * 12,
  };
  const variant = variants[Math.floor(Math.random() * variants.length)];
  art.src = variant.src;
  art.style.setProperty('--v3-gate-art-scale', String(variant.scale));
  slot.style.setProperty('--v3-gate-glint-x', `${variant.glint[0]}%`);
  slot.style.setProperty('--v3-gate-glint-y', `${variant.glint[1]}%`);
  slot.style.setProperty('--v3-gate-rot', `${profile.rotation.toFixed(2)}deg`);

  /* 버튼과 지표가 실제로 렌더된 뒤 충돌을 피한다. 모바일은 본문 아래의 빈 종이,
     태블릿·데스크톱은 통계와 본문 사이의 여백만 후보로 둔다. */
  function placeGateway() {
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
  if ('ResizeObserver' in window) new ResizeObserver(placeGateway).observe(hero);
  window.addEventListener('resize', placeGateway, { passive: true });

  window.addEventListener('pointermove', (event) => {
    const rect = slot.getBoundingClientRect();
    const x = Math.max(-1, Math.min(1, (event.clientX - (rect.left + rect.width / 2)) / Math.max(1, window.innerWidth * .5)));
    const y = Math.max(-1, Math.min(1, (event.clientY - (rect.top + rect.height / 2)) / Math.max(1, window.innerHeight * .5)));
    art.style.setProperty('--v3-gate-shift-x', `${(x * 5).toFixed(2)}px`);
    art.style.setProperty('--v3-gate-shift-y', `${(y * 4).toFixed(2)}px`);
  }, { passive: true });

  function playGatewayPaperSfx() {
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor) return;
    try {
      const context = new AudioContextCtor();
      const start = context.currentTime;
      const master = context.createGain();
      master.gain.setValueAtTime(.001, start);
      master.gain.linearRampToValueAtTime(.11, start + .18);
      master.gain.exponentialRampToValueAtTime(.001, start + 2.8);
      master.connect(context.destination);
      const tone = context.createOscillator();
      const toneGain = context.createGain();
      tone.type = 'sine';
      tone.frequency.setValueAtTime(154, start + .08);
      tone.frequency.exponentialRampToValueAtTime(466, start + 1.75);
      toneGain.gain.setValueAtTime(.001, start);
      toneGain.gain.linearRampToValueAtTime(.34, start + .62);
      toneGain.gain.exponentialRampToValueAtTime(.001, start + 2.55);
      tone.connect(toneGain).connect(master);
      tone.start(start); tone.stop(start + 2.7);
      const length = Math.max(1, Math.ceil(context.sampleRate * 1.65));
      const buffer = context.createBuffer(1, length, context.sampleRate);
      const samples = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) samples[i] = Math.random() * 2 - 1;
      const noise = context.createBufferSource();
      const filter = context.createBiquadFilter();
      const breathGain = context.createGain();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(620, start);
      filter.frequency.exponentialRampToValueAtTime(2360, start + 1.45);
      filter.Q.value = .72;
      breathGain.gain.setValueAtTime(.001, start);
      breathGain.gain.linearRampToValueAtTime(.18, start + .28);
      breathGain.gain.exponentialRampToValueAtTime(.001, start + 1.65);
      noise.buffer = buffer;
      noise.connect(filter).connect(breathGain).connect(master);
      noise.start(start); noise.stop(start + 1.7);
      window.setTimeout(() => { context.close().catch(() => {}); }, 3000);
    } catch (_) { /* 오디오 정책 실패가 진입 전환을 막지 않는다. */ }
  }

  function playArrivalSfx() {
    const files = [
      'docs/v3-constellation-prototypes/assets/audio/sfx-01-star-a-glass-bell.wav',
      'docs/v3-constellation-prototypes/assets/audio/sfx-01-star-b-celesta.wav',
      'docs/v3-constellation-prototypes/assets/audio/sfx-01-star-c-harp.wav',
    ];
    const audio = new Audio(files[Math.floor(Math.random() * files.length)]);
    audio.preload = 'auto';
    audio.volume = .42;
    audio.play().catch(() => {});
  }

  let burstFrame = 0;
  function drawEntryBurst(origin) {
    if (prefersReducedMotion) return;
    cancelAnimationFrame(burstFrame);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = window.innerWidth;
    const height = window.innerHeight;
    burstCanvas.width = Math.max(1, Math.round(width * dpr));
    burstCanvas.height = Math.max(1, Math.round(height * dpr));
    const context = burstCanvas.getContext('2d');
    if (!context) return;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    const particles = Array.from({ length: 96 }, (_, index) => {
      const angle = Math.random() * Math.PI * 2;
      return {
        angle,
        distance: 72 + Math.pow(Math.random(), .46) * Math.min(Math.max(width, height) * .48, 610),
        size: index % 13 === 0 ? 2.9 : .55 + Math.random() * 1.5,
        warm: index % 4 !== 0,
        delay: Math.random() * .18,
        twist: (Math.random() - .5) * .68,
      };
    });
    const start = performance.now();
    burstCanvas.classList.add('is-active');
    const fadeOut = (value) => 1 - Math.pow(1 - value, 4);
    function frame(now) {
      const progress = Math.min(1, Math.max(0, (now - start) / 3650));
      context.clearRect(0, 0, width, height);
      context.save();
      context.globalCompositeOperation = 'lighter';
      particles.forEach((particle) => {
        const local = Math.max(0, Math.min(1, (progress - particle.delay) / (1 - particle.delay)));
        const pull = 1 - Math.pow(1 - local, 2.7);
        const radius = particle.distance * (1 - pull) + 5 * pull;
        const angle = particle.angle + particle.twist * (1 - local) * Math.sin(local * Math.PI);
        const x = origin.x + Math.cos(angle) * radius;
        const y = origin.y + Math.sin(angle) * radius * .68;
        const tailRadius = radius + Math.max(9, particle.distance * (.045 + .11 * (1 - local)));
        const tailX = origin.x + Math.cos(angle - particle.twist * .35) * tailRadius;
        const tailY = origin.y + Math.sin(angle - particle.twist * .35) * tailRadius * .68;
        const alpha = (1 - fadeOut(Math.max(0, (progress - .72) / .28))) * (.32 + particle.size * .16);
        context.strokeStyle = particle.warm
          ? `rgba(245, 204, 119, ${alpha.toFixed(3)})`
          : `rgba(179, 206, 255, ${(alpha * .82).toFixed(3)})`;
        context.lineWidth = particle.size > 2 ? 1.25 : .55;
        context.beginPath(); context.moveTo(tailX, tailY); context.lineTo(x, y); context.stroke();
        context.fillStyle = particle.warm
          ? `rgba(255, 232, 174, ${(alpha * 1.6).toFixed(3)})`
          : `rgba(207, 224, 255, ${(alpha * 1.35).toFixed(3)})`;
        context.beginPath(); context.arc(x, y, particle.size * (1 - local * .42), 0, Math.PI * 2); context.fill();
      });
      context.restore();
      if (progress < 1) burstFrame = requestAnimationFrame(frame);
      else {
        burstCanvas.classList.remove('is-active');
        context.clearRect(0, 0, width, height);
      }
    }
    burstFrame = requestAnimationFrame(frame);
  }

  const veil = document.createElement('div');
  veil.className = 'v3-gateway-veil';
  document.body.append(veil);
  let entering = false;
  function resetV3Gateway() {
    entering = false;
    document.body.classList.remove('v3-gateway-entering');
    slot.classList.remove('is-entering');
    veil.classList.remove('is-open');
    burstCanvas.classList.remove('is-active');
    cancelAnimationFrame(burstFrame);
  }
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) resetV3Gateway();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && entering) resetV3Gateway();
  });
  link.addEventListener('click', (event) => {
    event.preventDefault();
    if (entering) return;
    entering = true;
    const rect = link.getBoundingClientRect();
    const origin = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    document.body.classList.add('v3-gateway-entering');
    slot.classList.add('is-entering');
    veil.style.setProperty('--v3-gx', `${origin.x}px`);
    veil.style.setProperty('--v3-gy', `${origin.y}px`);
    veil.classList.add('is-open');
    playGatewayPaperSfx();
    drawEntryBurst(origin);
    if (!prefersReducedMotion) {
      window.setTimeout(playArrivalSfx, 900);
      window.setTimeout(playArrivalSfx, 1500);
      window.setTimeout(playArrivalSfx, 2100);
    }
    window.setTimeout(() => { window.location.href = link.href; }, prefersReducedMotion ? 200 : 4000);
  });
})();
