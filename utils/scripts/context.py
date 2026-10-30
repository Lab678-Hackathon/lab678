"""Render a compact restart brief from explicit state, without guessing decisions.

Keywords: context, checkpoint, handoff, compression, 현재상태, 압축, 다음할일
Usage: context.py --write | --check | --show
The agent edits state.json after reading conversation; this script only renders it.
"""

import argparse
import json
from pathlib import Path

from catalog import ROOT, config

SECTIONS = (
    ("identity", "사용자·팀·브랜치"), ("objective", "현재 목표"),
    ("permissions", "승인된 범위·운영"), ("completed", "완료·검증"),
    ("in_progress", "진행 중"), ("next", "다음 할 일 — 순서대로"),
    ("open_questions", "미정·주의"), ("read_next", "필요할 때 읽을 자료"),
)


def render(state: dict) -> str:
    """Render bounded, human-curated lists while preserving their decision status."""
    lines = ["# 현재 상태와 다음 할 일", "", f'갱신: {state["updated_at"]}', "",
             "자동 생성: `docs/development/state.json` 수정 후 `python utils/scripts/context.py --write`.",
             "요약은 작업 재개용이다. 공통 규칙·원문·현재 git status가 우선한다."]
    for key, title in SECTIONS:
        values = state[key]
        if not isinstance(values, list) or not 1 <= len(values) <= 10:
            raise ValueError(f"{key}: require 1..10 explicit entries")
        lines.extend(["", "## " + title, ""])
        for value in values:
            if not isinstance(value, str) or not value.strip() or "\n" in value or len(value) > 400:
                raise ValueError(f"{key}: invalid or oversized entry")
            lines.append("- " + value)
    text = "\n".join(lines) + "\n"
    if len(text) > 6500:
        raise ValueError("Restart brief exceeds 6500 characters; curate instead of truncating")
    return text


def expected(root: Path) -> str:
    """Read the configured public state file and generate the brief."""
    path = root / config(root)["state_file"]
    return render(json.loads(path.read_text(encoding="utf-8")))


def main() -> int:
    """Write, check, or print only the short restart brief."""
    parser = argparse.ArgumentParser(description=__doc__)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--write", action="store_true")
    group.add_argument("--check", action="store_true")
    group.add_argument("--show", action="store_true")
    args = parser.parse_args()
    content = expected(ROOT)
    target = ROOT / "docs/development/current-state.md"
    if args.write:
        target.write_text(content, encoding="utf-8", newline="\n")
        print(f"Restart brief updated: {len(content)} characters (not tokenizer tokens)")
    elif args.check:
        same = target.exists() and target.read_text(encoding="utf-8") == content
        print("Restart brief current" if same else "Restart brief missing/stale")
        return int(not same)
    else:
        print(content, end="")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
