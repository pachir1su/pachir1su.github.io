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
/* 1. AOS (기존)                                                  */
/* ------------------------------------------------------------- */
if (typeof AOS !== 'undefined') {
  AOS.init({ once: true, duration: 700, easing: 'ease-out-cubic' });
}

/* ------------------------------------------------------------- */
/* 2. 커스텀 커서 (잉크 트레일 제거됨)                              */
/* ------------------------------------------------------------- */
(function initCursor() {
  const dot = document.querySelector('.cursor-dot');
  const outline = document.querySelector('.cursor-outline');
  if (!dot || !outline) return;

  document.addEventListener('mousemove', (e) => {
    dot.style.left = e.clientX + 'px';
    dot.style.top = e.clientY + 'px';
    outline.style.left = e.clientX + 'px';
    outline.style.top = e.clientY + 'px';
  });

  // 링크/버튼 호버 시 outline 강조
  document.querySelectorAll('a, button').forEach((el) => {
    el.addEventListener('mouseenter', () => {
      outline.style.transform = 'translate(-50%,-50%) scale(1.6)';
      outline.style.borderColor = 'rgba(198,59,59,0.85)';
      outline.classList.add('cursor-link');
    });
    el.addEventListener('mouseleave', () => {
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

  // 드래그 핸들러 (모바일/reduce-motion 제외)
  const allowDrag = !isMobile() && !prefersReducedMotion;
  if (allowDrag) {
    states.forEach((s) => {
      s.el.addEventListener('mousedown', (e) => {
        e.preventDefault();
        s.dragging = true;
        s.moved = false;
        s.startX = e.clientX;
        s.startY = e.clientY;
        s.baseDX = s.dx;
        s.baseDY = s.dy;
        s.el.classList.add('grabbing');
      });
    });
    document.addEventListener('mousemove', (e) => {
      states.forEach((s) => {
        if (!s.dragging) return;
        s.dx = s.baseDX + (e.clientX - s.startX);
        s.dy = s.baseDY + (e.clientY - s.startY);
        if (Math.abs(e.clientX - s.startX) + Math.abs(e.clientY - s.startY) > 4) s.moved = true;
      });
    });
    document.addEventListener('mouseup', () => {
      states.forEach((s) => {
        if (!s.dragging) return;
        s.dragging = false;
        s.el.classList.remove('grabbing');
        if (s.moved) s.el.classList.add('settled');
      });
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
  if (isMobile() || prefersReducedMotion) return;
  const cards = document.querySelectorAll('.skill-card, .project-card, .award-card, .about-card');
  cards.forEach((card) => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      // 마우스 반대편으로 그림자 (최대 ±10px)
      const sx = -x * 14;
      const sy = -y * 14 + 8;
      card.style.setProperty('--shadow-x', sx + 'px');
      card.style.setProperty('--shadow-y', sy + 'px');
    });
    card.addEventListener('mouseleave', () => {
      card.style.setProperty('--shadow-x', '0px');
      card.style.setProperty('--shadow-y', '6px');
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
    '│                                             │',
    '│  스티커는 드래그할 수 있어요.               │',
    '└─────────────────────────────────────────────┘',
  ];
  const style = 'color:#c63b3b; font-family: monospace; font-size: 12px; line-height: 1.4;';
  console.log(lines.join('\n'), style);
})();
