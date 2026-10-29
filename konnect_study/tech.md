# KONNECT 기술 스택 상세 분석
> 생성일: 2026-10-27 | 관련: [01-repo-tree.md](./01-repo-tree.md) | [06-platform-assessment.md](./06-platform-assessment.md)

---

## 1. 기술 레이어 전체 지도

```
┌─────────────────────────────────────────────────────────┐
│  Frontend (Vercel)                                       │
│  Vanilla JS · ES Modules · Naver Maps SDK               │
│  https://codyssey-konnect-frontend.vercel.app/          │
└────────────────────┬────────────────────────────────────┘
                     │ REST API (HTTPS, Envelope 봉투)
┌────────────────────▼────────────────────────────────────┐
│  Backend (Render free tier)                              │
│  Python 3.12 · FastAPI · uvicorn                        │
│  https://codyssey-konnect.onrender.com                  │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │ agent/   │  │ domain/  │  │ sources/ │              │
│  │LangChain │  │결정론 판정│  │외부API클  │              │
│  │파이프라인 │  │순수함수  │  │라이언트  │              │
│  └──────────┘  └──────────┘  └──────────┘              │
│  ┌──────────┐  ┌──────────┐                             │
│  │  rag/    │  │  db/     │                             │
│  │pgvector  │  │Supabase  │                             │
│  │FAQ검색   │  │세션·선호  │                             │
│  └──────────┘  └──────────┘                             │
└────────────────────────────────────────────────────────-┘
         │              │             │
    ┌────▼────┐   ┌─────▼────┐  ┌────▼───────┐
    │ OpenAI  │   │Supabase  │  │외부 공공API │
    │GPT-4o   │   │Postgres  │  │TourAPI 등   │
    │Embedding│   │pgvector  │  │Tmap·Places  │
    └─────────┘   │Auth(JWT) │  └────────────┘
                  └──────────┘
```

---

## 2. 확정 기술 스택

### 2-1. 프론트엔드

| 항목 | 내용 |
|------|------|
| **언어** | 순수 Vanilla JavaScript (ES2020+ Modules) |
| **프레임워크** | **없음** (React/Vue 금지 — CLAUDE.md §2) |
| **HTML** | 단일 `index.html` SPA — `#view`에 페이지 동적 주입 |
| **CSS** | 커스텀 BEM 클래스 + `tokens.css` (디자인 토큰 정본) |
| **폰트** | Inter (Google Fonts CDN, Regular/Medium/SemiBold/Bold) |
| **지도** | Naver Maps JavaScript SDK v3 (`oapi.map.naver.com`) — 동적 로드 |
| **인증** | Supabase JS Client v2 (`esm.sh`에서 동적 import) |
| **배포** | Vercel (Static Hosting, `vercel.json` 설정) |
| **도메인** | `https://codyssey-konnect-frontend.vercel.app/` (배포 완료) |

**⚠️ 특이점:** `auth.js`가 `https://esm.sh/@supabase/supabase-js@2`에서 동적 import. esm.sh는 CDN이지만 버전이 `@2`로 고정되지 않아 semver minor 업데이트 위험 존재.

### 2-2. 백엔드

| 항목 | 내용 |
|------|------|
| **언어** | Python 3.12+ |
| **가상환경** | venv (`.venv/`) |
| **웹 프레임워크** | FastAPI 0.115+ |
| **서버** | uvicorn[standard] 0.30+ |
| **스키마 검증** | Pydantic v2.7+ (BaseModel, computed_field) |
| **설정 관리** | pydantic-settings 2.3+ (`Settings` 싱글톤, `.env` 자동 로드) |
| **비동기 HTTP** | httpx 0.27+ (비동기, AsyncClient) |
| **재시도** | tenacity 8.2+ (지수 백오프, 3회) |
| **배포** | Render (free tier, `render.yaml`, `python -m uvicorn`) |
| **도메인** | `https://codyssey-konnect.onrender.com` (배포 완료) |
| **JWT 검증** | PyJWT 2.8+ + JWKS (`/auth/v1/.well-known/jwks.json`) |

### 2-3. AI / Agent

| 항목 | 내용 |
|------|------|
| **LLM 제공자** | OpenAI API |
| **추론 모델** | `gpt-4o` (기본, 사용자-facing 설명·RAG 답변) |
| **경량 모델** | `gpt-4o-mini` (`orchestrator_model` — tool 선택·분류·추출) |
| **임베딩 모델** | `text-embedding-3-small` (1536차원, RAG + 시맨틱 랭킹) |
| **Agent 프레임워크** | LangChain 0.3+ (LangChain-OpenAI, ChatOpenAI, ChatPromptTemplate) |
| **LangGraph** | **미사용** (CLAUDE.md §2 — 명시 제외) |
| **Tracing** | LangSmith 연동 선택적 (`LANGCHAIN_TRACING_V2=false` 기본) |
| **Structured output** | `llm.with_structured_output(PydanticModel)` |

**Agent 루프 상태:**
- `agent_loop` 설정: `config.py` 기본값 `True` (`.env` 없으면 켜짐)
- `.env.example`에는 `AGENT_LOOP=false` — **불일치 주의** (주석도 "기본 off" 라고 잘못 기재)
- `agent_loop=True`: `run_chat_loop()` (최대 6 스텝 while-loop, 멀티인텐트 지원)
- `agent_loop=False`: `run_chat()` (단일 라우팅 fallback, 멀티인텐트 두 번째 의도 버림)

### 2-4. 데이터베이스 / 인증

| 항목 | 내용 |
|------|------|
| **서비스** | Supabase (PostgreSQL 기반) |
| **인증** | Supabase Auth — Google OAuth + Anonymous Sign-in |
| **JWT 방식** | 비대칭 서명 (ES256/RS256) — 백엔드가 JWKS로 검증 |
| **벡터 검색** | pgvector 확장 + `vecs` 라이브러리 (RAG 임베딩 저장·조회) |
| **Python 클라이언트** | `supabase-py` 2.6+ (REST API) + `vecs` 0.4+ (pgvector 직결) |
| **연결 방식** | REST: `SUPABASE_PUBLISHABLE_KEY/SECRET_KEY` | pgvector: `SUPABASE_DB_URL` (Postgres DSN) |
| **RLS** | 전 테이블 Row Level Security 활성화 (자기 행만 접근) |

**DB 스키마 4개 테이블:**

```sql
user_sessions (user_id PK, last_request jsonb, current_choice jsonb, current_route jsonb, updated_at)
user_preferences (user_id PK, interests text[], prefer_shorter_walks boolean, onboarded_at, updated_at)
chat_messages (id bigint PK, user_id, role text, content text, created_at)
-- 모두 auth.users(id) 참조, CASCADE DELETE, RLS 정책
```

### 2-5. 지도 / 이동

| 항목 | 내용 |
|------|------|
| **지도 렌더링** | Naver Maps JavaScript SDK v3 (프론트, ncpKeyId로 도메인 제한) |
| **도보 경로** | Tmap 보행자 경로 API (백엔드 프록시, pedestrian route) |
| **외부 길찾기** | Naver Map 딥링크 `map.naver.com/p/directions` (외국인 영어 경로) |
| **Provenance** | 도보시간 = `estimate` (실제 ETA 보장 아님) |

**⚠️ 지도 등록 필요:** Naver Maps SDK는 NCP 콘솔에서 **Web 서비스 URL 등록** 필요. 미등록 도메인은 지도 로드 실패.

### 2-6. 외부 데이터 API

| 서비스 | 키 | 용도 | 실패 처리 |
|--------|-----|------|-----------|
| **TourAPI (EngService2)** | `DATA_GO_KR_SERVICE_KEY` | 문화장소 목록·상세(운영시간·요금) | 전부 실패 시 503 (필수) |
| **서울문화포털** | `SEOUL_OPENAPI_KEY` | 당일 문화행사 | 실패 시 graceful (선택) |
| **기상청 초단기실황** | `DATA_GO_KR_SERVICE_KEY` | 날씨 Context | 실패 시 빈 dict |
| **에어코리아** | `DATA_GO_KR_SERVICE_KEY` | 공기질 Context | 실패 시 빈 dict |
| **Tmap 보행자** | `TMAP_API_KEY` | 도보 경로선·거리·시간 | 실패 시 None (지도 폴백) |
| **Google Places (New)** | `GOOGLE_PLACES_API_KEY` | businessStatus 폐업 신호 + 보조 보강 | 실패 시 None (graceful) |
| **Naver Maps** | `NAVER_MAP_CLIENT_ID` | 지도 렌더링 (프론트) | SDK 로드 실패 시 지도 숨김 |

**공공데이터포털 키 공유:** TourAPI·기상청·에어코리아는 **동일 키(`DATA_GO_KR_SERVICE_KEY`)** 사용. 단 각 API별 활용신청 별도 필요.

### 2-7. 개발·테스트 도구

| 도구 | 버전 | 용도 |
|------|------|------|
| `pytest` | 8.2+ | 44개 단위 테스트 |
| `pytest-asyncio` | 0.23+ | 비동기 테스트 |
| `respx` | 0.21+ | httpx 외부 API 모킹 |
| `ruff` | 0.5+ | Python 린트 |
| `black` | 24.4+ | Python 포매터 |

---

## 3. 외부 API 키 의존도 매트릭스

| 키 | 필수 여부 | 없으면? | 획득처 |
|----|-----------|---------|--------|
| `OPENAI_API_KEY` | **필수** | 추천·채팅·임베딩 전부 불가 | platform.openai.com |
| `SUPABASE_URL` + `SUPABASE_PUBLISHABLE_KEY` + `SUPABASE_SECRET_KEY` | **필수** | 세션·선호·인증 불가 | supabase.com |
| `DATA_GO_KR_SERVICE_KEY` | **필수** | TourAPI 실패 → 추천 불가 | data.go.kr (공공데이터포털) |
| `NAVER_MAP_CLIENT_ID` | **필수** (UI) | 지도 없이 카드만 표시 | console.ncloud.com |
| `TMAP_API_KEY` | **권장** | 도보 경로선 없음, 거리 추정 불가 | openapi.sk.com |
| `GOOGLE_PLACES_API_KEY` | 선택 | 폐업 신호 없음 (graceful) | console.cloud.google.com |
| `SEOUL_OPENAPI_KEY` | 선택 | 서울 당일 행사 없음 (graceful) | data.seoul.go.kr |
| `SUPABASE_DB_URL` | 선택 (RAG) | `/api/ask` 503, 추천·채팅 무영향 | Supabase → Connect |
| `LANGCHAIN_API_KEY` | 선택 (디버깅) | LangSmith 트레이싱 없음 | smith.langchain.com |
| `KOPIS_API_KEY` | 미사용 | KOPIS 제외 결정 (docs §6.10) | — |

**최소 동작 키 세트:** `OPENAI_API_KEY` + `SUPABASE_*` 3개 + `DATA_GO_KR_SERVICE_KEY` + `NAVER_MAP_CLIENT_ID` = **6개**

---

## 4. 배포 구성

### 4-1. 백엔드 (Render)

```yaml
# render.yaml 요약
서비스명: konnect-api
플랜: free (cold start ~30초 주의)
런타임: Python 3.12.8
빌드: pip install -r requirements.txt
시작: uvicorn app.main:app --host 0.0.0.0 --port $PORT
헬스체크: GET /health
환경변수: APP_ENV=production + 시크릿 8개 (대시보드 입력)
```

**Cold Start 대응:** 프론트 `app.js`에 3.5초 이상 걸리면 "Waking up the service..." 문구 표시. splash 최소 0.5초 유지.

### 4-2. 프론트엔드 (Vercel)

```json
// vercel.json
{ "cleanUrls": true, "trailingSlash": false }
```

프론트 API 베이스 URL: `js/config.js`에 `https://codyssey-konnect.onrender.com` 하드코딩됨.

**⚠️ CORS 설정:** Render `render.yaml`의 `CORS_ALLOW_ORIGINS`가 `https://REPLACE-WITH-VERCEL-URL.vercel.app` (미교체 placeholder). 실제 `backend/app/config.py`의 `cors_allow_origins` 기본값은 `localhost:5500`이므로, **Render 대시보드에서 실제 Vercel URL을 직접 설정했을 것**.

### 4-3. 로컬 개발 실행

```bash
# 백엔드
cd backend
python3.12 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp ../.env.example ../.env  # 값 직접 입력 필요
uvicorn app.main:app --reload  # http://localhost:8000

# 프론트 (별도 터미널)
cd frontend
python -m http.server 5500  # http://localhost:5500
```

**환경변수 로딩 경로:** `backend/app/config.py`가 `parents[2]/.env`를 로드 → 즉 **리포지토리 루트의 `.env`** (backend 폴더의 `.env`가 아님).

---

## 5. 아키텍처 패턴 & 설계 원칙

### 5-1. API 응답 봉투 (Envelope)

모든 백엔드 응답은 공통 봉투:
```json
{ "ok": true, "trace_id": "abc123", "data": {...}, "error": null }
{ "ok": false, "trace_id": "abc123", "data": null, "error": {"code": "...", "message": "..."} }
```
0건은 `ok=true, data.candidates=[]` (예외가 아님). 시스템 오류만 `ok=false`.

### 5-2. 레이어 의존 방향

```
sources/ (외부 API 클라이언트)
    ↓
domain/ (정규화·판정 순수함수)
    ↓
agent/ (파이프라인 오케스트레이션)
    ↓
api/ (FastAPI 라우터 — 얇게 유지)
```

`sources/`는 `domain/`을 모른다. `domain/`은 `sources/`를 모른다.

### 5-3. 신뢰 불변식 (코드에서 강제)

1. **미확인 ≠ 무료:** `price_status = "unknown"` (빈 값 → `"free"` 매핑 금지)
2. **LLM은 사실을 생성하지 않는다:** 가격·시간·좌표는 공식 API만
3. **임의 숫자 생성 금지:** 체류시간은 코드가 계산, 이동시간은 Tmap API만
4. **Hard 충돌은 정상 추천에 섞이지 않는다:** `TimingVerdict.CLOSED` → 제외
5. **강제 채움 금지:** 3개 맞추려고 부적합 후보 넣지 않음
6. **0건-세이프:** 배제가 모든 후보를 지우면 배제를 무효화하고 안내
7. **개인화 > 사실 불가:** Request > Trip > Preference 순서, Preference가 Hard 제외할 수 없음

### 5-4. 캐싱 금지

외부 API 응답을 캐시하지 않음 (API 정책 + 신선도). 매 요청 직접 조회. chat_messages에 저장하는 것은 "대화 텍스트" (사실값 아님).

---

## 6. LLM 호출 지점 인벤토리

| 위치 | 모델 | 역할 | 사실 생성? |
|------|------|------|-----------|
| `agent_loop.py` | orchestrator_model | tool 선택 (RecommendExperiences/PlanCultureRoute/AnswerTravelQuestion) | ❌ |
| `agent_loop.py` | openai_model | 최종 응답 산문 작성 | ❌ (코드 결과 참조만) |
| `chat_agent.py` | openai_model | 단일 라우팅 응답 | ❌ |
| `note_parser.py` | orchestrator_model | note → ParsedConditions 구조화 | ❌ (추출만) |
| `classify.py` | orchestrator_model | 실내외·선호 적합도 분류 | ❌ (분류만) |
| `exclude_classifier.py` | orchestrator_model | 배제 개념 매칭 분류 | ❌ (분류만) |
| `hours_parser.py` | orchestrator_model | 운영시간 자유기술 → 구조화 재추출 | ❌ (추출만) |
| `translate.py` | orchestrator_model | 한→영 번역 | ❌ |
| `rag/retrieve.py` | openai_model | RAG 근거 범위 내 답변 | ❌ (근거 있을 때만) |
| `semantic_rank.py` | OpenAI Embeddings | 목록 유사도 계산 | ❌ |

**패턴:** LLM은 분류·추출·정렬·산문 설명만. 가격·시간·좌표·가용성 생성 없음.

---

## 7. 알려진 기술 부채 & 미구현

| 항목 | 위치 | 상태 |
|------|------|------|
| Agentic 2b 아키텍처 | `docs/agent-architecture.md` §4 | 미구현 (목표 아키텍처) |
| KOPIS 연동 | `docs/data-quality.md` | 제외 결정 (레이트·커버리지 문제) |
| LangSmith 트레이싱 | `core/trace.py` 주석 | 선택적 (기본 비활성) |
| eval golden_set | `eval/golden_set.json` | 쿼리 3개 (소량) |
| pgvector RAG 임베딩 적재 | `rag/ingest.py` | DB URL 없으면 503 |
| 좌표 없는 서울 행사 | `seoulculture.py` | 좌표 없으면 drop (정상 동작) |
| `PROD_API` 변수 | `frontend/js/config.js` | 미완성 placeholder (실제 URL은 아래 줄에 직접 작성됨) |
| CORS_ALLOW_ORIGINS placeholder | `render.yaml` | Render 대시보드에서 직접 설정 필요 |

---

## 8. 관련 문서

- [01-repo-tree.md](./01-repo-tree.md) — 전체 디렉터리 트리
- [02-code-index.md](./02-code-index.md) — 파일별 함수 인덱스
- [06-platform-assessment.md](./06-platform-assessment.md) — 해커톤 플랫폼 가능성 평가
- [07-handover-guide.md](./07-handover-guide.md) — 인계 가이드
