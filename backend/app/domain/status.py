"""결과 상태 3종 산정 (A3+A5, FR-C3 · PRD §5.4).

내부 판정 순서:
  1) Hard 충돌(영업외·휴무·행사종료) → 추천 제외(None)
  2) 조정 가능한 조건 불일치(예산 초과) → 조건 완화 대안(alternative)
  3) 관심사/요청 선호 불일치(사실은 OK) → 조건 밖 대안(alternative) — 개수 보강용
  4) 명확한 불일치 없고 요청 선호도 맞으나 핵심정보 미확인 → 추가 확인 필요(check_needed)
  5) 핵심조건 확인·충돌 없음 + 요청 선호 100% 일치 → 조건 충족(fits)

(2026-10-14 Product) Fits 는 '확인 가능한 사실(시간·가격·예산)'뿐 아니라 '사용자가 명시한
관심사/요청 선호'까지 100% 맞아야 한다. 사실은 다 맞지만 요청 관심사와 다른 후보는 조건 '밖'이라
alternative(개수가 부족할 때 감수하고 제안)로 분류한다 — 제외가 아니라 라벨/순서만(§6 soft).

미확인을 긍정으로 바꾸지 않는다. alternative 는 차이를 flag로 명시하고
해당 조건에 충족 Reason을 붙이지 않는다(reasons 단계에서 budget OK 아닐 때 제외).
"""

from __future__ import annotations

from app.domain.budget import BudgetVerdict
from app.domain.ranking import interest_matched
from app.domain.timing import TimingVerdict
from app.models.recommend import (
    Candidate,
    ParsedConditions,
    PriceStatus,
    ResultStatus,
    UnconfirmedFlag,
)


def resolve_status(
    candidate: Candidate,
    timing: TimingVerdict,
    budget: BudgetVerdict,
    cond: ParsedConditions,
) -> tuple[ResultStatus | None, list[UnconfirmedFlag]]:
    """(상태, flags). None = Hard 제외."""
    if timing is TimingVerdict.CLOSED:
        return None, []

    # 2) 예산 초과 → 조건 완화 대안 (차이 명시)
    if budget is BudgetVerdict.OVER:
        flags: list[UnconfirmedFlag] = []
        if cond.free_only and cond.budget_krw is None:
            flags.append(UnconfirmedFlag(text="Not a free option"))
        else:
            flags.append(UnconfirmedFlag(text="Above your budget"))
        if timing is TimingVerdict.UNCERTAIN:
            flags.append(UnconfirmedFlag(text="Hours need checking"))
        return ResultStatus.ALTERNATIVE, flags

    # 미확인(가격·시간) 분리 — fits/check/alt 어느 쪽이든 flag 는 투명 표기.
    price_known = candidate.price.status in (PriceStatus.FREE, PriceStatus.PAID)
    flags = []
    if candidate.price.status is PriceStatus.UNKNOWN:
        flags.append(UnconfirmedFlag(text="Price needs checking"))
    elif candidate.price.status is PriceStatus.PARTIAL_OR_AMBIGUOUS:
        flags.append(UnconfirmedFlag(text="Price varies · check details"))
    if timing is TimingVerdict.UNCERTAIN:
        flags.append(UnconfirmedFlag(text="Hours need checking"))

    # 3) 요청 관심사/선호 불일치 → 조건 '밖' 대안. 사실(시간·가격)이 다 맞아도 Fits/Partially 아님.
    #    미확인 flag 가 함께 있으면 보존해 투명 표기(가격 확인 등은 여전히 알려준다).
    if not interest_matched(candidate, cond):
        return ResultStatus.ALTERNATIVE, [
            UnconfirmedFlag(text="Outside your interests"),
            *flags,
        ]

    # 4~5) 요청 선호는 맞음 → 사실 미확인 여부로 fits/check 분기.
    budget_ok = budget in (BudgetVerdict.OK,)  # UNKNOWN 예산은 fits 아님
    if timing is TimingVerdict.OPEN and price_known and budget_ok:
        return ResultStatus.FITS, []
    return ResultStatus.CHECK_NEEDED, flags
