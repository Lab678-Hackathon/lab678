# utils 작업

공통 기준은 [TEAM_WORKFLOW.md](../TEAM_WORKFLOW.md). [README.md](README.md)와 필요한 색인 항목만 읽는다.

- 반복할 개발 코드를 scripts에 저장하고 모듈·함수·클래스 docstring, 입력·출력·부작용·실행 예시를 남긴다. 비밀값이나 사용자별 절대 경로를 하드코딩하지 않는다.
- 검증은 `python utils/scripts/harness.py --tests`. 생성 색인은 직접 편집하지 않는다. 감시기가 멈춰 있으면 `python utils/scripts/watch.py --once`로 갱신한다.
- 복사/커밋/감시 같은 부작용 코드는 실패·경계 사례를 테스트한다. 실제 API·서비스 검증과 구분한다.
- 도구 동작과 자동 감시 여부를 기록한다. 자동 수정·무제한 재시도·자동 커밋은 도입하지 않는다.
