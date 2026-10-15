"""운영시간·휴무 판정 테스트 (A3). 확실할 때만 CLOSED, 애매하면 UNCERTAIN."""

from __future__ import annotations

import calendar
from datetime import datetime

from app.domain.timing import (
    ExtractedHours,
    TimingVerdict,
    judge_extracted_hours,
    judge_timing,
    operating_hours_text,
    parse_closed_weekdays,
    parse_last_admission,
    parse_time_ranges,
    resolve_prose_window,
    shift_to_request_date,
    should_retry_hours_with_llm,
)

# effective_end_at (narrow-only) 는 resolve_prose_window(override 허용)로 통일되며 제거됨.

# 2026-10-06 는 화요일. 윈도우 10:00~14:00.
DAY = datetime(2026, 10, 6, 10, 0)
DAY_END = datetime(2026, 10, 6, 14, 0)
DAY_NAME = calendar.day_name[DAY.weekday()]  # 'Tuesday'


def J(intro, start=DAY, end=DAY_END):
    return judge_timing(intro, start, end)[0]


# ── 파싱 ──
def test_parse_single_range():
    assert parse_time_ranges("10:00-18:00") == [
        (__import__("datetime").time(10, 0), __import__("datetime").time(18, 0))
    ]


def test_parse_multiple_ranges():
    assert len(parse_time_ranges("Museum 10:00-18:00 / Tea house 10:00-22:50")) == 2


def test_parse_last_admission():
    from datetime import time

    assert parse_last_admission("10:00-18:00 (Last admission 17:30)") == time(17, 30)


def test_closed_weekdays():
    assert parse_closed_weekdays("Every Monday") == {0}
    assert parse_closed_weekdays("Weekends") == {5, 6}
    assert parse_closed_weekdays("Open all year round") == set()


# ── 판정 ──
def test_open_when_within_hours():
    assert J({"usetime": "09:00-18:00"}) is TimingVerdict.OPEN


def test_closed_outside_hours():
    # 19:00-22:00 영업 → 10~14 윈도우와 겹치지 않음 → Hard
    assert J({"usetime": "19:00-22:00"}) is TimingVerdict.CLOSED


def test_closed_on_rest_weekday():
    assert J({"usetime": "09:00-18:00", "restdate": DAY_NAME}) is TimingVerdict.CLOSED


def test_closed_after_last_admission():
    late_start = datetime(2026, 10, 6, 17, 45)
    late_end = datetime(2026, 10, 6, 19, 0)
    v = judge_timing(
        {"usetime": "10:00-18:00 (Last admission 17:30)"}, late_start, late_end
    )[0]
    assert v is TimingVerdict.CLOSED


def test_uncertain_no_hours():
    assert J({}) is TimingVerdict.UNCERTAIN


def test_uncertain_seasonal_multi_range():
    # 계절·복수 범위 → 단정하지 않음(겹쳐도 UNCERTAIN)
    hours = "March-October 09:00-18:00 / November-February 09:00-17:00"
    assert J({"usetime": hours}) is TimingVerdict.UNCERTAIN


def test_closed_seasonal_multi_range_all_miss_window():
    # 계절 복수 범위라도 '모든' 범위가 창과 안 겹치면 CLOSED(어느 시즌이든 닫힘 — 오탈락 없음).
    # 예: 22:10~23:10 요청에 09:00-18:00 / 09:00-17:00 둘 다 마감 (어린이박물관 케이스).
    hours = "March-October 09:00-18:00 / November-February 09:00-17:00"
    late = datetime(2026, 10, 6, 22, 10)
    late_end = datetime(2026, 10, 6, 23, 10)
    assert J({"usetime": hours}, late, late_end) is TimingVerdict.CLOSED


def test_uncertain_word_caveat_all_miss_stays_uncertain():
    # 단어형 caveat('vary')는 숫자가 예시일 수 있어 안 겹쳐도 보류(UNCERTAIN).
    hours = "Hours vary, generally 09:00-18:00"
    late = datetime(2026, 10, 6, 22, 10)
    late_end = datetime(2026, 10, 6, 23, 10)
    assert J({"usetime": hours}, late, late_end) is TimingVerdict.UNCERTAIN


def test_uncertain_lodging_hours():
    assert J({"usetime": "Check-in 15:00 / Check-out 11:00"}) is TimingVerdict.UNCERTAIN


def test_uncertain_inquire_caveat():
    assert J({"usetime": "10:00-20:00 (Inquire by phone)"}) is TimingVerdict.UNCERTAIN


def test_open_24_hours():
    assert J({"usetime": "Open 24 hr"}) is TimingVerdict.OPEN


# ── 행사 기간(축제·공연) ──
def test_ended_event_excluded():
    # 2025-10-26 종료 공연을 2026-10-06에 방문 → CLOSED(종료)
    intro = {"eventstartdate": "20251010", "eventenddate": "20251026"}
    assert J(intro) is TimingVerdict.CLOSED


def test_future_event_excluded():
    intro = {"eventstartdate": "20271010", "eventenddate": "20271026"}
    assert J(intro) is TimingVerdict.CLOSED


def test_running_event_not_closed_by_dates():
    # 기간 내(2026-10-06 포함) → 날짜로는 CLOSED 아님(운영시간 판정으로)
    intro = {
        "eventstartdate": "20261001",
        "eventenddate": "20261031",
        "usetimefestival": "10:00-18:00",
    }
    assert J(intro) is TimingVerdict.OPEN


def test_window_to_midnight_still_open():
    # 종료가 다음날 00:00(시작일 24:00 경계) → 그날 끝으로 처리, 영업시간과 겹침
    end_midnight = datetime(2026, 10, 7, 0, 0)
    assert (
        judge_timing(
            {"usetime": "10:00-22:00"}, datetime(2026, 10, 6, 20, 0), end_midnight
        )[0]
        is TimingVerdict.OPEN
    )


# ── LLM 추출 hours 재판정 (3단계, 보수적: OPEN 승격만) ──
def test_retry_gate_only_for_parse_difficulty():
    # regex가 '텍스트 있음·파싱 애매'로 UNCERTAIN → 재시도 대상
    assert should_retry_hours_with_llm(
        TimingVerdict.UNCERTAIN, "operating hours not parseable"
    )
    assert should_retry_hours_with_llm(
        TimingVerdict.UNCERTAIN, "operating hours need checking"
    )
    # 빈값/숙박전용/이미 확정은 재시도 안 함
    assert not should_retry_hours_with_llm(
        TimingVerdict.UNCERTAIN, "operating hours not provided"
    )
    assert not should_retry_hours_with_llm(
        TimingVerdict.OPEN, "open during your time window"
    )


def test_operating_hours_text_picks_first():
    assert operating_hours_text({"usetimeculture": "09:00-18:00"}) == "09:00-18:00"
    assert operating_hours_text({}) == ""


def test_extracted_open_promotes():
    h = ExtractedHours(determinable=True, open_time="09:00", close_time="18:00")
    assert judge_extracted_hours(h, DAY, DAY_END)[0] is TimingVerdict.OPEN


def test_extracted_always_open():
    h = ExtractedHours(determinable=True, always_open=True)
    assert judge_extracted_hours(h, DAY, DAY_END)[0] is TimingVerdict.OPEN


def test_extracted_not_determinable_stays_uncertain():
    h = ExtractedHours(determinable=False)
    assert judge_extracted_hours(h, DAY, DAY_END)[0] is TimingVerdict.UNCERTAIN


def test_extracted_non_overlap_not_hard_closed():
    # 창(10~14)과 안 겹쳐도 LLM 단독 CLOSED 금지 → UNCERTAIN 유지
    h = ExtractedHours(determinable=True, open_time="18:00", close_time="21:00")
    assert judge_extracted_hours(h, DAY, DAY_END)[0] is TimingVerdict.UNCERTAIN


def test_extracted_after_last_admission_stays_uncertain():
    h = ExtractedHours(
        determinable=True, open_time="09:00", close_time="18:00", last_admission="09:30"
    )
    late = datetime(2026, 10, 6, 10, 0)
    assert judge_extracted_hours(h, late, DAY_END)[0] is TimingVerdict.UNCERTAIN


def test_judge_event_period():
    from datetime import date

    from app.domain.timing import EventPeriod, judge_event_period

    ref = date(2026, 10, 8)
    assert (
        judge_event_period(
            {"eventstartdate": "20251010", "eventenddate": "20251026"}, ref
        )
        is EventPeriod.ENDED
    )  # 작년 종료 → 끝남
    assert (
        judge_event_period(
            {"eventstartdate": "20270101", "eventenddate": "20270110"}, ref
        )
        is EventPeriod.UPCOMING
    )  # 미래 시작 → 아직
    assert (
        judge_event_period(
            {"eventstartdate": "20261001", "eventenddate": "20261031"}, ref
        )
        is EventPeriod.ACTIVE
    )  # 기간 내
    assert judge_event_period({"eventenddate": "20261031"}, ref) is EventPeriod.ACTIVE
    assert judge_event_period({}, ref) is EventPeriod.UNKNOWN  # 날짜 없음 → 제외 안 함


# ── resolve_prose_window (산문 전체 시간창 반영 — override 허용, A·B 공통) ──

# 10:00 시작, 폼 종료 18:00.
_S = datetime(2026, 10, 6, 10, 0)
_FORM_END = datetime(2026, 10, 6, 18, 0)


def test_prose_window_full_override_extends():
    # 'from 1pm to 5pm' → [13:00, 17:00] 로 폼 창(10:00~18:00)을 덮어쓴다(시작 override·확장 허용).
    s, e, applied = resolve_prose_window(_S, _FORM_END, "13:00", "17:00", None)
    assert applied == "start+end"
    assert (s, e) == (datetime(2026, 10, 6, 13, 0), datetime(2026, 10, 6, 17, 0))


def test_prose_window_end_only_can_extend_past_form():
    # narrow-only 와 달리 명시 종료는 폼보다 늦어도 반영(사용자가 직접 말한 시간).
    s, e, applied = resolve_prose_window(_S, _FORM_END, None, "20:00", None)
    assert applied == "end"
    assert (s, e) == (_S, datetime(2026, 10, 6, 20, 0))


def test_prose_window_start_only_keeps_form_end():
    # 시작만 명시 → 종료는 폼 유지.
    s, e, applied = resolve_prose_window(_S, _FORM_END, "12:00", None, None)
    assert applied == "start"
    assert (s, e) == (datetime(2026, 10, 6, 12, 0), _FORM_END)


def test_prose_window_duration_from_prose_start():
    # 시작 override + duration → 종료 = 새 시작 + duration.
    s, e, applied = resolve_prose_window(_S, _FORM_END, "13:00", None, 120)
    assert applied == "start"
    assert s == datetime(2026, 10, 6, 13, 0)
    assert e == datetime(2026, 10, 6, 15, 0)


def test_prose_window_none_when_not_stated():
    assert resolve_prose_window(_S, _FORM_END, None, None, None) == (_S, _FORM_END, None)


def test_prose_window_invalid_reversed_keeps_form():
    # 종료가 시작보다 이르거나 30분 미만 → 지어내지 않고 폼 유지.
    assert resolve_prose_window(_S, _FORM_END, "17:00", "14:00", None) == (
        _S,
        _FORM_END,
        None,
    )
    assert resolve_prose_window(_S, _FORM_END, "10:00", "10:20", None) == (
        _S,
        _FORM_END,
        None,
    )


# ── shift_to_request_date (#2a 프롬프트 날짜) ──


def test_shift_to_future_date_preserves_clock_and_window():
    s = datetime(2026, 10, 15, 14, 0)
    e = datetime(2026, 10, 15, 17, 30)
    ns, ne = shift_to_request_date(s, e, "2026-10-18")
    assert (ns.year, ns.month, ns.day, ns.hour, ns.minute) == (2026, 10, 18, 14, 0)
    assert (ne.year, ne.month, ne.day, ne.hour, ne.minute) == (2026, 10, 18, 17, 30)
    assert ne - ns == e - s  # 창 길이 보존


def test_shift_noop_when_same_or_past_or_invalid():
    s = datetime(2026, 10, 15, 14, 0)
    e = datetime(2026, 10, 15, 17, 30)
    assert shift_to_request_date(s, e, "2026-10-15") == (s, e)  # 같은 날
    assert shift_to_request_date(s, e, "2026-10-01") == (s, e)  # 과거 → 무변경
    assert shift_to_request_date(s, e, "junk") == (s, e)
    assert shift_to_request_date(s, e, None) == (s, e)


# ── summarize_hours (#텍스트 짤림 — 카드용 간결 한 줄, 생성 아님) ──


def test_summarize_hours_simple_range():
    from app.domain.timing import summarize_hours

    assert summarize_hours("09:00-18:00") == "09:00–18:00"
    # 마지막 입장 등 부가 텍스트가 있어도 시각 범위만 뽑는다(짤림 없음).
    assert summarize_hours("09:00-18:00 (Last admission 17:30)") == "09:00–18:00"


def test_summarize_hours_multi_range_is_ambiguous():
    # 범위가 2개 이상이면(요일/시설별 변형 — 예: 평일/주말) 하나로 단정 못 함 → None.
    # Boan1942 처럼 '12:00-18:00 / 12:00-19:00'를 '·'로 이어 붙여 오해주지 않는다.
    from app.domain.timing import summarize_hours

    assert summarize_hours("12:00-18:00 / 12:00-19:00") is None
    assert summarize_hours("10:00-13:00, 14:00-18:00") is None


def test_summarize_hours_24h():
    from app.domain.timing import summarize_hours

    assert summarize_hours("Open 24 hr") == "Open 24 hours"


def test_summarize_hours_ambiguous_returns_none():
    # 계절·'문의/상이' 등은 그날 한 시간대로 단정 못 함 → None(공식 링크로, 시간 지어내지 않음).
    from app.domain.timing import summarize_hours

    assert summarize_hours("March-October 09:00-18:00 / November-February 09:00-17:00") is None
    assert summarize_hours("Inquire by phone") is None
    assert summarize_hours("") is None
