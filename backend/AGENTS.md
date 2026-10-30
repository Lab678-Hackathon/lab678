# backend 작업

공통 기준은 [TEAM_WORKFLOW.md](../TEAM_WORKFLOW.md). 먼저 [현재 상태](../docs/development/current-state.md)와 [함수 역색인](../docs/development/repo_reverse_index.md)에서 관련 코드·계약을 찾는다.

- 동조 개인 추천 점검 화면 실행법은 [개발 안내](README.md)를 따른다. 팀 API 계약은 별도 확인하고 기존 KONNECT 함수는 실제 검증한다.
- 재사용 전에 framework_doc와 konnect/study를 [참조 가이드](../docs/development/konnect-reuse-reading-guide.md) 순서로 읽는다. Google·Supabase·반복 LLM·RAG를 필수로 상속하지 않고 import·설정·DB/AI 호출을 확인한다.
- 외부 조회·정규화·판정·LLM 설명의 역할을 나누고, 실패·정상 0건·미확인을 구분한다. 사실 판정 원칙은 공통 규칙을 따른다.
- 새 모듈/함수에 개요·입출력·단위·오류·부작용 docstring을 남긴다. API/공통 계약 변경은 관련 담당자 사전 확인 범위다.
- 변경한 기능의 실제 검증을 기록하고 색인을 갱신한다. 오프라인 도구 PASS를 서비스 API PASS로 보고하지 않는다.
