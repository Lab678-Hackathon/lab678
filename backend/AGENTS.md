# backend 작업

공통 기준은 [TEAM_WORKFLOW.md](../TEAM_WORKFLOW.md). 먼저 [현재 상태](../docs/development/current-state.md)와 [함수 역색인](../docs/development/repo_reverse_index.md)에서 관련 코드·계약을 찾는다.

- 현재 서비스 구현은 미착수이며 실제 스택/API 계약은 확정 문서와 대조한다. 기존 KONNECT 함수가 정상 검증됐다고 전제하지 않는다.
- 외부 조회·정규화·판정·LLM 설명의 역할을 나누고, 실패·정상 0건·미확인을 구분한다. 사실 판정 원칙은 공통 규칙을 따른다.
- 새 모듈/함수에 개요·입출력·단위·오류·부작용 docstring을 남긴다. API/공통 계약 변경은 관련 담당자 사전 확인 범위다.
- 변경한 기능의 실제 검증을 기록하고 색인을 갱신한다. 오프라인 도구 PASS를 서비스 API PASS로 보고하지 않는다.
