"""Smoke-test a running index watcher with a temporary documented source file.

Keywords: live, watcher, smoke, realtime, 실시간검증, 색인
Usage: python utils/scripts/verify_watch.py
Creates, edits and removes only utils/_index_watch_probe.py; never touches Git.
"""

from pathlib import Path
import time

from catalog import ROOT


def wait_for(predicate, label: str, seconds: float = 12) -> None:
    """Wait a bounded period for generated evidence or report the failed phase."""
    deadline = time.monotonic() + seconds
    while time.monotonic() < deadline:
        if predicate():
            return
        time.sleep(0.2)
    raise RuntimeError("Watcher did not reflect " + label)


def contents(path: Path) -> str:
    """Read generated text, tolerating a brief replacement window."""
    try:
        return path.read_text(encoding="utf-8")
    except FileNotFoundError:
        return ""


def main() -> int:
    """Verify creation, symbol/overview changes and deletion; clean our probe."""
    probe = ROOT / "utils/_index_watch_probe.py"
    if probe.exists() or not (ROOT / ".local/index-watch.lock").exists():
        raise RuntimeError("Probe exists or watcher is not running")
    forward = ROOT / "docs/development/repo_index.md"
    reverse = ROOT / "docs/development/repo_reverse_index.md"
    first = '"""INDEX_WATCH_PROBE_CREATE."""\ndef probe_created():\n    """Probe create."""\n    return 1\n'
    second = '"""INDEX_WATCH_PROBE_UPDATE."""\ndef probe_updated():\n    """Probe update."""\n    return 2\n'
    try:
        probe.write_text(first, encoding="utf-8", newline="\n")
        wait_for(lambda: "INDEX_WATCH_PROBE_CREATE" in contents(forward) and "`probe_created`" in contents(reverse), "creation")
        print("PASS live file creation and symbol indexing")
        probe.write_text(second, encoding="utf-8", newline="\n")
        wait_for(lambda: "INDEX_WATCH_PROBE_UPDATE" in contents(forward) and "`probe_updated`" in contents(reverse)
                 and "`probe_created`" not in contents(reverse), "update")
        print("PASS live content/symbol update")
    finally:
        if probe.exists() and contents(probe) in {first, second}:
            probe.unlink()
    wait_for(lambda: "utils/_index_watch_probe.py" not in contents(forward) and "`probe_updated`" not in contents(reverse), "deletion")
    print("PASS live deletion; temporary source removed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
