# 동조 개발용 추천 인계 초안

## 데이터 근거

2026-10-31 06:27:57 KST. 서울특별시 서울문화포털 culturalEventInfo 공개 sample로 같은 날의 전시 5/8건, 전체 분류 5/41건을 조회했다. 앞 5건 범위에서만 순위를 계산한다. 기록에는 확인에 필요한 필드만 담았다. 공식 응답의 상세 URL에서 cultcode를 추출해 카드·핀 식별자로 쓴다. 무료 분류(IS_FREE)와 요금 상세(USE_FEE)는 별개다. [서울시 데이터와 이용 조건](https://data.seoul.go.kr/dataList/OA-15486/A/1/datasetView.do) · [실제 응답 발췌](examples/seoul-events.capture.json)

| 행사 ID | 공식 응답 중 점검할 사실 | 화면 기준 |
|---|---|---|
| 159808 | 김영재 개인전, USE_FEE가 0원, IS_FREE가 무료 | 두 정보를 그대로 표시 |
| 159829 | IMPRINTS OF TIME, USE_FEE 빈 값, IS_FREE가 무료 | 무료 분류는 표시하고 상세 금액은 미확인 |

청량리역 대표 좌표는 37.5805961, 127.0482573이다. 역 출입구나 실제 사용자의 GPS 위치는 별도로 확인한다. [© OpenStreetMap contributors, 청량리역](https://www.openstreetmap.org/node/3436803670) · [ODbL](https://www.openstreetmap.org/copyright) · [대표 요청](examples/outing-request.json)

## UI 담당자 검토 항목

개인 검증용 요청은 출발지 이름·확인한 좌표, 날짜를 포함한 시작·종료 시각, 분류를 받는다. 장소 ID·이름·위경도·행사시간 원문·요금 분류·요금 상세·공식 URL·조회시각을 카드와 지도에서 함께 사용한다. 결측은 null로 표시한다. 형식과 상태는 첫 UI 연결 전에 민규·희영과 확인한다.

제공자 응답에서 INFO-000과 INFO-200(검색 결과 없음)을 구분하고 그 밖의 오류는 재시도로 안내한다. 날짜·분류 필터와 실제 이동시간 검증을 분리한다. 서버·화면에서 기록 재생 여부와 조회 범위를 표시한다.
