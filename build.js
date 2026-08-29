#!/usr/bin/env node
/* =====================================================================
   build.js — projects.json 데이터로 index.html의 프로젝트 목록을 생성
   - 단일 데이터 소스(projects.json)에서 연도별/진행중/진행중단/실패 카드 HTML을 생성
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

/* 단일 프로젝트 카드 HTML 생성 (kind: 'year' | 'wip' | 'discontinued' | 'failed') */
function renderCard(card, kind) {
  const I = "              "; // 14칸 들여쓰기(카드 내부 요소)
  const extraClass =
    kind === "wip"
      ? " project-wip"
      : kind === "discontinued"
      ? " project-discontinued"
      : kind === "failed"
      ? " project-failed"
      : "";
  const previewClass = card.preview ? " project-card-previewable" : "";
  const lines = [];

  if (card.comment) lines.push(`            <!-- ${card.comment} -->`);
  /* 상세 페이지가 있으면 카드 전체를 클릭 영역으로 만든다 (#114).
     실제 이동은 script.js #28이 처리하고, JS가 없어도 카드 안 "자세히"
     링크로 같은 페이지에 도달하므로 접근 경로가 사라지지 않는다. */
  const cardHref = card.detail ? ` data-card-href="${esc(card.detail)}"` : "";
  lines.push(
    `            <div class="project-card${extraClass}${previewClass}" data-category="${card.category}"${cardHref} data-tilt>`
  );
  lines.push(`${I}<div class="project-top">`);
  lines.push(`                <i class="${card.icon} project-icon"></i>`);
  lines.push(`                <div class="project-links">`);
  if (card.detail) {
    lines.push(
      `                  <a href="${card.detail}" class="plink plink-detail" title="자세히 보기"><i class="fas fa-arrow-right"></i></a>`
    );
  }
  for (const link of card.links || []) {
    if (link.action === "notice") {
      const messageKo = link.message?.ko || "준비 중";
      const messageEn = link.message?.en || "Coming soon";
      lines.push(
        `                  <button type="button" class="plink plink-github plink-notice" title="${esc(
          link.title
        )}" aria-label="${esc(link.title)}: ${esc(messageKo)}" data-notice-ko="${esc(
          messageKo
        )}" data-notice-en="${esc(messageEn)}"><i class="${link.icon}"></i></button>`
      );
      continue;
    }
    lines.push(
      `                  <a href="${link.href}" target="_blank" rel="noopener noreferrer" class="plink plink-github" title="${esc(
        link.title
      )}"><i class="${link.icon}"></i></a>`
    );
  }
  lines.push(`                </div>`);
  lines.push(`${I}</div>`);

  /* 클릭 전 미디어 프리뷰 — projects.json에 실제 로컬 자산이 지정된 카드만 렌더한다.
     장식적 미리보기이므로 중복 스크린리더 낭독을 피하고 카드 자체가 클릭 경로를 유지한다. */
  if (card.preview?.src) {
    const fitClass = card.preview.fit === "contain" ? " project-preview-contain" : "";
    lines.push(`${I}<figure class="project-preview${fitClass}" aria-hidden="true">`);
    lines.push(`                <img src="${esc(card.preview.src)}" alt="" loading="lazy" decoding="async" />`);
    lines.push(`${I}</figure>`);
  }

  if (card.badge) {
    const badgeCls =
      kind === "failed"
        ? "failed-badge"
        : kind === "discontinued"
        ? "discontinued-badge"
        : "wip-badge";
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

  /* 역할 한 줄 — 상세 페이지의 「나의 역할」과 같은 표기를 카드에 노출 (#114).
     role이 없는 카드(상세 페이지에 역할 표기가 없는 항목)는 이 줄을 생략한다. */
  if (card.role) {
    const role = i18nText(card.role);
    lines.push(
      `${I}<p class="project-role"${role.attrs}><i class="fas fa-user-tag"></i> ${role.inner}</p>`
    );
  }

  if (card.descHtml) {
    const d = i18nHtml(card.descHtml);
    lines.push(`${I}<p${d.attrs}>${d.inner}</p>`);
  } else {
    const d = i18nText(card.desc);
    lines.push(`${I}<p${d.attrs}>${d.inner}</p>`);
  }

  /* 진행 상태 — 자기신고 %(0% · 5%는 빈 막대) 대신 상태 라벨 한 줄 (#114) */
  if (card.status) {
    const status = i18nText(card.status);
    const statusCls = kind === "discontinued" ? "discontinued-status" : "wip-status";
    lines.push(`${I}<div class="${statusCls}"${status.attrs}>${status.inner}</div>`);
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
      : group.kind === "discontinued"
      ? " year-group-discontinued"
      : group.kind === "failed"
      ? " year-group-failed"
      : "";
  const dataYear =
    group.kind === "wip"
      ? "wip"
      : group.kind === "discontinued"
      ? "discontinued"
      : group.kind === "failed"
      ? "failed"
      : group.year;
  const heading = group.kind === "year" ? group.year : group.heading;
  const cards = group.cards.map((c) => renderCard(c, group.kind)).join("\n\n");

  /* 실패 그룹은 기본 접힘(collapsible) — 버튼 헤더로 펼침/접힘 (미니멀 지향).
     i18n(script.js)이 '.year-group-failed .year-heading' 의 textContent 를 바꾸므로
     제목은 h3 로 유지하고 토글 아이콘은 형제 요소로 둔다. */
  if (group.kind === "failed") {
    return [
      `        <div class="year-group${cls}" data-year="${dataYear}">`,
      `          <button class="failed-toggle" type="button" aria-expanded="false" aria-controls="failed-grid">`,
      `            <h3 class="year-heading">${heading}</h3>`,
      `            <i class="fas fa-chevron-down failed-toggle-icon" aria-hidden="true"></i>`,
      `          </button>`,
      `          <div class="projects-grid failed-grid is-collapsed" id="failed-grid">`,
      ``,
      cards,
      ``,
      `          </div>`,
      `        </div>`,
    ].join("\n");
  }

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
