# v2 Final Big Pass

2026-08-23 기준 v2.7.x Final Freeze에서 남은 UI·미디어·데모 항목을 작은 PR로 쪼개지 않고 하나의 검증 가능한 묶음으로 종료하기 위한 작업 계약입니다.

## 범위

### #192 HOME 이메일 카피바라

- 사용자가 확정한 카피바라 원본의 투명 WebP 파생본만 사용한다.
- `capybara@koreatech.ac.kr` 이메일 버튼 뒤에서 얼굴·귀·앞발이 올라오는 구성으로 제한한다.
- 프로젝트 보기/GitHub 버튼은 변경하지 않는다.
- 이메일 버튼의 복사 기능과 hit area를 유지한다.
- 장식 이미지는 `pointer-events: none`, `aria-hidden="true"`, 빈 `alt`를 사용한다.

### #217 공개 미디어 메타데이터

- 공개 저장소의 JPG/JPEG/PNG/WebP/GIF 및 영상 컨테이너를 전수 감사한다.
- EXIF/XMP/IPTC/GPS, 촬영 기기·소프트웨어·시간, comment/title/author 등 불필요한 메타데이터를 제거한다.
- 이미지의 색 재현에 필요한 ICC와 표시 방향에 필요한 Orientation은 개인정보성 메타데이터와 분리한다.
- 영상은 가능한 한 stream copy remux로 처리하여 재인코딩하지 않는다.
- 신규 미디어 회귀를 잡기 위해 `tools/verify-media-metadata.js`를 유지한다.

### #190 / #210 원클릭 데모

대상은 다음 5개 프로젝트다.

- Wall_Sina
- 2026_U-CAST
- HEALTH_CHECK_PROJECT
- BerryIno
- PlantClock

각 데모는 세부 slider/input/select/textarea 없이 하나의 실행 버튼으로 전체 시나리오가 끝까지 재생되어야 한다.

## 브라우저 gate

HOME은 다음 viewport 각각을 light/dark에서 확인한다.

- 320
- 360
- 390
- 768
- 1280
- 1440

확인 항목:

- 수평 overflow 없음
- 카피바라 asset decode 성공
- 이메일 버튼 위쪽으로 캐릭터가 노출되고 버튼과 자연스럽게 겹침
- 모바일 이메일 버튼 폭 유지
- broken image 없음
- console/page error 없음

원클릭 데모 5개는 390px dark/reduced-motion 환경에서 다음을 확인한다.

- `.demo-btn` 정확히 1개
- 세부 form control 0개
- 버튼 1회 클릭 후 완료 상태 도달
- console/page error 없음

## Git 원자성

이 PR 역시 저장소 표준대로 `변경 파일 수 == 커밋 수`를 유지한다. 자동 처리로 수정되는 각 미디어 파일도 파일 하나당 커밋 하나로 기록한다.
