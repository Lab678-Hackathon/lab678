# Lab678 · Codyssey AI 해커톤 2026

> 주제 공개(10/30) 후 서비스 소개로 채워요.

- **제출 마감:** 11/1(일) 13:00
- **데모:** (배포 후 링크)
- **Figma:** https://www.figma.com/design/UYxmWJohkX8djuFBoNoDEG

## 팀
손희영 (팀장) · 정민규 · 김동조

주력 역할과 현재 합의는 [TEAM_WORKFLOW.md](TEAM_WORKFLOW.md)를 확인해요. 기능별 담당 범위와 완료 기준은 MVP를 정한 뒤 함께 결정해요.

## 폴더
```
frontend/   화면
backend/    API · AI 연동
docs/       기획 · 회의록 · 발표 PDF · 시연 영상
design/     Figma 링크 · 화면 · 아이콘
utils/      재사용 개발 도구 · 코드/파일 색인 · 검증
```

## 협업 규칙
공통 기준은 [TEAM_WORKFLOW.md](TEAM_WORKFLOW.md)예요. 상세 규칙과 미확정 사항은 이 문서에서 확인해요.

1. 최신 `develop`에서 개인 작업 브랜치를 만들어요. 이름은 `feature/<설명>`, `fix/<설명>`을 권장해요.
2. 개인 기능은 최소 정상 동작을 확인하고 `develop` 대상 PR을 올린 뒤 Discord에 링크를 공유해요. 셀프 Merge가 가능하며 공식 Approve는 필수가 아니에요.
3. 공통 설정·API 계약·다른 팀원 담당 영역은 수정 전에 관련 팀원에게 공유하고 확인받아요.
4. `develop → main`은 PR로 진행하고 손희영님이 최종 승인해요.
5. 최신 코드 반영 전 현재 브랜치와 `git status`를 확인해요. 동기화 방법은 TEAM_WORKFLOW의 안전한 수동 동기화를 참고해요.
6. API 키·비밀번호는 커밋하지 않아요. 실제 값은 `.env`에, 변수명과 예시만 `.env.example`에 적어요.

문서의 운영 합의와 실제 GitHub 보호 설정은 별개이므로 설정 상태도 확인해야 해요.

## 실행
동료와 LLM은 [개발 참조·실행 안내](docs/development/team-backend-guide.md)에서 읽는 순서, 브랜치 확인, 로컬 실행, API 연결 및 협업 절차를 확인해요.

개인 백엔드 점검 화면은 저장소 루트에서 `python backend/preview.py`를 실행하고 `http://127.0.0.1:8765/`를 열어요. 최종 팀 UI·배포 실행법과는 구분해요.

## 개발 도구·작업 재개

먼저 [현재 상태와 다음 할 일](docs/development/current-state.md)을 확인하고, [저장소 파일 색인](docs/development/repo_index.md)·[기능/함수 역색인](docs/development/repo_reverse_index.md)·[구조](docs/development/repo_tree.md)로 필요한 원문만 찾아요. 도구 사용법과 자동 갱신은 [utils/README.md](utils/README.md), 현재 도구 구축 진행은 [체크표](docs/development/tooling-progress.md)를 확인해요. 서비스 실행 방법은 아직 미확정이에요.
