"""HTTP 처리기의 입력 오류 계약과 route/course 호환을 외부 조회 없이 검증한다."""
import io
import json
import unittest
from email.message import Message
from unittest.mock import Mock, patch

from outing import EXAMPLES
from preview import Preview, allowed_origins, server_options


class PreviewContractTests(unittest.TestCase):
    """실제 POST 처리기를 사용하되 응답 전송과 외부 공급자만 대체한다."""

    def request(self, data, origin=None, path="/preview/recommend"):
        """JSON 요청을 HTTP 처리기에 전달하고 상태 코드·응답을 반환한다."""
        raw = json.dumps(data).encode()
        handler = Preview.__new__(Preview)
        handler.path = path
        handler.headers = Message()
        handler.headers["Content-Type"] = "application/json"
        handler.headers["Content-Length"] = str(len(raw))
        if origin:
            handler.headers["Origin"] = origin
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

    def test_origin_configuration(self):
        """허용 주소의 정확한 일치만 사용하고 와일드카드·자격정보·잘못된 설정을 제외한다."""
        with patch.dict("os.environ",{"LAB678_ALLOWED_ORIGINS":"http://localhost:5173/,https://ui.example,*,null,http://user@host,http://@host,http://host/path,http://host:99999"}):
            self.assertEqual(allowed_origins(),{"http://localhost:5173","https://ui.example"})
        with patch.dict("os.environ",{"LAB678_ALLOWED_ORIGINS":""}), patch("outing.seoul_page") as source:
            status,body=self.request(self.data, "http://unlisted.example")
        self.assertEqual((status,body["status"]),(403,"forbidden"))
        source.assert_not_called()

    def test_preflight(self):
        """설정된 origin·POST·Content-Type만 사전 요청에서 허용한다."""
        for origin,method,headers,expected in [
                ("http://localhost:5173","POST","content-type",204),
                ("http://localhost:5173","DELETE","content-type",403),
                ("http://localhost:5173","POST","authorization",403),
                ("http://localhost:51730","POST","content-type",403),
                ("null","POST","content-type",403)]:
            handler=Preview.__new__(Preview)
            handler.path="/preview/recommend"
            handler.headers=Message()
            for key,value in [("Origin",origin),("Access-Control-Request-Method",method),("Access-Control-Request-Headers",headers)]:
                handler.headers[key]=value
            handler.reply=Mock(); handler.send_response=Mock(); handler.send_header=Mock(); handler.end_headers=Mock()
            with self.subTest(origin=origin,method=method,headers=headers), patch.dict("os.environ",{"LAB678_ALLOWED_ORIGINS":"http://localhost:5173"}):
                handler.do_OPTIONS()
            if expected == 204:
                handler.send_response.assert_called_once_with(204)
                handler.send_header.assert_any_call("Access-Control-Allow-Methods","POST")
            else:
                self.assertEqual(handler.reply.call_args.args[0],expected)

    def test_render_origin(self):
        """서버 설정의 공개 HTTPS 주소만 허용하고 비슷한 다른 주소는 거절한다."""
        with patch.dict("os.environ", {"LAB678_ALLOWED_ORIGINS":"", "RENDER_EXTERNAL_URL":"https://demo.onrender.com"}):
            with patch("outing.seoul_page", return_value=([],"test",0)):
                self.assertEqual(self.request(self.data,"https://demo.onrender.com")[0],200)
            with patch("outing.seoul_page") as source:
                self.assertEqual(self.request(self.data,"https://demo.onrender.com.evil.example")[0],403)
            source.assert_not_called()

    def test_server_options(self):
        """배포 포트·주소를 지원하되 명시 옵션이 우선하고 잘못된 포트는 시작 전에 거절한다."""
        with patch.dict("os.environ", {"LAB678_HOST":"0.0.0.0", "PORT":"10000"}):
            args=server_options([])
            self.assertEqual((args.host,args.port),("0.0.0.0",10000))
            args=server_options(["--host","127.0.0.1","--port","0"])
            self.assertEqual((args.host,args.port),("127.0.0.1",0))
        for port in ["abc","-1","65536"]:
            with self.subTest(port=port), patch.dict("os.environ",{"PORT":port}), patch("sys.stderr",io.StringIO()), self.assertRaises(SystemExit):
                server_options([])

    def test_file_voice_disabled(self):
        """파일 음성이 꺼진 서버에서는 버튼을 숨기고 합성 요청도 실행하지 않는다."""
        from local_voice import render_wave
        handler=Preview.__new__(Preview)
        handler.path="/"
        handler.reply=Mock()
        with patch.dict("os.environ",{"LAB678_FILE_VOICE":"off"}), patch("local_voice.subprocess.run") as synth:
            handler.do_GET()
            self.assertIn(b"data-file-voice hidden",handler.reply.call_args.args[1])
            with self.assertRaises(RuntimeError):
                render_wave("음성 검증")
            synth.assert_not_called()

    def test_place_search_contract(self):
        """새 검색 경로에도 입력400·허용origin·공급자 상태 전달을 동일 적용한다."""
        status,body=self.request({"query":""},path="/preview/places")
        self.assertEqual((status,body["code"],body["field"]),(400,"invalid_query","query"))
        with patch.dict("os.environ",{"LAB678_ALLOWED_ORIGINS":"http://127.0.0.1:5173"}), \
                patch("preview.search_places",return_value=(200,dict(status="no_results",places=[]))) as search:
            self.assertEqual(self.request({"query":"검증"},"http://127.0.0.1:5173","/preview/places")[0],200)
            self.assertEqual(search.call_count,1)
            self.assertEqual(self.request({"query":"검증"},"http://other.example","/preview/places")[0],403)
            self.assertEqual(search.call_count,1)
