/* v2 detail-page lightweight runtime — no AOS / VanillaTilt dependency */
(() => {
  'use strict';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];

  const hamburger = $('#hamburger');
  const mobileMenu = $('#mobileMenu');
  const overlay = $('#sidebarOverlay');
  function closeMobile() {
    mobileMenu?.classList.remove('open');
    hamburger?.classList.remove('open');
    hamburger?.setAttribute('aria-expanded', 'false');
    overlay?.classList.remove('active');
    document.body.style.overflow = '';
  }
  window.closeMobile = closeMobile;
  hamburger?.addEventListener('click', () => {
    const open = mobileMenu?.classList.toggle('open') || false;
    hamburger.classList.toggle('open', open);
    hamburger.setAttribute('aria-expanded', String(open));
    overlay?.classList.toggle('active', open);
    document.body.style.overflow = open ? 'hidden' : '';
  });
  overlay?.addEventListener('click', closeMobile);
  mobileMenu?.querySelectorAll('a').forEach((a) => a.addEventListener('click', closeMobile));

  const back = $('#btn-back-to-top');
  const bar = $('#myBar');
  let scrollTick = 0;
  function syncScroll() {
    scrollTick = 0;
    const top = document.documentElement.scrollTop || document.body.scrollTop;
    const max = Math.max(1, document.documentElement.scrollHeight - document.documentElement.clientHeight);
    bar && (bar.style.transform = `scaleX(${Math.min(1, top / max).toFixed(4)})`);
    back?.classList.toggle('visible', top > 300);
  }
  addEventListener('scroll', () => { if (!scrollTick) scrollTick = requestAnimationFrame(syncScroll); }, { passive: true });
  back?.addEventListener('click', () => scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' }));
  syncScroll();

  const themeDesktop = $('#themeToggle');
  const themeMobile = $('#themeToggleMobile');
  function themeLabel(dark, lang) { return dark ? (lang === 'en' ? 'Light Mode' : '라이트 모드') : (lang === 'en' ? 'Dark Mode' : '다크 모드'); }
  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('theme', theme);
    const dark = theme === 'dark';
    const lang = localStorage.getItem('lang') || 'ko';
    const label = themeLabel(dark, lang);
    const di = $('#themeIcon'); if (di) di.className = dark ? 'fas fa-sun' : 'fas fa-moon';
    const mi = $('#themeIconMobile') || $('.theme-label-mobile')?.previousElementSibling; if (mi?.tagName === 'I') mi.className = dark ? 'fas fa-sun' : 'fas fa-moon';
    const ml = $('.theme-label-mobile'); if (ml) ml.textContent = label;
    if (themeDesktop) themeDesktop.title = label;
  }
  const initialTheme = localStorage.getItem('theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  applyTheme(initialTheme);
  const toggleTheme = () => applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
  themeDesktop?.addEventListener('click', toggleTheme);
  themeMobile?.addEventListener('click', toggleTheme);

  $$('[data-en]:not([data-ko]):not(meta)').forEach((el) => { el.dataset.ko = el.textContent.trim(); });
  $$('[data-en-html]:not([data-ko-html])').forEach((el) => { el.dataset.koHtml = el.innerHTML; });
  const langDesktop = $('#langToggle');
  const langMobile = $('#langToggleMobile');
  let lang = localStorage.getItem('lang') || 'ko';
  function translate(next) {
    lang = next;
    localStorage.setItem('lang', lang);
    document.documentElement.lang = lang;
    $$('[data-en][data-ko]:not(meta)').forEach((el) => {
      const text = lang === 'en' ? el.dataset.en : el.dataset.ko;
      const icon = el.firstElementChild?.tagName === 'I' ? el.firstElementChild.outerHTML : '';
      if (icon) el.innerHTML = `${icon} ${text}`; else el.textContent = text;
    });
    $$('[data-en-html][data-ko-html]').forEach((el) => { el.innerHTML = lang === 'en' ? el.dataset.enHtml : el.dataset.koHtml; });
    $$('meta[data-en][data-ko]').forEach((el) => { el.content = lang === 'en' ? el.dataset.en : el.dataset.ko; });
    const dl = langDesktop?.querySelector('.lang-label'); if (dl) dl.textContent = lang === 'ko' ? 'EN' : 'KO';
    const ml = $('.lang-label-mobile'); if (ml) ml.textContent = lang === 'ko' ? 'English' : '한국어';
    if (langDesktop) {
      langDesktop.title = lang === 'ko' ? 'English' : '한국어';
      langDesktop.setAttribute('aria-label', lang === 'ko' ? 'EN · English' : 'KO · 한국어');
    }
    if (langMobile) langMobile.setAttribute('aria-label', lang === 'ko' ? 'English · 언어 전환' : '한국어 · Switch language');
    applyTheme(document.documentElement.dataset.theme || 'light');
    dispatchEvent(new CustomEvent('portfolio:language', { detail: { lang } }));
  }
  translate(lang);
  langDesktop?.addEventListener('click', () => translate(lang === 'ko' ? 'en' : 'ko'));
  langMobile?.addEventListener('click', () => translate(lang === 'ko' ? 'en' : 'ko'));

  if (!reduced && 'IntersectionObserver' in window) {
    document.documentElement.classList.add('reveal-enabled');
    const io = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-revealed');
      io.unobserve(entry.target);
    }), { rootMargin: '80px 0px', threshold: 0.06 });
    $$('[data-aos]').forEach((el) => {
      const delay = Math.min(240, Number(el.dataset.aosDelay || 0));
      if (delay) el.style.setProperty('--reveal-delay', `${delay}ms`);
      io.observe(el);
    });
  } else {
    $$('[data-aos]').forEach((el) => el.classList.add('is-revealed'));
  }

  addEventListener('keydown', (event) => { if (event.key === 'Escape') closeMobile(); });
})();
