// main.js — 이벤트 핸들러 및 앱 진입점

import { getStoredToken, setStoredToken, fetchAllStats } from './api.js';
import { showLoading, showError, renderResult, buildMarkdown } from './ui.js';

let currentMode = 'auto'; // 'auto' | 'manual'

// ─── 모드 전환 ────────────────────────────────────────────────────────────
function setMode(mode) {
  currentMode = mode;
  document.getElementById('auto-panel').hidden = mode !== 'auto';
  document.getElementById('manual-panel').hidden = mode !== 'manual';
  document.querySelectorAll('.mode-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });
}

// ─── 자동 모드: API 조회 ──────────────────────────────────────────────────
async function handleAutoSubmit() {
  const username = document.getElementById('username-input').value.trim();
  if (!username) { showError('GitHub username을 입력해주세요.'); return; }

  const token = getStoredToken();
  showLoading();

  const progressBar  = document.getElementById('loading-progress-fill');
  const progressText = document.getElementById('loading-step-text');
  const stepLabels   = ['사용자 정보 조회 중...', '스타 집계 중...', 'PR 수 조회 중...', '이슈 수 조회 중...', '커밋 수 조회 중...'];

  try {
    const stats = await fetchAllStats(username, token, (step, total) => {
      if (progressBar)  progressBar.style.width  = `${(step / total) * 100}%`;
      if (progressText) progressText.textContent = stepLabels[step - 1] || '처리 중...';
    });
    stats.includeAllCommits = document.getElementById('include-all-commits').checked;
    window._lastStats = stats;
    renderResult(stats);
  } catch (err) {
    showError(err.message);
  }
}

// ─── 수동 모드: 입력값으로 계산 ──────────────────────────────────────────
function handleManualSubmit() {
  const getVal = id => Math.max(0, parseInt(document.getElementById(id).value) || 0);
  const stats = {
    username: '', name: '', avatar: null,
    stars:     getVal('m-stars'),
    prs:       getVal('m-prs'),
    commits:   getVal('m-commits'),
    issues:    getVal('m-issues'),
    followers: getVal('m-followers'),
    includeAllCommits: document.getElementById('include-all-commits').checked,
  };
  window._lastStats = stats;
  renderResult(stats);
}

// ─── Copy Markdown ────────────────────────────────────────────────────────
function handleCopyMarkdown() {
  if (!window._lastStats) return;
  const md  = buildMarkdown(window._lastStats);
  const btn = document.getElementById('copy-markdown-btn');

  const reset = () => {
    btn.innerHTML = '<i class="fas fa-copy"></i> Copy Markdown';
  };
  const done = () => {
    btn.innerHTML = '<i class="fas fa-check"></i> 복사됨!';
    setTimeout(reset, 2000);
  };

  navigator.clipboard.writeText(md).then(done).catch(() => {
    // clipboard API 미지원 환경 fallback
    const ta = document.createElement('textarea');
    ta.value = md;
    ta.style.position = 'fixed';
    ta.style.opacity  = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    done();
  });
}

// ─── 토큰 UI ──────────────────────────────────────────────────────────────
function initTokenUI() {
  const tokenInput   = document.getElementById('token-input');
  const tokenToggle  = document.getElementById('token-section-toggle');
  const tokenSection = document.getElementById('token-section');
  const tokenSaveBtn = document.getElementById('token-save-btn');
  const tokenClearBtn= document.getElementById('token-clear-btn');
  const tokenShowBtn = document.getElementById('token-show-btn');

  const saved = getStoredToken();
  if (saved) { tokenInput.value = saved; updateTokenStatus(true); }

  tokenToggle.addEventListener('click', () => {
    const isOpen = !tokenSection.hidden;
    tokenSection.hidden = isOpen;
    tokenToggle.querySelector('.toggle-arrow').textContent = isOpen ? '▼' : '▲';
  });

  tokenSaveBtn.addEventListener('click', () => {
    const val = tokenInput.value.trim();
    setStoredToken(val);
    updateTokenStatus(!!val);
  });

  tokenClearBtn.addEventListener('click', () => {
    tokenInput.value = '';
    setStoredToken('');
    updateTokenStatus(false);
  });

  tokenShowBtn.addEventListener('click', () => {
    const isPassword = tokenInput.type === 'password';
    tokenInput.type = isPassword ? 'text' : 'password';
    tokenShowBtn.innerHTML = `<i class="fas fa-eye${isPassword ? '-slash' : ''}"></i>`;
  });
}

function updateTokenStatus(hasToken) {
  const badge = document.getElementById('token-status-badge');
  if (!badge) return;
  badge.textContent = hasToken ? '토큰 적용됨' : '토큰 없음';
  badge.className   = 'token-status-badge ' + (hasToken ? 'has-token' : 'no-token');
}

// ─── 아코디언 ─────────────────────────────────────────────────────────────
function initAccordions() {
  document.querySelectorAll('.accordion-header').forEach(header => {
    header.addEventListener('click', () => {
      const body   = header.nextElementSibling;
      const isOpen = body.style.maxHeight && body.style.maxHeight !== '0px';
      body.style.maxHeight = isOpen ? '0px' : body.scrollHeight + 'px';
      header.querySelector('.acc-arrow').textContent = isOpen ? '▼' : '▲';
    });
  });
}

// ─── 앱 초기화 ────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.mode-tab').forEach(btn => {
    btn.addEventListener('click', () => setMode(btn.dataset.mode));
  });

  document.getElementById('auto-submit-btn').addEventListener('click', handleAutoSubmit);
  document.getElementById('username-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') handleAutoSubmit();
  });

  document.getElementById('manual-submit-btn').addEventListener('click', handleManualSubmit);
  document.getElementById('copy-markdown-btn').addEventListener('click', handleCopyMarkdown);

  initTokenUI();
  initAccordions();
  setMode('auto');
});
