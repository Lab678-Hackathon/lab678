"""Record a bounded hypothesis-change-evidence loop without executing repair code.

Keywords: loop, attempts, evidence, stop, 루프, 검증, 인계
Usage: loop.py start FILE --goal TEXT --scope PATH; record FILE ...; status FILE
Failures consume a finite attempt budget; pass, blocked and exhausted are terminal.
"""

import argparse
from datetime import datetime, timezone
import json
from pathlib import Path


def start(goal: str, scopes: list[str], limit: int) -> dict:
    """Create an explicit task state with at most ten verification attempts."""
    if not goal.strip() or not scopes or not 1 <= limit <= 10:
        raise ValueError("Goal, scope and a 1..10 attempt limit are required")
    return {"goal": goal, "scope": scopes, "limit": limit, "status": "planned", "attempts": []}


def record(state: dict, outcome: str, hypothesis: str, change: str, evidence: str) -> dict:
    """Append one evidenced attempt, rejecting terminal states and blind repeats."""
    if state["status"] not in {"planned", "in_progress"}:
        raise ValueError("Terminal loop: inspect evidence and explicitly plan a new task")
    if len(state["attempts"]) >= state["limit"]:
        raise ValueError("Attempt budget exhausted")
    if outcome not in {"pass", "fail", "blocked"} or not all(v.strip() for v in (hypothesis, change, evidence)):
        raise ValueError("Outcome, hypothesis, change and evidence are required")
    signature = (hypothesis, change, evidence)
    if any(tuple(a[k] for k in ("hypothesis", "change", "evidence")) == signature for a in state["attempts"]):
        raise ValueError("Repeated attempt without new evidence")
    result = json.loads(json.dumps(state))
    result["attempts"].append({"at": datetime.now(timezone.utc).isoformat(), "outcome": outcome,
                               "hypothesis": hypothesis, "change": change, "evidence": evidence})
    result["status"] = {"pass": "passed", "blocked": "needs_input"}.get(
        outcome, "exhausted" if len(result["attempts"]) >= result["limit"] else "in_progress")
    return result


def main() -> int:
    """Persist only task evidence; never run shell, LLM, network or Git writes."""
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    new = commands.add_parser("start")
    new.add_argument("file", type=Path)
    new.add_argument("--goal", required=True)
    new.add_argument("--scope", action="append", required=True)
    new.add_argument("--limit", type=int, default=3)
    add = commands.add_parser("record")
    add.add_argument("file", type=Path)
    for field in ("outcome", "hypothesis", "change", "evidence"):
        add.add_argument("--" + field, required=True)
    show = commands.add_parser("status")
    show.add_argument("file", type=Path)
    args = parser.parse_args()
    if args.command == "start":
        if args.file.exists():
            raise ValueError("Refuse to overwrite existing task evidence")
        state = start(args.goal, args.scope, args.limit)
    else:
        state = json.loads(args.file.read_text(encoding="utf-8"))
        if args.command == "record":
            state = record(state, args.outcome, args.hypothesis, args.change, args.evidence)
    if args.command != "status":
        args.file.parent.mkdir(parents=True, exist_ok=True)
        args.file.write_text(json.dumps(state, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(f'{state["status"]}: {len(state["attempts"])}/{state["limit"]} attempts; {state["goal"]}')
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
