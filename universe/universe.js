/* ========================================================================== 
   Universe Observatory runtime
   projects.json을 단일 프로젝트 데이터 원본으로 사용하고, 성장·수상 보조 데이터만
   universe-data.json에서 읽습니다. 프레임워크나 외부 런타임 의존성은 없습니다.
   ========================================================================== */
(function initUniverseObservatory() {
  "use strict";

  const root = document.documentElement;
  const mobileQuery = window.matchMedia("(max-width: 720px)");
  const ui = {
    languageToggle: document.querySelector("[data-language-toggle]"),
    themeToggle: document.querySelector("[data-theme-toggle]"),
    routeButtons: Array.from(document.querySelectorAll("[data-zone]")),
    zoneCoordinate: document.querySelector("[data-zone-coordinate]"),
    zoneTitle: document.querySelector("[data-zone-title]"),
    zoneDescription: document.querySelector("[data-zone-description]"),
    skyMap: document.querySelector("#sky-map"),
    lines: document.querySelector("[data-lines]"),
    points: document.querySelector("[data-points]"),
    loading: document.querySelector("[data-loading]"),
    error: document.querySelector("[data-error]"),
    errorDetail: document.querySelector("[data-error-detail]"),
    observation: document.querySelector("[data-observation]"),
    observationClose: document.querySelector("[data-observation-close]"),
    observationEyebrow: document.querySelector("[data-observation-eyebrow]"),
    observationTitle: document.querySelector("[data-observation-title]"),
    observationRole: document.querySelector("[data-observation-role]"),
    observationDescription: document.querySelector("[data-observation-description]"),
    observationTech: document.querySelector("[data-observation-tech]"),
    observationLink: document.querySelector("[data-observation-link]"),
    unknownStar: document.querySelector("[data-unknown-star]"),
    themeColor: document.querySelector('meta[name="theme-color"]')
  };

  const state = {
    language: readStoredValue("lang", "ko") === "en" ? "en" : "ko",
    theme: root.dataset.theme === "light" ? "light" : "dark",
    zones: {},
    currentZone: "2026",
    selectedId: null,
    visitedZones: new Set(),
    wasMobile: mobileQuery.matches,
    ready: false
  };

  /* 연도별 형태는 서로 다른 실루엣을 사용하고, 미래 연도는 generic을 재사용합니다. */
  const wideShapes = {
    "2026": [[21, 29], [40, 17], [59, 31], [72, 48], [58, 62], [39, 54], [19, 69], [45, 82], [71, 75]],
    "2025": [[24, 74], [34, 38], [52, 19], [72, 39], [65, 76]],
    "2024": [[18, 38], [31, 25], [45, 35], [43, 60], [60, 72], [78, 61]],
    generic: [[18, 72], [30, 33], [47, 19], [64, 35], [77, 68], [48, 79]]
  };

  const narrowShapes = {
    "2026": [[30, 8], [68, 17], [32, 27], [66, 38], [30, 49], [66, 59], [31, 70], [67, 81], [38, 92]],
    "2025": [[30, 10], [68, 29], [31, 49], [67, 70], [40, 91]],
    "2024": [[30, 9], [68, 23], [31, 38], [67, 55], [32, 73], [63, 91]],
    generic: [[31, 8], [67, 26], [31, 43], [66, 60], [32, 77], [62, 92]]
  };

  const growthRankWide = [[11, 79], [23, 69], [36, 73], [49, 55], [62, 60], [75, 40], [87, 24]];
  const growthRankNarrow = [[34, 92], [66, 80], [34, 68], [66, 56], [34, 44], [66, 31], [39, 12]];
  const awardWide = [[29, 31], [66, 31], [66, 69], [29, 69]];
  const awardNarrow = [[31, 18], [68, 34], [68, 67], [31, 83]];

  /* localStorage가 차단된 환경에서도 기본값으로 계속 동작합니다. */
  function readStoredValue(key, fallback) {
    try {
      return window.localStorage.getItem(key) || fallback;
    } catch (error) {
      return fallback;
    }
  }

  function writeStoredValue(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (error) {
      /* 저장 불가 환경은 현재 세션 상태만 사용합니다. */
    }
  }

  function pickForLanguage(value, language) {
    if (value == null) return "";
    if (typeof value === "string") return value;
    return value[language] || value.ko || value.en || "";
  }

  function pick(value) {
    return pickForLanguage(value, state.language);
  }

  function toPlainText(value, language) {
    const localized = pickForLanguage(value, language);
    if (!localized) return "";
    const parser = new DOMParser();
    const documentFragment = parser.parseFromString(
      localized.replace(/<br\s*\/?>/gi, " · "),
      "text/html"
    );
    return (documentFragment.body.textContent || "").replace(/\s+/g, " ").trim();
  }

  function buildLocalizedDescription(card) {
    const description = {};
    ["ko", "en"].forEach((language) => {
      const parts = [toPlainText(card.descHtml || card.desc, language)];
      if (card.failedReason) parts.push(toPlainText(card.failedReason, language));
      description[language] = parts.filter(Boolean).join(" ");
    });
    return description;
  }

  function makeId(value, fallback) {
    const source = String(value || fallback || "point").toLowerCase();
    const id = source
      .replace(/^projects\//, "")
      .replace(/\/$/, "")
      .replace(/[^a-z0-9가-힣_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return id || fallback || "point";
  }

  function localDetailHref(detail) {
    if (!detail) return "";
    if (/^https?:\/\//i.test(detail)) return detail;
    return "../" + String(detail).replace(/^\/+/, "");
  }

  /* projects.json 카드를 관측 UI가 사용하는 공통 천체 모델로 변환합니다. */
  function projectToPoint(card, kind, index) {
    const title = card.title || card.comment || `Project ${index + 1}`;
    const stateLabel = card.status || card.badge || {
      ko: kind === "completed" ? "완료 프로젝트" : "프로젝트 기록",
      en: kind === "completed" ? "Completed project" : "Project record"
    };
    return {
      id: makeId(card.comment || card.detail || pick(title), `${kind}-${index}`),
      kind,
      title,
      role: card.role || stateLabel,
      description: buildLocalizedDescription(card),
      tech: Array.isArray(card.tech) ? card.tech : [],
      detail: localDetailHref(card.detail),
      stateLabel
    };
  }

  function buildProjectZones(projectData) {
    if (!projectData || !Array.isArray(projectData.groups)) {
      throw new Error("projects.json의 groups 배열을 찾을 수 없습니다.");
    }

    const zones = {};
    const yearGroups = projectData.groups.filter((group) => group.kind === "year" && group.year);
    yearGroups.forEach((group) => {
      const items = (group.cards || []).map((card, index) => projectToPoint(card, "completed", index));
      zones[String(group.year)] = {
        id: String(group.year),
        title: {
          ko: `${group.year} 관측 영역`,
          en: `${group.year} observation sector`
        },
        description: {
          ko: `${items.length}개의 완료 프로젝트가 현재 별자리를 이룹니다. 이름을 선택하면 관측 기록이 열립니다.`,
          en: `${items.length} completed projects form this constellation. Select a name to open its observation record.`
        },
        items,
        linked: true,
        shape: String(group.year)
      };
    });

    const lostItems = [];
    projectData.groups
      .filter((group) => ["wip", "discontinued", "failed"].includes(group.kind))
      .forEach((group) => {
        (group.cards || []).forEach((card, index) => {
          lostItems.push(projectToPoint(card, group.kind, index));
        });
      });

    zones.lost = {
      id: "lost",
      title: {
        ko: "신호가 끊긴 구역",
        en: "Sector of interrupted signals"
      },
      description: {
        ko: "진행 중·중단·실패 기록을 지우지 않고 서로 다른 천체 상태로 남깁니다.",
        en: "In-progress, discontinued, and failed records remain visible as distinct celestial states."
      },
      items: lostItems,
      linked: false,
      shape: "lost"
    };

    return zones;
  }

  /* Rank 노드를 중심축으로 두고 성장 사건은 두 등급 사이의 보조 천체로 배치합니다. */
  function buildGrowthZone(growthData) {
    if (!growthData || !Array.isArray(growthData.ranks) || !Array.isArray(growthData.records)) {
      throw new Error("universe-data.json의 growth 구조를 읽을 수 없습니다.");
    }

    const rankItems = growthData.ranks.map((rank, index) => ({
      id: `rank-${makeId(rank.replace("-", "-minus").replace("+", "-plus"), index)}`,
      kind: "rank",
      rankIndex: index,
      title: rank,
      role: {
        ko: "GitHub Rank 성장 축",
        en: "GitHub Rank growth axis"
      },
      description: {
        ko: `GitHub 활동 기록이 ${rank} 등급에 닿은 성장 지점입니다.`,
        en: `A growth point where the GitHub activity record reached rank ${rank}.`
      },
      tech: ["GitHub Rank Insight"],
      detail: "../projects/github_rank_insight/"
    }));

    const recordItems = growthData.records.map((record, index) => ({
      id: record.id || `growth-record-${index}`,
      kind: "growth-record",
      between: record.between,
      title: record.title,
      role: record.period,
      description: record.description,
      tech: [],
      detail: localDetailHref(record.detail)
    }));

    return {
      id: "growth",
      title: growthData.title,
      description: growthData.description,
      items: rankItems.concat(recordItems),
      ranks: rankItems,
      records: recordItems,
      linked: true,
      shape: "growth"
    };
  }

  function buildAwardsZone(awardData) {
    if (!awardData || !Array.isArray(awardData.items) || awardData.items.length !== 4) {
      throw new Error("수상 기록은 정확히 네 개여야 합니다.");
    }

    return {
      id: "awards",
      title: awardData.title,
      description: awardData.description,
      items: awardData.items.map((award, index) => ({
        id: award.id || `award-${index}`,
        kind: "award",
        title: award.title,
        role: award.result,
        description: award.description,
        tech: [],
        detail: localDetailHref(award.detail)
      })),
      linked: true,
      shape: "awards"
    };
  }

  function resamplePath(sourcePoints, count) {
    if (!count) return [];
    if (count === 1) return [sourcePoints[0]];
    if (count === sourcePoints.length) return sourcePoints.map((point) => point.slice());

    const lengths = [0];
    let totalLength = 0;
    for (let index = 1; index < sourcePoints.length; index += 1) {
      totalLength += Math.hypot(
        sourcePoints[index][0] - sourcePoints[index - 1][0],
        sourcePoints[index][1] - sourcePoints[index - 1][1]
      );
      lengths.push(totalLength);
    }

    return Array.from({ length: count }, (_, index) => {
      const targetLength = (totalLength * index) / (count - 1);
      let segment = 1;
      while (segment < lengths.length - 1 && lengths[segment] < targetLength) segment += 1;
      const segmentLength = lengths[segment] - lengths[segment - 1] || 1;
      const ratio = (targetLength - lengths[segment - 1]) / segmentLength;
      return [
        sourcePoints[segment - 1][0] + (sourcePoints[segment][0] - sourcePoints[segment - 1][0]) * ratio,
        sourcePoints[segment - 1][1] + (sourcePoints[segment][1] - sourcePoints[segment - 1][1]) * ratio
      ];
    });
  }

  function layoutYearZone(zone, isMobile) {
    const shapes = isMobile ? narrowShapes : wideShapes;
    const source = shapes[zone.shape] || shapes.generic;
    const positions = resamplePath(source, zone.items.length);
    const edges = positions.slice(1).map((point, index) => ({ from: index, to: index + 1, secondary: false }));
    return { positions, edges };
  }

  function layoutLostZone(zone, isMobile) {
    const source = isMobile
      ? [[29, 7], [67, 15], [31, 24], [68, 34], [28, 43], [65, 52], [31, 61], [68, 69], [28, 78], [65, 87], [42, 95]]
      : [[15, 28], [30, 61], [44, 23], [58, 68], [72, 32], [82, 63], [22, 81], [51, 45], [68, 15], [40, 84], [11, 52]];
    return { positions: resamplePath(source, zone.items.length), edges: [] };
  }

  function layoutGrowthZone(zone, isMobile) {
    const rankPositions = (isMobile ? growthRankNarrow : growthRankWide).map((point) => point.slice());
    const positions = rankPositions.slice();
    const edges = rankPositions.slice(1).map((point, index) => ({ from: index, to: index + 1, secondary: false }));

    zone.records.forEach((record, recordIndex) => {
      const fromRank = zone.ranks.findIndex((rank) => rank.title === record.between[0]);
      const toRank = zone.ranks.findIndex((rank) => rank.title === record.between[1]);
      const safeFrom = fromRank >= 0 ? fromRank : recordIndex;
      const safeTo = toRank >= 0 ? toRank : Math.min(recordIndex + 1, rankPositions.length - 1);
      const fromPoint = rankPositions[safeFrom];
      const toPoint = rankPositions[safeTo];
      const direction = recordIndex % 2 === 0 ? -1 : 1;
      const offsetX = isMobile ? direction * 17 : 0;
      const offsetY = isMobile ? 0 : direction * 11;
      positions.push([
        Math.max(10, Math.min(90, (fromPoint[0] + toPoint[0]) / 2 + offsetX)),
        Math.max(8, Math.min(92, (fromPoint[1] + toPoint[1]) / 2 + offsetY))
      ]);
      const itemIndex = zone.ranks.length + recordIndex;
      edges.push({ from: safeFrom, to: itemIndex, secondary: true });
      edges.push({ from: itemIndex, to: safeTo, secondary: true });
    });

    return { positions, edges };
  }

  function layoutAwardsZone(zone, isMobile) {
    const positions = (isMobile ? awardNarrow : awardWide).map((point) => point.slice());
    const edges = positions.map((point, index) => ({ from: index, to: (index + 1) % positions.length, secondary: false }));
    return { positions, edges };
  }

  function getLayout(zone) {
    const isMobile = mobileQuery.matches;
    if (zone.shape === "growth") return layoutGrowthZone(zone, isMobile);
    if (zone.shape === "awards") return layoutAwardsZone(zone, isMobile);
    if (zone.shape === "lost") return layoutLostZone(zone, isMobile);
    return layoutYearZone(zone, isMobile);
  }

  function renderLines(layout) {
    ui.lines.replaceChildren();
    layout.edges.forEach((edge) => {
      const from = layout.positions[edge.from];
      const to = layout.positions[edge.to];
      if (!from || !to) return;
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", `M ${from[0] * 10} ${from[1] * 7} L ${to[0] * 10} ${to[1] * 7}`);
      if (edge.secondary) path.classList.add("is-secondary");
      ui.lines.appendChild(path);
    });
  }

  function createPointButton(item, position, index) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "celestial-point";
    button.dataset.pointId = item.id;
    button.dataset.kind = item.kind;
    button.style.setProperty("--x", `${position[0]}%`);
    button.style.setProperty("--y", `${position[1]}%`);
    button.setAttribute("aria-label", `${pick(item.title)} ${state.language === "ko" ? "관측" : "observation"}`);
    button.setAttribute("aria-pressed", state.selectedId === item.id ? "true" : "false");
    if (position[0] > 62) button.classList.add("is-flipped");

    const core = document.createElement("span");
    core.className = "celestial-point__core";
    core.setAttribute("aria-hidden", "true");
    const label = document.createElement("span");
    label.className = "celestial-point__label";
    label.textContent = pick(item.title);
    button.append(core, label);
    button.addEventListener("click", () => selectPoint(item, button, true));
    button.style.zIndex = String(4 + (index % 2));
    return button;
  }

  function renderZone(zoneId, options) {
    const zone = state.zones[zoneId];
    if (!zone) return;
    const config = options || {};
    const layout = getLayout(zone);

    state.currentZone = zoneId;
    state.visitedZones.add(zoneId);
    if (!config.keepSelection) state.selectedId = null;

    ui.routeButtons.forEach((button) => {
      const selected = button.dataset.zone === zoneId;
      button.setAttribute("aria-selected", String(selected));
      button.tabIndex = selected ? 0 : -1;
    });

    ui.zoneCoordinate.textContent = `OBSERVATION / ${zoneId.toUpperCase()}`;
    ui.zoneTitle.textContent = pick(zone.title);
    ui.zoneDescription.textContent = pick(zone.description);
    ui.skyMap.setAttribute("aria-label", pick(zone.title));
    ui.skyMap.style.setProperty("--map-height", `${Math.max(650, zone.items.length * 66 + 170)}px`);
    ui.points.replaceChildren();
    renderLines(layout);

    zone.items.forEach((item, index) => {
      ui.points.appendChild(createPointButton(item, layout.positions[index], index));
    });

    if (state.selectedId) {
      const selectedItem = zone.items.find((item) => item.id === state.selectedId);
      const selectedButton = Array.from(ui.points.querySelectorAll("[data-point-id]"))
        .find((button) => button.dataset.pointId === state.selectedId);
      if (selectedItem && selectedButton) selectPoint(selectedItem, selectedButton, false);
      else closeObservation(false);
    } else {
      closeObservation(false);
    }

    if (state.visitedZones.size >= 4) ui.unknownStar.hidden = false;
    if (config.updateUrl !== false) updateHash();
  }

  function renderObservation(item) {
    ui.observationEyebrow.textContent = `${state.currentZone.toUpperCase()} / OBSERVATION`;
    ui.observationTitle.textContent = pick(item.title);
    ui.observationRole.textContent = pick(item.role || item.stateLabel);
    ui.observationDescription.textContent = pick(item.description) ||
      (state.language === "ko" ? "설명이 아직 기록되지 않은 천체입니다." : "This object's description has not been recorded yet.");
    ui.observationTech.replaceChildren();

    (item.tech || []).forEach((technology) => {
      const listItem = document.createElement("li");
      listItem.textContent = pick(technology);
      ui.observationTech.appendChild(listItem);
    });

    if (item.detail) {
      ui.observationLink.hidden = false;
      ui.observationLink.href = item.detail;
    } else {
      ui.observationLink.hidden = true;
      ui.observationLink.removeAttribute("href");
    }
    ui.observation.hidden = false;
  }

  function selectPoint(item, button, updateUrl) {
    ui.points.querySelectorAll(".celestial-point").forEach((point) => point.setAttribute("aria-pressed", "false"));
    if (button) button.setAttribute("aria-pressed", "true");
    state.selectedId = item.id;
    renderObservation(item);
    if (updateUrl) updateHash();
  }

  function closeObservation(updateUrl) {
    state.selectedId = null;
    ui.observation.hidden = true;
    ui.points.querySelectorAll(".celestial-point").forEach((point) => point.setAttribute("aria-pressed", "false"));
    if (updateUrl) updateHash();
  }

  function updateHash() {
    const suffix = state.selectedId ? `/${encodeURIComponent(state.selectedId)}` : "";
    const nextHash = `#${encodeURIComponent(state.currentZone)}${suffix}`;
    if (window.location.hash !== nextHash) window.history.replaceState(null, "", nextHash);
  }

  function readHash() {
    const parts = window.location.hash.replace(/^#/, "").split("/").filter(Boolean).map(decodeURIComponent);
    return { zone: parts[0] || "2026", point: parts[1] || null };
  }

  function applyHash() {
    if (!state.ready) return;
    const target = readHash();
    const zoneId = state.zones[target.zone] ? target.zone : "2026";
    state.selectedId = target.point;
    renderZone(zoneId, { keepSelection: true, updateUrl: false });
    if (!state.selectedId) updateHash();
  }

  /* 정적 data-* 문구와 동적으로 생성된 성도를 같은 언어 상태로 갱신합니다. */
  function applyLanguage(language) {
    state.language = language === "en" ? "en" : "ko";
    root.lang = state.language;
    writeStoredValue("lang", state.language);

    document.querySelectorAll("[data-ko][data-en]").forEach((element) => {
      const value = element.getAttribute(`data-${state.language}`);
      if (element.tagName === "META") element.setAttribute("content", value);
      else element.textContent = value;
    });

    ui.languageToggle.textContent = state.language === "ko" ? "EN" : "KO";
    ui.languageToggle.setAttribute(
      "aria-label",
      state.language === "ko" ? "English로 전환" : "한국어로 전환"
    );
    document.title = state.language === "ko"
      ? "Universe Observatory | 이건영"
      : "Universe Observatory | Lee Geon Yeong";
    document.querySelector(".return-gateway").setAttribute(
      "aria-label",
      state.language === "ko" ? "v2 포트폴리오로 돌아가기" : "Return to the v2 portfolio"
    );
    document.querySelector(".observatory-controls").setAttribute(
      "aria-label",
      state.language === "ko" ? "Universe 설정" : "Universe settings"
    );
    document.querySelector(".orbit-route").setAttribute(
      "aria-label",
      state.language === "ko" ? "Universe 관측 지점" : "Universe observation sectors"
    );
    document.querySelector(".state-legend").setAttribute(
      "aria-label",
      state.language === "ko" ? "천체 상태 범례" : "Celestial state legend"
    );
    ui.unknownStar.setAttribute(
      "aria-label",
      state.language === "ko" ? "이름 없는 별" : "Unnamed star"
    );
    ui.observationClose.setAttribute(
      "aria-label",
      state.language === "ko" ? "관측 기록 닫기" : "Close observation record"
    );
    applyTheme(state.theme);

    if (state.ready) renderZone(state.currentZone, { keepSelection: true, updateUrl: false });
  }

  function applyTheme(theme) {
    state.theme = theme === "light" ? "light" : "dark";
    root.dataset.theme = state.theme;
    writeStoredValue("v3-theme", state.theme);
    const isDark = state.theme === "dark";
    ui.themeToggle.textContent = isDark ? "LIGHT" : "DARK";
    ui.themeToggle.setAttribute(
      "aria-label",
      state.language === "ko"
        ? `${isDark ? "라이트" : "다크"} 모드로 전환`
        : `Switch to ${isDark ? "light" : "dark"} mode`
    );
    ui.themeColor.setAttribute("content", isDark ? "#10151e" : "#e8eaf2");
  }

  function showUnknownObservation() {
    state.selectedId = null;
    ui.points.querySelectorAll(".celestial-point").forEach((point) => point.setAttribute("aria-pressed", "false"));
    renderObservation({
      id: "unknown-thirteenth-star",
      title: {
        ko: "이름 없는 열세 번째 별",
        en: "The unnamed thirteenth star"
      },
      role: {
        ko: "UNKNOWN / 분류되지 않은 좌표",
        en: "UNKNOWN / Uncatalogued coordinate"
      },
      description: {
        ko: "기록되지 않은 항로가 감지되었습니다. 이 좌표의 다음 기록은 아직 열리지 않았습니다.",
        en: "An unrecorded route has been detected. The next record at this coordinate is not open yet."
      },
      tech: [],
      detail: ""
    });
    updateHash();
  }

  function showLoadError(error) {
    ui.loading.hidden = true;
    ui.skyMap.hidden = true;
    ui.error.hidden = false;
    const prefix = state.language === "ko" ? "오류 정보: " : "Error detail: ";
    ui.errorDetail.textContent = prefix + (error && error.message ? error.message : String(error));
  }

  function bindControls() {
    ui.routeButtons.forEach((button) => {
      button.addEventListener("click", () => renderZone(button.dataset.zone));
      button.addEventListener("keydown", (event) => {
        if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
        const currentIndex = ui.routeButtons.indexOf(button);
        let nextIndex = currentIndex;
        if (["ArrowDown", "ArrowRight"].includes(event.key)) nextIndex = (currentIndex + 1) % ui.routeButtons.length;
        if (["ArrowUp", "ArrowLeft"].includes(event.key)) nextIndex = (currentIndex - 1 + ui.routeButtons.length) % ui.routeButtons.length;
        if (event.key === "Home") nextIndex = 0;
        if (event.key === "End") nextIndex = ui.routeButtons.length - 1;
        ui.routeButtons[nextIndex].focus();
        ui.routeButtons[nextIndex].click();
        event.preventDefault();
      });
    });

    ui.languageToggle.addEventListener("click", () => applyLanguage(state.language === "ko" ? "en" : "ko"));
    ui.themeToggle.addEventListener("click", () => applyTheme(state.theme === "dark" ? "light" : "dark"));
    ui.observationClose.addEventListener("click", () => closeObservation(true));
    ui.unknownStar.addEventListener("click", showUnknownObservation);
    window.addEventListener("hashchange", applyHash);
    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !ui.observation.hidden) closeObservation(true);
    });

    const handleBreakpointChange = () => {
      if (!state.ready || state.wasMobile === mobileQuery.matches) return;
      state.wasMobile = mobileQuery.matches;
      renderZone(state.currentZone, { keepSelection: true, updateUrl: false });
    };
    if (typeof mobileQuery.addEventListener === "function") mobileQuery.addEventListener("change", handleBreakpointChange);
    else mobileQuery.addListener(handleBreakpointChange);
  }

  async function loadUniverse() {
    try {
      const [projectsResponse, universeResponse] = await Promise.all([
        fetch("../projects.json", { cache: "no-cache" }),
        fetch("universe-data.json", { cache: "no-cache" })
      ]);
      if (!projectsResponse.ok) throw new Error(`projects.json HTTP ${projectsResponse.status}`);
      if (!universeResponse.ok) throw new Error(`universe-data.json HTTP ${universeResponse.status}`);

      const [projectData, universeData] = await Promise.all([
        projectsResponse.json(),
        universeResponse.json()
      ]);
      state.zones = buildProjectZones(projectData);
      state.zones.growth = buildGrowthZone(universeData.growth);
      state.zones.awards = buildAwardsZone(universeData.awards);

      const requiredZones = ["2026", "2025", "2024", "growth", "awards", "lost"];
      const missingZone = requiredZones.find((zone) => !state.zones[zone]);
      if (missingZone) throw new Error(`${missingZone} 관측 구역 데이터가 없습니다.`);

      state.ready = true;
      ui.loading.hidden = true;
      applyHash();
    } catch (error) {
      showLoadError(error);
    }
  }

  bindControls();
  applyLanguage(state.language);
  applyTheme(state.theme);
  loadUniverse();
})();
