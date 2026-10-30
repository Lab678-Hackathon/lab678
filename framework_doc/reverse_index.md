# 프레임워크 역방향 인덱스 (심볼 → 파일)

> 생성일: 2026-10-29 | 브랜치: full-framework
> "이 함수·클래스가 어디 있나"를 알파벳순으로 바로 찾는 용도.
> 관련: [index.md](./index.md) | [tree.md](./tree.md)

---

## A

| 심볼 | 파일 | 호출처 |
|---|---|---|
| `answer_question` | `rag/retrieve.py` | Topic의 RAG API 라우터 |
| `app` | `main.py` | uvicorn 진입점 |
| `app_error_handler` | `main.py` | FastAPI exception_handler (내부) |
| `AppError` | `core/exceptions.py` | 모든 sources·domain·agent (raise) |
| `AuthError` | `core/exceptions.py` | `core/auth.py`, 모든 api/ 라우터 |
| `AuthUser` | `core/auth.py` | 모든 api/ 라우터 (Depends 반환값) |

---

## B

| 심볼 | 파일 | 호출처 |
|---|---|---|
| `boot` | `frontend/js/app.js` | `index.html` DOMContentLoaded |
| `build_naito_llm` | `services/llm/naito.py` | `services/llm/adapter.py` |
| `build_openai_llm` | `services/llm/openai.py` | `services/llm/adapter.py` |

---

## C

| 심볼 | 파일 | 호출처 |
|---|---|---|
| `ConfigurationError` | `core/exceptions.py` | `services/llm/naito.py` |
| `CONTENT` | `frontend/js/content.js` | `frontend/js/app.js` |

---

## E

| 심볼 | 파일 | 호출처 |
|---|---|---|
| `embed_documents` | `rag/embed.py` | `rag/ingest.py` |
| `embed_query` | `rag/embed.py` | `rag/retrieve.py` |
| `Envelope` | `models/common.py` | 모든 api/ 라우터, `main.py` 핸들러 |
| `Envelope.error_response` | `models/common.py` | `main.py` 핸들러 |
| `Envelope.ok_response` | `models/common.py` | 모든 api/ 라우터 |
| `ensureLocation` | `frontend/js/state.js` | Topic 페이지 (위치 필요 시) |
| `ErrorDetail` | `models/common.py` | `Envelope` 내부 |
| `ExternalSourceError` | `core/exceptions.py` | 모든 sources/*.py |

---

## G

| 심볼 | 파일 | 호출처 |
|---|---|---|
| `get_current_user` | `core/auth.py` | 로그인 필수 api/ 라우터 |
| `get_embedding_model` | `services/llm/adapter.py` | `rag/embed.py` |
| `get_llm` | `services/llm/adapter.py` | `rag/retrieve.py`, Topic agent/ |
| `get_optional_user` | `core/auth.py` | 로그인 선택 api/ 라우터 |
| `getToken` | `frontend/js/auth.js` | `frontend/js/api.js` |

---

## I

| 심볼 | 파일 | 호출처 |
|---|---|---|
| `init` | `frontend/js/auth.js` | `frontend/js/app.js` |
| `ingest` | `rag/ingest.py` | `utils/scripts/ingest_rag.py`, CLI |
| `isSignedIn` | `frontend/js/auth.js` | Topic 페이지 (게이팅) |

---

## L

| 심볼 | 파일 | 호출처 |
|---|---|---|
| `lifespan` | `main.py` | FastAPI 앱 (내부) |

---

## N

| 심볼 | 파일 | 호출처 |
|---|---|---|
| `navigate` | `frontend/js/router.js` | `frontend/js/app.js` |

---

## O

| 심볼 | 파일 | 호출처 |
|---|---|---|
| `onAuthChange` | `frontend/js/auth.js` | `frontend/js/app.js` |

---

## R

| 심볼 | 파일 | 호출처 |
|---|---|---|
| `ready` | `frontend/js/auth.js` | Topic 페이지 (초기화 대기) |
| `register` | `frontend/js/router.js` | `frontend/js/app.js` |
| `request` | `frontend/js/api.js` | Topic 페이지·컴포넌트 |

---

## S

| 심볼 | 파일 | 호출처 |
|---|---|---|
| `search_knowledge` | `rag/retrieve.py` | `answer_question` (내부) |
| `setResults` | `frontend/js/state.js` | Topic 페이지 (추천 결과 저장) |
| `Settings` | `config.py` | `config.py` 싱글톤 생성 |
| `settings` | `config.py` | 모든 백엔드 모듈 (전역 싱글톤) |
| `signInWithGoogle` | `frontend/js/auth.js` | Topic 로그인 컴포넌트 |
| `signOut` | `frontend/js/auth.js` | Topic 계정 페이지 |
| `state` | `frontend/js/state.js` | Topic 페이지 (공유 상태 읽기·쓰기) |

---

## T

| 심볼 | 파일 | 호출처 |
|---|---|---|
| `Trace` | `core/trace.py` | 모든 api/ 라우터, Topic agent/ |
| `Trace.step` | `core/trace.py` | Topic pipeline 각 단계 |
| `Trace.to_dict` | `core/trace.py` | `Envelope.ok_response(trace=...)` |

---

## V

| 심볼 | 파일 | 호출처 |
|---|---|---|
| `ValidationFailure` | `core/exceptions.py` | Topic domain/, api/ 입력 검증 |
| `verify_token` | `core/auth.py` | `get_optional_user`, `get_current_user` |

---

## 핵심 의존성 흐름

```
[Backend]
api/[feature].py
  → core/auth.get_optional_user (Depends)
  → services/[feature].run_[feature]
    → agent/pipeline (LangChain)
      → services/llm/adapter.get_llm
        → services/llm/openai | naito
      → sources/[source].fetch
        → ExternalSourceError (실패 시)
      → domain/judge
      → domain/rank
    → core/trace.step (각 단계)
  → models/common.Envelope.ok_response

rag/retrieve.answer_question
  → rag/embed.embed_query
  → services/llm/adapter.get_llm

[Frontend]
index.html
  → js/app.js.boot
    → js/auth.js.init (Anonymous Sign-in)
    → js/router.js.register (Topic 페이지)
    → js/router.js.navigate → pages/[page].js
      → js/api.js.request (JWT 자동 부착)
        → GET/POST /api/[feature]
      → js/state.js (공유 상태)
```
