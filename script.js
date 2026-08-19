/* =============================================================
   pachir1su.github.io — v2.6.0 interactions
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
/* 1. v2.6 DOM normalization                                     */
/* ------------------------------------------------------------- */
(function normalizeV26Markup() {
  document.getElementById('mbti-section')?.remove();
  document.querySelector('.floating-icons')?.remove();
  document.getElementById('sectionNav')?.remove();

  document.querySelector('.nav-links a[href="#home"]')?.closest('li')?.remove();
  document.querySelector('.mobile-menu > a[href="#home"]')?.remove();

  const navLabels = {
    '#projects': ['프로젝트', 'Projects'],
    '#skills': ['역량', 'Skills'],
    '#awards': ['수상', 'Awards'],
    '#about': ['비전', 'Vision'],
  };
  Object.entries(navLabels).forEach(([href, labels]) => {
    document.querySelectorAll(`a[href="${href}"]`).forEach((link) => {
      if (!link.closest('.nav-links, .mobile-menu')) return;
      link.dataset.ko = labels[0];
      link.dataset.en = labels[1];
    });
  });

  const personSchema = document.querySelector('script[type="application/ld+json"]');
  if (personSchema) {
    try {
      const data = JSON.parse(personSchema.textContent);
      if (data && data['@type'] === 'Person') {
        delete data.alumniOf;
        data.affiliation = {
          '@type': 'CollegeOrUniversity',
          name: '한국기술교육대학교',
        };
        personSchema.textContent = JSON.stringify(data, null, 2);
      }
    } catch (error) {
      console.warn('JSON-LD normalization skipped:', error);
    }
  }

  const education = document.querySelector('.about-edu');
  if (education) education.setAttribute('aria-label', '한국기술교육대학교 26학번');

  const school = document.querySelector('.edu-school');
  if (school) {
    school.dataset.ko = '한국기술교육대학교 26학번';
    school.dataset.en = 'KOREATECH · Class of 2026';
    school.textContent = school.dataset.ko;
  }
  const schoolSub = document.querySelector('.edu-sub');
  if (schoolSub) schoolSub.remove();

  const heroButtons = document.querySelector('.hero-btns');
  if (heroButtons && !heroButtons.querySelector('.hero-email')) {
    const emailButton = document.createElement('button');
    emailButton.type = 'button';
    emailButton.className = 'btn btn-ghost contact-email hero-email';
    emailButton.title = '클릭하면 복사됩니다';
    emailButton.innerHTML = '<i class="fas fa-envelope"></i><span class="email-addr">capybara@koreatech.ac.kr</span><span class="copy-hint sr-only">복사</span>';
    heroButtons.appendChild(emailButton);
  }

  if (!document.getElementById('v26-runtime-layout')) {
    const style = document.createElement('style');
    style.id = 'v26-runtime-layout';
    style.textContent = `
      .hero-btns { flex-wrap: wrap; }
      .hero-email { max-width: 100%; }
      .hero-email .email-addr { overflow-wrap: anywhere; }
      .sr-only { position:absolute!important; width:1px!important; height:1px!important; padding:0!important; margin:-1px!important; overflow:hidden!important; clip:rect(0,0,0,0)!important; white-space:nowrap!important; border:0!important; }
      @media (max-width: 1024px) {
        .container { padding-left: clamp(16px, 4vw, 24px); padding-right: clamp(16px, 4vw, 24px); }
        .hero-content { grid-template-columns: minmax(0, 1fr); }
        .hero-main, .hero-stats { min-width: 0; }
      }
      @media (max-width: 640px) {
        .hero-btns > * { width: 100%; justify-content: center; }
        .hero-email { font-size: .78rem; }
      }
    `;
    document.head.appendChild(style);
  }
})();

/* ------------------------------------------------------------- */
/* 2. AOS                                                        */
/* ------------------------------------------------------------- */
if (typeof AOS !== 'undefined') {
  AOS.init({ once: true, duration: 400, easing: 'ease-out-cubic' });
}

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
  const defaults = ['메이커', '엔지니어', '팀 리더'];
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
/* 6. Stamp feedback                                            */
/* ------------------------------------------------------------- */
(function initStampClick() {
  if (prefersReducedMotion) return;
  const words = ['확인', 'OK', '!!', '@@', 'GOOD', '체크'];
  document.querySelectorAll('.btn, .plink, .chip, .wip-badge, .stat-item, .nav-github, #btn-back-to-top').forEach((el) => {
    el.addEventListener('click', (event) => {
      const stamp = document.createElement('div');
      stamp.className = 'stamp-pop';
      stamp.textContent = words[Math.floor(Math.random() * words.length)];
      stamp.style.setProperty('--stamp-rot', `${-8 + Math.random() * 16}deg`);
      stamp.style.left = `${event.clientX}px`;
      stamp.style.top = `${event.clientY}px`;
      document.body.appendChild(stamp);
      setTimeout(() => stamp.remove(), 500);
    });
  });
})();

/* ------------------------------------------------------------- */
/* 7. Hero stat counter                                         */
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
    const rect = card._v26Rect || card.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    card.style.setProperty('--shadow-x', `${-x * 7}px`);
    card.style.setProperty('--shadow-y', `${-y * 7 + 4}px`);
  }
  function leave(event) {
    const card = event.currentTarget;
    delete card._v26Rect;
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
      '.hero-role': { html: 'Full-Stack Developer &amp; <span class="typing-wrap"><span id="typing-text"></span><span class="typing-cursor"></span></span>' },
      '.hero-desc': { html: 'I build things that actually run — a <strong>campus notification bot</strong>, a <strong>multi-LLM desktop tool</strong>, and a <strong>Raspberry Pi server</strong>.<br />Long term, I aim to be an entrepreneur pursuing innovation beyond profit.' },
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
      '.hero-role': { html: '풀스택 개발자 &amp; <span class="typing-wrap"><span id="typing-text"></span><span class="typing-cursor"></span></span>' },
      '.hero-desc': { html: '<strong>공지 알림 봇</strong> · <strong>멀티 LLM 도구</strong> · <strong>라즈베리파이 서버</strong>처럼 실제로 돌아가는 것을 만듭니다.<br />길게는 이윤을 넘어 혁신을 추구하는 기업가를 목표로 합니다.' },
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
    ko: ['메이커', '엔지니어', '팀 리더'],
    en: ['Maker', 'Engineer', 'Team Leader'],
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
/* 19. Issue #129 featured project rollback                      */
/* ------------------------------------------------------------- */
(function restoreIssue129FeaturedProjects() {
  const grid = document.querySelector('#featured-section .featured-grid');
  if (!grid) return;

  grid.innerHTML = `
    <article class="featured-card" data-card-href="projects/Wall_Sina/">
      <div class="featured-top">
        <i class="fas fa-house-flood-water featured-icon"></i>
        <span class="featured-badge" data-en="2024 · Sustainable Dev" data-ko="2024 · 지속 가능한 발전 프로젝트">2024 · 지속 가능한 발전 프로젝트</span>
      </div>
      <h3 class="featured-title" data-en="Coastal Barrier System" data-ko="해안 장벽 시스템">해안 장벽 시스템</h3>
      <dl class="featured-detail">
        <dt data-en="Theme" data-ko="주제">주제</dt>
        <dd data-en="Rising sea levels and coastal erosion from climate change threaten shorelines." data-ko="기후 변화에 따른 해수면 상승·해안 침식으로 해안이 위협받고 있습니다.">기후 변화에 따른 해수면 상승·해안 침식으로 해안이 위협받고 있습니다.</dd>
        <dt data-en="What I Did" data-ko="한 일">한 일</dt>
        <dd data-en="Designed and built a coastal barrier system as a Sustainable Development (Jigabal) project." data-ko="해안을 보호하는 해안 장벽 시스템을 설계·구현했습니다.">해안을 보호하는 해안 장벽 시스템을 설계·구현했습니다.</dd>
        <dt data-en="Category" data-ko="분류">분류</dt>
        <dd data-en-html="A <strong>2024 Sustainable Development (Jigabal)</strong> project." data-ko-html="<strong>2024 지속 가능한 발전</strong> 출품 프로젝트.">2024 <strong>지속 가능한 발전</strong> 출품 프로젝트.</dd>
      </dl>
      <div class="featured-links">
        <a href="projects/Wall_Sina/" class="flink flink-primary" data-en="Details" data-ko="자세히"><i class="fas fa-arrow-right"></i> 자세히</a>
      </div>
    </article>

    <article class="featured-card" data-card-href="projects/HEALTH_CHECK_PROJECT/">
      <div class="featured-top">
        <i class="fas fa-heart-pulse featured-icon"></i>
        <span class="featured-badge" data-en="2025 · Sustainable Dev" data-ko="2025 · 지속 가능한 발전 프로젝트">2025 · 지속 가능한 발전 프로젝트</span>
      </div>
      <h3 class="featured-title" data-en="Healthcare System" data-ko="헬스케어 시스템">헬스케어 시스템</h3>
      <dl class="featured-detail">
        <dt data-en="Theme" data-ko="주제">주제</dt>
        <dd data-en="Building sustainable, accessible healthcare that keeps supporting people's health over the long term." data-ko="장기적으로 사람들의 건강을 돌보는 지속 가능하고 접근성 있는 헬스케어가 필요합니다.">장기적으로 사람들의 건강을 돌보는 지속 가능하고 접근성 있는 헬스케어가 필요합니다.</dd>
        <dt data-en="What I Did" data-ko="한 일">한 일</dt>
        <dd data-en="Designed and built a healthcare system as a Sustainable Development (Jigabal) project." data-ko="헬스케어 시스템을 설계·구현했습니다.">헬스케어 시스템을 설계·구현했습니다.</dd>
        <dt data-en="Category" data-ko="분류">분류</dt>
        <dd data-en-html="A <strong>2025 Sustainable Development (Jigabal)</strong> project." data-ko-html="<strong>2025 지속 가능한 발전</strong> 출품 프로젝트.">2025 <strong>지속 가능한 발전</strong> 출품 프로젝트.</dd>
      </dl>
      <div class="featured-links">
        <a href="projects/HEALTH_CHECK_PROJECT/" class="flink flink-primary" data-en="Details" data-ko="자세히"><i class="fas fa-arrow-right"></i> 자세히</a>
      </div>
    </article>

    <article class="featured-card" data-card-href="projects/koreatechGongjiAgent/">
      <div class="featured-top">
        <i class="fas fa-bell featured-icon"></i>
        <span class="featured-badge" data-en="2026 · Solo Project" data-ko="2026 · 개인 개발">2026 · 개인 개발</span>
      </div>
      <h3 class="featured-title" data-en="KOREATECH Unified Alert System" data-ko="코리아텍 통합 알림 시스템">코리아텍 통합 알림 시스템</h3>
      <dl class="featured-detail">
        <dt data-en="Problem" data-ko="문제">문제</dt>
        <dd data-en="KOREATECH notices, mail, and shuttle info are scattered across places, so it's easy to miss what matters." data-ko="코리아텍 공지·메일·셔틀 정보가 여러 곳에 흩어져 있어 중요한 소식을 놓치기 쉽습니다.">코리아텍 공지·메일·셔틀 정보가 여러 곳에 흩어져 있어 중요한 소식을 놓치기 쉽습니다.</dd>
        <dt data-en="What I Did" data-ko="한 일">한 일</dt>
        <dd data-en-html="Solo-built a system that watches portal/dormitory notices, mail (receive & read-receipt), and shuttle timetables, and alerts Discord in real time — with an admin panel, DM subscriptions, a web dashboard, and Raspberry Pi LED support.<span class='fd-role'>Solo dev · Full process</span>" data-ko-html="포털·생활관 공지, 메일, 셔틀 현재 위치를 감시해 디스코드로 실시간 알림을 주는 시스템을 개발했습니다. 관리자 패널·DM 구독·웹 대시보드·라즈베리파이 상태 LED를 지원합니다.<span class='fd-role'>1인 개발 · 전 과정</span>">포털·생활관 공지, 메일, 셔틀 현재 위치를 감시해 디스코드로 실시간 알림을 주는 시스템을 개발했습니다. 관리자 패널·DM 구독·웹 대시보드·라즈베리파이 상태 LED를 지원합니다.<span class="fd-role">1인 개발 · 전 과정</span></dd>
        <dt data-en="Result" data-ko="결과">결과</dt>
        <dd data-en-html="Real-time unified alerts (quick check <strong>~60s</strong>) with personal DM subscriptions and a live web dashboard." data-ko-html="빠른 체크 <strong>약 60초</strong>의 실시간 통합 알림 + 개인 DM 구독·웹 대시보드 운영.">빠른 체크 <strong>약 60초</strong>의 실시간 통합 알림 + 개인 DM 구독·웹 대시보드 운영.</dd>
      </dl>
      <div class="tech-stack">
        <span>Python</span><span>Selenium</span><span>Discord.py</span><span>FastAPI</span><span>IMAP</span><span>Raspberry Pi</span>
      </div>
      <div class="featured-links">
        <a href="projects/koreatechGongjiAgent/" class="flink flink-primary" data-en="Details" data-ko="자세히"><i class="fas fa-arrow-right"></i> 자세히</a>
        <a href="https://github.com/pachir1su/koreatechGongjiAgent" target="_blank" rel="noopener noreferrer" class="flink"><i class="fab fa-github"></i> GitHub</a>
        <a href="https://discord.com/oauth2/authorize?client_id=1518630779922546759" target="_blank" rel="noopener noreferrer" class="flink" data-en="Invite Bot" data-ko="봇 초대"><i class="fab fa-discord"></i> 봇 초대</a>
      </div>
    </article>`;

  const lang = localStorage.getItem('lang') || 'ko';
  grid.querySelectorAll('[data-en][data-ko]').forEach((el) => {
    const text = lang === 'en' ? el.dataset.en : el.dataset.ko;
    const icon = el.firstElementChild?.tagName === 'I' ? el.firstElementChild.outerHTML : '';
    if (icon) el.innerHTML = `${icon} ${text}`;
    else el.textContent = text;
  });
  grid.querySelectorAll('[data-en-html][data-ko-html]').forEach((el) => {
    el.innerHTML = lang === 'en' ? el.dataset.enHtml : el.dataset.koHtml;
  });
  grid.querySelectorAll('[data-card-href]').forEach((card) => {
    card.addEventListener('click', (event) => {
      if (event.target.closest('a, button')) return;
      if (window.getSelection()?.toString().trim()) return;
      window.location.href = card.dataset.cardHref;
    });
  });
})();

/* ------------------------------------------------------------- */
/* 20. Restore original GitHub activity cards                    */
/* ------------------------------------------------------------- */
(function restoreGitHubActivityCards() {
  const cards = document.querySelector('#github-section .github-cards');
  const stats = cards?.querySelector('.gh-card-stats');
  if (!cards || !stats || cards.querySelector('.gh-card-streak, .gh-card-metrics')) return;

  const row = document.createElement('div');
  row.className = 'gh-row';
  cards.insertBefore(row, stats);
  row.appendChild(stats);

  const streak = document.createElement('img');
  streak.className = 'gh-card gh-card-streak';
  streak.loading = 'lazy';
  streak.src = 'https://streak-stats.demolab.com?user=pachir1su&hide_border=true&background=fffdf6&ring=c63b3b&fire=c63b3b&currStreakLabel=c63b3b&sideLabels=5a5040&currStreakNum=1f1c14&sideNums=1f1c14&dates=5a5040';
  streak.alt = 'pachir1su님의 GitHub 연속 기여(Streak) 통계';
  row.appendChild(streak);

  const metrics = document.createElement('img');
  metrics.className = 'gh-card gh-card-metrics';
  metrics.loading = 'lazy';
  metrics.src = 'https://raw.githubusercontent.com/pachir1su/pachir1su/main/github-metrics.svg';
  metrics.alt = 'pachir1su님의 GitHub 상세 메트릭 — 활동·커뮤니티·사용 언어';
  cards.appendChild(metrics);
})();

/* ------------------------------------------------------------- */
/* 21. Roll back vision section to pre-v2.3 layout              */
/* ------------------------------------------------------------- */
(function rollbackVisionSectionToPreV23() {
  const card = document.querySelector('.about-card');
  if (card) {
    card.style.maxWidth = 'none';
    card.style.marginTop = '8px';
  }

  document.querySelectorAll('.about-body p').forEach((paragraph) => {
    paragraph.style.maxWidth = 'none';
    paragraph.style.fontSize = '0.98rem';
    paragraph.style.lineHeight = '2';
    paragraph.style.marginBottom = '14px';
  });
})();
