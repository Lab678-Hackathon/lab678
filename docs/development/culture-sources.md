# 서울시 조회 확대와 국문 문화시설 연결

2026-10-31 · 김동조 개인 백엔드 구현. 기존 행사 추천의 요청/카드 구조를 유지하고 선택적 문화시설 조회를 추가했다. 공용 plan·팀 frontend는 수정하지 않았다.

## 서울시

기존 `/preview/recommend`에서 `LAB678_SEOUL_API_KEY`(호환명 SEOUL_OPENAPI_KEY)를 읽는다. 키가 없으면 기존 공개 sample 최대5건, 정식 키가 있으면 분류별 최대100건으로 요청한다. 입력한 키가 실패하면 sample로 몰래 대체하지 않는다. 한 분류 실패를 다른 분류의 완전한 조회 성공으로 표시하지 않는다.

응답에 `source_access: sample/authenticated/recorded`, `fetch_limit_per_category: 5/100`, 실제 `searched_count`와 `source_total`, `coverage_note`를 반환한다. 100건을 넘는 데이터까지 전부 조회하는 페이지 순회는 아직 없다. 기록 재생은 저장된 자료만 사용하며 정식 키 유무로 내용이 바뀌지 않는다.

## TourAPI 국문 문화시설

`POST /preview/culture-places`를 별도로 추가했다. **박물관 등의 상설 장소를 특정 날짜의 전시·공연으로 오인하지 않도록 기존 행사 추천에 자동 혼합하지 않는다.** 팀 화면 연결/추천 통합은 아직 미완료다.

입력은 기존 출발지·시간 조건과 `request_kind: place`, `category: 전체`, 선택 `radius_m`(100~20000m, 기본3000m), `mode: live`다. 복수 categories가 있으면 [전체]만 허용한다. 최소60분 검증은 기존과 같다. 국악/코스/recorded 요청은400이며 임의 대체하지 않는다.

```json
{
  "request_kind":"place", "category":"전체", "mode":"live", "radius_m":3000,
  "start_location":{"label":"청량리역","lat":37.5805961,"lng":127.0482573},
  "start_at":"2026-11-01T14:00:00+09:00", "end_at":"2026-11-01T17:00:00+09:00"
}
```

공식 KorService2의 locationBasedList2(contentTypeId=14, 거리순)에서 최대3곳을 읽고 각각 detailIntro2·detailCommon2를 조회한다. 요청당 최대7회 공급자 호출(목록1+상세6), 최대3개 병렬 상세 작업, API 동시 요청2개, 외부 요청당8초 제한이다. 재시도는 하지 않는다.

- ID `tour:<contentid>`, 이름·주소·위도/경도·운영·휴관·가격·공식 홈페이지를 공급자 응답에서 읽는다.
- `candidate_kind: cultural_facility`, `source: tourapi_kor`, `status: check`로 반환한다. 행사 날짜·공연 시작 시각은 null이다.
- 상세ID 불일치는 실패다. 상세0건은 미확인으로 표시하되 상세 호출 자체 실패는 전체502로 구분한다.
- 공식 응답에 홈페이지가 없으면 null이며 관광지 상세URL을 임의 생성하지 않는다. HTML 응답표기는 평문으로 바꾼다.
- 원문의 무료/0원만 무료로 분류한다. 복잡하거나 누락된 가격은 미확인으로 남기고 예산조건 충족으로 보지 않는다.
- 관심어/무료/예산/제외는 공통 선별을 재사용한다. 실제 운영일·예약·이동시간을 검증한 추천 성공으로 설명하지 않는다.

| 상황 | HTTP / code |
|---|---|
| 키 미설정 | 503 / tour_not_configured |
| 요청 범위 오류 | 400 / culture_scope, culture_mode, invalid_radius 등 |
| 동시 요청 초과 | 429 / culture_busy |
| 제공기관 HTTP 오류 | 502 / tour_provider_error (HTTP429는429) |
| 형식·상세ID·연결 오류 | 502 / tour_lookup_failed |
| 타임아웃 | 504 / tour_timeout |
| 정상 0건 | 200 / status=no_results |

## 설정과 검증

실제 값은 무시된 `.local/culture.env` 또는 서버 환경변수에 둔다. 변수명만 담은 예시는 backend/culture.env.example이다. TourAPI는 LAB678_TOUR_API_KEY(호환명 DATA_GO_KR_SERVICE_KEY), 서울시는 LAB678_SEOUL_API_KEY다. 인코딩된 TourAPI 키는 한 번 해제 후 query 인코딩한다. 키/공급자 URL/원본 오류문을 클라이언트 응답·로그에 넣지 않는다.

`python -m unittest discover -s backend -p 'test_*.py'`: **79개 PASS**, 신규9개는 모의 응답(서울시100/5건 요청·키 오류 무대체, 국문요청/좌표/인코딩, 결측·ID·가격·범위·오류 경계)이다.

`python utils/scripts/check_culture_sources.py`: 실제 서버를 통해 서울시 실조회와 TourAPI 설정 상태를 검사한다. 키가 없으면 TourAPI는503 동작 검사만 수행하고 공급자 실호출은 미실시로 기록한다. 입력은 공개 청량리역, 날짜는 검사일 다음날이다.

초기 실행: 서울시 sample HTTP200, TourAPI 키 미설정503 동작 확인. 이후 사용자가 서울시 키를 저장하여 **정식 키 실조회 HTTP200** 확인: 2026-11-01 전체 분류, source_access=authenticated, 요청 상한100, 원본23건/총23건, 추천후보22건. [실조회 근거](qa-culture/authenticated-check.json). 100건 제한까지 실제100건을 받았다는 뜻은 아니다. 이후 TourAPI 키 저장을 확인하고 실호출했으나 제공기관 HTTP403 `SERVICE_KEY_IS_NOT_REGISTERED_ERROR`로 실패했다. 앱 응답은502 `tour_provider_error`이며 정상0건과 구분한다. [TourAPI 키 검증 근거](qa-culture/tour-key-check.json). 국문 관광정보 서비스 활용 승인 상태·저장 키 일치 여부를 확인해야 하며, 현재 근거만으로 구체 원인이나 승인 반영 시간을 단정하지 않는다. 목록·소개·홈페이지 실제 데이터 검증은 미완료다.

### TourAPI 키 발급 안내

공공데이터포털의 아래 국문 관광정보 서비스 상세에서 로그인 후 활용신청한다. 활용 목적 예시는 “시니어 문화나들이 서비스의 주변 문화시설 검색 및 추천”이다. 신청 후 마이페이지의 OpenAPI 활용신청 현황/개발계정에서 해당 서비스 승인 상태와 일반 인증키를 확인한다. Encoding/Decoding이 함께 보이면 Decoding 값을 `.local/culture.env`의 LAB678_TOUR_API_KEY= 뒤에 저장하면 된다. 이 코드는 인코딩된 키도 한 번 해제 후 요청한다. 서울시 인증키와는 별도이며 이미 공공데이터포털 키가 있어도 해당 국문 서비스 활용 승인은 확인해야 한다.

## 참조 근거

이전 완성본의 분석 색인→공식 문화정보 소스 두 파일을 참고했다. 영문/비동기 HTTP 라이브러리/재시도/기존 설정 전체를 이식하지 않고 국문 고정주소·표준 라이브러리·단일 호출 경계만 구현했다.

- [공공데이터포털 국문 관광정보 서비스](https://www.data.go.kr/data/15101578/openapi.do?recommendDataYn=Y): 공식 페이지의 내장 Swagger에서 KorService2·호출명·좌표X/Y·반경·문화시설14·운영/가격/휴관/홈페이지 필드를 확인했다. 원문은 로컬 검토 자료에 보관했다.
- [서울시 공개 API 안내](https://tv.seoul.go.kr/v/df1e47ef629d4ae09966817924f58f3d): sample 최대5건과 인증키 안내.
- [서울시 문화행사 데이터](https://data.seoul.go.kr/dataList/OA-23041/S/1/datasetView.do): 문화행사 데이터 공식 안내. API 응답 검증과 문서 안내를 구분한다.

사용자 확인: 인증키만 발급받았고 해당 서비스 활용신청은 아직 하지 않았다. 국문 관광정보 서비스 활용신청·승인 후 재검증한다.

## 최신 결과: 활용 승인 후 실조회 성공

2026-10-31 사용자가 승인 상태를 확인한 뒤 재조회 HTTP200. 청량리역 반경3km 문화시설3곳: 배봉산숲속도서관(tour:3456336), 성동책마루도서관(tour:3429640), 성신여자대학교(tour:3448679). 목록·소개·홈페이지를 실제 조회했고 주소/좌표/ID를 확인했다. [실제 응답](qa-culture/tour-live-check.json). 공급자 문화시설 분류를 그대로 사용하므로 모든 결과가 전시/박물관이라는 의미는 아니다.

실응답에서 평문 홈페이지 뒤에 SNS 안내가 줄바꿈으로 붙는 사례를 발견했다. URL 부분만 추출하고 공백을 포함한 href/잘못된 주소는 null로 처리하도록 보완했다. 백엔드80개 PASS 및 재시작 서버 실제 재조회 PASS. 시설3곳 모두 공식 URL 문자열 정규화 확인; 홈페이지 접속/예약 가능 여부 검증은 별도다. 일부 운영시간과 요금은 누락되어 null로 남겼다. 기존 특정날짜 행사 추천이나 팀 화면에 자동 연결하지 않았다. 서울시도 정식키 HTTP200 원본23/후보22 재확인.

## 10/31 추천화면 연결 갱신

사용자 연결 요청에 따라 개인8765와 팀 통합복사본5175에 문화시설 선택·카드/지도·상세를 연결했다. 기존 자동혼합 미실시는 유지하되 선택적으로 같은 /preview/recommend 경로를 이용한다. culture_source=tour 선택 시 기존 문화시설 어댑터로 전달한다. [최신 계약·검증](service-key-status.md). 팀원본/배포는 아직 미반영.
