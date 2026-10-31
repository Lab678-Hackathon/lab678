"""현재 설정 키별 실제 서비스 응답 검사. 키·헤더·공급자 URL은 기록하지 않는다.

Usage: python utils/scripts/check_service_keys.py
실제 Naito 1회와 공개 장소 기반 문화/검색/경로 호출. 지도 SDK는 별도 브라우저 검사 필요.
"""
from datetime import datetime, timedelta
import json
import sys
from urllib.request import urlopen

from check_culture_sources import post, ROOT
sys.path.insert(0, str(ROOT / "backend"))
from outing import KST


def main():
    """공개 청량리역 조건으로 서비스별 결과를 요약한다. HTTP200과 실제 기능 성공을 구분한다."""
    day = (datetime.now(KST) + timedelta(days=1)).date().isoformat()
    start = dict(label="청량리역", lat=37.5805961, lng=127.0482573)
    end = dict(label="배봉산숲속도서관", lat=37.5784960375, lng=127.0627518944)
    request = dict(request_kind="place", category="전체", mode="live", start_location=start,
                   start_at=day+"T14:00:00+09:00", end_at=day+"T17:00:00+09:00")
    cases = [
        ("서울시 문화행사", "/preview/recommend", request),
        ("관광공사 문화시설", "/preview/recommend", dict(request, culture_source="tour")),
        ("카카오 REST 장소", "/preview/places", dict(query="청량리역", type="keyword")),
        ("카카오 REST 대중교통", "/preview/transit", dict(points=[start, end])),
        ("Valhalla 도보 (키 없음)", "/preview/walk", dict(points=[start, end], details=True)),
        ("Naito claude-sonnet-4", "/preview/chat", dict(message="국악을 듣고 싶어", revision=1,
            condition_draft=dict(request, category="전시"))),
    ]
    results = []
    for name, endpoint, data in cases:
        try:
            status, body = post(endpoint, data)
            row = dict(service=name, http_status=status, status=body.get("status"), code=body.get("code"))
            for field in ("candidates", "places", "routes", "steps"):
                if isinstance(body.get(field), list):
                    row[field+"_count"] = len(body[field])
            if "updated_condition_draft" in body:
                row["interpreted_category"] = body["updated_condition_draft"].get("category")
            if name.startswith("Valhalla"):
                row["duration_s"] = body.get("duration_s")
                row["passed"] = status == 200 and isinstance(body.get("duration_s"), (int, float)) and body["duration_s"] > 0 and bool(body.get("steps"))
            else:
                row["passed"] = status == 200 and (row.get("interpreted_category") == "국악" if name.startswith("Naito") else body.get("status") == "ready")
        except (OSError, ValueError):
            row = dict(service=name, passed=False, error="local response unavailable")
        results.append(row)
        print(json.dumps(row, ensure_ascii=False), flush=True)
    with urlopen("http://127.0.0.1:8765/map-config", timeout=5) as response:
        config = json.load(response)
    results.append(dict(service="카카오 JavaScript 지도", configured=config.get("provider")=="kakao",
                        verification="configuration only; SDK and tile check separate"))
    output = dict(checked_at=datetime.now(KST).isoformat(timespec="seconds"), results=results)
    (ROOT / ".local/service-key-check.json").write_text(json.dumps(output, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
    return 0 if all(row.get("passed", True) for row in results) else 1


if __name__ == "__main__":
    raise SystemExit(main())
