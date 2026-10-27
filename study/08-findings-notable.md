# 조사 중 발견된 특이점 & 중요 사항 전체 기록
> 생성일: 2026-10-27 | 코드 직접 독해로 발견한 것들만 기록

---

## 🔴 즉시 확인이 필요한 것

### F-01: AGENT_LOOP 기본값 불일치 (config.py vs .env.example vs 주석)
- **`backend/app/config.py`**: `agent_loop: bool = True` (기본값 **True**)
- **`.env.example`**: `AGENT_LOOP=false` (기본값 **false**)
- **`agent_loop.py` 상단 주석**: "기본 off (settings.agent_loop)" ← **잘못된 주석**
- **영향**: `.env` 파일 없이 백엔드를 실행하면 agentic while-loop가 켜져 있다. 나중에 `.env`로 `false`를 명시하면 단일 라우팅으로 떨어진다. 멀티인텐트(FAQ+추천 동시) 지원 여부가 이 설정에 달려 있다.
- **권장**: `config.py` 기본값(`True`)이 맞는 쪽으로 보이므로, `.env.example` 주석과 `agent_loop.py` 주석을 `True`로 일치시킬 것.

### F-02: A 추천 5회 간헐 실패 (미결, 2026-10-18)
- 정상 조건(경복궁·오후 2시)에서 `Couldn't load experiences` 5회 연속 발생
- 토큰 소진은 아님으로 잠정 확인
- Render 대시보드 로그에서 해당 시간대 500/503 에러 여부 확인 필요
- 재시도 1회로 복구되므로 프론트 retry 로직 보강이 근본 해결일 수 있음

### F-03: `config.js`의 미완성 placeholder
- `const PROD_API = "https://REPLACE-WITH-RENDER-URL.onrender.com"` — 변수명 placeholder 그대로
- 그러나 `API_BASE`는 실제 URL `https://codyssey-konnect.onrender.com`으로 직접 설정되어 있어 동작은 정상
- `PROD_API` 변수는 실제로 사용되지 않음. 코드 정리 대상.

### F-04: render.yaml CORS placeholder 미교체
- `render.yaml`의 `CORS_ALLOW_ORIGINS`가 `https://REPLACE-WITH-VERCEL-URL.vercel.app`
- 실제 Render 대시보드에서 직접 설정했을 것으로 추정 (동작 중이므로)
- 신규 배포 시 이 값을 실제 Vercel URL로 교체해야 함

---

## 🟡 설계 의도가 특이한 것 (알아두어야 할 것)

### F-05: 서울문화포털 API 좌표 필드 뒤바뀜
- `seoulculture.py` 주석: "이 API는 LOT(위도)·LAT(경도)로 이름이 관례와 뒤바뀌어 있어"
- `domain/normalize._valid_seoul_coords`에서 값 범위(위도 33~39, 경도 124~132)로 안전 할당
- **만약 이 API를 다른 용도로 사용한다면 이 quirk를 반드시 알아야 함**

### F-06: semantic_rank가 note 원문을 임베딩에 넣지 않는 이유
- "나는 조각상이 싫어" → 부정 표현이 임베딩 상 긍정 신호로 오염
- `parse_note`로 구조화된 `interests/keywords/open_preferences`만 사용 (이미 긍정 추출됨)
- 비선호·배제는 별도 exclude_classifier + domain/exclusion 경로로 처리

### F-07: 0건-세이프 로직의 의도
- 사용자가 "no museums"라고 해서 박물관이 배제되었는데, 근처에 박물관밖에 없다면?
- → 배제를 무효화하고 "박물관을 제외하려 했으나 근처에 해당 없는 옵션이 없어 포함"이라는 안내 표시
- 개인화가 "0개의 결과"를 만들지 않도록 보호하는 설계 원칙

### F-08: Google Places는 음성 신호 전용 사용
- `price_level`, 평점, 리뷰는 판정/랭킹에 **사용 금지**
- `businessStatus`만 허용 — 폐업/임시휴업 확인 시 Hard 제외
- FieldMask: `places.businessStatus,places.location,places.displayName` 만 요청 (과금 최소화)
- TourAPI가 폐업 레코드를 purge하지 않는 한계를 보완

### F-09: Reason Copy가 코드로 하드코딩
- `domain/reasons.py`에 `REASON_COPY` dict — 11개 고정 문구
- LLM이 이유를 생성하지 않고, 확인된 근거 조건으로 코드가 선택
- 문구 변경은 코딩 없이 이 dict만 수정하면 됨

### F-10: 캐싱 금지가 SQL 코멘트에도 명시
- `0003_chat_messages.sql`에 "여기 저장하는 content는 대화 라우팅 맥락 텍스트일 뿐, 외부 API가 내려준 사실 필드가 아니다. 사실은 추천 때마다 매번 라이브 재조회한다"
- 설계 원칙이 DB 스키마 주석에까지 문서화됨

### F-11: KMA(기상청) LCC 좌표 변환을 직접 구현
- `sources/kma.py`에 기상청 표준 LCC 투영 변환 코드 직접 구현
- 위경도 → 기상청 격자(nx, ny) 변환 수식 포함
- 외부 라이브러리 없이 순수 Python 수학 함수로 구현

### F-12: 비회원 1회 추천 제한이 서버 강제가 아닌 클라이언트 게이팅
- `state.js`의 `markGuestRecommended` → localStorage에 기록
- 주석: "(클라이언트 게이팅 — 기존 로그인 시트와 동일 신뢰수준. 하드 enforce는 추후 서버 과제)"
- 즉, 시크릿 창/다른 브라우저로 우회 가능. 서버 제한은 미구현.

### F-13: Long-term Memory는 정식 로그인만, 익명은 클라이언트 히스토리
- `api/chat.py` `_persists()`: `bool(user and not user.is_anonymous)`
- Anonymous Sign-in 사용자(비회원도 세션 있음)는 DB에 대화 저장 안 됨
- Long-term memory = Google 로그인 사용자 전용 기능

### F-14: 저장된 B루트 복원 시 "라이브 재조립"
- `api/route.py` `pin_titles`: 저장된 스톱 제목 → 다시 조회해 재조립
- 과거 스냅샷(좌표·가격·경로선) 저장 안 함 (캐싱 금지 규약 준수)
- 운영 종료된 장소는 조용히 빠짐 ("사실 재조회가 정본")

### F-15: RAG 임계치 SIM_THRESHOLD = 0.35 (조정 가능)
- `rag/retrieve.py`에 `# 실측으로 조정 가능` 주석
- 너무 낮으면 관련 없는 청크로 틀린 답변, 너무 높으면 모든 것 refuse
- 현재 서비스 운영 중이라면 실측 데이터로 조정했을 가능성 있음

---

## 🟢 잘 만들어진 것 (재사용 가치 높음)

### F-16: 외부 API 실패가 전체 실패로 번지지 않는 설계
- TourAPI 3타입 중 1~2개 실패 → 성공한 것만 병합
- 서울문화포털 전체 실패 → graceful (TourAPI만으로 추천 성립)
- Google Places 실패 → None (폐업 판정 없이 통과)
- Tmap 실패 → None (경로선 없이 카드만 표시)
- 기상청·에어코리아 실패 → 빈 dict (날씨 Context 없이 통과)

### F-17: Render cold start를 프론트에서 UX로 처리
- `app.js`: 3.5초 경과 시 "Waking up the service — first load can take a moment." 표시
- splash 최소 0.5초 노출 (warm 백엔드에서 번쩍이지 않게)
- `index.html`: splash 스타일 인라인 (CSS 로드 전 즉시 페인트)

### F-18: 신뢰 불변식이 스키마에도 녹아있음
- `ParsedConditions` Pydantic 필드 description에 "Never invent a date", "Never invent a time" 등 명시
- LLM이 구조화할 때 제약이 프롬프트가 아닌 스키마 수준에서 강제됨

### F-19: 판정과 설명의 완전 분리
- 운영중/휴무/예산 초과 판정 → 결정론 코드 (`domain/`)
- 이유 설명 → 코드가 고정 문구에서 선택 (`domain/reasons.py`)
- 사용자-facing 산문 → LLM이 코드 결과를 참조해 작성
- LLM이 새 사실을 만들 기회가 구조적으로 없음

### F-20: agent-architecture.md에 솔직한 미구현 상태 기록
- "목표 아키텍처(2b Agentic)"는 Phase 3 계획, 현재는 "옵션 3" 구현
- 각 미구현 항목에 `[ ]` 체크박스로 남은 작업 명시
- 코드베이스와 문서 간 솔직한 상태 표현

---

## 📊 수치로 보는 프로젝트

| 지표 | 값 |
|------|-----|
| 총 파일 수 | 281개 |
| 백엔드 Python 파일 | ~100개 |
| 프론트 JS/CSS/HTML | ~35개 |
| 자동화 테스트 | 44파일, 마지막 268 green (2026-10-09) |
| LLM 호출 지점 | 10개 (orchestrator_model 7 + openai_model 2 + embedding 1) |
| 외부 API 종류 | 7개 서비스 (키 8종) |
| DB 테이블 | 4개 (user_sessions, user_preferences, chat_messages + current_route 컬럼) |
| RAG 지식 문서 | 6개 (.md 파일) |
| eval 골든셋 | 3개 쿼리 (소량) |
| 추천 최대 후보 | 4개 (_MAX_CANDIDATES) |
| Agent 최대 스텝 | 6회 (_MAX_STEPS) |
| 탐색 반경 ladder | 1000m / 2000m / 3000m |
| orchestrator.py | 870줄 (가장 큰 파일) |
| chat.js (프론트) | 628줄 (가장 큰 프론트 파일) |
| RAG 임계치 | SIM ≥ 0.35 |

---

## 타임라인 재구성

| 날짜 | 이벤트 |
|------|--------|
| 2026-09-19 | TourAPI 실측 검증 |
| 2026-09-23~26 | Tech 검증 Q&A 3회 |
| 2026-09-25 | 데이터 품질 검증 |
| 2026-10-04 | Tech 검증 Q&A 4회 |
| 2026-10-07 | 개방형 배제 옵션3 구현 완료 (docs 기록) |
| 2026-10-09 | 268 테스트 그린, 시나리오 테스트 완료 |
| 2026-10-16 | 현장 테스트 + 개선 협의 |
| 2026-10-18 | v3 최종 QA (배포 서비스 검증, 미결 이슈 3건) |
| 2026-10-21 | 최종 발표 (추정) |
| 2026-10-27 | 코드베이스 분석 (현재 문서) |
