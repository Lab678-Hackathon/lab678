# 팀 화면 채팅 연결 · 로컬 검증과 인계

2026-10-31. 대상 프론트 `feature/front` **164cd40f1a306e4ce5dbcbb69515ebfedd8d8ef6**.

**독립 연결 모듈을 최신 팀 화면 복사본에 연결하여 검증했다. 희영님 브랜치/원본 frontend 파일에는 아직 반영하지 않았다.** 공통 계약 변경 전 담당 확인 원칙에 따라 이 문서와 모듈을 인계한다. develop은 확인 시점06c0443이며 프론트 브랜치가 아직 합쳐지지 않았다.

## 로컬 실행

1. `python backend/preview.py`로 백엔드8765 실행. Naito 키는 무시된 `.local/naito.env`, 모델은 사용자 지정 `claude-sonnet-4`.
2. `python utils/scripts/team_chat_preview.py --ref origin/feature/front --port 5174`
3. [팀 화면 채팅 점검](http://127.0.0.1:5174/?mode=recorded&debug=1#/search) 접속.

이 URL의 AI는 **실제 Naito**, 추천은 **recorded**다. 현재 실행 중인 5173은 이전 QA 화면이므로 새 채팅 연결은5174에서 확인한다. 인터넷 공개 URL이 아니다. Render 배포는 보류 중이다.

실행기는 Git의 프론트만 `.local/team-chat-<해시>/frontend`에 복사하고, HTML 응답에 모듈 script만 추가한다. 원본 파일을 수정하지 않으며 같은 주소의 `/preview/*`는 팀 개발 서버의 기존 방식으로 백엔드에 전달한다. 사용 중인 브라우저 세션을 자동 테스트에 재사용하지 않는다.

## 구현 범위

- `backend/team_chat.js`: 팀 `state.js`/`search.js`를 사용하는 독립 연결 모듈. 기존 디자인 클래스와 단순한 채팅 영역을 사용한다. 최종 Figma 디자인 반영이 아니다.
- 텍스트 전송, 브라우저 STT 종료 후 전사 자동 전송, 인식 문장 수정/다시 말하기, 대화 기록, 답변 읽기/중지·선택적 자동 읽기.
- 날짜만 화면에서 선택한 경우 `condition_draft.date`를 해석 맥락으로 전달한다. 이 date는 AI 변경 제안 필드가 아니고 현재 화면의 선택 날짜다.
- 기존에 입력한 항목은 확인된 값으로 보수적으로 보호한다. 변경 전/후를 모두 표시하고 전체 반영/기존 유지로 명시적 동의를 받는다. 충돌/처리 중 추천을 잠근다.
- 현재 입력을 직접 바꾸면 요청을 취소하고 revision을 올린다. 응답 직전에도 현재 입력을 비교하여 GPS 등 비동기 변경 뒤 오래된 값이 덮어쓰지 않게 한다.
- 출발지 변경에 동의하면 이전 좌표를 지우고 장소 검색을 요청한다. 결과 첫 항목을 자동 선택하지 않는다.
- AI 오류 후 입력·대화는 유지한다. 새로고침은 sessionStorage로 보존한다. 마지막 요청의 상태/오류를 정상 완료로 바꾸지 않는다.
- AI가 초안을 채워도 최종 추천은 기존 S02a 확인 후 진행한다. 기존 min60 검증과 S03/S04 후보 ID 연결을 재사용한다.

## 담당 확인 후 팀 프론트 반영 방법

현재 `164cd40` 구조 기준이며 최신 작업이 달라지면 재검토한다.

1. `backend/team_chat.js`를 `frontend/js/dj-chat.js`로 복사하거나 희영님이 관리하는 모듈에 통합한다.
2. 팀 `index.html`의 app.js 로딩 이후 실행되도록 아래 모듈을 추가한다.

```html
<script type="module" src="/js/dj-chat.js"></script>
```

3. `state.form`, `state.confirmed`, `save()`, `renderSearch()` 계약과 S02 DOM(`#confirm`, `#btn-search`, `#f-place`, 날짜/시각, 검색 결과)을 확인한다. 이 이름을 바꾸면 연결 모듈도 맞춰야 한다.
4. [채팅 API 계약](chat-conditions.md)의 revision·오류·변경 동의를 확인한다. 별도 배포는 기존 `meta[name=lab678-api]` 설정과 백엔드 CORS 또는 동일 origin 프록시를 사용한다.
5. UI 담당과 배치/문구/자동 읽기 정책을 확인하고 테스트한다. 이 모듈이 팀 폴더에 이미 반영됐다고 안내하지 않는다.

## 검증 결과

`utils/scripts/check_chat_ui.cjs`: **5개 구간 PASS**. 화면 크기412×915의 독립 headless Chrome, 실제 Naito3회, 기록 추천, 모의 장애/STT 구분.

| 구간 | 사용한 데이터/엔진 | 결과 |
|---|---|---|
| 날짜 선택+시각 말하기 → 국악 변경 거절 → 출발시각 변경 동의 → S02a → S03/S04 | 실제 Naito3회 + 실제 백엔드의 recorded 문화정보 | PASS, 상세ID seoul:159578 |
| AI 처리 중 직접 시간 수정 | 모의 지연 응답 | PASS, 최신18시 보존 |
| AI 실패 후 입력·대화, 새로고침 | 모의502 | PASS |
| 출발지 변경 후 이전 좌표 제거·명시적 선택 요구 | 모의AI + 장소0건 | PASS |
| 음성 인식 종료 → AI 자동 전송 1회 | 모의SpeechRecognition + 모의AI | PASS, 실제 마이크 미검증 |

결과: [JSON](qa-chat/result.json), [변경 동의 화면](qa-chat/chat-conflict.png), [추천 상세](qa-chat/chat-to-detail.png). 캡처를 시각 확인했으며 기존 팀 색상/입력과 함께 표시된다. 자동 캡처는 긴 페이지의 고정 상하단 바 위치가 겹쳐 보일 수 있다.

재검사:

```powershell
node utils/scripts/check_chat_ui.cjs
```

Playwright 모듈이 기본 경로에 없으면 `PLAYWRIGHT_MODULE`에 설치 경로를 지정한다. 이 PC에서는 `C:\Users\4cat1\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules\playwright`를 사용했다. Chrome 설치가 필요하다. 실행마다 Naito 실제3회 사용량이 발생하므로 불필요하게 반복하지 않는다.

백엔드60개 회귀·JavaScript 문법 검사 PASS. 기존 장소 테스트의 HTTPError 자원정리 경고는 남아 있다.

## 남은 범위

- 실제 마이크/스피커·권한·모바일 기기: 미검증. 자동 STT 이벤트 검사는 실제 음성 인식 성공이 아니다.
- 자유 대화 전체 품질, 모호한 시간, 복수 관심사·예산·걷기 선호: 미완료. 지원하지 않는 요구를 충족했다고 표시하지 않는다.
- 현재 팀 UI의 코스 버튼은 준비 중이므로 AI의 course 요청을 이 화면에서 자동 실행하지 않고 입력을 유지하며 안내한다. 먼저 place 연결을 검증했다.
- 팀 브랜치 반영·디자인 통합·공개 배포·기획 최종QA: 담당 확인 후 진행. 이번 작업은 로컬 커밋이며 Push는 별도 요청이다.
