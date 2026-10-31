"""임시 로컬 서버에서 대화 API 정상·입력·미설정·CORS를 검사한다. 외부 AI 호출은 모의다.

Usage: python utils/scripts/check_chat_api.py
실행 중인 앱 서버/환경 파일은 변경하지 않는다. 테스트 서버는 종료 시 닫는다.
"""
import json
import os
from pathlib import Path
import sys
from http.client import HTTPConnection
from http.server import ThreadingHTTPServer
from threading import Thread
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "backend"))
from preview import Preview


def request(port, data=None):
    """임시 서버로 JSON POST 또는 CORS OPTIONS를 보내 상태/본문/허용 origin을 반환한다."""
    connection = HTTPConnection("127.0.0.1", port, timeout=3)
    try:
        headers = {"Origin": "http://127.0.0.1:5173", "Content-Type": "application/json"}
        if data is None:
            headers.update({"Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type"})
        connection.request("POST" if data is not None else "OPTIONS", "/preview/chat",
                           body=json.dumps(data).encode() if data is not None else None, headers=headers)
        response = connection.getresponse()
        raw = response.read()
        return response.status, json.loads(raw) if raw else {}, response.getheader("Access-Control-Allow-Origin")
    finally:
        connection.close()


def main():
    """외부 키 사용 없이 4개 HTTP 구간을 검사하고 임시 서버를 반드시 종료한다."""
    server = ThreadingHTTPServer(("127.0.0.1", 0), Preview)
    thread = Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        with patch.dict(os.environ, {"LAB678_ALLOWED_ORIGINS": "http://127.0.0.1:5173"}), \
                patch("naito_chat.settings", return_value=("", "claude-sonnet-4")):
            status, body, origin = request(server.server_port, dict(message="국악", revision=0))
            assert (status, body["code"]) == (503, "ai_not_configured")
            assert origin == "http://127.0.0.1:5173"
            print("PASS HTTP missing configuration: 503, CORS")
            status, body, _ = request(server.server_port, dict(message="", revision=0))
            assert (status, body["field"]) == (400, "message")
            print("PASS HTTP invalid input: 400")
            status, _, origin = request(server.server_port)
            assert (status, origin) == (204, "http://127.0.0.1:5173")
            print("PASS HTTP preflight: 204")
            with patch("naito_chat.settings", return_value=("mock-only", "claude-sonnet-4")), \
                    patch("naito_chat.extract_conditions", return_value={"category": "국악"}):
                status, body, _ = request(server.server_port, dict(message="국악", revision=0))
            assert status == 200 and body["updated_condition_draft"]["category"] == "국악"
            assert body["model"] == "claude-sonnet-4" and not body["ready_to_search"]
            print("PASS HTTP mocked interpretation: 200; actual AI untested")
    finally:
        server.shutdown()
        server.server_close()
        thread.join()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
