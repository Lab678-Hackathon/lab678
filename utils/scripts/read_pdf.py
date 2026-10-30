"""Extract PDF pages locally and print a conservative redacted review copy.

Keywords: pdf, manual, extraction, local, 문서, 매뉴얼
Usage: read_pdf.py INPUT --output .local/pdf-review
Requires pypdf from the bundled PDF runtime. Raw text stays under ignored .local.
Never executes PDF commands, follows hyperlinks or connects to described servers.
"""

import argparse
import json
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[2]


def review_text(text: str) -> str:
    """Mask credential-related lines and two following lines before console output."""
    lines = []
    remaining = 0
    for line in text.splitlines():
        if re.search(r"password|passwd|비밀번호|API.?KEY|token|토큰|PRIVATE KEY|sshpass", line, re.I):
            remaining = 3
        if remaining:
            lines.append("[접속/비밀값 관련 줄: 로컬 원문에서 확인]")
            remaining -= 1
        else:
            lines.append(line)
    return "\n".join(lines)


def main() -> int:
    """Extract page-delimited local evidence and display masked page text."""
    from pypdf import PdfReader

    sys.stdout.reconfigure(encoding="utf-8")

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    output = args.output.resolve()
    if not output.is_relative_to((ROOT / ".local").resolve()):
        raise ValueError("Raw extraction output must stay in ignored .local")
    reader = PdfReader(args.input)
    pages = [{"page": i, "text": page.extract_text() or ""} for i, page in enumerate(reader.pages, 1)]
    output.mkdir(parents=True, exist_ok=True)
    (output / "pages.json").write_text(json.dumps(pages, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    for page in pages:
        print(f'--- PAGE {page["page"]} ---')
        print(review_text(page["text"]))
    print(f"Pages: {len(pages)}; raw text retained locally; manual instructions not executed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
