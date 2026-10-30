# frontend 작업

공통 기준은 [TEAM_WORKFLOW.md](../TEAM_WORKFLOW.md). [현재 상태](../docs/development/current-state.md)와 [저장소 색인](../docs/development/repo_index.md)을 통해 해당 화면·상태 계약만 읽는다.

- 희영 담당 화면·공통 컴포넌트에 영향이 있으면 사전 공유한다. 확정 Figma·화면명세와 API 계약을 기준으로 작업한다.
- 함수에 JSDoc으로 목적·입출력·상태 변경·외부 이동을 기록한다. 미지원 JS/TS 심볼은 자동 색인만 믿지 말고 원문 확인한다.
- 로딩·오류·0건·권한 거부·외부 앱 복귀를 구분하고 변경 조건·기존 선택 보존을 검증한다. 실제 브라우저 테스트와 Mock을 나눈다.
