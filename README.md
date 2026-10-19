# KONNECT

> 서울 자유여행 중인 외국인 FIT에게, **지금 조건(위치·날짜·가용시간·운영조건)에서 실제로 가능한 문화경험**을 좁혀주는 모바일-퍼스트 웹 서비스.

코디세이 AI 네이티브 Final Project 결과물로, **기획(Planning) · 디자인(Design) · 개발(Code)** 세 영역의 산출물을 하나의 저장소에 모았습니다.

---

## 1. KONNECT란

서울의 문화정보는 여러 채널에 흩어져 있어, 외국인 자유여행자가 위치·시간·운영조건·가격·예약조건을 함께 비교해 **지금 자신에게 실제 가능한 문화경험**을 판단하기 어렵습니다. KONNECT는 이 판단을 대신 좁혀줍니다.

- **문제** — 흩어진 문화정보를 외국인이 직접 교차 비교하기 어렵다.
- **핵심 가치** — 개인화 추천 자체가 아니라, **현재 조건에서 실제 가능한 문화경험을 확인해 선택을 좁힌다.**
- **제1 원칙(신뢰·안전)** — **미확인 ≠ 무료 / 예약 불필요 / 이용 가능 보장.** 확인되지 않은 정보를 추정으로 메우지 않는다.

### 핵심 기능

| 기능 | 제공 가치 |
|---|---|
| **즉시 추천 (A)** | "지금 바로 뭘 할 수 있을까?" — 현재 위치·시각·가용시간을 기준으로 실제 선택 가능한 문화경험을 소수 후보로 좁힘 |
| **특정 날짜 문화루트 (B)** | "반나절을 문화경험으로 어떻게 채울까?" — 날짜·시작점·시작 시각·종료 경계 4값을 확인해 2~3개를 방문 순서가 있는 **루트 1개**로 연결 |
| **기존 여행계획 · 공통 선택 정보** | 사용자가 이미 정해둔 일정을 A·B 추천에 선택적으로 반영 |
| **로그인 · My Page** | Google 소셜 로그인, 확인된 선호·여행 맥락·현재 선택 상태 저장·재사용 |

추천은 단일 LLM 호출이 아니라 **다단계 AI Agent 파이프라인**으로 동작합니다:

```
[structure] 조건 구조화 → [fetch] 공식 API 조회 → [judge] 사실·제약 판정(+미확인 분리)
         → [compose] 후보·루트 구성(재판단 루프) → [explain] 근거·불확실성 설명
```

판정은 결정론적 **코드**로, 설명만 **LLM**으로 수행하며, LLM이 가격·운영시간·좌표 같은 사실을 생성하지 못하게 분리합니다.

---

## 2. 담당 영역과 팀

| 담당 | 역할 | 주요 산출물 |
|---|---|---|
| **이용택** (Tech·팀장) | 개발 전반, AI Agent·백엔드·프론트엔드, 개발용 PRD·디자인 개발 핸드오프 문서 관리 | [`backend/`](./backend), [`frontend/`](./frontend), [`PRD.md`](./PRD.md), [`DESIGN.md`](./DESIGN.md), [`docs/`](./docs) |
| **정민규** (Product) | 제품 기준·의사결정·조사 근거, IA | [`planning/`](./planning) |
| **손희영** (UX/UI) | 화면·컴포넌트·디자인 토큰·3D 아이콘·일러스트 (Figma 정본) | [`design/`](./design) |

> 역할 경계: **Product**가 입력·동작·결과·상태·Fallback·신뢰·완료기준을 정의하고, **UX/UI**가 이를 유지하며 설계하고, **Tech**가 구체 구현을 결정합니다. 기준 충돌 시 우선순위는 `planning 최신 Product 기준 > PRD.md > CLAUDE.md > 코드 주석`.

---

## 3. 저장소 구성

```
code/
├─ CLAUDE.md        # 개발 기술 기준·컨벤션·작업 규칙 (AI·팀 공통 진입점)
├─ PRD.md           # 개발용 PRD — 구현 범위·기능/비기능 요구·데이터·AI 동작·완료기준
├─ DESIGN.md        # 디자인 규칙·컴포넌트·화면·상태 시각 규칙
├─ agent-flow.md    # 권장 개발 순서(Phase 0~4)·슬라이스별 체크리스트
├─ backend/         # 개발 — FastAPI + LangChain
├─ frontend/        # 개발 — 순수 HTML/CSS/JS
├─ docs/            # 개발 — 아키텍처·데이터 품질·평가·테스트 기록
├─ planning/        # 기획 — Product 기준·의사결정·조사 근거
└─ design/          # 디자인 — 화면·아이콘·일러스트·발표물
```

### 📦 개발 (`backend/` · `frontend/` · `docs/`)

순수 **HTML/CSS/Vanilla JS** 프론트엔드와 **Python 3.12 / FastAPI** 백엔드. 프레임워크·빌드 도구를 쓰지 않습니다.

- **`backend/app/agent/`** — LangChain 기반 다단계 오케스트레이션(`orchestrator.py`, `route_orchestrator.py`), 분류·파싱·시맨틱 랭킹·챗 에이전트.
- **`backend/app/domain/`** — 결정론적 판정 로직(운영·시간·충돌·가격·예약·랭킹·제외·정규화·근거).
- **`backend/app/sources/`** — 외부 API 클라이언트(TourAPI · 서울문화포털 · 기상청 · AirKorea · Tmap · Google Places). 타임아웃·재시도 내장, **응답 캐싱 없음**.
- **`backend/app/rag/`** — FAQ·여행정보 지식베이스 Supabase pgvector 검색.
- **`backend/app/api/`** — 얇은 라우터(recommend · route · chat · ask · session · preferences · translate).
- **`frontend/js/pages/`** — 화면 로직(welcome · home · input · results · route · chat · mypage · onboarding …), `components/`는 재사용 DOM, `css/tokens.css`가 디자인 값 정본.
- **`docs/`** — [`agent-architecture.md`](./docs/agent-architecture.md), [`recommendation-and-search-quality.md`](./docs/recommendation-and-search-quality.md), 평가(`eval-*.json`)·테스트 기록 등 구현 증빙.

### 🗂 기획 (`planning/`)

확정된 Product 기준·의사결정 기록·조사 근거. 진입점은 [`planning/README.md`](./planning/README.md) → [`planning/product/README.md`](./planning/product/README.md).

- **`product/`** — 주제별 Product 기준: `01` 전체 범위 · `02` 입력·추천 · `03` 데이터·신뢰 · `04` 시간·문화루트 · `05` UX Handoff · `06` AI·Tech 경계 · `07` 모바일 웹 · `reason-copy-dictionary`.
- **`decisions/`** — D번호 결정 색인([`decision-log.md`](./planning/decisions/decision-log.md)).
- **`research/`** — TourAPI 실측·데이터 품질·Tech 검증·사용자 현장 검증 이력.

> Product 상세 정본은 Google Docs `KONNECT 제품 기획 기준서`이며, 저장소는 팀이 실제 작업에 참고하는 현재 기준·근거를 역할별로 분리해 관리합니다.

### 🎨 디자인 (`design/`)

디자이너(손희영)가 담당한 UX/UI 최종 산출물이며, 폴더 안 [`design/README.md`](./design/README.md)에 세부가 정리돼 있습니다. (이 산출물을 코드로 옮기기 위한 개발 핸드오프 문서 [`DESIGN.md`](./DESIGN.md)와 디자인 값 정본 `frontend/css/tokens.css`는 Tech가 작성·관리합니다.)

- **`screens/`** — 주요 화면 12종(메인 · A 즉시 추천 · B 문화루트 · 온보딩 · My Page).
- **`icons-3d/`** — 최종 3D 아이콘(문화경험 유형·지도 마커), **`icons-svg/`** — v1 선 아이콘.
- **`illustrations/`** — 메인 카드 일러스트, **`presentation/`** — 발표용 슬라이드.
- Figma: [Konnect-Design](https://www.figma.com/design/YQCE7JXtvy0fP1pLTwnS7k/Konnect-Design) (v1~v3 전달 기록 포함).
- 브랜드 teal `#007385` · Inter · 결과 3상태(조건 충족 / 추가 확인 필요 / 조건 완화 대안) 색 구분.

---

## 4. 기술 스택

| 레이어 | 기술 |
|---|---|
| Frontend | 순수 HTML / CSS / JavaScript (ES Modules · Fetch) — 프레임워크 없음 |
| Backend | Python 3.12+ / FastAPI (Pydantic 검증) |
| AI / Agent | OpenAI API + LangChain (Agent + Tools + Chains) |
| RAG / Vector | Supabase pgvector + OpenAI Embeddings |
| DB / Auth | Supabase (Postgres + pgvector + Supabase Auth, Google OAuth) |
| 지도·경로 | Naver Maps SDK(렌더) · Tmap API(도보 경로, 백엔드 프록시) · Naver Map 딥링크(외부 길찾기) |
| 외부 데이터 | TourAPI · 서울문화포털 · 기상청 · AirKorea · (보조) Google Places |
| 배포 | Frontend: Vercel · Backend: Render · DB: Supabase |

---

## 5. 로컬 실행

```bash
# Backend (Python 3.12+)
cd backend
python3.12 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload            # 개발 서버

ruff check . && black . && pytest         # 린트·포맷·테스트

# Frontend (정적)
cd frontend
python -m http.server 5500                # 로컬 확인
```

API 키는 모두 `.env`(gitignore)·배포 Secret으로 주입하며 **절대 커밋하지 않습니다**. 키 이름은 [`.env.example`](./.env.example) 참고.

---

## 6. 더 읽을거리

- **개발 시작** — [`CLAUDE.md`](./CLAUDE.md)(기술 기준·컨벤션), [`agent-flow.md`](./agent-flow.md)(개발 순서·체크리스트)
- **기능 요구·완료기준** — [`PRD.md`](./PRD.md)
- **디자인 규칙** — [`DESIGN.md`](./DESIGN.md)
- **제품 기준** — [`planning/product/README.md`](./planning/product/README.md)
