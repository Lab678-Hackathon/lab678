# 리포지토리 트리 & 역할 지도
> 생성일: 2026-10-27 | 기준 브랜치: main

---

## 루트 레벨

```
codyssey-konnect/
├─ CLAUDE.md              ← 개발 기준·컨벤션·신뢰 불변식 (Claude Code 자동 로드)
├─ PRD.md                 ← 기능 요구사항 전체 (FR-*, §4~§10)
├─ DESIGN.md              ← 디자인 토큰·컴포넌트·화면 스펙 (Figma 기준)
├─ README.md              ← 과제 제출용 (팀원·역할·실행법·Live Demo 링크)
├─ agent-flow.md          ← Phase 0~4 개발 순서 + 슬라이스별 체크리스트
├─ render.yaml            ← Render 백엔드 배포 명세 (free tier, python)
├─ .env.example           ← API 키 이름 목록 (값 없음 — 키 가이드)
├─ .gitignore             ← .env, __pycache__, .venv 등 제외
├─ 서비스시연_A녹화본_v3(최종).mov  ← 시연 영상 (~24MB)
├─ KONNECT v1 기능 요구사항 달성 점검표.xlsx  ← 체크리스트 스프레드시트
├─ backend/               ← FastAPI Python 백엔드
├─ frontend/              ← Vanilla JS 프론트엔드
├─ docs/                  ← 기술 문서·테스트 결과·아키텍처
├─ design/                ← Figma 스크린 PNG + 3D 아이콘
├─ planning/              ← 제품 기획·의사결정·사용자 리서치
└─ study/                 ← 이 분석 문서 모음 (2026-10-27 추가)
```

---

## backend/

```
backend/
├─ requirements.txt       ← Python 의존성 (FastAPI, OpenAI, LangChain, Supabase, httpx 등)
├─ pyproject.toml         ← 프로젝트 메타데이터 (pytest, ruff, black 설정)
├─ runtime.txt            ← Render용 Python 버전 지정 (python-3.12.x)
├─ db/
│  └─ migrations/
│     ├─ 0001_user_sessions.sql     ← user_sessions 테이블 + RLS 정책
│     ├─ 0002_user_preferences.sql  ← user_preferences 테이블 + RLS 정책
│     ├─ 0003_chat_messages.sql     ← chat_messages 테이블 + RLS 정책 (Long-term memory)
│     └─ 0004_session_current_route.sql  ← user_sessions에 current_route 컬럼 추가
├─ tests/                 ← 44개 pytest 파일 (아래 별도 목록)
└─ app/
   ├─ __init__.py
   ├─ main.py             ← FastAPI 앱 엔트리 (CORS·라우터·예외핸들러·/health·/api/config)
   ├─ config.py           ← pydantic-settings env 로딩 (Settings 싱글톤)
   ├─ api/                ← 라우터 (얇게 유지 — 로직은 agent/·domain/에)
   ├─ agent/              ← LangChain 파이프라인·tool-calling 루프
   ├─ domain/             ← 판정·정규화 순수 함수 (결정론 코드)
   ├─ sources/            ← 외부 API 클라이언트 (타임아웃·재시도 내장)
   ├─ rag/                ← pgvector 지식베이스 (임베딩·적재·검색·답변)
   ├─ models/             ← Pydantic 입출력 스키마
   ├─ db/                 ← Supabase 클라이언트·쿼리
   ├─ core/               ← 공통 auth·예외·trace
   └─ eval/               ← 검색품질 평가 CLI
```

### app/api/ — 7개 라우터

| 파일 | prefix | 주요 엔드포인트 | 비고 |
|------|--------|----------------|------|
| `recommend.py` | `/api` | `POST /parse`, `POST /recommend` | A 즉시추천 핵심 |
| `chat.py` | `/api` | `POST /chat`, `GET/DELETE /chat/history` | 챗봇 + Long-term memory |
| `route.py` | `/api` | `POST /route` | B 문화루트 |
| `ask.py` | `/api` | `POST /ask` | RAG FAQ 직접 질의 |
| `session.py` | `/api` | `GET/PUT /session` | 요청·선택 영속 |
| `preferences.py` | `/api` | `GET/PUT /preferences` | 사용자 선호 CRUD |
| `translate.py` | `/api` | `POST /translate` | 한→영 온디맨드 번역 |

### app/agent/ — AI 파이프라인 핵심 (14개 파일)

| 파일 | 줄 수 | 역할 |
|------|-------|------|
| `orchestrator.py` | 870 | **즉시추천(A) 다단계 파이프라인** (structure→fetch→judge→route→explain→compose) |
| `agent_loop.py` | 757 | **agentic while-loop** (LLM tool-calling, 최대 6 스텝) |
| `chat_agent.py` | 259 | 단일 라우팅 fallback (agent_loop=false일 때) |
| `route_orchestrator.py` | ~250 | B 문화루트 파이프라인 (A 조회·판정 재사용) |
| `classify.py` | ~90 | 후보 실내외 + 개방형 선호 적합도 LLM 분류 |
| `exclude_classifier.py` | ~80 | 개방형 배제 개념 LLM 의미분류 |
| `semantic_rank.py` | ~100 | 임베딩 유사도 기반 목록 단계 재정렬 (P2) |
| `note_parser.py` | ~80 | 자연어 note → ParsedConditions LLM 구조화 |
| `hours_parser.py` | ~60 | 운영시간 자유기술 → LLM 재추출 (UNCERTAIN→OPEN) |
| `translate.py` | ~40 | 한→영 번역 LLM 유틸 |
| `environment.py` | ~50 | 날씨(KMA)·공기질(AirKorea) 컨텍스트 조합 |
| `context.py` | ~30 | RequestContext 스키마 (Request>Trip>Preference 우선순위) |
| `tools/experiences.py` | ~80 | RecommendExperiences LangChain Tool |
| `tools/route.py` | ~60 | PlanCultureRoute LangChain Tool |
| `tools/knowledge.py` | ~50 | AnswerTravelQuestion LangChain Tool (RAG 연결) |
| `tools/schemas.py` | ~30 | Tool 입출력 스키마 (Pydantic) |

### app/domain/ — 판정·정규화 순수 함수 (19개 파일)

| 파일 | 역할 |
|------|------|
| `normalize.py` | TourAPI·서울 응답 → 공통 Candidate 스키마 정규화 |
| `exclusion.py` | 개방형 배제 선별·0건-세이프 (lexical + LLM match) |
| `timing.py` | 운영시간·휴무 판정 (TimingVerdict: OPEN/CLOSED/UNCERTAIN) |
| `operational.py` | 운영상태 종합판정 (Places businessStatus 폐업 신호 포함) |
| `budget.py` | 예산·무료 필터 (BudgetVerdict: FITS/OVER/UNKNOWN) |
| `ranking.py` | 표시 순서 소프트 랭킹 (관심사→상태등급→거리) |
| `reasons.py` | Reason Copy Dictionary 코드 선택 (LLM 생성 아님) |
| `route.py` | B 루트 조립·일정 구성·Tmap 경로 조합 |
| `status.py` | 3상태 ResultStatus 결정 (FITS/CHECK_NEEDED/ALTERNATIVE) |
| `conflict.py` | 실내외·관심사 충돌 감지 및 안내 문구 |
| `curation.py` | 문화경험 적합성 판정 (식당·쇼핑 제외) |
| `dedup.py` | 멀티소스 중복 제거 (좌표근접 교차확인) |
| `environment.py` | 날씨·공기질 판정 (Context만, 사실판정 아님) |
| `input_validation.py` | 입력 검증 (최소 60분, 자정 초과 금지 등) |
| `locations.py` | 좌표 계산·note 내 위치 감지·출발지 해석 |
| `preferences_merge.py` | 저장 선호 ↔ Request 병합 (Request 우선) |
| `reservation.py` | 예약·참여 확인 여부 판정 |
| `signals.py` | 분류 신호 추출 (실내외·정성 휴리스틱) |
| `text_signals.py` | 텍스트 실내외 감지 (LLM 없이 키워드) |

### app/sources/ — 외부 API 클라이언트 (6개 파일)

| 파일 | 서비스 | 키 | 용도 |
|------|--------|-----|------|
| `tourapi.py` | 한국관광공사 EngService2 | `DATA_GO_KR_SERVICE_KEY` | 핵심 문화장소 데이터 |
| `seoulculture.py` | 서울 열린데이터광장 | `SEOUL_OPENAPI_KEY` | 당일 문화행사 |
| `kma.py` | 기상청 초단기실황 | `DATA_GO_KR_SERVICE_KEY` | 날씨 Context |
| `airkorea.py` | 에어코리아 대기오염 | `DATA_GO_KR_SERVICE_KEY` | 공기질 Context |
| `tmap.py` | Tmap 보행자 경로 | `TMAP_API_KEY` | 도보 거리·시간·경로선 |
| `gplaces.py` | Google Places (New) | `GOOGLE_PLACES_API_KEY` | businessStatus 폐업 신호 + 보조 보강 |

### app/rag/ — 지식베이스 (5개 파일 + 6개 문서)

| 파일 | 역할 |
|------|------|
| `ingest.py` | 지식 문서 청크화 → pgvector 적재 CLI |
| `chunk.py` | 마크다운 문서 → 청크 분할 (tiktoken 기반) |
| `embed.py` | OpenAI text-embedding-3-small 래퍼 (1536차원) |
| `store.py` | vecs(pgvector) 컬렉션 CRUD |
| `retrieve.py` | 유사도 검색 → 근거 판정(SIM ≥ 0.35) → LLM 답변 |

**knowledge/ 지식 문서 6개:**
- `connectivity.md` — 서울 교통·인터넷·유심
- `culture-basics.md` — 한국 문화 기초 상식
- `etiquette.md` — 예절
- `konnect.md` — 서비스 자체 안내
- `money-language.md` — 화폐·언어
- `transport.md` — 대중교통 이용법

### app/models/ — Pydantic 스키마 (8개 파일)

| 파일 | 주요 모델 |
|------|-----------|
| `recommend.py` | `ParsedConditions`, `Candidate`, `RecommendData`, `InterestCode` |
| `route.py` | `RouteData`, `RouteStop`, `WalkSegment` |
| `chat.py` | `ChatRequest`, `ChatResponse`, `ChatTurn`, `ChatContext` |
| `session.py` | `SessionData` |
| `preferences.py` | `UserPreferences` |
| `rag.py` | `RagAnswer`, `RagCitation` |
| `envelope.py` | `Envelope[T]` (공통 응답 봉투) |
| `environment.py` | `EnvironmentContext` (날씨·공기질) |
| `translate.py` | `TranslateRequest/Response` |

### app/core/ — 공통 유틸 (3개 파일)

| 파일 | 역할 |
|------|------|
| `auth.py` | Supabase JWKS JWT 검증, `AuthUser`, `get_optional_user`, `get_current_user` |
| `exceptions.py` | `KonnectError` 계층 (SystemError, ExternalSourceError, ValidationFailure, AuthError) |
| `trace.py` | 요청별 12자리 UUID trace, 단계 로깅 |

### app/db/ — Supabase 쿼리 (4개 파일)

| 파일 | 역할 |
|------|------|
| `client.py` | supabase-py 클라이언트 싱글톤 |
| `sessions.py` | user_sessions CRUD |
| `preferences.py` | user_preferences CRUD |
| `chat.py` | chat_messages append/get/clear |

### app/eval/ — 검색품질 평가 (4개 파일)

| 파일 | 역할 |
|------|------|
| `run_eval.py` | eval CLI (`python -m app.eval.run_eval`) |
| `runner.py` | 골든셋 로딩·쿼리 실행·결과 수집 |
| `metrics.py` | recall@k, empty_rate, constraint_violation_rate, latency p50/p95 |
| `golden_set.json` | 골든 쿼리 3개 (recommend·route 모드) |

### tests/ — 44개 테스트 파일

```
tests/
├─ test_agent_loop.py          ← agentic 루프 동작 (multi-intent, tool routing)
├─ test_auth.py                ← JWT 검증 (정상·만료·익명·무효 케이스)
├─ test_budget.py              ← 예산 필터 판정
├─ test_chat_agent.py          ← 단일 라우팅 fallback
├─ test_chat_memory.py         ← Long-term memory (영속·복구·기기 간)
├─ test_chat_working_memory.py ← 멀티턴 맥락 (세션 내 기억)
├─ test_classify.py            ← 실내외·선호 LLM 분류 (mock)
├─ test_conflict.py            ← 실내외·관심사 충돌 감지
├─ test_curation.py            ← 문화경험 적합성 판정
├─ test_dedup.py               ← 멀티소스 중복 제거
├─ test_environment.py         ← 날씨·공기질 Context
├─ test_eval_metrics.py        ← eval 지표 계산
├─ test_exclusion.py           ← 개방형 배제·0건-세이프 (+5, 2026-10-07)
├─ test_input_validation.py    ← 입력 검증 (최소시간, 자정 초과)
├─ test_keyword_search.py      ← 키워드 검색 보강 (P2)
├─ test_locations.py           ← 위치 감지·좌표 해석
├─ test_loop_conflict_location.py ← 루프 내 충돌+위치 복합
├─ test_normalize.py           ← TourAPI·서울 정규화 (미확인≠무료 검증)
├─ test_note_parser.py         ← note 구조화 (LLM mock)
├─ test_operational.py         ← 운영상태 판정
├─ test_preferences_merge.py   ← 선호 병합 (Request 우선)
├─ test_radius_ladder.py       ← 적응형 반경 확장 (P1)
├─ test_rag.py                 ← RAG 검색·근거판정·답변·refuse
├─ test_ranking.py             ← 소프트 랭킹 순서
├─ test_reasons.py             ← Reason Copy 선택 규칙
├─ test_route_rebuild.py       ← 저장 루트 라이브 재조립
├─ test_route.py               ← B 루트 조립
├─ test_semantic_rank.py       ← 임베딩 랭킹 (P2)
├─ test_seoulculture.py        ← 서울문화포털 좌표 뒤바뀜 보정
├─ test_session.py             ← 세션 영속
├─ test_signals.py             ← 분류 신호 추출
├─ test_single_intent.py       ← 단일 인텐트 라우팅
├─ test_status.py              ← 3상태 ResultStatus
├─ test_text_signals.py        ← 텍스트 실내외 감지
├─ test_timing.py              ← 운영시간·휴무 판정
├─ test_tools_experiences.py   ← RecommendExperiences Tool
└─ test_tools_route_knowledge.py ← PlanCultureRoute + AnswerTravelQuestion Tool
```

---

## frontend/

```
frontend/
├─ index.html             ← SPA 단일 HTML (splah·device-frame·#view 구조)
├─ vercel.json            ← Vercel 배포 설정 (cleanUrls, trailingSlash=false)
├─ css/
│  ├─ tokens.css          ← 디자인 토큰 정본 (색·타이포·간격·브랜드 teal #007385)
│  └─ app.css             ← 전체 스타일 (component별 BEM 클래스)
├─ js/
│  ├─ config.js           ← API_BASE 자동 전환 (localhost↔Render URL)
│  ├─ app.js              ← SPA 뷰 컨트롤러·라우터 (338줄)
│  ├─ state.js            ← 클라이언트 상태 (request, candidates, selected, 위치, 선호)
│  ├─ api.js              ← 백엔드 호출 래퍼 (Envelope 처리, AbortController)
│  ├─ auth.js             ← Supabase Auth (익명세션·Google OAuth·JWT 제공)
│  ├─ map.js              ← Naver Maps SDK 래퍼 (핀·경로선·카메라 pan)
│  ├─ pages/              ← 11개 페이지 뷰 함수
│  └─ components/         ← 13개 재사용 DOM 컴포넌트
├─ assets/
│  ├─ favicon.svg         ← 브랜드 teal SVG 파비콘
│  ├─ icons/              ← 3D 아이콘 9종 (destination, home, start, type-*, walking, locate)
│  └─ img/                ← 홈화면 카드 이미지 2종 + welcome 히어로 이미지
```

### js/pages/ — 11개 화면 뷰

| 파일 | 줄 | 화면 | 비고 |
|------|-----|------|------|
| `welcome.js` | 40 | 웰컴 (LF-00) | 첫 진입, 1회만 표시 |
| `home.js` | 238 | 홈 (LF-01) | A/B 선택, My Pick, My Page 진입 |
| `input.js` | 375 | 입력 폼 (LF-02) | 날짜·시간·위치·note 입력 |
| `loading.js` | 98 | 로딩 (LF-02b) | AbortController로 취소 가능 |
| `results.js` | 365 | 추천 결과 (LF-03) | 카드 스와이프·지도 핀·상세·선택 |
| `choice.js` | 276 | 현재 선택 (LF-04) | My Pick 저장·공유 |
| `route.js` | 98 | B 루트 결과 (LF-08/09) | 지도+타임라인 |
| `chat.js` | 628 | 챗봇 (LF-06/07) | 멀티턴 대화·히스토리 복구 |
| `onboarding.js` | 62 | 온보딩 선호 (LF-10) | P-09 관심사·걷기 선호 설정 |
| `mypage.js` | 303 | My Page (LF-05) | 계정·선호·저장 루트 관리 |
| `error.js` | 57 | 에러 화면 | 전역 에러 표시 |

### js/components/ — 13개 컴포넌트

| 파일 | 줄 | 역할 |
|------|-----|------|
| `sheet.js` | 81 | 바텀시트 베이스 컴포넌트 |
| `result-card.js` | 232 | 추천 결과 카드 (상태배지·Reason칩·이미지) |
| `route-card.js` | 329 | B 루트 카드 (타임라인·스톱·도보시간) |
| `saved-route-card.js` | 55 | 저장된 루트 카드 (My Page) |
| `condition-summary.js` | 64 | 추천 조건 요약 칩 표시 |
| `confirm-sheet.js` | 174 | 확인 시트 (Without 칩·되돌리기) |
| `date-sheet.js` | 160 | 날짜 선택 바텀시트 |
| `time-sheet.js` | 186 | 시간 선택 바텀시트 |
| `location-sheet.js` | 121 | 위치 선택 바텀시트 |
| `login-sheet.js` | 79 | 로그인 유도 바텀시트 |
| `pref-confirm.js` | 127 | 선호 저장 확인 시트 |
| `preference-form.js` | 241 | 온보딩 선호 입력 폼 |
| `directions-overlay.js` | 123 | 길찾기 딥링크 오버레이 |
| `translate-toggle.js` | 89 | 결과 상단 한→영 번역 토글 |
| `icons3d.js` | 65 | 3D 아이콘 경로 매핑 유틸 |

---

## docs/ — 기술 문서

| 파일 | 역할 |
|------|------|
| `agent-architecture.md` | Agentic 방향(옵션 2b) + 단계적 경로 + 신뢰 경계 |
| `data-quality.md` | TourAPI 실측 품질 분석 (박물관 taxonomy 한계 등) |
| `llm-prompts-inventory.md` | LLM 콜 전체 목록 (모델·역할·토큰 추정) |
| `soft-ranking.md` | 소프트 랭킹 A안/B안 비교 분석 |
| `recommendation-and-search-quality.md` | 검색 품질 개선 P1~P6 계획 |
| `manual-test-scenarios.md` | 수동 테스트 시나리오 (A1~A10, B1~B6, C1~C4) |
| `test-results-2026-10-09.md` | 268 테스트 Green 검증 결과 (시나리오별) |
| `eval-baseline.json` | eval 기준선 결과 |
| `eval-p1.json` ~ `eval-p4.json` | P1~P4 개선 후 eval 결과 |

---

## design/ — 디자인 에셋

```
design/
├─ figma-version-history.csv     ← Figma 버전 이력
├─ screens/                      ← 화면 PNG 12종 (LF-01~LF-12)
│  ├─ 01-home.png                ← 홈
│  ├─ 02-a-input.png             ← A 입력 폼
│  ├─ 03-a-confirm.png           ← A 확인 시트
│  ├─ 04-a-result.png            ← A 결과
│  ├─ 05-a-pick.png              ← A 선택
│  ├─ 06-a-choice.png            ← A My Pick
│  ├─ 07-a-save-to-my-pick-v3.png
│  ├─ 08-b-chat.png              ← B 챗봇
│  ├─ 09-b-route-result.png      ← B 루트 결과
│  ├─ 10-b-route-map.png         ← B 루트 지도
│  ├─ 11-onboarding-preferences.png ← 온보딩
│  └─ 12-my-page.png             ← My Page
└─ icons-3d/                     ← 3D 아이콘 원본 5종
```

---

## planning/ — 제품 기획 문서

```
planning/
├─ README.md                    ← 서비스 윤곽·현재 상태·담당자 읽기 경로
├─ team-operating-guideline.md  ← 팀 운영 가이드라인
├─ product/
│  ├─ 01-product-baseline.md    ← 범위·사용자·핵심가치·시나리오 (D-01~D-06)
│  ├─ 02-input-recommendation-rules.md ← 입력·Hard/Soft·후보 판정 (D-07~D-10)
│  ├─ 03-data-trust-policy.md   ← 데이터 소스·가격/예약·환경·신뢰 (D-09·D-11)
│  ├─ 04-route-time-rules.md    ← 기존계획·시간·문화루트 Fallback (D-12·D-13)
│  ├─ 05-ux-handoff.md          ← IA·LF-01~LF-10·완료기준
│  ├─ 06-ai-tech-boundary.md    ← AI 동작·PoC 검증·역할 경계 (D-14·D-15)
│  ├─ 07-mobile-web-guideline.md ← 모바일 웹 가이드라인
│  ├─ reason-copy-dictionary.md ← Reason Copy 17개·생성/억제 조건
│  └─ assets/
│     ├─ ia-sitemap-overview.svg     ← IA 사이트맵
│     └─ ia-structure-overview.svg   ← IA 구조 개요
├─ decisions/
│  ├─ decision-log.md           ← D번호 결정 상태 색인
│  └─ id-migration.md           ← 익명→정식 계정 마이그레이션 결정
└─ research/
   ├─ tourapi-validation_2026-09-19.md   ← TourAPI 실측 검증
   ├─ data-quality-validation_2026-09-25.md ← 데이터 품질 검증
   ├─ KONNECT_W2_추가데이터_Product직접검토_Tech확인요청_2026-09-23.md
   ├─ tech-validation/           ← Tech 검증 질의응답 4회 (0923~1004)
   └─ user-validation/
      ├─ 2026-10-16-field-test-report.md  ← 현장 테스트 보고서
      ├─ 2026-10-16-improvement-review.md ← 개선 협의안
      └─ 2026-10-18-v3-final-qa-feedback.md ← 발표 전 최종 QA (미결 이슈 포함)
```

---

## 파일 수 요약

| 영역 | 파일 수 |
|------|---------|
| 백엔드 Python | ~100 |
| 테스트 | 44 |
| 프론트엔드 JS/CSS/HTML | ~35 |
| SQL 마이그레이션 | 4 |
| 배포 설정 | 2 (`render.yaml`, `vercel.json`) |
| 문서 (md/json) | ~40 |
| 디자인 에셋 (png/svg/csv) | ~25 |
| **전체** | **281** |
