# TourAPI EngService2 `detailIntro2` 실측 — 2026-09-19

> 역할: KONNECT의 TourAPI 활용 범위를 정할 때 사용한 **조사 근거(Evidence Snapshot)**를 보존한다.  
> 이 문서는 현재 Product 기준 자체가 아니며, 최신 기준은 `product/`와 Google Docs `KONNECT 제품 기획 기준서`를 따른다.

## 1. 검증 목적

TourAPI가 서울 문화경험의 후보를 넓게 찾는 기본 데이터 소스로는 어느 정도 쓸 수 있는지, 반대로 KONNECT가 중요하게 보는 **가격·예약·시간·실행 가능성**을 어디까지 판정할 수 있는지 확인했다.

## 2. 실측 범위

- API: TourAPI EngService2
- 상세 호출: `detailIntro2`
- 서울 문화시설(Content Type 78): **30건 표본**
- 서울 행사(Content Type 85): **서울 전체 22건** (`totalCount=22`)
- 확인일: **2026-09-19**

이번 실측은 전체 TourAPI 품질을 통계적으로 일반화하기 위한 조사가 아니라, Product Rule을 정하기 위한 소량 검증이다.

## 3. 가격 관련 실측

### 문화시설 30건

`usefee` 기준:

| 상태 | 건수 |
|---|---:|
| 무료로 명확히 확인 | 9 |
| 구체적인 금액 확인 | 6 |
| 자유기술·모호 표현 | 10 |
| 빈값 | 5 |

- `discountinfo`: **0/30**
- 결론: Free 또는 명확한 숫자 가격은 일부 활용 가능하지만, 나머지를 무료나 예산 충족으로 추정할 수 없다.

### 행사 22건

`usetimefestival` 기준:

| 상태 | 건수 |
|---|---:|
| 무료로 명확히 확인 | 6 |
| 구체적인 유료 금액 확인 | 0 |
| 빈값 | 16 |

- `discountinfofestival`: **0/22**
- `bookingplace`: **0/22**
- 결론: 이번 표본에서는 행사 무료 여부는 일부 확인할 수 있었지만, **유료 행사의 실제 금액 비교에는 사용할 수 없었다.**

## 4. 시간·예약 후보 필드

`detailIntro2`에서 Product 관점의 후보 필드는 다음과 같다.

### 문화시설
- `usetimeculture`: 이용시간
- `spendtime`: 관람·체류 소요시간
- `usefee`: 이용요금
- `discountinfo`: 할인정보

### 행사
- `eventstartdate` / `eventenddate`: 행사기간
- `spendtimefestival`: 소요시간
- `bookingplace`: 예약·예매 관련 정보
- `usetimefestival`: 이용요금
- `discountinfofestival`: 할인정보

필드가 존재한다는 것과 실제 값이 안정적으로 채워진다는 것은 구분해야 한다. 소요시간·예약·자유기술 필드의 실제 값 충실도는 후속 검증 대상으로 남겼다.

## 5. Product 판단에 미친 영향

이 실측에서 다음 원칙이 강화됐다.

- TourAPI는 **후보 생성과 기본 정보 확보**에는 유용한 기본 소스다.
- 확인된 `Free` 또는 명확한 숫자 가격만 가격·예산 판정에 직접 사용한다.
- 빈값·자유기술·모호값을 무료나 예산 충족으로 바꾸지 않는다.
- 예약 정보가 없다는 이유로 **예약 불필요**로 판정하지 않는다.
- `사전예약 필요`, `지금 예약 가능`, `잔여좌석 있음`, `실제 참여 가능`은 서로 다른 상태로 본다.
- TourAPI만으로 현재 실행 가능성을 모두 확정하지 않고, 공식 상세·보완 데이터·추가 확인 경로를 함께 사용한다.

## 6. 연결 문서

- 현재 데이터·신뢰 기준: `product/03-data-trust-policy.md`
- 현재 입력·추천 판정: `product/02-input-recommendation-rules.md`
- 후속 데이터 소스 조사: `research/KONNECT_W2_추가데이터_Product직접검토_Tech확인요청_2026-09-23.md`
- Tech 검증 이력: `research/tech-validation/`

> 핵심 해석: **필드가 있다는 사실을 실행 가능성 보장으로 해석하지 않는다. 미확인은 정상적인 데이터 상태로 처리한다.**
