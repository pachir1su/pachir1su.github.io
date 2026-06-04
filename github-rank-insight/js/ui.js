// ui.js — DOM 조작 및 렌더링

import { GRADES, calculateRank, getNextGrade, calcNextGradeRequirements } from './calculate.js';

const METRIC_LABELS = {
  stars:     { ko: '스타',      icon: 'fa-star',       en: 'Stars'     },
  prs:       { ko: 'PR',        icon: 'fa-code-branch', en: 'Pull Requests' },
  commits:   { ko: '커밋',      icon: 'fa-history',    en: 'Commits'   },
  issues:    { ko: '이슈',      icon: 'fa-exclamation-circle', en: 'Issues' },
  followers: { ko: '팔로워',    icon: 'fa-users',      en: 'Followers' },
};

// ─── 로딩 ───────────────────────────────────────────────────────────────
function showLoading() {
  document.getElementById('result-section').hidden = true;
  document.getElementById('error-section').hidden = true;
  document.getElementById('loading-section').hidden = false;
}

function hideLoading() {
  document.getElementById('loading-section').hidden = true;
}

function showError(msg) {
  hideLoading();
  document.getElementById('error-msg').textContent = msg;
  document.getElementById('error-section').hidden = false;
  document.getElementById('result-section').hidden = true;
}

// ─── 원형 게이지 ────────────────────────────────────────────────────────
function renderGaugeArc(percentile, color) {
  const el = document.getElementById('grade-gauge');
  const SIZE = 160;
  const STROKE = 12;
  const R = (SIZE - STROKE) / 2;
  const CIRC = 2 * Math.PI * R;
  // percentile이 낮을수록 더 채워짐 (S=1% → 거의 가득)
  const filled = (1 - percentile / 100) * CIRC;

  el.innerHTML = `
    <svg viewBox="0 0 ${SIZE} ${SIZE}" width="${SIZE}" height="${SIZE}">
      <circle cx="${SIZE/2}" cy="${SIZE/2}" r="${R}"
        fill="none" stroke="#e0e0e0" stroke-width="${STROKE}" />
      <circle cx="${SIZE/2}" cy="${SIZE/2}" r="${R}"
        fill="none" stroke="${color}" stroke-width="${STROKE}"
        stroke-linecap="round"
        stroke-dasharray="${CIRC}"
        stroke-dashoffset="${CIRC - filled}"
        transform="rotate(-90 ${SIZE/2} ${SIZE/2})"
        class="gauge-arc" />
    </svg>`;
}

// ─── 등급 카드 ───────────────────────────────────────────────────────────
function renderGradeCard(result, stats) {
  const { grade, color, percentile } = result;

  renderGaugeArc(percentile, color);

  document.getElementById('grade-letter').textContent = grade;
  document.getElementById('grade-letter').style.color = color;
  document.getElementById('grade-percentile').textContent =
    `상위 ${percentile.toFixed(1)}%`;

  // 사용자 아바타/이름 (자동 모드일 때만)
  const avatarWrap = document.getElementById('user-info');
  if (stats.avatar) {
    avatarWrap.hidden = false;
    document.getElementById('user-avatar').src = stats.avatar;
    document.getElementById('user-name').textContent = stats.name || stats.username;
  } else {
    avatarWrap.hidden = true;
  }
}

// ─── 지표별 기여도 바 차트 ───────────────────────────────────────────────
function renderBreakdown(breakdown, gradeColor) {
  const container = document.getElementById('breakdown-bars');
  container.innerHTML = '';

  for (const [key, data] of Object.entries(breakdown)) {
    const info = METRIC_LABELS[key];
    const pct = (data.p * 100).toFixed(1);
    const contribPct = (data.contribution * 100).toFixed(1);

    const row = document.createElement('div');
    row.className = 'breakdown-row';
    row.innerHTML = `
      <div class="breakdown-label">
        <i class="fas ${info.icon}"></i>
        <span>${info.ko}</span>
        <span class="breakdown-raw">${data.raw.toLocaleString()}</span>
      </div>
      <div class="breakdown-bars-wrap">
        <div class="breakdown-bar-track">
          <div class="breakdown-bar-fill" data-pct="${data.p * 100}"
               style="width: 0%; background: ${gradeColor}"></div>
        </div>
        <span class="breakdown-pct">${pct}%</span>
      </div>
      <div class="breakdown-contrib">기여 ${contribPct}%</div>`;
    container.appendChild(row);
  }

  // 애니메이션 트리거
  requestAnimationFrame(() => {
    container.querySelectorAll('.breakdown-bar-fill').forEach(bar => {
      bar.style.width = Math.min(parseFloat(bar.dataset.pct), 100) + '%';
    });
  });
}

// ─── 다음 등급 달성 조건 ─────────────────────────────────────────────────
function renderNextGrade(stats, result) {
  const section = document.getElementById('next-grade-section');
  const nextGrade = getNextGrade(result.percentile);

  if (!nextGrade) {
    section.innerHTML = `
      <div class="next-grade-header">
        <i class="fas fa-crown" style="color:#FFD700"></i>
        <span>최고 등급 <strong>S</strong> 달성! 축하합니다 🎉</span>
      </div>`;
    return;
  }

  const requirements = calcNextGradeRequirements(stats, nextGrade.maxPercentile);
  const top3 = requirements.filter(r => r.needed !== null).slice(0, 3);

  const rows = top3.map(r => {
    const info = METRIC_LABELS[r.metric];
    const neededText = r.needed === 0
      ? '이미 달성'
      : `+${r.needed.toLocaleString()} (→ ${r.target.toLocaleString()})`;
    return `
      <tr>
        <td><i class="fas ${info.icon}"></i> ${info.ko}</td>
        <td>${r.current.toLocaleString()}</td>
        <td class="${r.needed === 0 ? 'achieved' : ''}">${neededText}</td>
      </tr>`;
  }).join('');

  section.innerHTML = `
    <div class="next-grade-header">
      <span>다음 등급 <strong style="color:${nextGrade.color}">${nextGrade.grade}</strong>
      (상위 ${nextGrade.maxPercentile}%) 달성 조건</span>
    </div>
    <table class="next-grade-table">
      <thead><tr><th>지표</th><th>현재</th><th>필요 변화</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

// ─── 등급 체계 표 ────────────────────────────────────────────────────────
function renderGradeTable(currentGrade) {
  const container = document.getElementById('grade-table-body');
  container.innerHTML = '';

  for (const g of GRADES) {
    const tr = document.createElement('tr');
    tr.className = g.grade === currentGrade ? 'current-grade-row' : '';
    const pctLabel = g.maxPercentile === Infinity ? '나머지' : `상위 ${g.maxPercentile}%`;
    tr.innerHTML = `
      <td><span class="grade-badge" style="color:${g.color};border-color:${g.color}">${g.grade}</span></td>
      <td>${pctLabel}</td>
      <td>${g.grade === currentGrade ? '← 현재' : ''}</td>`;
    container.appendChild(tr);
  }
}

// ─── 결과 전체 렌더링 ─────────────────────────────────────────────────────
function renderResult(stats) {
  hideLoading();
  document.getElementById('error-section').hidden = true;

  const result = calculateRank(stats);

  renderGradeCard(result, stats);
  renderBreakdown(result.breakdown, result.color);
  renderNextGrade(stats, result);
  renderGradeTable(result.grade);

  // Copy Markdown 버튼 데이터 저장
  document.getElementById('result-section').dataset.grade = result.grade;
  document.getElementById('result-section').dataset.percentile = result.percentile.toFixed(1);
  document.getElementById('result-section').dataset.username = stats.username || '';

  document.getElementById('result-section').hidden = false;
  document.getElementById('result-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ─── Copy Markdown ────────────────────────────────────────────────────────
function buildMarkdown(stats) {
  const result = calculateRank(stats);
  const username = stats.username || 'username';
  const { breakdown } = result;

  return `## GitHub Rank: ${result.grade} (Top ${result.percentile.toFixed(1)}%)

| Metric | Value | Percentile |
|--------|-------|-----------|
| ⭐ Stars | ${breakdown.stars.raw.toLocaleString()} | ${(breakdown.stars.p * 100).toFixed(1)}% |
| 🔀 Pull Requests | ${breakdown.prs.raw.toLocaleString()} | ${(breakdown.prs.p * 100).toFixed(1)}% |
| 📝 Commits | ${breakdown.commits.raw.toLocaleString()} | ${(breakdown.commits.p * 100).toFixed(1)}% |
| 🐛 Issues | ${breakdown.issues.raw.toLocaleString()} | ${(breakdown.issues.p * 100).toFixed(1)}% |
| 👥 Followers | ${breakdown.followers.raw.toLocaleString()} | ${(breakdown.followers.p * 100).toFixed(1)}% |

> Calculated using [github-rank-insight](https://pachir1su.github.io/github-rank-insight/)`;
}

export { showLoading, hideLoading, showError, renderResult, buildMarkdown };
