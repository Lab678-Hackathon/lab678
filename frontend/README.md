# frontend

HTML · CSS · Vanilla JS. 빌드 도구 없이 정적 파일 그대로 배포해요.

## 실행
저장소 루트에서 터미널 두 개로 켜요.
```
python3 backend/preview.py        # 백엔드 (8765)
python3 frontend/dev_server.py    # 프론트 (5173), /preview/ 요청은 백엔드로 넘겨요
```
브라우저에서 http://127.0.0.1:5173 을 열어요. 같은 주소로 API 를 부르니 CORS 설정이 필요 없어요.
(마이크는 localhost 또는 https 주소에서만 켜져요)

출발지 검색(`/preview/places`)은 백엔드에 카카오 REST 키(`LAB678_KAKAO_REST_API_KEY`)가 있어야 동작해요. 키가 없으면 안내 문구가 나오고, 현재 위치를 쓰면 돼요.

배포: `index.html` 의 `<meta name="lab678-api" content="">` 에 Render https 주소를 넣고, Render 쪽 `LAB678_ALLOWED_ORIGINS` 에 Vercel 주소를 넣어요 (백엔드 CORS 허용목록 방식).

시연·검증용 주소 옵션
- `?mode=recorded`: 기록 데이터로 추천 (없으면 실시간 live). 이때 "QA 고정: 청량리역" 출발지 버튼이 보여요 (이슈 #16 좌표)
- `?debug=1`: S03 카드·S04 상세에 후보 ID 표시
- `?season=spring` / `?season=autumn` / `?season=none`: 시작 화면 계절 효과 강제
- `#/home` 홈, `#/search` 나들이 찾기, `#/results` 추천 결과
- 예: http://127.0.0.1:5173/?mode=recorded&debug=1#/search

## 구조
- `index.html`: 화면(S00 시작, S01 홈, S02 찾기, S07 내 정보)을 한 페이지에 두고 `#/주소`로 바꿔 보여줘요
- `css/tokens.css`: 색·글자 값. Figma 03 · UI Kit 과 같게 유지해요
- `css/app.css`: 화면·부품 스타일
- `js/app.js`: 화면 이동, 홈 저장 미리보기, 글자 크게
- `js/search.js`: S02 입력·검증(최소 60분) + S02a 확인 → 추천 요청
- `js/results.js`: S03 지도·카드, 다른 곳 찾기, S04 상세 (같은 후보 ID 사용)
- `js/api.js`: `/preview/recommend` 호출. 실패해도 Mock 으로 바꾸지 않아요
- `js/state.js`: 입력·결과 보존 (sessionStorage)
- `dev_server.py`: 개발용 정적 서버 + 백엔드 프록시
- `js/landing.js`: 시작 화면 계절 그림과 떨어지는 잎
- `assets/`: 그림·사진 (지금은 Figma AI로 만든 임시 이미지)
