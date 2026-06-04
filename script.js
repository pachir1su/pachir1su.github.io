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
  AOS.init({ once: true, duration: 400, easing: 'ease-out-cubic' });
}

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
/* 타이핑 효과 — 언어 전환 시에도 재시작 가능하도록 전역 참조 */
(function initTyping() {
  const defaultWords = ['풀스택 개발자', '메이커', '아이디어 뱅크', '팀 리더', '엔지니어'];
  let wordIndex = 0, charIndex = 0, isDeleting = false, typeSpeed = 100;
  let timerId = null;
  function type() {
    const el = document.getElementById('typing-text');
    if (!el) { timerId = setTimeout(type, 200); return; }
    const words = window._typingWords || defaultWords;
    const currentWord = words[wordIndex % words.length];
    el.textContent = isDeleting
      ? currentWord.substring(0, charIndex - 1)
      : currentWord.substring(0, charIndex + 1);
    isDeleting ? charIndex-- : charIndex++;
    typeSpeed = isDeleting ? 50 : 100;
    if (!isDeleting && charIndex === currentWord.length) { isDeleting = true; typeSpeed = 2000; }
    else if (isDeleting && charIndex === 0) { isDeleting = false; wordIndex = (wordIndex + 1) % words.length; typeSpeed = 500; }
    timerId = setTimeout(type, typeSpeed);
  }
  /* 언어 전환 후 타이핑 상태 리셋 */
  window._restartTyping = function () {
    clearTimeout(timerId);
    wordIndex = 0; charIndex = 0; isDeleting = false;
    const el = document.getElementById('typing-text');
    if (el) el.textContent = '';
    timerId = setTimeout(type, 300);
  };
  type();
})();

/* ------------------------------------------------------------- */
/* 5. 모바일 메뉴 (기존)                                          */
/* ------------------------------------------------------------- */
/* 모바일 사이드바 (#66) — 오버레이 + 스크롤 잠금 */
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');
const sidebarOverlay = document.getElementById('sidebarOverlay');
if (hamburger && mobileMenu) {
  hamburger.addEventListener('click', () => {
    const open = mobileMenu.classList.toggle('open');
    hamburger.classList.toggle('open');
    hamburger.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (sidebarOverlay) sidebarOverlay.classList.toggle('active', open);
    document.body.style.overflow = open ? 'hidden' : '';
  });
}
if (sidebarOverlay) {
  sidebarOverlay.addEventListener('click', closeMobile);
}
function closeMobile() {
  if (mobileMenu) mobileMenu.classList.remove('open');
  if (hamburger) {
    hamburger.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
  }
  if (sidebarOverlay) sidebarOverlay.classList.remove('active');
  document.body.style.overflow = '';
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
      const rot = -8 + Math.random() * 16;
      stamp.style.setProperty('--stamp-rot', rot + 'deg');
      stamp.style.left = e.clientX + 'px';
      stamp.style.top = e.clientY + 'px';
      document.body.appendChild(stamp);
      setTimeout(() => stamp.remove(), 500);
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
      ampX: [6, -9, 4, -5, 7][i] || 5,
      ampY: [-11, -8, -13, -10, -9][i] || -10,
      speed: [0.0005, 0.00045, 0.0004, 0.00055, 0.00035][i] || 0.00045,
      rotBase: [-3, 2, -1.5, 2.5, -2][i] || 0,
      rotAmp: [4, -3.5, 4, -4.5, 3.5][i] || 4,
      parallax: [0.09, 0.06, -0.05, 0.11, -0.08][i] || 0.08,
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
      const duration = 500;
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
      const sx = -x * 7;
      const sy = -y * 7 + 4;
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
    setTimeout(() => hint.classList.remove('show'), 400);
    setTimeout(() => hint.remove(), 650);
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
  setTimeout(() => document.body.classList.remove('page-entry'), 450);
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

/* ------------------------------------------------------------- */
/* 18. 프로젝트 카테고리 필터 (#28)                                */
/*    연도 그룹 단위로 카드 표시/숨김, 빈 그룹은 헤더까지 숨김       */
/* ------------------------------------------------------------- */
(function initProjectFilter() {
  const btns = document.querySelectorAll('.pfilter');
  const groups = document.querySelectorAll('.year-group');
  if (!btns.length || !groups.length) return;

  btns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const filter = btn.dataset.filter;

      /* active 표시 이동 */
      btns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      /* 그룹별로 카드 필터링 후 빈 그룹 숨김 */
      groups.forEach((group) => {
        let visibleCount = 0;
        group.querySelectorAll('.project-card').forEach((card) => {
          const cats = (card.dataset.category || '').split(' ');
          const isWip = card.classList.contains('project-wip');
          const show =
            filter === 'all' ||
            (filter === 'wip' && isWip) ||
            cats.includes(filter);
          card.style.display = show ? '' : 'none';
          if (show) visibleCount++;
        });
        group.style.display = visibleCount ? '' : 'none';
      });
    });
  });
})();

/* ------------------------------------------------------------- */
/* 19. 이메일 클릭 복사 (#30)                                      */
/*    전역 selectstart 차단 때문에 클릭-복사 방식으로 제공          */
/* ------------------------------------------------------------- */

(function initEmailCopy() {
  const btn = document.getElementById('copyEmail');
  if (!btn) return;
  const addr = btn.querySelector('.email-addr');
  const hint = btn.querySelector('.copy-hint');
  const email = addr ? addr.textContent.trim() : 'capybara@koreatech.ac.kr';

  btn.addEventListener('click', async () => {
    /* 1순위: Clipboard API, 실패 시 textarea 폴백 */
    try {
      await navigator.clipboard.writeText(email);
    } catch (err) {
      try {
        const ta = document.createElement('textarea');
        ta.value = email;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand('copy');
        ta.remove();
      } catch (err2) {
        return; // 복사 불가 환경이면 조용히 종료
      }
    }
    /* 복사 완료 피드백 (1.5초) */
    if (hint) {
      const prev = hint.textContent;
      btn.classList.add('copied');
      hint.textContent = '복사됨!';
      setTimeout(() => {
        btn.classList.remove('copied');
        hint.textContent = prev;
      }, 1500);
    }
  });
})();

/* ------------------------------------------------------------- */
/* 20. 총 프로젝트 수 배지 (#20)                                   */
/*    .project-card 전체 개수를 세어 #projectTotalCount에 표시    */
/*    WIP 제외 완료 수와 WIP 수를 구분해서 "N개 완료 · M개 예정"  */
/* ------------------------------------------------------------- */
/* 전역 함수로 노출 — 언어 전환 시 재호출 */
window._updateProjectCount = function () {
  var badge = document.getElementById('projectTotalCount');
  if (!badge) return;
  var allCards = document.querySelectorAll('.project-card');
  var done = 0, wip = 0;
  allCards.forEach(function (c) {
    if (c.classList.contains('project-wip')) wip++;
    else if (!c.classList.contains('project-failed')) done++;
  });
  var lang = localStorage.getItem('lang') || 'ko';
  badge.textContent = lang === 'en'
    ? done + ' done · ' + wip + ' upcoming'
    : done + '개 완료 · ' + wip + '개 예정';
};
window._updateProjectCount();

/* ------------------------------------------------------------- */
/* 21. 🐔 치킨 모드 이스터에그 (#38)                               */
/*    hero-stats 15회 클릭 시 발동. 글리치 없음(닭 비 + 토스트).    */
/*    활성화 시 '되돌리기' 버튼 제공 → 원상 복구 (이슈 #38 댓글)    */
/* ------------------------------------------------------------- */
(function initChickenEgg() {
  const stats = document.querySelector('.hero-stats');
  if (!stats) return;

  const TRIGGER = 15;          // 발동 클릭 수
  let clicks = 0;
  let active = false;
  let rainTimer = null;
  let rollbackBtn = null;

  /* hero-stats 클릭 카운트 (이미 활성화면 무시) */
  stats.addEventListener('click', () => {
    if (active) return;
    clicks++;
    if (clicks >= TRIGGER) activate();
  });

  /* 닭 한 마리 떨어뜨리기 */
  function spawnChicken() {
    const c = document.createElement('div');
    c.className = 'chicken-drop';
    c.textContent = '🐔';
    c.style.left = Math.random() * 100 + 'vw';
    c.style.fontSize = (22 + Math.random() * 30) + 'px';
    c.style.setProperty('--sway', (Math.random() * 80 - 40) + 'px');
    const dur = 4 + Math.random() * 3;
    c.style.animationDuration = dur + 's';
    document.body.appendChild(c);
    setTimeout(() => c.remove(), dur * 1000 + 300);
  }

  /* 이스터에그 활성화 */
  function activate() {
    active = true;
    document.body.classList.add('chicken-mode');

    /* 발견 토스트 */
    const toast = document.createElement('div');
    toast.className = 'egg-toast';
    toast.textContent = '🐔 히든 모드 발견 — 꼬꼬댁!';
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 400);
    }, 2600);

    /* 첫 폭발 + 지속적인 닭 비 (reduce-motion이면 가볍게) */
    const burst = prefersReducedMotion ? 4 : 10;
    for (let i = 0; i < burst; i++) setTimeout(spawnChicken, i * 80);
    if (!prefersReducedMotion) rainTimer = setInterval(spawnChicken, 500);

    /* 되돌리기 버튼 */
    rollbackBtn = document.createElement('button');
    rollbackBtn.type = 'button';
    rollbackBtn.className = 'egg-rollback';
    rollbackBtn.innerHTML = '<i class="fas fa-rotate-left"></i> 되돌리기';
    rollbackBtn.addEventListener('click', deactivate);
    document.body.appendChild(rollbackBtn);
    requestAnimationFrame(() => rollbackBtn.classList.add('show'));
  }

  /* 원상 복구 */
  function deactivate() {
    active = false;
    clicks = 0;
    document.body.classList.remove('chicken-mode');
    if (rainTimer) { clearInterval(rainTimer); rainTimer = null; }
    document.querySelectorAll('.chicken-drop').forEach((c) => c.remove());
    if (rollbackBtn) {
      const b = rollbackBtn;
      rollbackBtn = null;
      b.classList.remove('show');
      setTimeout(() => b.remove(), 300);
    }
  }
})();

/* ------------------------------------------------------------- */
/* 22. 진행률 바 애니메이션 (#61) — 스크롤 진입 시 width 전환      */
/* ------------------------------------------------------------- */
(function initProgressBars() {
  const bars = document.querySelectorAll('.progress-fill');
  if (!bars.length) return;
  const obs = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const pct = entry.target.dataset.progress || '0';
      entry.target.style.width = pct + '%';
      obs.unobserve(entry.target);
    });
  }, { threshold: 0.3 });
  bars.forEach((bar) => obs.observe(bar));
})();

/* ------------------------------------------------------------- */
/* 23. MBTI 바 애니메이션 (#62) — 스크롤 진입 시 width 전환        */
/* ------------------------------------------------------------- */
(function initMbtiBars() {
  const fills = document.querySelectorAll('.mbti-bar-fill');
  if (!fills.length) return;
  fills.forEach((f) => { f.style.width = '0%'; });
  const obs = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const pct = entry.target.dataset.pct || '0';
      entry.target.style.width = pct + '%';
      obs.unobserve(entry.target);
    });
  }, { threshold: 0.3 });
  fills.forEach((f) => obs.observe(f));
})();

/* ------------------------------------------------------------- */
/* 24. 프로젝트 필터 — 실패 카테고리 지원 (#60)                    */
/*    기존 #18 필터에 'failed' 필터 추가 (project-failed 클래스)   */
/* ------------------------------------------------------------- */
(function patchFailedFilter() {
  const btns = document.querySelectorAll('.pfilter');
  const groups = document.querySelectorAll('.year-group');
  if (!btns.length || !groups.length) return;

  btns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const filter = btn.dataset.filter;
      groups.forEach((group) => {
        let visibleCount = 0;
        group.querySelectorAll('.project-card').forEach((card) => {
          const cats = (card.dataset.category || '').split(' ');
          const isWip = card.classList.contains('project-wip');
          const isFailed = card.classList.contains('project-failed');
          const show =
            filter === 'all' ||
            (filter === 'wip' && isWip) ||
            (filter === 'failed' && isFailed) ||
            cats.includes(filter);
          card.style.display = show ? '' : 'none';
          if (show) visibleCount++;
        });
        group.style.display = visibleCount ? '' : 'none';
      });
    });
  });
})();

/* ------------------------------------------------------------- */
/* 25. 다크 모드 토글 (#68)                                        */
/*    localStorage로 상태 유지, 시스템 다크 모드 감지 지원           */
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
    if (icon) {
      icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
    }
    if (iconMobile) {
      iconMobile.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
    }
    if (labelMobile) {
      labelMobile.textContent = isDark ? '라이트 모드' : '다크 모드';
    }
    if (toggle) toggle.title = isDark ? '라이트 모드' : '다크 모드';
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
/* 26. 영어/한국어 전환 토글 (#67)                                 */
/*    셀렉터 → 번역 텍스트 매핑으로 주요 UI 텍스트 교체            */
/* ------------------------------------------------------------- */
(function initLangToggle() {
  const toggle = document.getElementById('langToggle');
  const toggleMobile = document.getElementById('langToggleMobile');
  if (!toggle) return;

  /* 번역 맵 — 셀렉터 기반 (data-i18n 불필요) */
  const translations = {
    en: {
      /* 네비게이션 */
      '.nav-links li:nth-child(1) a': 'Home',
      '.nav-links li:nth-child(2) a': 'Vision',
      '.nav-links li:nth-child(3) a': 'Skills',
      '.nav-links li:nth-child(4) a': 'Awards',
      '.nav-links li:nth-child(5) a': 'Projects',
      /* 모바일 메뉴 */
      '.mobile-menu a:nth-of-type(1)': ' Home',
      '.mobile-menu a:nth-of-type(2)': ' Vision',
      '.mobile-menu a:nth-of-type(3)': ' Skills',
      '.mobile-menu a:nth-of-type(4)': ' Awards',
      '.mobile-menu a:nth-of-type(5)': ' Projects',
      '.mobile-menu a:nth-of-type(6)': ' GitHub',
      /* 히어로 */
      '.hero-tag': 'Hello',
      '.hero-role': { html: 'Innovator &amp; <span class="typing-wrap"><span id="typing-text"></span><span class="typing-cursor"></span></span>' },
      '.hero-desc': { html: 'I dream of being an entrepreneur who pursues <strong>innovation</strong> beyond profit.<br /><strong>1 million monthly users</strong> — that\'s my goal.' },
      '.btn-primary': { html: '<i class="fas fa-folder-open"></i> Projects' },
      '.stat-label': ['Projects', 'Awards', 'out of 581'],
      /* 섹션 헤더 */
      '#about .section-title': 'Vision',
      '#skills .section-title': 'Skills',
      '#awards .section-title': 'Awards',
      '#projects .section-title': 'Projects',
      /* About */
      '.about-quote': '"An innovator who turns ideas into reality"',
      '.about-body': { html: '<p>Hello, I\'m <strong>Lee Geon Yeong</strong>, someone who goes beyond simple development to plan and create services that can change the world. I aspire to be an <strong>entrepreneur</strong>, not just a businessman — creating unprecedented value and driving innovation through technology.</p><p>Whenever an idea strikes, I document and refine it. To make these ideas a reality, I study <strong>AI, Communications, Web/App Development, Embedded, Hardware, Information Security, Hacking, DB, and Planning</strong> — with no boundaries on the field.</p>' },
      '.chip:nth-child(1)': { html: '<i class="fas fa-rocket"></i> Goal: 1M Monthly Users' },
      '.chip:nth-child(2)': { html: '<i class="fas fa-lightbulb"></i> Idea Bank' },
      '.chip:nth-child(3)': { html: '<i class="fas fa-users"></i> Team Lead Experience' },
      '.edu-school': 'Korea University of Technology and Education',
      '.edu-sub': 'KOREATECH · Enrolled',
      '.github-activity-btn': { html: '<i class="fab fa-github"></i> GitHub Activity' },
      /* MBTI */
      '.mbti-traits-header': 'Bold Commander',
      '.mbti-tag': ['Leadership', 'Efficiency', 'Strategic', 'Confidence', 'Challenger', 'Planner'],
      /* 하위 라벨 */
      '.mbti-block .subsection-label': { html: '<i class="fas fa-brain"></i> MBTI' },
      '.github-activity .subsection-label': { html: '<i class="fab fa-github"></i> GitHub Activity' },
      '.cert-block .subsection-label': { html: '<i class="fas fa-certificate"></i> Certifications' },
      '#featured-section > .subsection-label': { html: '<i class="fas fa-star"></i> Featured Projects' },
      '.mindmap-block .subsection-label': { html: '<i class="fas fa-project-diagram"></i> Project Mindmap' },
      '#all-projects-section': { html: '<i class="fas fa-folder-open"></i> All Projects <span id="projectTotalCount" class="project-count-badge"></span>' },
      /* 필터 */
      '.pfilter[data-filter="all"]': 'All',
      '.pfilter[data-filter="ai"]': 'AI · ML',
      '.pfilter[data-filter="hardware"]': 'Hardware',
      '.pfilter[data-filter="discord"]': 'Discord Bot',
      '.pfilter[data-filter="web"]': 'Web',
      '.pfilter[data-filter="contest"]': 'Contest',
      '.pfilter[data-filter="wip"]': 'WIP',
      '.pfilter[data-filter="failed"]': 'Failed',
      /* 연도 헤더 */
      '.year-group-wip .year-heading': 'In Progress / Planned',
      '.year-group-failed .year-heading': 'Failed Projects',
      /* 푸터 */
      '.footer-copy': '© 2026 Lee Geon Yeong. All rights reserved.',
      '.copy-hint': 'Copy',
      /* 섹션 네비게이터 */
      '[data-nav-section="home"] .nav-bookmark-label': 'Home',
      '[data-nav-section="about"] .nav-bookmark-label': 'Vision',
      '[data-nav-section="mbti-section"] .nav-bookmark-label': 'MBTI',
      '[data-nav-section="github-section"] .nav-bookmark-label': 'GitHub',
      '[data-nav-section="skills"] .nav-bookmark-label': 'Skills',
      '[data-nav-section="awards"] .nav-bookmark-label': 'Awards',
      '[data-nav-section="cert-section"] .nav-bookmark-label': 'Certs',
      '[data-nav-section="featured-section"] .nav-bookmark-label': 'Featured',
      '[data-nav-section="mindmap-section"] .nav-bookmark-label': 'Map',
      '[data-nav-section="all-projects-section"] .nav-bookmark-label': 'All',
      /* 맨 위로 */
      '#btn-back-to-top': { attr: { title: 'Back to top', 'aria-label': 'Back to top' } },
      '.scroll-hint span': 'Scroll',
    },
    ko: {
      '.nav-links li:nth-child(1) a': '홈',
      '.nav-links li:nth-child(2) a': '비전',
      '.nav-links li:nth-child(3) a': '역량',
      '.nav-links li:nth-child(4) a': '수상',
      '.nav-links li:nth-child(5) a': '프로젝트',
      '.mobile-menu a:nth-of-type(1)': ' 홈',
      '.mobile-menu a:nth-of-type(2)': ' 비전',
      '.mobile-menu a:nth-of-type(3)': ' 역량',
      '.mobile-menu a:nth-of-type(4)': ' 수상',
      '.mobile-menu a:nth-of-type(5)': ' 프로젝트',
      '.mobile-menu a:nth-of-type(6)': ' GitHub',
      '.hero-tag': '안녕하세요',
      '.hero-role': { html: '혁신의 기업가 &amp; <span class="typing-wrap"><span id="typing-text"></span><span class="typing-cursor"></span></span>' },
      '.hero-desc': { html: '이윤을 넘어 <strong>혁신</strong>을 추구하는 기업가를 꿈꿉니다.<br /><strong>월 100만 명</strong>이 사용하는 서비스를 만드는 것이 목표입니다.' },
      '.btn-primary': { html: '<i class="fas fa-folder-open"></i> 프로젝트 보기' },
      '.stat-label': ['프로젝트', '수상 경력', '581 팀 중'],
      '#about .section-title': '비전',
      '#skills .section-title': '역량',
      '#awards .section-title': '수상',
      '#projects .section-title': '프로젝트',
      '.about-quote': '"아이디어를 현실로 만드는 혁신가"',
      '.about-body': { html: '<p>안녕하세요, 저는 단순한 개발을 넘어 세상을 바꿀 서비스를 기획하고 만드는 <strong>이건영</strong>입니다. 저는 사업가가 아닌 <strong>기업가</strong>를 지향합니다. 이윤을 쫓기보다 기술을 통해 세상에 없던 가치를 창출하고 혁신을 일으키고 싶습니다.</p><p>떠오르는 아이디어가 있을 때마다 구체화하여 기록하고 있으며 이를 실현하기 위해 <strong>AI, 통신, 웹/앱 개발, 임베디드, 하드웨어, 정보보안, 해킹, DB, 기획</strong> 등 분야를 가리지 않고 기술을 익히고 있습니다.</p>' },
      '.chip:nth-child(1)': { html: '<i class="fas fa-rocket"></i> 목표 : 월 100만명 유저 서비스' },
      '.chip:nth-child(2)': { html: '<i class="fas fa-lightbulb"></i> 아이디어 뱅크' },
      '.chip:nth-child(3)': { html: '<i class="fas fa-users"></i> 팀장 경험 多' },
      '.edu-school': '한국기술교육대학교',
      '.edu-sub': 'KOREATECH · 재학 중',
      '.github-activity-btn': { html: '<i class="fab fa-github"></i> GitHub 활동 보러가기' },
      '.mbti-traits-header': '대담한 통솔자',
      '.mbti-tag': ['리더십', '효율성', '전략적 사고', '자신감', '도전 정신', '계획적'],
      '.mbti-block .subsection-label': { html: '<i class="fas fa-brain"></i> MBTI' },
      '.github-activity .subsection-label': { html: '<i class="fab fa-github"></i> GitHub 활동' },
      '.cert-block .subsection-label': { html: '<i class="fas fa-certificate"></i> 자격증' },
      '#featured-section > .subsection-label': { html: '<i class="fas fa-star"></i> 대표 프로젝트' },
      '.mindmap-block .subsection-label': { html: '<i class="fas fa-project-diagram"></i> 프로젝트 마인드맵' },
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
      '[data-nav-section="home"] .nav-bookmark-label': '홈',
      '[data-nav-section="about"] .nav-bookmark-label': '비전',
      '[data-nav-section="mbti-section"] .nav-bookmark-label': 'MBTI',
      '[data-nav-section="github-section"] .nav-bookmark-label': 'GitHub',
      '[data-nav-section="skills"] .nav-bookmark-label': '역량',
      '[data-nav-section="awards"] .nav-bookmark-label': '수상',
      '[data-nav-section="cert-section"] .nav-bookmark-label': '자격증',
      '[data-nav-section="featured-section"] .nav-bookmark-label': '대표',
      '[data-nav-section="mindmap-section"] .nav-bookmark-label': '마인드맵',
      '[data-nav-section="all-projects-section"] .nav-bookmark-label': '전체',
      '#btn-back-to-top': { attr: { title: '맨 위로', 'aria-label': '맨 위로' } },
      '.scroll-hint span': '스크롤',
    }
  };

  /* 영어 타이핑 단어 목록 */
  const typingWordsEN = ['Full-Stack Dev', 'Maker', 'Idea Bank', 'Team Leader', 'Engineer'];
  const typingWordsKO = ['풀스택 개발자', '메이커', '아이디어 뱅크', '팀 리더', '엔지니어'];

  let currentLang = localStorage.getItem('lang') || 'ko';

  function applyLang(lang) {
    currentLang = lang;
    localStorage.setItem('lang', lang);
    const map = translations[lang];
    if (!map) return;

    Object.entries(map).forEach(([selector, value]) => {
      if (value && value.skip) return;

      /* 배열 — 같은 셀렉터로 여러 요소에 순서대로 매핑 */
      if (Array.isArray(value)) {
        const els = document.querySelectorAll(selector);
        els.forEach((el, i) => {
          if (i < value.length) el.textContent = value[i];
        });
        return;
      }

      /* 객체 — html 또는 attr */
      if (typeof value === 'object') {
        if (value.html !== undefined) {
          const el = document.querySelector(selector);
          if (el) el.innerHTML = value.html;
        }
        if (value.attr) {
          const el = document.querySelector(selector);
          if (el) {
            Object.entries(value.attr).forEach(([k, v]) => el.setAttribute(k, v));
          }
        }
        return;
      }

      /* 문자열 — textContent */
      const el = document.querySelector(selector);
      if (el) el.textContent = value;
    });

    /* MBTI 태그 — 아이콘 포함이므로 별도 처리 */
    const tagIcons = ['fa-crown', 'fa-bullseye', 'fa-chess', 'fa-bolt', 'fa-mountain', 'fa-calendar-check'];
    const tagTexts = translations[lang]['.mbti-tag'];
    if (tagTexts) {
      document.querySelectorAll('.mbti-tag').forEach((el, i) => {
        if (i < tagTexts.length) {
          el.innerHTML = '<i class="fas ' + tagIcons[i] + '"></i> ' + tagTexts[i];
        }
      });
    }

    /* 모바일 메뉴 — 아이콘 보존 */
    const mobileIcons = ['fa-home', 'fa-user', 'fa-code', 'fa-trophy', 'fa-folder-open', 'fa-github'];
    const mobileLabels = lang === 'en'
      ? ['Home', 'Vision', 'Skills', 'Awards', 'Projects', 'GitHub']
      : ['홈', '비전', '역량', '수상', '프로젝트', 'GitHub'];
    document.querySelectorAll('.mobile-menu > a').forEach((a, i) => {
      if (i < mobileIcons.length) {
        const iconClass = i === 5 ? 'fab' : 'fas';
        a.innerHTML = '<i class="' + iconClass + ' ' + mobileIcons[i] + '"></i> ' + mobileLabels[i];
        a.setAttribute('onclick', 'closeMobile()');
      }
    });

    /* data-en / data-ko 속성 기반 번역 (스킬·수상·프로젝트 등 대량 텍스트) */
    document.querySelectorAll('[data-en][data-ko]').forEach(function (el) {
      var text = lang === 'en' ? el.dataset.en : el.dataset.ko;
      var first = el.firstElementChild;
      if (first && first.tagName === 'I') {
        el.innerHTML = first.outerHTML + ' ' + text;
      } else {
        el.textContent = text;
      }
    });
    document.querySelectorAll('[data-en-html][data-ko-html]').forEach(function (el) {
      el.innerHTML = lang === 'en' ? el.dataset.enHtml : el.dataset.koHtml;
    });

    /* 프로젝트 수 배지 재계산 */
    if (typeof window._updateProjectCount === 'function') window._updateProjectCount();

    /* 타이핑 효과 단어 교체 + 재시작 */
    window._typingWords = lang === 'en' ? typingWordsEN : typingWordsKO;
    if (typeof window._restartTyping === 'function') window._restartTyping();

    /* 토글 버튼 라벨 업데이트 */
    const langLabel = toggle.querySelector('.lang-label');
    const langLabelMobile = document.querySelector('.lang-label-mobile');
    if (langLabel) langLabel.textContent = lang === 'ko' ? 'EN' : 'KO';
    if (langLabelMobile) langLabelMobile.textContent = lang === 'ko' ? 'English' : '한국어';
    toggle.title = lang === 'ko' ? 'English' : '한국어';
  }

  function toggleLang() {
    applyLang(currentLang === 'ko' ? 'en' : 'ko');
  }

  /* 타이핑 효과에서 단어 목록 참조 */
  window._typingWords = currentLang === 'en' ? typingWordsEN : typingWordsKO;

  if (currentLang !== 'ko') applyLang(currentLang);
  toggle.addEventListener('click', toggleLang);
  if (toggleMobile) toggleMobile.addEventListener('click', toggleLang);
})();

/* ------------------------------------------------------------- */
/* 27. 우측 플로팅 섹션 네비게이터 (#72)                           */
/*    IntersectionObserver로 현재 섹션 감지, 책갈피 활성 표시       */
/* ------------------------------------------------------------- */
(function initSectionNav() {
  const navItems = document.querySelectorAll('.section-nav-item');
  const sectionIds = [
    'home', 'about', 'mbti-section', 'github-section',
    'skills', 'awards', 'cert-section',
    'featured-section', 'mindmap-section', 'all-projects-section'
  ];
  const sections = sectionIds
    .map(function (id) { return document.getElementById(id); })
    .filter(Boolean);
  if (!navItems.length || !sections.length) return;

  /* 클릭 시 smooth scroll */
  navItems.forEach(function (item) {
    item.addEventListener('click', function (e) {
      e.preventDefault();
      var targetId = item.getAttribute('href');
      var target = document.querySelector(targetId);
      if (target) target.scrollIntoView({ behavior: 'smooth' });
    });
  });

  /* IntersectionObserver — 현재 보이는 섹션/하위섹션 감지 */
  var currentActive = 'home';
  /* rootMargin: 뷰포트 상단 20%~하단 70% 영역을 감시 대역으로 설정 */
  var obs = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        currentActive = entry.target.id;
        navItems.forEach(function (item) {
          item.classList.toggle('active', item.dataset.navSection === currentActive);
        });
      }
    });
  }, {
    threshold: 0,
    rootMargin: '-20% 0px -70% 0px'
  });

  sections.forEach(function (s) { obs.observe(s); });
})();
