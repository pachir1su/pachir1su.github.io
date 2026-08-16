# 포트폴리오 사이트 성능 감사

- 감사일: 2026-08-16
- 기준: 제공된 저장소 `HEAD` (`e2acc56`)
- 범위: 메인 페이지의 초기 로드, HTML/CSS/JavaScript, DOM과 이벤트, 애니메이션, 이미지·폰트·외부 자원, 반응형 렌더링
- 방법: 저장소 정적 분석. Lighthouse, 브라우저 Performance trace, 실제 Web Vitals 측정은 독립 검증 대상으로 남긴다.

## 요약

현재 메인 페이지는 정적 HTML이라는 장점이 있지만, 프로젝트 카드 전체와 한·영 데이터를 최초 문서에 모두 포함한다. `index.html`은 107,089 B이고 약 절반이 프로젝트 생성 영역이다. `style.css`는 89,052 B, `script.js`는 50,295 B이며, 메인·상세·마인드맵·선택적 시각 효과가 공용 파일에 누적되어 있다.

가장 먼저 개선할 항목은 다음과 같다.

1. Hero 스티커의 무한 `requestAnimationFrame`을 viewport 밖과 reduced-motion에서 중단한다.
2. 769~1024px 구간에서 CSS와 JavaScript의 device 판정 불일치를 해소한다.
3. 프로젝트 필터의 중복 listener와 카드 전체의 중복 DOM 순회를 통합한다.
4. 카드별 `mousemove`의 layout read/write를 제한한다.
5. lazy image에 intrinsic size 또는 `aspect-ratio`를 제공한다.
6. 메인/상세 CSS와 JavaScript 책임을 분리한다.

## 정적 규모

| 자원 | 원본 크기 | gzip level 9 참고치 |
|---|---:|---:|
| `index.html` | 107,089 B | 21,682 B |
| `style.css` | 89,052 B | 17,429 B |
| `script.js` | 50,295 B | 13,854 B |
| `projects.json` | 30,334 B | 8,133 B |

`projects.json`은 브라우저 초기 전송 대상이 아니다. HTML parser 기반 정적 집계에서는 element와 의미 있는 text node가 약 1,636개였고, 프로젝트 카드 31개와 약 558개의 `data-*` 속성이 있었다. BUILD 프로젝트 영역은 약 44.9 KB로 `index.html`의 약 48.8%를 차지했다.

CSS block 기반 정적 집계에서는 selector occurrence 약 663개, 고유 selector 약 560개, 둘 이상 나타난 selector 약 59개를 확인했다. `.project-card`와 `.award-card`는 각각 7회, `.skill-card`는 6회 등장했다. 이는 CSS AST 기반 unused-CSS 결과가 아니라 중복과 cascade 복잡도를 파악하기 위한 참고치다.

## Device별 특성

### Desktop

- 모든 카드에 shadow-follow interaction이 설치된다.
- Hero 스티커 drag와 무한 rAF가 함께 활성화된다.
- 고주사율 display에서 rAF 실행 횟수도 증가한다.
- 외부 stylesheet와 font가 cold load의 first paint에 관여한다.

### Tablet (769~1024px)

- CSS는 `max-width: 1024px`에서 desktop navigation을 숨기고 hamburger를 표시한다.
- JavaScript는 `max-width: 768px`만 mobile로 판정한다.
- 따라서 UI는 tablet/mobile 구조인데 sticker drag와 카드 mouse interaction은 desktop 방식으로 설치될 수 있다.
- resize/orientation change에 따른 listener 재구성이 없다.

### Mobile (최대 768px)

- 카드 shadow-follow와 sticker drag는 초기화되지 않지만 무한 sticker rAF는 남는다.
- 31개 프로젝트 카드와 모든 i18n 데이터가 동일하게 parse/style된다.
- fixed bottom section navigator와 여러 observer가 긴 1-column 문서에서 계속 동작한다.
- lazy external SVG가 크기 예약 없이 로드되어 layout shift 가능성이 있다.

# Findings

## P0

확인된 P0는 없다. 전체 사용을 차단하거나 모든 device를 지속적으로 멈추게 하는 병목은 정적 분석에서 발견하지 못했다.

## P1

### P1-1. Hero 스티커 rAF가 페이지 수명 동안 중단되지 않는다

- **관련 파일:** `script.js:121-208`, `index.html:195-205`
- **현재 구현:** Hero의 5개 `.fi`마다 상태를 만들고 매 frame `Math.sin`, transform 문자열 생성, inline style write를 수행한다. Hero가 viewport 밖이어도 계속 실행한다.
- **병목 원인:** visibility와 무관한 무한 rAF, frame당 5개 style write, class 확인과 문자열 생성, background tab pause 부재다. reduced-motion에서도 부유량만 0이 되고 loop는 계속된다.
- **사용자 영향:** 긴 문서를 읽는 동안 CPU·배터리를 계속 사용한다. 저사양 mobile/tablet에서는 scroll frame 안정성을 악화시킬 수 있다.
- **개선:** Hero `IntersectionObserver`, `visibilitychange`, reduced-motion을 이용해 loop 자체를 중단한다. idle float는 CSS compositor animation으로 옮기고 drag 중에만 JS를 쓰는 대안도 있다.
- **Trade-off:** 재진입 시 animation phase가 끊길 수 있고 CSS animation과 drag transform을 합치려면 wrapper가 필요할 수 있다.

### P1-2. Tablet breakpoint의 CSS/JS device 모델이 충돌한다

- **관련 파일:** `script.js:10-11,148-179,287-305`, `style.css:1219-1226,2126-2147`
- **현재 구현:** CSS는 1024px부터 hamburger UI를 쓰지만 JS는 768px까지만 mobile로 본다.
- **병목 원인:** 769~1024px tablet에 desktop mouse listener가 등록되며 초기 width 이후 resize 재평가가 없다.
- **사용자 영향:** touch tablet이 불필요한 mouse interaction 초기화와 listener를 부담한다. orientation/split-view 변경 후 UI와 동작이 불일치할 수 있다.
- **개선:** `(hover: hover) and (pointer: fine)` capability query를 사용하고 `MediaQueryList` change에서 setup/cleanup한다.
- **Trade-off:** convertible·stylus device의 정책을 정해야 하며 listener cleanup 코드가 필요하다.

### P1-3. 초기 HTML이 화면 밖 프로젝트 전체를 즉시 DOM으로 만든다

- **관련 파일:** `build.js:43-117`, `index.html:811-1362`
- **현재 구현:** 프로젝트 카드 31개, 양언어 속성, 링크, icon, 기술 stack을 최초 HTML에 전부 포함한다.
- **병목 원인:** 생성 영역이 문서의 약 절반이며 fold 밖 카드도 parse/style된다. WIP/failed도 숨길 뿐 DOM에 남는다.
- **사용자 영향:** mobile에서 첫 화면만 봐도 최하단까지의 DOM 비용을 부담하며 긴 1-column layout의 style/reflow 범위가 커진다.
- **개선:** HTML은 SEO를 위해 유지하되 연도 그룹에 `content-visibility: auto`와 `contain-intrinsic-size`를 검토하고 카드 markup 깊이를 줄인다.
- **Trade-off:** intrinsic size 추정이 틀리면 scrollbar 변화가 생길 수 있어 브라우저 회귀 확인이 필요하다.

### P1-4. 공용 초기 payload와 render-blocking third-party CSS가 과도하다

- **관련 파일:** `index.html:86-111,1430-1433`, `style.css`, `script.js`, `projects/*/index.html`
- **현재 구현:** Google Fonts, Font Awesome, Devicon, AOS CSS, 공용 CSS를 head에서 로드하고 AOS와 공용 JS를 모든 일반 페이지에서 로드한다.
- **병목 원인:** 외부 CSS가 first render 경로에 있고 89 KB CSS와 50 KB JS가 메인·상세 책임을 함께 가진다. Devicon 전체는 Hero icon 5개 때문에 로드된다.
- **사용자 영향:** 높은 RTT의 mobile cold load에서 first paint 편차가 커지고 상세 페이지도 main-only 코드를 parse한다.
- **개선:** common/home/detail CSS·JS를 분리하고 icon을 local SVG로 줄이며 AOS 대체 또는 축소를 검토한다.
- **Trade-off:** request 수와 파일 관리가 늘고 기존 animation의 시각 동등성 검증이 필요하다.

## P2

### P2-1. 카드별 mousemove가 layout read와 style write를 반복한다

- **관련 파일:** `script.js:287-305`, `style.css:1770-1793`
- **현재 구현:** 40개 이상의 카드에 `mousemove`와 `mouseleave` listener를 개별 등록한다. 매 이동마다 `getBoundingClientRect()`를 읽고 custom property 두 개를 쓴다.
- **병목 원인:** 고빈도 event, rAF throttle 부재, rect cache 부재, 카드 수에 비례하는 listener다.
- **사용자 영향:** desktop pointer 이동 중 style recalculation이 반복되고 sticker rAF·scroll과 겹치면 frame drop 및 간접 INP 악화 가능성이 있다.
- **개선:** pointerenter에서 rect를 cache하고 pointermove write를 rAF로 throttle하며 fine pointer에서만 활성화한다.
- **Trade-off:** scroll/resize 시 cache invalidation이 필요하고 shadow 반응이 조금 늦어질 수 있다.

### P2-2. 프로젝트 filter 한 번에 세 listener가 실행된다

- **관련 파일:** `script.js:409-439,629-685`
- **현재 구현:** 기본 filter, failed patch, failed collapse가 같은 버튼에 각각 click listener를 등록한다. 앞의 두 handler는 전체 카드와 group을 두 번 순회한다.
- **병목 원인:** 중복 DOM 순회와 inline `display` write, listener 등록 순서에 의존한 최종 상태다.
- **사용자 영향:** filter click 직후 grid relayout이 집중된다. mobile에서 문서 높이가 크게 바뀔 때 input feedback이 늦을 수 있다.
- **개선:** 판정·active 상태·group 표시·failed collapse를 단일 handler에서 계산 후 한 번 반영한다.
- **Trade-off:** 통합 과정에서 기존 실패 그룹 자동 펼침 계약을 보존해야 한다.

### P2-3. 언어 전환이 전체 문서를 여러 번 query하고 다시 쓴다

- **관련 파일:** `script.js:891-1037`, `build.js:73-114`
- **현재 구현:** selector 번역표, MBTI/mobile menu innerHTML, data attribute fallback, 전체 i18n 요소, meta, stat, project count를 순차 처리한다.
- **병목 원인:** 반복 query, subtree 재생성, 큰 DOM 전체의 text와 line wrapping 변경이다.
- **사용자 영향:** 언어 toggle의 INP가 악화될 수 있고 mobile에서는 아래쪽 문서 전체 높이가 연쇄 변경된다.
- **개선:** 속성 기반 i18n 하나로 통일하고 대상 element를 cache하며 icon과 text node를 분리한다.
- **Trade-off:** 표준 markup 전환 범위가 크고 동적 element를 cache에 반영해야 한다.

### P2-4. lazy image의 크기 예약이 불충분해 CLS 가능성이 있다

- **관련 파일:** `index.html:296-304,372-402`, `style.css:2653-2669`
- **현재 구현:** 학교 logo와 외부 GitHub SVG 3개에 HTML `width`/`height`가 없다. GitHub card CSS는 width와 `height:auto`만 지정한다.
- **병목 원인:** lazy third-party SVG의 aspect ratio가 응답 전 확정되지 않을 수 있다.
- **사용자 영향:** About section 진입 중 이미지가 나타나며 아래 콘텐츠가 이동할 수 있다. 느린 mobile network에서 더 잘 보일 수 있다.
- **개선:** intrinsic width/height 또는 wrapper `aspect-ratio`와 placeholder를 제공한다.
- **Trade-off:** 외부 SVG 비율이 바뀌면 지정 ratio를 갱신해야 하고 실패 시 빈 공간이 남을 수 있다.

### P2-5. Hero LCP 후보가 external font와 AOS reveal에 의존한다

- **관련 파일:** `index.html:86-111,207-251,1430-1433`, `script.js:13-18`
- **현재 구현:** 첫 viewport의 큰 콘텐츠는 Hero name/role/description이며 여러 요소에 AOS delay가 있다. font는 Google Fonts를 사용한다.
- **병목 원인:** render-blocking font stylesheet, font metric 전환, AOS CSS/JS 초기화와 reveal delay가 LCP 후보 paint에 결합된다.
- **사용자 영향:** cold mobile load에서 핵심 텍스트가 늦게 나타나는 것으로 체감될 수 있다.
- **개선:** Hero LCP 후보에서는 AOS/delay를 제거하고 font family/weight를 축소하며 self-host/preload는 실제 측정 후 적용한다.
- **Trade-off:** 첫 화면 연출이 단순해지고 잘못된 preload는 bandwidth 우선순위를 악화시킬 수 있다.

### P2-6. CSS가 누적 override 방식으로 성장했다

- **관련 파일:** `style.css:372-418,1228-1258,1770-1793,1960-1983,2301-2349`
- **현재 구현:** 같은 card selector와 breakpoint가 파일 여러 위치에서 반복되며 main/detail/mindmap/theme/effect가 한 파일에 있다.
- **병목 원인:** issue별 append, 다중 책임 selector, desktop 규칙을 받은 뒤 후반 media query에서 다시 덮는 구조다.
- **사용자 영향:** 모든 페이지가 미사용 CSS parse 비용을 부담하고 cascade 변경 시 성능·시각 회귀 위험이 높다.
- **개선:** common/home/detail/mindmap 책임을 나누고 card base와 breakpoint 최종 정의 위치를 하나로 통합한다.
- **Trade-off:** 분리 과정의 cascade order 회귀를 독립 브라우저 검사해야 한다.

### P2-7. CSS float animation과 JS float loop가 중복된다

- **관련 파일:** `style.css:1623-1692`, `script.js:125-129,189-208`
- **현재 구현:** CSS는 `floatA`~`floatE`를 정의하지만 JS가 즉시 `animation = "none"`으로 끈 뒤 rAF로 다시 구현한다.
- **병목 원인:** 같은 presentation logic의 이중 source와 정상 JS 환경에서 unused keyframe이다.
- **사용자 영향:** 직접 runtime 비용은 JS loop가 만들지만 CSS payload와 유지보수 비용도 증가한다.
- **개선:** CSS compositor animation 또는 JS interactive animation 중 하나를 주 구현으로 선택한다.
- **Trade-off:** CSS float와 drag transform을 함께 쓸 경우 wrapper 분리가 필요할 수 있다.

### P2-8. Scroll work가 두 listener와 별도 무한 rAF로 분산된다

- **관련 파일:** `script.js:181-208,257-280`
- **현재 구현:** sticker scroll listener와 progress/back-to-top listener가 별도이며 후자는 rAF throttle을 사용한다.
- **병목 원인:** scroll state 수집과 style write가 분산되고 progress width 및 root custom property를 갱신하면서 sticker rAF도 실행된다.
- **사용자 영향:** 긴 mobile scroll에서 fixed UI와 animation update가 겹쳐 frame 안정성이 낮아질 수 있다.
- **개선:** 단일 rAF scheduler로 통합하고 progress는 `scaleX`, sticker는 Hero visibility 조건을 사용한다.
- **Trade-off:** 문서 높이 cache를 쓰면 lazy image/filter 변경 시 invalidation이 필요하다.

### P2-9. Mobile fixed section navigator가 viewport와 paint 비용을 계속 점유한다

- **관련 파일:** `index.html:1366-1404`, `style.css:3502-3563`, `script.js:1055-1095`
- **현재 구현:** 9개 section 항목을 mobile에서 fixed horizontal bottom bar로 표시하고 intersection마다 모든 항목의 active class를 확인한다.
- **병목 원인:** fixed layer, overflow bar, 9개 class toggle, main mobile menu와 별도인 navigation 체계다.
- **사용자 영향:** 작은 viewport를 계속 점유하고 active 항목이 화면 밖일 수 있으며 scroll 중 추가 paint가 생긴다.
- **개선:** mobile 항목을 주요 section 4~5개로 줄이고 현재/다음 두 항목만 갱신한다.
- **Trade-off:** 하위 section 직접 접근성이 줄고 device별 정보 구조가 달라진다.

## P3

### P3-1. Third-party origin과 버전 정책이 분산되어 있다

- **관련 파일:** `index.html:86-109,1430-1433`
- **현재 구현:** Google Fonts, cdnjs, jsDelivr, unpkg를 critical path에서 사용하고 lazy image는 GitHub raw와 streak service를 사용한다.
- **병목 원인:** origin별 연결 비용과 장애 편차, `devicon@latest`의 비고정 버전이다.
- **사용자 영향:** cold mobile network에서 first paint와 후속 이미지 표시 편차가 커질 수 있다.
- **개선:** dependency를 축소하고 immutable version을 고정하며 작은 icon과 핵심 asset의 self-hosting을 검토한다.
- **Trade-off:** repository 용량과 업데이트 책임이 늘어난다.

### P3-2. 클릭 장식이 매 interaction마다 DOM을 생성한다

- **관련 파일:** `script.js:97-116`, `style.css:1550-1597`
- **현재 구현:** 클릭마다 fixed `.stamp-pop` node를 append하고 animation 후 제거한다.
- **병목 원인:** DOM insertion/removal, pseudo-element·gradient·shadow paint, target별 listener다.
- **사용자 영향:** 핵심 click 처리와 장식 animation이 저사양 device 자원을 공유한다.
- **개선:** 하나의 node를 재사용하거나 filter/navigation에서는 effect를 제외한다.
- **Trade-off:** 연속 클릭 animation이 덮어써지거나 사이트 개성이 줄 수 있다.

### P3-3. 로고 animation 재시작이 강제 layout read를 사용한다

- **관련 파일:** `script.js:364-371`
- **현재 구현:** class 제거 후 `void el.offsetWidth`로 layout을 flush하고 animation class를 다시 붙인다.
- **병목 원인:** synchronous layout 강제다.
- **사용자 영향:** 빈도가 낮아 영향은 작지만 큰 DOM에서 navigation click과 동시에 layout 비용이 생긴다.
- **개선:** Web Animations API의 cancel/play 또는 강제 read 없는 재시작 방식을 사용한다.
- **Trade-off:** animation 제어 코드가 늘어난다.

### P3-4. `will-change`와 실제 갱신 property가 불일치한다

- **관련 파일:** `style.css:2151-2159`, `script.js:264-274`
- **현재 구현:** progress bar에 `will-change: transform`이 있으나 JS는 width를 갱신한다.
- **병목 원인:** 불필요한 layer hint와 최적화 경로 불일치다.
- **사용자 영향:** 작은 문제지만 mobile GPU layer 관리 비용을 낭비할 수 있다.
- **개선:** progress를 `scaleX`로 바꾸고 will-change는 animation 중에만 둔다.
- **Trade-off:** transform-origin과 기존 시각 동등성을 조정해야 한다.

### P3-5. 선택적 기능과 compatibility code가 모두 초기 payload에 있다

- **관련 파일:** `script.js`, `style.css`
- **현재 구현:** chicken mode, shortcut toast, stamp, page shake, detail compatibility, main-only filter/section nav가 공용 파일에 포함된다.
- **병목 원인:** 요소가 없으면 return해도 download/parse는 이미 발생한다.
- **사용자 영향:** 상세와 mobile도 사용하지 않는 코드를 받는다.
- **개선:** core/effects와 common/home/detail entry를 분리하고 optional 기능을 idle 또는 최초 interaction 후 초기화한다.
- **Trade-off:** 파일 ordering과 cache 정책이 복잡해지고 선택적 효과가 늦게 시작될 수 있다.

# 권장 구현 순서

## Batch 1 — runtime hot path

1. sticker rAF visibility/reduced-motion 중단
2. filter listener 통합
3. mouse shadow capability query와 rAF throttle
4. progress bar transform 전환

## Batch 2 — CLS와 LCP

1. lazy image intrinsic size/aspect ratio
2. Hero AOS delay 제거
3. font family/weight 및 external critical path 축소
4. 실제 LCP/CLS 측정

## Batch 3 — rendering/payload

1. 하단 연도 그룹 `content-visibility` 실험
2. common/home/detail CSS·JS 분리
3. CSS/JS float 구현 중복 제거
4. optional effects 분리

## Batch 4 — 장기 구조

1. i18n 전체 DOM sweep와 `innerHTML` 재작성 축소
2. CSS selector와 breakpoint 통합
3. mobile navigation 단순화
4. icon 및 third-party dependency 정책 정리

# 독립 검증 체크리스트

아래 항목은 이 감사에서 실행하지 않았다.

- Lighthouse desktop/mobile
- Chrome Performance trace와 CPU throttling
- 실제 LCP element와 timestamp
- font load 및 GitHub SVG에 의한 CLS
- filter와 language toggle의 INP
- desktop pointer 이동 중 frame rate
- 769, 768, 1024px 경계와 orientation change
- reduced-motion에서 rAF 중단 여부
- third-party cold-cache network waterfall
- `content-visibility` 적용 전후 rendering 비교

이 문서는 정적 코드 감사 결과이며, 수치 기반 개선 우선순위 확정 전 위 브라우저 검증이 필요하다.
