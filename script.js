/* =============================================================
   pachir1su.github.io — 노트 테마 인터랙션 스크립트
   기존 기능: AOS / 커스텀 커서 / 프로그레스 / 타이핑 / 햄버거 /
             back-to-top / 우클릭·드래그·선택 차단
   추가 기능: 잉크 트레일 / 형광펜 sweep / 도장 클릭 / 스티커 드래그 /
             스탯 카운트업 / floatUp 패럴랙스 / 키보드 단축키 /
             콘솔 이스터에그 / 카드 깊이 그림자 / 텍스트 선택 시 형광펜
   ============================================================= */

const isMobile = () => window.matchMedia('(max-width: 768px)').matches;
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ------------------------------------------------------------- */
/* 0. 디바이스 티어 / 포인터 능력 감지                              */
/* ------------------------------------------------------------- */
const deviceTier = () => {
  const w = window.innerWidth;
  if (w <= 360) return 'fold-narrow';
  if (w <= 480) return 'phone';
  if (w <= 720) return 'fold';
  if (w <= 1024) return 'tablet';
  if (w <= 1599) return 'desktop';
  return 'wide';
};
const hoverCapable = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const isTouchDevice = () => window.matchMedia('(hover: none) and (pointer: coarse)').matches;

function applyDeviceAttrs() {
  document.body.dataset.device = deviceTier();
  document.body.dataset.orient = window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
  document.body.dataset.hover = hoverCapable() ? 'mouse' : 'touch';
}
applyDeviceAttrs();

/* 햅틱 헬퍼 — iOS 미지원이면 조용히 패스 */
function buzz(ms) {
  if (prefersReducedMotion) return;
  try {
    if (typeof navigator.vibrate === 'function') navigator.vibrate(ms);
  } catch (_) { /* noop */ }
}

/* ------------------------------------------------------------- */
/* 1. AOS (기존)                                                  */
/* ------------------------------------------------------------- */
if (typeof AOS !== 'undefined') {
  AOS.init({ once: true, duration: 700, easing: 'ease-out-cubic' });
}

/* ------------------------------------------------------------- */
/* 2. 커스텀 커서 — hover/fine 포인터에서만, pointermove 사용       */
/* ------------------------------------------------------------- */
(function initCursor() {
  const dot = document.querySelector('.cursor-dot');
  const outline = document.querySelector('.cursor-outline');
  if (!dot || !outline) return;
  if (!hoverCapable()) { dot.style.display = 'none'; outline.style.display = 'none'; return; }

  // mouse만 트래킹 (pen/touch 제외)
  document.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    dot.style.left = e.clientX + 'px';
    dot.style.top = e.clientY + 'px';
    outline.style.left = e.clientX + 'px';
    outline.style.top = e.clientY + 'px';
    // CSS 변수로 포인터 패럴랙스 노출
    const px = e.clientX / window.innerWidth;
    const py = e.clientY / window.innerHeight;
    document.documentElement.style.setProperty('--pointer-x', px.toFixed(3));
    document.documentElement.style.setProperty('--pointer-y', py.toFixed(3));
  }, { passive: true });

  // 링크/버튼 호버 시 outline 강조
  document.querySelectorAll('a, button').forEach((el) => {
    el.addEventListener('pointerenter', (e) => {
      if (e.pointerType !== 'mouse') return;
      outline.style.transform = 'translate(-50%,-50%) scale(1.6)';
      outline.style.borderColor = 'rgba(198,59,59,0.85)';
      outline.classList.add('cursor-link');
    });
    el.addEventListener('pointerleave', (e) => {
      if (e.pointerType !== 'mouse') return;
      outline.style.transform = 'translate(-50%,-50%) scale(1)';
      outline.style.borderColor = 'rgba(198,59,59,0.5)';
      outline.classList.remove('cursor-link');
    });
  });
})();

/* ------------------------------------------------------------- */
/* 3. 프로그레스 바 + Back-to-top (기존, scroll listener 통합)      */
/* ------------------------------------------------------------- */
const backBtn = document.getElementById('btn-back-to-top');
const myBar = document.getElementById('myBar');

if (backBtn) {
  backBtn.style.alignItems = 'center';
  backBtn.style.justifyContent = 'center';
  backBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

/* ------------------------------------------------------------- */
/* 4. 타이핑 효과 (기존)                                          */
/* ------------------------------------------------------------- */
(function initTyping() {
  const typingText = document.getElementById('typing-text');
  if (!typingText) return;
  const words = ['풀스택 개발자', '메이커', '아이디어 뱅크', '팀 리더', '엔지니어'];
  let wordIndex = 0, charIndex = 0, isDeleting = false, typeSpeed = 100;
  function type() {
    const currentWord = words[wordIndex];
    typingText.textContent = isDeleting
      ? currentWord.substring(0, charIndex - 1)
      : currentWord.substring(0, charIndex + 1);
    isDeleting ? charIndex-- : charIndex++;
    typeSpeed = isDeleting ? 50 : 100;
    if (!isDeleting && charIndex === currentWord.length) { isDeleting = true; typeSpeed = 2000; }
    else if (isDeleting && charIndex === 0) { isDeleting = false; wordIndex = (wordIndex + 1) % words.length; typeSpeed = 500; }
    setTimeout(type, typeSpeed);
  }
  type();
})();

/* ------------------------------------------------------------- */
/* 5. 모바일 메뉴 (기존)                                          */
/* ------------------------------------------------------------- */
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');
if (hamburger && mobileMenu) {
  hamburger.addEventListener('click', () => {
    mobileMenu.classList.toggle('open');
    hamburger.classList.toggle('open');
  });
}
function closeMobile() {
  if (mobileMenu) mobileMenu.classList.remove('open');
  if (hamburger) hamburger.classList.remove('open');
}

/* ------------------------------------------------------------- */
/* 6. 우클릭/드래그/선택 차단 (강화)                              */
/*    좌클릭 드래그 자체를 mousedown 단계에서 차단                  */
/*    interactive 요소(.fi 포함)는 예외로 둬서 클릭/드래그 살림      */
/* ------------------------------------------------------------- */
const INTERACTIVE = 'a, button, input, textarea, select, label, .fi';
document.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('dragstart', (e) => e.preventDefault());
document.addEventListener('selectstart', (e) => e.preventDefault());
document.addEventListener('mousedown', (e) => {
  if (e.button !== 0) return; // 좌클릭만
  if (e.target.closest(INTERACTIVE)) return;
  e.preventDefault();
});

/* ------------------------------------------------------------- */
/* 7. 도장 클릭 효과 (신규) — .btn / .plink / .chip / .wip-badge   */
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
      const rot = -15 + Math.random() * 30;
      stamp.style.setProperty('--stamp-rot', rot + 'deg');
      stamp.style.left = e.clientX + 'px';
      stamp.style.top = e.clientY + 'px';
      document.body.appendChild(stamp);
      setTimeout(() => stamp.remove(), 900);
    });
  });
})();

/* ------------------------------------------------------------- */
/* 8. 떠다니는 스티커 — JS rAF 통합 (float + drag + scroll)       */
/* ------------------------------------------------------------- */
(function initStickerSystem() {
  const stickers = Array.from(document.querySelectorAll('.fi'));
  if (!stickers.length) return;

  // 스티커별 메타데이터
  const states = stickers.map((el, i) => {
    el.style.pointerEvents = 'auto';
    el.style.animation = 'none'; // CSS keyframe 사용 안 함
    return {
      el,
      dx: 0,
      dy: 0,
      scrollY: 0,
      phase: Math.random() * Math.PI * 2,
      // 5개 패턴
      ampX: [12, -18, 8, -10, 14][i] || 10,
      ampY: [-22, -16, -26, -20, -18][i] || -20,
      speed: [0.00075, 0.00067, 0.0006, 0.0008, 0.00055][i] || 0.0007,
      rotBase: [-6, 4, -3, 5, -4][i] || 0,
      rotAmp: [8, -7, 8, -9, 7][i] || 8,
      parallax: [0.18, 0.12, -0.1, 0.22, -0.16][i] || 0.15,
      dragging: false,
      moved: false,
      startX: 0, startY: 0, baseDX: 0, baseDY: 0,
    };
  });

  // 드래그 핸들러 — pointer events 기반 (마우스 + 터치 + 펜 통합)
  // 더블탭/더블클릭으로 위치 리셋
  const allowDrag = !prefersReducedMotion;
  const lastTap = new WeakMap();
  if (allowDrag) {
    states.forEach((s) => {
      s.el.style.touchAction = 'none'; // 브라우저의 기본 스크롤·줌 제스처 차단

      s.el.addEventListener('pointerdown', (e) => {
        // 우클릭 등은 제외 — 좌클릭(0)/터치/펜만
        if (e.button !== undefined && e.button !== 0) return;
        e.preventDefault();
        s.dragging = true;
        s.moved = false;
        s.startX = e.clientX;
        s.startY = e.clientY;
        s.baseDX = s.dx;
        s.baseDY = s.dy;
        s.activePointerId = e.pointerId;
        try { s.el.setPointerCapture(e.pointerId); } catch (_) { /* noop */ }
        s.el.classList.add('grabbing');
        buzz(6);

        // 더블탭 감지 → 위치 리셋
        const now = performance.now();
        const prev = lastTap.get(s.el) || 0;
        if (now - prev < 320) {
          s.dx = 0;
          s.dy = 0;
          s.el.classList.remove('settled');
          buzz(12);
          lastTap.set(s.el, 0);
        } else {
          lastTap.set(s.el, now);
        }
      });

      s.el.addEventListener('pointermove', (e) => {
        if (!s.dragging || e.pointerId !== s.activePointerId) return;
        s.dx = s.baseDX + (e.clientX - s.startX);
        s.dy = s.baseDY + (e.clientY - s.startY);
        if (Math.abs(e.clientX - s.startX) + Math.abs(e.clientY - s.startY) > 4) s.moved = true;
      });

      function release(e) {
        if (!s.dragging) return;
        if (e && e.pointerId !== s.activePointerId) return;
        s.dragging = false;
        s.el.classList.remove('grabbing');
        if (s.moved) s.el.classList.add('settled');
        try { s.el.releasePointerCapture(s.activePointerId); } catch (_) { /* noop */ }
      }
      s.el.addEventListener('pointerup', release);
      s.el.addEventListener('pointercancel', release);
      s.el.addEventListener('lostpointercapture', release);
    });
  }

  // 스크롤 패럴랙스
  function updateScroll() {
    const y = window.scrollY;
    states.forEach((s) => { s.scrollY = y * s.parallax; });
  }
  window.addEventListener('scroll', updateScroll, { passive: true });
  updateScroll();

  // rAF 루프: 각 스티커의 transform 갱신
  function loop(t) {
    states.forEach((s) => {
      // float 부분 (드래그 안 했을 때만 — 옮긴 자리 유지)
      let fx = 0, fy = 0, fr = 0;
      if (!s.el.classList.contains('settled') && !prefersReducedMotion) {
        const a = Math.sin(t * s.speed + s.phase);
        fx = s.ampX * (a * 0.5 + 0.5);
        fy = s.ampY * (a * 0.5 + 0.5);
        fr = s.rotAmp * a;
      }
      const tx = s.dx + fx;
      const ty = s.dy + s.scrollY + fy;
      const rot = s.rotBase + fr;
      s.el.style.transform = `translate(${tx}px, ${ty}px) rotate(${rot}deg)`;
    });
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();

/* ------------------------------------------------------------- */
/* 9. 스탯 카운트업 (신규) — hero-stats 진입 시                   */
/* ------------------------------------------------------------- */
(function initStatCounter() {
  const stats = document.querySelectorAll('.stat-num');
  if (!stats.length) return;
  // 원본 텍스트 저장 (예: "10+", "3", "8위")
  stats.forEach((el) => {
    const txt = el.textContent.trim();
    const m = txt.match(/^(\d+)(.*)$/);
    if (!m) return;
    el.dataset.target = m[1];
    el.dataset.suffix = m[2];
    el.textContent = '0' + m[2];
  });
  const obs = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = parseInt(el.dataset.target, 10);
      const suffix = el.dataset.suffix || '';
      if (isNaN(target)) return;
      let curr = 0;
      const duration = 900;
      const start = performance.now();
      function tick(t) {
        const p = Math.min(1, (t - start) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        curr = Math.round(target * eased);
        el.textContent = curr + suffix;
        if (p < 1) requestAnimationFrame(tick);
        else el.textContent = target + suffix;
      }
      requestAnimationFrame(tick);
      obs.unobserve(el);
    });
  }, { threshold: 0.5 });
  stats.forEach((el) => obs.observe(el));
})();

/* 10. 스크롤 패럴랙스는 7번(스티커 시스템) rAF 루프에 통합됨 */

/* ------------------------------------------------------------- */
/* 11. 통합 scroll 핸들러 (프로그레스 + back-to-top)              */
/* ------------------------------------------------------------- */
(function initScroll() {
  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const winScroll = document.documentElement.scrollTop || document.body.scrollTop;
      const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const ratio = height > 0 ? (winScroll / height) : 0;
      if (myBar) myBar.style.width = (ratio * 100) + '%';
      if (backBtn) {
        if (winScroll > 300) backBtn.classList.add('visible');
        else backBtn.classList.remove('visible');
      }
      // 종이 진행도 (custom property)
      document.documentElement.style.setProperty('--scroll-progress', ratio.toFixed(3));
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

/* ------------------------------------------------------------- */
/* 12. 카드 호버 시 마우스 위치 따라 그림자 살짝 기울임 (신규)    */
/*     transform 회전은 안 함 (사용자가 tilt 싫어함)              */
/*     단, 그림자 방향만 마우스 반대편으로 길어짐                 */
/* ------------------------------------------------------------- */
(function initShadowFollow() {
  if (prefersReducedMotion || !hoverCapable()) return;
  const cards = document.querySelectorAll('.skill-card, .project-card, .award-card, .about-card');
  cards.forEach((card) => {
    card.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      // 마우스 반대편으로 그림자 (최대 ±14px)
      const sx = -x * 14;
      const sy = -y * 14 + 8;
      card.style.setProperty('--shadow-x', sx + 'px');
      card.style.setProperty('--shadow-y', sy + 'px');
    });
    card.addEventListener('pointerleave', (e) => {
      if (e.pointerType !== 'mouse') return;
      card.style.setProperty('--shadow-x', '0px');
      card.style.setProperty('--shadow-y', '6px');
    });
  });
})();

/* 터치 디바이스 — 카드 탭 시 0.45s 살짝 들림 효과 */
(function initTouchCardLift() {
  if (prefersReducedMotion || hoverCapable()) return;
  const cards = document.querySelectorAll('.skill-card, .project-card, .award-card, .about-card');
  cards.forEach((card) => {
    card.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse') return;
      // 링크/버튼을 누르면 들어올림 효과 생략
      if (e.target.closest('a, button, .fi')) return;
      card.classList.add('tapped');
      buzz(4);
      setTimeout(() => card.classList.remove('tapped'), 460);
    });
  });
})();

/* ------------------------------------------------------------- */
/* 13. 키보드 단축키 (신규)                                       */
/*    1~5: 섹션 점프, Esc: 모바일 메뉴 닫기, t: top, g: GitHub    */
/* ------------------------------------------------------------- */
(function initShortcuts() {
  const sections = ['#home', '#about', '#skills', '#awards', '#projects'];
  document.addEventListener('keydown', (e) => {
    if (e.target.matches('input, textarea')) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (k >= '1' && k <= '5') {
      const sel = sections[parseInt(k, 10) - 1];
      const target = document.querySelector(sel);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
        flashHint(sel.replace('#', '').toUpperCase());
      }
    } else if (k === 'escape') {
      closeMobile();
    } else if (k === 't') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      flashHint('TOP');
    } else if (k === 'g') {
      flashHint('OPEN GITHUB');
      setTimeout(() => window.open('https://github.com/pachir1su', '_blank'), 200);
    }
  });

  function flashHint(text) {
    const hint = document.createElement('div');
    hint.className = 'key-hint';
    hint.textContent = text;
    document.body.appendChild(hint);
    requestAnimationFrame(() => hint.classList.add('show'));
    setTimeout(() => hint.classList.remove('show'), 700);
    setTimeout(() => hint.remove(), 1100);
  }
})();

/* ------------------------------------------------------------- */
/* 14. 카드 진입 시 마스킹 테이프 sweep (신규)                    */
/* ------------------------------------------------------------- */
(function initCardEntry() {
  if (prefersReducedMotion) return;
  const cards = document.querySelectorAll('.project-card, .skill-card, .award-card');
  const obs = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('taped');
      obs.unobserve(entry.target);
    });
  }, { threshold: 0.2 });
  cards.forEach((c) => obs.observe(c));
})();

/* ------------------------------------------------------------- */
/* 15. 로고 클릭 시 흔들리는 효과                                  */
/* ------------------------------------------------------------- */
document.querySelectorAll('.logo, .footer-logo').forEach((el) => {
  el.addEventListener('click', (e) => {
    el.classList.remove('wobble');
    void el.offsetWidth;
    el.classList.add('wobble');
  });
});

/* ------------------------------------------------------------- */
/* 16. 진입 시 페이지 살짝 떨림 (한 번만)                          */
/* ------------------------------------------------------------- */
(function initPageEntry() {
  if (prefersReducedMotion) return;
  document.body.classList.add('page-entry');
  setTimeout(() => document.body.classList.remove('page-entry'), 900);
})();

/* ------------------------------------------------------------- */
/* 17. 콘솔 이스터에그                                            */
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
    '│    ?   → 단축키 패널 토글                   │',
    '│                                             │',
    '│  스티커는 드래그할 수 있어요.               │',
    '│  더블탭/더블클릭 → 위치 리셋                │',
    '│  모바일도 모든 제스처 지원                   │',
    '└─────────────────────────────────────────────┘',
  ];
  const style = 'color:#c63b3b; font-family: monospace; font-size: 12px; line-height: 1.4;';
  console.log(lines.join('\n'), style);
})();

/* ============================================================= */
/* 18. 챕터 인디케이터 (우측 dot) + 섹션 옵저버                    */
/* ============================================================= */
(function initChapterDots() {
  const aside = document.querySelector('.chapter-dots');
  if (!aside) return;
  const sections = [
    { id: 'home', label: '홈' },
    { id: 'about', label: '비전' },
    { id: 'skills', label: '역량' },
    { id: 'awards', label: '수상' },
    { id: 'projects', label: '프로젝트' },
  ];
  sections.forEach((s) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'dot';
    dot.dataset.target = s.id;
    dot.dataset.label = s.label;
    dot.setAttribute('aria-label', s.label + ' 섹션으로 이동');
    dot.addEventListener('click', () => smoothScrollTo('#' + s.id));
    aside.appendChild(dot);
  });
  requestAnimationFrame(() => aside.classList.add('ready'));

  const obs = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const id = entry.target.id;
      aside.querySelectorAll('.dot').forEach((d) => {
        d.classList.toggle('active', d.dataset.target === id);
      });
    });
  }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });
  sections.forEach((s) => {
    const el = document.getElementById(s.id);
    if (el) obs.observe(el);
  });
})();

/* ============================================================= */
/* 19. 부드러운 앵커 스크롤 + 네비바 offset                        */
/* ============================================================= */
function smoothScrollTo(hash) {
  if (!hash || hash === '#') {
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    return;
  }
  const target = document.querySelector(hash);
  if (!target) return;
  const nav = document.querySelector('.navbar');
  const navH = nav ? nav.offsetHeight : 0;
  const y = target.getBoundingClientRect().top + window.pageYOffset - navH - 8;
  window.scrollTo({ top: y, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
}
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const href = a.getAttribute('href');
  if (!href || href === '#' || href.length < 2) {
    e.preventDefault();
    smoothScrollTo('#');
    return;
  }
  // 같은 페이지 앵커만 가로채기
  if (document.querySelector(href)) {
    e.preventDefault();
    smoothScrollTo(href);
  }
});

/* ============================================================= */
/* 20. Resize / Visual Viewport / Orientation 옵저버              */
/*     디바이스 티어·방향이 바뀌면 body data-* 즉시 갱신           */
/* ============================================================= */
(function initViewportWatch() {
  let resizeTimer = null;
  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      applyDeviceAttrs();
      window.dispatchEvent(new CustomEvent('device-tier-changed'));
    }, 90);
  }
  window.addEventListener('resize', onResize, { passive: true });
  window.addEventListener('orientationchange', onResize, { passive: true });
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', onResize);
  }
})();

/* ============================================================= */
/* 21. Visibility API — 탭 비활성 시 무거운 애니메이션 중단         */
/* ============================================================= */
document.addEventListener('visibilitychange', () => {
  document.body.classList.toggle('is-hidden-tab', document.hidden);
});

/* ============================================================= */
/* 22. 포인터 패럴랙스 — hero glow & 카드 광원                     */
/* ============================================================= */
(function initPointerParallax() {
  if (prefersReducedMotion) return;
  const hero = document.querySelector('.hero');
  if (!hero) return;
  const glow = hero.querySelector('.hero-glow');
  let raf = null;
  let lastX = 0.5, lastY = 0.5;

  function update() {
    if (glow) {
      const tx = (lastX - 0.5) * 30;
      const ty = (lastY - 0.5) * 20;
      glow.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
    }
    raf = null;
  }

  function handle(e) {
    if (e.pointerType === 'mouse' && !hoverCapable()) return;
    lastX = e.clientX / window.innerWidth;
    lastY = e.clientY / window.innerHeight;
    document.documentElement.style.setProperty('--pointer-x', lastX.toFixed(3));
    document.documentElement.style.setProperty('--pointer-y', lastY.toFixed(3));
    if (!raf) raf = requestAnimationFrame(update);
  }
  window.addEventListener('pointermove', handle, { passive: true });
})();

/* ============================================================= */
/* 23. 카드 키보드 내비 — 화살표키로 grid 순회                     */
/* ============================================================= */
(function initCardKeyboardNav() {
  const groups = [
    document.querySelectorAll('.skill-card'),
    document.querySelectorAll('.award-card'),
    document.querySelectorAll('.project-card'),
  ];
  groups.forEach((cards) => {
    if (!cards.length) return;
    // roving tabindex
    cards.forEach((c, i) => {
      c.setAttribute('tabindex', i === 0 ? '0' : '-1');
    });
    cards.forEach((card, i) => {
      card.addEventListener('keydown', (e) => {
        let next = null;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = cards[i + 1];
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = cards[i - 1];
        else if (e.key === 'Home') next = cards[0];
        else if (e.key === 'End') next = cards[cards.length - 1];
        if (next) {
          e.preventDefault();
          cards.forEach((c) => c.setAttribute('tabindex', '-1'));
          next.setAttribute('tabindex', '0');
          next.focus();
        }
      });
    });
  });
})();

/* ============================================================= */
/* 24. 카드 롱프레스 — 미리보기 lift                               */
/* ============================================================= */
(function initLongPress() {
  if (prefersReducedMotion) return;
  const cards = document.querySelectorAll('.project-card, .skill-card, .award-card');
  cards.forEach((card) => {
    let timer = null;
    card.addEventListener('pointerdown', (e) => {
      if (e.target.closest('a, button, .fi')) return;
      timer = setTimeout(() => {
        card.classList.add('preview-lift');
        buzz(10);
      }, 580);
    });
    function clear() {
      clearTimeout(timer);
      card.classList.remove('preview-lift');
    }
    card.addEventListener('pointerup', clear);
    card.addEventListener('pointerleave', clear);
    card.addEventListener('pointercancel', clear);
  });
})();

/* ============================================================= */
/* 25. 두 손가락 스와이프 → 섹션 점프 (터치 전용)                  */
/* ============================================================= */
(function initSwipeNav() {
  if (!isTouchDevice()) return;
  const sectionIds = ['home', 'about', 'skills', 'awards', 'projects'];
  const pointers = new Map();
  let startTime = 0;

  function currentSection() {
    const navH = (document.querySelector('.navbar')?.offsetHeight) || 0;
    const y = window.scrollY + navH + 40;
    let idx = 0;
    sectionIds.forEach((id, i) => {
      const el = document.getElementById(id);
      if (el && el.offsetTop <= y) idx = i;
    });
    return idx;
  }

  window.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'touch') return;
    if (e.target.closest('.fi, a, button, input, textarea')) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) startTime = performance.now();
  }, { passive: true });

  window.addEventListener('pointerup', (e) => {
    if (e.pointerType !== 'touch') return;
    const start = pointers.get(e.pointerId);
    pointers.delete(e.pointerId);
    if (!start || pointers.size !== 1) return;
    // 마지막에 떼는 시점의 손가락이 2개 중 하나라면 다른 손가락은 아직 남음 — 이 분기는 두 손가락이 같은 방향으로 움직였는지 평가
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    const dt = performance.now() - startTime;
    if (dt > 500) return;
    if (Math.abs(dx) < 80 && Math.abs(dy) < 80) return;
    const idx = currentSection();
    if (Math.abs(dx) > Math.abs(dy)) {
      // 가로 — 오른쪽이면 이전, 왼쪽이면 다음
      const target = dx < 0 ? idx + 1 : idx - 1;
      if (target >= 0 && target < sectionIds.length) {
        smoothScrollTo('#' + sectionIds[target]);
        buzz(14);
      }
    } else {
      // 세로 — 아래로 스와이프 = 위로 이동 등 (관성과 일치)
      const target = dy < 0 ? idx + 1 : idx - 1;
      if (target >= 0 && target < sectionIds.length) {
        smoothScrollTo('#' + sectionIds[target]);
        buzz(14);
      }
    }
  });
  window.addEventListener('pointercancel', (e) => pointers.delete(e.pointerId));
})();

/* ============================================================= */
/* 26. 풀-투-스탬프 — 페이지 최상단에서 더 당기면 스탬프 1회        */
/* ============================================================= */
(function initPullToStamp() {
  if (!isTouchDevice()) return;
  let stampEl = document.createElement('div');
  stampEl.className = 'pull-stamp';
  stampEl.textContent = '환영합니다';
  document.body.appendChild(stampEl);

  let startY = null;
  let pulled = 0;
  let armed = false;

  window.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'touch') return;
    if (window.scrollY > 4) { startY = null; return; }
    startY = e.clientY;
    pulled = 0;
    armed = true;
  }, { passive: true });

  window.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'touch' || startY === null) return;
    if (window.scrollY > 4) { startY = null; return; }
    const d = e.clientY - startY;
    if (d <= 0) return;
    pulled = Math.min(120, d);
    stampEl.style.setProperty('--pull', pulled.toFixed(0));
    stampEl.classList.toggle('show', pulled > 30);
  }, { passive: true });

  window.addEventListener('pointerup', () => {
    if (!armed) return;
    if (pulled > 90) {
      stampEl.classList.add('snap');
      buzz(18);
      setTimeout(() => {
        stampEl.classList.remove('snap', 'show');
        stampEl.style.setProperty('--pull', '0');
      }, 650);
    } else {
      stampEl.classList.remove('show');
      stampEl.style.setProperty('--pull', '0');
    }
    armed = false;
    startY = null;
    pulled = 0;
  });
})();

/* ============================================================= */
/* 27. 햅틱 헬퍼는 모듈 0에 정의됨 — 여기서는 트리거 추가          */
/* ============================================================= */
(function initHapticHooks() {
  document.querySelectorAll('.btn, .plink, #btn-back-to-top').forEach((el) => {
    el.addEventListener('click', () => buzz(6));
  });
})();

/* ============================================================= */
/* 28. 마진 낙서 SVG — 카드 진입 시 그리기 트리거                   */
/* ============================================================= */
(function initDoodles() {
  if (prefersReducedMotion) return;
  // .doodle 가진 카드가 IntersectionObserver(14번)에서 .taped 받을 때 .draw 부여
  const obs = new MutationObserver((records) => {
    records.forEach((rec) => {
      if (rec.attributeName !== 'class') return;
      const t = rec.target;
      if (t.classList && t.classList.contains('taped')) {
        const d = t.querySelector('.doodle');
        if (d && !d.classList.contains('draw')) {
          setTimeout(() => d.classList.add('draw'), 180);
        }
      }
    });
  });
  document.querySelectorAll('.skill-card, .project-card, .award-card').forEach((c) => {
    obs.observe(c, { attributes: true });
  });
})();

/* ============================================================= */
/* 29. 이메일 카피 — 푸터 이메일 클릭 시 클립보드 복사 토스트       */
/* ============================================================= */
(function initShareMail() {
  document.querySelectorAll('a[href^="mailto:"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      // 모바일에서는 기본 mailto 동작도 같이 유지하되 클립보드 시도
      const mail = a.getAttribute('href').replace('mailto:', '');
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(mail).then(() => {
            flashStamp(e.clientX || window.innerWidth / 2, e.clientY || 100, '복사됨');
            buzz(8);
          }).catch(() => {});
        }
      } catch (_) { /* noop */ }
    });
  });
  function flashStamp(x, y, text) {
    const s = document.createElement('div');
    s.className = 'stamp-pop';
    s.textContent = text;
    s.style.left = x + 'px';
    s.style.top = y + 'px';
    s.style.setProperty('--stamp-rot', (-10 + Math.random() * 20) + 'deg');
    document.body.appendChild(s);
    setTimeout(() => s.remove(), 900);
  }
})();

/* ============================================================= */
/* 30. ripple — 버튼/링크 탭 시 잉크 번짐                          */
/* ============================================================= */
(function initRipple() {
  const targets = '.btn, .plink, .chip, .wip-badge, #btn-back-to-top, .nav-github, .social-links a';
  document.querySelectorAll(targets).forEach((el) => {
    el.addEventListener('pointerdown', (e) => {
      const rect = el.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 1.6;
      const r = document.createElement('span');
      r.className = 'ink-ripple';
      r.style.left = (e.clientX - rect.left) + 'px';
      r.style.top = (e.clientY - rect.top) + 'px';
      r.style.width = r.style.height = size + 'px';
      el.appendChild(r);
      setTimeout(() => r.remove(), 600);
    });
  });
})();

/* ============================================================= */
/* 31. 스크롤 속도 플러터 — 빠르게 스크롤하면 카드 살짝 흔들림      */
/* ============================================================= */
(function initFlutter() {
  if (prefersReducedMotion) return;
  let lastY = window.scrollY;
  let lastT = performance.now();
  let timer = null;
  window.addEventListener('scroll', () => {
    const now = performance.now();
    const dy = window.scrollY - lastY;
    const dt = now - lastT;
    const v = Math.abs(dy) / Math.max(1, dt); // px/ms
    lastY = window.scrollY;
    lastT = now;
    if (v > 2.0) {
      document.body.classList.add('is-fluttering');
      clearTimeout(timer);
      timer = setTimeout(() => document.body.classList.remove('is-fluttering'), 420);
    }
  }, { passive: true });
})();

/* ============================================================= */
/* 32. 모바일 단축키 패널 / FAB                                     */
/* ============================================================= */
(function initShortcutFab() {
  const fab = document.createElement('button');
  fab.type = 'button';
  fab.className = 'shortcut-fab';
  fab.textContent = '?';
  fab.setAttribute('aria-label', '단축키 도움말 열기');
  document.body.appendChild(fab);

  const panel = document.createElement('div');
  panel.className = 'shortcut-panel';
  panel.innerHTML = `
    <h4>단축키 / 제스처</h4>
    <div><kbd>1</kbd>~<kbd>5</kbd> 섹션 점프</div>
    <div><kbd>T</kbd> 맨 위로</div>
    <div><kbd>G</kbd> GitHub 열기</div>
    <div><kbd>Esc</kbd> 메뉴 닫기</div>
    <div style="margin-top:6px; border-top:1px dashed var(--rule); padding-top:6px;">
      <div>· 스티커 드래그 / 더블탭 리셋</div>
      <div>· 카드 롱프레스 = 미리보기</div>
      <div>· 두 손가락 스와이프 = 섹션 점프</div>
      <div>· 최상단에서 당기기 = 스탬프</div>
    </div>
  `;
  document.body.appendChild(panel);

  fab.addEventListener('click', () => {
    panel.classList.toggle('open');
  });
  document.addEventListener('keydown', (e) => {
    if (e.target.matches('input, textarea')) return;
    if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
      panel.classList.toggle('open');
    }
  });
  document.addEventListener('click', (e) => {
    if (!panel.classList.contains('open')) return;
    if (e.target.closest('.shortcut-panel, .shortcut-fab')) return;
    panel.classList.remove('open');
  });
})();

/* ============================================================= */
/* 33. 마진 낙서 SVG 자동 주입 — index의 카드들에 빈 노드 1개씩     */
/*     6종 doodle 패턴을 nth-child별로 분배                        */
/* ============================================================= */
(function injectDoodles() {
  const patterns = [
    // star
    '<polyline points="14,4 17,11 24,12 19,17 20,24 14,20 8,24 9,17 4,12 11,11" />',
    // check
    '<polyline points="6,15 12,21 22,7" />',
    // arrow
    '<line x1="6" y1="14" x2="22" y2="14" /><polyline points="16,8 22,14 16,20" />',
    // spiral
    '<path d="M14,14 m-8,0 a8,8 0 1,1 16,0 a6,6 0 1,1 -12,0 a4,4 0 1,1 8,0" />',
    // underline waves
    '<path d="M4,16 q3,-4 6,0 t6,0 t6,0 t6,0" />',
    // exclamation
    '<line x1="14" y1="6" x2="14" y2="16" /><circle cx="14" cy="22" r="1.4" />',
  ];
  document.querySelectorAll('.skill-card, .project-card, .award-card').forEach((card, i) => {
    if (card.querySelector('.doodle')) return;
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('class', 'doodle');
    svg.setAttribute('viewBox', '0 0 28 28');
    svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = patterns[i % patterns.length];
    card.style.position = card.style.position || 'relative';
    card.appendChild(svg);
  });
})();

/* ============================================================= */
/* 34. 카드에 종이 컬 모서리 추가                                   */
/* ============================================================= */
(function injectPaperCurl() {
  document.querySelectorAll('.project-card, .skill-card, .award-card').forEach((card) => {
    if (card.classList.contains('has-curl')) return;
    card.classList.add('has-curl');
    const curl = document.createElement('span');
    curl.className = 'paper-curl';
    curl.setAttribute('aria-hidden', 'true');
    card.appendChild(curl);
  });
})();
