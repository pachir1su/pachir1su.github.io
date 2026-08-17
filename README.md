# pachir1su.github.io


## 버전 기록
~ v1.1.10 : 한국기술교육대학교 26학번 온라인중점강좌 "오픈소스 및 생성형 AI활용" 과제 - github page에 내 홈페이지 만들기
<br>v2.0.0 ~ : 디자인 변경
<br>v2.1.0 : 노트 컨셉 유지 + 정보 전달력 · UIUX · 성능 개선 (#106, #113, #114)
<br>v3.0.0 ~ (예정) : 디자인 컨셉 변경 — [docs/design-concept-v3.md](docs/design-concept-v3.md)

👉 **[실행](https://pachir1su.github.io)**

## 프로젝트 목록 관리 (build.js)

메인 페이지의 프로젝트 목록(연도별 · 진행 중 · 실패 카드)은 `projects.json` 하나에서
관리하고, `build.js`가 `index.html`의 `BUILD:PROJECTS` 마커 사이에 정적 HTML을 생성합니다.
정적 HTML로 남기므로 SEO에는 영향이 없습니다.

**프로젝트 추가/수정 절차**
1. `projects.json`의 해당 그룹(`year`/`wip`/`failed`) `cards` 배열을 편집
2. `node build.js` 실행 → `index.html` 자동 갱신
3. (선택) `node tools/verify-build.js` 로 렌더링 동등성 검증

**카드 필드 요약**
| 필드 | 설명 |
|---|---|
| `comment` | 카드 위 주석(메모용, 선택) |
| `category` | 필터 카테고리 (공백 구분: `ai`, `hardware`, `discord`, `web`, `contest`) |
| `icon` | Font Awesome 클래스 (예: `fab fa-github`) |
| `detail` | 상세 페이지 경로 (예: `projects/MyProject/`, 없으면 생략) |
| `links` | 외부 링크 배열 `{ href, title, icon }` |
| `title` / `subtitle` | 문자열 또는 `{ en, ko }` |
| `desc` / `descHtml` | 본문. `descHtml`은 `<br />` 등 HTML 허용 |
| `role` | 역할 한 줄. 상세 페이지 「나의 역할」 표기와 같은 값 (예: `팀장 · 4인 팀`) |
| `badge` | (wip/failed) `{ en, ko }` |
| `status` | (wip) 진행 단계 라벨 `{ en, ko }` (예: `기획 단계`). v2.1.0에서 `progress` 숫자를 대체 |
| `failedReason` | (failed) `{ en, ko }` HTML 허용 |
| `tech` | 기술 스택 배열. 항목은 문자열 또는 `{ en, ko }` |
