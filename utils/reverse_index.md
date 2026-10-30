# 함수·클래스 역색인

자동 생성. Python은 AST, JS/TS는 export 정규식 요약이며 호출 그래프가 아니다.

작업 키워드 검색: `python utils/scripts/catalog.py --find 검색어`.

| 심볼 | 정의 위치 | 개요 |
|---|---|---|
| `broken_links` | [utils/scripts/harness.py:49](../utils/scripts/harness.py#L49) | Check relative inline links outside fenced code; skip URLs and anchors. |
| `check` | [utils/scripts/catalog.py:225](../utils/scripts/catalog.py#L225) | Return missing or stale generated indexes; tolerate Git line endings. |
| `code_checks` | [utils/scripts/harness.py:20](../utils/scripts/harness.py#L20) | Parse Python statically and require module/function/class docstrings. |
| `compact` | [utils/scripts/catalog.py:63](../utils/scripts/catalog.py#L63) | Return one short Markdown-safe line from a docstring. |
| `config` | [utils/scripts/catalog.py:21](../utils/scripts/catalog.py#L21) | Read only the public harness configuration, never environment values. |
| `contents` | [utils/scripts/verify_watch.py:24](../utils/scripts/verify_watch.py#L24) | Read generated text, tolerating a brief replacement window. |
| `describe` | [utils/scripts/catalog.py:69](../utils/scripts/catalog.py#L69) | Extract file overview, fingerprint, imports and symbol locations statically. |
| `describe.visit` | [utils/scripts/catalog.py:79](../utils/scripts/catalog.py#L79) | Walk definitions and keep qualified names for nested functions. |
| `entries` | [utils/scripts/catalog.py:113](../utils/scripts/catalog.py#L113) | Describe every active code file once; do not scan historical snapshots. |
| `expected` | [utils/scripts/context.py:42](../utils/scripts/context.py#L42) | Read the configured public state file and generate the brief. |
| `file_hash` | [utils/scripts/reuse.py:33](../utils/scripts/reuse.py#L33) | Hash file contents in chunks without logging their values. |
| `file_overview` | [utils/scripts/catalog.py:138](../utils/scripts/catalog.py#L138) | Describe a file using only its static overview, heading, or file type. |
| `generated_paths` | [utils/scripts/catalog.py:150](../utils/scripts/catalog.py#L150) | Return the actual output paths, independent of optional configuration hints. |
| `main` | [utils/scripts/catalog.py:232](../utils/scripts/catalog.py#L232) | Write, validate, or search the catalog with bounded console output. |
| `main` | [utils/scripts/commit_report.py:52](../utils/scripts/commit_report.py#L52) | Check by default; stage and commit only when --commit is explicitly given. |
| `main` | [utils/scripts/context.py:48](../utils/scripts/context.py#L48) | Write, check, or print only the short restart brief. |
| `main` | [utils/scripts/harness.py:88](../utils/scripts/harness.py#L88) | Run the harness once; fixing failures requires a separately scoped change. |
| `main` | [utils/scripts/loop.py:40](../utils/scripts/loop.py#L40) | Persist only task evidence; never run shell, LLM, network or Git writes. |
| `main` | [utils/scripts/read_pdf.py:33](../utils/scripts/read_pdf.py#L33) | Extract page-delimited local evidence and display masked page text. |
| `main` | [utils/scripts/reuse.py:77](../utils/scripts/reuse.py#L77) | Compare two files or copy an explicitly selected local Git snapshot. |
| `main` | [utils/scripts/verify_watch.py:32](../utils/scripts/verify_watch.py#L32) | Verify creation, symbol/overview changes and deletion; clean our probe. |
| `main` | [utils/scripts/watch.py:39](../utils/scripts/watch.py#L39) | Watch in a cooperative single-process loop; retain errors in local status. |
| `markdown_files` | [utils/scripts/harness.py:39](../utils/scripts/harness.py#L39) | Select active documentation, excluding copied PRDs and historical snapshots. |
| `preflight` | [utils/scripts/commit_report.py:23](../utils/scripts/commit_report.py#L23) | Validate branch, cutoff, report encoding, scoped paths and an empty index. |
| `record` | [utils/scripts/loop.py:21](../utils/scripts/loop.py#L21) | Append one evidenced attempt, rejecting terminal states and blind repeats. |
| `refresh` | [utils/scripts/watch.py:30](../utils/scripts/watch.py#L30) | Render state before indexing it; leave source and decisions untouched. |
| `render` | [utils/scripts/catalog.py:204](../utils/scripts/catalog.py#L204) | Produce all utility and repository indexes without volatile timestamps. |
| `render` | [utils/scripts/context.py:22](../utils/scripts/context.py#L22) | Render bounded, human-curated lists while preserving their decision status. |
| `render_repo` | [utils/scripts/catalog.py:156](../utils/scripts/catalog.py#L156) | Index every eligible file plus code symbols, features and directory layout. |
| `render_utils` | [utils/scripts/catalog.py:118](../utils/scripts/catalog.py#L118) | Render stable forward and reverse indexes with repository-relative links. |
| `repo_files` | [utils/scripts/catalog.py:46](../utils/scripts/catalog.py#L46) | Inventory repository files, including untracked work, without reading secrets. |
| `review_text` | [utils/scripts/read_pdf.py:18](../utils/scripts/read_pdf.py#L18) | Mask credential-related lines and two following lines before console output. |
| `run` | [utils/scripts/harness.py:63](../utils/scripts/harness.py#L63) | Execute finite static checks and optional isolated utility tests. |
| `safe_target` | [utils/scripts/reuse.py:18](../utils/scripts/reuse.py#L18) | Resolve a relative destination without traversal, links or Git internals. |
| `signature` | [utils/scripts/watch.py:18](../utils/scripts/watch.py#L18) | Track eligible file names and metadata, excluding outputs and temp files. |
| `snapshot` | [utils/scripts/reuse.py:42](../utils/scripts/reuse.py#L42) | Preflight all selected blobs, then copy exactly without replacing files. |
| `source_files` | [utils/scripts/catalog.py:26](../utils/scripts/catalog.py#L26) | List supported source files in configured roots, excluding symlinks. |
| `start` | [utils/scripts/loop.py:14](../utils/scripts/loop.py#L14) | Create an explicit task state with at most ten verification attempts. |
| `ToolsTest` | [utils/tests/test_tools.py:25](../utils/tests/test_tools.py#L25) | Check behavior with independent fixtures rather than mirrored implementation. |
| `ToolsTest.git_repo` | [utils/tests/test_tools.py:46](../utils/tests/test_tools.py#L46) | Initialize only the disposable Git fixture; set fixture-local identity. |
| `ToolsTest.setUp` | [utils/tests/test_tools.py:28](../utils/tests/test_tools.py#L28) | Create a minimal isolated repository fixture and public harness config. |
| `ToolsTest.state` | [utils/tests/test_tools.py:52](../utils/tests/test_tools.py#L52) | Return a complete minimal context payload with no inferred policy. |
| `ToolsTest.test_commit_branch_and_report_guards` | [utils/tests/test_tools.py:180](../utils/tests/test_tools.py#L180) | Wrong branch and CRLF reports cannot pass commit preflight. |
| `ToolsTest.test_commit_deadline` | [utils/tests/test_tools.py:175](../utils/tests/test_tools.py#L175) | The exact Korean submission cutoff rejects a commit before touching Git. |
| `ToolsTest.test_complete_report_message_bytes` | [utils/tests/test_tools.py:235](../utils/tests/test_tools.py#L235) | Git stores the full Markdown report, not just a shortened subject. |
| `ToolsTest.test_conditional_python_function` | [utils/tests/test_tools.py:100](../utils/tests/test_tools.py#L100) | Functions declared under control flow remain discoverable. |
| `ToolsTest.test_context_preserves_next_actions` | [utils/tests/test_tools.py:122](../utils/tests/test_tools.py#L122) | A restart brief includes actionable next steps with their literal status. |
| `ToolsTest.test_context_rejects_unbounded_or_missing_data` | [utils/tests/test_tools.py:128](../utils/tests/test_tools.py#L128) | Oversized lists and absent sections fail instead of silently truncating. |
| `ToolsTest.test_copy_rejects_unsafe_targets` | [utils/tests/test_tools.py:138](../utils/tests/test_tools.py#L138) | Traversal, Windows drive paths, Git internals and backslashes are refused. |
| `ToolsTest.test_docstring_and_syntax_failures` | [utils/tests/test_tools.py:109](../utils/tests/test_tools.py#L109) | Missing documentation and syntax errors produce actionable diagnostics. |
| `ToolsTest.test_empty_overview` | [utils/tests/test_tools.py:105](../utils/tests/test_tools.py#L105) | Whitespace-only overviews yield an explicit missing-summary label. |
| `ToolsTest.test_hash_compares_bytes` | [utils/tests/test_tools.py:144](../utils/tests/test_tools.py#L144) | Different line endings are different original file bytes. |
| `ToolsTest.test_index_detects_body_change` | [utils/tests/test_tools.py:62](../utils/tests/test_tools.py#L62) | Changing only a function body invalidates the fingerprint index. |
| `ToolsTest.test_indexes_converge_without_recursive_hashes` | [utils/tests/test_tools.py:94](../utils/tests/test_tools.py#L94) | Generating indexes twice is a no-op even though outputs index themselves. |
| `ToolsTest.test_js_overview_and_exports` | [utils/tests/test_tools.py:77](../utils/tests/test_tools.py#L77) | Documented JS exports are discoverable without executing JavaScript. |
| `ToolsTest.test_link_checks_ignore_code_examples` | [utils/tests/test_tools.py:117](../utils/tests/test_tools.py#L117) | Relative missing links fail, while fenced placeholders and HTTPS do not. |
| `ToolsTest.test_loop_blocked_and_pass` | [utils/tests/test_tools.py:169](../utils/tests/test_tools.py#L169) | Blocked and successful tasks cannot silently restart themselves. |
| `ToolsTest.test_loop_duplicate_and_evidence` | [utils/tests/test_tools.py:159](../utils/tests/test_tools.py#L159) | Blind retries and empty evidence are rejected without mutating the original. |
| `ToolsTest.test_loop_limit_and_terminal_state` | [utils/tests/test_tools.py:151](../utils/tests/test_tools.py#L151) | A failed final attempt ends the loop and prevents further records. |
| `ToolsTest.test_pdf_review_masks_credential_context` | [utils/tests/test_tools.py:245](../utils/tests/test_tools.py#L245) | Credential lines and their immediate context stay out of review output. |
| `ToolsTest.test_pdf_review_preserves_korean_guidance` | [utils/tests/test_tools.py:252](../utils/tests/test_tools.py#L252) | Normal Korean workload and schedule notes remain available for review. |
| `ToolsTest.test_python_qualified_symbols` | [utils/tests/test_tools.py:56](../utils/tests/test_tools.py#L56) | Classes and async methods retain qualified names and source locations. |
| `ToolsTest.test_repository_inventory_and_secret_exclusion` | [utils/tests/test_tools.py:82](../utils/tests/test_tools.py#L82) | New arbitrary files enter repo indexes while secret file contents stay out. |
| `ToolsTest.test_snapshot_conflict_preflight` | [utils/tests/test_tools.py:195](../utils/tests/test_tools.py#L195) | A conflicting destination prevents all writes, including earlier files. |
| `ToolsTest.test_source_exclusions` | [utils/tests/test_tools.py:71](../utils/tests/test_tools.py#L71) | Excluded directories and reference snapshots never enter the code catalog. |
| `ToolsTest.test_staged_changes_rejected` | [utils/tests/test_tools.py:226](../utils/tests/test_tools.py#L226) | Existing staged work is not silently combined into a task commit. |
| `ToolsTest.test_watcher_detects_add_modify_delete` | [utils/tests/test_tools.py:215](../utils/tests/test_tools.py#L215) | Source additions, content changes and deletion alter the watcher signature. |
| `ToolsTest.test_watcher_excludes_its_outputs` | [utils/tests/test_tools.py:207](../utils/tests/test_tools.py#L207) | Generated outputs do not trigger another watcher cycle even without config hints. |
| `ToolsTest.write` | [utils/tests/test_tools.py:39](../utils/tests/test_tools.py#L39) | Write a temporary UTF-8 test file and return its location. |
| `verify_message` | [utils/scripts/commit_report.py:17](../utils/scripts/commit_report.py#L17) | Compare raw latest-commit message bytes to the complete report file. |
| `wait_for` | [utils/scripts/verify_watch.py:14](../utils/scripts/verify_watch.py#L14) | Wait a bounded period for generated evidence or report the failed phase. |
| `write_indexes` | [utils/scripts/catalog.py:211](../utils/scripts/catalog.py#L211) | Write changed outputs only, allowing repeated watcher runs to be quiet. |
