// api.js — GitHub REST API 호출 모듈

const BASE = 'https://api.github.com';

// localStorage 토큰 관리
function getStoredToken() {
  try { return localStorage.getItem('gri_token') || ''; }
  catch { return ''; }
}

function setStoredToken(token) {
  try {
    if (token) localStorage.setItem('gri_token', token);
    else localStorage.removeItem('gri_token');
  } catch { /* ignore */ }
}

// 공통 fetch 헬퍼 — 헤더 포함, 오류 처리
async function ghFetch(url, token = '', extraHeaders = {}) {
  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    ...extraHeaders,
  };
  if (token) headers['Authorization'] = `token ${token}`;

  const res = await fetch(url, { headers });

  if (res.status === 403) {
    const remaining = res.headers.get('X-RateLimit-Remaining');
    if (remaining === '0') {
      const reset = res.headers.get('X-RateLimit-Reset');
      const resetTime = reset ? new Date(parseInt(reset) * 1000).toLocaleTimeString() : '잠시 후';
      throw new Error(`API 요청 한도 초과. ${resetTime}에 초기화됩니다. GitHub Token을 입력하면 한도가 늘어납니다.`);
    }
    throw new Error('API 접근이 거부되었습니다. Token을 확인해주세요.');
  }
  if (res.status === 404) throw new Error('사용자를 찾을 수 없습니다.');
  if (res.status === 422) throw new Error('검색 쿼리 오류가 발생했습니다.');
  if (!res.ok) throw new Error(`API 오류 (${res.status})`);

  return res.json();
}

// 사용자 기본 정보 + followers 조회
async function fetchUser(username, token = '') {
  return ghFetch(`${BASE}/users/${encodeURIComponent(username)}`, token);
}

// 전체 저장소 스타 합산 (페이지네이션 처리)
async function fetchTotalStars(username, token = '') {
  let page = 1;
  let totalStars = 0;
  let hasMore = true;

  while (hasMore) {
    const url = `${BASE}/search/repositories?q=user:${encodeURIComponent(username)}&per_page=100&page=${page}`;
    const data = await ghFetch(url, token);

    totalStars += data.items.reduce((sum, repo) => sum + (repo.stargazers_count || 0), 0);

    if (data.items.length < 100 || page >= 10) hasMore = false;
    else page++;
  }

  return totalStars;
}

// PR 총 개수 조회 (search API)
async function fetchPRCount(username, token = '') {
  const url = `${BASE}/search/issues?q=author:${encodeURIComponent(username)}+type:pr&per_page=1`;
  const data = await ghFetch(url, token);
  return data.total_count || 0;
}

// Issue 총 개수 조회 (search API)
async function fetchIssueCount(username, token = '') {
  const url = `${BASE}/search/issues?q=author:${encodeURIComponent(username)}+type:issue&per_page=1`;
  const data = await ghFetch(url, token);
  return data.total_count || 0;
}

// 커밋 총 개수 조회 (commits search API, cloak-preview 헤더 필요)
async function fetchCommitCount(username, token = '') {
  const url = `${BASE}/search/commits?q=author:${encodeURIComponent(username)}&per_page=1`;
  const data = await ghFetch(url, token, {
    'Accept': 'application/vnd.github.cloak-preview+json',
  });
  return data.total_count || 0;
}

// 전체 통계 통합 조회
// onProgress(step, total) 콜백으로 진행 상태 전달
async function fetchAllStats(username, token = '', onProgress = null) {
  const steps = 5;
  let step = 0;
  const tick = () => { step++; if (onProgress) onProgress(step, steps); };

  try {
    const user = await fetchUser(username, token);
    tick();

    const [stars, prs, issues, commits] = await Promise.all([
      fetchTotalStars(username, token).then(v => { tick(); return v; }),
      fetchPRCount(username, token).then(v => { tick(); return v; }),
      fetchIssueCount(username, token).then(v => { tick(); return v; }),
      fetchCommitCount(username, token).then(v => { tick(); return v; }),
    ]);

    return {
      username: user.login,
      name: user.name || user.login,
      avatar: user.avatar_url,
      followers: user.followers || 0,
      stars,
      prs,
      issues,
      commits,
    };
  } catch (err) {
    throw err;
  }
}

export { getStoredToken, setStoredToken, fetchAllStats };
