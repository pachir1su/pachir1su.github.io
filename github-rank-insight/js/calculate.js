// calculate.js — GitHub Stats 등급 계산 로직
// anuraghazra/github-readme-stats 의 calculateRank.js 공식을 그대로 구현

const GRADES = [
  { grade: 'S',  label: 'S',  maxPercentile: 1,     color: '#FFD700' },
  { grade: 'A+', label: 'A+', maxPercentile: 12.5,  color: '#00C853' },
  { grade: 'A',  label: 'A',  maxPercentile: 25,    color: '#1DE9B6' },
  { grade: 'A-', label: 'A-', maxPercentile: 37.5,  color: '#00BCD4' },
  { grade: 'B+', label: 'B+', maxPercentile: 50,    color: '#2979FF' },
  { grade: 'B',  label: 'B',  maxPercentile: 62.5,  color: '#651FFF' },
  { grade: 'B-', label: 'B-', maxPercentile: 75,    color: '#9C27B0' },
  { grade: 'C+', label: 'C+', maxPercentile: 87.5,  color: '#FF6D00' },
  { grade: 'C',  label: 'C',  maxPercentile: Infinity, color: '#9E9E9E' },
];

// CDF 함수 — 원본 구현과 동일
function exponentialCdf(x) {
  return 1 - Math.pow(2, -x);
}

function logNormalCdf(x) {
  return x / (1 + x);
}

// 각 지표별 CDF 퍼센타일 및 weighted score 계산
function calculateScore({ stars, prs, commits, issues, followers, includeAllCommits = false }) {
  const COMMITS_MEDIAN = includeAllCommits ? 1000 : 250;

  const starsP     = logNormalCdf(stars / 50);
  const prsP       = exponentialCdf(prs / 50);
  const commitsP   = exponentialCdf(commits / COMMITS_MEDIAN);
  const issuesP    = exponentialCdf(issues / 25);
  const followersP = logNormalCdf(followers / 10);

  // 가중 합산 / 11 → 0~1 범위 score
  const score = (starsP * 4 + prsP * 3 + commitsP * 2 + issuesP * 1 + followersP * 1) / 11;

  return { starsP, prsP, commitsP, issuesP, followersP, score };
}

// 최종 등급 계산 결과 반환
function calculateRank(stats) {
  const { starsP, prsP, commitsP, issuesP, followersP, score } = calculateScore(stats);
  const percentile = (1 - score) * 100;

  const gradeObj = GRADES.find(g => percentile <= g.maxPercentile) || GRADES[GRADES.length - 1];

  return {
    grade: gradeObj.grade,
    color: gradeObj.color,
    percentile,
    score,
    breakdown: {
      stars:     { p: starsP,     weight: 4, contribution: starsP * 4 / 11,     raw: stats.stars },
      prs:       { p: prsP,       weight: 3, contribution: prsP * 3 / 11,       raw: stats.prs },
      commits:   { p: commitsP,   weight: 2, contribution: commitsP * 2 / 11,   raw: stats.commits },
      issues:    { p: issuesP,    weight: 1, contribution: issuesP * 1 / 11,    raw: stats.issues },
      followers: { p: followersP, weight: 1, contribution: followersP * 1 / 11, raw: stats.followers },
    }
  };
}

// 현재 등급에서 한 단계 위 등급 정보 반환 (이미 S이면 null)
function getNextGrade(currentPercentile) {
  const idx = GRADES.findIndex(g => currentPercentile <= g.maxPercentile);
  if (idx <= 0) return null;
  return GRADES[idx - 1];
}

// 각 지표별로 다음 등급 달성에 필요한 최소 증가량 계산 (이진 탐색)
function calcNextGradeRequirements(stats, targetMaxPercentile) {
  const targetScore = 1 - targetMaxPercentile / 100;
  const metrics = [
    { key: 'stars',     maxSearch: 200000 },
    { key: 'prs',       maxSearch: 10000  },
    { key: 'commits',   maxSearch: 100000 },
    { key: 'issues',    maxSearch: 10000  },
    { key: 'followers', maxSearch: 50000  },
  ];

  const results = [];

  for (const { key, maxSearch } of metrics) {
    const current = stats[key];
    const { score: currentScore } = calculateScore(stats);

    // 이미 목표 달성 시 delta = 0
    if (currentScore >= targetScore) {
      results.push({ metric: key, current, needed: 0, target: current });
      continue;
    }

    // 지표를 최대치로 올려도 부족한 경우 제외
    const maxStats = { ...stats, [key]: maxSearch };
    const { score: maxScore } = calculateScore(maxStats);
    if (maxScore < targetScore) {
      results.push({ metric: key, current, needed: null, target: null });
      continue;
    }

    // 이진 탐색
    let lo = current;
    let hi = maxSearch;
    for (let i = 0; i < 60; i++) {
      const mid = Math.floor((lo + hi) / 2);
      const testStats = { ...stats, [key]: mid };
      const { score } = calculateScore(testStats);
      if (score >= targetScore) hi = mid;
      else lo = mid + 1;
    }

    results.push({ metric: key, current, needed: hi - current, target: hi });
  }

  return results.sort((a, b) => {
    if (a.needed === null) return 1;
    if (b.needed === null) return -1;
    return a.needed - b.needed;
  });
}

export { GRADES, calculateRank, getNextGrade, calcNextGradeRequirements };
