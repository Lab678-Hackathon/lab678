# 저장소 파일·기능 색인

자동 생성. 생성 문서·비밀값·의존성 제외 규칙은 utils/harness.json과 utils/README.md를 따른다.
Python 함수·클래스는 AST, JS/TS는 이름 있는 선언·화살표 함수 후보만 정규식으로 찾는다. 익명·메서드 등은 완전성 미보장.
개요가 부족한 파일은 의미를 추측하지 않는다. 기능 분류는 harness.json의 명시적 매핑이다.

| 파일 | 개요 | 상태 / 해시 |
|---|---|---|
| [.DS_Store](../../.DS_Store) | 설정·자료 파일; 필요할 때 원문 확인 | `809dc7d2ef2e` |
| [.env.example](../../.env.example) | 설정·자료 파일; 필요할 때 원문 확인 | `a1a4d8e749e0` |
| [.github/ISSUE_TEMPLATE/bug.md](../../.github/ISSUE_TEMPLATE/bug.md) | --- | `0da051347842` |
| [.github/ISSUE_TEMPLATE/task.md](../../.github/ISSUE_TEMPLATE/task.md) | --- | `83377ff93256` |
| [.github/pull_request_template.md](../../.github/pull_request_template.md) | ## 무엇을 했나요 | `4307cddf0603` |
| [.gitignore](../../.gitignore) | 설정·자료 파일; 필요할 때 원문 확인 | `02583a6ff23f` |
| [AGENTS.md](../../AGENTS.md) | Lab678 · AI 작업 안내 | `0bd18fc80afd` |
| [CLAUDE.md](../../CLAUDE.md) | @AGENTS.md | `9eb443b06e52` |
| [GEMINI.md](../../GEMINI.md) | @AGENTS.md | `9eb443b06e52` |
| [README.md](../../README.md) | Lab678 · Codyssey AI 해커톤 2026 | `4f97df200919` |
| [TEAM_WORKFLOW.md](../../TEAM_WORKFLOW.md) | 678 Lab · TEAM_WORKFLOW | `1bdea05730d6` |
| [backend/AGENTS.md](../../backend/AGENTS.md) | backend 작업 | `4c309563b7f1` |
| [backend/README.md](../../backend/README.md) | backend | `e21c017b4508` |
| [backend/course.py](../../backend/course.py) | 서울시 후보 최대 다섯 곳의 방문 순서를 비교해 두 곳 도보 일정 하나를 제시한다. | `395e41ad4b2b` |
| [backend/local_voice.py](../../backend/local_voice.py) | Windows 개인 시연용. 카드 텍스트를 설치된 한국어 음성으로 WAV 합성한다. | `ce3254e854ee` |
| [backend/location_view.js](../../backend/location_view.js) | 지도 위 내 위치 표시·갱신·중지를 제공한다. 사용자 클릭 후에만 위치 권한을 요청한다. | `545dfc010fc2` |
| [backend/map_config.py](../../backend/map_config.py) | 지도 표시용 공개 JavaScript 키만 읽는다. 서버 REST 키와 설정 파일은 공개하지 않는다. | `2fdb9049ff08` |
| [backend/map_view.js](../../backend/map_view.js) | 카카오 지도 우선 표시와 기존 지도 대체를 제공하는 개인 점검용 어댑터. | `a20657b13cb6` |
| [backend/outing.py](../../backend/outing.py) | 서울시 행사 다섯 건에서 날짜·시간·분류를 확인하고 직선거리 순으로 반환한다. | `c460dfac30cc` |
| [backend/places.py](../../backend/places.py) | 출발지 선택용 카카오 장소명/주소 검색. 사용자 검색어·키·원문 응답은 저장하지 않는다. | `a7ee2f080b69` |
| [backend/preview.html](../../backend/preview.html) | 설정·자료 파일; 필요할 때 원문 확인 | `9113b15dfebb` |
| [backend/preview.py](../../backend/preview.py) | 동조 개인용 로컬 추천 점검 화면. python backend/preview.py로 시작한다. | `a856c24ee18f` |
| [backend/test_course.py](../../backend/test_course.py) | 두 곳 도보 일정의 마감 경계·휴관 원문·결측·방문 순서를 검사한다. | `221c8f346ef9` |
| [backend/test_map_config.py](../../backend/test_map_config.py) | 지도 공개 설정이 JS 키만 노출하고 서버 키·잘못된 입력을 배제하는지 검증한다. | `d8a32938f98b` |
| [backend/test_outing.py](../../backend/test_outing.py) | 서울시 공개 응답 재생으로 입력·선별·결측·실패를 검사한다. | `4bbd8e3057dc` |
| [backend/test_places.py](../../backend/test_places.py) | 장소/주소 검색의 입력·좌표·실제0건·공급자 장애·비밀값 노출 방지 회귀. | `944752f387e3` |
| [backend/test_preview.py](../../backend/test_preview.py) | HTTP 처리기의 입력 오류 계약과 route/course 호환을 외부 조회 없이 검증한다. | `c0259bb3c2a0` |
| [backend/test_transit.py](../../backend/test_transit.py) | 실제 노선 성공과 구분한 대중교통 어댑터 단위 검증. 가상 수치로 응답/오류 경계를 검사한다. | `4e7d297de043` |
| [backend/test_walking.py](../../backend/test_walking.py) | 한국어 경로 단계와 지도 좌표가 같은 응답을 사용하는지 검증한다. | `24220eb5c118` |
| [backend/transit.py](../../backend/transit.py) | 개인 점검용 카카오 대중교통 텍스트 안내. 키는 서버에서만 읽고 원문 응답은 저장하지 않는다. | `1f53e7c66012` |
| [backend/walking.py](../../backend/walking.py) | 개인 점검 화면에서 선택한 행사장 두 곳의 Valhalla 보행 경로를 조회한다. | `0b96634fdb51` |
| [design/AGENTS.md](../../design/AGENTS.md) | design 작업 | `847f9b6e5ece` |
| [design/README.md](../../design/README.md) | design | `2eec3f8bb071` |
| [docs/AGENTS.md](../../docs/AGENTS.md) | 문서 작업 | `b86a53a0779f` |
| [docs/README.md](../../docs/README.md) | docs | `7428e6e88e65` |
| [docs/development/README.md](../../docs/development/README.md) | LAB678 · 김동조 개발 작업 맥락 | `dee69984ac6c` |
| [docs/development/course-alternatives-progress.md](../../docs/development/course-alternatives-progress.md) | 시간 부족 → 동의 → 대안 선택 진행표 | `65a6e0edc8ad` |
| [docs/development/current-state.md](../../docs/development/current-state.md) | 현재 상태와 다음 할 일 | `4c2e24224544` |
| [docs/development/demo-login-server-progress.md](../../docs/development/demo-login-server-progress.md) | 데모 로그인·해커톤 서버 검토 진행표 | `15f55ee764b3` |
| [docs/development/demo-profile-design.md](../../docs/development/demo-profile-design.md) | 인증 없는 이용·체험 프로필·로컬 저장 설계안 | `fab2f7ba08c6` |
| [docs/development/discussion-log.md](../../docs/development/discussion-log.md) | LAB678 · 김동조 대화·작업 기록 | `67c033e9f11c` |
| [docs/development/engineering-loop.md](../../docs/development/engineering-loop.md) | 개발 도구·반복 검증·컨텍스트 운영 | `f2d520471866` |
| [docs/development/examples/course-selected-place.live.json](../../docs/development/examples/course-selected-place.live.json) | 구조화 설정·상태 데이터 | `447d8ceff61e` |
| [docs/development/examples/demo-users.sample.json](../../docs/development/examples/demo-users.sample.json) | 구조화 설정·상태 데이터 | `d87032355d12` |
| [docs/development/examples/outing-request.json](../../docs/development/examples/outing-request.json) | 구조화 설정·상태 데이터 | `80868272defa` |
| [docs/development/examples/outing-response.json](../../docs/development/examples/outing-response.json) | 구조화 설정·상태 데이터 | `2298a272752a` |
| [docs/development/examples/place-search.address.live.json](../../docs/development/examples/place-search.address.live.json) | 구조화 설정·상태 데이터 | `6d3077cafd3b` |
| [docs/development/examples/place-search.keyword.live.json](../../docs/development/examples/place-search.keyword.live.json) | 구조화 설정·상태 데이터 | `a5df5ce8d2fa` |
| [docs/development/examples/recommend-response.recorded.json](../../docs/development/examples/recommend-response.recorded.json) | 구조화 설정·상태 데이터 | `b35ce2eaa5e0` |
| [docs/development/examples/recommend-selected-place.live.json](../../docs/development/examples/recommend-selected-place.live.json) | 구조화 설정·상태 데이터 | `9b55500b1a7a` |
| [docs/development/examples/seoul-events.capture.json](../../docs/development/examples/seoul-events.capture.json) | 구조화 설정·상태 데이터 | `691b61b192fe` |
| [docs/development/hackathon-server-usage-review.md](../../docs/development/hackathon-server-usage-review.md) | 해커톤 GPU/일반 서버 활용 검토 | `492d50fbcd64` |
| [docs/development/kakao-map-location.md](../../docs/development/kakao-map-location.md) | 카카오 지도 전환·내 위치 표시 구현 기록 | `3209d6cec5a7` |
| [docs/development/keyless-routing-review.md](../../docs/development/keyless-routing-review.md) | 키 없는 이동 안내 방식 대조 · 2026-10-31 | `a964ffe24a4f` |
| [docs/development/konnect-reuse-reading-guide.md](../../docs/development/konnect-reuse-reading-guide.md) | KONNECT 재사용 전 읽기·경량화 가이드 | `9aa942997e34` |
| [docs/development/loops/tooling-index.json](../../docs/development/loops/tooling-index.json) | 구조화 설정·상태 데이터 | `11f0a65fbe77` |
| [docs/development/mobility-routing-review.md](../../docs/development/mobility-routing-review.md) | LAB678 · 도보·대중교통 이동 안내 기술검토 | `eb038542af78` |
| [docs/development/mvp-plan.md](../../docs/development/mvp-plan.md) | 김동조의 문화외출 MVP 개발 계획 | `94ef8e460f1e` |
| [docs/development/outing-handoff.md](../../docs/development/outing-handoff.md) | 동조 개발용 추천 인계 초안 | `c13aa99e5f82` |
| [docs/development/place-search-api.md](../../docs/development/place-search-api.md) | 출발지 검색과 첫 프론트 연결 안내 | `4510f9c7c9d2` |
| [docs/development/planning-doc-refresh-progress.md](../../docs/development/planning-doc-refresh-progress.md) | 기획 정본 v0.7.0·화면명세 v0.3.0 갱신 체크표 | `ca67224596ff` |
| [docs/development/recommend-api.md](../../docs/development/recommend-api.md) | 추천 API 연결 안내 | `6c5aff0817bd` |
| [docs/development/render-demo-guide.md](../../docs/development/render-demo-guide.md) | Render 단일 서비스 시연 준비 | `85efffadf892` |
| [docs/development/repo_index.md](../../docs/development/repo_index.md) | 자동 생성 색인 | `generated` |
| [docs/development/repo_reverse_index.md](../../docs/development/repo_reverse_index.md) | 자동 생성 색인 | `generated` |
| [docs/development/repo_tree.md](../../docs/development/repo_tree.md) | 자동 생성 색인 | `generated` |
| [docs/development/reports/2026-10-31-audible-card.md](../../docs/development/reports/2026-10-31-audible-card.md) | 읽기 기능은 구현돼 있었지만, 기존에는 브라우저의 읽기 종료 신호만 확인해서 실제로 소리가 났는지 알 수 없었습니다. **소리가 안 들릴 때 쓸 수 있는 ‘음성 파일로 듣기’를 추가했습니다.** | `c73dcb55ab28` |
| [docs/development/reports/2026-10-31-chrome-gugak.md](../../docs/development/reports/2026-10-31-chrome-gugak.md) | **일반 Chrome에서 “국악을 듣고 싶어”라고 말하면 국악 행사 2건이 지도와 카드에 표시되는 흐름을 실기기 확인 완료로 기록했습니다.** 화면의 1번은 서울돈화문국악당의 ‘코공’, 2번은 국립박물관문화재단의 ‘소리: 성덕대왕신종’입니다. | `3d49ea543932` |
| [docs/development/reports/2026-10-31-chrome-speech.md](../../docs/development/reports/2026-10-31-chrome-speech.md) | **동조님 PC의 일반 Chrome에서 한국어 음성 입력을 확인했습니다.** 버튼을 누른 뒤 1.52초에 발화를 감지했고, 3.51초에 13자를 전사한 뒤 정상 종료했습니다. 시연은 일반 Chrome으로 진행하면 됩니다. | `a1d9454464aa` |
| [docs/development/reports/2026-10-31-course-alternatives.md](../../docs/development/reports/2026-10-31-course-alternatives.md) | 시간 부족 안내 뒤에 **동의 → 대안 1·2 → 선택 적용**을 추가했습니다. | `4523efd230a2` |
| [docs/development/reports/2026-10-31-course-demo-check.md](../../docs/development/reports/2026-10-31-course-demo-check.md) | 보내주신 화면에서 **시간 부족 안내**는 확인됐습니다. 당시 적용된 출발·종료 시각은 화면에 없어 정확한 원인까지 확인하기 어려웠습니다. 이제 결과 상단에 적용한 조건을 표시합니다. | `22342f36c1d1` |
| [docs/development/reports/2026-10-31-course-edit.md](../../docs/development/reports/2026-10-31-course-edit.md) | 코스에서 장소 제외와 다시 만들기를 분리했습니다. | `9798d20d1266` |
| [docs/development/reports/2026-10-31-current-prd-sync.md](../../docs/development/reports/2026-10-31-current-prd-sync.md) | 구버전 PRD를 개인용으로 따로 보관하지 않도록 정리했습니다. | `a94c27e90a49` |
| [docs/development/reports/2026-10-31-demo-server-reuse.md](../../docs/development/reports/2026-10-31-demo-server-reuse.md) | 인증·DB 간소화안, 두 브랜치 재사용 순서, 해커톤 서버 활용안을 기록하고 커밋했습니다. | `dde8106210dc` |
| [docs/development/reports/2026-10-31-develop-sync.md](../../docs/development/reports/2026-10-31-develop-sync.md) | 최신 develop을 받아 dj/develop에 동기화했습니다. | `bc28332f9977` |
| [docs/development/reports/2026-10-31-direct-push.md](../../docs/development/reports/2026-10-31-direct-push.md) | develop 직접 반영 사전 검증과 공유 상태를 기록했습니다. | `6bffaaaf4957` |
| [docs/development/reports/2026-10-31-directions.md](../../docs/development/reports/2026-10-31-directions.md) | **추천 → 선택 → 경로안내** 구간을 연결했습니다. | `161f35cefc63` |
| [docs/development/reports/2026-10-31-discord-status-checklist.md](../../docs/development/reports/2026-10-31-discord-status-checklist.md) | 디스코드에 붙여 넣을 공유 초안입니다. | `d1d5dbfa38e7` |
| [docs/development/reports/2026-10-31-events.md](../../docs/development/reports/2026-10-31-events.md) | 서울시 문화행사 API에서 10월 31일 전시 5건과 전체 분류 5건을 조회해 기록했습니다. 상세 요금이 0원인 전시와 빈 전시를 모두 확인했고, 행사 ID·좌표·조회시각을 보존했습니다. 청량리역 출발 좌표도 원자료와 대조했습니다. 다음은 이 기록과  | `d952abb36690` |
| [docs/development/reports/2026-10-31-frontend-ready.md](../../docs/development/reports/2026-10-31-frontend-ready.md) | 팀 화면이 완성되기 전에 연결할 준비를 마쳤습니다. | `9fd03ebdab02` |
| [docs/development/reports/2026-10-31-guide-push-ready.md](../../docs/development/reports/2026-10-31-guide-push-ready.md) | 참조 방법을 [개발 참조·실행 안내](D:/git/lab678/docs/development/team-backend-guide.md)에 저장하고, **저장소 README·백엔드 README·개발 README에서 찾을 수 있게 연결했습니다.** | `66555767d923` |
| [docs/development/reports/2026-10-31-input-contract.md](../../docs/development/reports/2026-10-31-input-contract.md) | 진행표의 다음 단계인 입력 검증과 API 전달 준비를 마쳤습니다. | `a544f08bb884` |
| [docs/development/reports/2026-10-31-kakao-live-check.md](../../docs/development/reports/2026-10-31-kakao-live-check.md) | 카카오 도메인 등록 후 실제 지도 연결을 확인했습니다. | `8b8acbbaf387` |
| [docs/development/reports/2026-10-31-kakao-map.md](../../docs/development/reports/2026-10-31-kakao-map.md) | 카카오 지도로 전환할 수 있도록 지도 표시 코드를 연결했습니다. | `ed34ceff09b4` |
| [docs/development/reports/2026-10-31-keyless-routing-review.md](../../docs/development/reports/2026-10-31-keyless-routing-review.md) | **도보는 우리도 이미 API 키 없이 가져옵니다. 다만 현재 도보 서버로 서울 대중교통까지 조회할 수는 없었습니다.** 제시하신 다른 앱의 방식은 참고할 부분이 있지만, 설명만으로 “정확한 대중교통·무장애 길찾기”가 구현됐다고 판단하기는 어렵습니다. | `ba4f61d68e64` |
| [docs/development/reports/2026-10-31-konnect-preview.md](../../docs/development/reports/2026-10-31-konnect-preview.md) | 동조님 점검 화면에 **KONNECT의 홈 → 조건 입력 → 지도·가로 카드** 구성을 반영했습니다. 열어 둔 탭을 새로고침하고 **‘나들이 찾기’**를 누르면 됩니다. [점검 화면 열기](http://127.0.0.1:8765/) | `edf3d0b908d8` |
| [docs/development/reports/2026-10-31-live-location.md](../../docs/development/reports/2026-10-31-live-location.md) | 지도에 내 위치 표시와 이동 중 갱신·중지를 추가했습니다. | `05233ccd74d6` |
| [docs/development/reports/2026-10-31-local-plan-folder.md](../../docs/development/reports/2026-10-31-local-plan-folder.md) | 개인용 [plan_dj](D:/git/lab678/plan_dj) 폴더를 만들고 **Git 업로드와 자동 색인에서 제외**했습니다. 제외 설정을 검증하고 커밋했습니다. | `af486ed484ce` |
| [docs/development/reports/2026-10-31-mobility-review.md](../../docs/development/reports/2026-10-31-mobility-review.md) | 도보·대중교통 기술검토서와 동조님 개발 할 일을 추가했습니다. | `eb0bf2ca4f26` |
| [docs/development/reports/2026-10-31-mvp-plan.md](../../docs/development/reports/2026-10-31-mvp-plan.md) | 동조님 MVP 실행계획을 보완해 `dj/develop`에 커밋했습니다. [MVP 실행계획과 단계별 체크표](D:/git/lab678/docs/development/mvp-plan.md) | `b80901c14064` |
| [docs/development/reports/2026-10-31-personal-attachment-copy.md](../../docs/development/reports/2026-10-31-personal-attachment-copy.md) | 답변 반영했습니다. **첨부 원본의 개인 사본은 `plan_dj`에 보관**합니다. | `1564ee2573d1` |
| [docs/development/reports/2026-10-31-personal-notes-scope.md](../../docs/development/reports/2026-10-31-personal-notes-scope.md) | `plan_dj`를 **동조님이 저에게 특별히 요청한 개인 사항만 보관하는 폴더**로 정리했습니다. | `fabbb9e1d83d` |
| [docs/development/reports/2026-10-31-preview-map.md](../../docs/development/reports/2026-10-31-preview-map.md) | **청량리역에서 나들이를 찾아 지도와 카드로 선택하는 첫 흐름이 동작합니다.** 개인 점검 서버를 실행해 두었습니다. [내 PC에서 나들이 찾기 열기](http://127.0.0.1:8765/) | `be882160cc56` |
| [docs/development/reports/2026-10-31-preview-speech.md](../../docs/development/reports/2026-10-31-preview-speech.md) | 민규님 대화 덕분에 **v0.5 문서가 아직 보이지 않는 경위**를 파악했습니다. 10월 31일 오전 원격 저장소를 확인했을 때 브랜치는 기존 6개였고, PR은 협업 규칙 관련 #1·#2뿐이었습니다. PRD 문서 5종과 UI·API 최종 합의는 확인  | `c2a6f85d400b` |
| [docs/development/reports/2026-10-31-preview.md](../../docs/development/reports/2026-10-31-preview.md) | 실데이터 확보에 이어 개인 점검 화면에서 **출발 조건 → 실시간 추천 → 선택 → 조건 변경·재조회**를 연결했습니다. [내 PC에서 나들이 찾기 열기](http://127.0.0.1:8765/) | `463d1b48dba4` |
| [docs/development/reports/2026-10-31-render-preparation.md](../../docs/development/reports/2026-10-31-render-preparation.md) | Render에 화면과 서버를 함께 올릴 준비를 마쳤습니다. | `8ac2409d4621` |
| [docs/development/reports/2026-10-31-result-preservation.md](../../docs/development/reports/2026-10-31-result-preservation.md) | 연결 준비에 이어 추천 결과가 사라지지 않도록 보완했습니다. | `c5153966e537` |
| [docs/development/reports/2026-10-31-route-text.md](../../docs/development/reports/2026-10-31-route-text.md) | **경로안내를 앱 안에서 텍스트로 먼저 보도록 바꿨습니다.** | `9beb5053336c` |
| [docs/development/reports/2026-10-31-screen-spec-review.md](../../docs/development/reports/2026-10-31-screen-spec-review.md) | 정민규님 화면명세를 읽고 **원본과 구현 대조 체크표를 `dj/develop`에 저장·커밋했습니다.** | `f61b27540347` |
| [docs/development/reports/2026-10-31-section-checks.md](../../docs/development/reports/2026-10-31-section-checks.md) | 기능마다 확인을 요청해 같은 점검을 여러 번 하게 했습니다. 앞으로는 구간을 완성하고 제가 먼저 테스트한 뒤, 동조님께 필요한 확인만 최대 3개로 모아 요청하겠습니다. | `b29e627f0715` |
| [docs/development/reports/2026-10-31-speaker-check.md](../../docs/development/reports/2026-10-31-speaker-check.md) | **음성 입력 → 국악 추천 → 카드 읽기**까지 동조님 PC에서 확인됐습니다. 스피커 청취를 완료로 표시하고 `dj/develop`에 커밋했습니다. 다음 개발 작업은 두 문화활동을 한 코스로 묶을 수 있도록 **장소 사이의 실제 이동시간을 확인하는  | `59570dee7561` |
| [docs/development/reports/2026-10-31-speech-input-errors.md](../../docs/development/reports/2026-10-31-speech-input-errors.md) | 기존 화면은 여러 오류를 모두 ‘음성 인식 실패’로 표시했습니다. 브라우저가 알려주는 원인과 오류 코드를 표시하도록 수정했습니다. 동조님 PC에서 처음 실패한 원인은 아직 확인되지 않았습니다. | `87dc74f9c1d8` |
| [docs/development/reports/2026-10-31-speech-offline.md](../../docs/development/reports/2026-10-31-speech-offline.md) | 이번 실패에서 먼저 확인할 건 **인터넷 연결**입니다. 13자가 전사된 시도에서는 브라우저 온라인 표시가 `true`였고, 이번에는 **`false`**였습니다. 마이크 권한은 `granted`였지만 캡처가 시작된 지 **2ms 만에** `netwo | `a426e51a4d65` |
| [docs/development/reports/2026-10-31-speech-trace.md](../../docs/development/reports/2026-10-31-speech-trace.md) | 동조님이 보신 대로 **말할 시간이 생기기 전에 꺼졌습니다.** 마이크 권한은 허용됐지만 캡처가 **197ms 만에 종료**됐고, 발화 시작(`speechstart`)은 기록되지 않았습니다. | `4feb9299f79b` |
| [docs/development/reports/2026-10-31-spoken-category.md](../../docs/development/reports/2026-10-31-spoken-category.md) | **국악을 말했는데 전시가 나온 문제를 수정했습니다.** 기존에는 음성이 메모에만 들어가서 ‘분류 반영’을 따로 누르지 않으면 기본값인 전시로 검색됐습니다. | `0a114c15a5ac` |
| [docs/development/reports/2026-10-31-team-backend-guide.md](../../docs/development/reports/2026-10-31-team-backend-guide.md) | [상세 안내문을 저장했습니다](D:/git/lab678/docs/development/team-backend-guide.md). 아래 내용을 팀원과 각자의 LLM에 공유하면 됩니다. 아직 push하지 않아 최신 파일은 로컬에만 있습니다. | `a8dbb6592ed4` |
| [docs/development/reports/2026-10-31-team-feedback-review.md](../../docs/development/reports/2026-10-31-team-feedback-review.md) | **지금은 기능 확장보다 팀 UI 연결과 시연 안정화가 우선입니다.** 팀원 질문을 실제 코드와 대조해 [통합 체크표](D:/git/lab678/docs/development/team-integration-checklist.md)에 기록했습니다. 아래 | `40593adb1b02` |
| [docs/development/reports/2026-10-31-team-requests-record.md](../../docs/development/reports/2026-10-31-team-requests-record.md) | 팀원 요청을 할 일과 작업 우선순위에 기록했습니다. | `d8434458e32f` |
| [docs/development/reports/2026-10-31-tooling-setup.md](../../docs/development/reports/2026-10-31-tooling-setup.md) | 개발 도구·자동 색인·대화 상태 압축을 설정하고 작업 단위로 커밋했습니다. | `b494878b63e2` |
| [docs/development/reports/2026-10-31-transit-guide.md](../../docs/development/reports/2026-10-31-transit-guide.md) | **대중교통 안내 화면과 연결 코드를 추가했습니다. 실제 노선 조회는 API 키 연결 대기입니다.** | `f96b95808ff3` |
| [docs/development/reports/2026-10-31-transit-live.md](../../docs/development/reports/2026-10-31-transit-live.md) | **키 연결과 실제 대중교통 조회가 성공했습니다.** | `403ad7f4c8ce` |
| [docs/development/reports/2026-10-31-transit-map.md](../../docs/development/reports/2026-10-31-transit-map.md) | 대중교통도 외부 지도로 나가지 않고 앱 안에서 볼 수 있게 했습니다. | `384b32b19c66` |
| [docs/development/reports/2026-10-31-transit-provider-factcheck.md](../../docs/development/reports/2026-10-31-transit-provider-factcheck.md) | **구현 흐름은 타당하지만, 핵심 전제가 오래됐습니다. 우리 상황에서는 카카오부터 실제로 시험하는 게 좋겠습니다.** | `0fe69e402c01` |
| [docs/development/reports/2026-10-31-two-stop-course.md](../../docs/development/reports/2026-10-31-two-stop-course.md) | **두 곳 문화코스**를 구현했습니다. 출발지부터 첫 행사장까지의 도보, 두 행사 사이 이동, 관람시간을 합쳐 방문 순서와 예상 시각을 보여줍니다. | `49685ac3f27b` |
| [docs/development/reports/2026-10-31-walk-demo.md](../../docs/development/reports/2026-10-31-walk-demo.md) | 동조님 시연 PC에서 **국악 추천 → 행사 선택 → 도보 시간 확인**까지 정상 동작한 것으로 기록했습니다. | `e8fd1e1fa6a5` |
| [docs/development/reports/2026-10-31-walk.md](../../docs/development/reports/2026-10-31-walk.md) | 두 행사 사이 도보 시간을 추천 화면에서 확인할 수 있습니다. | `96e12134646c` |
| [docs/development/reports/20261031-place-search-integration.md](../../docs/development/reports/20261031-place-search-integration.md) | 출발지 검색 API와 프론트 연결 자료를 준비했습니다. | `095bcfc1e353` |
| [docs/development/reports/20261031-push-pr-issue.md](../../docs/development/reports/20261031-push-pr-issue.md) | 최신 백엔드 11개 커밋을 dj/develop에 Push했습니다. | `a908007b899d` |
| [docs/development/reports/20261031-qa01-received.md](../../docs/development/reports/20261031-qa01-received.md) | 기획의 QA-01 기준과 후속 할 일을 기록했습니다. | `052acc1b388b` |
| [docs/development/screen-spec-review.md](../../docs/development/screen-spec-review.md) | 화면명세 v0.1 수신·구현 대조 체크표 | `07c093eb5b29` |
| [docs/development/state.json](../../docs/development/state.json) | 구조화 설정·상태 데이터 | `999ef16b6ecc` |
| [docs/development/tasks.md](../../docs/development/tasks.md) | LAB678 · 김동조 개발 할 일 | `609b9a031a2b` |
| [docs/development/team-backend-guide.md](../../docs/development/team-backend-guide.md) | LAB678 · 동료와 LLM을 위한 개발 참조·실행 안내 | `cc447d4a1c21` |
| [docs/development/team-integration-checklist.md](../../docs/development/team-integration-checklist.md) | 팀 의견 대조 · 최종 UI 연결 우선 체크표 | `6c9ce2ba63db` |
| [docs/development/tooling-progress.md](../../docs/development/tooling-progress.md) | 재사용 도구·자동 색인·컨텍스트 구축 진행 체크표 | `6b1797ed7662` |
| [docs/development/transit-progress.md](../../docs/development/transit-progress.md) | 앱 내부 대중교통 안내 진행표 | `7b6a5b930dcc` |
| [docs/meetings/2026-10-28.md](../../docs/meetings/2026-10-28.md) | 10/28 팀 회의 | `1791d2ce1b9d` |
| [docs/planning/AGENTS.md](../../docs/planning/AGENTS.md) | 첨부 기획 원본 | `참고 원본 / 9763e5c32079` |
| [docs/planning/Lab_678_MVP_화면명세서.md](../../docs/planning/Lab_678_MVP_화면명세서.md) | Lab 678 \| 오늘 나들이 — MVP 화면명세서 v0.3.0 | `참고 원본 / 6a88e673c057` |
| [docs/planning/PRD.md](../../docs/planning/PRD.md) | Lab 678 \| 오늘 나들이 — 제품 요구사항 정의서(PRD) v0.7.0 | `참고 원본 / 44e890bbf00e` |
| [docs/planning/README.md](../../docs/planning/README.md) | Lab 678 \| 오늘 나들이 — 기획 문서 안내 및 AI 협업 읽기 기준 | `참고 원본 / e94fec3092da` |
| [docs/planning/archive/Lab_678_시니어_문화외출_독립형_PRD_v0.1_20261030.md](../../docs/planning/archive/Lab_678_시니어_문화외출_독립형_PRD_v0.1_20261030.md) | Lab 678 \| PRD v0.1 | `참고 원본 / 10fdfc65d56a` |
| [docs/planning/archive/Lab_678_시니어_문화외출_독립형_PRD_v0.4_20261030.md](../../docs/planning/archive/Lab_678_시니어_문화외출_독립형_PRD_v0.4_20261030.md) | Lab 678 \| 시니어 AI 음성 문화외출 추천 서비스 PRD v0.4 | `참고 원본 / 4f8ec70be6ac` |
| [docs/planning/archive/Lab_678_시니어_문화외출_음성추천_PRD_v0.3_20261030.md](../../docs/planning/archive/Lab_678_시니어_문화외출_음성추천_PRD_v0.3_20261030.md) | Lab 678 \| 시니어 AI 음성 문화외출 추천 서비스 — 통합 PRD v0.3 | `참고 원본 / 01f2f5558333` |
| [docs/planning/handoff/Lab_678_UI_착수패키지_손희영_20261030.md](../../docs/planning/handoff/Lab_678_UI_착수패키지_손희영_20261030.md) | Lab 678 \| 손희영 UX/UI 병렬 착수 패키지 v0.1 | `참고 원본 / f710722d0b13` |
| [docs/planning/handoff/Lab_678_개발_착수패키지_김동조_20261030.md](../../docs/planning/handoff/Lab_678_개발_착수패키지_김동조_20261030.md) | Lab 678 \| 김동조 개발 병렬 착수 패키지 v0.1 | `참고 원본 / 1b59ed020715` |
| [docs/planning/handoff/Lab_678_공동설계_병렬착수_공통합의안_20261030.md](../../docs/planning/handoff/Lab_678_공동설계_병렬착수_공통합의안_20261030.md) | Lab 678 \| 공동설계 및 병렬작업 착수 — 공통 합의안 v0.1 | `참고 원본 / e7bb09bda230` |
| [docs/reference/AGENTS.md](../../docs/reference/AGENTS.md) | 과거 자료 보관 | `참고 원본 / 06ba7191a975` |
| [docs/reference/README.md](../../docs/reference/README.md) | 외부 브랜치 원본 보관 | `참고 원본 / bd23db088e1b` |
| [docs/reference/TEAM_WORKFLOW/.env.example](../../docs/reference/TEAM_WORKFLOW/.env.example) | 설정·자료 파일; 필요할 때 원문 확인 | `참고 원본 / a1a4d8e749e0` |
| [docs/reference/TEAM_WORKFLOW/.github/ISSUE_TEMPLATE/bug.md](../../docs/reference/TEAM_WORKFLOW/.github/ISSUE_TEMPLATE/bug.md) | --- | `참고 원본 / 0da051347842` |
| [docs/reference/TEAM_WORKFLOW/.github/ISSUE_TEMPLATE/task.md](../../docs/reference/TEAM_WORKFLOW/.github/ISSUE_TEMPLATE/task.md) | --- | `참고 원본 / 83377ff93256` |
| [docs/reference/TEAM_WORKFLOW/.github/pull_request_template.md](../../docs/reference/TEAM_WORKFLOW/.github/pull_request_template.md) | ## 무엇을 했나요 | `참고 원본 / 4307cddf0603` |
| [docs/reference/TEAM_WORKFLOW/.gitignore](../../docs/reference/TEAM_WORKFLOW/.gitignore) | 설정·자료 파일; 필요할 때 원문 확인 | `참고 원본 / 6d0d8e63c3bd` |
| [docs/reference/TEAM_WORKFLOW/AGENTS.md](../../docs/reference/TEAM_WORKFLOW/AGENTS.md) | Lab678 · Codyssey AI 해커톤 2026 | `참고 원본 / 55bc393ce1da` |
| [docs/reference/TEAM_WORKFLOW/CLAUDE.md](../../docs/reference/TEAM_WORKFLOW/CLAUDE.md) | @AGENTS.md | `참고 원본 / 336cc4fbf19b` |
| [docs/reference/TEAM_WORKFLOW/GEMINI.md](../../docs/reference/TEAM_WORKFLOW/GEMINI.md) | @AGENTS.md | `참고 원본 / 336cc4fbf19b` |
| [docs/reference/TEAM_WORKFLOW/README.md](../../docs/reference/TEAM_WORKFLOW/README.md) | Lab678 · Codyssey AI 해커톤 2026 | `참고 원본 / 8dce7fc2fb58` |
| [docs/reference/TEAM_WORKFLOW/TEAM_WORKFLOW.md](../../docs/reference/TEAM_WORKFLOW/TEAM_WORKFLOW.md) | 678 Lab · TEAM_WORKFLOW | `참고 원본 / 1bdea05730d6` |
| [docs/reference/TEAM_WORKFLOW/backend/README.md](../../docs/reference/TEAM_WORKFLOW/backend/README.md) | backend | `참고 원본 / d63161c840d7` |
| [docs/reference/TEAM_WORKFLOW/design/README.md](../../docs/reference/TEAM_WORKFLOW/design/README.md) | design | `참고 원본 / 7b5bac9c5220` |
| [docs/reference/TEAM_WORKFLOW/docs/README.md](../../docs/reference/TEAM_WORKFLOW/docs/README.md) | docs | `참고 원본 / 419a50078cba` |
| [docs/reference/TEAM_WORKFLOW/docs/meetings/2026-10-28.md](../../docs/reference/TEAM_WORKFLOW/docs/meetings/2026-10-28.md) | 10/28 팀 회의 | `참고 원본 / 1791d2ce1b9d` |
| [docs/reference/TEAM_WORKFLOW/frontend/README.md](../../docs/reference/TEAM_WORKFLOW/frontend/README.md) | frontend | `참고 원본 / 2285a465fd38` |
| [docs/reference/hackathon-server/README.md](../../docs/reference/hackathon-server/README.md) | 해커톤 GPU 서버 매뉴얼 보관 기록 | `참고 원본 / 6aada2ce2d27` |
| [frontend/AGENTS.md](../../frontend/AGENTS.md) | frontend 작업 | `48693298e0d3` |
| [frontend/README.md](../../frontend/README.md) | frontend | `e5da40e910c1` |
| [utils/AGENTS.md](../../utils/AGENTS.md) | utils 작업 | `18bc87a3d27f` |
| [utils/README.md](../../utils/README.md) | 재사용 개발 도구 | `64ab606de1b0` |
| [utils/harness.json](../../utils/harness.json) | 구조화 설정·상태 데이터 | `30be360d453f` |
| [utils/index.md](../../utils/index.md) | 자동 생성 색인 | `generated` |
| [utils/reverse_index.md](../../utils/reverse_index.md) | 자동 생성 색인 | `generated` |
| [utils/scripts/catalog.py](../../utils/scripts/catalog.py) | Build deterministic code indexes without importing source modules. | `c6d6d58dfa8c` |
| [utils/scripts/check_course_alternatives.cjs](../../utils/scripts/check_course_alternatives.cjs) | 설정·자료 파일; 필요할 때 원문 확인 | `2d9ef28f2129` |
| [utils/scripts/check_course_edit.cjs](../../utils/scripts/check_course_edit.cjs) | 설정·자료 파일; 필요할 때 원문 확인 | `5cd28eadc59c` |
| [utils/scripts/check_deployment.cjs](../../utils/scripts/check_deployment.cjs) | 설정·자료 파일; 필요할 때 원문 확인 | `e260cdd6322d` |
| [utils/scripts/check_frontend_connection.cjs](../../utils/scripts/check_frontend_connection.cjs) | 설정·자료 파일; 필요할 때 원문 확인 | `2ae21d2104df` |
| [utils/scripts/check_input_contract.cjs](../../utils/scripts/check_input_contract.cjs) | 설정·자료 파일; 필요할 때 원문 확인 | `558a9b06ed26` |
| [utils/scripts/check_kakao_map.cjs](../../utils/scripts/check_kakao_map.cjs) | 설정·자료 파일; 필요할 때 원문 확인 | `4f6f756329a2` |
| [utils/scripts/check_location_ui.cjs](../../utils/scripts/check_location_ui.cjs) | 설정·자료 파일; 필요할 때 원문 확인 | `30cf7dc85519` |
| [utils/scripts/check_outing_ui.cjs](../../utils/scripts/check_outing_ui.cjs) | 설정·자료 파일; 필요할 때 원문 확인 | `940a73880831` |
| [utils/scripts/check_place_search.cjs](../../utils/scripts/check_place_search.cjs) | 설정·자료 파일; 필요할 때 원문 확인 | `fa354bb75fad` |
| [utils/scripts/check_result_preservation.cjs](../../utils/scripts/check_result_preservation.cjs) | 설정·자료 파일; 필요할 때 원문 확인 | `255d267d95fd` |
| [utils/scripts/check_transit_ui.cjs](../../utils/scripts/check_transit_ui.cjs) | 설정·자료 파일; 필요할 때 원문 확인 | `0d799b35eb0d` |
| [utils/scripts/commit_report.py](../../utils/scripts/commit_report.py) | Commit an approved task with its complete UTF-8 report as the exact message. | `6db2e203612e` |
| [utils/scripts/context.py](../../utils/scripts/context.py) | Render a compact restart brief from explicit state, without guessing decisions. | `7448d261b179` |
| [utils/scripts/harness.py](../../utils/scripts/harness.py) | Run offline repository checks with explicit evidence and no auto-repair. | `3f5b351b0e75` |
| [utils/scripts/loop.py](../../utils/scripts/loop.py) | Record a bounded hypothesis-change-evidence loop without executing repair code. | `0ce011ac4c31` |
| [utils/scripts/read_pdf.py](../../utils/scripts/read_pdf.py) | Extract PDF pages locally and print a conservative redacted review copy. | `267f2bd17b9e` |
| [utils/scripts/reuse.py](../../utils/scripts/reuse.py) | Verify copied files and snapshot selected Git files without checkout or merge. | `a04a2ce3e588` |
| [utils/scripts/verify_watch.py](../../utils/scripts/verify_watch.py) | Smoke-test a running index watcher with a temporary documented source file. | `78a17133dfc1` |
| [utils/scripts/watch.py](../../utils/scripts/watch.py) | Refresh indexes and the short context on file changes until explicitly stopped. | `93276854efe9` |
| [utils/templates/README.md](../../utils/templates/README.md) | 작업·코드 템플릿 | `7a6bb6826426` |
| [utils/templates/js_module.js.tmpl](../../utils/templates/js_module.js.tmpl) | /** | `b49d4be90346` |
| [utils/templates/python_module.py.tmpl](../../utils/templates/python_module.py.tmpl) | """모듈 개요: 구현할 목적과 재사용 키워드를 작성한다. | `35cb6752d647` |
| [utils/templates/task.md.tmpl](../../utils/templates/task.md.tmpl) | 작업 이름 | `9d87053a02be` |
| [utils/tests/test_tools.py](../../utils/tests/test_tools.py) | Exercise failure paths for indexes, copying, loops, context and commit guards. | `edcf28c5bab3` |
