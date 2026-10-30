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
| [.gitignore](../../.gitignore) | 설정·자료 파일; 필요할 때 원문 확인 | `b5f25d7785b5` |
| [AGENTS.md](../../AGENTS.md) | Lab678 · AI 작업 안내 | `dcb1ddee9fbb` |
| [CLAUDE.md](../../CLAUDE.md) | @AGENTS.md | `a853633c4e5c` |
| [GEMINI.md](../../GEMINI.md) | @AGENTS.md | `a853633c4e5c` |
| [README.md](../../README.md) | Lab678 · Codyssey AI 해커톤 2026 | `eaff92d60d38` |
| [TEAM_WORKFLOW.md](../../TEAM_WORKFLOW.md) | 678 Lab · TEAM_WORKFLOW | `bbe50fd59065` |
| [backend/AGENTS.md](../../backend/AGENTS.md) | backend 작업 | `4c309563b7f1` |
| [backend/README.md](../../backend/README.md) | backend | `d6bc4099c8c5` |
| [backend/local_voice.py](../../backend/local_voice.py) | Windows 개인 시연용. 카드 텍스트를 설치된 한국어 음성으로 WAV 합성한다. | `bb48f7405b6d` |
| [backend/outing.py](../../backend/outing.py) | 서울시 행사 다섯 건에서 날짜·시간·분류를 확인하고 직선거리 순으로 반환한다. | `821431f3e0c4` |
| [backend/preview.html](../../backend/preview.html) | 설정·자료 파일; 필요할 때 원문 확인 | `ddfdc7a4c86c` |
| [backend/preview.py](../../backend/preview.py) | 동조 개인용 로컬 추천 점검 화면. python backend/preview.py로 시작한다. | `1781437cb0b3` |
| [backend/test_outing.py](../../backend/test_outing.py) | 서울시 공개 응답 재생으로 입력·선별·결측·실패를 검사한다. | `e622eaa6e653` |
| [backend/walking.py](../../backend/walking.py) | 개인 점검 화면에서 선택한 행사장 두 곳의 Valhalla 보행 경로를 조회한다. | `4f852727a0c5` |
| [design/AGENTS.md](../../design/AGENTS.md) | design 작업 | `847f9b6e5ece` |
| [design/README.md](../../design/README.md) | design | `e8cd21971ef0` |
| [docs/AGENTS.md](../../docs/AGENTS.md) | 문서 작업 | `b86a53a0779f` |
| [docs/README.md](../../docs/README.md) | docs | `57dbb44fc25e` |
| [docs/development/README.md](../../docs/development/README.md) | LAB678 · 김동조 개발 작업 맥락 | `ff76f35a0a6a` |
| [docs/development/current-state.md](../../docs/development/current-state.md) | 현재 상태와 다음 할 일 | `487b27d23353` |
| [docs/development/demo-login-server-progress.md](../../docs/development/demo-login-server-progress.md) | 데모 로그인·해커톤 서버 검토 진행표 | `15f55ee764b3` |
| [docs/development/demo-profile-design.md](../../docs/development/demo-profile-design.md) | 인증 없는 이용·체험 프로필·로컬 저장 설계안 | `fab2f7ba08c6` |
| [docs/development/discussion-log.md](../../docs/development/discussion-log.md) | LAB678 · 김동조 대화·작업 기록 | `8e1fa7b05cd8` |
| [docs/development/engineering-loop.md](../../docs/development/engineering-loop.md) | 개발 도구·반복 검증·컨텍스트 운영 | `f2d520471866` |
| [docs/development/examples/demo-users.sample.json](../../docs/development/examples/demo-users.sample.json) | 구조화 설정·상태 데이터 | `d87032355d12` |
| [docs/development/examples/outing-request.json](../../docs/development/examples/outing-request.json) | 구조화 설정·상태 데이터 | `80868272defa` |
| [docs/development/examples/outing-response.json](../../docs/development/examples/outing-response.json) | 구조화 설정·상태 데이터 | `2298a272752a` |
| [docs/development/examples/seoul-events.capture.json](../../docs/development/examples/seoul-events.capture.json) | 구조화 설정·상태 데이터 | `691b61b192fe` |
| [docs/development/hackathon-server-usage-review.md](../../docs/development/hackathon-server-usage-review.md) | 해커톤 GPU/일반 서버 활용 검토 | `492d50fbcd64` |
| [docs/development/konnect-reuse-reading-guide.md](../../docs/development/konnect-reuse-reading-guide.md) | KONNECT 재사용 전 읽기·경량화 가이드 | `9aa942997e34` |
| [docs/development/loops/tooling-index.json](../../docs/development/loops/tooling-index.json) | 구조화 설정·상태 데이터 | `11f0a65fbe77` |
| [docs/development/mobility-routing-review.md](../../docs/development/mobility-routing-review.md) | LAB678 · 도보·대중교통 이동 안내 기술검토 | `e172658991e2` |
| [docs/development/mvp-plan.md](../../docs/development/mvp-plan.md) | 김동조의 문화외출 MVP 개발 계획 | `946fd6e206f9` |
| [docs/development/outing-handoff.md](../../docs/development/outing-handoff.md) | 동조 개발용 추천 인계 초안 | `b77aef1fd643` |
| [docs/development/repo_index.md](../../docs/development/repo_index.md) | 자동 생성 색인 | `generated` |
| [docs/development/repo_reverse_index.md](../../docs/development/repo_reverse_index.md) | 자동 생성 색인 | `generated` |
| [docs/development/repo_tree.md](../../docs/development/repo_tree.md) | 자동 생성 색인 | `generated` |
| [docs/development/reports/2026-10-31-audible-card.md](../../docs/development/reports/2026-10-31-audible-card.md) | 읽기 기능은 구현돼 있었지만, 기존에는 브라우저의 읽기 종료 신호만 확인해서 실제로 소리가 났는지 알 수 없었습니다. **소리가 안 들릴 때 쓸 수 있는 ‘음성 파일로 듣기’를 추가했습니다.** | `c73dcb55ab28` |
| [docs/development/reports/2026-10-31-chrome-gugak.md](../../docs/development/reports/2026-10-31-chrome-gugak.md) | **일반 Chrome에서 “국악을 듣고 싶어”라고 말하면 국악 행사 2건이 지도와 카드에 표시되는 흐름을 실기기 확인 완료로 기록했습니다.** 화면의 1번은 서울돈화문국악당의 ‘코공’, 2번은 국립박물관문화재단의 ‘소리: 성덕대왕신종’입니다. | `3d49ea543932` |
| [docs/development/reports/2026-10-31-chrome-speech.md](../../docs/development/reports/2026-10-31-chrome-speech.md) | **동조님 PC의 일반 Chrome에서 한국어 음성 입력을 확인했습니다.** 버튼을 누른 뒤 1.52초에 발화를 감지했고, 3.51초에 13자를 전사한 뒤 정상 종료했습니다. 시연은 일반 Chrome으로 진행하면 됩니다. | `a1d9454464aa` |
| [docs/development/reports/2026-10-31-demo-server-reuse.md](../../docs/development/reports/2026-10-31-demo-server-reuse.md) | 인증·DB 간소화안, 두 브랜치 재사용 순서, 해커톤 서버 활용안을 기록하고 커밋했습니다. | `dde8106210dc` |
| [docs/development/reports/2026-10-31-events.md](../../docs/development/reports/2026-10-31-events.md) | 서울시 문화행사 API에서 10월 31일 전시 5건과 전체 분류 5건을 조회해 기록했습니다. 상세 요금이 0원인 전시와 빈 전시를 모두 확인했고, 행사 ID·좌표·조회시각을 보존했습니다. 청량리역 출발 좌표도 원자료와 대조했습니다. 다음은 이 기록과  | `d952abb36690` |
| [docs/development/reports/2026-10-31-konnect-preview.md](../../docs/development/reports/2026-10-31-konnect-preview.md) | 동조님 점검 화면에 **KONNECT의 홈 → 조건 입력 → 지도·가로 카드** 구성을 반영했습니다. 열어 둔 탭을 새로고침하고 **‘나들이 찾기’**를 누르면 됩니다. [점검 화면 열기](http://127.0.0.1:8765/) | `edf3d0b908d8` |
| [docs/development/reports/2026-10-31-mobility-review.md](../../docs/development/reports/2026-10-31-mobility-review.md) | 도보·대중교통 기술검토서와 동조님 개발 할 일을 추가했습니다. | `eb0bf2ca4f26` |
| [docs/development/reports/2026-10-31-mvp-plan.md](../../docs/development/reports/2026-10-31-mvp-plan.md) | 동조님 MVP 실행계획을 보완해 `dj/develop`에 커밋했습니다. [MVP 실행계획과 단계별 체크표](D:/git/lab678/docs/development/mvp-plan.md) | `b80901c14064` |
| [docs/development/reports/2026-10-31-preview-map.md](../../docs/development/reports/2026-10-31-preview-map.md) | **청량리역에서 나들이를 찾아 지도와 카드로 선택하는 첫 흐름이 동작합니다.** 개인 점검 서버를 실행해 두었습니다. [내 PC에서 나들이 찾기 열기](http://127.0.0.1:8765/) | `be882160cc56` |
| [docs/development/reports/2026-10-31-preview-speech.md](../../docs/development/reports/2026-10-31-preview-speech.md) | 민규님 대화 덕분에 **v0.5 문서가 아직 보이지 않는 경위**를 파악했습니다. 10월 31일 오전 원격 저장소를 확인했을 때 브랜치는 기존 6개였고, PR은 협업 규칙 관련 #1·#2뿐이었습니다. PRD 문서 5종과 UI·API 최종 합의는 확인  | `c2a6f85d400b` |
| [docs/development/reports/2026-10-31-preview.md](../../docs/development/reports/2026-10-31-preview.md) | 실데이터 확보에 이어 개인 점검 화면에서 **출발 조건 → 실시간 추천 → 선택 → 조건 변경·재조회**를 연결했습니다. [내 PC에서 나들이 찾기 열기](http://127.0.0.1:8765/) | `463d1b48dba4` |
| [docs/development/reports/2026-10-31-speaker-check.md](../../docs/development/reports/2026-10-31-speaker-check.md) | **음성 입력 → 국악 추천 → 카드 읽기**까지 동조님 PC에서 확인됐습니다. 스피커 청취를 완료로 표시하고 `dj/develop`에 커밋했습니다. 다음 개발 작업은 두 문화활동을 한 코스로 묶을 수 있도록 **장소 사이의 실제 이동시간을 확인하는  | `59570dee7561` |
| [docs/development/reports/2026-10-31-speech-input-errors.md](../../docs/development/reports/2026-10-31-speech-input-errors.md) | 기존 화면은 여러 오류를 모두 ‘음성 인식 실패’로 표시했습니다. 브라우저가 알려주는 원인과 오류 코드를 표시하도록 수정했습니다. 동조님 PC에서 처음 실패한 원인은 아직 확인되지 않았습니다. | `87dc74f9c1d8` |
| [docs/development/reports/2026-10-31-speech-offline.md](../../docs/development/reports/2026-10-31-speech-offline.md) | 이번 실패에서 먼저 확인할 건 **인터넷 연결**입니다. 13자가 전사된 시도에서는 브라우저 온라인 표시가 `true`였고, 이번에는 **`false`**였습니다. 마이크 권한은 `granted`였지만 캡처가 시작된 지 **2ms 만에** `netwo | `a426e51a4d65` |
| [docs/development/reports/2026-10-31-speech-trace.md](../../docs/development/reports/2026-10-31-speech-trace.md) | 동조님이 보신 대로 **말할 시간이 생기기 전에 꺼졌습니다.** 마이크 권한은 허용됐지만 캡처가 **197ms 만에 종료**됐고, 발화 시작(`speechstart`)은 기록되지 않았습니다. | `4feb9299f79b` |
| [docs/development/reports/2026-10-31-spoken-category.md](../../docs/development/reports/2026-10-31-spoken-category.md) | **국악을 말했는데 전시가 나온 문제를 수정했습니다.** 기존에는 음성이 메모에만 들어가서 ‘분류 반영’을 따로 누르지 않으면 기본값인 전시로 검색됐습니다. | `0a114c15a5ac` |
| [docs/development/reports/2026-10-31-tooling-setup.md](../../docs/development/reports/2026-10-31-tooling-setup.md) | 개발 도구·자동 색인·대화 상태 압축을 설정하고 작업 단위로 커밋했습니다. | `b494878b63e2` |
| [docs/development/reports/2026-10-31-walk-demo.md](../../docs/development/reports/2026-10-31-walk-demo.md) | 동조님 시연 PC에서 **국악 추천 → 행사 선택 → 도보 시간 확인**까지 정상 동작한 것으로 기록했습니다. | `e8fd1e1fa6a5` |
| [docs/development/reports/2026-10-31-walk.md](../../docs/development/reports/2026-10-31-walk.md) | 두 행사 사이 도보 시간을 추천 화면에서 확인할 수 있습니다. | `96e12134646c` |
| [docs/development/state.json](../../docs/development/state.json) | 구조화 설정·상태 데이터 | `8bfbd5abfdc8` |
| [docs/development/tasks.md](../../docs/development/tasks.md) | LAB678 · 김동조 개발 할 일 | `c58fe2ea5a21` |
| [docs/development/tooling-progress.md](../../docs/development/tooling-progress.md) | 재사용 도구·자동 색인·컨텍스트 구축 진행 체크표 | `6b1797ed7662` |
| [docs/meetings/2026-10-28.md](../../docs/meetings/2026-10-28.md) | 10/28 팀 회의 | `4423b5dec6ce` |
| [docs/planning/AGENTS.md](../../docs/planning/AGENTS.md) | 첨부 기획 원본 | `참고 원본 / 9763e5c32079` |
| [docs/planning/Lab_678_UI_착수패키지_손희영_20261030.md](../../docs/planning/Lab_678_UI_착수패키지_손희영_20261030.md) | Lab 678 \| 손희영 UX/UI 병렬 착수 패키지 v0.1 | `참고 원본 / f710722d0b13` |
| [docs/planning/Lab_678_개발_착수패키지_김동조_20261030.md](../../docs/planning/Lab_678_개발_착수패키지_김동조_20261030.md) | Lab 678 \| 김동조 개발 병렬 착수 패키지 v0.1 | `참고 원본 / 1b59ed020715` |
| [docs/planning/Lab_678_공동설계_병렬착수_공통합의안_20261030.md](../../docs/planning/Lab_678_공동설계_병렬착수_공통합의안_20261030.md) | Lab 678 \| 공동설계 및 병렬작업 착수 — 공통 합의안 v0.1 | `참고 원본 / e7bb09bda230` |
| [docs/planning/Lab_678_시니어_문화외출_독립형_PRD_v0.1_20261030.md](../../docs/planning/Lab_678_시니어_문화외출_독립형_PRD_v0.1_20261030.md) | Lab 678 \| PRD v0.1 | `참고 원본 / 10fdfc65d56a` |
| [docs/planning/Lab_678_시니어_문화외출_독립형_PRD_v0.4_20261030.md](../../docs/planning/Lab_678_시니어_문화외출_독립형_PRD_v0.4_20261030.md) | Lab 678 \| 시니어 AI 음성 문화외출 추천 서비스 PRD v0.4 | `참고 원본 / 4f8ec70be6ac` |
| [docs/planning/Lab_678_시니어_문화외출_음성추천_PRD_v0.3_20261030.md](../../docs/planning/Lab_678_시니어_문화외출_음성추천_PRD_v0.3_20261030.md) | Lab 678 \| 시니어 AI 음성 문화외출 추천 서비스 — 통합 PRD v0.3 | `참고 원본 / 01f2f5558333` |
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
| [frontend/README.md](../../frontend/README.md) | frontend | `8f3bc2455014` |
| [utils/AGENTS.md](../../utils/AGENTS.md) | utils 작업 | `18bc87a3d27f` |
| [utils/README.md](../../utils/README.md) | 재사용 개발 도구 | `64ab606de1b0` |
| [utils/harness.json](../../utils/harness.json) | 구조화 설정·상태 데이터 | `bbf3321224db` |
| [utils/index.md](../../utils/index.md) | 자동 생성 색인 | `generated` |
| [utils/reverse_index.md](../../utils/reverse_index.md) | 자동 생성 색인 | `generated` |
| [utils/scripts/catalog.py](../../utils/scripts/catalog.py) | Build deterministic code indexes without importing source modules. | `c6d6d58dfa8c` |
| [utils/scripts/check_outing_ui.cjs](../../utils/scripts/check_outing_ui.cjs) | 설정·자료 파일; 필요할 때 원문 확인 | `6aa903955fa3` |
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
