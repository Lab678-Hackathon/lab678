"""실행 중인 백엔드의 서울시·국문 문화시설 연결을 검사한다. 키는 출력하지 않는다.

Usage: python utils/scripts/check_culture_sources.py
고정 공개 장소만 사용하며 키가 있을 때만 TourAPI 실호출. 결과는 .local/culture-source-check.json.
"""
from datetime import datetime, timedelta
import json
from pathlib import Path
import sys
from urllib.error import HTTPError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))
from culture_config import culture_key
from outing import KST


def post(path, data):
    """로컬 HTTP 상태/정규화 응답만 읽는다. 공급자 키가 있는 URL은 직접 출력하지 않는다."""
    request = Request("http://127.0.0.1:8765" + path, data=json.dumps(data).encode(), headers={"Content-Type":"application/json"})
    try:
        with urlopen(request, timeout=30) as response:
            return response.status, json.load(response)
    except HTTPError as error:
        with error:
            return error.code, json.load(error)


def main():
    """서울시 실제 조회와 TourAPI 설정/실조회를 명확히 나누어 결과를 저장한다."""
    day = (datetime.now(KST) + timedelta(days=1)).date().isoformat()
    request = dict(request_kind="place", start_location=dict(label="청량리역", lat=37.5805961, lng=127.0482573),
                   category="전체", start_at=day+"T14:00:00+09:00", end_at=day+"T17:00:00+09:00", mode="live")
    results = []
    for source, endpoint in (("seoul", "/preview/recommend"), ("tour", "/preview/culture-places")):
        configured = bool(culture_key(source))
        status, body = post(endpoint, request)
        if source == "tour" and not configured:
            passed = status == 503 and body.get("code") == "tour_not_configured"
            verification = "missing-key behavior verified; provider live call NOT RUN"
        else:
            passed = status == 200 and body.get("status") in ("ready", "no_results")
            verification = "provider live call"
            if source == "seoul":
                passed = passed and body.get("source_access") == ("authenticated" if configured else "sample")
                passed = passed and body.get("fetch_limit_per_category") == (100 if configured else 5)
        results.append(dict(source=source, configured=configured, verification=verification, http_status=status, passed=bool(passed), response=body))
        print(f"{source}: {'PASS' if passed else 'FAIL'} HTTP {status}; {verification}")
    report = dict(checked_at=datetime.now(KST).isoformat(timespec="seconds"), request=request, results=results)
    (ROOT / ".local/culture-source-check.json").write_text(json.dumps(report, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
    return 0 if all(r["passed"] for r in results) else 1


if __name__ == "__main__":
    raise SystemExit(main())
