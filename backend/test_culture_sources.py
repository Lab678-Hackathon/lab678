"""문화정보 키/조회 범위와 국문 장소의 사실·오류 경계를 모의 응답으로 검사한다."""
import io
import json
import unittest
from unittest.mock import patch
from urllib.error import HTTPError
from urllib.parse import parse_qs, urlsplit

from outing import EXAMPLES, InputError, seoul_page
from tour_places import call, culture_places, normalize_place, official_link


class CultureSourceTests(unittest.TestCase):
    """실제 키 없이 가능한 공급자 계약 회귀. 실서비스 성공과 구분한다."""

    def setUp(self):
        """공개 위치의 시험 입력과 가상 문화시설 응답을 준비한다."""
        self.request = json.loads((EXAMPLES / "outing-request.json").read_bytes())
        self.request.update(category="전체", mode="live")
        self.row = dict(contentid="123", contenttypeid="14", title="검증용 박물관", mapx="127.05", mapy="37.58", addr1="검증용 주소")

    def response(self, rows, code="0000", total=None):
        """공식 response/header/body 형태를 생성한다. 실제 행사 데이터가 아니다."""
        return {"response": {"header": {"resultCode": code}, "body": {"totalCount": len(rows) if total is None else total,
                         "items": {"item": rows} if rows else ""}}}

    def test_seoul_authenticated_and_sample_limits(self):
        """정식 키100건·미설정sample5건을 구분하며 입력 키를 경로 구분자로 해석하지 않는다."""
        payload = {"culturalEventInfo": {"RESULT": {"CODE": "INFO-000"}, "row": [], "list_total_count": 0}}
        for key, segment in [("", "/sample/json/culturalEventInfo/1/5/"), ("secret/key", "/secret%2Fkey/json/culturalEventInfo/1/100/")]:
            with patch("outing.culture_key", return_value=key), patch("outing.urlopen", return_value=io.BytesIO(json.dumps(payload).encode())) as network:
                self.assertEqual(seoul_page("2026-10-31", "전시", "live")[2], 0)
                self.assertIn(segment, network.call_args.args[0])

    def test_seoul_auth_failure_no_sample_retry(self):
        """유효하지 않은 정식 키를 sample 성공으로 숨기지 않는다."""
        payload = {"RESULT": {"CODE": "ERROR-300"}}
        with patch("outing.culture_key", return_value="configured"), patch("outing.urlopen", return_value=io.BytesIO(json.dumps(payload).encode())) as network:
            with self.assertRaises(RuntimeError):
                seoul_page("2026-10-31", "전체", "live")
            self.assertEqual(network.call_count, 1)

    def test_tour_request_encoding_and_axis(self):
        """국문 고정 주소·경도X/위도Y·인코딩키 1회 변환을 검사한다."""
        with patch("tour_places.urlopen", return_value=io.BytesIO(json.dumps(self.response([])).encode())) as network:
            self.assertEqual(call("locationBasedList2", {"mapX":127.05, "mapY":37.58}, "abc%2Bdef%3D"), ([], 0))
        url = urlsplit(network.call_args.args[0]); query = parse_qs(url.query)
        self.assertEqual(url.hostname, "apis.data.go.kr")
        self.assertIn("KorService2", url.path)
        self.assertEqual(query["serviceKey"], ["abc+def="])
        self.assertEqual((query["mapX"], query["mapY"]), (["127.05"], ["37.58"]))

    def test_tour_zero_vs_malformed(self):
        """0건은 정상이며 누락 목록/오류코드/XML은 정상 빈 결과가 아니다."""
        for payload in [self.response([], total=2), self.response([], code="30"), {"response": {}}]:
            with patch("tour_places.urlopen", return_value=io.BytesIO(json.dumps(payload).encode())), self.assertRaises((ValueError, KeyError)):
                call("locationBasedList2", {}, "key")

    def test_facility_facts_and_unknowns(self):
        """상설 장소에 행사 날짜/가격/공연 시작을 만들어 넣지 않는다."""
        candidate = normalize_place(self.row, {}, {}, (37.58,127.04), "test")
        self.assertEqual(candidate["id"], "tour:123")
        self.assertEqual(candidate["candidate_kind"], "cultural_facility")
        for key in ("opening_info", "price_info", "fee_type", "official_url", "event_start_date", "fixed_start_at"):
            self.assertIsNone(candidate[key])
        self.assertEqual(candidate["lat"], 37.58)
        self.assertEqual(candidate["lng"], 127.05)

    def test_detail_identity_and_html(self):
        """상세 ID 불일치를 거절하고 공식 텍스트/링크만 정규화한다."""
        with self.assertRaises(ValueError):
            normalize_place(self.row, {"contentid":"999"}, {}, (37,127), "test")
        intro = dict(contentid="123", usetimeculture="10:00<br>18:00", usefee="무료", restdateculture="월요일")
        candidate = normalize_place(self.row, intro, {"contentid":"123", "homepage":'<a href="https://example.org/museum">공식</a>'}, (37,127), "test")
        self.assertEqual(candidate["opening_info"], "10:00 18:00")
        self.assertEqual(candidate["official_url"], "https://example.org/museum")
        self.assertEqual(candidate["fee_type"], "무료")
        self.assertEqual(candidate["closed_info"], "월요일")

    def test_homepage_with_provider_annotation(self):
        """실제 응답의 홈페이지 뒤 SNS 안내는 제외하고 잘못된 링크는 null로 둔다."""
        self.assertEqual(official_link("https://www.l4d.or.kr/bfl/index.do\n인스타그램 @baebongsanforest"),
                         "https://www.l4d.or.kr/bfl/index.do")
        self.assertEqual(official_link('<a href="https://example.org/?a=1&amp;b=2">공식</a>'),
                         "https://example.org/?a=1&b=2")
        for value in ('<a href="https://example.org/\nlabel">공식</a>', 'https://[invalid',
                      'javascript:alert(1)', 'https://user:password@example.org', '홈페이지 미제공'):
            self.assertIsNone(official_link(value))

    def test_scope_and_missing_key_before_network(self):
        """공연/코스/기록/잘못된반경 요청은 거절하고 키없음은503이다."""
        with patch("tour_places.culture_key", return_value=""), patch("tour_places.call") as network:
            self.assertEqual(culture_places(self.request)[0], 503)
            for changes in [dict(category="국악"), dict(request_kind="course"), dict(mode="recorded"), dict(radius_m=True)]:
                with self.assertRaises(InputError):
                    culture_places(dict(self.request, **changes))
            network.assert_not_called()

    def test_full_facility_lookup_budget_and_secrets(self):
        """목록→소개→공통 상세를 연결하고 무료 조건·비밀값 비노출을 확인한다."""
        def source(path, params, key):
            """세 고정 API의 모의 응답을 반환한다."""
            if path == "locationBasedList2":
                return [self.row], 1
            if path == "detailIntro2":
                return [dict(contentid="123", usefee="무료", usetimeculture="09:00~18:00")], 1
            return [dict(contentid="123", homepage="https://example.org")], 1
        with patch("tour_places.culture_key", return_value="secret-value"), patch("tour_places.call", side_effect=source):
            status, body = culture_places(dict(self.request, free_only=True))
        self.assertEqual(status, 200)
        self.assertEqual(len(body["candidates"]), 1)
        self.assertNotIn("secret-value", json.dumps(body))

    def test_source_failure_not_empty_or_partial_success(self):
        """실패·권한거절·제한을0건으로 바꾸지 않고 URL에 있는 키를 오류로 내보내지 않는다."""
        for error, status in [(ValueError("key=secret-value"),502), (TimeoutError(),504),
                              (HTTPError("https://example.org?key=secret-value",403,"secret-value",{},io.BytesIO()),502)]:
            with patch("tour_places.culture_key", return_value="secret-value"), patch("tour_places.call", side_effect=error):
                actual, body = culture_places(self.request)
            self.assertEqual(actual, status)
            self.assertNotIn("secret-value", json.dumps(body))


if __name__ == "__main__":
    unittest.main()
