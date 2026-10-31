# 추천 API 연결 안내

2026-10-31 · 동조 개인 점검 서버의 **현재 구현 계약**이다. 팀 최종 API 합의나 최종 UI 연결 완료를 뜻하지 않는다. 기획 원문은 수정하지 않는다.

## 실행·요청

저장소 루트에서 `python backend/preview.py`로 실행한다. 주소는 `http://127.0.0.1:8765`, 요청은 `POST /preview/recommend`, `Content-Type: application/json`이다. 본문은 최대 8192바이트이며 키는 브라우저에 전달하지 않는다.

```json
{
  "request_kind": "place",
  "start_location": {"label": "청량리역", "lat": 37.5805961, "lng": 127.0482573},
  "start_at": "2026-10-31T14:00:00+09:00",
  "end_at": "2026-10-31T17:00:00+09:00",
  "category": "전시",
  "mode": "recorded"
}
```

| 필드 | 현재 허용값·의미 |
|---|---|
| `request_kind` | 필수. `place` 행사 찾기, `route` 코스. 기존 `course`도 동일한 코스 요청으로 허용 |
| `start_location` | 필수. 공백 아닌 `label`, 유한한 `lat`(-90~90), `lng`(-180~180). 좌표 숫자 문자열도 기존 호환을 위해 허용 |
| `start_at`, `end_at` | 필수. 시간대 포함 ISO 날짜·시각. 한국 시각으로 변환해 같은 날·종료>출발·**최소 60분** 검증 |
| `category` | 필수. `전시`, `전체`, `국악`, `클래식`, `콘서트`, `연극` |
| `mode` | 생략 시 `live`. `recorded`는 2026-10-31 전시·전체 기록만 지원. 날짜·분류 불일치 시 400 |
| `stay_minutes` | 코스의 전시 한 곳 체류시간(분). 코스 요청에서 필수, 정수 1~240. 점검 화면 기본값은 30 |
| `exclude_ids` | 코스 계산에서 제외할 행사 ID 목록. `candidates` 전체를 필터링하는 기능과 구분 |
| `alternatives` | 코스 대안을 동의 후 요청하는 Boolean. 생략 시 false. true일 때만 대안 계산 |

최소 60분은 입력한 나들이 시간의 길이다. 편도/왕복이나 도보시간 제한이 아니다. 현재 코스에는 귀가 구간이 없다. 과거 시각은 별도로 차단하지 않으며, 다음 날 종료는 기존 서버 정책대로 거절한다. 자정·과거 시각의 최종 기획 정책은 미확정이다.

예산·이동 선호·Hard 제약·대화 문맥 등 PRD 개념 필드 전체를 처리하는 API는 아직 아니다. 지원하지 않는 제약이 적용됐다고 UI에서 표시하지 않는다.

## 응답과 단위

정상은 HTTP 200이며 `status`가 `ready` 또는 `no_results`이다. `candidates`는 배열로, 0건일 때 빈 배열이다. `mode`, `source_checked_at`, `searched_count`(이번에 읽은 수), `source_total`(공급자가 알린 검색 수)을 포함한다. 현재 서울시 sample은 최대 5개만 읽으므로 전체 지역의 적합 행사가 없다고 단정하지 않는다.

[전체 기록 재생 응답 예시](examples/recommend-response.recorded.json)는 저장된 서울시 응답으로 생성한 자료다. 실시간 조회 결과와 혼동하지 않는다.

| 후보 필드 | 의미·결측 처리 |
|---|---|
| `id`, `title`, `venue` | 안정 ID(`seoul:행사코드`), 제목, 장소 원문 |
| `lat`, `lng` | 위도·경도. 미확인 시 `null`; 임의 좌표로 지도 핀을 만들지 않음 |
| `distance_km` | 출발점 기준 직선거리 km. 이동거리/소요시간 아님. 좌표 미확인 시 `null` |
| `event_start_date`, `event_end_date` | 공급자가 제공한 행사 기간의 날짜 `YYYY-MM-DD`. 운영시간·방문예정일과 구분 |
| `district`, `address` | 공급자 지역명 또는 `null`. 현재 상세 주소는 미제공이므로 `address: null`; 장소명을 주소로 대체하지 않음 |
| `genre`, `opening_info` | 분류 및 운영시간 원문. 운영시간 미확인 시 `null` |
| `fixed_start_at` | 판독 가능한 공연 시작 시각 ISO, 그 외 `null` |
| `price_info`, `fee_type`, `audience` | 요금 원문, 무료/유료 구분, 대상. 미확인 시 `null`; 요금 공란을 0원으로 바꾸지 않음 |
| `official_url` | 서울문화포털 공식 링크. 현재 식별자/링크 손상 시 전체 조회 502 처리하는 한계가 있음 |
| `status`, `checks_required` | 현재 후보는 `check`; 확인할 예약/운영/이동 정보 목록 |
| `source_checked_at` | 공급자 응답 확인 시각. 미래 행사 운영이나 예약 확정 의미 아님 |

`request_kind=route` 또는 `course`일 때 응답에는 기존 이름 **`course`** 객체가 추가된다. `route`라는 응답 필드로 이름을 바꾸지 않았다. UI는 `candidates`로 카드를 구성하고 `course.ids`가 있으면 해당 순서로 코스 장소를 선택한다. `course.status`는 `ready`, `check`, `conflict`, `insufficient`, `unavailable`을 구분한다. `stops`는 확인된 일정에만 포함될 수 있어 존재를 검사해야 한다. `arrive`, `begin`, `finish`는 요청 당일의 한국 시각 `HH:MM`, `walk_min`과 `walk_minutes`는 분이다. 실패 코스 응답을 관람 가능 일정으로 표시하지 않는다.

행사 기간과 지역은 현재 응답에 포함한다. 상세 주소는 아직 없으므로 `venue`를 주소라고 표시하거나 조회 날짜를 행사 시작일로 대신 사용하지 않는다.

## 입력 오류·실패

```json
{
  "status": "need_input",
  "message": "나들이 시간은 최소 1시간 이상으로 설정해 주세요.",
  "code": "minimum_duration",
  "field": "end_at"
}
```

| HTTP / code | 동작 |
|---|---|
| 400 `minimum_duration` | `end_at` 아래 안내. 입력 수정 후 재요청. 문화정보·도보 조회 전에 거절 |
| 400 `invalid_time`, `timezone_required` | 해당 `start_at`/`end_at` 아래 안내 |
| 400 `invalid_time_range` | `end_at` 아래 당일·순서 오류 안내 |
| 400 `invalid_location`, `invalid_coordinate` | `start_location` 또는 `start_location.lat/lng` 확인 |
| 400 `invalid_kind`, `invalid_category` | 해당 선택값 수정 |
| 기타 400 `need_input` | 현재 일부 오류에는 `code`·`field` 없음. `message`를 공통 영역에 표시 |
| 502 `error` | 문화정보 공급자 실패. 입력값을 보존하고 같은 조건 재시도 가능 |
| 404 / 415 | 잘못된 경로/콘텐츠 타입. 현재 HTML 오류 응답이므로 모든 실패가 JSON이라고 가정하지 않음 |

권장 UI 처리: HTTP 성공 여부와 `status`를 확인하고, `field`가 있으면 해당 입력 아래 `message`를 표시한다. 새 입력 오류로 기존 대화·입력을 초기화하지 않는다. 통신 실패와 정상 0건을 구분한다. 개인 점검 화면은 실패·추가 0건·코스 조회 실패 때 이전 카드/선택/코스를 보관하고, ‘이전 조건과 결과로 돌아가기’로 입력 조건까지 복원한다. 최초 0건은 빈 결과 화면으로 구분한다. 요청 취소 이후의 늦은 응답은 무시한다. 새로고침 후 복원이나 팀 최종 UI 통합을 뜻하지 않는다.

## 연결 전 확인

- 서버는 현재 `127.0.0.1`에만 바인딩한다. 다른 PC 접속/배포 주소는 별도 결정해야 한다.
- CORS/OPTIONS는 명시적 허용 origin 설정을 지원한다. 실제 프론트 실행 주소는 아직 확인 전이며 아래 예시를 팀의 확정 포트로 취급하지 않는다. 환경변수 미설정 시 같은 서버의 점검 화면만 사용하고, 다른 origin 요청은 허용하지 않는다.
- 음성 인식은 브라우저 기능이다. 현재 키워드 자동 반영을 AI 조건 대화 완료로 표시하지 않는다.
- 도보/대중교통/음성 파일 엔드포인트는 [기존 실행 안내](team-backend-guide.md)와 [인계 문서](outing-handoff.md)를 참조한다.
- 오프라인 검증: `python -m unittest discover -s backend -q`. 입력 구간 검증: `node utils/scripts/check_input_contract.cjs`(점검 서버 및 기존 Playwright 환경 필요).


## 별도 화면 연결 설정

UI 디자인만 있을 때는 기존 점검 화면으로 백엔드를 검증한다. 프론트 코드가 나오면 동일한 API를 호출하도록 연결한다. 다음은 **프론트가 실제로 localhost:5173에서 실행될 때만** 적용하는 예시다.

```powershell
$env:LAB678_ALLOWED_ORIGINS = "http://localhost:5173"
python backend/preview.py
```

여러 실행 주소는 쉼표로 구분한다. `localhost`와 `127.0.0.1` 및 포트가 다른 주소는 각각 다른 origin이다. 와일드카드, 경로, 계정정보가 든 설정은 허용하지 않는다. 일반 `.env` 파일은 자동으로 읽지 않는다. 설정은 서버를 시작하는 터미널에 적용하고 재시작한다. 기본 서버 주소는 계속 로컬 `127.0.0.1:8765`이며, `--port 8766`처럼 포트를 바꿀 수 있다. 다른 팀원의 PC에서 동조님 PC의 127.0.0.1로 접속하는 방식은 동작하지 않는다. 우선 같은 PC에서 프론트와 백엔드를 함께 실행하거나 별도 배포 주소를 합의한다.

```javascript
const response = await fetch("http://127.0.0.1:8765/preview/recommend", {
  method: "POST",
  headers: {"Content-Type": "application/json"},
  body: JSON.stringify(confirmedConditions)
});
const result = await response.json();
// response.ok와 result.status를 구분하고 400의 field/message를 입력 아래에 표시한다.
```

쿠키/인증 헤더는 필요하지 않으며 `credentials: "include"`를 사용하지 않는다. 허용 origin의 JSON POST 사전 요청은 204, 미허용 origin/메서드/추가 헤더는 403이다. 허용 origin에는 정상·400·502 등 오류 응답에도 CORS 헤더가 붙는다. API 키는 서버에만 두며 브라우저에 전달하지 않는다.

별도 포트 브라우저 검증: `node utils/scripts/check_frontend_connection.cjs`. 테스트용 화면/백엔드를 빈 포트에 띄워 기록 추천·상세 필드·400 오류·미허용 origin 차단을 확인하고 종료한다. 실제 팀 UI 통합 성공을 대신하지 않는다.

## 개인 화면의 제외 적용 시점 (10/31)

`exclude_ids`는 제외 예정/취소 버튼에서 전송하지 않고 사용자가 `코스 다시 만들기`를 누를 때 누적 적용한다. 재생성 결과가 `course.status=ready`인 경우에만 기존 코스를 교체한다. 오류·insufficient·unavailable·check·conflict는 이전 코스/선택을 유지하며 제외 예정 취소 또는 재시도가 가능하다. 서버 계약 변경은 없으며 팀 UI는 이 정책을 별도 연결한다.
