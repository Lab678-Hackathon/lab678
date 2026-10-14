"""3상태 산정 테스트 (A3+A5, FR-C3·§5.4)."""

from __future__ import annotations

from app.domain.budget import BudgetVerdict
from app.domain.status import resolve_status
from app.domain.timing import TimingVerdict
from app.models.recommend import (
    Candidate,
    ExperienceType,
    InterestCode,
    ParsedConditions,
    PriceInfo,
    PriceStatus,
    Provenance,
    ResultStatus,
)


def _cand(
    price_status: PriceStatus, etype: ExperienceType = ExperienceType.DEFAULT
) -> Candidate:
    return Candidate(
        id="c1",
        title="X",
        type=etype,
        status=ResultStatus.CHECK_NEEDED,
        price=PriceInfo(
            status=price_status,
            display="d",
            provenance=(
                Provenance.CONFIRMED
                if price_status in (PriceStatus.FREE, PriceStatus.PAID)
                else Provenance.UNCONFIRMED
            ),
        ),
    )


def R(price, timing, budget=BudgetVerdict.OK, cond=None, etype=ExperienceType.DEFAULT):
    return resolve_status(
        _cand(price, etype), timing, budget, cond or ParsedConditions()
    )


def test_closed_is_excluded():
    status, _flags = R(PriceStatus.FREE, TimingVerdict.CLOSED)
    assert status is None  # 정상 추천에서 제외


def test_open_and_price_known_is_fits():
    status, flags = R(PriceStatus.FREE, TimingVerdict.OPEN)
    assert status is ResultStatus.FITS
    assert flags == []


def test_open_but_price_unknown_is_check():
    status, flags = R(PriceStatus.UNKNOWN, TimingVerdict.OPEN)
    assert status is ResultStatus.CHECK_NEEDED
    assert "Price needs checking" in [f.text for f in flags]


def test_uncertain_hours_is_check_with_flag():
    status, flags = R(PriceStatus.PAID, TimingVerdict.UNCERTAIN)
    assert status is ResultStatus.CHECK_NEEDED
    assert "Hours need checking" in [f.text for f in flags]


def test_uncertain_hours_and_unknown_price_has_both_flags():
    _status, flags = R(PriceStatus.UNKNOWN, TimingVerdict.UNCERTAIN)
    texts = [f.text for f in flags]
    assert "Price needs checking" in texts and "Hours need checking" in texts


def test_partial_price_is_not_fits():
    status, flags = R(PriceStatus.PARTIAL_OR_AMBIGUOUS, TimingVerdict.OPEN)
    assert status is ResultStatus.CHECK_NEEDED
    assert "Price varies · check details" in [f.text for f in flags]


# ── A5: 예산 → 조건 완화 대안 ──
def test_over_budget_is_alternative():
    status, flags = R(
        PriceStatus.PAID,
        TimingVerdict.OPEN,
        BudgetVerdict.OVER,
        ParsedConditions(budget_krw=5000),
    )
    assert status is ResultStatus.ALTERNATIVE
    assert "Above your budget" in [f.text for f in flags]


def test_free_only_paid_is_alternative_not_free():
    status, flags = R(
        PriceStatus.PAID,
        TimingVerdict.OPEN,
        BudgetVerdict.OVER,
        ParsedConditions(free_only=True),
    )
    assert status is ResultStatus.ALTERNATIVE
    assert "Not a free option" in [f.text for f in flags]


def test_unknown_budget_is_not_fits():
    # 예산 설정됐으나 가격 미확인 → 비교 불가 → fits 아님
    status, _flags = R(PriceStatus.UNKNOWN, TimingVerdict.OPEN, BudgetVerdict.UNKNOWN)
    assert status is ResultStatus.CHECK_NEEDED


# ── (2026-10-14) 관심사/요청 선호도 Fits 조건 ──
def test_interest_match_is_fits():
    # 요청 관심사(ART)와 유형(EXHIBITION) 일치 + 사실 OK → fits
    status, flags = R(
        PriceStatus.FREE,
        TimingVerdict.OPEN,
        cond=ParsedConditions(interests=[InterestCode.ART_EXHIBITIONS]),
        etype=ExperienceType.EXHIBITION,
    )
    assert status is ResultStatus.FITS
    assert flags == []


def test_interest_mismatch_is_alternative():
    # 사실은 다 맞지만 요청 관심사(ART)와 유형(HISTORIC_VISIT)이 다름 → alternative(조건 밖)
    status, flags = R(
        PriceStatus.FREE,
        TimingVerdict.OPEN,
        cond=ParsedConditions(interests=[InterestCode.ART_EXHIBITIONS]),
        etype=ExperienceType.HISTORIC_VISIT,
    )
    assert status is ResultStatus.ALTERNATIVE
    assert "Outside your interests" in [f.text for f in flags]


def test_interest_mismatch_keeps_fact_flags():
    # 관심사 불일치 + 가격 미확인 → alternative 지만 '가격 확인' flag 는 보존(투명)
    status, flags = R(
        PriceStatus.UNKNOWN,
        TimingVerdict.OPEN,
        cond=ParsedConditions(interests=[InterestCode.ART_EXHIBITIONS]),
        etype=ExperienceType.HISTORIC_VISIT,
    )
    texts = [f.text for f in flags]
    assert status is ResultStatus.ALTERNATIVE
    assert "Outside your interests" in texts and "Price needs checking" in texts


def test_avoided_type_is_alternative():
    # 비선호(공연) 유형 → 사실 OK 여도 조건 밖 대안
    status, _flags = R(
        PriceStatus.FREE,
        TimingVerdict.OPEN,
        cond=ParsedConditions(avoid_interests=[InterestCode.LIVE_PERFORMANCES]),
        etype=ExperienceType.PERFORMANCE,
    )
    assert status is ResultStatus.ALTERNATIVE


def test_no_interest_request_keeps_fact_based_fits():
    # 관심사 요청이 없으면(프롬프트 없음) 기존대로 사실만으로 fits — 유형 무관
    status, flags = R(
        PriceStatus.FREE, TimingVerdict.OPEN, etype=ExperienceType.HISTORIC_VISIT
    )
    assert status is ResultStatus.FITS
    assert flags == []
