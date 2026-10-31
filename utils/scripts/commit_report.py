"""Commit an approved task with its complete UTF-8 report as the exact message.

Keywords: commit, report, exact, deadline, 커밋, 완료보고
Usage: commit_report.py --report PATH --path PATH [--path PATH] [--commit]
Default is read-only preflight. Never pushes, amends, sets identity or installs hooks.
"""

import argparse
from datetime import datetime, timezone
from pathlib import Path
import subprocess

from catalog import ROOT, config
from reuse import safe_target


def verify_message(root: Path, report: Path) -> bool:
    """Compare raw latest-commit message bytes to the complete report file."""
    commit = subprocess.check_output(["git", "cat-file", "commit", "HEAD"], cwd=root)
    return commit.split(b"\n\n", 1)[1] == report.read_bytes()


def preflight(root: Path, report: str, paths: list[str], now: datetime | None = None) -> tuple[Path, list[str]]:
    """Validate branch, cutoff, report encoding, scoped paths and an empty index."""
    settings = config(root)
    moment = now or datetime.now(timezone.utc)
    if moment >= datetime.fromisoformat(settings["commit_deadline"]):
        raise ValueError("Submission cutoff reached; commit prohibited")
    branch = subprocess.check_output(["git", "branch", "--show-current"], cwd=root).decode().strip()
    if branch != settings["branch"]:
        raise ValueError("Unexpected branch; refusing to commit")
    if subprocess.check_output(["git", "diff", "--cached", "--name-only"], cwd=root).strip():
        raise ValueError("Index already contains changes; inspect before staging")
    target = safe_target(root, report)
    raw = target.read_bytes()
    text = raw.decode("utf-8")
    if not text.strip() or raw.startswith(b"\xef\xbb\xbf") or b"\r" in raw or not raw.endswith(b"\n"):
        raise ValueError("Report must be nonempty UTF-8 without BOM, LF only, with a final newline")
    if "co-authored-by:" in text.casefold():
        raise ValueError("AI/coauthor trailer not allowed for this task")
    selected = []
    for name in [*paths, report]:
        item = safe_target(root, name)
        if item == root or not item.exists():
            raise ValueError("Only existing explicit paths may be staged")
        if item.is_dir() and any(p.is_symlink() for p in item.rglob("*")):
            raise ValueError("Symlink in selected directory")
        selected.append(item.relative_to(root).as_posix())
    return target, sorted(set(selected))


def main() -> int:
    """Check by default; stage and commit only when --commit is explicitly given."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--report", required=True)
    parser.add_argument("--path", action="append", required=True)
    parser.add_argument("--commit", action="store_true")
    args = parser.parse_args()
    report, paths = preflight(ROOT, args.report, args.path)
    print(f"Preflight passed: {len(paths)} explicit path(s); complete report message")
    if args.commit:
        subprocess.run(["git", "add", "--", *paths], cwd=ROOT, check=True)
        subprocess.run(["git", "diff", "--cached", "--check"], cwd=ROOT, check=True)
        pre_commit = datetime.now(timezone.utc)
        if pre_commit >= datetime.fromisoformat(config(ROOT)["commit_deadline"]):
            raise ValueError("Cutoff reached after staging; no commit created")
        subprocess.run(["git", "commit", "--cleanup=verbatim", "--file", str(report)], cwd=ROOT, check=True)
        if not verify_message(ROOT, report):
            raise ValueError("Stored message differs; inspect hooks/config without rewriting history")
        print("Verified complete report equals commit message byte for byte; no push")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
