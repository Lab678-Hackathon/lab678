# CLAUDE.md — AI 해커톤 프레임워크

> 이 저장소는 FastAPI + Vanilla JS + Supabase + LangChain 기반 AI 해커톤용 재사용 프레임워크다.
> 설계 문서: `framework_doc/framework_design.md`
> 작업 절차: `framework_doc/framework_workflow.md`
> konnect 브랜치: 기술 참조용 구현 예시 (의존하지 않음)

---

## 현재 상태

백지화 완료. 프레임워크 설계 진행 중.

- `framework_doc/` — 프레임워크 설계·작업 문서
- `konnect_study/` — konnect 분석 참조 자료 (건드리지 않음)
- `utils/` — 재사용 스크립트·템플릿·스니펫
- `konnect_study/02-code-index.md` — konnect 부품 카탈로그
- `konnect_study/03-reverse-index.md` — 함수 위치 역방향 찾기

---

## 기술 스택 (예정)

| 레이어 | 기술 |
|---|---|
| Frontend | Vanilla HTML / CSS / JavaScript, ES Modules |
| Backend | Python 3.12+ / FastAPI |
| AI / Agent | OpenAI API + LangChain |
| LLM Provider | Adapter 패턴 (OpenAI / Naito) |
| Auth / DB | Supabase (Auth + Postgres + pgvector) |
| 배포 | Render (backend) / Vercel (frontend) |

---

## 작업 원칙

- **설계 문서 먼저.** 코드 작성 전 `framework_doc/framework_design.md` + `framework_doc/framework_workflow.md` 확인.
- **konnect는 참조만.** `git show konnect:<파일>` 로 열람, 직접 의존 없음.
- **Core / Topic Layer 분리.** Core는 변경 최소화, Topic은 자유롭게.
- **커밋·푸시는 사용자 요청 시만.**
- **비밀값 하드코딩 금지.** 전부 `.env`.

---

## 문서 라우팅

| 작업 | 읽을 파일 |
|---|---|
| 프레임워크 설계·기능 범위 | `framework_doc/framework_design.md` |
| 작업 절차·검증 명령 | `framework_doc/framework_workflow.md` |
| konnect 부품 찾기 | `konnect_study/02-code-index.md` |
| 함수 위치 확인 | `konnect_study/03-reverse-index.md` |
| 환경 세팅 명령어 | `konnect_study/07-handover-guide.md` |
| 재사용 코드·템플릿 | `utils/README.md` |

## 토큰 절약 원칙

- `konnect_study/`는 참조 전용. 먼저 `konnect_study/02-code-index.md`로 위치 확인 후 해당 파일만 읽는다.
- `utils/templates/`에 템플릿이 있으면 새로 작성하지 않고 복사해서 교체한다.
- `utils/snippets/`에 패턴이 있으면 그대로 활용한다.
- Core 파일은 변경 전 반드시 사용자 확인. 한 번 확인으로 여러 Topic에 영향.
