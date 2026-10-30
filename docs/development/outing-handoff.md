# 동조 개발용 추천 인계 초안

## 데이터 근거

2026-10-31 06:27:57 KST. 서울특별시 서울문화포털 culturalEventInfo 공개 sample로 같은 날의 전시 5/8건, 전체 분류 5/41건을 조회했다. 앞 5건 범위에서만 순위를 계산한다. 기록에는 확인에 필요한 필드만 담았다. 공식 응답의 상세 URL에서 cultcode를 추출해 카드·핀 식별자로 쓴다. 무료 분류(IS_FREE)와 요금 상세(USE_FEE)는 별개다. [서울시 데이터와 이용 조건](https://data.seoul.go.kr/dataList/OA-15486/A/1/datasetView.do) · [실제 응답 발췌](examples/seoul-events.capture.json)

| 행사 ID | 공식 응답 중 점검할 사실 | 화면 기준 |
|---|---|---|
| 159808 | 김영재 개인전, USE_FEE가 0원, IS_FREE가 무료 | 두 정보를 그대로 표시 |
| 159829 | IMPRINTS OF TIME, USE_FEE 빈 값, IS_FREE가 무료 | 무료 분류는 표시하고 상세 금액은 미확인 |

청량리역 대표 좌표는 37.5805961, 127.0482573이다. 역 출입구나 실제 사용자의 GPS 위치는 별도로 확인한다. [© OpenStreetMap contributors, 청량리역](https://www.openstreetmap.org/node/3436803670) · [ODbL](https://www.openstreetmap.org/copyright) · [대표 요청](examples/outing-request.json)

## 재현과 인계

1. 저장소 루트에서 `python backend/preview.py`로 시작하고 [점검 화면](http://127.0.0.1:8765/)을 연다. 대표 입력을 제출하거나 출발 좌표·시간·분류를 바꾼다.
2. 개인 검증용 `POST /preview/recommend`는 JSON [대표 요청](examples/outing-request.json)을 받는다. `mode`는 기본 live이며 recorded를 지정하면 보관한 응답을 사용한다. [기록 재생 결과](examples/outing-response.json)의 candidates에서 id로 선택을 유지한다.
3. HTTP 200의 ready 또는 no_results, 잘못된 입력 HTTP 400의 need_input, 공급자 오류 HTTP 502의 error를 구분한다. 예시는 `{"status":"no_results","candidates":[]}` (200, 필드 발췌), `{"status":"error","message":"문화정보 조회에 실패했습니다. 같은 조건으로 다시 시도해 주세요."}` (502)다.
4. Edge 모바일 화면 크기에서 실시간 조회·기록 재생·선택·입력 보존·분류 변경·모의 통신 장애 표시를 확인했다. [백엔드 테스트](../../backend/test_outing.py)와 [화면 점검 도구](../../utils/scripts/check_outing_ui.cjs)로 반복할 수 있다. 실제 모바일 기기와 팀 최종 UI는 별도 검증한다.

## 지도 시연

개인 점검 화면은 [Leaflet](https://leafletjs.com/examples/quick-start/)과 [OpenStreetMap 배경지도](https://operations.osmfoundation.org/policies/tiles/)를 쓴다. 팀 지도 제공사 선택은 열어 둔다. 카드·핀은 같은 행사 ID로 강조하며 숫자는 거리순 카드 번호다. 위치가 없는 항목은 카드로만 표시한다. 지도 스크립트를 차단한 Edge에서도 카드 선택이 유지되는지 점검한다.

## UI 담당자 검토 항목

개인 검증용 요청은 출발지 이름·확인한 좌표, 날짜를 포함한 시작·종료 시각, 분류를 받는다. 장소 ID·이름·위경도·행사시간 원문·요금 분류·요금 상세·공식 URL·조회시각을 카드와 지도에서 함께 사용한다. 결측은 null로 표시한다. 형식과 상태는 첫 UI 연결 전에 민규·희영과 확인한다.

제공자 응답에서 INFO-000과 INFO-200(검색 결과 없음)을 구분하고 그 밖의 오류는 재시도로 안내한다. 날짜·분류 필터와 실제 이동시간 검증을 분리한다. 서버·화면에서 기록 재생 여부와 조회 범위를 표시한다.

## 한국어 음성 점검

한 번 말하기 → 문장 확인·수정 → 분류 반영 → 추천 → 카드 선택 → 선택한 행사 읽기. 개인 검증은 명확한 분류 1개만 적용한다. 위치·시간은 폼에서 확인한다. 목록에 없는 조건과 부정 표현은 직접 선택하도록 안내한다. 재추천 후 돌아가도 메모가 유지된다. 시연 기기에서 마이크 허용·한국어 실제 전사·읽기 발음과 출력 여부를 각각 기록한다.

### KONNECT와 화면 대응

참조 커밋 932032b의 study/02-code-index.md, frontend/css/tokens.css, frontend/css/app.css, frontend/js/components/result-card.js에서 청록색 선택, 번호 핀, 가로 카드, 별도 확인 배지를 확인했다. 개인 구현은 시니어 가독성을 위해 본문·버튼을 키우고 지도 위/카드 아래 배치와 단일 홈 진입을 적용했다. 추천 후보의 거리 단위는 직선 km다. 카드의 상태·읽기 문장은 같은 실제 데이터에 연결한다.
