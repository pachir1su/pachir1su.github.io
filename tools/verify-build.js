#!/usr/bin/env node
/* =====================================================================
   tools/verify-build.js — build.js 생성 결과 검증

   이전 버전은 "마커 도입 전 원본 영역"(`<!-- ===== 연도별 그룹`)과 현재
   생성 영역을 비교했다. 그 경계 주석은 마커 도입 커밋에서 이미 사라졌고,
   `git show HEAD:index.html`에도 없어서 origRegion()이 예외로 종료한다.
   즉 일회성 마이그레이션 검사였고 지금은 gate로 동작하지 않는다.

   그래서 기준을 "원본과의 동등성"에서 **현재 데이터와의 정합성**으로 옮긴다.
   1) BUILD 마커 무결성
   2) node build.js 재실행 idempotency (같은 입력 → 같은 출력)
   3) projects.json 카드 수 == 생성된 .project-card 수
   4) detail 경로의 실제 파일 존재 + 카드 전체 클릭(data-card-href) 연결

   사용법: `node tools/verify-build.js`
   ===================================================================== */
"use strict";

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const root = path.join(__dirname, "..");
const indexPath = path.join(root, "index.html");

const failures = [];
function check(ok, message) {
  if (!ok) failures.push(message);
}

/* 생성 영역(마커 사이) 추출 — 마커가 없으면 그 자체가 실패다 */
function builtRegion(html) {
  const s = html.indexOf("<!-- BUILD:PROJECTS:START");
  const e = html.indexOf("<!-- BUILD:PROJECTS:END");
  if (s === -1 || e === -1) return null;
  const contentStart = html.indexOf("-->", s) + 3;
  return html.slice(contentStart, e);
}

const before = fs.readFileSync(indexPath, "utf8");
const regionBefore = builtRegion(before);

if (regionBefore === null) {
  console.error("❌ BUILD:PROJECTS 마커를 찾을 수 없습니다. build.js가 생성 영역을 잃었습니다.");
  process.exit(1);
}

/* --- 1) 재실행 idempotency — 같은 projects.json으로 두 번 빌드해도 같아야 한다 --- */
try {
  execFileSync(process.execPath, [path.join(root, "build.js")], { cwd: root, stdio: "pipe" });
} catch (err) {
  console.error("❌ node build.js 실행 실패:\n" + (err.stderr || err.message));
  process.exit(1);
}
const after = fs.readFileSync(indexPath, "utf8");
const regionAfter = builtRegion(after);

check(
  regionBefore === regionAfter,
  "build.js 재실행 결과가 기존 생성 영역과 다릅니다. index.html이 projects.json과 어긋나 있었습니다 (idempotency 위반)."
);

/* --- 2) 카드 수 정합성 --- */
const data = JSON.parse(fs.readFileSync(path.join(root, "projects.json"), "utf8"));
const expectedCount = data.groups.reduce((n, g) => n + g.cards.length, 0);
const actualCount = (regionAfter.match(/class="project-card/g) || []).length;
check(
  expectedCount === actualCount,
  `카드 수 불일치: projects.json ${expectedCount}개 · 생성 결과 ${actualCount}개`
);

/* --- 3) detail 경로 존재 + 카드 전체 클릭 연결 --- */
for (const group of data.groups) {
  for (const card of group.cards) {
    if (!card.detail) continue;
    const title = typeof card.title === "string" ? card.title : card.title.ko;

    const detailFile = path.join(root, card.detail, "index.html");
    check(fs.existsSync(detailFile), `상세 페이지 없음: ${card.detail} (카드: ${title})`);

    check(
      regionAfter.includes(`data-card-href="${card.detail}"`),
      `카드 전체 클릭 연결 누락: ${card.detail} (카드: ${title})`
    );
    check(
      regionAfter.includes(`href="${card.detail}" class="plink plink-detail"`),
      `"자세히" 링크 누락: ${card.detail} (카드: ${title}) — JS 없이도 상세 페이지에 닿아야 합니다.`
    );
  }
}

if (failures.length === 0) {
  console.log(`✅ 검증 통과: 카드 ${actualCount}개, 재실행 idempotent, 상세 경로 정합.`);
  process.exit(0);
}

console.error("❌ 검증 실패");
failures.forEach((f) => console.error("  - " + f));
process.exit(1);
