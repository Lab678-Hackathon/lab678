"""P1 적응형 반경 ladder (collect_judged) 유닛테스트 — 외부 I/O 모킹.

유효 후보가 min_viable 미만이면 반경을 넓혀 재조회하고, 충분하면 확장하지 않음을 검증한다.
_fetch_pool·_enrich·semantic_similarities 를 orchestrator 네임스페이스에서 monkeypatch 한다
(tools 와 동일 패턴 — 모듈이 import 시점에 헬퍼를 바인딩).
"""

from __future__ import annotations

import asyncio
from datetime import datetime

from app.agent import orchestrator as orch
from app.agent.context import RequestContext
from app.core.trace import Trace
from app.domain.budget import BudgetVerdict
from app.domain.timing import TimingVerdict
from app.models.recommend import (
    Candidate,
    ParsedConditions,
    ResultStatus,
    StartLocation,
)


def _ctx() -> RequestContext:
    return RequestContext(
        start_location=StartLocation(label="x", lat=37.57, lng=126.98),
        start_at=datetime(2026, 10, 15, 13, 0),
        end_at=datetime(2026, 10, 15, 18, 0),
    )


def _valid(cid: str, distance_m: int | None = None):
    cand = Candidate(
        id=cid,
        title=f"P{cid}",
        status=ResultStatus.FITS,
        lat=37.57,
        lng=126.98,
        distance_m=distance_m,
    )
    return (cand, TimingVerdict.OPEN, BudgetVerdict.UNKNOWN, f"P{cid}")


def _hard():
    return (None, TimingVerdict.UNCERTAIN, BudgetVerdict.UNKNOWN, "")


async def _zeros(texts, intent, trace):
    return [0.0] * len(texts)


def test_expands_when_thin(monkeypatch):
    # radius0 풀의 1개는 Hard 제외(0 valid) → min_viable(2) 미만 → 반경 확대.
    first_pool = [{"contentid": "a"}]

    async def fake_fetch(lat, lng, trace, on_date, radius):
        assert radius == 3000  # 첫 확장 단계
        return [{"contentid": "b"}, {"contentid": "c"}]

    async def fake_enrich(item, ctx, cond, trace):
        cid = item["contentid"]
        return _hard() if cid == "a" else _valid(cid, distance_m=2300)

    monkeypatch.setattr(orch, "_fetch_pool", fake_fetch)
    monkeypatch.setattr(orch, "semantic_similarities", _zeros)
    monkeypatch.setattr(orch, "_enrich", fake_enrich)

    judged, hard, used = asyncio.run(
        orch.collect_judged(
            37.57,
            126.98,
            _ctx(),
            ParsedConditions(),
            Trace(),
            first_pool=first_pool,
            enrich_pool=8,
        )
    )
    assert len(judged) == 2
    assert hard == 1  # item a
    assert used == 3000
    # 확대로 편입된 후보는 거리 라벨 표시용으로 태깅되고 직선거리를 갖는다.
    assert all(c.from_widened_search for (c, *_) in judged)
    assert all(c.distance_m == 2300 for (c, *_) in judged)


def test_first_tier_candidates_not_flagged_widened(monkeypatch):
    # 1단계(base 2km)에서 충족된 후보는 widened 아님(거리 라벨 미표시).
    async def fake_enrich(item, ctx, cond, trace):
        return _valid(item["contentid"], distance_m=400)

    monkeypatch.setattr(orch, "semantic_similarities", _zeros)
    monkeypatch.setattr(orch, "_enrich", fake_enrich)
    judged, _h, used = asyncio.run(
        orch.collect_judged(
            37.57,
            126.98,
            _ctx(),
            ParsedConditions(),
            Trace(),
            first_pool=[{"contentid": "b"}, {"contentid": "c"}],
            enrich_pool=8,
        )
    )
    assert used == 2000
    assert not any(c.from_widened_search for (c, *_) in judged)


def test_widen_round_item_within_base_not_flagged(monkeypatch):
    # 회귀: 확대 라운드에서 '판정'됐더라도 실제 거리가 base(1500) 안이면 Far 아님.
    # (심야 Myeongdong 207m 버그 — 밀집 지역서 base 안 후보가 1차 top-K 밖으로 밀려
    #  확대 라운드에서야 판정될 수 있다. 'far' 는 거리 기준이지 라운드 기준이 아니다.)
    async def fake_fetch(lat, lng, trace, on_date, radius):
        return [{"contentid": "near"}, {"contentid": "far"}]

    async def fake_enrich(item, ctx, cond, trace):
        cid = item["contentid"]
        if cid == "a":
            return _hard()  # 1차 풀 0 valid → 확장 트리거
        return _valid(cid, distance_m=207 if cid == "near" else 2300)

    monkeypatch.setattr(orch, "_fetch_pool", fake_fetch)
    monkeypatch.setattr(orch, "semantic_similarities", _zeros)
    monkeypatch.setattr(orch, "_enrich", fake_enrich)

    judged, _h, used = asyncio.run(
        orch.collect_judged(
            37.57,
            126.98,
            _ctx(),
            ParsedConditions(),
            Trace(),
            first_pool=[{"contentid": "a"}],
            enrich_pool=8,
        )
    )
    assert used == 3000
    flagged = {c.id: c.from_widened_search for (c, *_) in judged}
    assert flagged["near"] is False  # 207m — base 안이므로 Far 아님
    assert flagged["far"] is True  # 2300m — base 밖이므로 Far


def test_no_expand_when_enough(monkeypatch):
    first_pool = [{"contentid": "b"}, {"contentid": "c"}]
    calls = {"fetch": 0}

    async def fake_fetch(*a, **k):
        calls["fetch"] += 1
        return []

    async def fake_enrich(item, ctx, cond, trace):
        return _valid(item["contentid"])

    monkeypatch.setattr(orch, "_fetch_pool", fake_fetch)
    monkeypatch.setattr(orch, "semantic_similarities", _zeros)
    monkeypatch.setattr(orch, "_enrich", fake_enrich)

    judged, _hard, used = asyncio.run(
        orch.collect_judged(
            37.57,
            126.98,
            _ctx(),
            ParsedConditions(),
            Trace(),
            first_pool=first_pool,
            enrich_pool=8,
        )
    )
    assert len(judged) == 2 and used == 2000
    assert calls["fetch"] == 0  # 확장 재조회 없음(밀집 → 지연 불변)


def test_base_radius_by_walking_pref():
    # Product: 싫음 1km · 미언급 2km · 좋음 3km(최대 반경).
    assert orch.base_radius(True) == 1000
    assert orch.base_radius(None) == 2000
    assert orch.base_radius(False) == 3000


def test_base_2000_expands_only_to_3000(monkeypatch):
    # 기본 반경 2km(미언급) → 희소 시 3km 로만 확장(2km 는 이미 base, 1km 로 안 내려감).
    async def fake_fetch(lat, lng, trace, on_date, radius):
        assert radius == 3000  # base(2000)보다 큰 단계만
        return [{"contentid": "b"}, {"contentid": "c"}]

    async def fake_enrich(item, ctx, cond, trace):
        return _hard() if item["contentid"] == "a" else _valid(item["contentid"], 2800)

    monkeypatch.setattr(orch, "_fetch_pool", fake_fetch)
    monkeypatch.setattr(orch, "semantic_similarities", _zeros)
    monkeypatch.setattr(orch, "_enrich", fake_enrich)
    judged, _h, used = asyncio.run(
        orch.collect_judged(
            37.57,
            126.98,
            _ctx(),
            ParsedConditions(),
            Trace(),
            first_pool=[{"contentid": "a"}],
            enrich_pool=8,
            base=2000,
        )
    )
    assert used == 3000 and len(judged) == 2


def test_base_at_ceiling_no_expansion(monkeypatch):
    # 걷기 좋아함 → base 3km(최대). 더 넓힐 단계가 없으니 희소해도 확장 안 함(래더 끝).
    calls = {"fetch": 0}

    async def fake_fetch(*a, **k):
        calls["fetch"] += 1
        return []

    async def fake_enrich(item, ctx, cond, trace):
        return _hard()  # 0 valid 지만 base 가 최대라 확장 불가

    monkeypatch.setattr(orch, "_fetch_pool", fake_fetch)
    monkeypatch.setattr(orch, "semantic_similarities", _zeros)
    monkeypatch.setattr(orch, "_enrich", fake_enrich)
    judged, _h, used = asyncio.run(
        orch.collect_judged(
            37.57,
            126.98,
            _ctx(),
            ParsedConditions(),
            Trace(),
            first_pool=[{"contentid": "a"}],
            enrich_pool=8,
            base=3000,
        )
    )
    assert used == 3000 and judged == [] and calls["fetch"] == 0


def test_expands_to_last_radius_then_stops(monkeypatch):
    # 끝까지 희소해도 ladder 끝에서 멈춘다(무한 아님). base 1km → 2km → 3km 각 1개씩.
    pools = {2000: [{"contentid": "b"}], 3000: [{"contentid": "c"}]}

    async def fake_fetch(lat, lng, trace, on_date, radius):
        return pools.get(radius, [])

    async def fake_enrich(item, ctx, cond, trace):
        return _hard()  # 전부 Hard → 끝까지 0 valid

    monkeypatch.setattr(orch, "_fetch_pool", fake_fetch)
    monkeypatch.setattr(orch, "semantic_similarities", _zeros)
    monkeypatch.setattr(orch, "_enrich", fake_enrich)

    judged, hard, used = asyncio.run(
        orch.collect_judged(
            37.57,
            126.98,
            _ctx(),
            ParsedConditions(),
            Trace(),
            first_pool=[{"contentid": "a"}],
            enrich_pool=8,
            base=1000,
        )
    )
    assert judged == []
    assert used == 3000  # 마지막 단계(3km)까지 확장 후 종료
    assert hard == 3  # a, b, c
