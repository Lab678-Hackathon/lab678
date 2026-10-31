"""HTTP 처리기의 입력 오류 계약과 route/course 호환을 외부 조회 없이 검증한다."""
import io
import json
import unittest
from email.message import Message
from unittest.mock import Mock, patch

from outing import EXAMPLES
from preview import Preview


class PreviewContractTests(unittest.TestCase):
    """실제 POST 처리기를 사용하되 응답 전송과 외부 공급자만 대체한다."""

    def request(self, data):
        """JSON 요청을 HTTP 처리기에 전달하고 상태 코드·응답을 반환한다."""
        raw = json.dumps(data).encode()
        handler = Preview.__new__(Preview)
        handler.path = "/preview/recommend"
        handler.headers = Message()
        handler.headers["Content-Type"] = "application/json"
        handler.headers["Content-Length"] = str(len(raw))
        handler.rfile = io.BytesIO(raw)
        handler.reply = Mock()
        handler.do_POST()
        return handler.reply.call_args.args

    def setUp(self):
        """각 테스트가 사용할 독립적인 정상 요청을 읽는다."""
        self.data = json.loads((EXAMPLES / "outing-request.json").read_bytes())
        self.data.update(start_at="2026-10-31T14:00:00+09:00", end_at="2026-10-31T15:00:00+09:00")

    def test_short_duration_response(self):
        """60분 미만은 필드/코드가 있는 400이며 문화/코스 조회를 하지 않는다."""
        self.data.update(request_kind="route", end_at="2026-10-31T14:59:00+09:00")
        with patch("outing.seoul_page") as source, patch("preview.build_course") as course:
            status, body = self.request(self.data)
        source.assert_not_called()
        course.assert_not_called()
        self.assertEqual((status,body["status"],body["code"],body["field"]),
                         (400,"need_input","minimum_duration","end_at"))
        self.assertEqual(body["message"],"나들이 시간은 최소 1시간 이상으로 설정해 주세요.")

    def test_kind_compatibility(self):
        """정확히 60분인 route/course가 같은 코스 경로로, place는 후보만 반환한다."""
        for kind in ("place", "route", "course"):
            with self.subTest(kind=kind), patch("outing.seoul_page",return_value=([],"test",0)), \
                    patch("preview.build_course",return_value={"status":"check","message":"테스트 코스"}) as course:
                status,body = self.request(dict(self.data,request_kind=kind))
            self.assertEqual(status,200)
            self.assertEqual("course" in body,kind != "place")
            self.assertEqual(course.call_count, int(kind != "place"))

    def test_source_error_is_not_input_error(self):
        """공급자 장애는 필드 오류 대신 502이며 공급자 예외 내용은 숨긴다."""
        with patch("outing.seoul_page",side_effect=OSError("private provider detail")):
            status,body = self.request(self.data)
        self.assertEqual((status,body["status"]),(502,"error"))
        self.assertNotIn("private",str(body))

    def test_invalid_kind(self):
        """지원하지 않는 요청 종류를 place로 조용히 대체하지 않는다."""
        status,body = self.request(dict(self.data,request_kind="unknown"))
        self.assertEqual((status,body["code"],body["field"]),(400,"invalid_kind","request_kind"))
