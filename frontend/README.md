# frontend

HTML · CSS · Vanilla JS. 빌드 도구 없이 정적 파일 그대로 배포해요.

## 실행
```
cd frontend
python3 -m http.server 5173
```
브라우저에서 http://127.0.0.1:5173 을 열어요. (마이크는 localhost 또는 https 주소에서만 켜져요)

시연용 주소 옵션
- `?season=spring` / `?season=autumn` / `?season=none`: 시작 화면 계절 효과 강제
- `#/home`: 시작 화면 건너뛰고 홈으로

## 구조
- `index.html`: 화면(S00 시작, S01 홈, S02 찾기, S07 내 정보)을 한 페이지에 두고 `#/주소`로 바꿔 보여줘요
- `css/tokens.css`: 색·글자 값. Figma 03 · UI Kit 과 같게 유지해요
- `css/app.css`: 화면·부품 스타일
- `js/app.js`: 화면 이동, 홈 저장 미리보기, 글자 크게
- `js/landing.js`: 시작 화면 계절 그림과 떨어지는 잎
- `assets/`: 그림·사진 (지금은 Figma AI로 만든 임시 이미지)
