"""팀 브랜치의 격리 복사본에 채팅 모듈을 연결하는 로컬 검증 서버. 원본 파일은 수정하지 않는다.

Usage: python utils/scripts/team_chat_preview.py --ref origin/feature/front --port 5174
git archive로 frontend만 .local 아래에 보관한다. API는 팀 dev_server의 기존 프록시를 사용한다.
"""
import argparse
from functools import partial
from http.server import ThreadingHTTPServer
import importlib.util
import io
from pathlib import Path
import subprocess
from urllib.parse import urlsplit
import zipfile

ROOT = Path(__file__).resolve().parents[2]


def snapshot(ref):
    """명시한 Git ref의 프론트만 해시별 경로에 복사한다. 기존 복사본은 덮어쓰지 않는다."""
    sha = subprocess.check_output(["git", "rev-parse", "--verify", ref + "^{commit}"], cwd=ROOT).decode().strip()
    target = ROOT / ".local" / ("team-chat-" + sha[:12])
    if not target.exists():
        archive = subprocess.check_output(["git", "archive", "--format=zip", sha, "frontend"], cwd=ROOT)
        with zipfile.ZipFile(io.BytesIO(archive)) as contents:
            for info in contents.infolist():
                destination = (target / info.filename).resolve()
                if not destination.is_relative_to(target.resolve()):
                    raise ValueError("Unexpected archive path")
            contents.extractall(target)
    return target / "frontend", sha


def main():
    """루프백에만 서버를 띄워 팀 HTML과 기존 API 프록시에 독립 모듈을 붙인다."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--ref", default="origin/feature/front")
    parser.add_argument("--port", type=int, default=5174)
    args = parser.parse_args()
    front, sha = snapshot(args.ref)
    spec = importlib.util.spec_from_file_location("team_preview_server", front / "dev_server.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)

    class Handler(module.Handler):
        """팀 프록시/정적 서빙을 유지하고 index와 채팅 모듈 두 경로만 추가한다."""

        def do_GET(self):
            """원본 HTML을 디스크에 수정하지 않고 모듈 script를 응답에만 추가한다."""
            path = urlsplit(self.path).path
            if path in {"/", "/index.html"}:
                html = (front / "index.html").read_text(encoding="utf-8")
                body = html.replace("</body>", '<script type="module" src="/js/dj-chat.js"></script></body>').encode()
                content_type = "text/html; charset=utf-8"
            elif path == "/js/dj-chat.js":
                body = (ROOT / "backend/team_chat.js").read_bytes()
                content_type = "text/javascript; charset=utf-8"
            elif path == "/js/dj-preferences.js":
                body = (ROOT / "backend/team_preferences.js").read_bytes()
                content_type = "text/javascript; charset=utf-8"
            elif path == "/js/search.js":
                # 해당 팀 버전의 두 연결 지점만 응답에서 확장한다. 디스크 원본은 보존한다.
                source = (front / "js/search.js").read_text(encoding="utf-8")
                hooks = {"state.confirmed = request;": "state.confirmed = withPreferences(request);",
                         "$('#confirm-mode').hidden = testMode() !== 'recorded';":
                         "$('#confirm-mode').hidden = testMode() !== 'recorded'; renderPreferenceSummary(r);"}
                for before, after in hooks.items():
                    if source.count(before) != 1:
                        self.send_error(409, "Team frontend changed; integration review required")
                        return
                    source = source.replace(before, after)
                body = ("import { withPreferences, renderPreferenceSummary } from './dj-preferences.js';\n" + source).encode()
                content_type = "text/javascript; charset=utf-8"
            else:
                super().do_GET()
                return
            self.send_response(200)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(body)

    print(f"Team chat preview http://127.0.0.1:{args.port}/?mode=recorded&debug=1#/search · front {sha}", flush=True)
    ThreadingHTTPServer(("127.0.0.1", args.port), partial(Handler, directory=str(front))).serve_forever()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
