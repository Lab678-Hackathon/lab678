# Research · 근거 자료 색인

KONNECT Product 판단에 사용한 **조사·실측·Tech 검증·현장/사용자 검증 근거**를 관리합니다.

Research 자료는 현재 Product 기준 자체가 아닙니다.  
조사 결과가 Product 기준으로 채택되면 `product/`와 Decision Log에 반영하고, 상세 결정 이유·상태는 Google Sheet `KONNECT 제품 기획 실행·의사결정 기록`에서 관리합니다.

## 현재 자료

| 자료 | 역할 | 현재 활용 |
|---|---|---|
| [TourAPI 실측 · 2026-09-19](./tourapi-validation_2026-09-19.md) | EngService2 `detailIntro2`의 가격·예약·시간 데이터 한계 확인 | TourAPI 역할, 가격·미확인 신뢰원칙 근거 |
| [W2 추가 데이터 Product 직접검토·Tech 확인 요청 · 2026-09-23](./KONNECT_W2_추가데이터_Product직접검토_Tech확인요청_2026-09-23.md) | OA-15486·KOPIS·지역기관·기상청·AirKorea 검토 | 보완 데이터 전략 근거 |
| [Data Quality Validation · 2026-09-25](./data-quality-validation_2026-09-25.md) | Product 200건 + Tech 6,832건 정량 실측 요약 | 가격 파싱·결측·중복 매칭 정책 근거 |
| [Tech Validation 0923_01](./tech-validation/tech-validation-questions_0923_01.md) | 9/24 전달 질문, 9/25 1차 Tech 회신과 잔여 검증 이력 | D-10·D-12·D-14·D-16 관련 검증 이력 |
| [Tech Validation 0925_01](./tech-validation/tech-validation-questions_0925_01.md) | 가격·Agent/RAG/Memory·Context/Data·AI 고지 후속 질문 | D-14·D-15 후속 검증 이력 |
| [Tech Validation 0926_01](./tech-validation/tech-validation-questions_0926_01.md) | 지도·도보 경로, 현재 선택 상태 저장·복원, LF-10 최소 피드백 공수 확인 | D-12·D-15 및 9/26 Product Flow 후속 검증 · **9/28 회신 수신, 지도 세부 구현 후속** |
| [Tech Validation 1004_01](./tech-validation/tech-validation-questions_1004_01.md) | B 문화루트 Product Freeze 후속 구현 검증 B-T01~B-T06(P0/P1) | D-12·D-14 관련 현재 검증 Queue · **Tech 회신 대기, 결과 미추정** |
| [외국인 사용자 현장 검증 결과 · 2026-10-16](./user-validation/2026-10-16-field-test-report.md) | 명동 현장 5개 세션의 사용 관찰·발언·주요 발견과 검증 한계 | A/B 실제 사용 검증 근거 · [Google Docs 원본](https://docs.google.com/document/d/1Meva1_ObehfrgyeC5IdFyKpczMtCdgzuFS89Iezl2Oo/edit) |
| [사용자 검증 후 개선 과제 · 2026-10-16](./user-validation/2026-10-16-improvement-review.md) | 관찰에서 도출한 개선 후보 1~6과 개발 가능성 협의 항목 | 1~5 우선 검토, 6 여력 시 · **구현 미확정** · [Google Docs 원본](https://docs.google.com/document/d/1ZCgEwWCuTSIV-lk01BLnhNFrmrLav7z-4GQCcGwdHdc/edit) |

## 운영 원칙

- **Research = 근거**, **Product = 현재 기준**, **Decisions = 결정 색인**으로 역할을 구분합니다.
- 조사 결과만으로 Product 결정을 자동 변경하지 않습니다.
- 실측 수치는 표본 범위와 확인일을 함께 남기고 전체 데이터로 과도하게 일반화하지 않습니다.
- Tech 질문·회신은 현재 기준 문서가 아니라 **검증 이력**으로 보존합니다.
- 사용자 검증·관광안내센터 현장검증 등 실제 조사가 진행되면 결과 자료를 이 폴더에 추가하고 이 README에서 연결합니다.
