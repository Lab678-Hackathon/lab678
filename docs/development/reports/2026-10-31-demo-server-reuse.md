인증·DB 간소화안, 두 브랜치 재사용 순서, 해커톤 서버 활용안을 기록하고 커밋했습니다.

| 항목 | 실행 후 결과 |
|---|---|
| 로그인·저장 | 인증 없이 이용·브라우저 저장을 기본 후보로 정리. test 프로필은 선택 사항 |
| 샘플 사용자 | 개인정보·인증 토큰 없는 test1/test2 JSON 작성·구조 확인 |
| 두 브랜치 참조 | framework_doc와 konnect/study를 먼저 읽는 규칙과 필요한 코드·테스트 선별 순서 기록 |
| 서버 자료·활용 | 매뉴얼 23쪽 확인·로컬 원본 복사/해시 검증, STT·오프라인 평가 우선안 작성 |
| 기록·검증·커밋 | 할 일·현재 상태·체크표·색인 갱신, 도구 테스트 26개 통과, 전체 보고문 메시지 일치 확인 |

제안은 **framework의 가벼운 공통 기반과 KONNECT의 실제 기능을 필요한 만큼 결합**하는 것입니다. 기존 분석·색인부터 읽고, Google 로그인·Supabase·중복 LLM 호출·RAG를 필수로 물려받지 않겠습니다.

- [무인증·로컬 저장 설계](D:/git/lab678/docs/development/demo-profile-design.md) · [샘플 JSON](D:/git/lab678/docs/development/examples/demo-users.sample.json)
- [두 브랜치 읽기·경량화 가이드](D:/git/lab678/docs/development/konnect-reuse-reading-guide.md)
- [서버 활용안](D:/git/lab678/docs/development/hackathon-server-usage-review.md) · [진척 체크표](D:/git/lab678/docs/development/demo-login-server-progress.md)

매뉴얼은 서버가 VPN 전용 사설망에 있고 **11/1 13:00 삭제 예정**이라고 안내합니다. 실제 배정·최신 공지 확인과 사전 백업이 필요합니다. :codex-file-citation{path="D:/git/lab678/.local/reference/해커톤_GPU_서버_사용_메뉴얼.pdf" purpose="source"}

연락처·내부 접속 안내가 포함된 PDF 원본은 `.local/reference/`에 보관했고, Git에는 출처·해시·활용 요약을 저장했습니다. 문서 읽기 도구도 추가했습니다. 서비스는 설계·샘플 단계이며 실제 로그인·저장 기능 구현, 서버 접속·설치·모델 실행은 하지 않았습니다. push도 하지 않았습니다.
