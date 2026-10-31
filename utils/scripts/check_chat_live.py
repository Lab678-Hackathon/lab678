"""명시 실행 시 Naito 실제 호출 3회로 공개 예문을 검증한다. 키/공급자 원문은 출력하지 않는다.

Usage: python utils/scripts/check_chat_live.py
서비스 사용량이 발생한다. 고정된 공개 장소·문장만 보내며 결과는 .local/chat-live.json에 저장한다.
"""
import json
from pathlib import Path
import sys
from time import monotonic

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))
from naito_chat import chat, settings
from outing import KST
from datetime import datetime


def main():
    """국악·장소/시간·확정 시간 변경을 1회씩 호출하고 사실 경계와 충돌 보존을 검사한다."""
    key, model = settings()
    if not key or model != "claude-sonnet-4":
        print("Configuration check failed: key required and model must be claude-sonnet-4")
        return 2
    del key
    draft = dict(start_location=dict(label="청량리역", lat=37.5805961, lng=127.0482573),
                 start_at="2026-10-31T14:00:00+09:00", end_at="2026-10-31T17:00:00+09:00",
                 category="전시", request_kind="place")
    cases = [
        ("category", dict(message="국악을 듣고 싶어", revision=1, condition_draft=draft)),
        ("location_time", dict(message="2026년 10월 31일 오후 2시부터 오후 5시까지 청량리역에서 출발해서 전시 한 곳을 찾고 싶어요.", revision=2, condition_draft={})),
        ("confirmed_time_change", dict(message="출발 시각을 같은 날 오후 3시로 바꿔줘.", revision=3,
                                      condition_draft=draft, confirmed_fields=["start_at", "end_at", "start_location"])),
    ]
    results = []
    for name, request in cases:
        started = monotonic()
        status, body = chat(request)
        updated = body.get("updated_condition_draft", {})
        if name == "category":
            passed = status == 200 and updated.get("category") == "국악" and body.get("ready_to_search") is True
        elif name == "location_time":
            passed = (status == 200 and updated.get("start_query") == "청량리역"
                      and updated.get("start_at") == draft["start_at"] and updated.get("end_at") == draft["end_at"]
                      and updated.get("category") == "전시" and updated.get("request_kind") == "place"
                      and "start_location" not in updated and body.get("ready_to_search") is False)
        else:
            passed = (status == 200 and updated.get("start_at") == draft["start_at"]
                      and body.get("ready_to_search") is False and any(
                          c.get("field") == "start_at" and c.get("after") == "2026-10-31T15:00:00+09:00"
                          for c in body.get("conflicts", [])))
        # body는 어댑터가 정규화한 공개 테스트 결과다. 원문/헤더/키는 수집하지 않는다.
        results.append(dict(case=name, http_status=status, passed=bool(passed),
                            elapsed_seconds=round(monotonic()-started, 2), result=body))
        print(f"{name}: {'PASS' if passed else 'FAIL'} HTTP {status}", flush=True)
        if status != 200:
            break
    output = dict(checked_at=datetime.now(KST).isoformat(timespec="seconds"), model=model,
                  mode="live", results=results, passed=len(results) == 3 and all(r["passed"] for r in results))
    path = ROOT / ".local/chat-live.json"
    path.parent.mkdir(exist_ok=True)
    path.write_text(json.dumps(output, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
    return 0 if output["passed"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
