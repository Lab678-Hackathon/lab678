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

배포
- 프론트: https://oneul-nadeuli.vercel.app (Vercel)
- 백엔드: https://oneul-nadeuli-api.onrender.com (Render, develop 브랜치, 무료라 15분 쉬면 잠들어요. 시연 전에 한 번 열어 두기)
- `index.html` 의 `<meta name="lab678-api">` 에 Render 주소가 들어 있어요. 내 PC(localhost)에서는 이 값을 무시하고 개발 서버 프록시를 써요.
- Render 쪽 `LAB678_ALLOWED_ORIGINS` 에 Vercel 주소를 넣어 두었어요 (백엔드 CORS 허용목록 방식).

시연·검증용 주소 옵션
- `?mode=recorded`: 기록 데이터로 추천 (없으면 실시간 live). 이때 "QA 고정: 청량리역" 출발지 버튼이 보여요 (이슈 #16 좌표)
- `?debug=1`: S03 카드·S04 상세에 후보 ID 표시
- `?season=spring` / `?season=autumn` / `?season=none`: 시작 화면 계절 효과 강제
- `#/home` 홈, `#/chat` 대화, `#/me` 내 나들이
- 예: http://127.0.0.1:5173/?mode=recorded&debug=1#/chat

## 화면 (PRD v0.7 · Figma 06 · Demo Final 기준)
- `#/` S00 까치 깨우기 → `#/home` S01 홈 → `#/chat` S02 대화 (빠진 조건만 질문, 확인 단계 없이 바로 추천, 대화 안 카드 최대 3개)
- `#/place/<id>` S04 상세 (지도 보기 · 내 나들이에 저장) → `#/map/<id>` S08 도보 경로 (`/preview/walk`, 성공했을 때만 시간 표시)
- 저장은 S06 시트(체험 시작 → 1회 자동 저장) → `#/me` S07 내 나들이 (체험 종료 시 모두 삭제)
- 대화 해석은 `/preview/chat`(AI)을 먼저 쓰고, 서버에 AI 설정이 없으면 `js/parse.js` 규칙 해석으로 이어가요.

## 구조
- `index.html`: 모든 화면을 한 페이지에 두고 `#/주소`로 바꿔 보여줘요
- `css/tokens.css`: 색·글자 값. Figma 03 · UI Kit 과 같게 유지해요
- `css/app.css`: 화면·부품 스타일
- `js/app.js`: 화면 이동, S00 까치 깨우기, S01 홈, S07 내 나들이
- `js/chat.js`: S02 대화 · S02a 확인 · S03 대화 안 카드
- `js/parse.js`: AI 없을 때 문장에서 관심사·날짜·시각·출발지 이름 뽑기
- `js/place.js`: S04 상세 · S08 지도·도보 경로 · S06 저장 시트
- `js/saved.js`: 체험 모드와 저장 (이 브라우저 localStorage)
- `js/api.js`: 백엔드 호출. 실패해도 Mock 으로 바꾸지 않아요
- `js/state.js`: 대화·결과 보존 (sessionStorage)
- `js/util.js`: 공통 도구
- `js/landing.js`: 떨어지는 잎
- `dev_server.py`: 개발용 정적 서버 + 백엔드 프록시
- `assets/`: 까치(투명 PNG)·분위기 사진
