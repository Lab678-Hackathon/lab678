# KONNECT 인계 가이드
> 코딩팀 부재 상태에서 새로운 사람이 30분 안에 실행할 수 있는 체크리스트
> 생성일: 2026-10-27 | 관련: [tech.md](./tech.md) | [06-platform-assessment.md](./06-platform-assessment.md)

---

## 사전 조건

- Python 3.12 설치 (`python3.12 --version` 확인)
- Node.js 불필요 (Vanilla JS, 빌드 없음)
- 아래 서비스 계정 접근 권한:
  - Render 대시보드 (백엔드)
  - Vercel 대시보드 (프론트)
  - Supabase 프로젝트
  - OpenAI Platform

---

## 체크리스트 1: 현재 배포 상태 확인 (5분)

```bash
# 1. 백엔드 헬스체크
curl https://codyssey-konnect.onrender.com/health
# 기대: {"status":"ok","env":"production"}
# cold start 시 30초 대기

# 2. 프론트엔드 접속
open https://codyssey-konnect-frontend.vercel.app/
# 스플래시 후 홈 화면이 뜨면 OK

# 3. 추천 API 직접 테스트 (jq 없으면 생략)
curl -s -X POST https://codyssey-konnect.onrender.com/api/recommend \
  -H "Content-Type: application/json" \
  -d '{"start_location":{"type":"coords","lat":37.579,"lng":126.977},"start_at":"2026-10-28T14:00:00","end_at":"2026-10-28T17:00:00"}' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('ok:', d.get('ok'), '| candidates:', len(d.get('data',{}).get('candidates',[])))"
```

---

## 체크리스트 2: 로컬 개발 환경 (15분)

### Step 1: 환경변수 파일 생성
```bash
cd /Users/mpeg46551/codyssey-konnect  # 리포 루트
cp .env.example .env
# .env 파일을 열어 아래 키 값 입력
```

**`.env` 필수 입력 항목:**
```env
OPENAI_API_KEY=sk-...          # OpenAI Platform에서 확인
OPENAI_MODEL=gpt-4o
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

SUPABASE_URL=https://xxx.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...
SUPABASE_DB_URL=postgresql://...   # RAG용 (없으면 /api/ask만 503)

NAVER_MAP_CLIENT_ID=...         # NCP 콘솔에서 확인
TMAP_API_KEY=...
GOOGLE_PLACES_API_KEY=...
DATA_GO_KR_SERVICE_KEY=...      # TourAPI·기상청·에어코리아 공용

SEOUL_OPENAPI_KEY=...           # 서울문화포털 (없으면 graceful)
CORS_ALLOW_ORIGINS=http://localhost:5500,http://127.0.0.1:5500
```

### Step 2: 백엔드 실행
```bash
cd backend
python3.12 -m venv .venv
source .venv/bin/activate       # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cd ..                           # 리포 루트로 이동 (.env 로딩 경로 때문에 중요)
uvicorn backend.app.main:app --reload --port 8000
# 또는
cd backend && uvicorn app.main:app --reload --port 8000
```

**로딩 확인:**
```
INFO: Application startup complete.
# 로그에 "env: core keys present" 가 있으면 키 인식 완료
# "env: missing keys -> ..." 가 있으면 해당 키 .env 재확인
```

### Step 3: 프론트엔드 실행
```bash
cd frontend
python3 -m http.server 5500
# 브라우저: http://localhost:5500
```

**⚠️ 포트 주의:** `config.js`가 `localhost:5500` 또는 `127.0.0.1:5500`일 때만 로컬 백엔드(`localhost:8000`)로 연결. 다른 포트를 쓰면 Render 프로덕션 백엔드에 연결됨.

---

## 체크리스트 3: RAG 지식베이스 적재 확인 (5분)

RAG가 이미 적재됐는지 확인:
```bash
curl -s -X POST http://localhost:8000/api/ask \
  -H "Content-Type: application/json" \
  -d '{"question":"Do I need to tip in Seoul?"}' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('ok:', d.get('ok'))"
# ok: True → 적재됨
# 503 → 미적재 또는 SUPABASE_DB_URL 누락
```

**미적재 시 적재 실행:**
```bash
cd backend
source .venv/bin/activate
python -m app.rag.ingest  # 6개 지식 문서 → pgvector 적재
# SUPABASE_DB_URL 필수. 없으면 RAG만 건너뜀 (추천·채팅 무관)
```

---

## 체크리스트 4: 테스트 실행 (3분)

```bash
cd backend
source .venv/bin/activate
pytest tests/ -v --tb=short -x   # 전체 44개 (외부 API mock 사용, 키 불필요)
# 전부 Green이어야 함 (마지막 확인: 268 green, 2026-10-09)
# 실패 시: 특정 도메인 테스트만 돌리기
pytest tests/test_exclusion.py tests/test_timing.py tests/test_ranking.py -v
```

---

## 체크리스트 5: 배포 업데이트 (신규 변경이 있을 때)

### 백엔드 (Render)
```bash
git add -A && git commit -m "..."
git push origin main
# Render는 main push 시 자동 재배포 (또는 대시보드 Manual Deploy)
# 배포 후 /health 응답 확인
```

### 프론트엔드 (Vercel)
```bash
git push origin main
# Vercel은 main push 시 자동 재배포
# 배포 후 https://codyssey-konnect-frontend.vercel.app/ 확인
```

---

## 주요 파일 위치 빠른 참조

| 무엇을 바꾸고 싶나 | 파일 | 줄 |
|--------------------|------|----|
| 추천 결과 개수 (기본 4개) | `backend/app/agent/orchestrator.py` | `_MAX_CANDIDATES = 4` |
| 최소 가용시간 (현재 60분) | `backend/app/domain/input_validation.py` | 상단 상수 |
| 탐색 반경 기본값 (2km) | `backend/app/agent/orchestrator.py` | `_SEARCH_RADIUS_M` |
| LLM 모델명 변경 | `.env` → `OPENAI_MODEL`, `ORCHESTRATOR_MODEL` | — |
| Reason 문구 | `backend/app/domain/reasons.py` | `REASON_COPY` dict |
| 브랜드 색상 | `frontend/css/tokens.css` | `--color-teal-*` |
| 백엔드 API URL (프론트) | `frontend/js/config.js` | `API_BASE` 변수 |
| CORS 허용 도메인 | `.env` → `CORS_ALLOW_ORIGINS` | — |
| 관심사 카테고리 | `backend/app/models/recommend.py` | `InterestCode` enum |

---

## 알려진 이슈 & 우회법

### 이슈 1: A 추천 간헐 실패 (5회 발생, 2026-10-18)
- **증상:** `Couldn't load experiences` 에러
- **원인 미파악** (토큰 소진 아님으로 잠정 확인)
- **우회:** Render 대시보드 → Logs에서 해당 시간대 에러 확인. 재시도 1회로 보통 복구됨.

### 이슈 2: B 루트 자연어 출발지 UI 불일치
- **증상:** 자연어로 "Start at Gwanghwamun"이라 해도 하단 'Start from' 버튼은 'Current location' 표시
- **우회:** 데모 시 직접 위치 선택 UI를 쓰거나, Gwanghwamun·Gyeongbokgung 등 주요 지점 사용

### 이슈 3: Render cold start (30초)
- **우회 A:** 데모 5분 전 `/health` 요청으로 warm-up
- **우회 B:** Render 대시보드 → 유료 플랜 ($7/월) 업그레이드

### 이슈 4: Naver Maps 지도 안 뜸
- **원인:** NCP 콘솔에 해당 도메인이 미등록
- **해결:** NCP 콘솔 → AI·NAVER API → Maps → Web Dynamic Map → 서비스 URL에 현재 도메인 추가

---

## 서비스 계정 목록

| 서비스 | URL | 확인할 것 |
|--------|-----|-----------|
| Render | render.com | konnect-api 서비스 상태, 환경변수, 로그 |
| Vercel | vercel.com | 배포 상태, 도메인 |
| Supabase | supabase.com | DB 상태, Auth 설정, pgvector 확장 활성화 여부 |
| OpenAI | platform.openai.com | API 키 잔액, 사용량 |
| NCP (Naver Cloud) | console.ncloud.com | Maps 서비스 URL 등록 |
| data.go.kr | 공공데이터포털 | TourAPI 활용신청 상태 |
| openapi.sk.com | Tmap | API 키 상태 |

---

## 긴급 연락 구조

코드 문제 발생 시 검색 순서:
1. `backend/tests/test_[관련모듈].py` — 해당 로직의 단위 테스트 확인
2. `docs/test-results-2026-10-09.md` — 마지막 검증 기록
3. `planning/research/user-validation/2026-10-18-v3-final-qa-feedback.md` — 알려진 이슈
4. `docs/agent-architecture.md` — 아키텍처 설계 의도
5. `CLAUDE.md §6` — 신뢰 불변식 (이것을 건드리면 안 됨)
