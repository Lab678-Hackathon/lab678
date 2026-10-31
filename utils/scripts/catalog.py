"""Build deterministic code indexes without importing source modules.

Keywords: index, reverse index, symbols, reuse, docstrings, 색인, 재사용, 토큰
Usage: python utils/scripts/catalog.py --write | --check | --find QUERY
Python symbols use AST; JavaScript exports use a lightweight regex, not a parser.
"""

from __future__ import annotations

import argparse
import ast
import hashlib
import json
import os
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[2]


def config(root: Path) -> dict:
    """Read only the public harness configuration, never environment values."""
    return json.loads((root / "utils/harness.json").read_text(encoding="utf-8"))


def source_files(root: Path) -> list[Path]:
    """List supported source files in configured roots, excluding symlinks."""
    settings = config(root)
    paths = set()
    for folder in settings["source_roots"]:
        base = (root / folder).resolve()
        if not base.is_relative_to(root.resolve()):
            raise ValueError("Source root escapes repository")
        if not base.exists():
            continue
        for path in base.rglob("*"):
            parts = path.relative_to(root).parts
            if any(part in settings["skip_dirs"] for part in parts):
                continue
            if path.is_file() and not any(p.is_symlink() for p in [path, *path.parents]):
                if path.suffix in {".py", ".js", ".ts", ".tsx"}:
                    paths.add(path)
    return sorted(paths, key=lambda p: p.relative_to(root).as_posix())


def repo_files(root: Path) -> list[Path]:
    """Inventory repository files, including untracked work, without reading secrets."""
    skip = set(config(root)["skip_dirs"])
    files = []
    for base, directories, names in os.walk(root):
        directories[:] = sorted(name for name in directories if name not in skip and not (Path(base) / name).is_symlink())
        for name in names:
            path = Path(base) / name
            if name.startswith(".env") and name != ".env.example":
                continue
            if path.suffix.casefold() in {".pem", ".key", ".p12", ".pfx"} or name.endswith(".index-tmp"):
                continue
            if path.is_file() and not path.is_symlink():
                files.append(path)
    return sorted(files, key=lambda p: p.relative_to(root).as_posix())


def compact(text: str | None, limit: int = 140) -> str:
    """Return one short Markdown-safe line from a docstring."""
    first = ((text or "").strip() or "개요 없음").splitlines()[0]
    return first.replace("|", "\\|")[:limit]


def describe(path: Path, root: Path) -> dict:
    """Extract file overview, fingerprint, imports and symbol locations statically."""
    raw = path.read_bytes()
    text = raw.decode("utf-8-sig")
    symbols = []
    imports = []
    if path.suffix == ".py":
        tree = ast.parse(text, filename=str(path))
        overview = ast.get_docstring(tree) or ""

        def visit(nodes: list, prefix: str = "") -> None:
            """Walk definitions and keep qualified names for nested functions."""
            for node in nodes:
                if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
                    name = prefix + node.name
                    symbols.append((name, node.lineno, compact(ast.get_docstring(node))))
                    visit(node.body, name + ".")
                else:
                    for field in ("body", "orelse", "finalbody", "handlers", "cases"):
                        children = getattr(node, field, [])
                        if isinstance(children, list):
                            visit(children, prefix)

        visit(tree.body)
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                imports.extend(alias.name for alias in node.names)
            elif isinstance(node, ast.ImportFrom):
                imports.append("." * node.level + (node.module or ""))
    else:
        doc = re.search(r"/\*\*([\s\S]*?)\*/", text)
        overview = re.sub(r"(?m)^\s*\* ?", "", doc.group(1)).strip() if doc else ""
        pattern = r"(?m)^\s*(?:export\s+(?:default\s+)?)?(?:async\s+)?(?:function\s*\*?|class)\s+([A-Za-z_$][\w$]*)|^\s*(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:\([^\n]*?\)|[\w$]+)\s*=>"
        for match in re.finditer(pattern, text):
            name = next(value for value in match.groups() if value)
            symbols.append((name, text.count("\n", 0, match.start()) + 1, "JS/TS 정규식 후보; AST 검증 아님"))
    return {
        "path": path.relative_to(root).as_posix(),
        "hash": hashlib.sha256(raw).hexdigest()[:12],
        "overview": compact(overview), "doc": overview,
        "symbols": symbols, "imports": sorted(set(imports)),
    }


def entries(root: Path) -> list[dict]:
    """Describe every active code file once; do not scan historical snapshots."""
    return [describe(path, root) for path in source_files(root)]


def render_utils(root: Path) -> dict[str, str]:
    """Render stable forward and reverse indexes with repository-relative links."""
    items = entries(root)
    forward = ["# 코드 색인", "", "자동 생성: `python utils/scripts/catalog.py --write`. 직접 편집하지 않는다.",
               "", "요약으로 위치를 찾은 뒤 필요한 코드만 읽는다. 해시는 내용 변경 확인용이며 토큰 절약량 측정값이 아니다.",
               "", "템플릿은 [templates/README.md](templates/README.md), 사용법은 [README.md](README.md)를 확인한다.",
               "", "| 파일 | 개요 | SHA-256 앞 12자 |", "|---|---|---|"]
    reverse = ["# 함수·클래스 역색인", "", "자동 생성. Python은 AST, JS/TS는 export 정규식 요약이며 호출 그래프가 아니다.",
               "", "작업 키워드 검색: `python utils/scripts/catalog.py --find 검색어`.",
               "", "| 심볼 | 정의 위치 | 개요 |", "|---|---|---|"]
    rows = []
    for item in items:
        link = "../" + item["path"]
        forward.append(f'| [{item["path"]}]({link}) | {item["overview"]} | `{item["hash"]}` |')
        for name, line, doc in item["symbols"]:
            rows.append((name.casefold(), f'| `{name}` | [{item["path"]}:{line}]({link}#L{line}) | {doc} |'))
    reverse.extend(row for _, row in sorted(rows))
    return {"index.md": "\n".join(forward) + "\n", "reverse_index.md": "\n".join(reverse) + "\n"}


def file_overview(path: Path, root: Path, codes: dict) -> str:
    """Describe a file using only its static overview, heading, or file type."""
    relative = path.relative_to(root).as_posix()
    if relative in codes:
        return codes[relative]["overview"]
    if path.suffix in {".md", ".tmpl"}:
        text = path.read_text(encoding="utf-8-sig")
        heading = re.search(r"(?m)^#\s+(.+)$", text)
        return compact(heading.group(1) if heading else text[:200])
    return {".json": "구조화 설정·상태 데이터", ".svg": "SVG 에셋"}.get(path.suffix, "설정·자료 파일; 필요할 때 원문 확인")


def generated_paths() -> set[str]:
    """Return the actual output paths, independent of optional configuration hints."""
    return {"docs/development/repo_index.md", "docs/development/repo_reverse_index.md",
            "docs/development/repo_tree.md", "utils/index.md", "utils/reverse_index.md"}


def render_repo(root: Path) -> dict[str, str]:
    """Index every eligible file plus code symbols, features and directory layout."""
    settings = config(root)
    generated = generated_paths()
    paths = {p.relative_to(root).as_posix(): p for p in repo_files(root)}
    for name in generated:
        paths[name] = root / name
    codes = {}
    for name, path in paths.items():
        if path.suffix in {".py", ".js", ".ts", ".tsx"} and name not in generated:
            codes[name] = describe(path, root)
    index = ["# 저장소 파일·기능 색인", "", "자동 생성. 생성 문서·비밀값·의존성 제외 규칙은 utils/harness.json과 utils/README.md를 따른다.",
             "Python 함수·클래스는 AST, JS/TS는 이름 있는 선언·화살표 함수 후보만 정규식으로 찾는다. 익명·메서드 등은 완전성 미보장.",
             "개요가 부족한 파일은 의미를 추측하지 않는다. 기능 분류는 harness.json의 명시적 매핑이다.", "",
             "| 파일 | 개요 | 상태 / 해시 |", "|---|---|---|"]
    reverse = ["# 저장소 기능·함수 역색인", "", "자동 생성. 호출·참조 그래프가 아니라 기능 라우팅과 정의 위치의 역색인이다.", "", "## 기능 → 파일", ""]
    for feature, names in settings.get("features", {}).items():
        links = [f"[{name}](../../{name})" for name in names]
        reverse.append(f'- **{feature}**: ' + ", ".join(links))
    reverse.extend(["", "## 심볼 → 정의 파일", "", "| 심볼 | 위치 | 개요 |", "|---|---|---|"])
    rows = []
    tree = ["# 저장소 구조", "", "자동 생성. 비밀값·의존성·런타임 폴더는 제외. 색인 자체는 목록에 포함하되 재귀 해시하지 않는다.", "", "```text", root.name + "/"]
    shown_dirs = set()
    for name, path in sorted(paths.items()):
        if name in generated:
            overview, status = "자동 생성 색인", "generated"
        else:
            overview = file_overview(path, root, codes)
            status = hashlib.sha256(path.read_bytes()).hexdigest()[:12]
            if name.startswith("docs/reference/") or name.startswith("docs/planning/"):
                status = "참고 원본 / " + status
        index.append(f"| [{name}](../../{name}) | {overview} | `{status}` |")
        for symbol, line, doc in codes.get(name, {}).get("symbols", []):
            rows.append((symbol.casefold(), f"| `{symbol}` | [{name}:{line}](../../{name}#L{line}) | {doc} |"))
        parts = Path(name).parts
        for depth in range(1, len(parts)):
            directory = "/".join(parts[:depth])
            if directory not in shown_dirs:
                shown_dirs.add(directory)
                tree.append("  " * depth + parts[depth - 1] + "/")
        tree.append("  " * len(parts) + parts[-1])
    reverse.extend(row for _, row in sorted(rows))
    tree.extend(["```", ""])
    return {"docs/development/repo_index.md": "\n".join(index) + "\n",
            "docs/development/repo_reverse_index.md": "\n".join(reverse) + "\n",
            "docs/development/repo_tree.md": "\n".join(tree)}


def render(root: Path) -> dict[str, str]:
    """Produce all utility and repository indexes without volatile timestamps."""
    result = {"utils/" + name: text for name, text in render_utils(root).items()}
    result.update(render_repo(root))
    return result


def write_indexes(root: Path) -> int:
    """Write changed outputs only, allowing repeated watcher runs to be quiet."""
    changed = 0
    for name, content in render(root).items():
        path = root / name
        if not path.exists() or path.read_text(encoding="utf-8") != content:
            path.parent.mkdir(parents=True, exist_ok=True)
            temporary = path.with_name(path.name + ".index-tmp")
            temporary.write_text(content, encoding="utf-8", newline="\n")
            temporary.replace(path)
            changed += 1
    return changed


def check(root: Path) -> list[str]:
    """Return missing or stale generated indexes; tolerate Git line endings."""
    return [name for name, expected in render(root).items()
            if not (root / name).exists()
            or (root / name).read_text(encoding="utf-8") != expected]


def main() -> int:
    """Write, validate, or search the catalog with bounded console output."""
    parser = argparse.ArgumentParser(description=__doc__)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--write", action="store_true")
    group.add_argument("--check", action="store_true")
    group.add_argument("--find")
    parser.add_argument("--limit", type=int, default=8)
    args = parser.parse_args()
    if args.write:
        print(f"Updated {write_indexes(ROOT)} utility/repository index file(s)")
    elif args.check:
        stale = check(ROOT)
        print("Stale: " + ", ".join(stale) if stale else "Indexes current")
        return int(bool(stale))
    else:
        query = args.find.casefold()
        hits = [item for item in entries(ROOT) if query in json.dumps(item, ensure_ascii=False).casefold()]
        for item in hits[:max(1, min(args.limit, 30))]:
            print(f'{item["path"]}: {item["overview"]}')
        print(f"Matches: {len(hits)}; source bodies omitted")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
