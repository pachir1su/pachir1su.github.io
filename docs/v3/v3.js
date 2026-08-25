/* =====================================================================
   v3 공용 엔진 — 성운 렌더 · 성도 배치 · 상호작용 · 사운드 · 이스터에그
   외부 라이브러리를 쓰지 않는다. Canvas 2D와 DOM만 사용한다.

   담당 화면
   - gateway.html  : v2 홈에 뚫린 찢긴 종이 진입점과 약 4초 전환
   - universe.html : 연도 별자리 · 성장 별자리 · 궤도를 잃은 별 · 이스터에그
   ===================================================================== */
(function (global) {
  'use strict';

  var ASSETS = '../v3-constellation-prototypes/assets/';
  var reduceMotion = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* -------------------------------------------------------------------
     언어 — v2의 lang 저장값을 그대로 계승한다
     ------------------------------------------------------------------- */
  var i18n = {
    lang: 'ko',
    init: function () {
      try { this.lang = localStorage.getItem('lang') === 'en' ? 'en' : 'ko'; } catch (e) { this.lang = 'ko'; }
      this.apply();
    },
    toggle: function () {
      this.lang = this.lang === 'ko' ? 'en' : 'ko';
      try { localStorage.setItem('lang', this.lang); } catch (e) { /* 저장 불가 환경은 무시 */ }
      this.apply();
      document.dispatchEvent(new CustomEvent('v3:lang', { detail: this.lang }));
    },
    pick: function (value) {
      if (value == null) return '';
      if (typeof value === 'string') return value;
      return value[this.lang] || value.ko || value.en || '';
    },
    apply: function (root) {
      var scope = root || document;
      var lang = this.lang;
      document.documentElement.setAttribute('lang', lang === 'en' ? 'en' : 'ko');
      Array.prototype.forEach.call(scope.querySelectorAll('[data-ko],[data-en]'), function (el) {
        var text = el.getAttribute('data-' + lang);
        if (text != null) el.textContent = text;
      });
      Array.prototype.forEach.call(scope.querySelectorAll('[data-ko-html],[data-en-html]'), function (el) {
        var html = el.getAttribute('data-' + lang + '-html');
        if (html != null) el.innerHTML = html;
      });
      Array.prototype.forEach.call(scope.querySelectorAll('[data-lang-toggle]'), function (el) {
        el.textContent = lang === 'ko' ? 'EN' : 'KO';
      });
    }
  };

  /* -------------------------------------------------------------------
     사운드 — #232가 열려 있어 확정된 자리만 연결한다
     자동 재생하지 않고, 한 번 난 뒤에만 음소거 버튼이 나타난다
     ------------------------------------------------------------------- */
  var sound = {
    muted: false, ready: false, played: false, cache: {},
    map: {
      year:    ['sfx-04-year-a-wood.wav'],                                        // 확정
      select:  ['sfx-05-select-a-bell.wav'],                                      // 확정
      enter:   ['sfx-06-enter-b-three-notes.wav'],                                // 확정
      unlock:  ['sfx-10-area51-a-split.wav'],                                     // 미확정 · 임시
      serpent: ['sfx-11-ophiuchus-a-intrude.wav', 'sfx-11-ophiuchus-b-bowl.wav'], // 미확정 · 임시
      eclipse: ['sfx-13-eclipse-c-highs-first.wav']                               // 미확정 · 임시
    },
    init: function (button) {
      this.button = button || null;
      try { this.muted = localStorage.getItem('v3-mute') === '1'; } catch (e) { this.muted = false; }
      if (this.button) {
        var self = this;
        this.button.addEventListener('click', function () { self.setMuted(!self.muted); });
        this.paint();
      }
    },
    setMuted: function (value) {
      this.muted = !!value;
      try { localStorage.setItem('v3-mute', this.muted ? '1' : '0'); } catch (e) { /* 무시 */ }
      this.paint();
    },
    paint: function () {
      if (!this.button) return;
      this.button.hidden = !this.played;
      this.button.textContent = this.muted ? 'SOUND OFF' : 'SOUND ON';
      this.button.setAttribute('aria-pressed', this.muted ? 'true' : 'false');
    },
    play: function (key) {
      var files = this.map[key];
      if (!files || this.muted) return;
      var name = files[Math.floor(Math.random() * files.length)];
      var audio = this.cache[name];
      if (!audio) {
        audio = new Audio(ASSETS + 'audio/' + name);
        audio.preload = 'none';
        this.cache[name] = audio;
      }
      try {
        audio.currentTime = 0;
        var promise = audio.play();
        if (promise && promise.catch) promise.catch(function () { /* 자동재생 차단은 무시 */ });
        this.played = true;
        this.paint();
      } catch (e) { /* 재생 실패는 조용히 넘긴다 */ }
    }
  };

  /* -------------------------------------------------------------------
     성운 하늘 — 오프스크린에 한 번 그려 캐시한다
     매 프레임 다시 그리는 것은 천체 몇 개뿐이다
     ------------------------------------------------------------------- */
  function Sky(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.cache = document.createElement('canvas');
    this.seed = Math.random() * 1000;
    this.resize();
    var self = this;
    var timer = null;
    global.addEventListener('resize', function () {
      clearTimeout(timer);
      timer = setTimeout(function () { self.resize(); }, 180);
    });
  }
  Sky.prototype.tone = function () {
    // 라이트는 인쇄된 성도, 다크는 밤하늘. 같은 좌표에 팔레트만 바꾼다
    var dark = getComputedStyle(document.documentElement).getPropertyValue('--page').trim().toLowerCase();
    return dark === '#11151d' || dark === '#0d1118';
  };
  Sky.prototype.resize = function () {
    var dpr = Math.min(global.devicePixelRatio || 1, 2);
    var w = this.canvas.clientWidth || global.innerWidth;
    var h = this.canvas.clientHeight || global.innerHeight;
    this.w = w; this.h = h;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.cache.width = this.canvas.width;
    this.cache.height = this.canvas.height;
    this.paint(dpr);
  };
  Sky.prototype.paint = function (dpr) {
    var c = this.cache.getContext('2d');
    var w = this.w, h = this.h, night = this.tone();
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, w, h);

    // 1) 방향광 — 오른쪽 위에서 들어오는 옅은 빛
    var glow = c.createRadialGradient(w * 0.78, h * 0.16, 0, w * 0.78, h * 0.16, Math.max(w, h) * 0.9);
    glow.addColorStop(0, night ? 'rgba(150,141,187,.20)' : 'rgba(112,105,148,.16)');
    glow.addColorStop(0.45, night ? 'rgba(90,86,124,.08)' : 'rgba(112,105,148,.06)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = glow;
    c.fillRect(0, 0, w, h);

    // 2) 어두운 먼지 띠 — 대각선으로 가로지른다
    c.save();
    c.translate(w * 0.5, h * 0.55);
    c.rotate(-0.36);
    var dust = c.createLinearGradient(0, -h * 0.3, 0, h * 0.3);
    dust.addColorStop(0, 'rgba(0,0,0,0)');
    dust.addColorStop(0.5, night ? 'rgba(6,8,14,.34)' : 'rgba(120,124,140,.12)');
    dust.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = dust;
    c.fillRect(-w, -h * 0.3, w * 2, h * 0.6);
    c.restore();

    // 3) 별 3계층 — 먼 먼지 / 일반 별 / 밝은 별
    var rnd = mulberry(this.seed);
    var ink = night ? '224,227,235' : '36,38,54';
    var i, x, y, r;
    for (i = 0; i < 320; i++) {              // 먼 먼지
      x = rnd() * w; y = rnd() * h;
      c.fillStyle = 'rgba(' + ink + ',' + (0.10 + rnd() * 0.12).toFixed(3) + ')';
      c.fillRect(x, y, 1, 1);
    }
    for (i = 0; i < 70; i++) {               // 일반 별 — 순수한 점
      x = rnd() * w; y = rnd() * h; r = 0.7 + rnd() * 0.7;
      c.beginPath();
      c.arc(x, y, r, 0, Math.PI * 2);
      c.fillStyle = 'rgba(' + ink + ',' + (0.36 + rnd() * 0.34).toFixed(3) + ')';
      c.fill();
    }
    for (i = 0; i < 7; i++) {                // 밝은 별 — 옅은 달무리
      x = rnd() * w; y = rnd() * h * 0.8;
      var halo = c.createRadialGradient(x, y, 0, x, y, 22);
      halo.addColorStop(0, 'rgba(' + ink + ',.55)');
      halo.addColorStop(0.18, 'rgba(' + ink + ',.20)');
      halo.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = halo;
      c.beginPath();
      c.arc(x, y, 22, 0, Math.PI * 2);
      c.fill();
      if (i === 0) this.moon = { x: x, y: y }; // 일식 이스터에그 기준점
    }
    var target = this.ctx;
    target.setTransform(1, 0, 0, 1, 0, 0);
    target.clearRect(0, 0, this.canvas.width, this.canvas.height);
    target.drawImage(this.cache, 0, 0);
  };

  // 결정적 난수 — 같은 seed면 같은 하늘
  function mulberry(seed) {
    var t = seed >>> 0;
    return function () {
      t += 0x6D2B79F5;
      var r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* -------------------------------------------------------------------
     성도 형태 — 연도마다 다른 폴리라인. 형태가 겹치면 안 된다 (#114)
     정규 좌표 0..1. 넓은 화면용과 좁은 화면용을 따로 둔다
     ------------------------------------------------------------------- */
  var SHAPES = {
    // 2026 — 긴 사슬. 오른쪽 위에서 왼쪽 아래로 흘러내린다
    '2026': {
      wide:   [[0.92, 0.10], [0.78, 0.20], [0.68, 0.13], [0.55, 0.26], [0.44, 0.20], [0.34, 0.36], [0.22, 0.44], [0.28, 0.62], [0.16, 0.72], [0.34, 0.84], [0.52, 0.90]],
      narrow: [[0.74, 0.04], [0.30, 0.13], [0.70, 0.22], [0.26, 0.31], [0.68, 0.40], [0.24, 0.50], [0.66, 0.59], [0.28, 0.68], [0.64, 0.77], [0.30, 0.87], [0.62, 0.96]]
    },
    // 2025 — 돛. 위로 벌어지는 삼각
    '2025': {
      wide:   [[0.30, 0.80], [0.36, 0.44], [0.52, 0.18], [0.72, 0.36], [0.66, 0.76]],
      narrow: [[0.32, 0.08], [0.66, 0.28], [0.30, 0.50], [0.68, 0.72], [0.42, 0.94]]
    },
    // 2024 — 굽은 국자. 손잡이가 오른쪽으로 휜다
    '2024': {
      wide:   [[0.18, 0.34], [0.30, 0.24], [0.42, 0.34], [0.40, 0.58], [0.58, 0.68], [0.78, 0.60]],
      narrow: [[0.28, 0.06], [0.62, 0.18], [0.34, 0.34], [0.64, 0.52], [0.32, 0.70], [0.60, 0.92]]
    },
    // 성장 별자리 (#59) — 한 방향으로 오르는 사슬
    growth: {
      wide:   [[0.08, 0.86], [0.22, 0.74], [0.34, 0.78], [0.46, 0.58], [0.58, 0.60], [0.72, 0.38], [0.86, 0.22]],
      narrow: [[0.30, 0.94], [0.60, 0.82], [0.32, 0.68], [0.62, 0.54], [0.34, 0.40], [0.64, 0.26], [0.40, 0.08]]
    },
    // 궤도를 잃은 별 — 선을 잇지 않으므로 흩어진 배치만 필요하다
    lost: {
      wide:   [[0.14, 0.28], [0.32, 0.62], [0.48, 0.22], [0.62, 0.70], [0.80, 0.34], [0.88, 0.72], [0.24, 0.86], [0.56, 0.44], [0.72, 0.14], [0.40, 0.88], [0.06, 0.58]],
      narrow: [[0.30, 0.06], [0.64, 0.16], [0.28, 0.26], [0.62, 0.36], [0.30, 0.46], [0.64, 0.56], [0.28, 0.66], [0.62, 0.74], [0.32, 0.83], [0.62, 0.91], [0.44, 0.98]]
    }
  };

  // 폴리라인을 n개 점으로 다시 샘플링한다. 카드 수가 달라져도 형태가 유지된다
  function resample(points, n) {
    if (n <= 1) return [points[0]];
    if (n === points.length) return points.slice();
    var lengths = [0], total = 0, i;
    for (i = 1; i < points.length; i++) {
      total += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
      lengths.push(total);
    }
    var out = [];
    for (i = 0; i < n; i++) {
      var want = (total * i) / (n - 1);
      var k = 1;
      while (k < lengths.length - 1 && lengths[k] < want) k++;
      var span = lengths[k] - lengths[k - 1] || 1;
      var t = (want - lengths[k - 1]) / span;
      out.push([
        points[k - 1][0] + (points[k][0] - points[k - 1][0]) * t,
        points[k - 1][1] + (points[k][1] - points[k - 1][1]) * t
      ]);
    }
    return out;
  }

  // 화면군 — 폴드 · 모바일 · 태블릿 · 노트북 · 데스크톱
  function viewport() {
    var w = global.innerWidth;
    if (w <= 390) return { key: 'fold', narrow: true, height: 1840, pad: 74 };
    if (w <= 640) return { key: 'mobile', narrow: true, height: 1660, pad: 70 };
    if (w <= 1024) return { key: 'tablet', narrow: false, height: 1080, pad: 58 };
    if (w <= 1440) return { key: 'laptop', narrow: false, height: 880, pad: 52 };
    return { key: 'desktop', narrow: false, height: 940, pad: 52 };
  }

  /* -------------------------------------------------------------------
     성도 렌더 — 별 좌표는 개폐와 무관하게 고정된다
     ------------------------------------------------------------------- */
  function Chart(root) {
    this.root = root;
    this.stars = [];
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute('class', 'lines');
    this.memos = document.createElement('div');
    this.memos.className = 'memos';
    var self = this;
    var timer = null;
    global.addEventListener('resize', function () {
      clearTimeout(timer);
      timer = setTimeout(function () { self.relayout(); }, 180);
    });
    document.addEventListener('v3:lang', function () { self.render(self.items, self.shapeKey, self.linked); });
  }

  Chart.prototype.render = function (items, shapeKey, linked) {
    this.items = items || [];
    this.shapeKey = shapeKey;
    this.linked = !!linked;
    // 이스터에그로 심어 둔 이름 없는 별은 다시 그릴 때도 지우지 않는다
    var keep = Array.prototype.slice.call(this.root.querySelectorAll('.star.unnamed'));
    this.root.innerHTML = '';
    keep.forEach(function (el) { this.root.appendChild(el); }, this);
    this.root.appendChild(this.svg);
    this.root.appendChild(this.memos);
    this.svg.innerHTML = '';
    this.memos.innerHTML = '';
    this.stars = [];

    var self = this;
    this.items.forEach(function (item, index) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'star' + (item.form ? ' ' + item.form : '');
      button.setAttribute('aria-expanded', 'false');
      button.setAttribute('aria-label', i18n.pick(item.title) + (item.state ? ' — ' + i18n.pick(item.state) : ''));
      button.innerHTML = '<span class="glyph" aria-hidden="true"></span><span class="name"></span>';
      button.querySelector('.name').textContent = i18n.pick(item.title);
      button.addEventListener('click', function () { self.toggle(index); });
      self.root.appendChild(button);
      self.stars.push({ item: item, el: button, memo: null });
    });
    this.relayout();
  };

  Chart.prototype.relayout = function () {
    if (!this.items || !this.items.length) return;
    var view = viewport();
    var shape = SHAPES[this.shapeKey] || SHAPES.lost;
    var points = resample(view.narrow ? shape.narrow : shape.wide, this.items.length);
    var height = view.height;
    if (view.narrow) height = Math.max(height, this.items.length * view.pad + 240);
    this.root.style.height = height + 'px';
    var width = this.root.clientWidth || 1;
    var inset = view.narrow ? 0.10 : 0.06;

    var self = this;
    var boxes = [];
    this.stars.forEach(function (star, index) {
      var p = points[index];
      var x = (inset + p[0] * (1 - inset * 2)) * width;
      var y = (0.06 + p[1] * 0.88) * height;
      star.x = x; star.y = y;
      // 오른쪽 절반의 별은 라벨을 왼쪽으로 뒤집어 화면 밖으로 나가지 않게 한다
      star.el.classList.toggle('flip', x > width * 0.62);
      star.el.style.setProperty('--x', Math.round(x) + 'px');
      star.el.style.setProperty('--y', Math.round(y) + 'px');
    });

    // 실제 렌더 사각형으로 충돌을 검사해 겹치는 쪽을 아래로 밀어낸다
    this.stars.forEach(function (star) {
      var rect = star.el.getBoundingClientRect();
      var box = { x: star.x - rect.width / 2, y: star.y - rect.height / 2, w: rect.width, h: rect.height, star: star };
      var guard = 0;
      while (guard < 24 && boxes.some(function (other) { return overlap(box, other, 6); })) {
        box.y += 14;
        star.y += 14;
        guard++;
      }
      star.el.style.setProperty('--y', Math.round(star.y) + 'px');
      boxes.push(box);
    });

    this.drawLines(width, height);
    this.stars.forEach(function (star, index) { if (star.memo) self.placeMemo(index); });
  };

  function overlap(a, b, gap) {
    return !(a.x + a.w + gap < b.x || b.x + b.w + gap < a.x || a.y + a.h + gap < b.y || b.y + b.h + gap < a.y);
  }

  Chart.prototype.drawLines = function (width, height) {
    this.svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
    this.svg.innerHTML = '';
    if (!this.linked) return; // 완성된 별만 별자리를 이룬다
    var polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    polyline.setAttribute('points', this.stars.map(function (star) {
      return Math.round(star.x) + ',' + Math.round(star.y);
    }).join(' '));
    this.svg.appendChild(polyline);
  };

  Chart.prototype.toggle = function (index) {
    var star = this.stars[index];
    if (star.memo) {
      star.memo.remove();
      star.memo = null;
      star.el.setAttribute('aria-expanded', 'false');
      return;
    }
    this.closeAll();
    star.memo = this.buildMemo(star.item);
    this.memos.appendChild(star.memo);
    star.el.setAttribute('aria-expanded', 'true');
    this.placeMemo(index);
    sound.play('select');
  };

  Chart.prototype.closeAll = function () {
    this.stars.forEach(function (star) {
      if (star.memo) { star.memo.remove(); star.memo = null; }
      star.el.setAttribute('aria-expanded', 'false');
    });
  };

  Chart.prototype.buildMemo = function (item) {
    var memo = document.createElement('div');
    memo.className = 'memo';
    var html = '';
    if (item.role) html += '<p class="role">' + escapeHtml(i18n.pick(item.role)) + '</p>';
    if (item.descHtml) html += '<p class="desc">' + i18n.pick(item.descHtml) + '</p>';
    else if (item.desc) html += '<p class="desc">' + escapeHtml(i18n.pick(item.desc)) + '</p>';
    if (item.failedReason) html += '<p class="desc">' + i18n.pick(item.failedReason) + '</p>';
    if (item.relation) html += '<p class="none">' + escapeHtml(i18n.pick(item.relation)) + '</p>';
    if (item.tech && item.tech.length) {
      html += '<ul class="tech">' + item.tech.map(function (t) {
        return '<li>' + escapeHtml(i18n.pick(t)) + '</li>';
      }).join('') + '</ul>';
    }
    if (item.detail) {
      html += '<a class="go" href="../../' + item.detail + '" data-ko="상세 보기 →" data-en="View detail →">'
        + (i18n.lang === 'ko' ? '상세 보기 →' : 'View detail →') + '</a>';
    } else {
      html += '<p class="none" data-ko="상세 페이지가 없는 기록" data-en="No detail page">'
        + (i18n.lang === 'ko' ? '상세 페이지가 없는 기록' : 'No detail page') + '</p>';
    }
    memo.innerHTML = html;
    var go = memo.querySelector('.go');
    if (go) go.addEventListener('click', function () { sound.play('enter'); });
    return memo;
  };

  Chart.prototype.placeMemo = function (index) {
    var star = this.stars[index];
    if (!star.memo) return;
    var width = this.root.clientWidth;
    var height = this.root.clientHeight;
    var memoWidth = star.memo.offsetWidth || 300;
    var memoHeight = star.memo.offsetHeight || 160;
    var x = star.x + 22;
    if (x + memoWidth > width - 8) x = star.x - memoWidth - 22;
    if (x < 8) x = 8;
    var y = star.y + 18;
    if (y + memoHeight > height - 8) y = Math.max(8, star.y - memoHeight - 18);
    star.memo.style.setProperty('--x', Math.round(x) + 'px');
    star.memo.style.setProperty('--y', Math.round(y) + 'px');
  };

  function escapeHtml(text) {
    return String(text).replace(/[&<>"]/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch];
    });
  }

  /* -------------------------------------------------------------------
     데이터 — projects.json은 읽기만 한다
     ------------------------------------------------------------------- */
  // #114에서 사용자가 지정한 연도별 순서. 목록에 없는 카드는 뒤에 그대로 붙인다
  var ORDER = {
    '2026': ['신입생 가이드', 'Swordmaster', '기술과사회', '데일리 리포트', 'MultiMind', 'GitHub Rank', '통합 알림', '마인크래프트', '멈춰'],
    '2025': ['헬스 케어', '공감 봇', '식물 타이머', 'NFC', '면진봇'],
    '2024': ['해안 장벽', '비밀번호 도어락', '졸음 방지', '산불', 'SFPC', '급식 줄']
  };

  function sortByOrder(cards, year) {
    var order = ORDER[year];
    if (!order) return cards.slice();
    return cards.slice().sort(function (a, b) {
      return rank(a, order) - rank(b, order);
    });
  }
  function rank(card, order) {
    var title = (card.title && (card.title.ko || card.title)) || '';
    for (var i = 0; i < order.length; i++) {
      if (String(title).indexOf(order[i]) !== -1) return i;
    }
    return order.length + 1;
  }

  function loadProjects() {
    return fetch('../../projects.json', { cache: 'no-cache' }).then(function (res) {
      if (!res.ok) throw new Error('projects.json ' + res.status);
      return res.json();
    });
  }

  // 그룹을 연도 · 진행 중 · 실패로 나누고 상태를 천체 형태로 옮긴다
  function classify(data) {
    var years = {}, wip = [], failed = [];
    data.groups.forEach(function (group) {
      if (group.year) {
        years[group.year] = sortByOrder(group.cards, group.year).map(function (card) {
          return Object.assign({}, card, { form: '', state: { ko: '완료', en: 'Completed' } });
        });
        return;
      }
      group.cards.forEach(function (card) {
        var title = (card.title && (card.title.ko || card.title)) || '';
        var status = card.status ? (card.status.ko || '') : '';
        if (card.failedReason || (!card.status && !card.detail)) {
          // 실패 — 초신성 잔해. 단 '한기대 지도 초기 버전'은 지연이라 형태가 다르다
          var strayed = title.indexOf('한기대 지도') !== -1;
          if (title.indexOf('BrawlCraft') !== -1) return; // 격리 기록은 이 화면에 올리지 않는다
          failed.push(Object.assign({}, card, {
            relation: strayed ? { ko: '실패한 초기 버전. 후속 기획이 「한맵」이다.', en: 'The failed first version; “Koreatech Map” is its successor.' } : null,
            form: strayed ? 'strayed' : 'remnant',
            state: strayed ? { ko: '지연 · 궤도 이탈', en: 'Delayed' } : { ko: '실패 · 초신성 잔해', en: 'Failed' }
          }));
          return;
        }
        var planning = status.indexOf('기획') !== -1;
        wip.push(Object.assign({}, card, {
          relation: title.indexOf('한맵') !== -1
            ? { ko: '「한기대 지도」 초기 버전이 실패한 뒤의 후속 기획이다.', en: 'The successor plan after the failed first “Koreatech map”.' }
            : null,
          form: planning ? 'protostar' : 'stalled',
          state: card.status || { ko: '진행 중', en: 'In progress' }
        }));
      });
    });
    return { years: years, wip: wip, failed: failed };
  }

  global.V3 = {
    ASSETS: ASSETS,
    reduceMotion: reduceMotion,
    i18n: i18n,
    sound: sound,
    Sky: Sky,
    Chart: Chart,
    viewport: viewport,
    loadProjects: loadProjects,
    classify: classify,
    escapeHtml: escapeHtml,
    mulberry: mulberry
  };
})(window);
