"""공개 QA 좌표의 실제 대중교통 노선·승하차를 확인한다. 키/원문 요청/사용자 위치는 저장하지 않는다.

Usage: python utils/scripts/check_transit_details.py
카카오 실조회 1회, 요약 JSON을 .local/transit-details/live-api.json에 저장한다.
"""
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))
from transit import transit_between


def main():
    """고정 청량리역→서울돈화문국악당 구간을 실조회하고 확인된 공개 경로 필드만 기록한다."""
    points = [{"lat":37.5805961, "lng":127.0482573}, {"lat":37.57725, "lng":126.99073}]
    status, body = transit_between(points)
    result = dict(http_status=status, mode="live Kakao API; fixed public QA coordinates", response=body)
    target = ROOT / ".local/transit-details/live-api.json"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    summary = [dict(modes=[s["mode"] for s in route["steps"]],
                    lines=[v["name"] for s in route["steps"] for v in s["vehicles"]],
                    stops=[dict(board=s["boarding_stop"], alight=s["alighting_stop"]) for s in route["steps"] if s["mode"] != "WALKING"])
               for route in body.get("routes", [])]
    print(json.dumps(dict(http_status=status, routes=summary, output=str(target)), ensure_ascii=False, indent=2))
    return 0 if status == 200 and body.get("status") == "ready" and any(r["lines"] for r in summary) else 1


if __name__ == "__main__":
    raise SystemExit(main())
