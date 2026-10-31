# 키별 실제 동작·앱 반영 점검

2026-10-31 김동조 · 사용자 요청에 따라 실제 서비스와 추천화면 연결을 검증했다. 키 값은 표시·커밋하지 않는다. 로컬 구현 상태이며 팀 원본/공개 배포 완료와 구분한다.

| 키/서비스 | 실호출 결과 | 개인8765 | 팀 통합 복사본5175 |
|---|---|---|---|
| 서울 열린데이터광장 | HTTP200 원본23/후보22 | 전시·국악·클래식·콘서트·연극·전체 추천 | 입력→카드/지도→상세 연결 |
| 공공데이터포털 국문 TourAPI | HTTP200 문화시설3 | 문화시설 선택→카드/카카오 지도 | 문화시설 선택→카드/기존 지도→상세 연결 |
| 카카오 REST | 장소5개, 대중교통경로3개 HTTP200 | 대중교통 텍스트·지도 연결 | 장소명 검색/출발 좌표 선택 연결. 대중교통 UI는 미연결 |
| 카카오 JavaScript | 실제 SDK/타일/핀 선택 PASS | 카카오 지도 사용 | 기존 Leaflet/OSM 사용, 카카오 전환 미반영 |
| Naito | claude-sonnet-4 실제 국악 해석 HTTP200 | 기존 개인 화면은 규칙 기반 음성 분류 | AI 대화·조건 자동설정 연결 |
| Valhalla(키 없음) | 실제 도보21단계 HTTP200 | 경로 안내 연결 | 경로 화면 미연결 |

키는 culture.env(서울시/TourAPI), transit.env(카카오REST), map.env(카카오JS), naito.env(Naito)에 저장돼 있다. 모두 .local 아래 Git 제외. Render 배포키는 필요 조건이 아니며 배포/조직 연결은 별도 미완료. 브라우저 STT/TTS는 위 키를 사용하지 않고 기기/브라우저 기능을 사용한다. Naito의 이미지/음성/영상 엔드포인트는 현재 앱에서 사용하지 않는다.

## 추천 화면에서 확인

- 팀 통합 복사본: http://127.0.0.1:5175/?debug=1#/search
- 개인 점검 화면: http://127.0.0.1:8765/
- 입력에서 **어떤 나들이를 찾을까요? → 도서관·박물관 등 문화시설**을 선택한다. 전체 분류·장소찾기로 전환하며 예산·제외 등 나머지 조건은 유지한다.
- 기존 **전시·공연 일정**은 서울문화포털 자료를 사용한다. 문화시설을 날짜별 공연·전시인 것처럼 합치지 않는다.
- Tour는 반경3km에서 최대3시설. 공급자 분류를 사용하므로 대학 등도 포함될 수 있다. 전시 개최 여부·방문 가능 여부를 보장하지 않는다.
- 운영/가격/휴관 미확인은 null·확인 필요. 후보ID를 지도·카드·상세·새로고침에서 동일하게 유지한다.
- Tour는 live/place/전체만 지원. recorded 주소로 요청하면400 안내이며 실시간이나 Mock으로 몰래 전환하지 않는다. 개인 화면의 명시적 문화시설 선택은 live/전체/place로 전환됐음을 안내한다.

## 추가된 호환 계약

`POST /preview/recommend`의 선택 필드 `culture_source`는 `seoul`(기본값), `tour`이다. tour는 기존 `/preview/culture-places` 어댑터에 전달한다. 기존 요청은 영향 없다. 잘못된 출처는400invalid_culture_source. Tour 공급자 실패502/키없음503/정상0건200을 그대로 전달한다. 기존 후보 필드를 유지하고 응답/후보의 source=tourapi_kor, candidate_kind=cultural_facility로 구분한다. 상세 범위는 [문화소스 명세](culture-sources.md).

## 검증·한계

- 백엔드81개 PASS. 출처 라우팅/오류 무대체/recorded 거절 회귀 추가.
- 실제 UI: Tour 카드·지도핀·상세ID·새로고침, 서울시 전환/전시4건, 개인8765 Tour 카드 PASS. 팀지도 배경타일 실제 로딩 확인.
- 모의502에서 이전 결과 유지, 모의0건은 빈 상태 표시 PASS.
- 개인 화면 실조회 중502가 한 번 발생했고 다음 검사에서 정상. 외부 API 안정성 보장을 뜻하지 않는다. 첫 실패 기록도 보존한다.
- 지도 검사 첫 실행은 Playwright 번들 실행파일 부재로 실패. 설치된 Chrome으로 실제 SDK/타일 성공. 지도 검사 내 경로 좌표는 모의이며 실제 교통 API 검사는 별도다.
- 도보 검사기는 status 필드가 없는 기존 응답을 처음에 오판했으며 duration_s/steps 기준으로 수정 후 PASS. 앱의 도보 기능 결함으로 기록하지 않는다.
- [키별 실제 결과](qa-services/keys.json), [화면 구간 결과](qa-services/culture-ui.json), [첫 실행 실패](qa-services/culture-ui-first-run.json), [지도 구분](qa-services/map-check.json).

## 팀 인계

팀 프론트164cd40 기준 6파일 패치: index/search/results 연결과 dj-chat/dj-preferences/dj-culture. 원본 브랜치는 변경하지 않았다. `.local/chat-handoff-164cd40-78acae4abc/team-chat-handoff.zip` 또는 생성기 `python utils/scripts/prepare_chat_handoff.py --ref origin/feature/front`. [패키지 해시](qa-services/manifest.json). 최신 백엔드의 culture_source 지원이 필요하다. 담당자가 적용 범위 확인 후 팀 원본에 반영한다. Push는 별도 요청 시 진행한다.

추가: 개발 도구26개 테스트 PASS(첫 제한 환경 임시폴더 접근 오류 후 재실행). 사용자가 공유한 Issue#16의 희영님 recorded QA통과는 이전 front164cd40/develop06c0443 결과이며 이번 자연어·문화시설 확장이나 Render 승인/배포 성공을 의미하지 않는다.
