"""note_parser 결정론 규칙 테스트 (LLM 불필요 부분만).

'free or cheap'/'cheap' = ≤₩30,000 선호(무료만 아님). LLM 이 놓쳐도 코드가 교정.
"""

from __future__ import annotations

from datetime import date

from app.agent.note_parser import (
    CHEAP_KRW,
    _apply_cheap_rule,
    _apply_date_rule,
    _resolve_offset_phrase,
    _valid_future_date,
)
from app.models.recommend import ParsedConditions

TODAY = date(2026, 10, 15)


def test_free_or_cheap_sets_budget_not_free_only():
    out = _apply_cheap_rule("Free or cheap", ParsedConditions(free_only=True))
    assert out.budget_krw == CHEAP_KRW == 30000
    assert out.free_only is False  # 무료만으로 좁히지 않는다


def test_cheap_variants():
    for note in ["cheap", "affordable spots", "budget-friendly", "inexpensive please"]:
        out = _apply_cheap_rule(note, ParsedConditions())
        assert out.budget_krw == 30000, note


def test_explicit_amount_not_overridden():
    out = _apply_cheap_rule("cheap, under 10000", ParsedConditions(budget_krw=10000))
    assert out.budget_krw == 10000  # 구체 금액 우선


def test_free_only_without_cheap_stays_free_only():
    out = _apply_cheap_rule("only free experiences", ParsedConditions(free_only=True))
    assert out.free_only is True
    assert out.budget_krw is None


def test_no_cheap_word_is_noop():
    out = _apply_cheap_rule("quiet art galleries", ParsedConditions())
    assert out.budget_krw is None
    assert out.free_only is False


# ── 날짜 결정론 안전망 (#2a 프롬프트 날짜 — LLM 산술에 의존하지 않는다) ──


def test_offset_today_tomorrow_day_after():
    assert _resolve_offset_phrase("stuff today", TODAY) == TODAY
    assert _resolve_offset_phrase("free galleries tomorrow", TODAY) == date(2026, 10, 16)
    assert _resolve_offset_phrase("the day after tomorrow", TODAY) == date(2026, 10, 17)


def test_offset_n_days_variants():
    assert _resolve_offset_phrase("in 3 days", TODAY) == date(2026, 10, 18)
    assert _resolve_offset_phrase("3 days later", TODAY) == date(2026, 10, 18)
    assert _resolve_offset_phrase("5 days from now", TODAY) == date(2026, 10, 20)
    assert _resolve_offset_phrase("after 2 days", TODAY) == date(2026, 10, 17)


def test_day_after_beats_tomorrow():
    # 'day after tomorrow' 가 'tomorrow' 보다 먼저 매칭돼야 한다(+2, not +1)
    assert _resolve_offset_phrase("day after tomorrow near Insadong", TODAY) == date(2026, 10, 17)


def test_offset_none_when_no_phrase():
    assert _resolve_offset_phrase("quiet art galleries", TODAY) is None
    assert _resolve_offset_phrase("in 99 days", TODAY) is None  # 범위 밖(>60)


def test_valid_future_date_accepts_future_rejects_past_and_junk():
    assert _valid_future_date("2026-10-20", TODAY) == "2026-10-20"
    assert _valid_future_date("2026-10-15", TODAY) == "2026-10-15"  # 오늘 허용
    assert _valid_future_date("2026-10-01", TODAY) is None  # 과거
    assert _valid_future_date("not-a-date", TODAY) is None
    assert _valid_future_date(None, TODAY) is None


def test_apply_date_rule_phrase_overrides_llm():
    # 코드 안전망(tomorrow)이 LLM 이 준 날짜를 이긴다
    cond = ParsedConditions(date="2026-11-01")
    out = _apply_date_rule("tomorrow please", cond, TODAY)
    assert out.date == "2026-10-16"


def test_apply_date_rule_validates_llm_date():
    # 프레이즈 없으면 LLM 날짜를 검증만 — 과거는 버린다(→ None → 호출부 '오늘')
    out = _apply_date_rule("on October 20", ParsedConditions(date="2026-10-20"), TODAY)
    assert out.date == "2026-10-20"
    past = _apply_date_rule("some day", ParsedConditions(date="2020-01-01"), TODAY)
    assert past.date is None
