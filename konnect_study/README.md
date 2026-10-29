# KONNECT 코드베이스 분석 — study/

> 생성: 2026-10-27 | 목적: 해커톤 플랫폼 가능성 파악 + 코딩팀 부재 인계 준비

## 파일 목록

| 파일 | 용도 | 우선순위 |
|------|------|----------|
| [00-investigation-plan.md](./00-investigation-plan.md) | 조사 계획 (브라우저: 00-investigation-plan.html) | 참고 |
| [01-repo-tree.md](./01-repo-tree.md) | **전체 디렉토리 트리 + 파일별 역할 지도** | ⭐필독 |
| [02-code-index.md](./02-code-index.md) | 파일 → 클래스/함수 순방향 인덱스 | 참고 |
| [03-reverse-index.md](./03-reverse-index.md) | 함수명 → 파일+호출처 역방향 인덱스 + 의존성 흐름도 | 참고 |
| [tech.md](./tech.md) | **기술 스택·API 키·배포·설계 원칙 상세** | ⭐필독 |
| [06-platform-assessment.md](./06-platform-assessment.md) | **해커톤 플랫폼 가능성 평가 + 데모 시나리오** | ⭐필독 |
| [07-handover-guide.md](./07-handover-guide.md) | **코딩팀 없이 30분 내 실행 가이드** | ⭐필독 |
| [08-findings-notable.md](./08-findings-notable.md) | **조사 중 발견한 특이점 20개 전체 기록** | ⭐필독 |

## 한 줄 결론

> **"데모는 가능, 플랫폼 확장은 어렵다."**
> 서울 문화경험 추천 서비스로 이미 배포됨. cold start 30초 + 간헐 실패 이슈 3건 미결.
> 다른 도시/도메인 확장은 데이터 소스 레이어 전면 교체 필요.

## 빠른 링크

- 현재 배포: [https://codyssey-konnect-frontend.vercel.app/](https://codyssey-konnect-frontend.vercel.app/)
- 백엔드 헬스: [https://codyssey-konnect.onrender.com/health](https://codyssey-konnect.onrender.com/health)
- 데모 시나리오: [06-platform-assessment.md §6](./06-platform-assessment.md)
- 실행 방법: [07-handover-guide.md](./07-handover-guide.md)
