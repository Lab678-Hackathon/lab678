# 출발지 검색과 첫 프론트 연결 안내

2026-10-31 · 동조 백엔드 현재 구현. 희영님이 요청한 출발지 좌표 검색을 지원한다. **팀 최종 화면 연결은 아직 하지 않았다.** 공용 기획은 수정하지 않았다.

## 실행과 연결 순서

백엔드 저장소 루트에서:

```powershell
$env:LAB678_ALLOWED_ORIGINS = "http://127.0.0.1:5173"
python backend/preview.py
```

프론트는 별도 터미널에서 `cd frontend` 다음 `python -m http.server 5173`로 실행한다. 백엔드 기본 주소는 `http://127.0.0.1:8765`, 프론트는 `http://127.0.0.1:5173/`이다. 두 서버는 우선 같은 PC에서 실행한다. Python 실행명이 python3인 환경은 이를 사용한다.

카카오 REST 키는 백엔드 환경변수 `LAB678_KAKAO_REST_API_KEY` 또는 Git 제외 파일 `.local/transit.env`에 둔다. 기존 대중교통 검증에 사용한 키 로더를 재사용한다. 일반 `.env`는 자동으로 읽지 않는다. **장소 검색에는 JavaScript 키가 아닌 REST 키를 사용하며, 브라우저 코드에 REST 키를 넣지 않는다.** 로컬 파일은 Git에 없으므로 다른 PC/Render에서는 해당 환경변수를 별도 설정한다.

첫 연결 순서:

1. S02에서 장소명/주소를 입력하고 검색한다. 검색할 때 검색어가 카카오에 전달된다.
2. 결과의 장소명·주소를 보고 사용자가 출발지를 선택한다. 첫 결과를 자동 확정하지 않는다.
3. 선택한 `label`, `lat`, `lng`를 추천 요청의 `start_location`으로 보관한다.
4. S02a에서 출발지·시작/종료 시각·분류를 확인하고 `POST /preview/recommend`를 호출한다.
5. S03은 `candidates[]`, S04는 선택한 후보의 같은 `id`와 사실 필드를 사용한다. 상세 전용 API는 현재 없다.

출발지 텍스트를 다시 수정하면 이전 선택 좌표를 무효화하고 재선택을 요청한다. 입력 변경 뒤 도착한 이전 검색 응답은 버전/AbortController로 무시한다. 정상 0건과 조회 실패를 구분하고, 실패할 때 입력을 지우지 않는다. 이 동작은 프론트 연결 지침이며 팀 화면 구현 완료를 의미하지 않는다.

## 검색 요청·응답

`POST /preview/places`, `Content-Type: application/json`.

```json
{"query":"청량리역","type":"keyword"}
```

주소 검색은 `{"query":"서울 중구 세종대로 110","type":"address"}`. `query`는 앞뒤 공백 제거 후 1~80자, 제어문자는 허용하지 않는다. `type` 생략 시 `keyword`; 지원 값은 `keyword`/`address`다. 공급자에 최대 5건을 요청하고 페이지 추가 조회는 지원하지 않는다.

실제 조회 결과 중 한 건:

```json
{
  "id": "kakao:keyword:8088565",
  "label": "청량리역",
  "lat": 37.57997010526071,
  "lng": 127.04773632414528,
  "address": "서울 동대문구 전농동 591-92",
  "road_address": "서울 동대문구 왕산로 214",
  "official_url": "http://place.map.kakao.com/8088565",
  "type": "keyword"
}
```

| 응답 | 의미 |
|---|---|
| `status` | `ready` 또는 정상 0건인 `no_results` |
| `places[]` | 선택 가능한 후보. `id`, `label`, 숫자 `lat`/`lng`, `type` 필수 |
| `address`, `road_address`, `official_url` | 공급자 미제공/사용 불가 시 `null`. 주소 검색의 official_url은 null |
| `source` | `kakao_local` |
| `source_total` | 공급자가 알려준 전체 결과 수. 반환 배열 길이와 다를 수 있음 |
| `skipped_count` | 이번 최대 5건 중 좌표/식별 정보 손상으로 제외한 수 |
| `source_checked_at` | 한국 시각 기준 조회 시각 |
| `message` | 선택/0건 안내 |

카카오의 `x`는 경도(`lng`), `y`는 위도(`lat`)다. 좌표가 손상된 결과는 선택 목록에서 제외한다. 결과 전체가 손상됐으면 정상 0건으로 바꾸지 않고 502를 반환한다. 주소 후보 ID는 주소와 좌표로 만든 파생 식별자이며 카카오 원본 장소 ID가 아니다.

완전한 실제 요청·응답 파일(2026-10-31 14:22 KST 조회):

- [장소명 검색](examples/place-search.keyword.live.json), [주소 검색](examples/place-search.address.live.json)
- [선택한 출발지 → 실제 국악 추천](examples/recommend-selected-place.live.json)
- [동일 출발지 → 실제 코스 응답](examples/course-selected-place.live.json)

파일의 `request`가 실제 요청 본문, `http_status`는 HTTP 상태, `body`가 실제 응답이다. 공개 장소를 사용한 검증 스냅샷이며 사용자 검색 이력을 수집하는 기능은 없다.

## 오류와 화면 처리

| HTTP | status / code | 처리 |
|---|---|---|
| 200 | `no_results` | 빈 places. 다른 장소명/주소로 검색 |
| 400 | `need_input` / `invalid_query`, `invalid_search_type` | `field`와 `message`를 해당 입력 아래 표시 |
| 503 | `unconfigured` / `search_unconfigured` | 서버 키 설정 필요 |
| 503 | `unavailable` / `search_permission` | 서버 키/API 권한 확인 필요 |
| 429 | `limited` / `search_busy`, `search_quota` | 잠시 뒤 사용자 재시도. 자동 무한 재시도 금지 |
| 504 | `timeout` / `search_timeout` | 입력 유지하고 재시도 안내 |
| 502 | `unavailable` / `search_failed` | 네트워크/공급자 응답 실패. 정상 0건과 구분 |
| 403 | `forbidden` | 허용 origin 확인. 미허용 프론트에서는 CORS 때문에 응답을 읽지 못할 수 있음 |

서버는 동시 외부 검색을 최대 2개, 공급자 요청 timeout을 6초로 제한한다. 키와 공급자 예외 원문은 응답/로그에 출력하지 않는다. 공통 HTTP 처리기의 잘못된 경로/콘텐츠 타입 등은 HTML 오류일 수 있으므로 JSON 파싱 실패도 처리한다.

## 추천·코스 계약과 배포 방식

[추천 계약](recommend-api.md)이 전체 기준이다. `request_kind: place`와 `course` 모두 **POST /preview/recommend**를 사용한다. `route`도 코스 호환값이다. 코스는 `stay_minutes`(1~240 정수)가 추가로 필요하며 응답에 `course` 객체가 붙는다. 관람 가능 여부는 HTTP 200만 보고 판단하지 않고 `course.status`를 읽는다. 이번 실제 코스는 `conflict`였으며 `stops`가 없다. 불가능한 코스를 확정 일정으로 표시하지 않는다.

최소 60분은 **end_at - start_at**이다. 59분은 400 `minimum_duration`, 정확히 60분은 허용한다. 도보 최대시간이나 왕복 기준이 아니다.

통신은 이미 구현된 **백엔드 CORS 허용목록**을 사용한다. Render 환경변수 `LAB678_ALLOWED_ORIGINS`에 실제 Vercel 프론트 origin을 추가하고, 프론트 API 기본 주소를 실제 Render HTTPS 주소로 설정한다. 추가 Vercel 프록시를 전제로 하지 않는다. 와일드카드나 credentials는 사용하지 않는다. 실제 두 배포 주소가 아직 없어 배포 간 통신은 미검증이다.

현재 `category`는 한 개다. 기획의 10/31 추가 공지로 **첫 통합은 대표 관심사 1개로 검증**하는 기준을 수신했다. 복수 관심사 요구는 유지하며 복수 관심사/걷기 선호/AI 음성 조건 추출 구현은 남아 있다. 걷기 선호는 미적용 상태를 표시하고 충족으로 단정하지 않는다. 출발지 미확정 때 임의 기본 좌표를 사용하지 않으며 API 실패를 Mock 후보로 자동 대체하지 않는다. 음성 연결은 입력→추천 첫 연결 이후 처리한다. 나머지 선택의 보존·다중 필드 최종 계약은 추가 합의 대상이다.

## 검증 범위

- 백엔드 42개 테스트 통과: 검색 입력/좌표 축/null/정상 0건/권한/쿼터/timeout/키 숨김과 기존 추천 검증 포함.
- 실제 카카오 장소명 5건·주소 1건, 선택한 좌표로 실제 서울시 국악 2건 및 코스 `conflict` 응답 확인.
- 5173 임시 브라우저 페이지 → 8765 백엔드: 실제 검색/추천의 CORS, 읽을 수 있는 400 오류, 미허용 origin 403 확인. 59/60분 경계는 기록 재생 데이터로 검증.
- 재사용 검사: `node utils/scripts/check_place_search.cjs`. Playwright/Chromium 환경과 REST 키, CORS 설정된 서버, 비어 있는 5173 포트 필요. `--write-examples`는 고정 공개 사례의 예시 파일을 갱신한다.
- 첫 브라우저 검사는 문서만 가로채 주입한 테스트 환경에서 fetch 실패. 실제 임시 HTTP 서버를 띄운 뒤 동일 API 연결이 통과했다. 운영 서버 CORS를 완화하지 않았다.
- **미실시:** feature/front의 실제 S02/S02a/S03/S04 연결, 실제 Vercel↔Render, 모바일 시연. 개인 점검 화면에 검색 UI를 추가하지 않았으며 백엔드 연결 준비에 집중했다.

공식 참조: [카카오 로컬 API 개발 가이드](https://developers.kakao.com/docs/ko/local/dev-guide).
