"""예약/예매 적용성 판정 (A3, 2026-10-14 Product).

Fits 는 '모든 조건이 확실'해야 하며 여기엔 **예약 필요 여부가 명확**하고(필요 없음이
확인되었거나, 필요하지만 참여조건 충돌 없음) 하는 조건이 포함된다. 예약 여부를 알 수
없으면 Fits 가 아니라 'Partially confirmed'(check_needed)로 둔다.

현실 제약: TourAPI(EngService2)는 예약 가능 상태를 구조적으로 주지 않는다(`bookingplace`·
`eventhomepage` 사실상 공란 — 실측). 그래서 '예약이 적용되는 콘텐츠인지'를 **유형 + 공식
신호**로 결정론 판정한다. 없는 예약 상태를 지어내지 않으며(§6), 판정은 오직 Fits→Partially
로 '낮추는' 방향으로만 작동한다(미확인을 긍정으로 바꾸지 않음).

유형 매핑:
- 워크인 입장형(명소·박물관·미술관): 일반 입장에 예약 불필요가 통념 → NOT_REQUIRED.
  (공식 운영시간 텍스트의 'reservation/예약'은 timing 이 이미 UNCERTAIN 으로 잡는다.)
- 예매형(공연·체험): 예매/사전신청이 통념인데 가능 상태 미확인 → APPLIES_UNCONFIRMED.
- 축제·행사(TourAPI 85)는 개방축제와 예매공연이 한 유형(FESTIVAL_EVENT)으로 섞인다 →
  공식 공연 신호(agelimit·playtime·bookingplace)가 있으면 예매공연으로 보고
  APPLIES_UNCONFIRMED, 없으면 개방축제로 보고 NOT_REQUIRED.
"""

from __future__ import annotations

from typing import Any

from app.models.recommend import ExperienceType, ReservationVerdict

# 예매/사전신청이 통념인 유형(참여 전 예약 확인 필요).
_BOOKING_TYPES = {ExperienceType.PERFORMANCE, ExperienceType.HANDS_ON}
# 일반 입장에 예약이 필요 없는 워크인 유형.
_WALKIN_TYPES = {ExperienceType.HISTORIC_VISIT, ExperienceType.EXHIBITION}
# TourAPI 85(FESTIVAL_EVENT) 안에서 '예매공연'을 가르는 공식 신호(detailIntro2 필드).
_PERFORMANCE_SIGNAL_KEYS = ("agelimit", "playtime", "bookingplace")


def _has_any(intro: dict[str, Any], keys: tuple[str, ...]) -> bool:
    return any(str(intro.get(k) or "").strip() for k in keys)


def judge_reservation(
    etype: ExperienceType, intro: dict[str, Any] | None = None
) -> ReservationVerdict:
    """유형 + 공식 신호 → 예약 적용성. intro 없으면 신호 없이 유형만으로 판정."""
    intro = intro or {}
    if etype in _BOOKING_TYPES:
        return ReservationVerdict.APPLIES_UNCONFIRMED
    if etype in _WALKIN_TYPES:
        return ReservationVerdict.NOT_REQUIRED
    if etype is ExperienceType.FESTIVAL_EVENT:
        # 공연 신호 있으면 예매공연, 없으면 개방축제(워크인).
        if _has_any(intro, _PERFORMANCE_SIGNAL_KEYS):
            return ReservationVerdict.APPLIES_UNCONFIRMED
        return ReservationVerdict.NOT_REQUIRED
    return ReservationVerdict.UNKNOWN
