"""실제 Naito로 대화 수정·취소·시간 경계를 검사한다. 고정 시험 발화만 사용하고 키는 출력하지 않는다.

Usage: python utils/scripts/check_conversation_edges.py
실제 모델 호출 최대10회. 결과는 .local/conversation-edges.json, 공급자 장애 시 다음 호출은 중단한다.
"""
from copy import deepcopy
from datetime import datetime
import json
from pathlib import Path
import sys
from time import monotonic

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))
from naito_chat import chat, settings
from outing import KST


def main():
    """독립 예산·제외·제약·시간 시나리오를 실행하고 조건 유지/해제를 명시적으로 검사한다."""
    key, model = settings()
    if not key or model != "claude-sonnet-4":
        print("Required model configuration is missing")
        return 2
    del key
    base = dict(start_location=dict(label="청량리역", lat=37.5805961, lng=127.0482573),
                start_at="2026-10-31T14:00:00+09:00", end_at="2026-10-31T17:00:00+09:00",
                category="전시", categories=["전시"], request_kind="place")
    rows = []

    def run(name, message, draft, predicate, history=None):
        """변경된 초안과 결과를 기록한다. 실패 원문은 정규화된 시험 응답만 남긴다."""
        started = monotonic()
        status, result = chat(dict(message=message, revision=len(rows), condition_draft=deepcopy(draft),
                                   conversation_context=history or []))
        updated = result.get("updated_condition_draft", {})
        passed = status == 200 and predicate(updated, result)
        rows.append(dict(name=name, message=message, http_status=status, passed=bool(passed),
                         elapsed_seconds=round(monotonic()-started, 2), result=result))
        print(f"{name}: {'PASS' if passed else 'FAIL'} HTTP {status}", flush=True)
        if status != 200:
            raise RuntimeError("Provider failure; stopped remaining live calls")
        return updated

    try:
        draft = run("budget_and_paid", "무료만 볼 필요는 없어. 유료도 괜찮고 1인 관람료는 2만원 이내로 해줘.",
                    dict(base, free_only=True), lambda d, r: d.get("free_only") is False and d.get("budget_krw") == 20000)
        run("budget_clear", "관람료 예산 제한은 없애줘. 유료도 괜찮아.", draft,
            lambda d, r: d.get("budget_krw") == "any" and d.get("free_only") is False)
        draft = run("exclude_accumulates", "송파도 빼줘. 아까 뺀 도암갤러리는 계속 빼고.", dict(base, exclude_terms=["도암갤러리"]),
                    lambda d, r: any("송파" in x for x in d.get("exclude_terms", [])) and "도암갤러리" in d.get("exclude_terms", []))
        run("exclude_clear", "장소 제외 조건을 전부 취소할게. 아까 뺀 곳도 다시 포함해줘.", draft,
            lambda d, r: d.get("exclude_terms") == [])
        draft = run("hard_accessibility", "계단 없는 곳만 추천해줘. 반드시 지켜야 해.", base,
                    lambda d, r: bool(d.get("unsupported_requirements")) and r["ready_to_search"] is False)
        run("hard_explicit_release", "계단 없는 곳이라는 필수 조건은 취소할게. 내가 직접 확인할게.", draft,
            lambda d, r: d.get("unsupported_requirements") == [] and r["ready_to_search"] is True)
        no_times = {k: v for k, v in base.items() if k not in {"start_at", "end_at"}}
        no_times["date"] = "2026-10-31"
        run("ambiguous_time", "2시쯤 출발할래. 오전인지 오후인지는 아직 안 정했어.", no_times,
            lambda d, r: "start_at" not in d and not r["ready_to_search"])
        draft = run("minimum_59", "같은 날 오후 2시에 출발해서 오후 2시 59분에 끝낼게.", base,
                    lambda d, r: any(e["code"] == "minimum_duration" for e in r["field_errors"]) and not r["ready_to_search"])
        run("minimum_60", "그럼 종료 시각을 같은 날 오후 3시로 바꿀게.", draft,
            lambda d, r: d.get("end_at") == "2026-10-31T15:00:00+09:00" and r["ready_to_search"])
        run("negative_interest", "국악은 싫어. 클래식만 듣고 싶어.", base,
            lambda d, r: d.get("categories") == ["클래식"] and "국악" not in d.get("keywords", []) and not d.get("music_followup"))
    except RuntimeError as error:
        print(str(error))
    result = dict(checked_at=datetime.now(KST).isoformat(timespec="seconds"), model=model, mode="live",
                  passed=len(rows) == 10 and all(r["passed"] for r in rows), cases=rows)
    (ROOT / ".local/conversation-edges.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return 0 if result["passed"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
