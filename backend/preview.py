"""동조 개인용 로컬 추천 점검 화면. python backend/preview.py로 시작한다."""
import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.error import URLError

from outing import EXAMPLES, recommend
from local_voice import render_wave
from course import build_course
from walking import walk_between


class Preview(BaseHTTPRequestHandler):
    """허용된 화면과 개인 검증용 JSON 요청만 제공한다."""

    def reply(self, status, body, content_type="application/json"):
        """UTF-8 본문을 길이와 함께 응답한다."""
        if content_type == "application/json":
            body = json.dumps(body, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header("Content-Type", content_type if content_type.startswith("audio/") else content_type + "; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        """점검 폼과 저장소의 대표 요청만 제공한다."""
        if self.path == "/":
            self.reply(200, Path(__file__).with_name("preview.html").read_bytes(), "text/html")
        elif self.path == "/example":
            self.reply(200, json.loads((EXAMPLES / "outing-request.json").read_bytes()))
        else:
            self.send_error(404)

    def do_POST(self):
        """장소 요청을 처리하고 입력·외부 공급자 오류를 다른 상태로 전달한다."""
        if self.path not in {"/preview/recommend", "/preview/voice", "/preview/walk"}:
            self.send_error(404)
            return
        if self.headers.get_content_type() != "application/json":
            self.send_error(415)
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if not 0 < length <= 8192:
                raise ValueError("요청 크기를 확인해 주세요.")
            data = json.loads(self.rfile.read(length))
            if not isinstance(data, dict):
                raise ValueError("요청 형식을 확인해 주세요.")
            if self.path == "/preview/walk":
                try:
                    status, body = walk_between(data.get("points"))
                except ValueError as exc:
                    status, body = 400, dict(message=str(exc))
                self.reply(status, body)
                return
            if self.path == "/preview/voice":
                try:
                    audio = render_wave(data.get("text"))
                except ValueError as exc:
                    self.reply(400, dict(message=str(exc)))
                except RuntimeError:
                    self.reply(503, dict(message="이 PC에서 한국어 음성 파일을 만들지 못했습니다."))
                else:
                    self.reply(200, audio, "audio/wav")
                return
            result = recommend(data, data.get("mode", "live"))
            if data.get("request_kind") == "course":
                result["course"] = build_course(data, result["candidates"])
        except (ValueError, TypeError, KeyError):
            self.reply(400, dict(status="need_input", message="출발 좌표·분류·당일 시간 범위 또는 재생 가능한 기록을 확인해 주세요."))
        except (URLError, OSError, RuntimeError, AttributeError):
            self.reply(502, dict(status="error", message="문화정보 조회에 실패했습니다. 같은 조건으로 다시 시도해 주세요."))
        else:
            self.reply(200, result)


if __name__ == "__main__":
    print("http://127.0.0.1:8765", flush=True)
    ThreadingHTTPServer(("127.0.0.1", 8765), Preview).serve_forever()
