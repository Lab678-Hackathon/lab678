# 대화 조건 처리 코어와 연결 제안

2026-10-31 · 김동조 개발 기록. **코어·Naito 어댑터·HTTP 경로 구현, 실제 AI 고정 예문 검증 완료, 프론트 연결 미완료.** 공통 계약 확정 문서가 아니다.

## 구현한 부분

`backend/chat_conditions.py`는 AI의 구조화 해석 결과를 현재 입력 초안에 합친다. 네트워크 호출, DB, 대화 저장, 추천 실행은 없다. `apply_interpretation`과 `resolve_changes`가 입력 객체를 수정하지 않고 새 결과를 반환한다.

- 이미 확인한 항목 변경은 `conflicts`의 변경 전/후로 표시하고 bool 동의/거절을 받는다. 미응답은 충돌로 남는다.
- 출발지 검색어 변경은 현재 장소 좌표가 있으면 항상 확인한다. 동의하면 이전 좌표를 제거하고 검색 결과를 다시 선택하도록 한다. 모델이 좌표·가격·행사 사실을 반환하면 거절한다.
- `base_revision`과 현재 revision이 다르면 `stale`로 폐기한다. 동의 처리 때도 초안이 달라졌으면 폐기한다.
- 누락 필드는 전체 목록을 반환하되 질문은 첫 필수 항목 하나만 한다. 필수 입력이 모이면 기존 추천 검증으로 최소60분·좌표·시간을 검사한다. 누락 중 시간 필드의 즉각 검증은 기존 프론트 검증을 유지한다.
- `ready_to_search`는 S02a 확인 진행 가능이라는 뜻이다. `requires_final_confirmation`은 항상 true이며 추천 자동 실행을 뜻하지 않는다.
- `route`는 `course`로 정규화한다. 코스 체류시간도 기존 코스 계약에 맞춰 수집한다.

## 입출력 예시 (내부 함수, HTTP 엔드포인트 아님)

```python
result = apply_interpretation(
    draft=current_conditions,
    proposal={"category": "국악"},  # AI가 "국악을 듣고 싶어"를 해석한 결과
    confirmed_fields=["category", "start_location", "start_at", "end_at"],
    base_revision=2,
    current_revision=2,
)
```

기존 `category`가 `전시`였다면 초안은 그대로 유지되고 다음 충돌이 생긴다.

```json
{"field":"category","before":"전시","after":"국악"}
```

사용자 선택을 `resolve_changes(result, {"category": true}, current_draft, current_revision)`로 전달한다(Python에서는 `True`). 거절은 false, 선택하지 않은 항목은 키를 생략한다. 변경 동의 결과도 최종 추천 승인이 아니다.

모델 해석의 허용 필드: `start_query`(최대80자), `start_at`/`end_at`(시간대 포함 ISO), `category`(기존 단일 분류), `request_kind`(place/course/route), `stay_minutes`(1~240 정수). null은 변경 없음이다. 상대 날짜·모호한 시각 해석의 정확도는 실제 공급자 연결 후 따로 평가한다.

반환 필드: `status`, `base_revision`, `assistant_text`, `updated_condition_draft`, `missing_fields`, `field_errors`, `conflicts`, `ready_to_search`, `requires_final_confirmation`. stale 응답에는 status/revision/ready만 있으므로 초안을 덮어쓰면 안 된다.

## HTTP 구현 계약 · 프론트 연결 합의 전

`POST /preview/chat`, JSON, 기존 서버의 origin/CORS 규칙을 그대로 따른다. 기존 추천/검색 API 동작은 바꾸지 않는다. 앱 모델은 사용자 지정 `claude-sonnet-4`이며 [Naito 사용 안내](naito-usage.md)를 따른다.

```json
{
  "message": "국악을 듣고 싶어",
  "condition_draft": {},
  "confirmed_fields": [],
  "revision": 0,
  "conversation_context": []
}
```

message는 1~1000자, conversation_context는 최근 최대6개 `{role: user/assistant, content: 문자열}`(각1~1000자), 전체 HTTP 요청은 기존 상한8192바이트다. revision은 음수가 아닌 정수. 한국 현재 시각은 서버가 제공한다. 성공은 위 내부 결과에 `source: naito`, `model: claude-sonnet-4`를 추가한다. 지원하는 변경을 추출하지 못하면 `interpretation_status: no_supported_change`, ready=false이며 반영 실패를 안내한다.

로컬 팀 화면 연결 모듈은 시각을 아직 입력하지 않은 경우에도 선택한 날짜를 전달하기 위해 `condition_draft.date: YYYY-MM-DD`를 추가한다. date는 해석 맥락이며 모델의 허용 변경 필드/confirmed_fields에는 포함하지 않는다. 최종 추천에는 기존 start_at/end_at을 사용한다. [화면 연결 인계](chat-ui-handoff.md)를 참고한다.

| HTTP | code / 상태 | 프론트 동작 |
|---|---|---|
| 200 | draft / needs_confirmation | revision 비교 후 초안 또는 변경 전후 표시 |
| 400 | invalid_message / invalid_context / invalid_draft | 입력·대화 보존, 해당 필드 확인 |
| 503 | ai_not_configured | 직접 입력 유지, 서버 키 설정 확인 |
| 429 | ai_busy / ai_provider_error | 현재 값 보존, 재시도 버튼 |
| 504 | ai_timeout | 현재 값 보존, 재시도 버튼 |
| 502 | ai_provider_error / ai_network / ai_invalid_response | 현재 값 보존, Mock 자동 대체 금지 |

`confirmed_fields`는 클라이언트가 관리한다. 서버는 대화를 저장하지 않으며 요청에 담긴 revision을 반환할 뿐, 브라우저의 최신 입력을 알 수 없다. 응답 적용 직전 revision 비교가 필수다. 변경 동의/거절 HTTP 경로는 만들지 않았으며 프론트가 명시적 선택을 초안에 반영하고 revision을 올리는 방식은 담당자 확인 대상이다. Python `resolve_changes`는 이 처리의 검증 가능한 참조 구현이다.

## 프론트 연결 제안 — 아직 미확정

1. STT 종료 또는 텍스트 전송 시 문장과 현재 초안/revision을 전달한다. STT 인식 문장을 수정할 수 있게 보존한다.
2. 모델은 조건 해석만 한 번 수행한다. 현재 날짜/시간대와 제한된 대화 맥락을 제공하되 장소·가격·시간 사실은 생성하지 않는다.
3. 허용 필드 검증 후 코어로 병합한다. 장소명은 기존 `/preview/places`로 검색하고 사용자가 선택한 좌표만 사용한다.
4. 클라이언트는 요청 이후 직접 입력·새 발화·동의·거절마다 revision을 올린다. 응답 적용 직전에도 현재 revision과 비교한다. 이 코어만으로 브라우저의 늦은 응답을 막을 수는 없다.
5. 변경 동의/거절은 화면에서 명시적으로 처리한다. 추천은 S02a 최종 확인 후 기존 `/preview/recommend`를 호출한다.

위 HTTP 경로·대화 길이·오류 형식은 개인 백엔드 구현이며 프론트 담당과 확인 후 사용한다. 팀 프론트는 이번 작업에서 변경하지 않았다.

복수 관심사·예산·걷기·제외/기존 일정 요구는 유지한다. 이번 코어의 허용 필드는 첫 통합용 부분집합이며, 나머지 요구를 반영했다고 표시하면 안 된다. 해당 값을 잃지 않는 전달 형식도 후속 계약 대상이다.

## 검증 및 미실시

`python -m unittest discover -s backend -p 'test_*.py'`: 60개 PASS(기존42개 + 조건 코어10개 + 공급자7개 + HTTP 처리기1개). 모의 해석 결과로 조건 변경, 동의·거절·미응답, 이전 좌표 제거, 늦은 응답, 직접 수정 우선, 59/60분, 사실 필드 거절, 공급자 오류를 검증했다.

사용자 저장 키로 실제 고정 예문 3개(국악·장소/날짜/시각·확정시각 변경)가 PASS. 실행 서버를 재시작하고 `/preview/chat` 실호출 HTTP200 및 프론트5173 CORS도 확인했다. OpenAI 호환 경로의 키 권한 오류를 확인해 Anthropic `/v1/messages`로 수정했다. 모델은 claude-sonnet-4를 유지한다. 결과는 [실제 예문 기록](examples/naito-chat.live.json)에 있다.

STT 자동 전송, 팀 화면의 충돌 UI, 대화 응답 TTS, 일반적인 자유대화 품질은 **미실시**. Render 인증/배포는 사용자 요청으로 보류. 키 값은 공유 문서/테스트 결과에 기록하지 않았다.

`python utils/scripts/check_chat_api.py`: 임시 로컬 서버에서 503 미설정·400 입력·204 CORS·200 모의 해석 4구간 PASS. 최초 제한된 환경의 소켓 연결이 거절되어 허용된 실행으로 재검증했다. 기존 장소 테스트의 HTTPError 정리 ResourceWarning이 출력되지만 60개 검사는 모두 통과했다.
