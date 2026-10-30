# KONNECT Planning

KONNECT Final Project의 Product 기준, 의사결정 기록, 조사 근거와 팀 전달 문서를 관리합니다.

## 저장소 구조

- `product/` — 확정된 Product 기준을 주제별로 정리한 UX/UI·Tech 전달용 문서
- `decisions/` — 주요 D번호와 현재 결정·GitHub 반영 위치를 추적하는 색인
- `research/` — API·데이터 실측·Tech 검증·현장/사용자 조사 등 Product 판단의 근거 자료

## 처음 읽기

- **저장소 구조와 문서 역할을 처음 확인할 때:** 이 `README.md`
- **실제 Product·UX/UI·Tech 작업을 시작할 때:** [product/README.md](./product/README.md)
- **결정 근거가 필요할 때:** [decisions/decision-log.md](./decisions/decision-log.md) → 상세 이유는 Google Sheet
- **조사·실측·Tech 검증 근거가 필요할 때:** [research/README.md](./research/README.md)

즉, 루트 `README.md`는 저장소 전체의 **안내판**, `product/README.md`는 팀 작업의 **실질적인 작업 시작점**으로 사용합니다.

## 협업 및 참고 문서

팀의 실제 협업·수정은 **GitHub와 Figma**에서 진행합니다.  
Google Docs와 Google Sheet는 Product 기준과 작업 원본을 확인하고 댓글로 의견·질문을 남기는 자료로 운영하며, 팀원에게는 댓글 작성자 권한으로 공유합니다. Product 담당자가 의견을 확인해 필요한 기준 변경을 반영합니다.

| 문서 | 역할 | 운영 방식 |
|---|---|---|
| [KONNECT 제품 기획 기준서](https://docs.google.com/document/d/1IpdQgtELfGjAjpzBUxJ_jmt0T6CxglYchtVC_o0LmOE/edit) | 확정된 Product 기준의 상세 원본 | Google Docs · 기준 확인·댓글 피드백 |
| [KONNECT 제품 기획 실행·의사결정 기록](https://docs.google.com/spreadsheets/d/1Opv0mQHEBor3P_gleuqLuh5x35VTWeXfHifFoBX6I50/edit) | 실행계획·D-ID·IA 작업맵·결정 근거 확인 | Google Sheet · 기준 확인·댓글 피드백 |

### 확인 우선순위

- 팀 작업·Handoff → **GitHub**
- UX/UI 작업 → **Figma**
- Product 상세 기준 확인 → **Google Docs**
- IA·결정 과정·작업 상태 확인 → **Google Sheet**

Google Docs/Sheet에서 팀원이 Product 기준을 직접 수정하지 않습니다. 의견·질문은 해당 문서의 댓글로 남기고, Product 담당자가 확인해 필요한 변경을 반영합니다.

## 문서 역할

- **Google Docs `KONNECT 제품 기획 기준서`** — 현재 Product 기준의 최종 Source of Truth
- **Google Sheet `KONNECT 제품 기획 실행·의사결정 기록`** — 검토 과정·근거·결정 이유·담당·상태·GitHub 반영 위치
- **GitHub planning repository** — 팀이 실제 작업에 참고할 주제별 현재 Product 문서, Decision Log, Tech 검증 이력, 조사 근거

Google Drive와 GitHub에 같은 상세 내용을 단순 복제하지 않고 **역할을 분리해 관리**합니다. 기준이 충돌하면 최신 의사결정 Sheet와 Product 기획 기준서의 확정 상태를 우선 확인하고 GitHub 문서를 갱신합니다.

## 기본 운영 원칙

- 작업 시작 전 Pull
- 작업 종료 전 Commit + Push
- 확정된 주요 결정은 관련 Product 문서와 Decision Log에 반영
- Product 확정사항과 Tech/UX 후속 검증 항목을 구분
- 미검토 D항목을 현재 확정 기준처럼 선반영하지 않음
- 외부 전달 전 요청 문서는 동일 파일을 갱신하고, 전달 후 내용이 달라질 때 새 버전으로 관리
