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
