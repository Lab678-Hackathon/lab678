# 저장소 파일·기능 색인

자동 생성. 생성 문서·비밀값·의존성 제외 규칙은 utils/harness.json과 utils/README.md를 따른다.
Python 함수·클래스는 AST, JS/TS는 이름 있는 선언·화살표 함수 후보만 정규식으로 찾는다. 익명·메서드 등은 완전성 미보장.
개요가 부족한 파일은 의미를 추측하지 않는다. 기능 분류는 harness.json의 명시적 매핑이다.

| 파일 | 개요 | 상태 / 해시 |
|---|---|---|
| [.env.example](../../.env.example) | 설정·자료 파일; 필요할 때 원문 확인 | `34b5286295f8` |
| [.github/ISSUE_TEMPLATE/bug.md](../../.github/ISSUE_TEMPLATE/bug.md) | --- | `4864828de1ee` |
| [.github/ISSUE_TEMPLATE/task.md](../../.github/ISSUE_TEMPLATE/task.md) | --- | `1ee33bbd2c25` |
| [.github/pull_request_template.md](../../.github/pull_request_template.md) | ## 무엇을 했나요 | `ec68f1c48e6b` |
| [.gitignore](../../.gitignore) | 설정·자료 파일; 필요할 때 원문 확인 | `77b6eb2fdbf9` |
| [AGENTS.md](../../AGENTS.md) | Lab678 · AI 작업 안내 | `715958e7efff` |
| [CLAUDE.md](../../CLAUDE.md) | @AGENTS.md | `a853633c4e5c` |
| [GEMINI.md](../../GEMINI.md) | @AGENTS.md | `a853633c4e5c` |
| [README.md](../../README.md) | Lab678 · Codyssey AI 해커톤 2026 | `2b7d237cc973` |
| [TEAM_WORKFLOW.md](../../TEAM_WORKFLOW.md) | 678 Lab · TEAM_WORKFLOW | `bbe50fd59065` |
| [backend/AGENTS.md](../../backend/AGENTS.md) | backend 작업 | `15ed2f76becf` |
| [backend/README.md](../../backend/README.md) | backend | `a62eb767fbce` |
| [backend/chat_conditions.py](../../backend/chat_conditions.py) | AI 해석 결과를 추천 조건 초안으로 병합한다. 네트워크·저장·추천 실행은 하지 않는다. | `2d20b9c355f7` |
| [backend/course.py](../../backend/course.py) | 서울시 후보 최대 다섯 곳의 방문 순서를 비교해 두 곳 도보 일정 하나를 제시한다. | `fc42683c7b44` |
| [backend/culture.env.example](../../backend/culture.env.example) | 설정·자료 파일; 필요할 때 원문 확인 | `2097a30e2c5d` |
| [backend/culture_config.py](../../backend/culture_config.py) | 문화정보 키를 서버 환경/무시된 로컬 파일에서 읽는다. 비밀값을 응답·로그에 내보내지 않는다. | `6325232c6419` |
| [backend/local_voice.py](../../backend/local_voice.py) | Windows 개인 시연용. 카드 텍스트를 설치된 한국어 음성으로 WAV 합성한다. | `a36d41d07b14` |
| [backend/location_view.js](../../backend/location_view.js) | 지도 위 내 위치 표시·갱신·중지를 제공한다. 사용자 클릭 후에만 위치 권한을 요청한다. | `545dfc010fc2` |
| [backend/map_config.py](../../backend/map_config.py) | 지도 표시용 공개 JavaScript 키만 읽는다. 서버 REST 키와 설정 파일은 공개하지 않는다. | `2fdb9049ff08` |
| [backend/map_view.js](../../backend/map_view.js) | 카카오 지도 우선 표시와 기존 지도 대체를 제공하는 개인 점검용 어댑터. | `a20657b13cb6` |
| [backend/naito_chat.py](../../backend/naito_chat.py) | Naito 단일 조건 추출 호출. 키/대화 원문은 기록하지 않고 실패 시 기존 초안을 유지한다. | `6cd4928342de` |
| [backend/outing.py](../../backend/outing.py) | 서울시 분류별 공개 후보에서 날짜·시간·대화 선호를 확인해 추천한다. | `1a1d5fcfc0b7` |
| [backend/places.py](../../backend/places.py) | 출발지 선택용 카카오 장소명/주소 검색. 사용자 검색어·키·원문 응답은 저장하지 않는다. | `a7ee2f080b69` |
| [backend/preferences.py](../../backend/preferences.py) | 대화 선호의 형식과 공식 행사 사실 기반 선별. AI가 가격·경로 사실을 만들지 않는다. | `36a907bf95bc` |
| [backend/preview.html](../../backend/preview.html) | 설정·자료 파일; 필요할 때 원문 확인 | `5cad8d598b48` |
| [backend/preview.py](../../backend/preview.py) | 동조 개인용 로컬 추천 점검 화면. python backend/preview.py로 시작한다. | `6cd2b0752f9c` |
| [backend/team_chat.js](../../backend/team_chat.js) | 팀 프론트 164cd40의 공통 자동 대화 모듈. 최종 반영 전 담당 확인용이다. | `c54513b09949` |
| [backend/team_culture.js](../../backend/team_culture.js) | 문화정보 출처 선택·표시. 팀 복사본과 인계 패키지에서 사용하는 독립 모듈. | `f1729cf148be` |
| [backend/team_preferences.js](../../backend/team_preferences.js) | 로컬 팀 화면의 대화 선호를 최종 확인·실제 추천 요청에 연결한다. 담당 원본에는 미반영. | `8491e8e7aa0e` |
| [backend/team_voice_actions.js](../../backend/team_voice_actions.js) | 공통 음성 조작. 앱에 이미 있는 화면과 현재 후보 ID만 사용하며 URL/행사 사실을 만들지 않는다. | `539b93a6a2b8` |
| [backend/test_chat_conditions.py](../../backend/test_chat_conditions.py) | 실제 AI를 호출하지 않는 조건 병합 테스트. 동의·최신 입력·사실 경계를 검증한다. | `60320d646d8d` |
| [backend/test_course.py](../../backend/test_course.py) | 두 곳 도보 일정의 마감 경계·휴관 원문·결측·방문 순서를 검사한다. | `94dbe388fa2a` |
| [backend/test_culture_sources.py](../../backend/test_culture_sources.py) | 문화정보 키/조회 범위와 국문 장소의 사실·오류 경계를 모의 응답으로 검사한다. | `289aa98498f3` |
| [backend/test_map_config.py](../../backend/test_map_config.py) | 지도 공개 설정이 JS 키만 노출하고 서버 키·잘못된 입력을 배제하는지 검증한다. | `d8a32938f98b` |
| [backend/test_naito_chat.py](../../backend/test_naito_chat.py) | Naito 모의 응답/장애와 HTTP 연결 경계를 검사한다. 실제 서비스 성공을 뜻하지 않는다. | `927ae139d270` |
| [backend/test_outing.py](../../backend/test_outing.py) | 서울시 공개 응답 재생으로 입력·선별·결측·실패를 검사한다. | `4f76676a4a52` |
| [backend/test_places.py](../../backend/test_places.py) | 장소/주소 검색의 입력·좌표·실제0건·공급자 장애·비밀값 노출 방지 회귀. | `944752f387e3` |
| [backend/test_preferences.py](../../backend/test_preferences.py) | 대화→조건→추천 경계. 복수 관심사·제외·가격 미확인·확정값 보호를 재현한다. | `fb951ade6da2` |
| [backend/test_preview.py](../../backend/test_preview.py) | HTTP 처리기의 입력 오류 계약과 route/course 호환을 외부 조회 없이 검증한다. | `420a2c6eb03f` |
| [backend/test_transit.py](../../backend/test_transit.py) | 실제 노선 성공과 구분한 대중교통 어댑터 단위 검증. 가상 수치로 응답/오류 경계를 검사한다. | `a4610c4c9b6e` |
| [backend/test_walking.py](../../backend/test_walking.py) | 한국어 경로 단계와 지도 좌표가 같은 응답을 사용하는지 검증한다. | `c93d16baf2e1` |
| [backend/tour_places.py](../../backend/tour_places.py) | 국문 TourAPI 문화시설 조회. 상설 장소를 특정 날짜의 공연/전시로 간주하지 않는다. | `312d34a26f38` |
| [backend/transit.py](../../backend/transit.py) | 개인 점검용 카카오 대중교통 텍스트 안내. 키는 서버에서만 읽고 원문 응답은 저장하지 않는다. | `e64929bf1612` |
| [backend/voice_session.js](../../backend/voice_session.js) | 횟수와 무응답 시간으로 제한된 브라우저 음성 대화. 시작 클릭 없이 재생/녹음하지 않는다. | `a83906bb82d6` |
| [backend/walking.py](../../backend/walking.py) | 개인 점검 화면에서 선택한 행사장 두 곳의 Valhalla 보행 경로를 조회한다. | `fedc1567e347` |
| [design/AGENTS.md](../../design/AGENTS.md) | design 작업 | `57262504e6ff` |
| [design/README.md](../../design/README.md) | design | `e8cd21971ef0` |
| [docs/AGENTS.md](../../docs/AGENTS.md) | 문서 작업 | `6943f61f8205` |
| [docs/README.md](../../docs/README.md) | docs | `6f5e3f0160f6` |
| [docs/development/README.md](../../docs/development/README.md) | LAB678 · 김동조 개발 작업 맥락 | `ee8c06558346` |
| [docs/development/automatic-voice.md](../../docs/development/automatic-voice.md) | 자동 음성 대화·종료 설정 | `24f101f33212` |
| [docs/development/chat-conditions.md](../../docs/development/chat-conditions.md) | 대화 조건 처리 코어와 연결 제안 | `f30ae0e21e88` |
| [docs/development/chat-ui-handoff.md](../../docs/development/chat-ui-handoff.md) | 팀 화면 채팅 연결 · 로컬 검증과 인계 | `822ac31fd51a` |
| [docs/development/conversation-validation.md](../../docs/development/conversation-validation.md) | 자연어 대화·추천 추가 구간 검증 | `1a9c1234e83c` |
| [docs/development/course-alternatives-progress.md](../../docs/development/course-alternatives-progress.md) | 시간 부족 → 동의 → 대안 선택 진행표 | `a662e7da1bee` |
| [docs/development/culture-sources.md](../../docs/development/culture-sources.md) | 서울시 조회 확대와 국문 문화시설 연결 | `6db9e42de60b` |
| [docs/development/current-state.md](../../docs/development/current-state.md) | 현재 상태와 다음 할 일 | `34dd8bc991e1` |
| [docs/development/demo-login-server-progress.md](../../docs/development/demo-login-server-progress.md) | 데모 로그인·해커톤 서버 검토 진행표 | `ca878f31c5f8` |
| [docs/development/demo-profile-design.md](../../docs/development/demo-profile-design.md) | 인증 없는 이용·체험 프로필·로컬 저장 설계안 | `87e1d5b21681` |
| [docs/development/discussion-log.md](../../docs/development/discussion-log.md) | LAB678 · 김동조 대화·작업 기록 | `811023746587` |
| [docs/development/engineering-loop.md](../../docs/development/engineering-loop.md) | 개발 도구·반복 검증·컨텍스트 운영 | `ce0d9492072b` |
| [docs/development/examples/course-selected-place.live.json](../../docs/development/examples/course-selected-place.live.json) | 구조화 설정·상태 데이터 | `447d8ceff61e` |
| [docs/development/examples/demo-users.sample.json](../../docs/development/examples/demo-users.sample.json) | 구조화 설정·상태 데이터 | `f148990a7ff7` |
| [docs/development/examples/naito-chat.live.json](../../docs/development/examples/naito-chat.live.json) | 구조화 설정·상태 데이터 | `0dfca98bb171` |
| [docs/development/examples/outing-request.json](../../docs/development/examples/outing-request.json) | 구조화 설정·상태 데이터 | `3fc7504a23dd` |
| [docs/development/examples/outing-response.json](../../docs/development/examples/outing-response.json) | 구조화 설정·상태 데이터 | `1e10713e15a7` |
| [docs/development/examples/place-search.address.live.json](../../docs/development/examples/place-search.address.live.json) | 구조화 설정·상태 데이터 | `6d3077cafd3b` |
| [docs/development/examples/place-search.keyword.live.json](../../docs/development/examples/place-search.keyword.live.json) | 구조화 설정·상태 데이터 | `a5df5ce8d2fa` |
| [docs/development/examples/qa01-request.recorded.json](../../docs/development/examples/qa01-request.recorded.json) | 구조화 설정·상태 데이터 | `4fbc99277c08` |
| [docs/development/examples/recommend-response.recorded.json](../../docs/development/examples/recommend-response.recorded.json) | 구조화 설정·상태 데이터 | `3e7b476fdf1a` |
| [docs/development/examples/recommend-selected-place.live.json](../../docs/development/examples/recommend-selected-place.live.json) | 구조화 설정·상태 데이터 | `9b55500b1a7a` |
| [docs/development/examples/seoul-events.capture.json](../../docs/development/examples/seoul-events.capture.json) | 구조화 설정·상태 데이터 | `1bb3cf6f854e` |
| [docs/development/frontend-chat-package.md](../../docs/development/frontend-chat-package.md) | 팀 프론트 채팅·자동 추천 적용 패키지 | `cadddbfb039b` |
| [docs/development/hackathon-server-usage-review.md](../../docs/development/hackathon-server-usage-review.md) | 해커톤 GPU/일반 서버 활용 검토 | `6f9d563a603a` |
| [docs/development/kakao-map-location.md](../../docs/development/kakao-map-location.md) | 카카오 지도 전환·내 위치 표시 구현 기록 | `3209d6cec5a7` |
| [docs/development/keyless-routing-review.md](../../docs/development/keyless-routing-review.md) | 키 없는 이동 안내 방식 대조 · 2026-10-31 | `75fdb523ad1e` |
| [docs/development/konnect-reuse-reading-guide.md](../../docs/development/konnect-reuse-reading-guide.md) | KONNECT 재사용 전 읽기·경량화 가이드 | `ec75964b0824` |
| [docs/development/loops/tooling-index.json](../../docs/development/loops/tooling-index.json) | 구조화 설정·상태 데이터 | `21338df780cb` |
| [docs/development/mobility-routing-review.md](../../docs/development/mobility-routing-review.md) | LAB678 · 도보·대중교통 이동 안내 기술검토 | `459a27237290` |
| [docs/development/mvp-plan.md](../../docs/development/mvp-plan.md) | 김동조의 문화외출 MVP 개발 계획 | `5642ac169efe` |
| [docs/development/naito-usage.md](../../docs/development/naito-usage.md) | Naito 사용 안내 · 사용자 제공 자료 보관 | `1cbeeb232f66` |
| [docs/development/natural-language-handoff.md](../../docs/development/natural-language-handoff.md) | 자연어 자동 설정·추천 연결 | `a85f3d9a5b84` |
| [docs/development/natural-language-recommendation-review.md](../../docs/development/natural-language-recommendation-review.md) | 자연어 중심 추천 · 이전 구현과 현재 구현 비교 | `0790684e7610` |
| [docs/development/outing-handoff.md](../../docs/development/outing-handoff.md) | 동조 개발용 추천 인계 초안 | `031fed5c6ca0` |
| [docs/development/place-search-api.md](../../docs/development/place-search-api.md) | 출발지 검색과 첫 프론트 연결 안내 | `4510f9c7c9d2` |
| [docs/development/qa-chat/chat-conflict.png](../../docs/development/qa-chat/chat-conflict.png) | 설정·자료 파일; 필요할 때 원문 확인 | `4ebd31bbf62d` |
| [docs/development/qa-chat/chat-to-detail.png](../../docs/development/qa-chat/chat-to-detail.png) | 설정·자료 파일; 필요할 때 원문 확인 | `721da4d00e8d` |
| [docs/development/qa-chat/result.json](../../docs/development/qa-chat/result.json) | 구조화 설정·상태 데이터 | `754e3d188f9f` |
| [docs/development/qa-conversation/edges.json](../../docs/development/qa-conversation/edges.json) | 구조화 설정·상태 데이터 | `d34edb3a6733` |
| [docs/development/qa-conversation/recovery.json](../../docs/development/qa-conversation/recovery.json) | 구조화 설정·상태 데이터 | `f62c5e95a0fc` |
| [docs/development/qa-culture/authenticated-check.json](../../docs/development/qa-culture/authenticated-check.json) | 구조화 설정·상태 데이터 | `43d8efde0c92` |
| [docs/development/qa-culture/initial-check.json](../../docs/development/qa-culture/initial-check.json) | 구조화 설정·상태 데이터 | `3ada97ab1f31` |
| [docs/development/qa-culture/tour-key-check.json](../../docs/development/qa-culture/tour-key-check.json) | 구조화 설정·상태 데이터 | `9e8ffcb98130` |
| [docs/development/qa-culture/tour-live-check.json](../../docs/development/qa-culture/tour-live-check.json) | 구조화 설정·상태 데이터 | `18abc1552cdc` |
| [docs/development/qa-handoff/manifest.json](../../docs/development/qa-handoff/manifest.json) | 구조화 설정·상태 데이터 | `a4914fbfd248` |
| [docs/development/qa-handoff/natural-flow.json](../../docs/development/qa-handoff/natural-flow.json) | 구조화 설정·상태 데이터 | `2bb8bcecd07f` |
| [docs/development/qa-handoff/recovery.json](../../docs/development/qa-handoff/recovery.json) | 구조화 설정·상태 데이터 | `ffac0ccd71e9` |
| [docs/development/qa-microphone-toggle/navigation-checks.json](../../docs/development/qa-microphone-toggle/navigation-checks.json) | 구조화 설정·상태 데이터 | `5f5d807c87f0` |
| [docs/development/qa-microphone-toggle/session-checks.json](../../docs/development/qa-microphone-toggle/session-checks.json) | 구조화 설정·상태 데이터 | `b4428a23710e` |
| [docs/development/qa-natural/confirmation.png](../../docs/development/qa-natural/confirmation.png) | 설정·자료 파일; 필요할 때 원문 확인 | `960cb0c107d1` |
| [docs/development/qa-natural/result.json](../../docs/development/qa-natural/result.json) | 구조화 설정·상태 데이터 | `64e83cad2497` |
| [docs/development/qa-natural/results.png](../../docs/development/qa-natural/results.png) | 설정·자료 파일; 필요할 때 원문 확인 | `6c3b486a2a8c` |
| [docs/development/qa-services/culture-ui-first-run.json](../../docs/development/qa-services/culture-ui-first-run.json) | 구조화 설정·상태 데이터 | `e59da5a65da1` |
| [docs/development/qa-services/culture-ui.json](../../docs/development/qa-services/culture-ui.json) | 구조화 설정·상태 데이터 | `bab6361e4fb5` |
| [docs/development/qa-services/keys.json](../../docs/development/qa-services/keys.json) | 구조화 설정·상태 데이터 | `0fd1a384ea40` |
| [docs/development/qa-services/manifest.json](../../docs/development/qa-services/manifest.json) | 구조화 설정·상태 데이터 | `543e7c212339` |
| [docs/development/qa-services/map-check.json](../../docs/development/qa-services/map-check.json) | 구조화 설정·상태 데이터 | `7101f3208c60` |
| [docs/development/qa-transit-mobile/ui-checks.json](../../docs/development/qa-transit-mobile/ui-checks.json) | 구조화 설정·상태 데이터 | `6f406a33c481` |
| [docs/development/qa-voice-navigation/navigation-checks.json](../../docs/development/qa-voice-navigation/navigation-checks.json) | 구조화 설정·상태 데이터 | `a8b9675ac423` |
| [docs/development/qa-voice-navigation/session-checks.json](../../docs/development/qa-voice-navigation/session-checks.json) | 구조화 설정·상태 데이터 | `dd917756e6eb` |
| [docs/development/qa-voice-session/live-ai-check.json](../../docs/development/qa-voice-session/live-ai-check.json) | 구조화 설정·상태 데이터 | `6181aadb6acf` |
| [docs/development/qa-voice-session/manifest.json](../../docs/development/qa-voice-session/manifest.json) | 구조화 설정·상태 데이터 | `d12d53f087d4` |
| [docs/development/qa-voice-session/mock-checks.json](../../docs/development/qa-voice-session/mock-checks.json) | 구조화 설정·상태 데이터 | `dd917756e6eb` |
| [docs/development/qa01-team-connection.md](../../docs/development/qa01-team-connection.md) | QA-01 팀 화면 첫 연결 결과 | `fb528e42c2f5` |
| [docs/development/qa01/live-s03.png](../../docs/development/qa01/live-s03.png) | 설정·자료 파일; 필요할 때 원문 확인 | `d2e8cdabdc09` |
| [docs/development/qa01/live-s04.png](../../docs/development/qa01/live-s04.png) | 설정·자료 파일; 필요할 때 원문 확인 | `be287206af0a` |
| [docs/development/qa01/recorded-s03.png](../../docs/development/qa01/recorded-s03.png) | 설정·자료 파일; 필요할 때 원문 확인 | `944df3c97c69` |
| [docs/development/qa01/recorded-s04.png](../../docs/development/qa01/recorded-s04.png) | 설정·자료 파일; 필요할 때 원문 확인 | `55cf50dc3a7a` |
| [docs/development/qa01/result.json](../../docs/development/qa01/result.json) | 구조화 설정·상태 데이터 | `25365577307a` |
| [docs/development/recommend-api.md](../../docs/development/recommend-api.md) | 추천 API 연결 안내 | `a55eee23d745` |
| [docs/development/render-demo-guide.md](../../docs/development/render-demo-guide.md) | Render 단일 서비스 시연 준비 | `85efffadf892` |
| [docs/development/repo_index.md](../../docs/development/repo_index.md) | 자동 생성 색인 | `generated` |
| [docs/development/repo_reverse_index.md](../../docs/development/repo_reverse_index.md) | 자동 생성 색인 | `generated` |
| [docs/development/repo_tree.md](../../docs/development/repo_tree.md) | 자동 생성 색인 | `generated` |
| [docs/development/reports/2026-10-31-audible-card.md](../../docs/development/reports/2026-10-31-audible-card.md) | 읽기 기능은 구현돼 있었지만, 기존에는 브라우저의 읽기 종료 신호만 확인해서 실제로 소리가 났는지 알 수 없었습니다. **소리가 안 들릴 때 쓸 수 있는 ‘음성 파일로 듣기’를 추가했습니다.** | `78df591fa5f7` |
| [docs/development/reports/2026-10-31-chrome-gugak.md](../../docs/development/reports/2026-10-31-chrome-gugak.md) | **일반 Chrome에서 “국악을 듣고 싶어”라고 말하면 국악 행사 2건이 지도와 카드에 표시되는 흐름을 실기기 확인 완료로 기록했습니다.** 화면의 1번은 서울돈화문국악당의 ‘코공’, 2번은 국립박물관문화재단의 ‘소리: 성덕대왕신종’입니다. | `55128c14b8a4` |
| [docs/development/reports/2026-10-31-chrome-speech.md](../../docs/development/reports/2026-10-31-chrome-speech.md) | **동조님 PC의 일반 Chrome에서 한국어 음성 입력을 확인했습니다.** 버튼을 누른 뒤 1.52초에 발화를 감지했고, 3.51초에 13자를 전사한 뒤 정상 종료했습니다. 시연은 일반 Chrome으로 진행하면 됩니다. | `7eae2e2fcfee` |
| [docs/development/reports/2026-10-31-course-alternatives.md](../../docs/development/reports/2026-10-31-course-alternatives.md) | 시간 부족 안내 뒤에 **동의 → 대안 1·2 → 선택 적용**을 추가했습니다. | `e10c209fabf0` |
| [docs/development/reports/2026-10-31-course-demo-check.md](../../docs/development/reports/2026-10-31-course-demo-check.md) | 보내주신 화면에서 **시간 부족 안내**는 확인됐습니다. 당시 적용된 출발·종료 시각은 화면에 없어 정확한 원인까지 확인하기 어려웠습니다. 이제 결과 상단에 적용한 조건을 표시합니다. | `c308afeadab9` |
| [docs/development/reports/2026-10-31-course-edit.md](../../docs/development/reports/2026-10-31-course-edit.md) | 코스에서 장소 제외와 다시 만들기를 분리했습니다. | `9798d20d1266` |
| [docs/development/reports/2026-10-31-current-prd-sync.md](../../docs/development/reports/2026-10-31-current-prd-sync.md) | 구버전 PRD를 개인용으로 따로 보관하지 않도록 정리했습니다. | `0b7e39f43bef` |
| [docs/development/reports/2026-10-31-demo-server-reuse.md](../../docs/development/reports/2026-10-31-demo-server-reuse.md) | 인증·DB 간소화안, 두 브랜치 재사용 순서, 해커톤 서버 활용안을 기록하고 커밋했습니다. | `64c2078b9f0a` |
| [docs/development/reports/2026-10-31-develop-sync.md](../../docs/development/reports/2026-10-31-develop-sync.md) | 최신 develop을 받아 dj/develop에 동기화했습니다. | `bc7c723fe243` |
| [docs/development/reports/2026-10-31-direct-push.md](../../docs/development/reports/2026-10-31-direct-push.md) | develop 직접 반영 사전 검증과 공유 상태를 기록했습니다. | `f4a571c67deb` |
| [docs/development/reports/2026-10-31-directions.md](../../docs/development/reports/2026-10-31-directions.md) | **추천 → 선택 → 경로안내** 구간을 연결했습니다. | `53bf5d622189` |
| [docs/development/reports/2026-10-31-discord-status-checklist.md](../../docs/development/reports/2026-10-31-discord-status-checklist.md) | 디스코드에 붙여 넣을 공유 초안입니다. | `917835065e4d` |
| [docs/development/reports/2026-10-31-events.md](../../docs/development/reports/2026-10-31-events.md) | 서울시 문화행사 API에서 10월 31일 전시 5건과 전체 분류 5건을 조회해 기록했습니다. 상세 요금이 0원인 전시와 빈 전시를 모두 확인했고, 행사 ID·좌표·조회시각을 보존했습니다. 청량리역 출발 좌표도 원자료와 대조했습니다. 다음은 이 기록과  | `f41b4eefb48e` |
| [docs/development/reports/2026-10-31-frontend-ready.md](../../docs/development/reports/2026-10-31-frontend-ready.md) | 팀 화면이 완성되기 전에 연결할 준비를 마쳤습니다. | `9fd03ebdab02` |
| [docs/development/reports/2026-10-31-guide-push-ready.md](../../docs/development/reports/2026-10-31-guide-push-ready.md) | 참조 방법을 [개발 참조·실행 안내](D:/git/lab678/docs/development/team-backend-guide.md)에 저장하고, **저장소 README·백엔드 README·개발 README에서 찾을 수 있게 연결했습니다.** | `bab37a115379` |
| [docs/development/reports/2026-10-31-input-contract.md](../../docs/development/reports/2026-10-31-input-contract.md) | 진행표의 다음 단계인 입력 검증과 API 전달 준비를 마쳤습니다. | `a544f08bb884` |
| [docs/development/reports/2026-10-31-kakao-live-check.md](../../docs/development/reports/2026-10-31-kakao-live-check.md) | 카카오 도메인 등록 후 실제 지도 연결을 확인했습니다. | `8b8acbbaf387` |
| [docs/development/reports/2026-10-31-kakao-map.md](../../docs/development/reports/2026-10-31-kakao-map.md) | 카카오 지도로 전환할 수 있도록 지도 표시 코드를 연결했습니다. | `ed34ceff09b4` |
| [docs/development/reports/2026-10-31-keyless-routing-review.md](../../docs/development/reports/2026-10-31-keyless-routing-review.md) | **도보는 우리도 이미 API 키 없이 가져옵니다. 다만 현재 도보 서버로 서울 대중교통까지 조회할 수는 없었습니다.** 제시하신 다른 앱의 방식은 참고할 부분이 있지만, 설명만으로 “정확한 대중교통·무장애 길찾기”가 구현됐다고 판단하기는 어렵습니다. | `82c35b650861` |
| [docs/development/reports/2026-10-31-konnect-preview.md](../../docs/development/reports/2026-10-31-konnect-preview.md) | 동조님 점검 화면에 **KONNECT의 홈 → 조건 입력 → 지도·가로 카드** 구성을 반영했습니다. 열어 둔 탭을 새로고침하고 **‘나들이 찾기’**를 누르면 됩니다. [점검 화면 열기](http://127.0.0.1:8765/) | `e5b8bc2e6408` |
| [docs/development/reports/2026-10-31-live-location.md](../../docs/development/reports/2026-10-31-live-location.md) | 지도에 내 위치 표시와 이동 중 갱신·중지를 추가했습니다. | `05233ccd74d6` |
| [docs/development/reports/2026-10-31-local-plan-folder.md](../../docs/development/reports/2026-10-31-local-plan-folder.md) | 개인용 [plan_dj](D:/git/lab678/plan_dj) 폴더를 만들고 **Git 업로드와 자동 색인에서 제외**했습니다. 제외 설정을 검증하고 커밋했습니다. | `0e98567ce29a` |
| [docs/development/reports/2026-10-31-mobility-review.md](../../docs/development/reports/2026-10-31-mobility-review.md) | 도보·대중교통 기술검토서와 동조님 개발 할 일을 추가했습니다. | `81af98fd50b8` |
| [docs/development/reports/2026-10-31-mvp-plan.md](../../docs/development/reports/2026-10-31-mvp-plan.md) | 동조님 MVP 실행계획을 보완해 `dj/develop`에 커밋했습니다. [MVP 실행계획과 단계별 체크표](D:/git/lab678/docs/development/mvp-plan.md) | `666b99ec023e` |
| [docs/development/reports/2026-10-31-personal-attachment-copy.md](../../docs/development/reports/2026-10-31-personal-attachment-copy.md) | 답변 반영했습니다. **첨부 원본의 개인 사본은 `plan_dj`에 보관**합니다. | `4d0637d24a1d` |
| [docs/development/reports/2026-10-31-personal-notes-scope.md](../../docs/development/reports/2026-10-31-personal-notes-scope.md) | `plan_dj`를 **동조님이 저에게 특별히 요청한 개인 사항만 보관하는 폴더**로 정리했습니다. | `5993598693c0` |
| [docs/development/reports/2026-10-31-preview-map.md](../../docs/development/reports/2026-10-31-preview-map.md) | **청량리역에서 나들이를 찾아 지도와 카드로 선택하는 첫 흐름이 동작합니다.** 개인 점검 서버를 실행해 두었습니다. [내 PC에서 나들이 찾기 열기](http://127.0.0.1:8765/) | `4a9257d9b522` |
| [docs/development/reports/2026-10-31-preview-speech.md](../../docs/development/reports/2026-10-31-preview-speech.md) | 민규님 대화 덕분에 **v0.5 문서가 아직 보이지 않는 경위**를 파악했습니다. 10월 31일 오전 원격 저장소를 확인했을 때 브랜치는 기존 6개였고, PR은 협업 규칙 관련 #1·#2뿐이었습니다. PRD 문서 5종과 UI·API 최종 합의는 확인  | `2b2e617a1f5e` |
| [docs/development/reports/2026-10-31-preview.md](../../docs/development/reports/2026-10-31-preview.md) | 실데이터 확보에 이어 개인 점검 화면에서 **출발 조건 → 실시간 추천 → 선택 → 조건 변경·재조회**를 연결했습니다. [내 PC에서 나들이 찾기 열기](http://127.0.0.1:8765/) | `80fa1c370c23` |
| [docs/development/reports/2026-10-31-render-preparation.md](../../docs/development/reports/2026-10-31-render-preparation.md) | Render에 화면과 서버를 함께 올릴 준비를 마쳤습니다. | `8ac2409d4621` |
| [docs/development/reports/2026-10-31-result-preservation.md](../../docs/development/reports/2026-10-31-result-preservation.md) | 연결 준비에 이어 추천 결과가 사라지지 않도록 보완했습니다. | `c5153966e537` |
| [docs/development/reports/2026-10-31-route-text.md](../../docs/development/reports/2026-10-31-route-text.md) | **경로안내를 앱 안에서 텍스트로 먼저 보도록 바꿨습니다.** | `2509c7caa514` |
| [docs/development/reports/2026-10-31-screen-spec-review.md](../../docs/development/reports/2026-10-31-screen-spec-review.md) | 정민규님 화면명세를 읽고 **원본과 구현 대조 체크표를 `dj/develop`에 저장·커밋했습니다.** | `7e7494014a91` |
| [docs/development/reports/2026-10-31-section-checks.md](../../docs/development/reports/2026-10-31-section-checks.md) | 기능마다 확인을 요청해 같은 점검을 여러 번 하게 했습니다. 앞으로는 구간을 완성하고 제가 먼저 테스트한 뒤, 동조님께 필요한 확인만 최대 3개로 모아 요청하겠습니다. | `1229071d979a` |
| [docs/development/reports/2026-10-31-speaker-check.md](../../docs/development/reports/2026-10-31-speaker-check.md) | **음성 입력 → 국악 추천 → 카드 읽기**까지 동조님 PC에서 확인됐습니다. 스피커 청취를 완료로 표시하고 `dj/develop`에 커밋했습니다. 다음 개발 작업은 두 문화활동을 한 코스로 묶을 수 있도록 **장소 사이의 실제 이동시간을 확인하는  | `5eaa0d5d3ac7` |
| [docs/development/reports/2026-10-31-speech-input-errors.md](../../docs/development/reports/2026-10-31-speech-input-errors.md) | 기존 화면은 여러 오류를 모두 ‘음성 인식 실패’로 표시했습니다. 브라우저가 알려주는 원인과 오류 코드를 표시하도록 수정했습니다. 동조님 PC에서 처음 실패한 원인은 아직 확인되지 않았습니다. | `34a338bdfece` |
| [docs/development/reports/2026-10-31-speech-offline.md](../../docs/development/reports/2026-10-31-speech-offline.md) | 이번 실패에서 먼저 확인할 건 **인터넷 연결**입니다. 13자가 전사된 시도에서는 브라우저 온라인 표시가 `true`였고, 이번에는 **`false`**였습니다. 마이크 권한은 `granted`였지만 캡처가 시작된 지 **2ms 만에** `netwo | `6ca19eb21a54` |
| [docs/development/reports/2026-10-31-speech-trace.md](../../docs/development/reports/2026-10-31-speech-trace.md) | 동조님이 보신 대로 **말할 시간이 생기기 전에 꺼졌습니다.** 마이크 권한은 허용됐지만 캡처가 **197ms 만에 종료**됐고, 발화 시작(`speechstart`)은 기록되지 않았습니다. | `9fe23ca839ce` |
| [docs/development/reports/2026-10-31-spoken-category.md](../../docs/development/reports/2026-10-31-spoken-category.md) | **국악을 말했는데 전시가 나온 문제를 수정했습니다.** 기존에는 음성이 메모에만 들어가서 ‘분류 반영’을 따로 누르지 않으면 기본값인 전시로 검색됐습니다. | `d9106baa3688` |
| [docs/development/reports/2026-10-31-team-backend-guide.md](../../docs/development/reports/2026-10-31-team-backend-guide.md) | [상세 안내문을 저장했습니다](D:/git/lab678/docs/development/team-backend-guide.md). 아래 내용을 팀원과 각자의 LLM에 공유하면 됩니다. 아직 push하지 않아 최신 파일은 로컬에만 있습니다. | `1d77a4c965b1` |
| [docs/development/reports/2026-10-31-team-feedback-review.md](../../docs/development/reports/2026-10-31-team-feedback-review.md) | **지금은 기능 확장보다 팀 UI 연결과 시연 안정화가 우선입니다.** 팀원 질문을 실제 코드와 대조해 [통합 체크표](D:/git/lab678/docs/development/team-integration-checklist.md)에 기록했습니다. 아래 | `a9ca2e0b94e4` |
| [docs/development/reports/2026-10-31-team-requests-record.md](../../docs/development/reports/2026-10-31-team-requests-record.md) | 팀원 요청을 할 일과 작업 우선순위에 기록했습니다. | `d8434458e32f` |
| [docs/development/reports/2026-10-31-tooling-setup.md](../../docs/development/reports/2026-10-31-tooling-setup.md) | 개발 도구·자동 색인·대화 상태 압축을 설정하고 작업 단위로 커밋했습니다. | `920b866a8677` |
| [docs/development/reports/2026-10-31-transit-guide.md](../../docs/development/reports/2026-10-31-transit-guide.md) | **대중교통 안내 화면과 연결 코드를 추가했습니다. 실제 노선 조회는 API 키 연결 대기입니다.** | `26978482f259` |
| [docs/development/reports/2026-10-31-transit-live.md](../../docs/development/reports/2026-10-31-transit-live.md) | **키 연결과 실제 대중교통 조회가 성공했습니다.** | `cfd799873745` |
| [docs/development/reports/2026-10-31-transit-map.md](../../docs/development/reports/2026-10-31-transit-map.md) | 대중교통도 외부 지도로 나가지 않고 앱 안에서 볼 수 있게 했습니다. | `7c1d87071396` |
| [docs/development/reports/2026-10-31-transit-provider-factcheck.md](../../docs/development/reports/2026-10-31-transit-provider-factcheck.md) | **구현 흐름은 타당하지만, 핵심 전제가 오래됐습니다. 우리 상황에서는 카카오부터 실제로 시험하는 게 좋겠습니다.** | `205da681552d` |
| [docs/development/reports/2026-10-31-two-stop-course.md](../../docs/development/reports/2026-10-31-two-stop-course.md) | **두 곳 문화코스**를 구현했습니다. 출발지부터 첫 행사장까지의 도보, 두 행사 사이 이동, 관람시간을 합쳐 방문 순서와 예상 시각을 보여줍니다. | `27a95f3ce6f9` |
| [docs/development/reports/2026-10-31-walk-demo.md](../../docs/development/reports/2026-10-31-walk-demo.md) | 동조님 시연 PC에서 **국악 추천 → 행사 선택 → 도보 시간 확인**까지 정상 동작한 것으로 기록했습니다. | `a933333d6e14` |
| [docs/development/reports/2026-10-31-walk.md](../../docs/development/reports/2026-10-31-walk.md) | 두 행사 사이 도보 시간을 추천 화면에서 확인할 수 있습니다. | `ca0e5a18f78b` |
| [docs/development/reports/20261031-conversation-discovery-direction.md](../../docs/development/reports/20261031-conversation-discovery-direction.md) | 짧은 대화로 나들이 선호를 파악하는 방향을 기록했습니다. | `16940c097fe5` |
| [docs/development/reports/20261031-naito-chat-prepared.md](../../docs/development/reports/20261031-naito-chat-prepared.md) | Naito 채팅 연결과 조건 보호 로직을 준비했습니다. | `f6ded21f1b8d` |
| [docs/development/reports/20261031-naito-live-verified.md](../../docs/development/reports/20261031-naito-live-verified.md) | Naito 실제 연결을 확인했습니다. | `a21fa77c3510` |
| [docs/development/reports/20261031-natural-language-review.md](../../docs/development/reports/20261031-natural-language-review.md) | 자연어 중심 추천의 이전 구현과 현재 구현을 비교했습니다. | `2deea50ea72b` |
| [docs/development/reports/20261031-place-search-integration.md](../../docs/development/reports/20261031-place-search-integration.md) | 출발지 검색 API와 프론트 연결 자료를 준비했습니다. | `095bcfc1e353` |
| [docs/development/reports/20261031-push-pr-issue.md](../../docs/development/reports/20261031-push-pr-issue.md) | 최신 백엔드 11개 커밋을 dj/develop에 Push했습니다. | `a908007b899d` |
| [docs/development/reports/20261031-qa01-received.md](../../docs/development/reports/20261031-qa01-received.md) | 기획의 QA-01 기준과 후속 할 일을 기록했습니다. | `052acc1b388b` |
| [docs/development/reports/20261031-team-chat-connected.md](../../docs/development/reports/20261031-team-chat-connected.md) | 팀 화면 복사본에 실제 AI 채팅을 연결했습니다. | `ceeb913acde4` |
| [docs/development/reports/20261031-team-flow-connected.md](../../docs/development/reports/20261031-team-flow-connected.md) | 희영님 프론트와 백엔드의 첫 연결을 확인했습니다. | `fdcdc066550b` |
| [docs/development/reports/20261031-user-preferences-kakao-review.md](../../docs/development/reports/20261031-user-preferences-kakao-review.md) | 사용자 선호 저장과 카카오 로그인 활용 범위를 확인했습니다. | `18a5bbe4b8e7` |
| [docs/development/reports/automatic-voice-session.md](../../docs/development/reports/automatic-voice-session.md) | **자동 음성 대화를 연결했습니다.** [최신 화면](http://127.0.0.1:5175/?#/search)을 Chrome에서 새로고침해 주세요. | `0bcab11d8461` |
| [docs/development/reports/common-automatic-dialogue.md](../../docs/development/reports/common-automatic-dialogue.md) | 자동 대화와 화면 이동을 로컬 통합 화면에 연결했습니다. | `961e7ba93bbf` |
| [docs/development/reports/conversation-validation.md](../../docs/development/reports/conversation-validation.md) | 추가 테스트를 완료했습니다. **이번 검사에서 새 오류는 발견되지 않았습니다.** | `376b64756d83` |
| [docs/development/reports/culture-source-preparation.md](../../docs/development/reports/culture-source-preparation.md) | 서울시 키를 연결할 준비를 마쳤습니다. | `fe865031ddc7` |
| [docs/development/reports/frontend-chat-package.md](../../docs/development/reports/frontend-chat-package.md) | 팀 프론트에 연결할 **적용 패키지**를 준비했습니다. | `789db5f49899` |
| [docs/development/reports/microphone-toggle.md](../../docs/development/reports/microphone-toggle.md) | 마이크 버튼을 켜기·끄기 방식으로 정리했습니다. | `6fe6097c0784` |
| [docs/development/reports/natural-language-recommendation.md](../../docs/development/reports/natural-language-recommendation.md) | 자연어 대화 → 자동 설정 → 추천 연결을 구현했습니다. | `180d6a898461` |
| [docs/development/reports/seoul-live-and-tour-key.md](../../docs/development/reports/seoul-live-and-tour-key.md) | TourAPI 키는 **공공데이터포털**에서 받으면 됩니다. | `78d331919364` |
| [docs/development/reports/service-key-ui-integration.md](../../docs/development/reports/service-key-ui-integration.md) | 공유하신 메일은 **희영님의 로컬 QA 통과 보고**입니다. Render 승인 알림은 아니며, 본문에서도 Render/Vercel 실제 통신은 미검증입니다. | `d84e046d9585` |
| [docs/development/reports/tour-key-verification.md](../../docs/development/reports/tour-key-verification.md) | 인증키 저장은 확인했습니다. **국문 관광정보 서비스 활용신청이 추가로 필요합니다.** | `84081e413436` |
| [docs/development/reports/tour-live-verification.md](../../docs/development/reports/tour-live-verification.md) | **TourAPI 실제 조회에 성공했습니다.** | `0eed32a8dc3f` |
| [docs/development/reports/transit-mobile-cards.md](../../docs/development/reports/transit-mobile-cards.md) | 대중교통 노선과 모바일 표시를 수정했습니다. | `50cf33b453f0` |
| [docs/development/screen-spec-review.md](../../docs/development/screen-spec-review.md) | 화면명세 v0.1 수신·구현 대조 체크표 | `6be14b542825` |
| [docs/development/service-key-status.md](../../docs/development/service-key-status.md) | 키별 실제 동작·앱 반영 점검 | `447866c5a4a0` |
| [docs/development/state.json](../../docs/development/state.json) | 구조화 설정·상태 데이터 | `ffb2ddd95616` |
| [docs/development/tasks.md](../../docs/development/tasks.md) | LAB678 · 김동조 개발 할 일 | `ecc6ea2576d6` |
| [docs/development/team-backend-guide.md](../../docs/development/team-backend-guide.md) | LAB678 · 동료와 LLM을 위한 개발 참조·실행 안내 | `a8cfdbe6a06b` |
| [docs/development/team-integration-checklist.md](../../docs/development/team-integration-checklist.md) | 팀 의견 대조 · 최종 UI 연결 우선 체크표 | `a9c94afd0cf6` |
| [docs/development/tooling-progress.md](../../docs/development/tooling-progress.md) | 재사용 도구·자동 색인·컨텍스트 구축 진행 체크표 | `b72aa1e78379` |
| [docs/development/transit-mobile.md](../../docs/development/transit-mobile.md) | 대중교통 노선·모바일 경로 카드 | `663dc494c4e5` |
| [docs/development/transit-progress.md](../../docs/development/transit-progress.md) | 앱 내부 대중교통 안내 진행표 | `de4987d17983` |
| [docs/meetings/2026-10-28.md](../../docs/meetings/2026-10-28.md) | 10/28 팀 회의 | `4423b5dec6ce` |
| [docs/planning/AGENTS.md](../../docs/planning/AGENTS.md) | 첨부 기획 원본 | `참고 원본 / 966218f93a04` |
| [docs/planning/Lab_678_MVP_화면명세서.md](../../docs/planning/Lab_678_MVP_화면명세서.md) | Lab 678 \| 오늘 나들이 — MVP 화면명세서 v0.2.1 | `참고 원본 / a5387432ff22` |
| [docs/planning/PRD.md](../../docs/planning/PRD.md) | Lab 678 \| 오늘 나들이 — 제품 요구사항 정의서(PRD) v0.6.1 | `참고 원본 / 8a965596ce5e` |
| [docs/planning/README.md](../../docs/planning/README.md) | Lab 678 \| 오늘 나들이 — 기획 문서 안내 및 AI 협업 읽기 기준 | `참고 원본 / bf4bba59f8a3` |
| [docs/planning/archive/Lab_678_시니어_문화외출_독립형_PRD_v0.1_20261030.md](../../docs/planning/archive/Lab_678_시니어_문화외출_독립형_PRD_v0.1_20261030.md) | Lab 678 \| PRD v0.1 | `참고 원본 / 12da2334b1ca` |
| [docs/planning/archive/Lab_678_시니어_문화외출_독립형_PRD_v0.4_20261030.md](../../docs/planning/archive/Lab_678_시니어_문화외출_독립형_PRD_v0.4_20261030.md) | Lab 678 \| 시니어 AI 음성 문화외출 추천 서비스 PRD v0.4 | `참고 원본 / d04427254a8f` |
| [docs/planning/archive/Lab_678_시니어_문화외출_음성추천_PRD_v0.3_20261030.md](../../docs/planning/archive/Lab_678_시니어_문화외출_음성추천_PRD_v0.3_20261030.md) | Lab 678 \| 시니어 AI 음성 문화외출 추천 서비스 — 통합 PRD v0.3 | `참고 원본 / d1b478326627` |
| [docs/planning/handoff/Lab_678_UI_착수패키지_손희영_20261030.md](../../docs/planning/handoff/Lab_678_UI_착수패키지_손희영_20261030.md) | Lab 678 \| 손희영 UX/UI 병렬 착수 패키지 v0.1 | `참고 원본 / d0837643bb03` |
| [docs/planning/handoff/Lab_678_개발_착수패키지_김동조_20261030.md](../../docs/planning/handoff/Lab_678_개발_착수패키지_김동조_20261030.md) | Lab 678 \| 김동조 개발 병렬 착수 패키지 v0.1 | `참고 원본 / b466bfac11aa` |
| [docs/planning/handoff/Lab_678_공동설계_병렬착수_공통합의안_20261030.md](../../docs/planning/handoff/Lab_678_공동설계_병렬착수_공통합의안_20261030.md) | Lab 678 \| 공동설계 및 병렬작업 착수 — 공통 합의안 v0.1 | `참고 원본 / 32b75bbdee73` |
| [docs/reference/AGENTS.md](../../docs/reference/AGENTS.md) | 과거 자료 보관 | `참고 원본 / e174f58df81a` |
| [docs/reference/README.md](../../docs/reference/README.md) | 외부 브랜치 원본 보관 | `참고 원본 / 02f3a96325d3` |
| [docs/reference/TEAM_WORKFLOW/.env.example](../../docs/reference/TEAM_WORKFLOW/.env.example) | 설정·자료 파일; 필요할 때 원문 확인 | `참고 원본 / 34b5286295f8` |
| [docs/reference/TEAM_WORKFLOW/.github/ISSUE_TEMPLATE/bug.md](../../docs/reference/TEAM_WORKFLOW/.github/ISSUE_TEMPLATE/bug.md) | --- | `참고 원본 / 4864828de1ee` |
| [docs/reference/TEAM_WORKFLOW/.github/ISSUE_TEMPLATE/task.md](../../docs/reference/TEAM_WORKFLOW/.github/ISSUE_TEMPLATE/task.md) | --- | `참고 원본 / 1ee33bbd2c25` |
| [docs/reference/TEAM_WORKFLOW/.github/pull_request_template.md](../../docs/reference/TEAM_WORKFLOW/.github/pull_request_template.md) | ## 무엇을 했나요 | `참고 원본 / ec68f1c48e6b` |
| [docs/reference/TEAM_WORKFLOW/.gitignore](../../docs/reference/TEAM_WORKFLOW/.gitignore) | 설정·자료 파일; 필요할 때 원문 확인 | `참고 원본 / 2634a4efe969` |
| [docs/reference/TEAM_WORKFLOW/AGENTS.md](../../docs/reference/TEAM_WORKFLOW/AGENTS.md) | Lab678 · Codyssey AI 해커톤 2026 | `참고 원본 / d0e312ebbab1` |
| [docs/reference/TEAM_WORKFLOW/CLAUDE.md](../../docs/reference/TEAM_WORKFLOW/CLAUDE.md) | @AGENTS.md | `참고 원본 / d631d88045f7` |
| [docs/reference/TEAM_WORKFLOW/GEMINI.md](../../docs/reference/TEAM_WORKFLOW/GEMINI.md) | @AGENTS.md | `참고 원본 / d631d88045f7` |
| [docs/reference/TEAM_WORKFLOW/README.md](../../docs/reference/TEAM_WORKFLOW/README.md) | Lab678 · Codyssey AI 해커톤 2026 | `참고 원본 / 4e90d1430113` |
| [docs/reference/TEAM_WORKFLOW/TEAM_WORKFLOW.md](../../docs/reference/TEAM_WORKFLOW/TEAM_WORKFLOW.md) | 678 Lab · TEAM_WORKFLOW | `참고 원본 / bbe50fd59065` |
| [docs/reference/TEAM_WORKFLOW/backend/README.md](../../docs/reference/TEAM_WORKFLOW/backend/README.md) | backend | `참고 원본 / 2b80d1450b24` |
| [docs/reference/TEAM_WORKFLOW/design/README.md](../../docs/reference/TEAM_WORKFLOW/design/README.md) | design | `참고 원본 / 69ce5d8adb44` |
| [docs/reference/TEAM_WORKFLOW/docs/README.md](../../docs/reference/TEAM_WORKFLOW/docs/README.md) | docs | `참고 원본 / 57dbb44fc25e` |
| [docs/reference/TEAM_WORKFLOW/docs/meetings/2026-10-28.md](../../docs/reference/TEAM_WORKFLOW/docs/meetings/2026-10-28.md) | 10/28 팀 회의 | `참고 원본 / 4423b5dec6ce` |
| [docs/reference/TEAM_WORKFLOW/frontend/README.md](../../docs/reference/TEAM_WORKFLOW/frontend/README.md) | frontend | `참고 원본 / d05cc43ab85a` |
| [docs/reference/hackathon-server/README.md](../../docs/reference/hackathon-server/README.md) | 해커톤 GPU 서버 매뉴얼 보관 기록 | `참고 원본 / eac24535b9c1` |
| [frontend/AGENTS.md](../../frontend/AGENTS.md) | frontend 작업 | `27fb4a4ac041` |
| [frontend/README.md](../../frontend/README.md) | frontend | `8f3bc2455014` |
| [utils/AGENTS.md](../../utils/AGENTS.md) | utils 작업 | `606b01a12f06` |
| [utils/README.md](../../utils/README.md) | 재사용 개발 도구 | `e1df914a2f02` |
| [utils/harness.json](../../utils/harness.json) | 구조화 설정·상태 데이터 | `6f80602ba2aa` |
| [utils/index.md](../../utils/index.md) | 자동 생성 색인 | `generated` |
| [utils/reverse_index.md](../../utils/reverse_index.md) | 자동 생성 색인 | `generated` |
| [utils/scripts/catalog.py](../../utils/scripts/catalog.py) | Build deterministic code indexes without importing source modules. | `ecb99cd9ca5b` |
| [utils/scripts/check_chat_api.py](../../utils/scripts/check_chat_api.py) | 임시 로컬 서버에서 대화 API 정상·입력·미설정·CORS를 검사한다. 외부 AI 호출은 모의다. | `5f716576a3a5` |
| [utils/scripts/check_chat_live.py](../../utils/scripts/check_chat_live.py) | 명시 실행 시 Naito 실제 호출 3회로 공개 예문을 검증한다. 키/공급자 원문은 출력하지 않는다. | `004272e5ae96` |
| [utils/scripts/check_chat_ui.cjs](../../utils/scripts/check_chat_ui.cjs) | 설정·자료 파일; 필요할 때 원문 확인 | `866117a25c8f` |
| [utils/scripts/check_conversation_edges.py](../../utils/scripts/check_conversation_edges.py) | 실제 Naito로 대화 수정·취소·시간 경계를 검사한다. 고정 시험 발화만 사용하고 키는 출력하지 않는다. | `741e0fbbb071` |
| [utils/scripts/check_course_alternatives.cjs](../../utils/scripts/check_course_alternatives.cjs) | 설정·자료 파일; 필요할 때 원문 확인 | `aeaa2c41fe61` |
| [utils/scripts/check_course_edit.cjs](../../utils/scripts/check_course_edit.cjs) | 설정·자료 파일; 필요할 때 원문 확인 | `5cd28eadc59c` |
| [utils/scripts/check_culture_sources.py](../../utils/scripts/check_culture_sources.py) | 실행 중인 백엔드의 서울시·국문 문화시설 연결을 검사한다. 키는 출력하지 않는다. | `b3f9add367c2` |
| [utils/scripts/check_culture_ui.cjs](../../utils/scripts/check_culture_ui.cjs) | 설정·자료 파일; 필요할 때 원문 확인 | `e454362ebc40` |
| [utils/scripts/check_deployment.cjs](../../utils/scripts/check_deployment.cjs) | 설정·자료 파일; 필요할 때 원문 확인 | `e260cdd6322d` |
| [utils/scripts/check_frontend_connection.cjs](../../utils/scripts/check_frontend_connection.cjs) | 설정·자료 파일; 필요할 때 원문 확인 | `2ae21d2104df` |
| [utils/scripts/check_input_contract.cjs](../../utils/scripts/check_input_contract.cjs) | 설정·자료 파일; 필요할 때 원문 확인 | `902949b2d668` |
| [utils/scripts/check_kakao_map.cjs](../../utils/scripts/check_kakao_map.cjs) | 설정·자료 파일; 필요할 때 원문 확인 | `4f6f756329a2` |
| [utils/scripts/check_location_ui.cjs](../../utils/scripts/check_location_ui.cjs) | 설정·자료 파일; 필요할 때 원문 확인 | `30cf7dc85519` |
| [utils/scripts/check_natural_flow.cjs](../../utils/scripts/check_natural_flow.cjs) | 설정·자료 파일; 필요할 때 원문 확인 | `1edcdd8a228e` |
| [utils/scripts/check_outing_ui.cjs](../../utils/scripts/check_outing_ui.cjs) | 설정·자료 파일; 필요할 때 원문 확인 | `431b112db40c` |
| [utils/scripts/check_place_search.cjs](../../utils/scripts/check_place_search.cjs) | 설정·자료 파일; 필요할 때 원문 확인 | `fa354bb75fad` |
| [utils/scripts/check_preference_recovery.cjs](../../utils/scripts/check_preference_recovery.cjs) | 설정·자료 파일; 필요할 때 원문 확인 | `ba86233ffbd3` |
| [utils/scripts/check_result_preservation.cjs](../../utils/scripts/check_result_preservation.cjs) | 설정·자료 파일; 필요할 때 원문 확인 | `a65aea175729` |
| [utils/scripts/check_service_keys.py](../../utils/scripts/check_service_keys.py) | 현재 설정 키별 실제 서비스 응답 검사. 키·헤더·공급자 URL은 기록하지 않는다. | `cd4786cf9c84` |
| [utils/scripts/check_team_flow.cjs](../../utils/scripts/check_team_flow.cjs) | 설정·자료 파일; 필요할 때 원문 확인 | `82c79b99ad8c` |
| [utils/scripts/check_transit_details.py](../../utils/scripts/check_transit_details.py) | 공개 QA 좌표의 실제 대중교통 노선·승하차를 확인한다. 키/원문 요청/사용자 위치는 저장하지 않는다. | `e0254b0fbca4` |
| [utils/scripts/check_transit_mobile.cjs](../../utils/scripts/check_transit_mobile.cjs) | 설정·자료 파일; 필요할 때 원문 확인 | `68009b4eeb65` |
| [utils/scripts/check_transit_ui.cjs](../../utils/scripts/check_transit_ui.cjs) | 설정·자료 파일; 필요할 때 원문 확인 | `0d799b35eb0d` |
| [utils/scripts/check_voice_navigation.cjs](../../utils/scripts/check_voice_navigation.cjs) | 설정·자료 파일; 필요할 때 원문 확인 | `a099d1c3c4f1` |
| [utils/scripts/check_voice_session.cjs](../../utils/scripts/check_voice_session.cjs) | 설정·자료 파일; 필요할 때 원문 확인 | `fc125d3a746d` |
| [utils/scripts/commit_report.py](../../utils/scripts/commit_report.py) | Commit an approved task with its complete UTF-8 report as the exact message. | `71ec658dfada` |
| [utils/scripts/context.py](../../utils/scripts/context.py) | Render a compact restart brief from explicit state, without guessing decisions. | `fd76e9b14c3b` |
| [utils/scripts/harness.py](../../utils/scripts/harness.py) | Run offline repository checks with explicit evidence and no auto-repair. | `16a9248426c4` |
| [utils/scripts/loop.py](../../utils/scripts/loop.py) | Record a bounded hypothesis-change-evidence loop without executing repair code. | `2b91226d1d91` |
| [utils/scripts/prepare_chat_handoff.py](../../utils/scripts/prepare_chat_handoff.py) | 팀 프론트에 적용할 최소 패치와 실행 복사본을 .local에 만든다. 작업 브랜치/팀 원본을 변경하지 않는다. | `1ab213116b6e` |
| [utils/scripts/read_pdf.py](../../utils/scripts/read_pdf.py) | Extract PDF pages locally and print a conservative redacted review copy. | `27fb9fcaa1e9` |
| [utils/scripts/reuse.py](../../utils/scripts/reuse.py) | Verify copied files and snapshot selected Git files without checkout or merge. | `b0da97aea104` |
| [utils/scripts/team_chat_preview.py](../../utils/scripts/team_chat_preview.py) | 팀 브랜치의 격리 복사본에 채팅 모듈을 연결하는 로컬 검증 서버. 원본 파일은 수정하지 않는다. | `39cfb792a4ab` |
| [utils/scripts/verify_watch.py](../../utils/scripts/verify_watch.py) | Smoke-test a running index watcher with a temporary documented source file. | `3a98cf1bc20b` |
| [utils/scripts/watch.py](../../utils/scripts/watch.py) | Refresh indexes and the short context on file changes until explicitly stopped. | `259f3fc032e0` |
| [utils/templates/README.md](../../utils/templates/README.md) | 작업·코드 템플릿 | `1ca52a619cac` |
| [utils/templates/js_module.js.tmpl](../../utils/templates/js_module.js.tmpl) | /** | `fe2e1416837b` |
| [utils/templates/python_module.py.tmpl](../../utils/templates/python_module.py.tmpl) | """모듈 개요: 구현할 목적과 재사용 키워드를 작성한다. | `38c455a0dc3f` |
| [utils/templates/task.md.tmpl](../../utils/templates/task.md.tmpl) | 작업 이름 | `796b088dbc69` |
| [utils/tests/test_tools.py](../../utils/tests/test_tools.py) | Exercise failure paths for indexes, copying, loops, context and commit guards. | `40a7618753a1` |
