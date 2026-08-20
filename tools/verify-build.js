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


/* --- 4) 공용 favicon 정합성 + 프로젝트 전용 미디어 위치 --- */
function collectHtmlFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === ".git" || entry.name === "node_modules") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collectHtmlFiles(full));
    else if (entry.isFile() && entry.name.endsWith(".html")) out.push(full);
  }
  return out;
}

for (const htmlFile of collectHtmlFiles(root)) {
  const rel = path.relative(root, htmlFile).replaceAll("\\", "/");
  const html = fs.readFileSync(htmlFile, "utf8");
  check(
    html.includes('href="/assets/favicon.svg"'),
    `공용 닭 favicon 누락: ${rel}`
  );
}

check(
  !fs.existsSync(path.join(root, "assets", "media")),
  "폐기된 assets/media 디렉터리가 남아 있습니다. 프로젝트 전용 미디어는 projects/<project>/assets/ 아래에 둡니다."
);

for (const group of data.groups) {
  for (const card of group.cards) {
    if (!card.detail) continue;
    const detailDir = path.join(root, card.detail);
    if (!fs.existsSync(detailDir)) continue;
    const detailHtml = fs.readFileSync(path.join(detailDir, "index.html"), "utf8");
    const localAssetRefs = [...detailHtml.matchAll(/(?:src|poster)="(assets\/[^"]+)"/g)].map((m) => m[1]);
    for (const ref of localAssetRefs) {
      check(fs.existsSync(path.join(detailDir, ref)), `프로젝트 로컬 자산 없음: ${card.detail}${ref}`);
    }
  }
}

/* --- 5) 프로젝트 래스터 이미지의 실제 크기 == HTML width/height --- */
function rasterDimensions(file) {
  const b = fs.readFileSync(file);

  if (b.length >= 24 && b[0] === 0x89 && b.toString("ascii", 1, 4) === "PNG") {
    return [b.readUInt32BE(16), b.readUInt32BE(20)];
  }

  if (b.length >= 4 && b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) {
        i += 1;
        continue;
      }
      while (i < b.length && b[i] === 0xff) i += 1;
      const marker = b[i++];
      if (marker === 0xd8 || marker === 0xd9 || marker === 0x01) continue;
      if (i + 1 >= b.length) break;
      const len = b.readUInt16BE(i);
      if (len < 2 || i + len > b.length) break;
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
        return [b.readUInt16BE(i + 5), b.readUInt16BE(i + 3)];
      }
      i += len;
    }
  }

  if (b.length >= 30 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") {
    let i = 12;
    while (i + 8 <= b.length) {
      const kind = b.toString("ascii", i, i + 4);
      const size = b.readUInt32LE(i + 4);
      const payload = i + 8;

      if (kind === "VP8X" && payload + 10 <= b.length) {
        const width = 1 + b[payload + 4] + (b[payload + 5] << 8) + (b[payload + 6] << 16);
        const height = 1 + b[payload + 7] + (b[payload + 8] << 8) + (b[payload + 9] << 16);
        return [width, height];
      }
      if (
        kind === "VP8 " && payload + 10 <= b.length &&
        b[payload + 3] === 0x9d && b[payload + 4] === 0x01 && b[payload + 5] === 0x2a
      ) {
        return [b.readUInt16LE(payload + 6) & 0x3fff, b.readUInt16LE(payload + 8) & 0x3fff];
      }
      if (kind === "VP8L" && payload + 5 <= b.length && b[payload] === 0x2f) {
        const bits = b.readUInt32LE(payload + 1);
        return [(bits & 0x3fff) + 1, ((bits >>> 14) & 0x3fff) + 1];
      }

      i = payload + size + (size % 2);
    }
  }

  return null;
}

const projectRoot = path.join(root, "projects");
for (const htmlFile of collectHtmlFiles(projectRoot)) {
  const html = fs.readFileSync(htmlFile, "utf8");
  const relHtml = path.relative(root, htmlFile).replaceAll("\\", "/");
  const imageTags = [...html.matchAll(/<img\b[^>]*\bsrc="([^"]+)"[^>]*>/gi)];

  for (const match of imageTags) {
    const tag = match[0];
    const ref = match[1];
    if (!/^assets\/.+\.(?:png|webp|jpe?g)$/i.test(ref)) continue;

    const widthMatch = tag.match(/\bwidth="(\d+)"/i);
    const heightMatch = tag.match(/\bheight="(\d+)"/i);
    check(!!widthMatch && !!heightMatch, `이미지 width/height 누락: ${relHtml} → ${ref}`);
    if (!widthMatch || !heightMatch) continue;

    const file = path.join(path.dirname(htmlFile), ref);
    if (!fs.existsSync(file)) continue;
    const actual = rasterDimensions(file);
    check(!!actual, `이미지 크기 판독 실패: ${relHtml} → ${ref}`);
    if (!actual) continue;

    check(
      Number(widthMatch[1]) === actual[0] && Number(heightMatch[1]) === actual[1],
      `이미지 크기 불일치: ${relHtml} → ${ref} HTML=${widthMatch[1]}x${heightMatch[1]} 실제=${actual[0]}x${actual[1]}`
    );
  }
}

if (failures.length === 0) {
  console.log(`✅ 검증 통과: 카드 ${actualCount}개, 재실행 idempotent, 상세 경로·미디어 크기 정합.`);
  process.exit(0);
}

console.error("❌ 검증 실패");
failures.forEach((f) => console.error("  - " + f));
process.exit(1);
