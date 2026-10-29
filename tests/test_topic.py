import sys
sys.path.append('backend')

from app.models.topic import ResultStatus, Candidate, DiscoverRequest, DiscoverResponse

def test_result_status_values():
    assert ResultStatus.CONFIRMED.value == "confirmed"
    assert ResultStatus.UNCONFIRMED.value == "unconfirmed"
    assert ResultStatus.ALTERNATIVE.value == "alternative"

def test_candidate_model():
    cand = Candidate(
        id="c1",
        name="Sample",
        description="sample description",
        status=ResultStatus.CONFIRMED,
        price="free",
        location="Seoul",
    )
    assert cand.id == "c1"
    assert cand.status == ResultStatus.CONFIRMED
    # optional fields default
    assert cand.unconfirmed == []

def test_discover_request_validation():
    req = DiscoverRequest(query="test", max_results=5)
    assert req.query == "test"
    assert req.max_results == 5

def test_discover_response_structure():
    cand = Candidate(
        id="c2",
        name="Item",
        description="desc",
        status=ResultStatus.UNCONFIRMED,
    )
    resp = DiscoverResponse(candidates=[cand], total=1)
    assert len(resp.candidates) == 1
    assert resp.total == 1
    assert resp.notices == []
