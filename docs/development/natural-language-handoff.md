# 자연어 자동 설정·추천 연결

2026-10-31 · 동조 개인 백엔드와 팀 화면 복사본에서 구현·검증. **팀 frontend 원본과 공용 plan 미변경, 공통 계약 확정 전 인계안**이다.

## 사용할 흐름

[로컬 대화 화면](http://127.0.0.1:5174/?mode=recorded&debug=1#/search)에서 “음악을 듣고 싶어” → “골고루”처럼 말하거나 입력한다. AI가 음악의 세 분류를 잡고, 필요한 다음 조건 하나를 묻는다. 명확한 장르를 이미 말했으면 재질문하지 않는다. 출발지·시간 등 여러 정보를 한 번에 말해도 함께 반영한다.

“전시만, 오후 2시부터 5시까지, 무료만, 예고를 빛낸 사람 전시는 빼줘”는 분류·시간·무료·제외를 자동 설정한다. 출발지는 검색 결과를 사용자가 선택해야 하며 좌표를 AI가 만들거나 임의 선택하지 않는다. 최종 조건 확인 후 추천한다. 초안 변경에는 반복 동의를 요구하지 않고 S02a에서 확인한 값만 변경 동의를 받는다.

이 주소의 AI는 실제 Naito `claude-sonnet-4`, 행사 추천은 10/31 **기록 재생**이다. 실시간은 URL에서 `mode=recorded`를 제거한다. 지원하는 기록이 없는 날짜/분류는 실시간으로 몰래 대체하지 않는다.

## 추가 필드 · 기존 단일 분류 요청 호환

`POST /preview/chat`의 `condition_draft`와 `POST /preview/recommend` 최상위에 선택 필드를 추가한다. 기존 필수 필드/오류 형태는 유지한다. 모델은 조건만 해석하며 행사 사실은 서울시 원문과 코드가 정한다.

| 필드 | 값 | 처리 |
|---|---|---|
| categories | 지원 분류 목록 | 분류별 조회·합침. `전체`는 단독 사용. 있으면 category보다 우선한다. UI는 category를 첫 항목과 동기화한다. |
| music_followup | true/false | 음악의 장르를 좁힐 질문. “골고루”면 false로 종료. true 동안 추천 실행 차단. |
| free_only | true/false | 공개 무료 또는 명시된 0원만 허용. |
| budget_krw | 0~1000000 정수 또는 `any` | **1인 관람료** 상한. 교통비/총 나들이 예산 아님. `any`는 제한 해제. |
| keywords | 문자열 목록 | 공식 제목·장소·장르·지역에 포함된 관심어를 우선 정렬. 의미 검색/새 사실 추론 아님. |
| exclude_terms | 문자열 목록 | 같은 공식 텍스트에 해당 단어가 있으면 제외. 0건이어도 제외 후보를 복원하지 않음. |
| walking_preference | short/any | short는 직선 근접성 우선. **실제 최소 보행·계단 없음 보장 아님**을 표시. |
| indoor_outdoor | indoor/outdoor/any | 기록·표시하지만 데이터 미확인으로 선별 미적용. |
| unsupported_requirements | 문자열 목록 | 도보 N분 이내/계단 없음/실내만 등 미검증 필수 제약. 확인 질문, 추천은 400 `unsupported_constraint`. 사용자 명시 해제 전 유지. |

목록은 최대8개, 항목 최대80자. null은 변경 없음, 빈 목록은 목록 해제(categories 제외), false/any는 명시 해제다. `category` 충돌의 `related`에는 categories/music_followup이 함께 들어간다. 동의 시 함께 적용하고 거절 시 모두 보존해야 한다.

```json
{
  "request_kind": "place",
  "start_location": {"label":"청량리역","lat":37.5805961,"lng":127.0482573},
  "start_at": "2026-10-31T14:00:00+09:00",
  "end_at": "2026-10-31T17:00:00+09:00",
  "category": "전시", "categories": ["전시"],
  "free_only": true, "exclude_terms": ["예고를 빛낸 사람"],
  "walking_preference": "short", "mode": "recorded"
}
```

응답의 기존 candidates에 `matched_keywords`, `preference_reasons`를 추가한다. 최상위 `applied_preferences`, `queried_categories`, `excluded_count`, `unknown_price_count`, `preference_notes`, `coverage_note`가 실제 적용 내용/제한을 설명한다. 미확인/복수 좌석/할인 조건의 가격은 한도 충족으로 간주하지 않고 제외한다. 0건은 status=no_results이며 조건을 자동 완화하지 않는다. 한 분류 조회가 실패하면 부분 결과를 완전한 성공으로 표시하지 않고 기존 공급자 오류로 반환한다.

## 프론트 연결 지점

현재 `feature/front` 164cd40 기준의 격리 실행기만 확장했다. 원본 변경 전 희영님 확인이 필요하다.

1. `backend/team_chat.js` → 팀 모듈 `js/dj-chat.js`, `backend/team_preferences.js` → `js/dj-preferences.js`로 통합한다.
2. `search.js`에서 `withPreferences`, `renderPreferenceSummary`를 import한다. S02a 확정 요청을 만들 때 `state.confirmed = withPreferences(request)`로 복사한다. 이 시점의 확인값을 보호 대상으로 기록한다.
3. S02a 렌더에서 `renderPreferenceSummary(r)`로 **실제로 전송할** 추가 조건/미적용 선호를 표시한다. 이후 API가 state.confirmed를 그대로 전송한다. 요청 시점에 새 초안 값을 덧씌우면 안 된다.
4. S03에서 결과의 선호/한계를 표시한다. 현재 모듈은 `renderResultPreferences()`로 연결한다. 실제 UI 디자인은 담당자에게 인계한다.

격리 서버는 search.js의 두 연결 지점을 응답에서만 바꾸고 디스크 원본은 보존한다. 해당 지점이 바뀌면 HTTP409로 중단하므로 최신 프론트 통합 때 재검토해야 한다.

## 검증 및 제한

- 백엔드 70개 PASS: 최소60분 기존 회귀, 음악 탐색/확정 변경 동의, 복수 조회·ID 중복 제거, 단일 소스 실패, 미확인 가격, 명시 제외 0건, 선호 정렬, 지원 못하는 필수 제약. 로컬 HTTP 4검사 PASS(공급자 모의).
- 실제 Naito 3회 → 음악/골고루/복합 수정 → 자동 설정 → recorded 추천 4건 → 상세 ID 일치 PASS. 선택 카테고리를 직접 누르지 않고 진행했다.
- 실제 서울시 2026-11-01 14~17시 음악 3분류 조회 HTTP200·후보2건. 추천 가능성 검증이며 예약·공연 운영/교통 확정 검증 아님.
- UI 회귀 5구간 PASS: 실제 AI 변경 동의/거절부터 상세, 모의 지연응답, 모의502 입력 보존, 출발지 재선택, 모의 STT 1회 자동 전송.
- 근거: [자연어 구간 결과](qa-natural/result.json), [조건 확인 캡처](qa-natural/confirmation.png), [결과 캡처](qa-natural/results.png), [채팅 회귀 결과](qa-chat/result.json). 지도 타일 로딩/실제 마이크·스피커는 이번 PASS 범위가 아니다.
- 후보는 여전히 **공개 샘플 분류별 최대5건**이다. 복수 관심사 조회 폭은 늘었으나 서울 전체 후보를 보장하지 않는다. TourAPI/전체 페이지 수집·의미 검색·실제 걷기 선호 판정은 후속이다.
- 팀 코스 화면은 아직 연결 중이라 이 모듈은 place만 실행한다. 실제 OAuth/회원DB·지속 취향 저장·Render 배포는 이번 범위 밖이다.
- 수정 루프: 첫 UI 회귀에서 S02a 확인값 보호 실패 → 이벤트 캡처 뒤 microtask가 팀의 확인 저장보다 먼저 실행됨을 확인 → 실제 요청 확정 함수에서 보호 스냅샷 저장 → 5구간 재검증 PASS. 반복 1회, 추가 무근거 재시도 없음.
