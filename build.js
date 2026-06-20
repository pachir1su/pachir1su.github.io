#!/usr/bin/env node
/* =====================================================================
   build.js — projects.json 데이터로 index.html의 프로젝트 목록을 생성
   - 단일 데이터 소스(projects.json)에서 연도별/진행중/실패 카드 HTML을 생성
   - index.html 의 BUILD:PROJECTS 마커 사이를 교체 (정적 HTML 유지 → SEO 보존)
   - 의존성 없음(Node 내장 모듈만 사용). 사용법: `node build.js`
   ===================================================================== */
"use strict";

const fs = require("fs");
const path = require("path");

/* HTML 속성/텍스트 이스케이프 — &, <, >, " 처리 */
function esc(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* i18n 일반 텍스트 — 문자열이면 속성 없이, {en,ko}면 data-en/data-ko 부여 */
function i18nText(value) {
  if (typeof value === "string") {
    return { attrs: "", inner: esc(value) };
  }
  return {
    attrs: ` data-en="${esc(value.en)}" data-ko="${esc(value.ko)}"`,
    inner: esc(value.ko),
  };
}

/* i18n HTML 콘텐츠 — {en,ko}의 ko를 기본 innerHTML로, 속성은 이스케이프본 */
function i18nHtml(value, koSuffix, enSuffix) {
  const koAttr = koSuffix || "data-ko-html";
  const enAttr = enSuffix || "data-en-html";
  return {
    attrs: ` ${enAttr}="${esc(value.en)}" ${koAttr}="${esc(value.ko)}"`,
    inner: value.ko,
  };
}

/* 단일 프로젝트 카드 HTML 생성 (kind: 'year' | 'wip' | 'failed') */
function renderCard(card, kind) {
  const I = "              "; // 14칸 들여쓰기(카드 내부 요소)
  const extraClass =
    kind === "wip" ? " project-wip" : kind === "failed" ? " project-failed" : "";
  const lines = [];

  if (card.comment) lines.push(`            <!-- ${card.comment} -->`);
  lines.push(
    `            <div class="project-card${extraClass}" data-category="${card.category}" data-tilt>`
  );
  lines.push(`${I}<span class="project-num"></span>`);
  lines.push(`${I}<div class="project-top">`);
  lines.push(`                <i class="${card.icon} project-icon"></i>`);
  lines.push(`                <div class="project-links">`);
  if (card.detail) {
    lines.push(
      `                  <a href="${card.detail}" class="plink plink-detail" title="자세히 보기"><i class="fas fa-arrow-right"></i></a>`
    );
  }
  for (const link of card.links || []) {
    lines.push(
      `                  <a href="${link.href}" target="_blank" rel="noopener noreferrer" class="plink plink-github" title="${esc(
        link.title
      )}"><i class="${link.icon}"></i></a>`
    );
  }
  lines.push(`                </div>`);
  lines.push(`${I}</div>`);

  if (card.badge) {
    const badgeCls = kind === "failed" ? "failed-badge" : "wip-badge";
    lines.push(
      `${I}<div class="${badgeCls}" data-en="${esc(card.badge.en)}" data-ko="${esc(
        card.badge.ko
      )}">${esc(card.badge.ko)}</div>`
    );
  }

  const title = i18nText(card.title);
  lines.push(`${I}<h3${title.attrs}>${title.inner}</h3>`);

  const subtitle = i18nText(card.subtitle);
  lines.push(`${I}<p class="project-subtitle"${subtitle.attrs}>${subtitle.inner}</p>`);

  if (card.descHtml) {
    const d = i18nHtml(card.descHtml);
    lines.push(`${I}<p${d.attrs}>${d.inner}</p>`);
  } else {
    const d = i18nText(card.desc);
    lines.push(`${I}<p${d.attrs}>${d.inner}</p>`);
  }

  if (card.progress != null) {
    lines.push(
      `${I}<div class="progress-bar-wrap"><div class="progress-fill" data-progress="${card.progress}"><span class="progress-text">${card.progress}%</span></div></div>`
    );
  }

  if (card.failedReason) {
    const f = i18nHtml(card.failedReason);
    lines.push(`${I}<div class="failed-reason"${f.attrs}>${f.inner}</div>`);
  }

  const spans = card.tech
    .map((t) =>
      typeof t === "string"
        ? `<span>${esc(t)}</span>`
        : `<span data-en="${esc(t.en)}" data-ko="${esc(t.ko)}">${esc(t.ko)}</span>`
    )
    .join("");
  lines.push(`${I}<div class="tech-stack">${spans}</div>`);

  lines.push(`            </div>`);
  return lines.join("\n");
}

/* 연도/상태 그룹 블록 HTML 생성 */
function renderGroup(group) {
  const cls =
    group.kind === "wip"
      ? " year-group-wip"
      : group.kind === "failed"
      ? " year-group-failed"
      : "";
  const dataYear =
    group.kind === "wip" ? "wip" : group.kind === "failed" ? "failed" : group.year;
  const heading = group.kind === "year" ? group.year : group.heading;
  const cards = group.cards.map((c) => renderCard(c, group.kind)).join("\n\n");
  return [
    `        <div class="year-group${cls}" data-year="${dataYear}">`,
    `          <h3 class="year-heading">${heading}</h3>`,
    `          <div class="projects-grid">`,
    ``,
    cards,
    ``,
    `          </div>`,
    `        </div>`,
  ].join("\n");
}

/* 전체 프로젝트 영역(마커 사이) HTML 생성 */
function buildRegion(data) {
  return data.groups.map(renderGroup).join("\n\n");
}

const START =
  "        <!-- BUILD:PROJECTS:START — 이 블록은 projects.json + build.js로 생성됩니다. 직접 수정하지 마세요. -->";
const END = "        <!-- BUILD:PROJECTS:END -->";

function main() {
  const root = __dirname;
  const data = JSON.parse(
    fs.readFileSync(path.join(root, "projects.json"), "utf8")
  );
  let html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const region = buildRegion(data);

  const sIdx = html.indexOf(START);
  if (sIdx !== -1) {
    /* 이미 마커가 있는 경우: 마커 사이만 교체 */
    const eIdx = html.indexOf(END);
    if (eIdx === -1) throw new Error("END 마커를 찾을 수 없습니다.");
    html = html.slice(0, sIdx) + START + "\n" + region + "\n" + END + html.slice(eIdx + END.length);
  } else {
    /* 최초 주입: 기존 연도별 그룹 영역을 찾아 마커로 감싸 교체 */
    const startBoundary = "        <!-- ===== 연도별 그룹";
    const bIdx = html.indexOf(startBoundary);
    if (bIdx === -1) throw new Error("연도별 그룹 시작 경계를 찾을 수 없습니다.");
    const tail = "\n      </div>\n    </section>";
    const tIdx = html.indexOf(tail, bIdx);
    if (tIdx === -1) throw new Error("프로젝트 섹션 종료 경계를 찾을 수 없습니다.");
    html = html.slice(0, bIdx) + START + "\n" + region + "\n" + END + html.slice(tIdx);
  }

  fs.writeFileSync(path.join(root, "index.html"), html);
  const count = data.groups.reduce((n, g) => n + g.cards.length, 0);
  console.log(`build 완료: ${data.groups.length}개 그룹 / ${count}개 카드 생성`);
}

if (require.main === module) main();

module.exports = { buildRegion, renderCard, renderGroup, esc };
