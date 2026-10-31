# 키 없는 이동 안내 방식 대조 · 2026-10-31

사용자 제공 타 앱 설명은 구현·실측의 증거가 아닌 검토 자료다. 실제 seoulVenues.ts/recommendationEngine.ts/S08_DirectionsModal.tsx 원본이나 20곳의 검증 이력은 전달받지 않았다. 이번 범위는 조사·기록이며 서비스 코드 변경 없음.

## 단계 체크표

- [x] 현행 walking.py/outing.py/transit.py 및 이전 검토 확인.
- [x] Valhalla 데이터·GTFS·공개 서버 정책과 OTP·카카오 무료 조건·서울시 승강기 자료 확인.
- [x] 현재 공개 서버의 서울 대중교통 경로/가용성 직접 조회.
- [x] 다른 앱 설명의 추정·실측·정적 데이터·실시간 기능 구분.
- [x] 적용 제안·한계·상태·색인·전체 보고문 기록.

## 실제 조회 근거

현재 backend/walking.py는 https://valhalla1.openstreetmap.de/route 에 pedestrian 요청, 상세 안내에는 language=ko-KR와 directions_type=instructions를 사용한다. course.py는 sources_to_targets의 초 단위 행렬을 쓴다. outing.py:distance_km은 하버사인 대권거리이며 후보 카드의 직선 km/정렬 전용이다.

동일 공개 서버에서 출발 청량리역(37.5805961,127.0482573), 도착 돈화문국악당(37.5772502822,126.9907306641), 2026-10-31T14:00, costing=multimodal로 1회 요청:

```json
{"error_code":170,"error":"Locations are in unconnected regions. Go check/edit the map at osm.org","status_code":400,"status":"Bad Request"}
```

/status 조회는 version=3.9.1-f221535, available_actions에 transit_available 포함. 액션 제공 여부가 서울 시간표 탑재를 뜻하지 않는다. 두 장소 radius=1000으로 /transit_available 1회 요청:

```json
[{"input_lat":37.580596,"input_lon":127.048257,"radius":1000,"istransit":false},{"input_lat":37.57725,"input_lon":126.99073,"radius":1000,"istransit":false}]
```

이 결과로 서울 전체/모든 Valhalla 서버의 대중교통 불가능을 단정하지 않는다. 현재 서버·두 지점에서 단순 모드 변경으로 쓸 수 없음이 확인된 범위다. 사용자 개인 위치가 아닌 공개 장소 좌표만 사용했다.

## 판정·적용 제안

- 하버사인: 대권거리. 도로망·역 접근·환승을 모르는 식으로 실제 경로/정확한 이동시간을 만들 수 없다.
- 정적 장소 안내: 출처/확인일/역/개별 출구/엘리베이터 연결 층/가동 상태/목적지 실제 입구를 구분하면 유용하다. 예시의 3분 대 4·6분과 출구 기준은 확인 필요.
- barrierFree boolean만으로 전체 경로를 안전/무장애라고 표시하지 않는다. 미확인은 false 또는 true로 추정하지 않고 unknown으로 기록한다.
- 속도/대기 버퍼가 누락되어 다른 앱의 수치 재현 불가. 우리 도보도 실측 시간이 아니라 엔진 예상치다. 현재 walking_speed를 별도 지정하지 않아 공식 기본속도 5.1km/h 기준이며, 시니어 맞춤 검증은 하지 않았다.
- TTS/AR 화살표/4단계 화면/외부 지도 링크는 경로 계산 정확도를 증명하지 않는다. 실시간 위치 추적·도로 매칭·진행 방향·이탈 재탐색 검증 없이 턴바이턴 완성으로 표현하지 않는다. 네이버 링크만으로 모든 플랫폼에서 GPS 내비게이션이 시작된다고 단정하지 않는다.
- 상용 API마다 인증/무료쿼터/제한이 다르며 유료·IP·도메인 설정이 모두 필수라는 일반화는 부정확하다. 서버 REST 데이터와 지도 SDK/제공사 화면을 구분한다.
- 해커톤 제안: 도보 유지 + 출처 있는 목적지 접근 안내 + API 실조회 또는 사전 검증된 제한 시연 구간 + 간결한 단계·음성. 수식 추정은 탐색 참고용이며 행사 도착/무장애 충족의 확정 근거로 쓰지 않는다.
- 장기 선택: OSM+GTFS 기반 Valhalla/OTP 직접 운영. 외부 유료 키 없이 가능하나 한국 데이터 사용 조건·갱신 주기·범위·운영 비용을 검증해야 한다. 이번에는 구축하지 않는다.

## 출처

- [Valhalla 공개 서버·사용 정책](https://valhalla.github.io/valhalla/)
- [Valhalla OSM/GTFS 설명](https://valhalla.github.io/valhalla/api/)
- [도보 속도·경로 API](https://valhalla.github.io/valhalla/api/route/api-reference/)
- [대중교통 가용성 API 원문](https://github.com/valhalla/valhalla-docs/blob/master/transit-available/api-reference.md)
- [OTP 데이터 구성](https://docs.opentripplanner.org/en/latest/Data-Sources/)
- [서울시 승강기 가동현황](https://data.seoul.go.kr/dataList/OA-15994/S/1/datasetView.do)
- [카카오 무료/유료 이용 조건](https://developers.kakao.com/docs/ko/kakaomap/common)
- [카카오 쿼터](https://developers.kakao.com/docs/ko/getting-started/quota)

재현 명령 의미: JSON POST /route(costing multimodal, date_time type 1) → JSON POST /transit_available(locations 위경도와 radius). 각 요청에 X-Client-Id:lab678-local-preview 사용. 오류 응답은 코드 성공으로 바꾸지 않았다.
