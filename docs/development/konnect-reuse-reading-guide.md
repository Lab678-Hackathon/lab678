# KONNECT 재사용 전 읽기·경량화 가이드

2026-10-31 · 사용자 지시: **재사용 전에 konnect/study를 먼저 읽는다. 불필요한 LLM·인증·Supabase를 필수로 물려받지 않는다.**

현재 새 서비스에는 기존 코드를 이식하지 않았다. 이 문서는 읽은 부분·재사용 후보·제외/보류 제안을 구분한 탐색용 압축 기록이다. 최종 파일 채택과 실제 실행 검증은 별도다.

## 0. 짧은 해커톤에서 두 브랜치를 함께 참조하는 원칙

사용자 설명: **framework는 기존 구현을 최대한 범용·경량으로 다듬은 기반이고, konnect는 이전 프로젝트의 완성 브랜치다. 새 PRD는 KONNECT 기능을 기반으로 했을 가능성이 높다. 두 브랜치 모두 사용자가 분석한 자료를 먼저 활용한다.** 다만 PRD의 구체 요구는 최신 사용자 지시·확정 문서로 확인하며 과거 기능과 동일하다고 자동 확정하지 않는다.

| 참조 대상 | 먼저 읽을 분석 | 가져올 역할 | 그대로 의무화하지 않을 것 |
|---|---|---|---|
| `framework` (`db679845104645a486d2a05784030e249d57f26e`) | framework_doc의 tree/index/reverse_index·framework_design·framework_workflow, RAG가 필요하면 rag_work_report | 가벼운 실행 골격·공통 응답/예외/추적·필요한 LLM 연결·라우팅 | 분석 초안의 Core 전체·인증·Supabase·RAG를 항상 포함한다는 전제 |
| `konnect` (`932032bcc5462d5dda00985503d2e7b4e1ed32be`) | study의 트리·기술·색인·주의점, LLM 호출 목록 | PRD에 필요한 실제 문화정보·판정·지도/카드·코스 코드와 관련 테스트 | 이전 Google/DB·영문 UX·여러 번의 LLM 분류/라우팅·1회 게이트 |
| 현재 `dj/develop` | LAB678 공통 규칙·현재 상태·신규 API/화면 계약 | 실제 새 구현·검증·기록·작업별 커밋 | 두 참조 브랜치를 모두 통째로 병합해 시작하는 방식 |

### framework 분석의 읽기·대조 범위

이번에는 [tree.md](https://github.com/Lab678-Hackathon/lab678/blob/framework/framework_doc/tree.md), [index.md](https://github.com/Lab678-Hackathon/lab678/blob/framework/framework_doc/index.md), [reverse_index.md](https://github.com/Lab678-Hackathon/lab678/blob/framework/framework_doc/reverse_index.md), [framework_design.md](https://github.com/Lab678-Hackathon/lab678/blob/framework/framework_doc/framework_design.md)의 구조·심볼·Core/Topic 부분과 이전에 읽은 [framework_workflow.md](https://github.com/Lab678-Hackathon/lab678/blob/framework/framework_doc/framework_workflow.md), [rag_work_report.md](https://github.com/Lab678-Hackathon/lab678/blob/framework/framework_doc/rag_work_report.md)를 참조했다. 문서에 남은 `full-framework`·`main` 계획 이름은 현재 브랜치 구조와 구분한다.

framework의 범용화 의도를 활용하되 실제 코드에는 인증·RAG·필수 키 전제가 남을 수 있다. 현재 홈페이지는 RAG 문서 질문 화면이며 이번 문화외출 화면이 아니다. 문서상의 이상 구조·과거 테스트 통과와 실제 외부 연결 성공을 구분한다. 오래된 “Core 항상 포함/수정 승인” 문구가 현재 사용자의 무인증·Supabase 선택 가능 지시와 LAB678 공통 기준을 대체하지 않는다.

### 실행 순서 제안

1. 최신 요구에서 **첫 입력→실제 추천→지도/카드→조건 변경**에 필요한 목록을 정한다. 코스·음성도 단계별 검증 대상으로 유지한다.
2. framework 분석으로 실행/응답/오류의 작은 골격을 찾는다. KONNECT의 스키마와 다르면 공통 계약 하나를 먼저 맞춘다.
3. konnect/study 색인으로 해당 사용자 기능의 소스·순수 판정·지도/카드·코스와 테스트를 찾는다. 이미 있는 기능을 처음부터 전부 재작성하지 않는다.
4. 후보 파일마다 원본 브랜치/SHA·목적·import·새로 필요한 설정·관련 테스트·변경점을 짧게 남긴다. 원본 브랜치를 수정하지 않는다.
5. 로그인/Supabase 없이 가능한 경로와 조건 해석에 필요한 최소 AI 연결부터 실제 실행한다. 다중 agent·RAG·임베딩은 필요성·효과를 검증한 뒤 채택한다.
6. 작은 통합이 통과하면 새 저장소 색인·현재 상태·체크표에 반영하고 작업별 전체 보고문 커밋을 남긴다.

공통 Envelope/예외는 한 쪽 구현을 기준으로 선택하고 양쪽의 같은 이름 클래스를 섞지 않는다. 기존 함수의 스키마·시간 단위·좌표 순서·오류 의미가 다른 경우 어댑터/명시 변경으로 연결한다. **framework를 다시 만드는 프로젝트나 KONNECT 전체를 새 이름으로 복제하는 프로젝트가 목표가 아니다.**

## 1. 읽기 순서와 원본 위치

기준: `konnect`, 커밋 `932032bcc5462d5dda00985503d2e7b4e1ed32be`. 경로·역할을 찾은 뒤 필요한 함수만 읽어 긴 파일 전체의 반복 입력을 줄인다. 브랜치가 바뀌면 원문·diff를 다시 확인한다.

| 순서 | 원본 | 이번 확인 범위 | 쓰는 목적 |
|---|---|---|---|
| 1 | [study/README.md](https://github.com/Lab678-Hackathon/lab678/blob/konnect/study/README.md) | 전체 | 분석 문서 지도 |
| 2 | [01-repo-tree.md](https://github.com/Lab678-Hackathon/lab678/blob/konnect/study/01-repo-tree.md) | 주요 구조 부분 | 파일 역할과 계층 |
| 3 | [tech.md](https://github.com/Lab678-Hackathon/lab678/blob/konnect/study/tech.md) | 스택·키·의존성 부분 | 현재 사용하지 않을 기술 구분 |
| 4 | [06-platform-assessment.md](https://github.com/Lab678-Hackathon/lab678/blob/konnect/study/06-platform-assessment.md), [08-findings-notable.md](https://github.com/Lab678-Hackathon/lab678/blob/konnect/study/08-findings-notable.md) | 전체 | 기존 평가·미검증·주의점 |
| 5 | [07-handover-guide.md](https://github.com/Lab678-Hackathon/lab678/blob/konnect/study/07-handover-guide.md) | 전체 | 실행 의존성 참고. 명령은 실행하지 않음 |
| 6 | [02-code-index.md](https://github.com/Lab678-Hackathon/lab678/blob/konnect/study/02-code-index.md), [03-reverse-index.md](https://github.com/Lab678-Hackathon/lab678/blob/konnect/study/03-reverse-index.md) | 주요 함수·의존 흐름 | 필요한 심볼과 호출부 찾기 |
| 7 | [LLM 호출 목록](https://github.com/Lab678-Hackathon/lab678/blob/konnect/docs/llm-prompts-inventory.md), [사용 검토 의견](https://github.com/Lab678-Hackathon/lab678/blob/konnect/study/konnect_platform_opinion.md) | 호출 목록 전체·의견 앞부분 | AI 중복 호출과 확장 비용 |

`konnect_report.md`와 나머지 study 파일은 필요한 주제의 추가 참고다. 이번 작업에서 모든 study 파일을 처음부터 끝까지 읽었다고 주장하지 않는다.

## 2. 과거 분석을 현재 확정 사실로 바꾸지 않기

- study의 “완성”, 테스트 개수·가격·배포 정상·30분 실행 등의 서술은 **과거 기록/평가**다. 현재 키·실행·비용·성능을 검증한 결과가 아니다.
- `07-handover-guide`의 main 직접 push, 과거 실행 경로, 1회 추천 로그인 정책은 현재 LAB678 운영·제품 기준으로 채택하지 않는다.
- 최소 이용시간, AGENT_LOOP 기본값, 실패를 0건/None으로 처리하는 로직은 실제 코드·새 정책과 대조한다.
- 0건을 피하려고 제외 조건을 풀어 후보를 넣는 과거 패턴을 새 Hard 조건에 자동 적용하지 않는다. 무료·예약·도보 제한 등 필수 조건을 임의 완화하지 않는다.
- LLM이 사실을 절대 생성할 수 없다는 과거 문구만으로 보장됐다고 판단하지 않는다. 근거·스키마·실제 호출과 출력 검증을 확인한다.

## 3. 우선 가져올 후보와 의존성

| 역할 | 먼저 찾을 파일·심볼 | 채택 전 확인 |
|---|---|---|
| 공식 문화정보 | sources/tourapi.py, sources/seoulculture.py | 실제 API·한국어 데이터·키·결측·좌표 |
| 정규화 | domain/normalize.py: normalize_candidate, normalize_seoul_event | 가격/운영/참여 근거, 서울 좌표 특이점 |
| 코드 판정 | timing.judge_timing, budget.judge_budget, status.resolve_status | 현재 시간·Hard 조건·미확인 정책과 테스트 |
| 기본 정렬·이유 | ranking.display_sort_key, reasons.select_reasons | LLM 없이 설명 가능한 기준·한국어 문구 |
| 도보·코스 | sources/tmap.pedestrian_route, domain/route.py | 초/m 단위·실패 구분·2~3곳·새 날짜 요청 |
| 지도·카드 | frontend/js/map.js, components/result-card.js | 기존 전역 상태/인증 import를 필요한 범위로 분리 |

이 후보들이 수정 없이 독립 실행 가능하다는 뜻은 아니다. 스키마·설정·예외·trace 등의 import와 테스트를 먼저 확인한다. 상위 orchestrator를 통째로 가져오면 아래의 LLM·DB 의존성도 따라올 수 있다.

## 4. LLM·DB를 줄이는 제안

| 기존 부분 | 이번 제안 | 보존해야 할 사용자 가치 |
|---|---|---|
| 다단계 agent_loop + fallback router + note_parser | **한 번의 필요한 조건 해석·보완 질문부터** 설계. 코드가 place/route 흐름을 연결 | 한국어 대화·같은 입력에서 코스 분기 유지 |
| 후보별 실내외·선호 분류 + 의미 배제 + 임베딩 재정렬 | 출처 태그·명시 조건·결정론 정렬 우선. 부족할 때 필요한 부분만 검증 | 명시 조건과 Hard 제한 존중 |
| LLM 운영시간 재추출 | 첫 경로에는 자동 채택하지 않음. 코드 파싱/근거로 확인 못 하면 미확인 | 운영 가능성 추정 금지 |
| 한→영 번역 보조 | 한국어 기본 UX에서 필요성부터 확인 | 번역 없이도 핵심 흐름 작동 |
| Supabase Auth·DB·장기 메모리 | 인증 없음·브라우저 상태로 충분한지 우선 검토 | 저장·복귀·선호·대화 맥락 보존 |
| pgvector RAG·FAQ | 실제 FAQ 요구와 자료 규모를 보고 도입 순서 결정 | 근거 없는 질문은 모른다고 안내. 기능 삭제를 임의 확정하지 않음 |
| 날씨·대기질·Places 등 보조 조회 | 첫 실제 흐름에 필요한 근거/조건부터 연결 | 미연동 정보는 미확인으로 표시 |

조건 입력을 직접 확정한 추천은 불필요한 재해석을 줄일 수 있다. AI 대화가 필요한 턴에는 사용자 원문·확정 필드·누락 필드만 보내고 반복 라우팅·후보별 호출을 당연한 기본값으로 가져오지 않는다. 호출 횟수·지연·필드 일치의 실제 측정은 이후 작업이다.

## 5. 실제로 코드에서 확인한 인증 결합

`frontend/js/auth.js`, `backend/app/core/auth.py`, `api/recommend.py`, `api/chat.py`와 API 인증 의존성·requirements를 읽었다. 추천/코스/대화의 선택적 인증 경로와 세션/선호/이력의 필수 인증 경로가 나뉘고, 추천/대화에도 DB import가 남아 있다.

따라서 **Google 버튼만 숨기거나 SUPABASE 키만 삭제하는 접근은 피하고**, 실제 새 서비스 흐름에 필요한 순수 함수·연결부터 구성하는 안을 제안한다. 기존 인증 검증을 test ID로 우회하지 않는다. 실제 계정을 사용하지 않는다면 그 계정 API를 브라우저 저장 모델과 별도 계약으로 대체할 범위를 정한다.

## 6. 이식 작업의 시작 체크표

- [ ] 사용자 요청·확정 제품·담당 범위와 study의 과거 설명을 구분
- [ ] study 색인으로 후보 함수와 호출부를 찾고 실제 소스 대조
- [ ] 필요한 파일·의존 패키지·환경변수만 목록화
- [ ] 인증/DB/LLM 없이 가능한 부분과 필요한 부분 구분
- [ ] 관련 팀원에게 공통 화면/API 영향 사전 공유
- [ ] 작은 기능부터 이식·실제 검증하고 새 저장소 색인·상태·보고 갱신
