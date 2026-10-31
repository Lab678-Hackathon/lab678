# QA-01 팀 화면 첫 연결 결과

2026-10-31 14:36 KST. 기획의 사용자 관점 최종 QA와 공개 배포 검증은 별도다.

## 실행 버전과 접속

- 프론트: `feature/front` **d7dee7179347f5fa0fea1a6707c207d64ee96f06**. 소스를 변경하지 않고 Git 아카이브를 `.local/qa-front-d7dee71/frontend`에 펼쳐 실행했다.
- 백엔드: 기능 d6194e0를 포함한 develop 병합 **06c0443** 기준. 현재 dj/develop에도 해당 병합을 fast-forward 반영했다.
- 실제 연결: 팀 `dev_server.py`의 **5173 → 8765 프록시**. API 응답은 현재 백엔드에서 수신했다. 팀의 로컬 프록시 동작이며 Vercel 배포 프록시를 설정했다는 뜻은 아니다.
- 같은 PC 점검 주소: `http://127.0.0.1:5173/?mode=recorded&debug=1#/search`.
- 이 주소는 다른 팀원의 PC에서 동조 PC에 접속하는 주소가 아니다. 인터넷 공유에는 별도 배포 URL이 필요하다.

## 실제 입력·결과

고정 요청 파일은 [qa01-request.recorded.json](examples/qa01-request.recorded.json). 기존 QA 좌표를 그대로 사용했고 `mode`를 명시했다.

| 항목 | recorded QA-01 | 미래 날짜 live |
|---|---|---|
| 요청일·시각 | 2026-10-31 14:00~17:00 | 2026-11-01 14:00~17:00 |
| 출발지 | 청량리역 37.5805961 / 127.0482573 | 동일 |
| 관심사·방식 | 전시·place | 동일 |
| 실행 결과 | PASS | PASS |
| API 후보 ID | seoul:159578, 159859, 159829, 159723, 159808 | seoul:159978, 159664, 159613, 159268 |
| S03 선택 ID | seoul:159578 | seoul:159978 |
| S04 상세 ID | seoul:159578 | seoul:159978 |
| 데이터 | 저장된 서울시 응답을 실제 API로 조회 | 서울시 실제 조회, 확인시각 2026-10-31 14:36:34 KST |

표의 축약 ID에는 모두 `seoul:` 접두사가 붙는다. 전체 값과 기계 판독 결과는 [검증 기록](qa01/result.json)에 있다. 이번 live는 조회 당시의 결과이며 향후에도 같은 후보를 반환한다는 보장은 아니다.

## 구간별 검증 7건

| 검사 | 결과 | 실제/모의 구분 |
|---|---|---|
| S02→S02a→API→S03→S04, ID·제목·선택·조건 복귀 | PASS | 실제 팀 화면/실제 서버/recorded 데이터 |
| 출발지 미선택 차단·59분 차단·60분 수락 | PASS | 실제 팀 화면, 60분은 실제 서버/recorded |
| 정상0건 표시·후보 자동 대체 없음 | PASS | 공급자 0건을 실조회한 것이 아닌 모의 HTTP200 응답 |
| 400 입력 오류·입력 보존 | PASS | 모의 HTTP400 응답을 실제 화면에 전달 |
| 502 조회 실패·입력 보존 | PASS | 모의 HTTP502 응답을 실제 화면에 전달 |
| 네트워크 실패·Mock 후보 대체 없음 | PASS | 브라우저 요청 중단 주입 |
| 미래 날짜 live 카드→상세 ID 일치 | PASS | 실제 서버/서울시 조회 |

S04의 `price_info: null`은 정보 없음·확인 필요로 표시됨을 확인했다. 지도 영역·핀·타일도 캡처에서 확인했다. 현재 팀 화면 지도는 Leaflet/OpenStreetMap이며 개인 점검 화면의 카카오 지도 연결과는 다르다. 모든 지도 상호작용·실제 모바일 기기·음성·저장·코스 화면 검증을 완료한 것은 아니다.

캡처는 412×915 브라우저 뷰포트의 전체 페이지다. 고정 하단 버튼은 캡처에도 뷰포트 높이 위치에 나타난다.

- [recorded S03](qa01/recorded-s03.png) / [recorded S04](qa01/recorded-s04.png)
- [live S03](qa01/live-s03.png) / [live S04](qa01/live-s04.png)

## 재검사

팀 개발 서버와 백엔드를 실행한 뒤 기존 Playwright/Chromium 환경에서:

```powershell
$env:LAB678_FRONT_REF = "d7dee71"
node utils/scripts/check_team_flow.cjs
```

기본 프론트 URL은 5173, `LAB678_FRONT_URL`로 바꿀 수 있다. 검사별 독립 브라우저 세션을 사용하며 결과는 `.local/qa01-team`에 남긴다. 기본 live 날짜는 한국 시각의 다음 날이다. 다른 프론트 버전은 검사 selector와 결과를 다시 확인한다. 소스/운영 브라우저의 저장 데이터는 수정하지 않는다.

## 남은 연결과 팀 요청

1. 현재 팀 S02에는 청량리역·서울역·현재 위치만 있다. 준비된 `POST /preview/places`의 장소명·주소 검색과 명시적 결과 선택을 후속 연결한다. 임의 기본 위치는 넣지 않는다.
2. 팀 `api.js`는 같은 origin의 `/preview/recommend`를 호출한다. 배포는 Vercel 프록시를 추가하거나 Render API 주소+CORS로 호출하도록 맞춰야 한다. 현재 구현에 가장 작은 변경은 프록시 추가지만 담당자와 방식·실제 URL 확인이 필요하다. 로컬 `dev_server.py`는 정적 Vercel 배포에 자동으로 포함되는 실행 서버가 아니다.
3. 민규님은 통합 화면에서 조건 보존·확인 필요·ID 일치·오류 경험을 최종 QA한다. 이번 기술 검사와 구분한다.
4. 저장·S05 코스·음성·카카오 지도·위치 기능의 팀 화면 적용은 별도 후속이다. 복수 관심사 요구 유지, 걷기 미적용 표시 원칙 유지.

후속 추적: [이슈 #16](https://github.com/Lab678-Hackathon/lab678/issues/16). 이번 검증 기록은 로컬 작업이며 별도 Push 전에는 GitHub에 없다.

## Render 계정·키 관련 사용자 질문

로컬 연결에는 Render 계정/키가 필요 없다. 팀원이 인터넷 링크로 접속하려면 백엔드 공개 배포가 필요하다. 배포 운영자는 Render 계정에 로그인하고 서비스를 생성한다. Render 웹 화면 배포에는 관리용 API 키 발급이 필수는 아니다. 관리 API 자동화 키와 카카오 등 서비스 호출 키는 서로 다르며, 서비스 호출 키는 Render 환경변수로 따로 설정한다. 기존 프로젝트의 키 종류/접근 가능 계정은 아직 확인하지 않았다. 실제 키를 문서/채팅에 저장하지 않는다.

공식 근거: [Render Web Services](https://render.com/docs/web-services), [Render API](https://render.com/docs/api), [환경변수](https://render.com/docs/configure-environment-variables).
