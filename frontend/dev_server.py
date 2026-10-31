"""프론트 개발 서버. frontend 폴더를 보여주고 /preview/ 요청은 백엔드로 그대로 넘겨요.

브라우저 입장에선 같은 주소라서 CORS 설정 없이 백엔드를 부를 수 있어요.
실행: python3 frontend/dev_server.py  (백엔드는 python backend/preview.py 로 먼저 켜 둬요)
백엔드 주소를 바꾸려면 LAB678_API=http://주소:포트 환경변수를 줘요.
"""
import os
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent
BACKEND = os.environ.get("LAB678_API", "http://127.0.0.1:8765").rstrip("/")
PORT = int(os.environ.get("PORT", "5173"))


class Handler(SimpleHTTPRequestHandler):
    """정적 파일은 그대로, /preview/ 로 시작하는 POST 는 백엔드로 전달해요."""

    def do_POST(self):
        """백엔드 응답의 상태 코드와 본문을 바꾸지 않고 돌려줘요."""
        if not self.path.startswith("/preview/"):
            self.send_error(404)
            return
        length = int(self.headers.get("Content-Length", "0"))
        req = Request(BACKEND + self.path, data=self.rfile.read(length), method="POST",
                      headers={"Content-Type": self.headers.get("Content-Type", "application/json")})
        try:
            with urlopen(req, timeout=30) as res:
                status, body, ctype = res.status, res.read(), res.headers.get("Content-Type")
        except HTTPError as err:
            status, body, ctype = err.code, err.read(), err.headers.get("Content-Type")
        except URLError:
            status, ctype = 502, "application/json; charset=utf-8"
            body = '{"status":"error","message":"백엔드에 연결하지 못했어요. backend/preview.py가 켜져 있는지 확인해 주세요."}'.encode()
        self.send_response(status)
        self.send_header("Content-Type", ctype or "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)


if __name__ == "__main__":
    print(f"http://127.0.0.1:{PORT}  (API → {BACKEND})", flush=True)
    ThreadingHTTPServer(("127.0.0.1", PORT), partial(Handler, directory=str(ROOT))).serve_forever()
