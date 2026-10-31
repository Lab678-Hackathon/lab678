# backend
팀원과 LLM은 [개발 참조·실행 안내](../docs/development/team-backend-guide.md)를 먼저 확인한다. 브랜치별 공개 범위, 로컬 실행, 음성·키·CORS 제약과 API 연결 절차를 정리했다.

저장소 루트에서 `python backend/preview.py`를 실행한 뒤 [로컬 나들이 찾기](http://127.0.0.1:8765/)를 연다. Python 표준 라이브러리와 서울시 공개 sample을 쓴다. `python -m unittest discover -s backend -v`로 오프라인 회귀를 실행한다. 실시간은 인터넷 접속이 필요하다. 10/31 기록 재생은 전시·전체를 지원한다. [요청·응답 예시와 UI 인계](../docs/development/outing-handoff.md)

## 개인 대중교통 연결

`.local/transit.env`(Git 제외)에 `LAB678_KAKAO_REST_API_KEY=값`을 로컬에서 직접 설정한다. 카카오맵 API 활성화와 해당 앱 쿼터를 확인한 REST API 키만 사용한다. 환경변수도 지원하며 파일은 요청마다 읽는다. 키는 클라이언트/로그/응답에 포함하지 않는다. 미설정은 503 unconfigured이며 외부 카카오맵으로 이어진다. 10/31 사용자 키 저장 후 실제 대중교통 조회·브라우저 경로 선택을 검증했다. `node utils/scripts/check_transit_ui.cjs --live`는 실제 키 연결 환경 검사다. 전체 도보는 미확인, 반환된 도보 단계의 합만 별도 표시한다. [진행·설정 안내](../docs/development/transit-progress.md)

## 멘토링용 배포 준비

[Render 단일 서비스 실행·설정·검증 안내](../docs/development/render-demo-guide.md)에 화면+Python 서버 배포 입력값을 정리했다. `--host`, 환경변수 `PORT`, `/healthz`, 공개 HTTPS origin을 지원한다. 로컬 기본 주소는 유지한다. 실제 Render 배포는 아직 하지 않았다.
# 현재 로컬 확인 주소

준비된앱이있으면 `http://127.0.0.1:8765/`에서나들이홈→음성/텍스트공통입력을사용한다. 기존개발점검은 `/checks`다. 준비/활성선택·실제마이크입력미터는 [현재 실행 안내](../docs/development/unified-chat-and-meter.md)를따른다. 아래이전점검설명의기본URL은개발점검에서 `/checks`로읽는다.
