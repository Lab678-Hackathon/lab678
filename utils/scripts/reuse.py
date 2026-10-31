"""Verify copied files and snapshot selected Git files without checkout or merge.

Keywords: snapshot, sha256, copy, branch, 복사, 원본, 재사용
Usage: reuse.py verify SOURCE TARGET | snapshot REF DEST --prefix docs
Snapshots reject symlinks, unsafe paths and real environment files.
"""

from __future__ import annotations

import argparse
import hashlib
from pathlib import Path, PurePosixPath
import subprocess

ROOT = Path(__file__).resolve().parents[2]


def safe_target(base: Path, relative: str) -> Path:
    """Resolve a relative destination without traversal, links or Git internals."""
    rel = PurePosixPath(relative)
    if not relative or "\\" in relative or ":" in relative or rel.is_absolute():
        raise ValueError("Invalid relative path")
    if any(part in {"..", ".git"} for part in rel.parts):
        raise ValueError("Unsafe relative path")
    target = base.joinpath(*rel.parts)
    if any(path.is_symlink() for path in [target, *target.parents]):
        raise ValueError("Symlink destination rejected")
    if not target.resolve().is_relative_to(base.resolve()):
        raise ValueError("Destination escapes base")
    return target


def file_hash(path: Path) -> str:
    """Hash file contents in chunks without logging their values."""
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(65536), b""):
            digest.update(chunk)
    return digest.hexdigest()


def snapshot(root: Path, ref: str, destination: Path, prefixes: list[str]) -> int:
    """Preflight all selected blobs, then copy exactly without replacing files."""
    if not destination.resolve().is_relative_to(root.resolve()):
        raise ValueError("Snapshot destination must be inside repository")
    if ".git" in destination.relative_to(root).parts:
        raise ValueError("Git directory is not a snapshot destination")
    sha = subprocess.check_output(["git", "rev-parse", "--verify", "--end-of-options", ref + "^{commit}"], cwd=root).decode().strip()
    listing = subprocess.check_output(["git", "ls-tree", "-rz", sha], cwd=root).split(b"\0")
    planned = []
    for record in filter(None, listing):
        metadata, raw_name = record.split(b"\t", 1)
        mode, kind, blob = metadata.decode().split()
        name = raw_name.decode("utf-8")
        if prefixes and not any(name == p.rstrip("/") or name.startswith(p.rstrip("/") + "/") for p in prefixes):
            continue
        if kind != "blob" or mode not in {"100644", "100755"}:
            raise ValueError("Only regular blobs may be copied")
        if any(part.startswith(".env") and part != ".env.example" for part in PurePosixPath(name).parts):
            raise ValueError("Environment file rejected")
        target = safe_target(destination, name)
        content = subprocess.check_output(["git", "cat-file", "blob", blob], cwd=root)
        if target.exists() and target.read_bytes() != content:
            raise ValueError(f"Existing file differs: {name}")
        planned.append((target, content))
    if not planned:
        raise ValueError("No files selected")
    for target, content in planned:
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(content)
        if target.read_bytes() != content:
            raise ValueError("Copy verification failed")
    print(f"Copied and verified {len(planned)} files from {sha}; source ref unchanged")
    return len(planned)


def main() -> int:
    """Compare two files or copy an explicitly selected local Git snapshot."""
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    verify = commands.add_parser("verify")
    verify.add_argument("source", type=Path)
    verify.add_argument("target", type=Path)
    copy = commands.add_parser("snapshot")
    copy.add_argument("ref")
    copy.add_argument("destination", type=Path)
    copy.add_argument("--prefix", action="append", default=[])
    args = parser.parse_args()
    if args.command == "verify":
        same = file_hash(args.source) == file_hash(args.target)
        print("Identical" if same else "Different")
        return int(not same)
    destination = args.destination if args.destination.is_absolute() else ROOT / args.destination
    snapshot(ROOT, args.ref, destination, args.prefix)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
