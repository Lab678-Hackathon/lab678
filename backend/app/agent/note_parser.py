"""자연어 note → 구조화 조건 (LLM, LangChain, A5).

PRD §5.2·FR-A4 신뢰 기준:
- 사용자가 '말한 조건만' 추출. 말하지 않은 선호는 만들어내지 않는다(추정 금지).
- LLM은 사실(가격·운영시간 등)을 생성하지 않는다 — 여기서는 '사용자 의도 구조화'만.
- 실패/빈 note 는 빈 조건으로 graceful(추천을 막지 않음).
"""

from __future__ import annotations

import logging
import re
from datetime import date, timedelta
from zoneinfo import ZoneInfo

from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI

from app.config import settings
from app.models.recommend import ParsedConditions

logger = logging.getLogger("konnect.agent")

SEOUL_TZ = ZoneInfo("Asia/Seoul")


def _today() -> date:
    """조회 기준 '오늘' — 서울 기준(외국인 사용자는 현지 날짜로 계획)."""
    from datetime import datetime

    return datetime.now(SEOUL_TZ).date()

# '한 체험당 ≤₩30,000' = 우리 서비스의 'cheap' 기준(Product 결정). "free or cheap"은
# 무료만이 아니라 저렴함까지 포함 → budget_krw 로 매핑(free_only 아님). 결정론 안전망.
CHEAP_KRW = 30000
_CHEAP_RE = re.compile(
    r"\b(free or cheap|cheap|affordable|budget[- ]friendly|inexpensive)\b",
    re.IGNORECASE,
)

_SYSTEM = (
    "You extract ONLY the conditions a traveler explicitly stated in their free-text "
    "note for a Seoul cultural-experience search. Do NOT infer, guess, or add anything "
    "they did not state. If a field is not mentioned, leave it at its default "
    "(empty list / false / null). Map interests to the fixed enum values. "
    "Put interests the user likes in 'interests'. For things they do NOT want, decide "
    "the strength: a MILD dislike that maps to one of the six interest enums goes in "
    "'avoid_interests' (e.g. 'not really into performances'); a CLEAR exclusion or refusal "
    "goes in 'exclude_concepts' as a short lowercase phrase (e.g. 'no museums' -> 'museums', "
    "'skip temples' -> 'temples', 'avoid anything religious' -> 'religious sites'). "
    "exclude_concepts is open-ended and need not map to the enum. If the user names a SPECIFIC "
    "place to remove or skip (e.g. 'remove Tapgol Park', 'not the belfry', 'drop X'), put that "
    "place name in 'exclude_places' (not exclude_concepts). A place the user says they have "
    "ALREADY planned, booked, or seen also goes in 'exclude_places' — they don't want it "
    "recommended again (e.g. 'I'm already visiting Gyeongbokgung tomorrow', 'we're seeing "
    "Bukchon later', 'already been to the N Seoul Tower', 'skip the ones I've done'). Such an "
    "already-planned/visited place must NOT also go in 'keywords' or 'interests' (that would "
    "re-surface it). If the user names a specific "
    "searchable thing — a concrete activity, craft, landmark, or subject (e.g. 'calligraphy', "
    "'hanbok', 'ceramics', 'Bukchon', 'lantern festival') — AND is not excluding or already "
    "planning it, put it in 'keywords' as a short "
    "English noun (this is for search; vibe adjectives like 'quiet' stay in open_preferences). "
    "Never place the same thing "
    "in both 'interests' and an avoid/exclude field. "
    "An indoor/outdoor preference goes ONLY in 'indoor_outdoor' (and 'indoor_outdoor_strict' "
    "for exclusive wording like 'indoor only'); never put 'indoor'/'outdoor' in "
    "open_preferences or keywords. "
    "If the user states a concrete starting clock time (e.g. 'from 1pm', 'starting at 10', "
    "'begin at noon'), put it in 'start_time' as 'HH:MM' 24h. "
    "If the user states a concrete finishing clock time (e.g. 'until 5pm', 'by 6', 'before "
    "16:30'), put it in 'end_time' as 'HH:MM' 24h. If the user states a concrete amount of "
    "time they have (e.g. 'I have 3 hours', '90 minutes', 'about an hour'), put the minutes in "
    "'duration_minutes'. Leave BOTH null for vague time words like 'afternoon', 'evening', "
    "'tonight', 'a while', 'some time' — do not convert vague words into a clock time or "
    "duration. Never invent a time. Budget is in "
    "Korean won (KRW); only fill budget if the user gave a concrete amount. "
    "If the user wants cheap/affordable/budget options (e.g. 'free or cheap', 'cheap', "
    "'affordable', 'budget-friendly') WITHOUT a specific amount, set budget_krw to 30000 "
    "(we treat up to ₩30,000 per experience as cheap) and leave free_only false — do NOT "
    "restrict to free only. Set free_only true ONLY for an explicit free-only request "
    "('free only', 'must be free', 'no paid experiences'). Never invent "
    "prices, times, or availability. "
    "For walking: 'shorter walks'/'less walking'/'not much walking' -> prefer_shorter_walks:true; "
    "an explicit liking for OR OK with lots of walking ('long walks are fine', 'I don't mind "
    "walking a lot', 'happy to walk', 'I love to walk', 'I love walking', 'walking is my "
    "favourite') -> prefer_shorter_walks:false; if walking isn't mentioned, leave it null.\n"
    "Put into 'unsupported' (short lowercase labels) anything the user asked for that this "
    "service canNOT act on, so we can tell them plainly instead of ignoring it. Only two cases: "
    "(1) scheduling a future activity/meal/event at a time we don't plan around (e.g. 'dinner at "
    "7' -> 'dinner plans', 'catch a show tonight' -> 'evening show'); (2) off-domain requests "
    "outside Seoul cultural experiences (e.g. 'see the zoo' -> 'zoos / animals', 'go shopping' -> "
    "'shopping', 'nightclub' -> 'nightlife'). Leave 'unsupported' EMPTY when everything maps to a "
    "supported condition. Never put a supported condition (interest, budget, indoor/outdoor, "
    "walking, a cultural keyword/place, a finish time) into 'unsupported'.\n"
    "Examples:\n"
    "- 'free or cheap' -> budget_krw:30000 (free_only stays false)\n"
    "- 'only free experiences' -> free_only:true\n"
    "- 'less walking please' -> prefer_shorter_walks:true\n"
    "- 'long walks are totally fine' -> prefer_shorter_walks:false\n"
    "- 'I love to walk' -> prefer_shorter_walks:false\n"
    "- 'things to do tomorrow near Insadong' -> keywords:['Insadong'], date:(today + 1 day)\n"
    "- 'free exhibitions in 3 days' -> interests:[art_exhibitions], free_only:true, "
    "date:(today + 3 days)\n"
    "- 'something near Insadong until 5pm' -> keywords:['Insadong'], end_time:'17:00'\n"
    "- 'a cultural route from 1pm to 5pm' -> start_time:'13:00', end_time:'17:00'\n"
    "- 'I only have about 2 hours' -> duration_minutes:120\n"
    "- 'free galleries this afternoon' -> interests:[art_exhibitions], free_only:true "
    "(afternoon is vague -> no end_time/duration)\n"
    "- 'quiet indoor art galleries, no temples' -> interests:[art_exhibitions], "
    "indoor_outdoor:indoor, open_preferences:['quiet'], exclude_concepts:['temples']\n"
    "- 'try calligraphy near Bukchon, but not Gyeongbokgung' -> interests:[hands_on], "
    "keywords:['calligraphy','Bukchon'], exclude_places:['Gyeongbokgung']\n"
    "- 'I'm already visiting Gyeongbokgung tomorrow, show me other things' -> "
    "exclude_places:['Gyeongbokgung'] (NOT keywords — they've already planned it)\n"
    "- 'outdoor only, free palaces' -> interests:[palaces_historic], indoor_outdoor:outdoor, "
    "indoor_outdoor_strict:true, free_only:true\n"
    "- 'free exhibitions, then dinner at 7 in Myeongdong' -> interests:[art_exhibitions], "
    "free_only:true, unsupported:['dinner plans']\n"
    "- 'I love animals, take me to the zoo' -> unsupported:['zoos / animals'] "
    "(nothing else maps)"
)

_PROMPT = ChatPromptTemplate.from_messages(
    [("system", _SYSTEM), ("human", "Today is {today}. Note: {note}")]
)


async def parse_note(note: str | None, today: date | None = None) -> ParsedConditions:
    today = today or _today()
    if not note or not note.strip():
        return ParsedConditions()
    try:
        llm = ChatOpenAI(
            model=settings.agent_orchestrator_model,  # 조건 추출(보조) — 경량 모델
            temperature=0,
            api_key=settings.openai_api_key,
            timeout=20,
        )
        chain = _PROMPT | llm.with_structured_output(ParsedConditions)
        cond = await chain.ainvoke(
            {"note": note.strip(), "today": today.isoformat()}
        )
    except Exception as e:  # noqa: BLE001 — LLM/네트워크 어떤 실패든 추천을 막지 않는다
        logger.warning("note parse failed: %s", type(e).__name__)
        cond = ParsedConditions()
    return _apply_date_rule(note, _apply_cheap_rule(note, cond), today)


def _apply_cheap_rule(note: str, cond: ParsedConditions) -> ParsedConditions:
    """'free or cheap'/'cheap' = ≤₩30,000 선호(무료만 아님). 결정론 안전망 — LLM 이
    놓치거나 free_only 로 과도하게 좁혀도 교정한다. 구체 금액이 이미 있으면 건드리지 않는다."""
    if cond.budget_krw is None and _CHEAP_RE.search(note):
        return cond.model_copy(update={"budget_krw": CHEAP_KRW, "free_only": False})
    return cond


# 단순 상대 날짜(오늘/내일/모레/N일 후) — 결정론으로 계산해 LLM 산술 오류를 보정한다.
# 명시 날짜·요일 같은 복잡 표현은 여기서 다루지 않고 LLM 결과(cond.date)를 검증만 한다.
_DAY_AFTER_RE = re.compile(r"\bday after tomorrow\b", re.IGNORECASE)
_TOMORROW_RE = re.compile(r"\btomorrow\b", re.IGNORECASE)
_TODAY_RE = re.compile(r"\b(today|tonight)\b", re.IGNORECASE)
_IN_N_DAYS_RE = re.compile(
    r"\b(?:in|after)\s+(\d{1,2})\s+days?\b|\b(\d{1,2})\s+days?\s+(?:later|from now)\b",
    re.IGNORECASE,
)


def _resolve_offset_phrase(note: str, today: date) -> date | None:
    """note 에서 '오늘/내일/모레/N일 후'만 결정론으로 → 절대 날짜. 아니면 None(LLM 에 맡김).

    더 구체적인 표현을 먼저 본다(day after tomorrow → tomorrow). N 은 0~60 으로 제한.
    """
    if _DAY_AFTER_RE.search(note):
        return today + timedelta(days=2)
    m = _IN_N_DAYS_RE.search(note)
    if m:
        n = int(m.group(1) or m.group(2))
        if 1 <= n <= 60:
            return today + timedelta(days=n)
    if _TOMORROW_RE.search(note):
        return today + timedelta(days=1)
    if _TODAY_RE.search(note):
        return today
    return None


def _valid_future_date(value: str | None, today: date) -> str | None:
    """LLM 이 준 날짜 문자열을 검증 — 'YYYY-MM-DD' 이고 과거가 아니면 통과, 아니면 None(→ 오늘)."""
    if not value:
        return None
    try:
        d = date.fromisoformat(value.strip())
    except (ValueError, AttributeError):
        return None
    return value.strip() if d >= today else None


def _apply_date_rule(note: str, cond: ParsedConditions, today: date) -> ParsedConditions:
    """조회 날짜 확정 — 단순 상대표현은 코드가 계산(안전망), 그 외는 LLM 날짜를 검증.

    과거 날짜·형식 오류는 버린다(None → 호출부에서 '오늘'로 기본 처리). 추정으로 채우지 않는다.
    """
    resolved = _resolve_offset_phrase(note, today)
    new_date = resolved.isoformat() if resolved else _valid_future_date(cond.date, today)
    if new_date != cond.date:
        return cond.model_copy(update={"date": new_date})
    return cond
