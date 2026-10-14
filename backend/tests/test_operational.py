"""영업 상태(폐업/임시휴업) Hard 제외 판정 테스트 (PRD §6.7 예외).

음성 신호 전용: 폐업 확인 + 좌표 근접일 때만 제외. 미확인·불일치·결측은
제외하지 않는다(오탈락 방지).
"""

from __future__ import annotations

import asyncio

from app.agent import orchestrator as orch
from app.core.trace import Trace
from app.domain.operational import PresenceVerdict, judge_presence
from app.models.recommend import Candidate, ResultStatus

# 후보 좌표 (Alive Museum 인사동점 실측 근방)
_LAT, _LNG = 37.5718843, 126.9872034


def _place(status, lat=_LAT, lng=_LNG):
    return {"businessStatus": status, "location": {"latitude": lat, "longitude": lng}}


def test_permanently_closed_nearby_excluded():
    v = judge_presence(_place("CLOSED_PERMANENTLY"), _LAT, _LNG)
    assert v is PresenceVerdict.CLOSED_PERMANENTLY


def test_temporarily_closed_nearby_excluded():
    v = judge_presence(_place("CLOSED_TEMPORARILY"), _LAT, _LNG)
    assert v is PresenceVerdict.CLOSED_TEMPORARILY


def test_operational_not_excluded():
    v = judge_presence(_place("OPERATIONAL"), _LAT, _LNG)
    assert v is PresenceVerdict.OPERATIONAL


def test_no_places_result_not_excluded():
    # 보조 소스 미확인 → 제외하지 않는다(긍정 생성 아님, 오탈락 방지)
    assert judge_presence(None, _LAT, _LNG) is PresenceVerdict.OPERATIONAL


def test_closed_but_far_coords_not_excluded():
    # Places 가 폐업이라 해도 좌표가 멀면(다른 장소일 수 있음) 제외하지 않는다
    far = _place("CLOSED_PERMANENTLY", lat=37.5800, lng=126.9950)
    assert judge_presence(far, _LAT, _LNG) is PresenceVerdict.OPERATIONAL


def test_closed_but_missing_coords_not_excluded():
    # 좌표 결측 → 같은 장소인지 신뢰 불가 → 제외하지 않는다
    no_loc = {"businessStatus": "CLOSED_PERMANENTLY"}
    assert judge_presence(no_loc, _LAT, _LNG) is PresenceVerdict.OPERATIONAL
    assert judge_presence(_place("CLOSED_PERMANENTLY"), None, None) is (
        PresenceVerdict.OPERATIONAL
    )


def test_unknown_status_not_excluded():
    assert judge_presence(_place(""), _LAT, _LNG) is PresenceVerdict.OPERATIONAL


# ── 최종 선정분 전용 폐업 체크(쿼터 절약, orchestrator.closed_candidate_ids) ──
def _tour(cid, lat=_LAT, lng=_LNG, source="tour"):
    return Candidate(
        id=cid, title=f"T{cid}", source=source, status=ResultStatus.CHECK_NEEDED,
        lat=lat, lng=lng,
    )


def test_closed_candidate_ids_excludes_closed_and_caches(monkeypatch):
    calls: list[str] = []

    async def fake_find(title, lat, lng):
        calls.append(title)
        # T1 은 폐업, 나머지는 영업중
        return {
            "businessStatus": "CLOSED_PERMANENTLY" if title == "T1" else "OPERATIONAL",
            "location": {"latitude": lat, "longitude": lng},
        }

    monkeypatch.setattr(orch.gplaces, "find_place", fake_find)
    cands = [_tour("1"), _tour("2")]
    cache: dict = {}
    closed = asyncio.run(orch.closed_candidate_ids(cands, cache, Trace()))
    assert closed == {"1"}  # 폐업만 제외
    assert set(cache.keys()) == {"1", "2"}  # 결과 캐시됨
    # 재호출 시 캐시 사용 → find_place 추가 호출 없음
    calls.clear()
    closed2 = asyncio.run(orch.closed_candidate_ids(cands, cache, Trace()))
    assert closed2 == {"1"} and calls == []


def test_closed_candidate_ids_skips_seoul_and_no_coords(monkeypatch):
    async def fake_find(title, lat, lng):  # pragma: no cover - 호출되면 안 됨
        raise AssertionError("seoul/좌표없음 후보에 Places 호출 금지")

    monkeypatch.setattr(orch.gplaces, "find_place", fake_find)
    cands = [_tour("s", source="seoul"), _tour("n", lat=None, lng=None)]
    closed = asyncio.run(orch.closed_candidate_ids(cands, {}, Trace()))
    assert closed == set()  # 대상 아님 → 호출도 제외도 없음
