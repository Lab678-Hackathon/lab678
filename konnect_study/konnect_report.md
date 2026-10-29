# KONNECT 프로젝트 기술 리포트

> 작성일: 2026-10-28  
> 대상: 이 리포지토리를 처음 접하는 기술자  
> 기준: `main` 브랜치 최신 커밋 기준 (Phase 0~4 완료 상태)

---

## 1. 프로젝트 개요

### 1.1 서비스 목적

KONNECT는 서울을 방문한 **외국인 자유여행자(FIT, Free Independent Traveler)**에게, 현재 조건(위치·시간·운영 상황)에서 **실제로 방문 가능한 문화경험**을 좁혀주는 모바일-퍼스트 웹 서비스다. 단순 장소 목록 제공이 아니라, 공식 API를 실시간 조회해 영업 여부·가격·이동 거리를 판정하고, 확인되지 않은 정보를 "확인 필요"로 명시해 투명하게 안내한다.

**핵심 가치:**
- 미확인 정보를 "무료" 또는 "이용 가능"으로 추정하지 않는다 (제1 원칙).
- AI Agent가 다단계로 조회→판정→설명하되, **사실(가격·시간·좌표)은 코드와 공식 데이터가 소유**하고 LLM은 안내 문장 생성에만 개입한다.
- 결과를 세 가지 상태(조건 충족 / 추가 확인 필요 / 조건 완화 대안)로 구분해 사용자가 판단할 수 있게 한다.

### 1.2 타겟 사용자

서울을 방문 중인 외국인 FIT. 영어를 주 인터페이스 언어로 사용하며, 지금 당장 또는 당일 일정을 계획하는 상황을 가정한다.

### 1.3 개발 현황

| Phase | 내용 | 상태 |
|---|---|---|
| Phase 0 | Walking Skeleton (프론트↔백 관통, 기본 배포) | 완료 |
| Phase 1 | A 즉시 추천 (LF-02·03, A1~A8) | 완료 |
| Phase 2 | 로그인·개인화 (Supabase Auth, Google OAuth, 선호 온보딩, My Page) | 완료 |
| Phase 3 | RAG·B 문화루트·챗봇 Agent (멀티턴, 옵션3 명시 배제) | 완료 |
| Phase 4 | 배포(Render/Vercel)·실사용자 검증(5명 이상) | 완료 |

---

## 2. 기술 스택

### 2.1 레이어별 기술

| 레이어 | 기술 | 선택 이유 |
|---|---|---|
| **Frontend** | 순수 HTML / CSS / JavaScript (ES Modules) | 빌드 도구 없이 즉시 Vercel 정적 호스팅 가능. 프레임워크 의존성 없이 학습 비용 최소화. |
| **Backend** | Python 3.12 + FastAPI + venv | 비동기(asyncio) 외부 API 병렬 조회, Pydantic 타입 강제, 빠른 개발 속도. |
| **AI / Agent** | OpenAI API (`gpt-4o`, `gpt-4o-mini`) + LangChain | 다단계 파이프라인 오케스트레이션(Chain·Tools·Prompt), 구조화 출력(`with_structured_output`). LangGraph 미사용(불필요한 복잡도 회피). |
| **RAG / 벡터** | Supabase pgvector + OpenAI `text-embedding-3-small` | 이미 Supabase를 DB로 쓰므로 별도 벡터DB 추가 없이 pgvector 확장으로 통합. |
| **DB / Auth** | Supabase (Postgres + pgvector + Supabase Auth) | Google OAuth·Anonymous Sign-in·RLS를 하나의 플랫폼에서 처리. JWT는 JWKS로 로컬 검증. |
| **지도 렌더링** | Naver Maps SDK v3 (프론트) | 국내 지도 정확도, 외국인 대상 영문 지원. |
| **도보 경로** | Tmap Pedestrian API (백엔드 프록시) | 서울 도보 경로 정확도가 높음. 백엔드 프록시로 API 키 보호. |
| **외부 길찾기** | Naver Map 딥링크 (`map.naver.com/p/directions`) | 2026-10-14 Google→Naver 전환(외국인 도보/대중교통 경로 정확도). |

### 2.2 외부 API 목록

| API | 용도 | 키 변수 |
|---|---|---|
| TourAPI EngService2 (data.go.kr) | 문화경험 후보 목록·상세·소개 조회 (locationBasedList2, detailIntro2, detailCommon2) | `DATA_GO_KR_SERVICE_KEY` |
| 서울문화포털 culturalEventInfo | 서울시 문화행사 멀티소스 보강 | `SEOUL_OPENAPI_KEY` |
| 기상청 초단기실황 | 기온·강수형태(PTY) — 날씨 배너 & 야외 Soft 강등 Context | `DATA_GO_KR_SERVICE_KEY` |
| AirKorea 대기오염정보 | 서울 대기질(khaiGrade) — 배너 Context | `DATA_GO_KR_SERVICE_KEY` |
| Google Places API (New) | 좌표·주소·링크·이미지 보조 Fallback. `businessStatus`(폐업)만 Hard 제외에 허용 | `GOOGLE_PLACES_API_KEY` |
| Tmap Pedestrian | 도보 거리·시간·경로선 (백엔드 프록시) | `TMAP_API_KEY` |
| Naver Maps SDK | 프론트 지도 렌더링 | `NAVER_MAP_CLIENT_ID` |
| OpenAI | LLM 추론·RAG 답변·임베딩 | `OPENAI_API_KEY` |
| Supabase | DB, pgvector(RAG), Auth(JWT), RLS | `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `SUPABASE_DB_URL` |

---

## 3. 시스템 아키텍처

### 3.1 전체 구조

```
┌─────────────────────────────────────────────────────────────┐
│  Browser (모바일-퍼스트 390px)                               │
│                                                             │
│  Vanilla HTML/CSS/JS (ES Modules)                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────────┐  │
│  │  pages/  │  │components│  │  state.js / auth.js      │  │
│  │(11화면)  │  │(14종)    │  │  Supabase JS SDK         │  │
│  └────┬─────┘  └──────────┘  └────────────┬─────────────┘  │
│       │  api.js (fetch wrapper)            │ Supabase Auth  │
└───────┼────────────────────────────────────┼────────────────┘
        │ HTTP/JSON                          │ JWT (OAuth)
        ▼                                    ▼
┌───────────────────────────────┐   ┌──────────────────────────┐
│  FastAPI Backend (Render)     │   │  Supabase (AWS Tokyo)    │
│                               │   │                          │
│  api/                         │   │  · Postgres (RLS)        │
│  ├─ recommend.py → A 추천     │   │  · pgvector (RAG 임베딩) │
│  ├─ route.py    → B 루트     │   │  · Auth (Google·익명)    │
│  ├─ chat.py     → 챗봇Agent  │   │  · user_sessions         │
│  ├─ ask.py      → RAG FAQ    │   │  · user_preferences      │
│  ├─ session.py  → 세션       │   └──────────────────────────┘
│  ├─ preferences.py → 선호    │
│  └─ translate.py  → 번역     │
│                               │
│  agent/                       │
│  ├─ orchestrator.py (A)       │
│  ├─ route_orchestrator.py (B) │   ┌──────────────────────────┐
│  ├─ chat_agent.py             │   │  External APIs           │
│  └─ tools/ (LangChain Tools)  │◄──►  · TourAPI EngService2  │
│                               │   │  · 서울문화포털          │
│  domain/ (결정론 판정 코드)    │   │  · Tmap Pedestrian       │
│  sources/ (외부 API 클라이언트)│   │  · KMA / AirKorea       │
│  rag/ (pgvector 검색·답변)    │   │  · Google Places         │
│  core/ (auth·trace·예외)      │   │  · OpenAI (LLM·embed)   │
└───────────────────────────────┘   └──────────────────────────┘
```

### 3.2 AI Agent 파이프라인 상세 (A 즉시 추천)

A 추천은 6단계 파이프라인(`agent/orchestrator.py`)으로 처리된다.

```
[1] structure — note 자연어 → ParsedConditions 구조화
│   LangChain with_structured_output(gpt-4o-mini)
│   '말한 것만' 추출. 가격·시간·좌표 생성 금지.
│   출력: interests, exclude_concepts, exclude_places, budget_krw, free_only,
│         indoor_outdoor, prefer_shorter_walks, date, keywords, open_preferences
│
[2] fetch — 공식 API 병렬 조회
│   · TourAPI locationBasedList2 (contentType 76·78·85, 3종 asyncio.gather)
│   · 서울문화포털 culturalEventInfo (멀티소스 보강)
│   · 반경 적응형 ladder (1km→2km→3km, 유효 후보 < 2개이면 자동 확장)
│   · 상세 조회(detailIntro2·detailCommon2) 병렬 보강 (_ENRICH_POOL=8)
│
[3] normalize — domain/normalize.py 단일 지점 정규화
│   · 가격: free/paid/unknown/partial_or_ambiguous (빈값→unknown, 추정 금지)
│   · 운영시간: display·raw·provenance 3-tuple
│   · 좌표: 한국 범위(lat 33~39, lng 124~132) 검증 후 이상치 drop
│   · 이미지·링크: 공식 소스만, 없으면 null (가짜 생성 금지)
│
[4] judge — 판정 (domain/ 결정론 코드)
│   · timing.py: 운영시간 파싱·요일 휴무·last admission → TimingVerdict(OPEN/CLOSED/UNCERTAIN)
│   · hours_parser.py: LLM으로 비정형 운영시간 텍스트 추출 (사실 아님, 구조화만)
│   · budget.py: 예산 초과 판정 → BudgetVerdict(OK/OVER/UNKNOWN)
│   · reservation.py: 예약 필요 여부 → ReservationVerdict
│   · operational.py: Google Places businessStatus 폐업 확인 (Hard 제외)
│   · exclusion.py: exclude_concepts(LLM 의미 분류) · exclude_places(제목 매칭) 적용
│   · status.py: 3상태 산정 (fits / check_needed / alternative / None=Hard제외)
│
[5] tmap — 도보 경로 (백엔드 프록시)
│   · Tmap Pedestrian API → walk_minutes·distance_m·path(경로선)
│   · provenance=estimate. 실패 시 graceful(카드 유지, 지도 핀만)
│
[6] explain — Reason 선택 + 환경 Context
    · reasons.py: Reason Copy Dictionary(17개) 에서 확인된 근거로만 코드가 선택 (0~2개)
    · environment.py: KMA·AirKorea 조회 → 악천후 배너 + 야외 Soft 강등
    · ranking.py: display_sort_key() 로 최종 정렬 (상태등급 > 만족조건수 > 관심사 > 실내외 > 정성 > 날씨)
```

**신뢰 경계 요약:** LLM은 ①note 구조화(파싱), ②tool 라우팅(챗봇), ③RAG 답변(근거 내), ④Reason 문장 생성(코드가 고른 복사본 Phrase만)만 담당한다. 가격·운영시간·예약·좌표를 LLM 출력에서 읽지 않는다.

### 3.3 RAG 구조

```
[적재 단계] python -m app.rag.ingest
  rag/knowledge/*.md (6개 문서, 27청크)
  → chunk.py: 섹션 단위 분할 (tiktoken 기준)
  → embed.py: OpenAI text-embedding-3-small → 1536차원 벡터
  → store.py: Supabase pgvector (vecs 라이브러리, Postgres DSN 직결)

[검색 단계] rag/retrieve.py
  질의 → embed_query() → store.query() → cosine similarity
  SIM_THRESHOLD=0.35 이상 청크만 '근거'로 인정 (RETRIEVE_LIMIT=6, TOP_K=4)
  근거 있으면 → LLM이 근거 범위 안에서만 영어 답변 + citation 반환
  근거 없으면 → REFUSAL 문자열 반환 (생성 금지)
```

지식베이스 문서 목록:
- `connectivity.md` — 인터넷·유심·와이파이 연결
- `culture-basics.md` — 문화 기본 예절
- `etiquette.md` — 한국 예절
- `konnect.md` — KONNECT 서비스 소개
- `money-language.md` — 화폐·언어 안내
- `transport.md` — 대중교통 안내

### 3.4 인증 흐름 (Supabase Auth)

```
[비로그인 진입]
  프론트 → Supabase Anonymous Sign-in → 익명 user_id 발급
  → Bearer 토큰 → FastAPI JWKS 검증 → AuthUser(id, is_anonymous=True)
  → user_sessions (RLS: auth.uid() 일치만) 에 요청·선택 저장

[Google 로그인 전환]
  "Find new options" 클릭 → Supabase loginSheet → signInWithOAuth (Google)
  → 익명이면 linkIdentity() → 동일 user_id 유지 (데이터 마이그레이션 자동)
  → 이미 연결된 계정: identity_already_exists → signInWithOAuth 폴백
  → 로그인 직후 refreshSession() (is_anonymous 클레임 동기화)

[백엔드 JWT 검증]
  JWKS endpoint: {SUPABASE_URL}/auth/v1/.well-known/jwks.json
  알고리즘: ES256 / RS256 (비대칭). 공유 secret 미사용(provider-agnostic).
  get_optional_user: 토큰 없음 → None (비로그인 허용)
  get_current_user: 토큰 필수 → 없으면 AuthError(401)
```

### 3.5 지도·이동 처리

```
[도보 경로 - 백엔드]
  Tmap Pedestrian API → walk_minutes / distance_m / path(polyline [[lat,lng],...])
  provenance=estimate (측정 계산값). 실패 시 graceful(MovementInfo.path=null)

[지도 렌더 - 프론트 map.js]
  Naver Maps SDK (ncpKeyId=/api/config에서 주입)
  추천(A): 출발핀(Start) + 번호 핀(후보별) + 선택 후보 경로선
  루트(B): 출발핀 + 순번 스톱 핀 + 구간별 path 이어붙인 전체 경로선
  NCP 미등록 도메인: graceful 숨김 (카드·결과는 유지)
  임의 직선 금지: Tmap path가 없으면 선 생략, 핀만 표시

[외부 길찾기]
  Naver Map 딥링크: map.naver.com/p/directions (EPSG:3857 좌표 전달)
  도보/대중교통 실제 경로. 영문은 사용자 네이버지도 언어 설정 따름.
```

---

## 4. 디렉터리 구조 및 모듈 설명

### 4.1 백엔드 (`backend/`)

```
backend/
├─ requirements.txt          # 의존성 (fastapi, uvicorn, pydantic, langchain, supabase, vecs, httpx 등)
├─ app/
│  ├─ main.py                # FastAPI 앱 엔트리. 7개 라우터 등록. 공통 예외 핸들러.
│  ├─ config.py              # pydantic-settings 기반 환경변수 로딩. 키 존재 여부만 로그(값 미출력).
│  │
│  ├─ api/                   # 라우터 (얇게 유지 — 로직은 agent/domain/rag에)
│  │  ├─ recommend.py        # POST /api/recommend (A 즉시 추천)
│  │  ├─ route.py            # POST /api/route (B 문화루트)
│  │  ├─ chat.py             # POST /api/chat (챗봇 Agent)
│  │  ├─ ask.py              # POST /api/ask (RAG FAQ)
│  │  ├─ session.py          # GET/POST /api/session (비로그인·로그인 세션 저장)
│  │  ├─ preferences.py      # GET/PUT /api/preferences (선호 온보딩·My Page)
│  │  └─ translate.py        # POST /api/translate (결과 번역 토글)
│  │
│  ├─ agent/                 # LangChain 기반 AI Agent 로직
│  │  ├─ orchestrator.py     # A 추천 파이프라인 (structure→fetch→judge→route→explain)
│  │  ├─ route_orchestrator.py  # B 루트 파이프라인 (A의 fetch/judge 재사용 → route 조립)
│  │  ├─ chat_agent.py       # 단일 챗봇 tool-calling 라우터 (AG-1/2/3)
│  │  ├─ agent_loop.py       # Agentic while-loop (멀티 인텐트, AGENT_LOOP=true 시)
│  │  ├─ note_parser.py      # 자연어 note → ParsedConditions LLM 구조화
│  │  ├─ hours_parser.py     # 비정형 운영시간 텍스트 → 구조화 (LLM 보조)
│  │  ├─ classify.py         # 후보 실내외 분류 (LLM per-place, Soft only)
│  │  ├─ exclude_classifier.py  # exclude_concepts LLM 의미 분류 (옵션3)
│  │  ├─ semantic_rank.py    # 의미 유사도 기반 순위 (open_preferences 정성 선호)
│  │  ├─ context.py          # RequestContext 스키마 (Agent 컨텍스트 통합)
│  │  ├─ environment.py      # KMA·AirKorea 병렬 조회 → EnvironmentContext
│  │  ├─ translate.py        # 결과 타이틀 번역 (LLM)
│  │  └─ tools/
│  │     ├─ schemas.py       # LangChain Tool 스키마 3개 (RecommendExperiences, PlanCultureRoute, AnswerTravelQuestion)
│  │     ├─ experiences.py   # recommend_experiences tool 실행
│  │     ├─ route.py         # plan_culture_route tool 실행
│  │     └─ knowledge.py     # answer_travel_question tool 실행 (→RAG)
│  │
│  ├─ domain/                # 결정론 판정 로직 (사실·사실비교·충돌 — LLM 개입 없음)
│  │  ├─ normalize.py        # TourAPI/서울문화포털 응답 → Candidate 정규화 (단일 지점)
│  │  ├─ status.py           # 3상태 산정: fits/check_needed/alternative/None
│  │  ├─ timing.py           # 운영시간 파싱·요일 휴무·last admission → TimingVerdict
│  │  ├─ budget.py           # 예산 초과 판정 → BudgetVerdict
│  │  ├─ ranking.py          # Soft 랭킹: display_sort_key(), interest_matched(), io_rank() 등
│  │  ├─ reasons.py          # Reason Copy Dictionary 17개에서 조건 매칭으로 선택 (코드 결정)
│  │  ├─ route.py            # B 루트 조립: fit_count, assemble_route, build_schedule, rollup_budget
│  │  ├─ locations.py        # 시작 위치 해석 (좌표→Quick Select 5→도심 기본값)
│  │  ├─ curation.py         # 문화경험 필터 (is_cultural_experience, 의료관광 제외)
│  │  ├─ dedup.py            # 멀티소스 중복 제거 (dedup_cross_source)
│  │  ├─ exclusion.py        # 명시 배제: match_excluded_places(제목), lexical_excluded(텍스트), select_with_exclusion
│  │  ├─ operational.py      # Google Places businessStatus → PresenceVerdict (폐업 Hard 제외)
│  │  ├─ reservation.py      # 예약 필요 여부 판정 → ReservationVerdict
│  │  ├─ signals.py          # AI 분류 근거 키워드 생성 (classification_signals, 표시 전용)
│  │  ├─ text_signals.py     # 텍스트 신호 추출 (키워드 매칭)
│  │  ├─ preferences_merge.py  # Request > Preference 병합 (merge_saved_interests 등)
│  │  ├─ conflict.py         # 조건 충돌 감지 (io_interest_conflict, conflict_notice)
│  │  ├─ input_validation.py # 입력 경계 검증 (가용시간 최소 30분·역전 체크)
│  │  └─ environment.py      # 환경(날씨·대기질) 판정 → EnvironmentContext (Soft Context만)
│  │
│  ├─ models/                # Pydantic 스키마 (입출력 계약)
│  │  ├─ recommend.py        # RecommendRequest, Candidate, ParsedConditions, ResultStatus 등
│  │  ├─ route.py            # RouteData, RouteStop, WalkSegment, RouteRequest 등
│  │  ├─ chat.py             # ChatRequest, ChatResponse, ChatTurn, ChatContext
│  │  ├─ rag.py              # RagAnswer, RagCitation
│  │  ├─ envelope.py         # Generic Envelope(ok, data, error, trace_id) — 모든 응답 포맷
│  │  ├─ environment.py      # EnvironmentContext (날씨·대기질)
│  │  ├─ preferences.py      # UserPreferences (interests, prefer_shorter_walks 등)
│  │  ├─ session.py          # UserSession 스키마
│  │  └─ translate.py        # TranslateRequest/Response
│  │
│  ├─ sources/               # 외부 API 클라이언트 (타임아웃·재시도 내장, 캐싱 없음)
│  │  ├─ tourapi.py          # TourAPI EngService2 (location_based_list, detail_intro, detail_common)
│  │  ├─ seoulculture.py     # 서울문화포털 culturalEventInfo
│  │  ├─ gplaces.py          # Google Places API New (좌표·businessStatus 보조)
│  │  ├─ tmap.py             # Tmap Pedestrian (도보 경로, 백엔드 프록시)
│  │  ├─ kma.py              # 기상청 초단기실황 (PTY·기온, 격자 좌표 변환)
│  │  └─ airkorea.py         # AirKorea 대기오염정보 (서울 대표 khaiGrade)
│  │
│  ├─ rag/                   # 지식베이스 (FAQ·여행정보·서비스 설명)
│  │  ├─ chunk.py            # 섹션 단위 청크 분할
│  │  ├─ embed.py            # OpenAI text-embedding-3-small 임베딩
│  │  ├─ store.py            # Supabase pgvector CRUD (vecs 라이브러리, +psycopg2 고정)
│  │  ├─ retrieve.py         # 유사도 검색 → 근거 판정 → LLM 답변/거부
│  │  ├─ ingest.py           # 적재 스크립트 (27청크/6문서, 멱등)
│  │  └─ knowledge/          # 6개 마크다운 지식 문서
│  │
│  ├─ db/                    # Supabase 클라이언트·쿼리
│  │  ├─ client.py           # supabase-py 클라이언트 초기화
│  │  ├─ sessions.py         # user_sessions 테이블 CRUD
│  │  ├─ preferences.py      # user_preferences 테이블 CRUD
│  │  └─ chat.py             # 챗 히스토리 (서버 세션 멀티턴용)
│  │
│  ├─ core/                  # 공통 유틸
│  │  ├─ auth.py             # JWKS JWT 검증 (get_optional_user·get_current_user)
│  │  ├─ exceptions.py       # KonnectError 계층 (SystemError·ValidationFailure·AuthError 등)
│  │  └─ trace.py            # Trace 클래스 (trace_id·단계별 step 로깅, NFR-08 PoC 증빙)
│  │
│  └─ eval/                  # 품질 평가 도구
│     ├─ golden_set.json     # 평가 케이스 집합
│     ├─ metrics.py          # 평가 지표
│     ├─ run_eval.py         # 평가 실행 스크립트
│     └─ runner.py           # 평가 루너
```

### 4.2 프론트엔드 (`frontend/`)

```
frontend/
├─ index.html               # SPA 껍데기: #view(뷰 컨테이너) + #splash(콜드스타트 대기) + AI 고지 pill
├─ vercel.json              # Vercel 정적 호스팅 설정 (rewrites)
├─ css/
│  ├─ tokens.css            # 디자인 토큰 값 정본 (var(--c-primary) 등, 하드코딩 금지)
│  └─ app.css               # 전역 스타일, 레이아웃, 컴포넌트 CSS
├─ assets/
│  ├─ favicon.svg
│  └─ icons/                # 3D 아이콘 PNG (유형별: exhibition, performance, hands-on, historic-visit, festival-event, default)
│  └─ img/                  # 홈 카드 이미지, 웰컴 히어로 이미지
└─ js/
   ├─ config.js             # API_BASE_URL (로컬=localhost:8000 / 배포=환경 기반)
   ├─ api.js                # 백엔드 호출 래퍼 (postRecommend·postRoute·postChat·postAsk·putPreferences 등)
   ├─ auth.js               # Supabase Auth 클라이언트 (signIn·signOut·onAuthChange·linkIdentity)
   ├─ map.js                # Naver Maps SDK 래퍼 (renderMap·renderRouteMap·핀·경로선·포커스)
   ├─ state.js              # 클라이언트 상태 (currentLocation·currentResults·currentChoice, localStorage 영속)
   ├─ app.js                # 뷰 라우터 (showWelcome·showHome·showInput·startRecommend·showResults 등)
   ├─ pages/                # 화면별 렌더 함수 (DOM 반환, app.js가 mount)
   │  ├─ welcome.js         # W-0: 첫 방문 웰컴 화면
   │  ├─ home.js            # LF-01: 홈 (A/B 진입점, 현재 선택 배너, 로그인 상태)
   │  ├─ input.js           # LF-02: A 추천 입력 (날짜·위치·시간·자연어 note)
   │  ├─ loading.js         # 로딩 (shimmer 스켈레톤 + 회전 단계문구 + Cancel AbortController)
   │  ├─ results.js         # LF-03: A 추천 결과 (카드 목록 + 지도)
   │  ├─ chat.js            # LF-04·05·06: 챗봇 대화 (FAQ·추천·루트, Trip 칩 편집)
   │  ├─ route.js           # LF-05·08: B 루트 결과 뷰 (route-card + 지도)
   │  ├─ onboarding.js      # P9-1: 선호 온보딩 (최초 Google 로그인 1회)
   │  ├─ mypage.js          # MP-1·2·3: My Page (선호 확인·수정·초기화)
   │  ├─ choice.js          # LF-09: 선택 상세 (확정 후 재접근)
   │  └─ error.js           # 오류 화면 (재시도·조건 수정)
   └─ components/           # 재사용 DOM 컴포넌트
      ├─ result-card.js     # A 추천 카드 (상태배지·Reason·Fact·Flag·Select)
      ├─ route-card.js      # B 루트 카드 (루트 요약·스톱 목록·구간 도보·총계)
      ├─ saved-route-card.js # 저장 루트 미니 카드 (홈 재접근)
      ├─ sheet.js           # 바텀시트 기반 클래스 (grip 스와이프·Esc·백드롭)
      ├─ login-sheet.js     # Google 로그인 시트
      ├─ preference-form.js # 선호 입력 폼 (온보딩·My Page 공용)
      ├─ condition-summary.js # AI가 이해한 조건 칩 표시 (Parsed Chip)
      ├─ confirm-sheet.js   # 확인 시트 (파싱 조건 검토·수정)
      ├─ date-sheet.js      # 날짜 선택 시트
      ├─ location-sheet.js  # 위치 선택 시트 (현재 위치·Quick Select 5)
      ├─ time-sheet.js      # 시간 선택 시트
      ├─ pref-confirm.js    # 선호 변경 확인 시트
      ├─ translate-toggle.js # 한국어 타이틀 번역 토글 (결과 상단)
      ├─ directions-overlay.js # 외부 길찾기 오버레이
      └─ icons3d.js         # 3D 아이콘 렌더 헬퍼
```

---

## 5. 핵심 기능 상세

### 5.1 A 즉시 추천 (LF-02, LF-03)

사용자가 현재 위치·시작 시각·종료 시각과 선택적 자연어 조건을 입력하면, 지금 당장 방문 가능한 문화경험 후보를 최대 4개 반환한다.

**입력 스키마 (`RecommendRequest`):**
- `start_location`: 라벨·위도·경도 (GPS 또는 Quick Select 5 또는 수동 입력)
- `start_at`, `end_at`: ISO datetime (가용시간 최소 30분, 역전 오류)
- `note`: 자연어 선택조건 1영역 (e.g., "free, indoor, interested in pottery")
- `conditions`: 사용자가 직접 수정한 ParsedConditions (있으면 note 파싱 생략)

**출력 스키마 (`RecommendData`):**
- `candidates`: Candidate 목록 (최대 4개)
- `origin`: 해석된 출발점 (지도 Start 핀용)
- `conditions`: AI가 이해한 조건 (Parsed Chip 표시용 — 투명 공개)
- `notices`: 사용자 안내 문구 (0건·반경 확대 등)
- `environment`: 날씨·대기질 Context (악조건 시 배너)
- `ai_notice`: "AI-assisted results · unconfirmed details marked"

**Candidate 상태 3종:**
| 상태 | 의미 | 조건 |
|---|---|---|
| `fits` | 조건 충족 | 영업 확인 + 가격 확인 + 예산 OK + 관심사 일치 + 예약 불필요 확인 |
| `check_needed` | 추가 확인 필요 | 영업 미확인 또는 가격 미확인 또는 예약 상태 불명 |
| `alternative` | 조건 완화 대안 | 예산 초과 또는 요청 관심사 불일치 |

### 5.2 B 문화루트 (LF-04, LF-05)

챗봇 대화 또는 "Plan a day" 버튼으로 출발점·시간창에서 도보 동선으로 연결 가능한 스톱을 조립해 하루 코스(최대 8스톱, `MAX_DAY_STOPS`)를 구성한다.

**루트 조립 로직 (`domain/route.py`):**
- `fit_count`: 도보이동 누적 시간 ≤ 가용시간을 만족하는 스톱 개수 산출
- `assemble_route`: haversine 거리 기반 인접 스톱 연결, 이동 불가(도보 시간 초과) 스톱 제외
- `build_schedule`: 스톱별 arrival/depart 절대 시각 산출 (start_at + 도보 + 방문시간 체인)
- 방문시간: 공식 `spendtime`(Official) 있으면 우선, 없으면 유형 기준 표준(Planned) — 전시 60분·방문 40분·체험 90분·기본 45분
- `rollup_budget`: 비용 합산 (하나라도 미확인이면 "Total cost needs checking")
- `route_name`: 시작 지역명 기반 짧은 이름 (없으면 "Culture route")

**루트 상태:**
- `complete`: 2개 이상 유효 스톱 구성
- `unmet`: 유효 스톱 2개 미만 또는 시간초과 → 개별 추천(A) 전환 안내

### 5.3 챗봇 Agent (멀티턴)

`POST /api/chat` 엔드포인트가 단일 챗봇 화면에서 FAQ·즉시 추천·문화루트를 통합 처리한다.

**라우팅 구조 (`agent/chat_agent.py`):**
```
사용자 메시지 + 대화 히스토리 →
  LangChain ChatPromptTemplate (system + MessagesPlaceholder + human) →
  gpt-4o tool_choice →
  tool 선택: AnswerTravelQuestion | RecommendExperiences | PlanCultureRoute
  →코드가 tool 실행 → 통합 응답(ChatResponse)

ChatResponse.kind:
  "answer"          → RAG 답변 + citation
  "recommendation"  → Candidate 목록 (result-card 재사용)
  "route"           → RouteData (route-card)
  "clarify"         → 필수 정보 없을 때 재질문 (추정 금지)
```

**멀티턴:** 클라이언트가 `history: ChatTurn[]`을 매 턴 전송(stateless 백엔드). LangChain `MessagesPlaceholder`로 최근 10턴 컨텍스트 유지. 후속 교정("remove museums", "only free") 시 동일 tool 재호출 + 누적 조건 갱신.

**AGENT_LOOP=true 시:** `agent/agent_loop.py`의 while-loop가 멀티 인텐트(추천+FAQ 동시)를 순차 처리한다.

### 5.4 RAG (FAQ·여행정보)

`POST /api/ask` 또는 챗봇 `answer_travel_question` tool을 통해 지식베이스를 검색한 뒤 근거 범위 안에서만 답변한다.

- **근거 판정:** cosine similarity ≥ 0.35 (SIM_THRESHOLD)
- **근거 있음:** LLM이 검색 컨텍스트만 참조해 영어 답변 + 출처 chunk 반환
- **근거 없음:** REFUSAL 문자열 ("check the official source") — 생성 금지
- **사실(가격·시간·예약):** 프롬프트에서 생성 명시 금지 → 공식 경로 안내로만 처리

### 5.5 로그인·개인화

**L1 — 로그인 게이트:**
- 비회원은 첫 추천 결과까지 1회 자유. 두 번째 "Find new options" 시 로그인 유도.
- 익명 → Google 전환 시 user_id 보존 (identity linking).

**L2 — P-09 선호 온보딩:**
- 최초 Google 로그인 1회만 노출 (onboarded_at 마커).
- 관심사 6개 복수 선택 + "Prefer shorter walks" 체크박스. 모두 Skip 가능.
- 저장 선호는 추천 A/B의 Soft 랭킹에만 반영 (관심사 tiebreak, 걷기→base_radius 결정).

**L3 — My Page:**
- 저장 선호 확인·수정·초기화 (PUT /api/preferences). 변경은 다음 추천부터 적용.
- Account 아바타 → My Page → MP-1·2(수정)·3(초기화 확인 시트).

---

## 6. API 엔드포인트 목록

| 메서드 | 경로 | 설명 | 인증 |
|---|---|---|---|
| GET | `/health` | 라이브니스 체크 (`{"status":"ok","env":"..."}`) | 없음 |
| GET | `/api/config` | 공개 설정 (Naver Map client id, Supabase URL/publishable key) | 없음 |
| POST | `/api/recommend` | A 즉시 추천 (`RecommendRequest` → `Envelope[RecommendData]`) | Optional |
| POST | `/api/route` | B 문화루트 (`RouteRequest` → `Envelope[RouteData]`) | Optional |
| POST | `/api/chat` | 챗봇 Agent (`ChatRequest` → `Envelope[ChatResponse]`) | Optional |
| POST | `/api/ask` | RAG FAQ (`{"question":str}` → `Envelope[RagAnswer]`) | Optional |
| GET | `/api/session` | 세션 조회 (현재 선택·요청 이력) | Required |
| POST | `/api/session/choice` | 선택 저장 | Required |
| GET | `/api/preferences` | 선호 조회 (`UserPreferences`) | Required |
| PUT | `/api/preferences` | 선호 저장/갱신 | Required |
| POST | `/api/translate` | 결과 타이틀 번역 (`TranslateRequest` → `TranslateResponse`) | Optional |

**공통 응답 형식 (`Envelope`):**
```json
{
  "ok": true,
  "data": { ... },
  "error": null,
  "trace_id": "uuid"
}
```
실패 시 `ok=false`, `data=null`, `error={"code":..., "message":...}`.

---

## 7. 데이터 흐름 및 신뢰 판정 로직

### 7.1 데이터 정규화 규칙 (`domain/normalize.py`)

TourAPI 응답을 Candidate로 변환할 때 단일 지점에서 정규화한다.

**가격 정규화:**
| TourAPI 원본 | 정규화 값 | 이유 |
|---|---|---|
| 비어있음 / null | `unknown` | 빈값을 무료로 추정하지 않는다 |
| "무료", "Free", "0" | `free` | 명시적 무료 확인 |
| 금액 있음 | `paid` | 확인된 유료 |
| "할인·무료 혼재" 등 | `partial_or_ambiguous` | 모호값 — fits 불가 |

**운영시간 정규화:**
- `display`: 단일 범위("10:00–18:00")로 요약 가능할 때만. 복수 범위·계절 별도→None
- `raw`: 원본 전체 보존 (합성 금지)
- `provenance`: CONFIRMED(공식 필드) / UNCONFIRMED(없음)

**좌표:** 한국 범위(lat 33~39, lng 124~132) 검증. 이상치는 drop (지도 핀 미생성).

### 7.2 3상태 판정 (`domain/status.py`)

`resolve_status(candidate, timing, budget, cond)` 함수가 판정한다.

```
1. timing == CLOSED → None (Hard 제외, 정상 추천 미포함)
2. reservation != NOT_REQUIRED → 예약 관련 flag 추가
3. budget == OVER → alternative + "Above your budget" / "Not a free option" flag
4. not interest_matched() → alternative + "Outside your interests" flag
5. timing == OPEN and price known and budget OK and reservation OK → fits
6. else → check_needed + 미확인 flags
```

### 7.3 Hard 제외 조건

아래 중 하나라도 해당하면 후보가 정상 추천에서 완전 제외된다 (None 반환).

- `TimingVerdict.CLOSED`: 영업시간 외, 휴무일, 행사 기간 종료
- `PresenceVerdict.CLOSED` (Google Places `businessStatus=CLOSED_PERMANENTLY`): 폐업 확인
- `exclude_places` 매칭: 사용자가 명시한 장소 이름
- `exclude_concepts` 분류 적중: 사용자가 명시한 개념(예: "museums")에 LLM 의미 분류가 매칭
- `is_cultural_experience()` 실패: 문화경험 범주 외 (의료관광 A020205* 등)

### 7.4 Soft 랭킹 로직 (`domain/ranking.py`)

`display_sort_key()` 가 반환하는 튜플로 정렬. 오름차순(작을수록 우선).

```python
(
  _STATUS_RANK[status],       # fits=0, check_needed=1, alternative=2
  -satisfied,                 # 만족한 명시 조건 수 (많을수록 앞, 음수로 변환)
  preference_rank,            # 관심사: 선호=0, 중립=1, 비선호=2
  io_rank,                    # 실내외: 일치=0, 중립=1, 불일치=2
  vibe_rank,                  # 정성 선호(open_preferences): 적합=0, 부적합=1
  weather_rank,               # 악천후 시 야외=1, 나머지=0
)
```

같은 키 구간 안에서는 거리순(stable sort 유지). 비선호여도 **제외하지 않고 순서만** 조정한다.

---

## 8. 외부 API 연동 상세

### 8.1 TourAPI EngService2 (`sources/tourapi.py`)

- **엔드포인트:** `apis.data.go.kr/B551011/EngService2/`
- **사용 API:** `locationBasedList2`(목록), `detailIntro2`(상세 소개), `detailCommon2`(공통 정보)
- **문화 contentType:** 76(관광지·역사), 78(문화시설·박물관·미술관), 85(축제·공연·행사)
- **병렬 조회:** `asyncio.gather`로 3종 동시 조회 후 병합·dedup
- **타임아웃·재시도:** `httpx` + `tenacity` 내장. API 키는 `logging.WARNING` 레벨 차단(시크릿 노출 방지)
- **캐싱 없음:** API 정책 + 데이터 신선도 원칙. 매 요청 직접 조회.

### 8.2 Tmap Pedestrian (`sources/tmap.py`)

- 백엔드 프록시로 API 키 보호. 결과(walk_minutes·distance_m·path 폴리라인)를 클라이언트에 전달.
- 실패 시 graceful: MovementInfo(path=None, display="Route unavailable")

### 8.3 Google Places API New (`sources/gplaces.py`)

- **용도:** 좌표·주소·링크·이미지 보조 Fallback + `businessStatus` 폐업 Hard 제외 신호
- **금지:** `price_level`·평점·리뷰를 판정·랭킹에 사용 금지 (공식 데이터 우선 원칙)
- **폐업 판정:** `CLOSED_PERMANENTLY`/`CLOSED_TEMPORARILY` 확인 시에만 Hard 제외. 실패 시 graceful.

### 8.4 기상청 + AirKorea (`sources/kma.py`, `sources/airkorea.py`)

- **KMA 초단기실황:** PTY(강수형태)·기온. 격자 좌표 변환 내장. 악천후 기준은 공식 카테고리만(임의 임계값 없음).
- **AirKorea:** 서울 대표 station khaiGrade.
- **Context 역할만:** 환경 정보가 악조건이어도 운영 사실 추정 금지. 배너 표시 + 야외 유형 Soft 강등(제외 아님).

### 8.5 OpenAI

- `gpt-4o`: RAG 답변·Reason 문장·번역
- `gpt-4o-mini`: note 파싱·exclude 분류·실내외 분류·운영시간 추출 (낮은 지연·비용)
- `text-embedding-3-small`: RAG 임베딩 (1536차원)
- LangChain `ChatOpenAI`, `with_structured_output`으로 Pydantic 모델 직접 출력

---

## 9. 프론트엔드 구조

### 9.1 화면 흐름 (SPA 라우팅)

`app.js`의 `mount()` 함수가 단일 `#view` 컨테이너에 화면을 교체하는 방식으로 라우팅한다. 별도 URL 변경 없음.

```
W-0 (welcome.js) — 첫 방문 웰컴 (한 번만)
  ↓
LF-01 (home.js) — 홈
  ├─ [A] "Find experience now" → LF-02 (input.js) — A 입력
  │     → loading.js (shimmer 스켈레톤, AbortController Cancel)
  │     → LF-03 (results.js) — A 결과 (result-card 목록 + Naver 지도)
  │         → LF-09 (choice.js) — 선택 상세 재접근
  ├─ [B] "Chat with KONNECT" → chat.js — 챗봇 (FAQ·추천·루트 통합)
  │     → route.js (route-card + Naver 지도) — B 루트 결과
  ├─ "Account" (로그인 시) → mypage.js — My Page
  └─ "Current choice" 배너 → choice.js — 저장 선택 재접근

로그인 게이트:
  LF-01 "Log in" → login-sheet.js → Supabase Google OAuth
  최초 로그인 → onboarding.js — 선호 온보딩 (1회)
```

### 9.2 상태 관리 (`state.js`)

클라이언트 상태를 단일 모듈에서 관리한다. 주요 항목:

- `currentLocation`: 현재 위치 좌표 (GPS 또는 선택값)
- `currentResults`: 추천 결과 마지막 수신값 (지도·카드 공유)
- `currentChoice`: 선택 확정된 Candidate (localStorage 영속)
- `guestRecommendUsed`: 비회원 추천 사용 여부 플래그 (로그인 유도 트리거)

`localStorage` 사용: `currentChoice`(선택 유지), `seenWelcome`(웰컴 표시 여부). 예외 시 graceful (private 탭 등).

### 9.3 디자인 토큰 (`css/tokens.css`)

모든 색·타이포·간격·반경·그림자 값의 정본. 코드에서 하드코딩 금지, `var(--token)` 참조만 허용.

**주요 토큰:**

| 토큰 | 값 | 용도 |
|---|---|---|
| `--c-primary` | `#007385` | 브랜드 teal: 버튼·선택 테두리·경로선 |
| `--c-fits-bg` | `#dff3e7` | Fits 상태 배지 배경 (초록) |
| `--c-fits-text` | `#2e7d4f` | Fits 배지 텍스트 |
| `--c-check-bg` | `#f1f3f5` | Check Needed 배지 배경 (중립 회색) |
| `--c-alt-bg` | `#e6e8f2` | Alternative 배지 배경 (보라빛 중립) |
| `--c-flag-bg` | `#f1f3f5` | 미확인 flag 칩 배경 |
| `--c-far-bg` | `#fbe3ef` | 반경 확대 편입 ("Far") 칩 배경 (분홍) |
| `--c-error` | `#c23b3b` | 입력 오류 텍스트 |
| `--font-sans` | Inter | 기본 폰트 |
| `--r-card` | `18px` | 결과 카드 반경 |

---

## 10. 배포 구조

### 10.1 백엔드 — Render (`render.yaml`)

```yaml
services:
  - type: web
    name: konnect-api
    runtime: python
    rootDir: backend
    plan: free
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn app.main:app --host 0.0.0.0 --port $PORT
    healthCheckPath: /health
```

- Python 3.12.8, free 플랜 (콜드스타트 최대 수십 초 → 프론트에서 splash 화면으로 대응)
- 시크릿은 Render 대시보드 Environment에서 입력 (`sync: false`)

### 10.2 프론트엔드 — Vercel

- 정적 파일 빌드 없이 직접 호스팅 (`vercel.json` rewrites 설정)
- `frontend/js/config.js`가 호스트 기반으로 API_BASE_URL 자동 전환 (로컬/배포 분기)

### 10.3 환경 변수 목록

| 변수명 | 필수 | 용도 |
|---|---|---|
| `OPENAI_API_KEY` | O | OpenAI LLM·임베딩 |
| `OPENAI_MODEL` | — | 기본 `gpt-4o` |
| `OPENAI_EMBEDDING_MODEL` | — | 기본 `text-embedding-3-small` |
| `ORCHESTRATOR_MODEL` | — | tool 선택 모델, 기본 `gpt-4o-mini` |
| `AGENT_LOOP` | — | `true`=agentic 루프, 기본 `false` |
| `SUPABASE_URL` | O | Supabase 프로젝트 URL |
| `SUPABASE_PUBLISHABLE_KEY` | O | 프론트용 공개 키 |
| `SUPABASE_SECRET_KEY` | O | 백엔드 전용 서비스 키 |
| `SUPABASE_DB_URL` | O (RAG) | pgvector Postgres DSN (RAG만, 미설정 시 /api/ask만 503) |
| `DATA_GO_KR_SERVICE_KEY` | O | TourAPI·KMA·AirKorea 공용 키 |
| `SEOUL_OPENAPI_KEY` | — | 서울문화포털 API |
| `TMAP_API_KEY` | O | Tmap 도보 경로 |
| `NAVER_MAP_CLIENT_ID` | O | Naver Maps SDK |
| `GOOGLE_PLACES_API_KEY` | — | Google Places 보조 (없으면 보조 기능만 비활성) |
| `CORS_ALLOW_ORIGINS` | O | 허용 오리진 (쉼표 구분) |

---

## 11. 테스트

### 11.1 테스트 도구

- `pytest` + `pytest-asyncio`: 비동기 테스트
- `respx`: httpx 기반 외부 API 모킹 (TourAPI·Tmap·KMA 등)
- 위치: `backend/tests/`

### 11.2 테스트 현황 (Phase 3 완료 기준)

| 파일 | 커버 영역 | 대략 테스트 수 |
|---|---|---|
| `test_normalize.py` | 가격 정규화, 좌표 검증, flag | 15개 |
| `test_timing.py` | 운영시간 파싱, 요일 휴무, last admission, 24h | 14개 |
| `test_status.py` | 3상태 산정, 가격/예약/예산 경계 | 6개 |
| `test_budget.py` | 예산 판정 (일반가·할인가 제외) | 9개 |
| `test_reasons.py` | Reason 선택 규칙 | 8개 |
| `test_environment.py` | 날씨·대기질 판정 | 9개 |
| `test_ranking.py` | Soft 랭킹, 실내외, 관심사 순위 | 포함 |
| `test_route.py` | 루트 조립, 스케줄 체인, 예산 롤업 | 9개 |
| `test_chat_agent.py` | tool 라우팅, 멀티턴 | 5개+ |
| `test_rag.py` | RAG 검색, 근거 판정, refuse | 6개 |
| `test_exclusion.py` | 장소 배제, 개념 배제 | 2개+ |
| `test_preferences_merge.py` | 선호 병합 (Request > Preference) | 6개 |
| `test_input_validation.py` | 가용시간 경계 검증 | 8개 |
| **합계** | | **약 151개 이상** |

모든 테스트는 CI 기준 `pytest` 통과를 커밋 전 확인한다.

---

## 12. 핵심 설계 원칙 및 신뢰 불변식

CLAUDE.md §6에 정의된 8개 불변식. 코드 리뷰·구현 시 체크리스트로 사용한다.

### 1. 미확인을 긍정으로 바꾸지 않는다

빈값·모호값을 `free`·`예약 불필요`·`이용 가능`으로 매핑하는 코드가 없어야 한다. `domain/normalize.py`가 단일 지점으로 정규화해 이 원칙을 보장한다.

### 2. LLM이 사실을 생성하지 않는다

가격·운영시간·예약 가능 여부·좌표를 LLM 출력에서 받지 않는다. `agent/orchestrator.py`에서 이 값들은 공식 API(`sources/`)와 `domain/` 코드만 산출한다. LLM은 note 파싱, tool 라우팅, Reason 문장 생성에만 개입한다.

### 3. 숫자 임의 생성 금지

체류시간·이동시간을 근거 없이 60/90/20분으로 채우지 않는다. 공식 `spendtime`이 없으면 유형 기준 표준(Planned, 표기됨)을 쓰고 근거를 명시한다.

### 4. Hard 충돌 후보는 정상 추천에 섞이지 않는다

`resolve_status()`가 `None`을 반환한 후보는 결과 배열에 포함되지 않는다. 대체 후보는 `_ENRICH_POOL`에서 Hard 제외분을 보충하되 강제 채움 아님.

### 5. 강제 채움 금지

A 후보 최대 4개·B 루트 최대 8스톱이지만 숫자를 맞추려고 부적합 후보를 채우지 않는다. 0건은 0건으로 명시한다.

### 6. 개인화가 사실/필수 조건을 덮어쓰지 않는다

우선순위: Request > Trip > Preference. 걷기 선호는 base_radius(탐색 반경)만 조정하며 Hard 캡이 아님. 반경 확대 편입분은 `from_widened_search=true` + 프론트 "Far" 칩으로 투명 표시. `reconcile_reversals`: 현재 Request가 과거 Preference를 이긴다.

### 7. 선택 ≠ 방문

GPS 자동 방문 판정·턴바이턴 내비게이션 없음. Select 버튼 탭이 유일한 확정 동작.

### 8. AI 관여 고지·확인/미확인 구분 UI를 제거하지 않는다

모든 결과 상단에 "AI-assisted results · unconfirmed details marked" AI 고지가 유지된다. 미확인 flag 칩(`UnconfirmedFlag`)은 결과 카드에 항상 표시된다.

---

## 13. 개발 히스토리 (Phase별 요약)

### Phase 0 — Walking Skeleton

**목적:** 프론트→백→프론트 1줄 관통 + 배포 배선.

핵심 결정:
- API 계약을 Pydantic으로 먼저 확정 (contract-first)
- 공통 Envelope 응답 포맷으로 ok/error/trace_id 통일
- httpx 로거를 WARNING으로 올려 API 키 로그 노출 차단

### Phase 1 — A 즉시 추천 (A1~A8)

- **A1:** 입력 스키마·가용시간 경계 검증·LF-02 입력 UI
- **A2:** TourAPI 실연동·3문화타입 병렬 조회·정규화 단일 지점
- **A3:** 운영시간·휴무 판정·3상태 산정·Hard 제외. 54개 pytest
- **A4:** Tmap 도보 경로·Naver 지도 렌더·Google Maps 딥링크
- **A5:** LangChain note 파싱·Reason Copy 17개 코드 선택. 74개 pytest
- **A6:** 선택 확정·localStorage·홈 복귀 배너
- **A7:** 로딩 shimmer·AbortController Cancel·오류 화면·0건 처리·grip 스와이프 닫기
- **A8:** Soft 랭킹 A안 (fits→alternative→check 순, 관심사 tiebreak, 거리순)
- **날씨·대기질 Context:** KMA·AirKorea 연동, 배너 표시, 야외 Soft 강등

데이터 품질 개선: check_needed 73%→42%, fits 20%→51% (detailInfo2 연동 + LLM 운영시간 추출)

### Phase 2 — 로그인·개인화

- **L1:** Supabase Auth JWKS 검증, Anonymous Sign-in, Google OAuth, identity linking, user_sessions RLS, "Find new options" 로그인 유도 게이트
- **L2:** 선호 온보딩 (P9-1 1화면, 관심사 6개+걷기), onboarded_at 마커
- **L3:** My Page (MP-1·2·3), preference-form 컴포넌트 온보딩·MP 공용화

### Phase 3 — RAG·B 문화루트·챗봇 Agent

- **R1:** pgvector RAG 적재(27청크/5문서)·검색·근거 판정·refuse 로직
- **AG-1/2:** LangChain tool-calling 챗봇 라우터 (FAQ/추천/루트 3-way)
- **AG-3:** 멀티턴 대화 (stateless, history 전송, 후속 교정)
- **AG-4:** 챗봇 UI (chat.js, Trip 칩, 제안칩, kind별 렌더)
- **AG-5/2b:** agentic 루프, recommend_route tool, LLM 조건해석→멀티소스→후보 재투입
- **옵션3:** exclude_concepts LLM 의미 분류 배제 (0건 세이프, ✕ 되돌리기, notices 배너)
- **B1~B5:** 문화루트 입력·조립·지도·수정·루트명. Soft 랭킹 B안(관심사 선발+순위), 실내외 선호(LLM 분류), 계획 방문시간(Official/Planned), build_schedule 체인, 장소 제외 대화 후속 교정

### Phase 4 — 배포·실사용자 검증

- Render(백엔드)·Vercel(프론트엔드) 배포 완료. 외부 URL 상시 동작.
- 실사용자 5명 이상 테스트·피드백 반영 문서화.
- GitHub 히스토리·README 정비. 시연 영상 첨부.

---

*이 리포트는 `agent-flow.md`·`CLAUDE.md`·소스코드를 기반으로 작성되었습니다.*
*최신 상태는 `agent-flow.md`의 체크박스를 참조하세요.*
