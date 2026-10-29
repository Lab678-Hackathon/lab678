# CLAUDE.md — AI 해커톤 프레임워크

> 이 저장소는 FastAPI + Vanilla JS + Supabase + LangChain 기반 AI 해커톤용 재사용 프레임워크다.
> 설계 문서: `study/framework_design.md` (작성 중)
> konnect 브랜치: 기술 참조용 구현 예시 (의존하지 않음)

---

## 현재 상태

백지화 완료. 프레임워크 설계 진행 중.

- `study/` — 참조 문서 (konnect 분석, 설계 계획)
- `study/02-code-index.md` — konnect 부품 카탈로그
- `study/03-reverse-index.md` — 함수 위치 역방향 찾기
- `study/플랫폼_심플페이지_경량화계획.md` — 프레임워크 설계 초안

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

- **설계 문서 먼저.** 코드 작성 전 `study/framework_design.md` 확인.
- **konnect는 참조만.** `git show konnect:<파일>` 로 열람, 직접 의존 없음.
- **Core / Topic Layer 분리.** Core는 변경 최소화, Topic은 자유롭게.
- **커밋·푸시는 사용자 요청 시만.**
- **비밀값 하드코딩 금지.** 전부 `.env`.

---

## 문서 라우팅

| 작업 | 읽을 파일 |
|---|---|
| 프레임워크 설계·기능 범위 | `study/framework_design.md` |
| konnect 부품 찾기 | `study/02-code-index.md` |
| 함수 위치 확인 | `study/03-reverse-index.md` |
| 환경 세팅 명령어 | `study/07-handover-guide.md` |
