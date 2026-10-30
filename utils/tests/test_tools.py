"""Exercise failure paths for indexes, copying, loops, context and commit guards.

Tests use temporary files/Git repositories; no network, credentials or project commits.
"""

from datetime import datetime, timezone
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import catalog
import commit_report
import context
import harness
import loop
import reuse
import watch


class ToolsTest(unittest.TestCase):
    """Check behavior with independent fixtures rather than mirrored implementation."""

    def setUp(self) -> None:
        """Create a minimal isolated repository fixture and public harness config."""
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / "utils").mkdir()
        self.settings = {"source_roots": ["utils"], "skip_dirs": [".git", "__pycache__"],
                         "markdown_roots": ["utils"], "branch": "dj/develop",
                         "commit_deadline": "2026-11-01T13:00:00+09:00", "state_file": "state.json"}
        self.write("utils/harness.json", json.dumps(self.settings))

    def write(self, name: str, value: str) -> Path:
        """Write a temporary UTF-8 test file and return its location."""
        path = self.root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(value, encoding="utf-8", newline="\n")
        return path

    def git_repo(self) -> None:
        """Initialize only the disposable Git fixture; set fixture-local identity."""
        subprocess.run(["git", "init", "-q", "-b", "dj/develop"], cwd=self.root, check=True)
        subprocess.run(["git", "config", "user.name", "Fixture"], cwd=self.root, check=True)
        subprocess.run(["git", "config", "user.email", "fixture@example.invalid"], cwd=self.root, check=True)

    def state(self) -> dict:
        """Return a complete minimal context payload with no inferred policy."""
        return {"updated_at": "2026-10-31", **{key: ["확인된 내용"] for key, _ in context.SECTIONS}}

    def test_python_qualified_symbols(self) -> None:
        """Classes and async methods retain qualified names and source locations."""
        path = self.write("utils/sample.py", '"""Example module."""\nclass Client:\n    """Client."""\n    async def fetch(self):\n        """Fetch data."""\n        return []\n')
        item = catalog.describe(path, self.root)
        self.assertIn(("Client.fetch", 4, "Fetch data."), item["symbols"])

    def test_index_detects_body_change(self) -> None:
        """Changing only a function body invalidates the fingerprint index."""
        path = self.write("utils/sample.py", '"""Example."""\nvalue = 1\n')
        for name, text in catalog.render(self.root).items():
            self.write(name, text)
        self.assertEqual(catalog.check(self.root), [])
        path.write_text('"""Example."""\nvalue = 2\n', encoding="utf-8")
        self.assertIn("utils/index.md", catalog.check(self.root))

    def test_source_exclusions(self) -> None:
        """Excluded directories and reference snapshots never enter the code catalog."""
        self.write("utils/__pycache__/bad.py", "invalid python")
        self.write("docs/reference/code.py", "invalid python")
        self.assertEqual(catalog.source_files(self.root), [])

    def test_js_overview_and_exports(self) -> None:
        """Documented JS exports are discoverable without executing JavaScript."""
        path = self.write("utils/example.js", '/** Page overview. */\nexport async function render() {}\n')
        self.assertEqual(catalog.describe(path, self.root)["symbols"][0][0], "render")

    def test_repository_inventory_and_secret_exclusion(self) -> None:
        """New arbitrary files enter repo indexes while secret file contents stay out."""
        self.write("notes/new.md", "# New feature\n")
        self.write(".env", "SECRET_MARKER=do-not-read")
        self.write(".env.example", "EXAMPLE_ONLY=")
        output = catalog.render(self.root)
        index = output["docs/development/repo_index.md"]
        self.assertIn("notes/new.md", index)
        self.assertIn(".env.example", index)
        self.assertNotIn("SECRET_MARKER", "".join(output.values()))
        self.assertNotIn("../../.env)", index)

    def test_indexes_converge_without_recursive_hashes(self) -> None:
        """Generating indexes twice is a no-op even though outputs index themselves."""
        self.write("utils/example.py", '"""Example."""\n')
        self.assertGreater(catalog.write_indexes(self.root), 0)
        self.assertEqual(catalog.write_indexes(self.root), 0)

    def test_conditional_python_function(self) -> None:
        """Functions declared under control flow remain discoverable."""
        path = self.write("utils/example.py", '"""Module."""\nif True:\n    def run():\n        """Conditional."""\n        pass\n')
        self.assertEqual(catalog.describe(path, self.root)["symbols"][0][0], "run")

    def test_empty_overview(self) -> None:
        """Whitespace-only overviews yield an explicit missing-summary label."""
        self.assertEqual(catalog.compact("  \n"), "개요 없음")

    def test_docstring_and_syntax_failures(self) -> None:
        """Missing documentation and syntax errors produce actionable diagnostics."""
        self.write("utils/no_docs.py", "def run():\n    return 1\n")
        self.write("utils/bad.py", "def invalid(")
        failures = harness.code_checks(self.root)
        self.assertTrue(any("docstring missing" in item for item in failures))
        self.assertTrue(any("SyntaxError" in item for item in failures))

    def test_link_checks_ignore_code_examples(self) -> None:
        """Relative missing links fail, while fenced placeholders and HTTPS do not."""
        path = self.write("utils/readme.md", '[missing](missing.md)\n[remote](https://example.invalid)\n```md\n[template](not-real.md)\n```\n')
        self.assertEqual(len(harness.broken_links(path, self.root)), 1)

    def test_context_preserves_next_actions(self) -> None:
        """A restart brief includes actionable next steps with their literal status."""
        state = self.state()
        state["next"] = ["미승인: API 제공사 결정"]
        self.assertIn("미승인: API 제공사 결정", context.render(state))

    def test_context_rejects_unbounded_or_missing_data(self) -> None:
        """Oversized lists and absent sections fail instead of silently truncating."""
        state = self.state()
        state["next"] = ["item"] * 11
        with self.assertRaises(ValueError):
            context.render(state)
        del state["next"]
        with self.assertRaises(KeyError):
            context.render(state)

    def test_copy_rejects_unsafe_targets(self) -> None:
        """Traversal, Windows drive paths, Git internals and backslashes are refused."""
        for name in ("../outside", "/absolute", "C:/secret", ".git/config", "..\\outside", ""):
            with self.subTest(name=name), self.assertRaises(ValueError):
                reuse.safe_target(self.root, name)

    def test_hash_compares_bytes(self) -> None:
        """Different line endings are different original file bytes."""
        first = self.write("first.txt", "line\n")
        second = self.root / "second.txt"
        second.write_bytes(b"line\r\n")
        self.assertNotEqual(reuse.file_hash(first), reuse.file_hash(second))

    def test_loop_limit_and_terminal_state(self) -> None:
        """A failed final attempt ends the loop and prevents further records."""
        state = loop.start("Repair", ["utils"], 1)
        state = loop.record(state, "fail", "Hypothesis", "Small change", "Actual failure")
        self.assertEqual(state["status"], "exhausted")
        with self.assertRaises(ValueError):
            loop.record(state, "pass", "New", "Change", "Evidence")

    def test_loop_duplicate_and_evidence(self) -> None:
        """Blind retries and empty evidence are rejected without mutating the original."""
        state = loop.start("Repair", ["utils"], 3)
        next_state = loop.record(state, "fail", "H", "C", "E")
        self.assertEqual(state["attempts"], [])
        with self.assertRaises(ValueError):
            loop.record(next_state, "fail", "H", "C", "E")
        with self.assertRaises(ValueError):
            loop.record(state, "pass", "H", "C", "")

    def test_loop_blocked_and_pass(self) -> None:
        """Blocked and successful tasks cannot silently restart themselves."""
        for result, status in (("blocked", "needs_input"), ("pass", "passed")):
            state = loop.record(loop.start("Task", ["utils"], 3), result, "H", "C", "E")
            self.assertEqual(state["status"], status)

    def test_commit_deadline(self) -> None:
        """The exact Korean submission cutoff rejects a commit before touching Git."""
        with self.assertRaisesRegex(ValueError, "cutoff"):
            commit_report.preflight(self.root, "report.md", ["utils"], datetime(2026, 11, 1, 4, 0, tzinfo=timezone.utc))

    def test_commit_branch_and_report_guards(self) -> None:
        """Wrong branch and CRLF reports cannot pass commit preflight."""
        self.git_repo()
        report = self.write("report.md", "완료 보고문\n")
        now = datetime(2026, 10, 31, tzinfo=timezone.utc)
        self.assertEqual(commit_report.preflight(self.root, "report.md", ["utils"], now)[0], report)
        report.write_bytes(b"report\r\n")
        with self.assertRaises(ValueError):
            commit_report.preflight(self.root, "report.md", ["utils"], now)
        report.write_bytes(b"report\n")
        self.settings["branch"] = "another-branch"
        self.write("utils/harness.json", json.dumps(self.settings))
        with self.assertRaisesRegex(ValueError, "branch"):
            commit_report.preflight(self.root, "report.md", ["utils"], now)

    def test_snapshot_conflict_preflight(self) -> None:
        """A conflicting destination prevents all writes, including earlier files."""
        self.git_repo()
        self.write("source/a.txt", "a\n")
        self.write("source/b.txt", "b\n")
        subprocess.run(["git", "add", "source"], cwd=self.root, check=True, capture_output=True)
        subprocess.run(["git", "commit", "-qm", "fixture"], cwd=self.root, check=True)
        self.write("copy/source/b.txt", "existing content\n")
        with self.assertRaises(ValueError):
            reuse.snapshot(self.root, "HEAD", self.root / "copy", ["source"])
        self.assertFalse((self.root / "copy/source/a.txt").exists())

    def test_watcher_excludes_its_outputs(self) -> None:
        """Generated outputs do not trigger another watcher cycle even without config hints."""
        before = watch.signature(self.root)
        for name in catalog.generated_paths():
            self.write(name, "generated\n")
        self.write("docs/development/current-state.md", "brief\n")
        self.assertEqual(watch.signature(self.root), before)

    def test_watcher_detects_add_modify_delete(self) -> None:
        """Source additions, content changes and deletion alter the watcher signature."""
        initial = watch.signature(self.root)
        path = self.write("utils/new.py", '"""One."""\n')
        added = watch.signature(self.root)
        self.assertNotEqual(initial, added)
        path.write_text('"""Different length."""\n', encoding="utf-8")
        self.assertNotEqual(added, watch.signature(self.root))
        path.unlink()
        self.assertEqual(initial, watch.signature(self.root))

    def test_staged_changes_rejected(self) -> None:
        """Existing staged work is not silently combined into a task commit."""
        self.git_repo()
        self.write("report.md", "Report\n")
        self.write("other.txt", "Other task\n")
        subprocess.run(["git", "add", "other.txt"], cwd=self.root, check=True, capture_output=True)
        with self.assertRaisesRegex(ValueError, "Index already"):
            commit_report.preflight(self.root, "report.md", ["utils"], datetime(2026, 10, 31, tzinfo=timezone.utc))

    def test_complete_report_message_bytes(self) -> None:
        """Git stores the full Markdown report, not just a shortened subject."""
        self.git_repo()
        report = self.write("report.md", "작업 완료\n\n- 상세 내용\n- 검증 결과\n")
        subprocess.run(["git", "add", "report.md"], cwd=self.root, check=True, capture_output=True)
        subprocess.run(["git", "commit", "--cleanup=verbatim", "--file", str(report)], cwd=self.root, check=True, capture_output=True)
        self.assertTrue(commit_report.verify_message(self.root, report))
        report.write_text("Changed\n", encoding="utf-8")
        self.assertFalse(commit_report.verify_message(self.root, report))


if __name__ == "__main__":
    unittest.main()
