# KONNECT — Reason Copy Dictionary v1.0

> 상태: **Product 기본 문구 Freeze (2026-10-04)** · R-05/R-10 UX/Tech Handoff 하위 산출물 · D-08 연계
> 의의: 영문 기본 Copy 17개는 구현·시안·QA의 예상 가능한 기준 집합이며, 17개 전부가 MVP의 새 필수기능 또는 한 화면의 노출 수를 뜻하지 않는다.

## 1. 공통 원칙

- **근거**: User Context + Candidate Evidence + 명시적 Match Rule을 통과한 경우만 출력. 미확인/AI 추측/홍보 문구로 긍정 Fit 생성 금지.
- **사용자 Context**: 현재 요청 우선. 과거 선호는 유효한 사용자 확인 장기 선호만 보조 적용. Plan Fit은 기존 외부 일정 Context가 있을 때만 출력.
- **노출**: Primary Reason 1개를 우선, 추가로 유의미한 Secondary 1개까지(후보당 **0~2개**); 순위와 개수 강제 없음. 유사/반복 문구는 중복하지 않고 근거·선택 변별력을 우선.
- **분리**: 주 상태(Fits your conditions / Check needed / Alternative), 시간·가격·거리 Fact, 예약/참여 조건, 확인 필요 안내는 Reason과 별개다. Reason 0개여도 자동 제외·상태 변경하지 않는다.
- **A/B**: A는 경험 단위, B는 루트 전체와 장소별 근거를 구분. B 2·3개 구성은 동등하고 임의 3개 채움 금지. 시간의 실제/계산/계획/미확인을 구분하며 B 비용 일부 미확인이면 전체 Budget Fit 출력 금지.
- **UX Copy 권한**: 아래 영어는 기본안. UX가 의미·근거·긍정/제한적 확신·미확인 경계를 보존하는 범위에서 길이와 Microcopy를 다듬을 수 있다. 의미가 바뀌면 Product 확인이 필요하다.
- **Tech 권한**: Copy ID, Context/Evidence/Match, 실제값/예상값/계획값/미확인, 주 상태 및 조건 완화를 검증 가능하게 처리한다. 템플릿/Rule/LLM/schema 구현 방식은 Tech 자율이다.

## 2. 기본 Copy 목록 (17개)

| ID | Fit | 기본 영문 문구 (Default) | 표시 범위 | 생성 전제 (Match) | 억제 조건 (Suppress) |
| --- | --- | --- | --- | --- | --- |
| T01 | Time Fit | Fits your available time | A 장소 / B 개별 장소·루트 전체 | 출발·이동·운영·입장마감·경험 소요/계획값을 반영한 종료가 유효한 가용시간 안에 들어옴 | 필수 시간값·회차·운영시간 불명확, 실제 완료 시간을 검증할 수 없음; 계획값만 근거라면 T02 우선 |
| T02 | Time Fit | Planned to fit your time window | A 장소 / B 개별 장소·루트 전체 | KONNECT의 허용된 계획 체류시간 또는 근거 있는 예상 이동시간을 사용해 시간표를 산출하고 값 성격을 명확하게 구분 | 계획값·예상값의 근거 없음, 필수 회차 미확인·시간 충돌, 실제 관람시간인 듯 표시될 상황 |
| T03 | Time Fit | Open when you can visit | A 장소 / B 개별 장소 | 자율형 장소의 목표 날짜·도착시간이 검증된 운영시간·입장마감 안에 있으나 충분한 체류 소요시간은 미확인; 운영시간만 확인한 범위로 한정 | 특정 날짜 운영·휴관·입장마감 미확인 또는 해당 날짜 닫힘; 실제 입장 가능 보장을 내포하는 문맥 |
| T04 | Time Fit | Scheduled within your time window | A 고정형 체험 / B 개별 장소 | 고정형의 지정일 회차·시작·끝/러닝타임, 이동 포함해 사용자 시간 경계 안에 들어옴 | 회차·러닝타임·입장마감·해당 날짜 확인 부족, 이동·종료시간 충돌 |
| M01 | Location & Movement Fit | Within your walking limit | A 장소 / B 장소·루트 전체 | 명시된 도보 제한과 확인된 도보 경로/시간(또는 거리)의 비교가 부합하며 동일 척도 사용 | 사용자 도보 제한 미입력, 신뢰 가능한 이동정보 없음, 다른 이동방식과 혼동 |
| M02 | Location & Movement Fit | Within your travel limit | A 장소 / B 장소·루트 전체 | 사용자가 지정한 이동시간/거리/이동방식 제한과 같은 척도의 신뢰 가능한 이동량 부합 | 이동 제한 미입력, 방식 불일치, 이동정보 미확인 또는 이미 M01과 동일 의미 반복 |
| M03 | Location & Movement Fit | Shortest trip among these options | A 후보 비교 (B는 동일 비교조건 확보 시만) | 화면에 제시된 후보를 동일 출발점·이동방식·검증된 척도로 모두 비교했을 때 해당 후보가 최단이며 동률·판정대상 분명 | 일부 후보의 값 미확인, 조건 불균등, 동률/불명확한 비교 범위 또는 비교 근거 없음 |
| I01 | Interest Fit | Matches your interest in traditional culture | A/B | 현재 명시 관심사 또는 유효한 확인 장기 선호 Traditional Culture + 콘텐츠의 근거 있는 매핑 | 관심사 부재·충돌, 확인되지 않은 콘텐츠/관심사 추론 |
| I02 | Interest Fit | Matches your interest in palaces and historic sites | A/B | 현재 명시 관심사 또는 유효한 확인 장기 선호 Palaces & Historic Sites + 콘텐츠 매핑 | 관심사 부재·충돌, 역사·궁궐 관련 근거 불명확 |
| I03 | Interest Fit | Matches your interest in hands-on experiences | A/B | 현재 명시 관심사 또는 유효한 확인 장기 선호 Hands-on Experiences + 실제 직접 참여 프로그램 매핑 | 단순 관람·전시·일반 식사만 존재하거나 체험 참여 근거 미확인 |
| I04 | Interest Fit | Matches your interest in art and exhibitions | A/B | 현재 명시 관심사 또는 유효한 확인 장기 선호 Art & Exhibitions + 콘텐츠 매핑 | 명시/확인 선호 없음, 작품·전시 분류 근거 없음 |
| I05 | Interest Fit | Matches your interest in live performances | A/B | 현재 명시 관심사 또는 유효한 확인 장기 선호 Live Performances + 실제 공연 매핑 | 명시/확인 선호 없음, 공연 콘텐츠 근거 미확인 |
| I06 | Interest Fit | Matches your interest in festivals and events | A/B | 현재 명시 관심사 또는 유효한 확인 장기 선호 Festivals & Events + 기간 한정 특별 문화행사/축제 매핑 | 일반 상설 전시·공연을 근거 없이 Event로 매핑하거나 관심사 없음 |
| B01 | Budget Fit | Within your budget | A 장소 / B 루트 전체·개별 장소 | 사용자 명시 예산 상한과 적용 가능한 확인 일반가격 비교; B 루트 전체면 모든 필수비용 합계 확인 | 예산 미입력, 조건부 할인만 충족, 가격/일부 필수비용 미확인, Soft 초과 대안 |
| B02 | Budget Fit | Matches your free-only request | A 장소 / B 루트 전체·개별 장소 | 사용자가 무료 조건을 명시했고 모든 해당 필수 문화경험 비용이 무료로 확인됨 (B 전체면 구성원 전체 확인) | 무료 요청 미입력, 일부 비용 미확인, 유료 선택조건 또는 조건부 할인, B 일부 유료·미확인 |
| P01 | Plan Fit | Fits before your next stop | A 장소 / B 장소·루트 전체 | 기존 계획에서 확인된 다음 고정 일정의 장소·시각까지 이동·체류·운영·시간 충돌 없이 연계 가능 | 다음 일정 부재/모호, 이동시간 또는 종료 경계 미확인, 다음 일정 도착 불가 |
| P02 | Plan Fit | Fits between your plans | A 장소 / B 장소·루트 전체 | 기존 계획의 이전·다음 일정 시간·장소를 모두 확인하여 전후 이동·체류·운영 제약에 충돌 없이 들어감 | 앞/뒤 일정 중 하나라도 불명확, 이동 계산 누락, B 루트를 새로 만들었다는 사실 외에 외부 기존 일정 근거 없음 |

## 3. 충돌·복수 근거 처리

- T01/T02/T03/T04처럼 같은 시간 판단을 다르게 표현하는 후보끼리는 **가장 정확한 근거 수준을 나타내는 문구**를 택한다. 소요시간 미확인 자율형에는 T01의 완료 보장으로 오해할 표현 대신 T03를 사용한다.
- M01/M02는 같은 이동 제약을 중복 설명하지 않는다. M03는 전체 비교대상이 동일한 기준으로 검증된 경우만 허용한다.
- Interest 6개 모두가 동시에 매칭되더라도 6개를 전부 표시하지 않고 현재 요청의 핵심·구별력에 따라 최대 2개 Reason 규칙을 적용한다. Budget B01/B02는 무료만 요구한 경우 B02를 우선 고려한다.
- B에서 루트 수준 Context/시간/예산을 검증하지 못한 경우 해당 **루트 전체** Reason을 출력하지 않는다. 이미 검증된 **개별 장소** Reason은 별도 유지할 수 있다.
- Soft 조건 완화 대안은 실제 불일치 조건을 명시하며, 그 조건에 대해 충족 Reason을 출력하지 않는다. Hard 제한 위반을 Reason으로 포장하지 않는다.
- **선택 상태(LF-09)**: 선택 당시 근거 0~2개를 그대로 유지하고 새 이유를 임의 생성하지 않는다. B 재구성 실패로 이전 루트 유지 시 이전 판단 당시 이유를 *새 조건을 만족한 이유*처럼 표시하지 않는다.

## 4. UX/UI 검토 케이스 (희영님)

| 케이스 | Reason 표시 | 기타 정보 (Reason과 구분) |
| --- | --- | --- |
| **0개** | 이유 영역 없음/비노출 | 필요 시 `Recommendation reason not verified` 같은 중립적 확인 안내만 별도로 제공; 이는 Reason이 아님 |
| **1개** | `Open when you can visit` | `Duration unknown` / 입장·운영 확인 경로 분리. 짧은/단독 태그 정렬 확인 |
| **2개** | `Matches your interest in palaces and historic sites` + `Within your walking limit` | 모바일 긴 문구 줄바꿈·높이 변동·Map+카드 밀도 검토 |
| **A 결과(LF-03)** | 개별 후보별 0~2개 | 3개 결과 상태, 시간·가격·이동·예약조건·지도 정보와 시각적으로 분리 |
| **B 결과(LF-05)** | 루트 전체 최대 2개 + 개별 장소 각각 최대 2개 (확인 근거가 있을 경우) | 계획시간/확인시간 구분. 노출 위치·접기/펼치기·단계적 공개는 UX 선택 |
| **현재 선택(LF-09)** | 최초 선택 시 확인한 이유 최대 2개만 보존 | 현재 선택은 방문·예약 확정이 아님. 이유 자동 갱신 금지 |

모바일 시안 QA: 긴 문구와 0/1/2개 변형, 루트/장소 정보 위계, 미확인 경고·주 상태와 구분, 화면 폭·줄바꿈·접기/펼치기·다국어 확장성. 실제 Chip/Badge/아이콘/색상과 최종 표면 카피는 UX/UI 담당.

## 5. Tech 구현·QA 예시 (용택님)

- **긍정:** 명시적 도보상한 + 검증된 도보시간 → M01; 명시적 무료만 조건 + 확인된 모든 필수 비용 무료 → B02; 확인된 다음 고정 일정 시각·위치와 이동 연결 → P01.
- **억제:** 출발점 불명확 → M 계열 억제; 요금 미확인 → 해당 B Fit 억제; 관심사 미입력·유효 장기 선호 없음 → I 계열 억제.
- **시간:** 자율형 관람시간 미확인이나 운영·입장마감·이동 검증 → T03만 제한적 허용; 고정 회차/소요시간 누락 → 확인 불가 Fit 생성 금지·기존 후보/루트 배제 규칙 우선.
- **B 루트:** 2개 구성 정상, 전체 시간은 누적 계산, 일부 비용 누락 시 전체 B01/B02 억제, 개별 확정 이유는 유지, 재구성 실패 후 과거 루트 이유를 새 맥락에 재사용 금지.
- **하드 경계:** 검증 실패 시 0개 Reason 가능; 주 상태는 기존 Hard/Soft/UNKNOWN 규칙을 따른다. 예약 여부/실시간 잔여석/참여 자격은 Reason으로 확정하지 않는다.

## 6. 기준 위치

- **정본**: Google Docs `KONNECT 제품 기획 기준서` §5 (R-01~R-10 및 이 Dictionary의 의미·기준).
- **GitHub**: `product/02-input-recommendation-rules.md`에서 R Match Rule·핵심 Dictionary 참조, `product/05-ux-handoff.md`에서 LF-03/05/09 + UX용 예시, `decisions/decision-log.md` D-08 연결.
- **Sheet**: `(챗지피티)함께 결정` D-08은 Product 결정·위치 색인, 문구별 상세 목록은 이 파일에 유지하여 중복된 정본을 만들지 않는다.
