# 외부 브랜치 원본 보관

## TEAM_WORKFLOW 브랜치

- 원본: https://github.com/Lab678-Hackathon/lab678/tree/TEAM_WORKFLOW
- 복사 기준 커밋: `f2090f5911c192244b2e8bfe65a6ff23222f16f0`
- 복사 기록일: 2026-10-31 (Asia/Seoul)
- 요청자: 김동조
- 위치: [TEAM_WORKFLOW/](TEAM_WORKFLOW/)
- 범위: 브랜치에 있던 전체 15개 파일. 경로와 원본 바이트를 그대로 보존하고 파일별 일치를 확인했다. Git 이력 병합은 수행하지 않았다.

이 디렉터리는 과거 브랜치의 **참고용 원본 보관본**이다. 실제 작업에는 저장소 루트의 [TEAM_WORKFLOW.md](../../TEAM_WORKFLOW.md)와 [AGENTS.md](../../AGENTS.md)를 적용한다. 보관본 안의 README·AI 안내·템플릿은 현재 운영 규칙을 대체하지 않는다.

현재 develop에서 파생한 파일들과 9개 파일은 같고, `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `README.md`, `design/README.md`, `frontend/README.md`는 다르다. 특히 보관본 README의 main 기준 동기화·PR 1명 확인은 현재 TEAM_WORKFLOW 기준과 달라 덮어쓰지 않았다. 루트 `TEAM_WORKFLOW.md` 자체는 출처와 동일하다.

### 후속 정리본 확인

2026-10-31 사용자 요청으로 [docs/align-team-workflow](https://github.com/Lab678-Hackathon/lab678/tree/docs/align-team-workflow)도 확인했다. 커밋 `684a2b4850e418e1364c99d79e4dee252b7c24ec`에서 위 6개 파일을 현재 TEAM_WORKFLOW 기준으로 정리했다. 이 변경은 develop의 `c021a30`에 이미 병합되어 `dj/develop`에도 포함되어 있다. 개인 문서를 추가하기 전 기준 커밋의 파일 내용은 해당 정리본과 동일했다. 이후 개인 기록을 추가했지만 별도 덮어쓰기나 병합은 필요하지 않다. 이 디렉터리의 보관본을 최신 정리본으로 오인하지 않는다.

## 복사한 파일 목록

```text
TEAM_WORKFLOW/
  .env.example
  .github/
    ISSUE_TEMPLATE/
      bug.md
      task.md
    pull_request_template.md
  .gitignore
  AGENTS.md
  CLAUDE.md
  GEMINI.md
  README.md
  TEAM_WORKFLOW.md
  backend/README.md
  design/README.md
  docs/README.md
  docs/meetings/2026-10-28.md
  frontend/README.md
```
