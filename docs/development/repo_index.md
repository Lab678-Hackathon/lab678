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
| [AGENTS.md](../../AGENTS.md) | Lab678 · AI 작업 안내 | `b441a0d92694` |
| [CLAUDE.md](../../CLAUDE.md) | @AGENTS.md | `a853633c4e5c` |
| [GEMINI.md](../../GEMINI.md) | @AGENTS.md | `a853633c4e5c` |
| [README.md](../../README.md) | Lab678 · Codyssey AI 해커톤 2026 | `eaff92d60d38` |
| [TEAM_WORKFLOW.md](../../TEAM_WORKFLOW.md) | 678 Lab · TEAM_WORKFLOW | `bbe50fd59065` |
| [backend/AGENTS.md](../../backend/AGENTS.md) | backend 작업 | `15ed2f76becf` |
| [backend/README.md](../../backend/README.md) | backend | `ce6b70c26275` |
| [backend/course.py](../../backend/course.py) | 서울시 후보 최대 다섯 곳의 방문 순서를 비교해 두 곳 도보 일정 하나를 제시한다. | `fc42683c7b44` |
| [backend/local_voice.py](../../backend/local_voice.py) | Windows 개인 시연용. 카드 텍스트를 설치된 한국어 음성으로 WAV 합성한다. | `9b8aca108c6c` |
| [backend/outing.py](../../backend/outing.py) | 서울시 행사 다섯 건에서 날짜·시간·분류를 확인하고 직선거리 순으로 반환한다. | `5004101951ed` |
| [backend/preview.html](../../backend/preview.html) | 설정·자료 파일; 필요할 때 원문 확인 | `c57c892e8f53` |
| [backend/preview.py](../../backend/preview.py) | 동조 개인용 로컬 추천 점검 화면. python backend/preview.py로 시작한다. | `c062b878da90` |
| [backend/test_course.py](../../backend/test_course.py) | 두 곳 도보 일정의 마감 경계·휴관 원문·결측·방문 순서를 검사한다. | `94dbe388fa2a` |
| [backend/test_outing.py](../../backend/test_outing.py) | 서울시 공개 응답 재생으로 입력·선별·결측·실패를 검사한다. | `2ad5c0f55de8` |
| [backend/test_transit.py](../../backend/test_transit.py) | 실제 노선 성공과 구분한 대중교통 어댑터 단위 검증. 가상 수치로 응답/오류 경계를 검사한다. | `b220e57a8165` |
| [backend/test_walking.py](../../backend/test_walking.py) | 한국어 경로 단계와 지도 좌표가 같은 응답을 사용하는지 검증한다. | `c93d16baf2e1` |
| [backend/transit.py](../../backend/transit.py) | 개인 점검용 카카오 대중교통 텍스트 안내. 키는 서버에서만 읽고 원문 응답은 저장하지 않는다. | `99c1e2900ec5` |
| [backend/walking.py](../../backend/walking.py) | 개인 점검 화면에서 선택한 행사장 두 곳의 Valhalla 보행 경로를 조회한다. | `fedc1567e347` |
| [design/AGENTS.md](../../design/AGENTS.md) | design 작업 | `57262504e6ff` |
| [design/README.md](../../design/README.md) | design | `e8cd21971ef0` |
| [docs/AGENTS.md](../../docs/AGENTS.md) | 문서 작업 | `6943f61f8205` |
| [docs/README.md](../../docs/README.md) | docs | `6f5e3f0160f6` |
| [docs/development/README.md](../../docs/development/README.md) | LAB678 · 김동조 개발 작업 맥락 | `f28fb4aaf119` |
| [docs/development/course-alternatives-progress.md](../../docs/development/course-alternatives-progress.md) | 시간 부족 → 동의 → 대안 선택 진행표 | `a662e7da1bee` |
| [docs/development/current-state.md](../../docs/development/current-state.md) | 현재 상태와 다음 할 일 | `976b440dabf5` |
| [docs/development/demo-login-server-progress.md](../../docs/development/demo-login-server-progress.md) | 데모 로그인·해커톤 서버 검토 진행표 | `ca878f31c5f8` |
| [docs/development/demo-profile-design.md](../../docs/development/demo-profile-design.md) | 인증 없는 이용·체험 프로필·로컬 저장 설계안 | `87e1d5b21681` |
| [docs/development/discussion-log.md](../../docs/development/discussion-log.md) | LAB678 · 김동조 대화·작업 기록 | `e9eb5ed545ee` |
| [docs/development/engineering-loop.md](../../docs/development/engineering-loop.md) | 개발 도구·반복 검증·컨텍스트 운영 | `ce0d9492072b` |
| [docs/development/examples/demo-users.sample.json](../../docs/development/examples/demo-users.sample.json) | 구조화 설정·상태 데이터 | `f148990a7ff7` |
| [docs/development/examples/outing-request.json](../../docs/development/examples/outing-request.json) | 구조화 설정·상태 데이터 | `3fc7504a23dd` |
| [docs/development/examples/outing-response.json](../../docs/development/examples/outing-response.json) | 구조화 설정·상태 데이터 | `1e10713e15a7` |
| [docs/development/examples/seoul-events.capture.json](../../docs/development/examples/seoul-events.capture.json) | 구조화 설정·상태 데이터 | `1bb3cf6f854e` |
| [docs/development/hackathon-server-usage-review.md](../../docs/development/hackathon-server-usage-review.md) | 해커톤 GPU/일반 서버 활용 검토 | `6f9d563a603a` |
| [docs/development/keyless-routing-review.md](../../docs/development/keyless-routing-review.md) | 키 없는 이동 안내 방식 대조 · 2026-10-31 | `75fdb523ad1e` |
| [docs/development/konnect-reuse-reading-guide.md](../../docs/development/konnect-reuse-reading-guide.md) | KONNECT 재사용 전 읽기·경량화 가이드 | `ec75964b0824` |
| [docs/development/loops/tooling-index.json](../../docs/development/loops/tooling-index.json) | 구조화 설정·상태 데이터 | `21338df780cb` |
| [docs/development/mobility-routing-review.md](../../docs/development/mobility-routing-review.md) | LAB678 · 도보·대중교통 이동 안내 기술검토 | `459a27237290` |
| [docs/development/mvp-plan.md](../../docs/development/mvp-plan.md) | 김동조의 문화외출 MVP 개발 계획 | `94ef8e460f1e` |
| [docs/development/outing-handoff.md](../../docs/development/outing-handoff.md) | 동조 개발용 추천 인계 초안 | `930e055ab440` |
| [docs/development/repo_index.md](../../docs/development/repo_index.md) | 자동 생성 색인 | `generated` |
| [docs/development/repo_reverse_index.md](../../docs/development/repo_reverse_index.md) | 자동 생성 색인 | `generated` |
| [docs/development/repo_tree.md](../../docs/development/repo_tree.md) | 자동 생성 색인 | `generated` |
| [docs/development/reports/2026-10-31-audible-card.md](../../docs/development/reports/2026-10-31-audible-card.md) | 읽기 기능은 구현돼 있었지만, 기존에는 브라우저의 읽기 종료 신호만 확인해서 실제로 소리가 났는지 알 수 없었습니다. **소리가 안 들릴 때 쓸 수 있는 ‘음성 파일로 듣기’를 추가했습니다.** | `78df591fa5f7` |
| [docs/development/reports/2026-10-31-chrome-gugak.md](../../docs/development/reports/2026-10-31-chrome-gugak.md) | **일반 Chrome에서 “국악을 듣고 싶어”라고 말하면 국악 행사 2건이 지도와 카드에 표시되는 흐름을 실기기 확인 완료로 기록했습니다.** 화면의 1번은 서울돈화문국악당의 ‘코공’, 2번은 국립박물관문화재단의 ‘소리: 성덕대왕신종’입니다. | `55128c14b8a4` |
| [docs/development/reports/2026-10-31-chrome-speech.md](../../docs/development/reports/2026-10-31-chrome-speech.md) | **동조님 PC의 일반 Chrome에서 한국어 음성 입력을 확인했습니다.** 버튼을 누른 뒤 1.52초에 발화를 감지했고, 3.51초에 13자를 전사한 뒤 정상 종료했습니다. 시연은 일반 Chrome으로 진행하면 됩니다. | `7eae2e2fcfee` |
| [docs/development/reports/2026-10-31-course-alternatives.md](../../docs/development/reports/2026-10-31-course-alternatives.md) | 시간 부족 안내 뒤에 **동의 → 대안 1·2 → 선택 적용**을 추가했습니다. | `e10c209fabf0` |
| [docs/development/reports/2026-10-31-course-demo-check.md](../../docs/development/reports/2026-10-31-course-demo-check.md) | 보내주신 화면에서 **시간 부족 안내**는 확인됐습니다. 당시 적용된 출발·종료 시각은 화면에 없어 정확한 원인까지 확인하기 어려웠습니다. 이제 결과 상단에 적용한 조건을 표시합니다. | `c308afeadab9` |
| [docs/development/reports/2026-10-31-current-prd-sync.md](../../docs/development/reports/2026-10-31-current-prd-sync.md) | 구버전 PRD를 개인용으로 따로 보관하지 않도록 정리했습니다. | `a94c27e90a49` |
| [docs/development/reports/2026-10-31-demo-server-reuse.md](../../docs/development/reports/2026-10-31-demo-server-reuse.md) | 인증·DB 간소화안, 두 브랜치 재사용 순서, 해커톤 서버 활용안을 기록하고 커밋했습니다. | `64c2078b9f0a` |
| [docs/development/reports/2026-10-31-develop-sync.md](../../docs/development/reports/2026-10-31-develop-sync.md) | 최신 develop을 받아 dj/develop에 동기화했습니다. | `bc7c723fe243` |
| [docs/development/reports/2026-10-31-directions.md](../../docs/development/reports/2026-10-31-directions.md) | **추천 → 선택 → 경로안내** 구간을 연결했습니다. | `53bf5d622189` |
| [docs/development/reports/2026-10-31-discord-status-checklist.md](../../docs/development/reports/2026-10-31-discord-status-checklist.md) | 디스코드에 붙여 넣을 공유 초안입니다. | `917835065e4d` |
| [docs/development/reports/2026-10-31-events.md](../../docs/development/reports/2026-10-31-events.md) | 서울시 문화행사 API에서 10월 31일 전시 5건과 전체 분류 5건을 조회해 기록했습니다. 상세 요금이 0원인 전시와 빈 전시를 모두 확인했고, 행사 ID·좌표·조회시각을 보존했습니다. 청량리역 출발 좌표도 원자료와 대조했습니다. 다음은 이 기록과  | `f41b4eefb48e` |
| [docs/development/reports/2026-10-31-keyless-routing-review.md](../../docs/development/reports/2026-10-31-keyless-routing-review.md) | **도보는 우리도 이미 API 키 없이 가져옵니다. 다만 현재 도보 서버로 서울 대중교통까지 조회할 수는 없었습니다.** 제시하신 다른 앱의 방식은 참고할 부분이 있지만, 설명만으로 “정확한 대중교통·무장애 길찾기”가 구현됐다고 판단하기는 어렵습니다. | `82c35b650861` |
| [docs/development/reports/2026-10-31-konnect-preview.md](../../docs/development/reports/2026-10-31-konnect-preview.md) | 동조님 점검 화면에 **KONNECT의 홈 → 조건 입력 → 지도·가로 카드** 구성을 반영했습니다. 열어 둔 탭을 새로고침하고 **‘나들이 찾기’**를 누르면 됩니다. [점검 화면 열기](http://127.0.0.1:8765/) | `e5b8bc2e6408` |
| [docs/development/reports/2026-10-31-local-plan-folder.md](../../docs/development/reports/2026-10-31-local-plan-folder.md) | 개인용 [plan_dj](D:/git/lab678/plan_dj) 폴더를 만들고 **Git 업로드와 자동 색인에서 제외**했습니다. 제외 설정을 검증하고 커밋했습니다. | `af486ed484ce` |
| [docs/development/reports/2026-10-31-mobility-review.md](../../docs/development/reports/2026-10-31-mobility-review.md) | 도보·대중교통 기술검토서와 동조님 개발 할 일을 추가했습니다. | `81af98fd50b8` |
| [docs/development/reports/2026-10-31-mvp-plan.md](../../docs/development/reports/2026-10-31-mvp-plan.md) | 동조님 MVP 실행계획을 보완해 `dj/develop`에 커밋했습니다. [MVP 실행계획과 단계별 체크표](D:/git/lab678/docs/development/mvp-plan.md) | `666b99ec023e` |
| [docs/development/reports/2026-10-31-personal-attachment-copy.md](../../docs/development/reports/2026-10-31-personal-attachment-copy.md) | 답변 반영했습니다. **첨부 원본의 개인 사본은 `plan_dj`에 보관**합니다. | `1564ee2573d1` |
| [docs/development/reports/2026-10-31-personal-notes-scope.md](../../docs/development/reports/2026-10-31-personal-notes-scope.md) | `plan_dj`를 **동조님이 저에게 특별히 요청한 개인 사항만 보관하는 폴더**로 정리했습니다. | `fabbb9e1d83d` |
| [docs/development/reports/2026-10-31-preview-map.md](../../docs/development/reports/2026-10-31-preview-map.md) | **청량리역에서 나들이를 찾아 지도와 카드로 선택하는 첫 흐름이 동작합니다.** 개인 점검 서버를 실행해 두었습니다. [내 PC에서 나들이 찾기 열기](http://127.0.0.1:8765/) | `4a9257d9b522` |
| [docs/development/reports/2026-10-31-preview-speech.md](../../docs/development/reports/2026-10-31-preview-speech.md) | 민규님 대화 덕분에 **v0.5 문서가 아직 보이지 않는 경위**를 파악했습니다. 10월 31일 오전 원격 저장소를 확인했을 때 브랜치는 기존 6개였고, PR은 협업 규칙 관련 #1·#2뿐이었습니다. PRD 문서 5종과 UI·API 최종 합의는 확인  | `2b2e617a1f5e` |
| [docs/development/reports/2026-10-31-preview.md](../../docs/development/reports/2026-10-31-preview.md) | 실데이터 확보에 이어 개인 점검 화면에서 **출발 조건 → 실시간 추천 → 선택 → 조건 변경·재조회**를 연결했습니다. [내 PC에서 나들이 찾기 열기](http://127.0.0.1:8765/) | `80fa1c370c23` |
| [docs/development/reports/2026-10-31-route-text.md](../../docs/development/reports/2026-10-31-route-text.md) | **경로안내를 앱 안에서 텍스트로 먼저 보도록 바꿨습니다.** | `2509c7caa514` |
| [docs/development/reports/2026-10-31-screen-spec-review.md](../../docs/development/reports/2026-10-31-screen-spec-review.md) | 정민규님 화면명세를 읽고 **원본과 구현 대조 체크표를 `dj/develop`에 저장·커밋했습니다.** | `7e7494014a91` |
| [docs/development/reports/2026-10-31-section-checks.md](../../docs/development/reports/2026-10-31-section-checks.md) | 기능마다 확인을 요청해 같은 점검을 여러 번 하게 했습니다. 앞으로는 구간을 완성하고 제가 먼저 테스트한 뒤, 동조님께 필요한 확인만 최대 3개로 모아 요청하겠습니다. | `1229071d979a` |
| [docs/development/reports/2026-10-31-speaker-check.md](../../docs/development/reports/2026-10-31-speaker-check.md) | **음성 입력 → 국악 추천 → 카드 읽기**까지 동조님 PC에서 확인됐습니다. 스피커 청취를 완료로 표시하고 `dj/develop`에 커밋했습니다. 다음 개발 작업은 두 문화활동을 한 코스로 묶을 수 있도록 **장소 사이의 실제 이동시간을 확인하는  | `5eaa0d5d3ac7` |
| [docs/development/reports/2026-10-31-speech-input-errors.md](../../docs/development/reports/2026-10-31-speech-input-errors.md) | 기존 화면은 여러 오류를 모두 ‘음성 인식 실패’로 표시했습니다. 브라우저가 알려주는 원인과 오류 코드를 표시하도록 수정했습니다. 동조님 PC에서 처음 실패한 원인은 아직 확인되지 않았습니다. | `34a338bdfece` |
| [docs/development/reports/2026-10-31-speech-offline.md](../../docs/development/reports/2026-10-31-speech-offline.md) | 이번 실패에서 먼저 확인할 건 **인터넷 연결**입니다. 13자가 전사된 시도에서는 브라우저 온라인 표시가 `true`였고, 이번에는 **`false`**였습니다. 마이크 권한은 `granted`였지만 캡처가 시작된 지 **2ms 만에** `netwo | `6ca19eb21a54` |
| [docs/development/reports/2026-10-31-speech-trace.md](../../docs/development/reports/2026-10-31-speech-trace.md) | 동조님이 보신 대로 **말할 시간이 생기기 전에 꺼졌습니다.** 마이크 권한은 허용됐지만 캡처가 **197ms 만에 종료**됐고, 발화 시작(`speechstart`)은 기록되지 않았습니다. | `9fe23ca839ce` |
| [docs/development/reports/2026-10-31-spoken-category.md](../../docs/development/reports/2026-10-31-spoken-category.md) | **국악을 말했는데 전시가 나온 문제를 수정했습니다.** 기존에는 음성이 메모에만 들어가서 ‘분류 반영’을 따로 누르지 않으면 기본값인 전시로 검색됐습니다. | `d9106baa3688` |
| [docs/development/reports/2026-10-31-tooling-setup.md](../../docs/development/reports/2026-10-31-tooling-setup.md) | 개발 도구·자동 색인·대화 상태 압축을 설정하고 작업 단위로 커밋했습니다. | `920b866a8677` |
| [docs/development/reports/2026-10-31-transit-guide.md](../../docs/development/reports/2026-10-31-transit-guide.md) | **대중교통 안내 화면과 연결 코드를 추가했습니다. 실제 노선 조회는 API 키 연결 대기입니다.** | `26978482f259` |
| [docs/development/reports/2026-10-31-transit-live.md](../../docs/development/reports/2026-10-31-transit-live.md) | **키 연결과 실제 대중교통 조회가 성공했습니다.** | `cfd799873745` |
| [docs/development/reports/2026-10-31-transit-provider-factcheck.md](../../docs/development/reports/2026-10-31-transit-provider-factcheck.md) | **구현 흐름은 타당하지만, 핵심 전제가 오래됐습니다. 우리 상황에서는 카카오부터 실제로 시험하는 게 좋겠습니다.** | `205da681552d` |
| [docs/development/reports/2026-10-31-two-stop-course.md](../../docs/development/reports/2026-10-31-two-stop-course.md) | **두 곳 문화코스**를 구현했습니다. 출발지부터 첫 행사장까지의 도보, 두 행사 사이 이동, 관람시간을 합쳐 방문 순서와 예상 시각을 보여줍니다. | `27a95f3ce6f9` |
| [docs/development/reports/2026-10-31-walk-demo.md](../../docs/development/reports/2026-10-31-walk-demo.md) | 동조님 시연 PC에서 **국악 추천 → 행사 선택 → 도보 시간 확인**까지 정상 동작한 것으로 기록했습니다. | `a933333d6e14` |
| [docs/development/reports/2026-10-31-walk.md](../../docs/development/reports/2026-10-31-walk.md) | 두 행사 사이 도보 시간을 추천 화면에서 확인할 수 있습니다. | `ca0e5a18f78b` |
| [docs/development/screen-spec-review.md](../../docs/development/screen-spec-review.md) | 화면명세 v0.1 수신·구현 대조 체크표 | `07c093eb5b29` |
| [docs/development/state.json](../../docs/development/state.json) | 구조화 설정·상태 데이터 | `3a851b801bb8` |
| [docs/development/tasks.md](../../docs/development/tasks.md) | LAB678 · 김동조 개발 할 일 | `ecc6ea2576d6` |
| [docs/development/tooling-progress.md](../../docs/development/tooling-progress.md) | 재사용 도구·자동 색인·컨텍스트 구축 진행 체크표 | `b72aa1e78379` |
| [docs/development/transit-progress.md](../../docs/development/transit-progress.md) | 앱 내부 대중교통 안내 진행표 | `de4987d17983` |
| [docs/meetings/2026-10-28.md](../../docs/meetings/2026-10-28.md) | 10/28 팀 회의 | `4423b5dec6ce` |
| [docs/planning/AGENTS.md](../../docs/planning/AGENTS.md) | 첨부 기획 원본 | `참고 원본 / 966218f93a04` |
| [docs/planning/Lab_678_MVP_화면명세서.md](../../docs/planning/Lab_678_MVP_화면명세서.md) | Lab 678 \| 시니어 AI 음성 문화외출 추천 서비스 — MVP 화면명세서 v0.2 | `참고 원본 / ca968fd6e842` |
| [docs/planning/PRD.md](../../docs/planning/PRD.md) | Lab 678 \| 시니어 AI 문화나들이 추천 서비스 PRD v0.6 | `참고 원본 / c7e68885a653` |
| [docs/planning/README.md](../../docs/planning/README.md) | Lab 678 \| 기획 문서 안내 및 AI 협업 읽기 기준 | `참고 원본 / 5cb9eff3936a` |
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
| [utils/harness.json](../../utils/harness.json) | 구조화 설정·상태 데이터 | `8b16ca241ba2` |
| [utils/index.md](../../utils/index.md) | 자동 생성 색인 | `generated` |
| [utils/reverse_index.md](../../utils/reverse_index.md) | 자동 생성 색인 | `generated` |
| [utils/scripts/catalog.py](../../utils/scripts/catalog.py) | Build deterministic code indexes without importing source modules. | `ecb99cd9ca5b` |
| [utils/scripts/check_course_alternatives.cjs](../../utils/scripts/check_course_alternatives.cjs) | 설정·자료 파일; 필요할 때 원문 확인 | `aeaa2c41fe61` |
| [utils/scripts/check_outing_ui.cjs](../../utils/scripts/check_outing_ui.cjs) | 설정·자료 파일; 필요할 때 원문 확인 | `3597ff86d164` |
| [utils/scripts/check_transit_ui.cjs](../../utils/scripts/check_transit_ui.cjs) | 설정·자료 파일; 필요할 때 원문 확인 | `741952121cf9` |
| [utils/scripts/commit_report.py](../../utils/scripts/commit_report.py) | Commit an approved task with its complete UTF-8 report as the exact message. | `71ec658dfada` |
| [utils/scripts/context.py](../../utils/scripts/context.py) | Render a compact restart brief from explicit state, without guessing decisions. | `fd76e9b14c3b` |
| [utils/scripts/harness.py](../../utils/scripts/harness.py) | Run offline repository checks with explicit evidence and no auto-repair. | `16a9248426c4` |
| [utils/scripts/loop.py](../../utils/scripts/loop.py) | Record a bounded hypothesis-change-evidence loop without executing repair code. | `2b91226d1d91` |
| [utils/scripts/read_pdf.py](../../utils/scripts/read_pdf.py) | Extract PDF pages locally and print a conservative redacted review copy. | `27fb9fcaa1e9` |
| [utils/scripts/reuse.py](../../utils/scripts/reuse.py) | Verify copied files and snapshot selected Git files without checkout or merge. | `b0da97aea104` |
| [utils/scripts/verify_watch.py](../../utils/scripts/verify_watch.py) | Smoke-test a running index watcher with a temporary documented source file. | `3a98cf1bc20b` |
| [utils/scripts/watch.py](../../utils/scripts/watch.py) | Refresh indexes and the short context on file changes until explicitly stopped. | `259f3fc032e0` |
| [utils/templates/README.md](../../utils/templates/README.md) | 작업·코드 템플릿 | `1ca52a619cac` |
| [utils/templates/js_module.js.tmpl](../../utils/templates/js_module.js.tmpl) | /** | `fe2e1416837b` |
| [utils/templates/python_module.py.tmpl](../../utils/templates/python_module.py.tmpl) | """모듈 개요: 구현할 목적과 재사용 키워드를 작성한다. | `38c455a0dc3f` |
| [utils/templates/task.md.tmpl](../../utils/templates/task.md.tmpl) | 작업 이름 | `796b088dbc69` |
| [utils/tests/test_tools.py](../../utils/tests/test_tools.py) | Exercise failure paths for indexes, copying, loops, context and commit guards. | `40a7618753a1` |
