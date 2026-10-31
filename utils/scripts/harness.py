"""Run offline repository checks with explicit evidence and no auto-repair.

Keywords: harness, verification, docstring, syntax, links, tests, 검증
Usage: python utils/scripts/harness.py [--tests]
Checks active code, relative Markdown links, indexes and restart brief; not API/UI QA.
"""

import argparse
import ast
from pathlib import Path
import re
import subprocess
import sys
from urllib.parse import unquote

from catalog import ROOT, check, config, source_files
from context import expected


def code_checks(root: Path) -> list[str]:
    """Parse Python statically and require module/function/class docstrings."""
    issues = []
    for path in source_files(root):
        if path.suffix != ".py":
            continue
        try:
            tree = ast.parse(path.read_text(encoding="utf-8-sig"), filename=str(path))
        except (SyntaxError, UnicodeError) as exc:
            issues.append(f"{path.relative_to(root)}: {type(exc).__name__}")
            continue
        if not ast.get_docstring(tree):
            issues.append(f"{path.relative_to(root)}: module docstring missing")
        for node in ast.walk(tree):
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)) and not ast.get_docstring(node):
                issues.append(f"{path.relative_to(root)}:{node.lineno}: {node.name} docstring missing")
    return issues


def markdown_files(root: Path) -> list[Path]:
    """Select active documentation, excluding copied PRDs and historical snapshots."""
    files = set(root.glob("*.md"))
    for directory in config(root)["markdown_roots"]:
        base = root / directory
        if base.exists():
            files.update(base.rglob("*.md"))
    return sorted(p for p in files if not p.is_symlink())


def broken_links(path: Path, root: Path) -> list[str]:
    """Check relative inline links outside fenced code; skip URLs and anchors."""
    text = re.sub(r"(?ms)^```.*?^```[^\n]*", "", path.read_text(encoding="utf-8"))
    failures = []
    for raw in re.findall(r"\]\((<[^>]+>|[^)]+)\)", text):
        target = raw.strip("<>").split("#", 1)[0]
        if not target or re.match(r"^[A-Za-z][A-Za-z0-9+.-]*:", target) or target.startswith("/"):
            continue
        resolved = (path.parent / unquote(target)).resolve()
        if not resolved.is_relative_to(root.resolve()) or not resolved.exists():
            failures.append(f"{path.relative_to(root)}: missing/outside link {target}")
    return failures


def run(root: Path, tests: bool = False) -> int:
    """Execute finite static checks and optional isolated utility tests."""
    failures = code_checks(root)
    for path in markdown_files(root):
        failures.extend(broken_links(path, root))
    try:
        failures.extend("Stale index: " + name for name in check(root))
        brief = root / "docs/development/current-state.md"
        if not brief.exists() or brief.read_text(encoding="utf-8") != expected(root):
            failures.append("Restart brief missing/stale")
    except (ValueError, OSError, SyntaxError) as exc:
        failures.append(f"Catalog/context check: {type(exc).__name__}: {exc}")
    for failure in failures[:30]:
        print("FAIL " + failure)
    print(f"Static checks: {len(failures)} issue(s); {len(source_files(root))} source file(s)")
    if tests:
        result = subprocess.run([sys.executable, "-m", "unittest", "discover", "-s", "utils/tests", "-v"],
                                cwd=root, capture_output=True, text=True, timeout=90)
        print((result.stdout + result.stderr)[-10000:])
        if result.returncode:
            failures.append("Utility tests failed")
    print("PASS offline harness" if not failures else "FAIL offline harness")
    return int(bool(failures))


def main() -> int:
    """Run the harness once; fixing failures requires a separately scoped change."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--tests", action="store_true")
    args = parser.parse_args()
    return run(ROOT, args.tests)


if __name__ == "__main__":
    raise SystemExit(main())
