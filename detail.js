/* v2 detail-page lightweight runtime — no AOS / VanillaTilt dependency */
(() => {
  'use strict';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const path = location.pathname;

  /* #249 final acceptance — static page normalization before language/reveal init. */
  if (path.includes('/HEALTH_CHECK_PROJECT/')) {
    const grid = $('.detail-photo-grid');
    if (grid) {
      grid.classList.remove('detail-photo-grid');
      grid.classList.add('detail-gallery');
      $$('.detail-photo-card', grid).forEach((figure) => {
        figure.classList.remove('detail-photo-card');
        figure.classList.add('detail-figure');
      });
    }
  }

  if (path.includes('/nonofire/')) {
    const gallery = $('.detail-gallery');
    const figures = gallery ? $$(':scope > .detail-figure', gallery) : [];
    if (figures.length >= 2) gallery.insertBefore(figures[1], figures[0]);
  }

  if (path.includes('/koreatechGongjiAgent/')) {
    const section = $('[data-media-followup="v27-kga-audit"]');
    if (section) {
      $$('[data-ko]', section).forEach((el) => {
        el.dataset.ko = el.dataset.ko.replace(/실운영\s*/g, '');
      });
      $$('[data-en]', section).forEach((el) => {
        el.dataset.en = el.dataset.en.replace(/\bLive\s*/gi, '');
      });
      $$('img[alt]', section).forEach((img) => {
        img.alt = img.alt.replace(/실운영\s*/g, '');
      });
    }
  }

  if (!$('#qa249-final-style')) {
    const style = document.createElement('style');
    style.id = 'qa249-final-style';
    style.textContent = `
      /* #249: videos keep their source aspect ratio before and during playback. */
      .detail-video { width:100%; height:auto !important; aspect-ratio:auto !important; object-fit:contain !important; }

      /* #249 Wall_Sina: water rises more slowly; barrier is triggered earlier by runtime below. */
      .wall-water-level { transition:height 3s ease !important; }

      /* #249 U-CAST: reverse begins at the right sensor and crosses fully to the left. */
      .ucast-channel.is-reverse.is-entering .ucast-pedestrian {
        left:calc(100% - 88px) !important;
        transition:none !important;
      }
      .ucast-channel.is-reverse.is-exiting .ucast-pedestrian {
        left:76px !important;
        transition:left .68s linear !important;
      }

      /* #249 PlantClock: readable FND, compact tomato plant, and a physical-looking fan. */
      .plantclock-fnd { min-height:78px; align-content:center; }
      .plantclock-fnd small { color:#f3f3f3 !important; font-size:.68rem !important; opacity:1 !important; }
      .plantclock-fnd strong { color:#ff725f !important; font-size:clamp(1rem,2.2vw,1.3rem) !important; }
      .plantclock-pot { overflow:visible; }
      .plant-stem { left:52px !important; bottom:106px !important; height:62px !important; width:6px !important; }
      .plant-leaf { bottom:136px !important; width:38px !important; height:21px !important; }
      .plant-leaf-left { left:17px !important; transform:rotate(18deg) !important; }
      .plant-leaf-right { right:17px !important; transform:scaleX(-1) rotate(18deg) !important; }
      .plant-tomato {
        position:absolute; z-index:3; width:17px; height:17px; border-radius:50%;
        background:#d94737; border:2px solid #9d2b25; box-shadow:inset -2px -2px 0 rgba(0,0,0,.12);
      }
      .plant-tomato::before {
        content:""; position:absolute; left:4px; top:-5px; width:6px; height:6px;
        background:#39743b; clip-path:polygon(50% 0,65% 34%,100% 28%,72% 53%,84% 88%,50% 67%,16% 88%,28% 53%,0 28%,35% 34%);
      }
      .plant-tomato-a { left:30px; top:-35px; }
      .plant-tomato-b { right:29px; top:-15px; width:15px; height:15px; }
      .plant-fan-rotor {
        font-size:0 !important; overflow:hidden; border:3px solid #555 !important;
        background:conic-gradient(#777 0 10%,#d7d4c9 10% 25%,#777 25% 35%,#d7d4c9 35% 50%,#777 50% 60%,#d7d4c9 60% 75%,#777 75% 85%,#d7d4c9 85% 100%) !important;
        box-shadow:inset 0 0 0 5px #bbb;
      }
      .plantclock-device.fan-on .plant-fan-rotor { animation:fan-spin 1.05s linear infinite !important; }

      /* #249 door-lock: explicit close action while * and # are relabelled in runtime. */
      .doorlock-close-action { margin-top:2px; }

      @media (max-width:640px) {
        .plant-stem { left:36px !important; bottom:87px !important; height:50px !important; }
        .plant-leaf { bottom:111px !important; width:30px !important; height:18px !important; }
        .plant-leaf-left { left:12px !important; }
        .plant-leaf-right { right:12px !important; }
        .plant-tomato-a { left:21px; top:-28px; width:14px; height:14px; }
        .plant-tomato-b { right:20px; top:-10px; width:13px; height:13px; }
      }
      @media (max-width:390px) {
        .ucast-channel.is-reverse.is-exiting .ucast-pedestrian { left:59px !important; }
      }
      @media (prefers-reduced-motion:reduce) {
        .plantclock-device.fan-on .plant-fan-rotor { animation:none !important; }
      }
    `;
    document.head.append(style);
  }

  if ($('.detail-photo-grid') && !$('#detail-photo-grid-style')) {
    const style = document.createElement('style');
    style.id = 'detail-photo-grid-style';
    style.textContent = `
      .detail-photo-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:16px; }
      .detail-photo-card { margin:0; background:var(--card); border:1px solid var(--line); border-radius:calc(var(--radius) + 2px); overflow:hidden; box-shadow:var(--shadow-soft); }
      .detail-photo-card img { display:block; width:100%; height:220px; object-fit:cover; background:var(--paper-2); }
      .detail-photo-card figcaption { padding:12px 14px 14px; font-size:.92rem; line-height:1.65; color:var(--ink); }
      @media (max-width:720px) {
        .detail-photo-grid { grid-template-columns:1fr; }
        .detail-photo-card img { height:auto; aspect-ratio:4/3; }
      }
    `;
    document.head.append(style);
  }

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

  const systemScheme = window.matchMedia('(prefers-color-scheme: dark)');
  function applySystemTheme() {
    document.documentElement.dataset.theme = systemScheme.matches ? 'dark' : 'light';
  }
  localStorage.removeItem('theme');
  $('#themeToggle')?.remove();
  $('#themeToggleMobile')?.remove();
  applySystemTheme();
  if (typeof systemScheme.addEventListener === 'function') systemScheme.addEventListener('change', applySystemTheme);
  else if (typeof systemScheme.addListener === 'function') systemScheme.addListener(applySystemTheme);

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

  /* #249 final acceptance — run after project-demos.js has built its controls. */
  addEventListener('DOMContentLoaded', () => {
    if (path.includes('/meal_queue_signal_counter/')) {
      const status = $('.signal-counter-device-demo .demo-live-status');
      if (status) {
        const rewrite = () => {
          const current = status.textContent || '';
          if (!/초 남음|s remaining/i.test(current)) return;
          status.dataset.ko = '20명 도달 · 빨간불 · 실기 기준 약 10초 대기';
          status.dataset.en = '20 reached · red light · about 10s on hardware';
          status.textContent = document.documentElement.lang === 'en' ? status.dataset.en : status.dataset.ko;
        };
        new MutationObserver(rewrite).observe(status, { childList:true, characterData:true, subtree:true });
        rewrite();
      }
    }

    if (path.includes('/Wall_Sina/')) {
      const root = $('[data-project-demo="wall"]');
      const detect = root ? $$('button', root).find((button) => /해수면 상승 감지|Detect rising water/.test(button.textContent)) : null;
      const reset = root ? $$('button', root).find((button) => /처음 상태로|Reset/.test(button.textContent)) : null;
      const rig = root ? $('.wall-rig', root) : null;
      const status = root ? $('.demo-live-status', root) : null;
      let token = 0;
      detect?.addEventListener('click', () => {
        const current = ++token;
        setTimeout(() => {
          if (current !== token || !rig?.classList.contains('water-detected') || rig.classList.contains('water-draining')) return;
          rig.classList.add('barrier-raised', 'buzzer-on');
          if (status) {
            status.dataset.ko = '위험 수위 조기 감지 · 장벽 상승 중';
            status.dataset.en = 'Early danger threshold · barrier rising';
            status.textContent = document.documentElement.lang === 'en' ? status.dataset.en : status.dataset.ko;
          }
        }, reduced ? 0 : 800);
      });
      reset?.addEventListener('click', () => { token += 1; });
    }

    if (path.includes('/PlantClock/')) {
      const pot = $('.plantclock-pot');
      if (pot && !$('.plant-tomato', pot)) {
        const first = document.createElement('span');
        first.className = 'plant-tomato plant-tomato-a';
        const second = document.createElement('span');
        second.className = 'plant-tomato plant-tomato-b';
        pot.append(first, second);
      }
      const rotor = $('.plant-fan-rotor');
      if (rotor) {
        rotor.textContent = '';
        rotor.setAttribute('aria-hidden', 'true');
      }
    }

    if (path.includes('/Master_Creator_Challenge/')) {
      const keypad = $('.doorlock-keypad');
      const root = $('[data-project-demo="doorlock"]');
      if (keypad && root && !$('.doorlock-close-action', root)) {
        const keys = $$('button.doorlock-key', keypad);
        const resetKey = keys.find((button) => button.textContent.trim() === '*');
        const submitKey = keys.find((button) => button.textContent.trim() === '#');
        const cKey = keys.find((button) => button.textContent.trim() === 'C');
        const english = document.documentElement.lang === 'en';
        if (resetKey) {
          resetKey.textContent = english ? 'Reset' : '초기화';
          resetKey.setAttribute('aria-label', english ? 'Reset input' : '입력 초기화');
        }
        if (submitKey) {
          submitKey.textContent = english ? 'Input' : '입력';
          submitKey.setAttribute('aria-label', english ? 'Submit password' : '비밀번호 입력');
        }
        if (cKey) {
          cKey.addEventListener('click', (event) => {
            if (cKey.dataset.qa249AllowClose === '1') return;
            event.preventDefault();
            event.stopImmediatePropagation();
          }, true);
        }
        const close = document.createElement('button');
        close.type = 'button';
        close.className = 'demo-action demo-action-secondary doorlock-close-action';
        close.textContent = english ? 'Close / Lock' : '닫힘';
        close.addEventListener('click', () => {
          const rig = $('.doorlock-rig', root);
          const status = $('.demo-live-status', root);
          if (!rig?.classList.contains('is-unlocked')) {
            if (status) {
              status.dataset.ko = '이미 잠긴 상태입니다.';
              status.dataset.en = 'The door is already locked.';
              status.textContent = english ? status.dataset.en : status.dataset.ko;
            }
            return;
          }
          if (cKey) {
            cKey.dataset.qa249AllowClose = '1';
            cKey.click();
            delete cKey.dataset.qa249AllowClose;
          }
        });
        $('.hardware-control-panel', root)?.append(close);
      }
    }
  });

  addEventListener('keydown', (event) => { if (event.key === 'Escape') closeMobile(); });
})();
