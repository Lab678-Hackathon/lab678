# KONNECT 코드베이스 조사 계획
> 목적: 해커톤 플랫폼 전용 가능성 파악 + 코딩팀 부재 상태에서 인계 가능성 평가
> 작성일: 2026-10-27 | 저장 위치: `study/`

---

## 0. 현황 요약 (스캔 결과)

| 항목 | 수치 |
|------|------|
| 전체 파일 수 | 281개 (`.git` / `__pycache__` 제외) |
| 백엔드 Python 파일 | ~100개 |
| 프론트엔드 JS/CSS/HTML | ~35개 |
| 테스트 파일 | 44개 (`tests/test_*.py`) |
| 문서 (md/json) | ~40개 |
| 디자인 에셋 (png/svg/csv) | ~25개 |
| DB 마이그레이션 SQL | 4개 |
| 배포 설정 파일 | 2개 (`render.yaml`, `vercel.json`) |

---

## 1. 조사 범위 & 7개 산출물

| # | 산출물 | 파일명 | 내용 |
|---|--------|--------|------|
| 1 | **리포지토리 트리 + 역할 지도** | `01-repo-tree.md` | 전체 디렉터리 트리 + 각 파일의 한 줄 역할 설명 |
| 2 | **코드 인덱스** | `02-code-index.md` | 파일 → 클래스/함수 목록 (순방향) |
| 3 | **역방향 인덱스** | `03-reverse-index.md` | 함수/클래스 → 어느 파일에 있나, 어디서 호출되나 (역방향) |
| 4 | **기술 스택 분석** | `tech.md` | 사용 기술·버전·API 종속성·외부 키 의존성 상세 |
| 5 | **독스트링 추가** | (각 소스 파일 수정) | 파일 개요·클래스·함수 독스트링 + 인라인 주석 |
| 6 | **플랫폼 가능성 평가** | `06-platform-assessment.md` | 완성도·위험요소·해커톤 적합성 종합 판단 |
| 7 | **인계 가이드** | `07-handover-guide.md` | 코딩팀 없는 상태에서 다음 사람이 켜서 돌릴 수 있는 체크리스트 |

---

## 2. 조사 단계별 계획

### Phase 1 — 구조 파악 (리포지토리 트리 + 기술 스택)
**목표:** 전체 지도를 만든다. 코드를 읽기 전에 "무엇이 어디 있는지" 확정.

| 작업 | 체크 |
|------|------|
| 전체 파일 트리 생성 (디렉터리별 역할 태그) | ☐ |
| `requirements.txt` → 의존 라이브러리 버전·역할 정리 | ☐ |
| `.env.example` → 필요한 외부 API 키 목록화 | ☐ |
| `render.yaml` / `vercel.json` → 배포 파이프라인 분석 | ☐ |
| DB 마이그레이션 SQL 4개 → 스키마 정리 | ☐ |
| → **산출물:** `01-repo-tree.md`, `tech.md` 초안 | |

**예상 시간:** 조사 1회차

---

### Phase 2 — 백엔드 핵심 코드 독해 (Agent + Domain + API)
**목표:** 실제 비즈니스 로직이 어떻게 작동하는지 이해. 가장 중요한 단계.

#### 2-A. FastAPI 진입점 & 라우터
| 파일 | 확인할 것 |
|------|-----------|
| `main.py` (108줄) | 라우터 등록, CORS, 헬스체크, lifespan |
| `config.py` | env 변수 목록, 기본값, 필수값 |
| `api/recommend.py` | 핵심 추천 엔드포인트 입출력 |
| `api/chat.py` | 대화 에이전트 엔드포인트 |
| `api/route.py` | 루트(경로) 계산 엔드포인트 |
| `api/ask.py` | RAG 질의 엔드포인트 |
| `api/session.py` | 세션 관리 |
| `api/preferences.py` | 사용자 선호 CRUD |
| `api/translate.py` | 번역 엔드포인트 |

#### 2-B. Agent 파이프라인 (가장 복잡)
| 파일 | 확인할 것 |
|------|-----------|
| `agent/orchestrator.py` (870줄) | 다단계 파이프라인 전체 흐름 |
| `agent/agent_loop.py` (757줄) | LangChain agentic 루프 |
| `agent/chat_agent.py` (259줄) | 대화 에이전트 |
| `agent/context.py` | Request/Trip/Preference 스키마 |
| `agent/classify.py` | 인텐트 분류 |
| `agent/exclude_classifier.py` | Hard 제외 판정 |
| `agent/hours_parser.py` | 운영시간 파싱 |
| `agent/note_parser.py` | 부가정보 파싱 |
| `agent/environment.py` | 환경(날씨·공기질) 컨텍스트 |
| `agent/semantic_rank.py` | 시맨틱 랭킹 |
| `agent/translate.py` | 번역 유틸 |
| `agent/tools/experiences.py` | 체험 조회 LangChain Tool |
| `agent/tools/knowledge.py` | 지식베이스 Tool |
| `agent/tools/route.py` | 경로 Tool |
| `agent/tools/schemas.py` | Tool 입출력 스키마 |

#### 2-C. Domain 판정 로직 (사실 판정 핵심)
| 파일 | 역할 |
|------|------|
| `domain/exclusion.py` | Hard 제외 기준 |
| `domain/operational.py` | 운영상태·폐업 판정 |
| `domain/timing.py` | 시간 충돌 판정 |
| `domain/budget.py` | 예산 필터 |
| `domain/ranking.py` | 소프트 랭킹 |
| `domain/reasons.py` | Reason 생성 |
| `domain/route.py` | 루트 구성 |
| `domain/normalize.py` | 데이터 정규화 |
| `domain/status.py` | 가격/예약 상태 |
| `domain/conflict.py` | 일정 충돌 |
| `domain/curation.py` | 큐레이션 |
| `domain/dedup.py` | 중복 제거 |
| `domain/environment.py` | 환경 판정 |
| `domain/input_validation.py` | 입력 검증 |
| `domain/locations.py` | 위치 계산 |
| `domain/preferences_merge.py` | 선호 병합 |
| `domain/reservation.py` | 예약 판정 |
| `domain/signals.py` | 신호 추출 |
| `domain/text_signals.py` | 텍스트 신호 |

#### 2-D. 외부 소스 & RAG
| 파일 | 외부 서비스 |
|------|-------------|
| `sources/tourapi.py` | 한국관광공사 TourAPI |
| `sources/seoulculture.py` | 서울문화포털 |
| `sources/kma.py` | 기상청 |
| `sources/airkorea.py` | 에어코리아 |
| `sources/tmap.py` | Tmap (도보 경로) |
| `sources/gplaces.py` | Google Places API |
| `rag/ingest.py` | 문서 수집·청킹 |
| `rag/embed.py` | 임베딩 생성 |
| `rag/store.py` | pgvector 저장 |
| `rag/retrieve.py` | 유사도 검색 |
| `rag/chunk.py` | 청킹 로직 |
| `rag/knowledge/*.md` | 6개 지식 문서 |

**→ 산출물:** 독스트링 추가된 백엔드 파일들, `02-code-index.md` 초안

---

### Phase 3 — 프론트엔드 코드 독해
**목표:** SPA처럼 작동하는 Vanilla JS 구조 파악. 페이지 흐름 이해.

| 파일 | 확인할 것 |
|------|-----------|
| `index.html` | DOM 구조, 스크립트 로딩 순서 |
| `js/app.js` (338줄) | 라우터, 페이지 초기화 |
| `js/state.js` (230줄) | 클라이언트 상태 구조 |
| `js/api.js` | 백엔드 호출 래퍼 |
| `js/config.js` | 환경 설정 (API URL 자동 전환) |
| `js/auth.js` | Supabase Auth 연동 |
| `js/map.js` | Naver Maps SDK 래퍼 |
| `js/pages/*.js` (11개) | 각 화면 로직 |
| `js/components/*.js` (13개) | 재사용 컴포넌트 |
| `css/tokens.css` | 디자인 토큰 (색·타이포·간격) |
| `css/app.css` | 전체 스타일 |
| `vercel.json` | Vercel 배포 설정 |

**→ 산출물:** 독스트링 추가된 프론트 파일들, `02-code-index.md` 보완

---

### Phase 4 — 인덱스 & 역방향 인덱스 완성
**목표:** 누구든 "이 함수 어디 있어?"를 바로 찾을 수 있게.

- `02-code-index.md`: 파일별 → 클래스/함수 목록 (설명 1줄)
- `03-reverse-index.md`: 함수/클래스명 알파벳순 → 파일 위치 + 호출처
- 특히 중요한 **의존성 흐름** (어떤 파일이 어떤 파일을 import하는지) 도식

---

### Phase 5 — 플랫폼 가능성 평가 & 인계 가이드
**목표:** 해커톤 플랫폼으로 쓸 수 있는지 최종 판단.

#### 5-A. 평가 기준
| 관점 | 질문 |
|------|------|
| **완성도** | 추천 → 지도 → 채팅 전체 흐름이 동작하는가? |
| **API 종속성** | 데모 없이 테스트 가능한 부분 vs. 키 없이 불가능한 부분 |
| **배포 용이성** | Render + Vercel 설정 완비 → 새로운 사람이 30분 안에 뜰 수 있나? |
| **확장성** | 다른 도시/도메인으로 확장할 수 있나? |
| **코드 가독성** | 코딩팀 없이 이해 가능한 수준인가? |
| **테스트 커버리지** | 44개 테스트가 핵심 로직을 커버하는가? |
| **기술 부채** | 미구현/하드코딩/TODO가 얼마나 있는가? |

#### 5-B. 위험요소 목록 (사전 확인)
- [ ] 외부 API 키 8개 — 전부 있어야 동작하는가? 없으면 graceful degradation?
- [ ] Supabase 프로젝트 — 현재 live? DB 스키마 적용 상태?
- [ ] RAG 지식베이스 — pgvector에 임베딩 데이터 ingested?
- [ ] 프론트 배포 URL ↔ 백엔드 CORS 설정 일치 여부
- [ ] `AGENT_LOOP=false` 기본값 의미 — 핵심 기능이 꺼져있는가?
- [ ] `vecs` 라이브러리 — pgvector 직결 DSN 없으면 RAG 503만 나는가?
- [ ] Render free tier cold start → 첫 요청 지연 (해커톤 데모에서 치명적일 수 있음)

---

## 3. 우선순위 (시간이 없다면)

해커톤 플랫폼 판단에 **반드시** 필요한 최소 조사:

```
Priority A (즉시):
  ├─ 01-repo-tree.md       : 전체 지도 (30분)
  ├─ tech.md               : 기술·API 의존성 (1시간)
  └─ 06-platform-assessment: 위험요소 평가 (1시간)

Priority B (가능하면):
  ├─ 02-code-index.md      : 백엔드 함수 인덱스
  ├─ 07-handover-guide.md  : 인계 체크리스트
  └─ 독스트링 추가 (핵심 파일만: orchestrator, agent_loop, domain/)

Priority C (시간 여유 있을 때):
  ├─ 03-reverse-index.md   : 역방향 인덱스
  └─ 전체 독스트링 + 인라인 주석
```

---

## 4. 지금까지 파악된 것 (예비 발견)

**예상 강점:**
- 아키텍처가 명확하게 레이어 분리됨 (sources → domain → agent → api)
- 44개 테스트 파일 → 도메인 로직 단위 테스트 존재
- 배포 설정 완비 (render.yaml + vercel.json)
- 디자인 에셋 완비 (Figma 스크린 12개, 3D 아이콘)
- 한국관광 특화 데이터 파이프라인 완성

**예상 위험:**
- 외부 API 8종 종속 (TourAPI, Seoul Culture, KMA, AirKorea, Tmap, Google Places, Naver Maps, OpenAI)
- Render free tier cold start (~30초)
- RAG pgvector DB URL 별도 설정 필요
- AGENT_LOOP 기본값 false → 핵심 agentic 기능 비활성화 상태
- 코딩팀 없음 → 버그 발생 시 대응 공백

---

## 5. 다음 실행 순서

1. **`01-repo-tree.md`** — 전체 트리 + 역할 지도 생성
2. **`tech.md`** — 기술 스택 상세 분석
3. **백엔드 핵심 파일 독스트링** — orchestrator.py, agent_loop.py, domain/* 우선
4. **`02-code-index.md`** — 인덱스 완성
5. **프론트엔드 독스트링**
6. **`03-reverse-index.md`** — 역방향 인덱스
7. **`06-platform-assessment.md`** — 종합 평가
8. **`07-handover-guide.md`** — 인계 가이드

---

*이 파일은 조사가 진행되면서 업데이트됩니다.*
