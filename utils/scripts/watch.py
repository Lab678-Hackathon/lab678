"""Refresh indexes and the short context on file changes until explicitly stopped.

Keywords: watch, realtime, index, 변경감지, 실시간, 색인
Usage: watch.py [--interval 2] [--once]
Polling skips generated outputs and .local; never commits or modifies source code.
"""

import argparse
import json
import os
from pathlib import Path
import time

from catalog import ROOT, generated_paths, repo_files, write_indexes
from context import expected


def signature(root: Path) -> tuple:
    """Track eligible file names and metadata, excluding outputs and temp files."""
    outputs = generated_paths() | {"docs/development/current-state.md"}
    values = []
    for path in repo_files(root):
        name = path.relative_to(root).as_posix()
        if name not in outputs and not name.endswith(".index-tmp"):
            stat = path.stat()
            values.append((name, stat.st_mtime_ns, stat.st_size))
    return tuple(values)


def refresh(root: Path) -> int:
    """Render state before indexing it; leave source and decisions untouched."""
    brief = root / "docs/development/current-state.md"
    content = expected(root)
    if not brief.exists() or brief.read_text(encoding="utf-8") != content:
        brief.write_text(content, encoding="utf-8", newline="\n")
    return write_indexes(root)


def main() -> int:
    """Watch in a cooperative single-process loop; retain errors in local status."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--interval", type=float, default=2)
    parser.add_argument("--once", action="store_true")
    args = parser.parse_args()
    if args.interval < 0.5:
        raise ValueError("Minimum polling interval is 0.5 seconds")
    runtime = ROOT / ".local"
    runtime.mkdir(exist_ok=True)
    lock = runtime / "index-watch.lock"
    try:
        handle = os.open(lock, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
    except FileExistsError:
        raise SystemExit("Watcher lock exists; inspect .local/index-watch.json and process before removing stale lock")
    os.close(handle)
    previous = None
    try:
        while not (runtime / "index-watch.stop").exists():
            try:
                current = signature(ROOT)
                if current != previous:
                    changed = refresh(ROOT)
                    previous = current
                    status = {"pid": os.getpid(), "status": "watching", "updated_outputs": changed,
                              "checked_at_epoch": time.time(), "interval_seconds": args.interval}
                    (runtime / "index-watch.json").write_text(json.dumps(status, indent=2) + "\n", encoding="utf-8")
            except (ValueError, OSError, SyntaxError) as exc:
                (runtime / "index-watch.json").write_text(json.dumps({"pid": os.getpid(), "status": "error",
                    "error": str(exc), "checked_at_epoch": time.time()}) + "\n", encoding="utf-8")
                if args.once:
                    raise
            if args.once:
                break
            time.sleep(args.interval)
    finally:
        lock.unlink(missing_ok=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
