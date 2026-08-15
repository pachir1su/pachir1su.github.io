# assets

포트폴리오에서 사용하는 정적 에셋 폴더입니다.

## koreatech-logo.png  (직접 커밋 필요)

한국기술교육대학교(KOREATECH) **전체 로고**(심볼 + 글자) 이미지입니다.

- **사용 위치**
  - `index.html` 비전(About) 섹션의 **학력 배지** (`.about-edu`)
  - `og-image.html` OG 공유 이미지 카드 우측
- **권장 사양**
  - 형식: PNG(투명 배경 권장) 또는 SVG
  - 가로형 전체 로고(심볼 + `한국기술교육대학교 / KOREATECH`)
  - 권장 높이 200px 이상 (선명도 확보)
- 파일이 없어도 두 화면 모두 **자동으로 텍스트 폴백**으로 표시되어 깨지지 않습니다.

> SVG로 넣고 싶다면 `koreatech-logo.svg` 로 커밋한 뒤
> `index.html` · `og-image.html` 의 이미지 경로만 바꾸면 됩니다.

## 2026-u-cast-prototype.webp  (이슈 #109)

2026 U-CAST 「멈춰 !」 시연 모형 사진입니다. 천안중앙시장 거리를 재현한 모형에
구간별 네오픽셀 스트립이 빨간색으로 점멸하는 상태가 담겨 있습니다.

- **사용 위치**: `projects/2026_U-CAST/index.html` 의 "시제품 사진" 갤러리
- **원본 크기**: 1080 × 1440 (세로형)

## 2026-u-cast-circuit.png  (이슈 #109)

2026 U-CAST 「멈춰 !」 브레드보드 배선도입니다. Arduino Uno에 네오픽셀 스트립,
운전자 경고 LED, 수동 부저, 센서 입력, 시연용 버튼을 연결한 구성입니다.

- **사용 위치**: `projects/2026_U-CAST/index.html` 의 "시제품 사진" 갤러리
- **원본 크기**: 1919 × 822 (가로형)

> 두 이미지는 `.detail-gallery` / `.detail-figure` 스타일(`style.css`)로 표시되며
> `loading="lazy"` 와 `width`·`height` 속성으로 레이아웃 이동을 막습니다.
