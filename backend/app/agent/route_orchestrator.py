"""B 문화루트 파이프라인 (B2 코어).

A 파이프라인의 조회·정규화·판정(_fetch_pool·_enrich)을 재사용해 **개별 실행가능 후보**를 얻고,
domain/route 로 하루 1코스(2~3 스톱)를 조립한 뒤 구간별 도보(Tmap)를 붙인다.

신뢰 경계:
- 후보 feasibility(운영중·Hard 제외)는 A와 동일 코드가 판정(사실은 코드 소유).
- 체류시간 미주장(B-T01): 루트 total 은 **도보 이동시간**만. 도보만으로 창을 넘으면 불가.
- 관심사·이동 '균형 랭킹'(FR-B4 Soft B안)은 Product 결정 후 — 지금은 거리 기반 동선.
"""

from __future__ import annotations

import asyncio
from datetime import datetime

from app.agent.context import RequestContext
from app.agent.environment import get_environment
from app.agent.exclude_classifier import classify_excluded
from app.agent.note_parser import parse_note
from app.agent.orchestrator import (
    _MIN_VIABLE,
    _MORE_VIABLE,
    _RADIUS_EXPANDED_NOTICE,
    _augment_with_keywords,
    _fetch_pool,
    base_radius,
    closed_candidate_ids,
    collect_judged,
)
from app.core.trace import Trace
from app.domain.budget import BudgetVerdict
from app.domain.conflict import conflict_notice, io_interest_conflict
from app.domain.exclusion import (
    lexical_excluded,
    match_excluded_places,
    select_with_exclusion,
)
from app.domain.locations import detect_location_in_text, resolve_start_coords
from app.domain.operational import PresenceVerdict
from app.domain.preferences_merge import (
    merge_saved_interests,
    merge_saved_open_preferences,
    merge_saved_walks,
)
from app.domain.ranking import io_rank, type_preference_rank
from app.domain.reasons import select_reasons
from app.domain.route import (
    MAX_DAY_STOPS,
    assemble_route,
    build_schedule,
    fit_count,
    rollup_budget,
    route_checks,
    route_headline,
    route_name,
    route_status,
)
from app.domain.signals import classification_signals
from app.domain.timing import (
    TimingVerdict,
    resolve_prose_window,
    shift_to_request_date,
)
from app.models.recommend import (
    Candidate,
    InterestCode,
    MovementInfo,
    ParsedConditions,
    Provenance,
    StartLocation,
    UnconfirmedFlag,
)
from app.models.route import Route, RouteData, RouteSegment, RouteStop
from app.sources import tmap

_ROUTE_POOL = 12  # feasibility 판정할 근접 후보 수(루트 조립 여유분)


async def _segment(
    from_label: str,
    flat: float,
    flng: float,
    to_label: str,
    tlat: float,
    tlng: float,
) -> tuple[RouteSegment, int | None]:
    """한 구간 도보(Tmap). (segment, walk_minutes|None). 실패는 Route unavailable(직선 위조 금지)."""
    leg = await tmap.pedestrian_route(flat, flng, tlat, tlng)
    if leg is None:
        return (
            RouteSegment(
                from_label=from_label,
                to_label=to_label,
                movement=MovementInfo(
                    display="Route unavailable", provenance=Provenance.UNCONFIRMED
                ),
            ),
            None,
        )
    wm = leg["walk_minutes"]
    return (
        RouteSegment(
            from_label=from_label,
            to_label=to_label,
            movement=MovementInfo(
                walk_minutes=wm,
                distance_m=leg["distance_m"],
                display=f"≈{wm} min walk",
                provenance=Provenance.ESTIMATE,
                path=leg["path"] or None,
            ),
        ),
        wm,
    )


async def _build_route(
    origin: StartLocation,
    stops: list[Candidate],
    start_at: datetime,
    available_minutes: int,
    trace: Trace,
) -> tuple[Route | None, str]:
    """스톱 순서에 구간 도보를 붙여 Route 구성. (route, reason). 불가 시 (None, reason):
    'over_time_budget'(도보+방문이 창 초과) | 'walk_unmeasured'(첫 2레그 중 Tmap 측정 실패 —
    시간 문제가 아님). 호출부가 reason 으로 사용자 메시지를 구분한다(측정 실패를 '시간창 안 맞음'으로
    오표기하지 않음)."""
    pts: list[tuple[str, float, float]] = [
        (origin.label, origin.lat, origin.lng)  # type: ignore[list-item]
    ] + [
        (s.title, s.lat, s.lng) for s in stops
    ]  # type: ignore[misc]
    segs = await asyncio.gather(
        *(
            _segment(
                pts[i][0],
                pts[i][1],
                pts[i][2],
                pts[i + 1][0],
                pts[i + 1][1],
                pts[i + 1][2],
            )
            for i in range(len(stops))
        )
    )
    walk_minutes = [wm for _, wm in segs]

    # 하루 동선: 시간창이 허용하는 만큼만(개수 제한 대신 시간 제한, 강제 채움 없음).
    keep = fit_count(walk_minutes, stops, available_minutes)
    if keep < 2:
        # 2개도 안 들어감. 원인 구분: 첫 2레그 중 하나라도 Tmap 측정 실패(None)면 '측정 실패'이지
        # '시간창 초과'가 아니다 — 메시지를 구분해 오해를 막는다(없는 직선 위조 금지와 같은 선상).
        first_none = next((i for i, wm in enumerate(walk_minutes) if wm is None), None)
        reason = (
            "walk_unmeasured"
            if first_none is not None and first_none < 2
            else "over_time_budget"
        )
        return None, reason  # 루트 불가(개별 전환)
    stops = stops[:keep]
    segments = [s for s, _ in segs][:keep]
    walk_minutes = walk_minutes[:keep]
    known = [wm for wm in walk_minutes if wm is not None]
    any_unknown = len(known) != len(walk_minutes)
    total_walk = None if any_unknown else sum(known)

    # 계획 방문시간 체인(공식 spendtime=confirmed / 유형 기준=planned) → 스톱별 도착·종료 + 전체 종료.
    schedule, finish_at = build_schedule(start_at, walk_minutes, stops)
    route_stops = [
        RouteStop(
            order=i + 1,
            candidate=s,
            visit_minutes=minutes,
            visit_provenance=prov,
            arrival_at=arr,
            depart_at=dep,
        )
        for i, (s, (arr, dep, minutes, prov)) in enumerate(zip(stops, schedule))
    ]
    all_official = all(p is Provenance.CONFIRMED for _, _, _, p in schedule)
    stay_note = (
        "Visit times are from official guidance."
        if all_official
        else "Planned visit times are estimates — adjust to your pace."
    )

    flags: list[UnconfirmedFlag] = []
    if any_unknown:
        flags.append(UnconfirmedFlag(text="Some walking segments couldn't be measured"))

    return Route(
        id="route-" + "-".join(s.id for s in stops),
        name=route_name(origin, stops),
        headline=route_headline(origin, stops),
        status=route_status(stops),
        checks=route_checks(stops),
        stops=route_stops,
        segments=segments,
        total_walk_minutes=total_walk,
        walk_provenance=Provenance.ESTIMATE,
        budget_note=rollup_budget(stops),
        stay_note=stay_note,
        finish_at=finish_at,
        flags=flags,
    ), "ok"


def _resolve_pinned(
    titles: list[str] | None, feasible: list[Candidate]
) -> list[Candidate]:
    """직전 루트 스톱 제목 → 이번 턴 feasible 후보로 결정론 매칭(순서=기존 루트 순서).

    제목은 요약("A → B → C")에서 온 것이라 현재 후보의 title 과 동일 소스다. 정규화(소문자·
    공백) 동일성으로 매칭하고, 이번 턴에 없는(운영종료 등) 스톱은 조용히 빠진다(억지 유지 금지).
    """
    if not titles:
        return []
    by_title = {(c.title or "").strip().lower(): c for c in feasible}
    out: list[Candidate] = []
    seen: set[str] = set()
    for t in titles:
        c = by_title.get((t or "").strip().lower())
        if c and c.id not in seen:
            out.append(c)
            seen.add(c.id)
    return out


async def recommend_route(
    ctx: RequestContext,
    trace: Trace,
    saved_interests: list[InterestCode] | None = None,
    prefer_shorter_walks: bool | None = None,
    saved_open_preferences: list[str] | None = None,
    want_more: bool = False,
    max_stops: int | None = None,
    pin_titles: list[str] | None = None,
    add_n: int = 0,
) -> RouteData:
    # [위치 우선] 프롬프트(note) 지명이 있으면 기본입력보다 우선(결정론, A 와 동일 정책).
    start_loc = detect_location_in_text(ctx.note) or ctx.start_location
    lat, lng = resolve_start_coords(start_loc)
    origin = StartLocation(label=start_loc.label, lat=lat, lng=lng)

    # [조건 먼저] 걷기 선호가 기본 탐색 반경을 정하므로 조회 전에 구조화(A 와 동일 순서).
    cond = ctx.conditions if ctx.conditions is not None else await parse_note(ctx.note)
    # [조회 날짜, #2a] 프롬프트 날짜가 오면 시각 유지·그 날로 이동(프론트가 이미 옮겼으면 무변경).
    new_start, new_end = shift_to_request_date(ctx.start_at, ctx.end_at, cond.date)
    if new_start != ctx.start_at:
        ctx = ctx.model_copy(update={"start_at": new_start, "end_at": new_end})
        trace.step("request_date", date=cond.date)
    # [시간 프롬프트 — 전체 창 반영(2026-10-15 Product)] 챗 B 는 사용자가 산문으로 시간창을 직접
    # 말한다('from 1 PM to 5 PM'). 명시된 시작/종료 시각은 폼/칩 기본값을 덮어쓴다(지어내기 아님 —
    # 근거는 사용자 발화). 날짜는 위 shift 로 이미 반영됨 → 그 날짜에 시각만 끼운다.
    ps, pe, applied_window = resolve_prose_window(
        ctx.start_at, ctx.end_at, cond.start_time, cond.end_time, cond.duration_minutes
    )
    if applied_window is not None:
        ctx = ctx.model_copy(update={"start_at": ps, "end_at": pe})
        trace.step(
            "prose_window",
            applied=applied_window,
            start_at=ps.isoformat(),
            end_at=pe.isoformat(),
            available_minutes=ctx.available_minutes,
        )
    # 프롬프트가 창을 덮어쓴 경우에만 '실제 사용된 창'을 프론트로 되돌려준다(칩·카드·저장 일치용).
    window_fields = (
        {"window_start": ctx.start_at, "window_end": ctx.end_at}
        if applied_window is not None
        else {}
    )
    cond = merge_saved_interests(cond, saved_interests)
    cond = merge_saved_open_preferences(cond, saved_open_preferences)
    cond = merge_saved_walks(cond, prefer_shorter_walks)
    base = base_radius(cond.prefer_shorter_walks)  # 싫음 1·없음 2·좋음 3km(§6.6 soft)

    pool, env = await asyncio.gather(
        _fetch_pool(lat, lng, trace, ctx.start_at.date(), base),
        get_environment(lat, lng, trace),
    )
    route_notices: list[str] = []  # 반경 확대·충돌 등 투명 안내(RouteData.notices)
    # [충돌 투명 안내] 실내/외 ↔ 관심사 모순이면 알린다(Option 1, A 와 동일). 챗 루프가 먼저
    # 되물으면 해소된 cond 로 들어와 충돌이 없다 — 그 외(직접 호출·누락) 경로의 안전망.
    conflicting = io_interest_conflict(cond)
    if conflicting:
        route_notices.append(conflict_notice(cond.indoor_outdoor or "", conflicting))

    # [keyword] 특정 주제 키워드 검색 결과 병합(P4, A 와 동일) — 발견 범위만 확장, 사실 불변.
    pool = await _augment_with_keywords(pool, lat, lng, base, cond, trace)

    # [저장 루트 재조립] pin 스톱을 '제목 키워드'로 직접 조회해 풀에 보강한다. 원래 관심사·키워드로
    # 발굴됐던 스톱(또는 타입별 10건 컷에 밀린 스톱)은 일반 위치조회 풀엔 없을 수 있어, 그러면
    # priority_titles 재정렬도 소용없다(풀에 없으니) → feasible 누락 → 재조립 실패. 이름으로 끌어와
    # 반드시 판정 후보에 넣는다(발견 범위만 확장 — 사실·가용성 불변·반경 밖은 _fetch 가 drop, §6).
    if pin_titles:
        # 재조립은 저장 당시 스톱을 최대한 복원해야 하므로 base 가 아니라 최대 발견 반경(3km)으로
        # 끌어온다 — 원래 루트에 확대 편입(base 밖)됐던 스톱도 drop 되지 않게.
        pool = await _augment_with_keywords(
            pool, lat, lng, 3000, ParsedConditions(keywords=list(pin_titles)), trace
        )

    # [select+judge] 의미 관련도 선발(P2) + 적응형 반경(P1) — A 와 동일 정책을 공용 헬퍼로.
    # feasible 가 부족하면 반경을 넓혀 재조회(루트 'unmet' 감소, 강제 채움 아님). '더' 요청 시
    # 목표를 _MORE_VIABLE 로 올려 더 넓게 발굴(문제1).
    results, _hard, _used_radius = await collect_judged(
        lat,
        lng,
        ctx,
        cond,
        trace,
        first_pool=pool,
        enrich_pool=_ROUTE_POOL,
        base=base,
        # '더/추가'면 목표(prev+N)까지 feasible 를 모으도록 min_viable 을 올려 반경 확장을 유도.
        min_viable=max(_MORE_VIABLE, max_stops or 0) if want_more else _MIN_VIABLE,
        # 저장 루트 재조립: pin 스톱 제목을 판정 배치 선두로 올려 feasible 누락(→ 재조립 실패)을 막는다.
        priority_titles=(
            {(t or "").strip().lower() for t in pin_titles} if pin_titles else None
        ),
    )
    # 반경 확대 안내는 '확대 트리거' 가 아니라 '실제로 base 밖 스톱이 루트에 들어갔나' 로
    # 결정한다(최종 route.stops 기준, 아래 성공 반환 직전) — A 와 동일 정책.
    valid = [(c, txt) for (c, _, _, txt) in results]
    # 스톱별 Reason(코스 "왜 이 장소")용 판정 보관 — 관심사·시간·예산 근거 재사용(A와 동일).
    verdicts = {c.id: (t, b) for (c, t, b, _) in results}

    # [filter-places] 명시 장소 제외(B4): 사용자가 이름 댄 스톱 제거(재삽입 금지 — 조건이
    # 히스토리로 캐리포워드되는 한 매 재구성에서 다시 빠진다). 결정론 title 매칭.
    place_ids = match_excluded_places(
        [(c.id, c.title) for c, _ in valid], cond.exclude_places
    )
    if place_ids:
        valid = [v for v in valid if v[0].id not in place_ids]
        trace.step("exclude_places", places=cond.exclude_places, removed=len(place_ids))

    # [filter] 개방형 명시 배제: 어휘(제목 단어) 결정론 + LLM 의미분류의 합집합으로 제거.
    # 어휘 pre-pass 는 'statue' 처럼 제목에 명백히 든 경우를 분류기 과소제외와 무관하게 확실히
    # 잡는다(사실은 코드, 0건-세이프). 다단어·추상 개념은 LLM 이 담당.
    exclude_ids: set[str] = set()
    if cond.exclude_concepts and valid:
        exclude_ids = lexical_excluded(
            [(c.id, c.title) for c, _ in valid], cond.exclude_concepts
        ) | await classify_excluded(
            [(c.id, txt) for c, txt in valid], cond.exclude_concepts, trace
        )
    by_id = {c.id: c for c, _ in valid}
    kept_ids, _notices, applied = select_with_exclusion(
        [c.id for c, _ in valid], exclude_ids, cond.exclude_concepts, len(valid)
    )
    feasible = [by_id[i] for i in kept_ids]
    # 실내외 선호(문제1): 불일치 유형 강등 — ≥2 남으면 그걸로, 아니면 전체(0-safe, 제외 아님).
    io_base = [c for c in feasible if io_rank(c.type, cond) != 2]
    if len(io_base) < 2:
        io_base = feasible
    # 관심사 우선 루트(FR-B4): 가능하면 관심사 매칭 스톱으로, 부족하면 단계적 폴백.
    preferred = [c for c in io_base if type_preference_rank(c.type, cond) == 0]
    trace.step(
        "route_feasible",
        considered=len(results),
        feasible=len(feasible),
        io_base=len(io_base),
        preferred=len(preferred),
        excluded_pref=len(applied),
    )

    # 보통은 관심사 매칭(preferred) 우선 → 부족하면 폴백. 단 '더/아무거나(want_more)'면
    # 처음부터 넓은 풀(feasible)로 조립해 매칭 밖 후보도 스톱으로 붙여 루트를 키운다(문제1).
    primary = feasible if want_more else preferred
    # [정제·pin] 직전 루트 스톱(제목 매칭)을 고정 prefix 로 유지하고 델타만 반영한다. 제거·마감된
    # 스톱은 feasible 에서 빠져 pin 에서도 자동 제외 → '나머지는 유지'. 개수는 생존 pin 수 + add_n
    # (제거분 백필 금지 — 뺀 자리를 새 장소로 메우지 않음, §6). pin 없으면 max_stops/기본값.
    # 빈 리스트(제목 매칭 0 — 전부 제거/마감/불일치)면 None 으로 폴백해 일반 조립(cap=0 방지).
    pinned = (_resolve_pinned(pin_titles, feasible) or None) if pin_titles else None
    if pinned is not None:
        cap = len(pinned) + max(0, add_n)
        trace.step(
            "route_pin",
            requested=len(pin_titles or []),
            pinned=len(pinned),
            add_n=add_n,
            cap=cap,
        )
    else:
        cap = max_stops if max_stops else MAX_DAY_STOPS
    # [filter-closed] 조립된 '최종 스톱'에만 Places 폐업 체크(쿼터 절약 — 풀 전체 호출 금지,
    # A 와 동일 정책). 닫힌 스톱은 풀·pin 에서 빼고 재조립(backfill). 매 라운드 풀이 줄어 유한
    # 종료. 쿼터 소진·미확인은 operational 로 흘려 제외하지 않는다(§6).
    presence_cache: dict[str, PresenceVerdict] = {}
    while True:
        if pinned is not None:
            cap = len(pinned) + max(0, add_n)
        stops = (
            assemble_route(origin, primary, max_stops=cap, pinned=pinned)
            if len(primary) >= 2 or pinned
            else []
        )
        if len(stops) < 2:
            stops = assemble_route(origin, io_base, max_stops=cap, pinned=pinned)
        if len(stops) < 2:
            stops = assemble_route(origin, feasible, max_stops=cap, pinned=pinned)
        closed = (
            await closed_candidate_ids(stops, presence_cache, trace) if stops else set()
        )
        if not closed:
            break
        primary = [c for c in primary if c.id not in closed]
        io_base = [c for c in io_base if c.id not in closed]
        feasible = [c for c in feasible if c.id not in closed]
        if pinned is not None:
            pinned = [c for c in pinned if c.id not in closed] or None
    # 스톱별 Reason(코스 "왜 이 장소" — 관심사/시간/예산 근거). 근거 없으면 0개(강제 금지).
    # + AI 분류 근거 키워드(표시 전용, A 와 동일). 루트는 classify_places 미호출 →
    #   실내외는 유형 휴리스틱 fallback(io_verdict 없음). 사실 생성 아님·판정 불변(§6).
    for s in stops:
        t, b = verdicts.get(s.id, (TimingVerdict.UNCERTAIN, BudgetVerdict.UNKNOWN))
        s.reasons = select_reasons(s, cond, t, b, is_nearest=False)
        s.signals = classification_signals(s, cond)
    if len(stops) < 2:
        trace.step("route_unmet", reason="under_2_stops", feasible=len(feasible))
        return RouteData(
            routes=[],
            origin=origin,
            unmet="We couldn't build a reliable 2–3 stop route from what's open now — see individual experiences instead.",
            notices=route_notices,
            environment=env,
            **window_fields,
        )

    route, build_reason = await _build_route(
        origin, stops, ctx.start_at, ctx.available_minutes, trace
    )
    if route is None:
        trace.step("route_unmet", reason=build_reason)
        unmet = (
            "We couldn't measure walking routes between these experiences right now — "
            "please try again in a moment, or see individual experiences."
            if build_reason == "walk_unmeasured"
            else "The nearest open experiences don't fit your time window as one walking "
            "route — try a longer window or see individual experiences."
        )
        return RouteData(
            routes=[],
            origin=origin,
            unmet=unmet,
            notices=route_notices,
            environment=env,
            **window_fields,
        )
    trace.step(
        "route_built",
        stops=len(route.stops),
        total_walk=route.total_walk_minutes,
        route_name=route.name,
    )
    # base 밖(from_widened_search, 거리기준) 스톱이 실제로 루트에 들어간 경우에만 안내.
    if any(getattr(s, "from_widened_search", False) for s in route.stops):
        route_notices.append(_RADIUS_EXPANDED_NOTICE)
    return RouteData(
        routes=[route],
        origin=origin,
        notices=route_notices,
        environment=env,
        # 근처 feasible 가 담긴 스톱보다 많으면 '더 있는데 시간/도보로 못 담음' → 시간 연장 제안 근거.
        more_feasible=len(feasible) > len(route.stops),
        **window_fields,
    )
