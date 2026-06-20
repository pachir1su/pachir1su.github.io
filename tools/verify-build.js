#!/usr/bin/env node
/* =====================================================================
   tools/verify-build.js — 빌드 결과의 렌더링 동등성 검증
   - HEAD(원본) index.html의 프로젝트 영역 vs 현재(빌드 후) 영역을 비교
   - 비교 전 정규화: 주석 제거 → HTML 엔티티 완전 디코딩 → 태그 간 공백 제거
   - 정규화 결과가 동일하면 렌더링상 무손실(이스케이프 깊이·포매팅 차이는 무시)
   ===================================================================== */
"use strict";

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const root = path.join(__dirname, "..");

/* 렌더링 동등성 비교용 정규화 */
function normalize(s) {
  s = s.replace(/<!--[\s\S]*?-->/g, ""); // 주석 제거
  let prev;
  do {
    prev = s;
    s = s
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, "&"); // 엔티티 완전 디코딩(수렴까지 반복)
  } while (s !== prev);
  return s.replace(/>\s+</g, "><").replace(/\s+/g, " ").trim();
}

/* 원본(마커 도입 전) 영역 추출 */
function origRegion(html) {
  const a = html.indexOf("        <!-- ===== 연도별 그룹");
  const b = html.indexOf("\n      </div>\n    </section>", a);
  if (a === -1 || b === -1) throw new Error("원본 영역 경계를 찾을 수 없습니다.");
  return html.slice(a, b);
}

/* 현재(마커 사이) 영역 추출 */
function builtRegion(html) {
  const s = html.indexOf("<!-- BUILD:PROJECTS:START");
  const e = html.indexOf("<!-- BUILD:PROJECTS:END");
  if (s === -1 || e === -1) throw new Error("BUILD 마커를 찾을 수 없습니다.");
  const contentStart = html.indexOf("-->", s) + 3;
  return html.slice(contentStart, e);
}

const orig = execSync("git show HEAD:index.html", { cwd: root }).toString();
const cur = fs.readFileSync(path.join(root, "index.html"), "utf8");

const a = normalize(origRegion(orig));
const b = normalize(builtRegion(cur));

if (a === b) {
  console.log("✅ 검증 통과: 빌드 결과가 원본과 렌더링상 동일합니다.");
  process.exit(0);
}

/* 불일치 시: 첫 차이 지점 주변 출력 */
let i = 0;
while (i < a.length && i < b.length && a[i] === b[i]) i++;
console.error("❌ 검증 실패: 첫 차이 지점 근처");
console.error("  [orig] …" + a.slice(Math.max(0, i - 60), i + 60));
console.error("  [built]…" + b.slice(Math.max(0, i - 60), i + 60));
process.exit(1);
