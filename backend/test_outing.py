"""서울시 공개 응답 재생으로 입력·선별·결측·실패를 검사한다."""
import json
import unittest
from unittest.mock import patch

from outing import EXAMPLES, InputError, recommend, validate


class OutingTests(unittest.TestCase):
    """개인 추천의 의미가 바뀌는 경계 사례를 재현한다."""

    def setUp(self):
        """각 사례에 독립적인 청량리역 요청을 준비한다."""
        self.request = json.loads((EXAMPLES / "outing-request.json").read_bytes())

    def test_actual_fields(self):
        """빈 요금, 무료 분류, 명시한 0원, 거리 오름차순을 보존한다."""
        result = recommend(self.request, "recorded")
        events = {item["id"]: item for item in result["candidates"]}
        self.assertEqual((result["searched_count"], result["source_total"]), (5, 8))
        self.assertIsNone(events["seoul:159829"]["price_info"])
        self.assertEqual(events["seoul:159829"]["fee_type"], "무료")
        self.assertEqual(events["seoul:159808"]["price_info"], "0원")
        distances = [item["distance_km"] for item in result["candidates"]]
        self.assertEqual(distances, sorted(distances))
        self.assertTrue(all(item["event_start_date"] <= "2026-10-31" <= item["event_end_date"] for item in events.values()))
        self.assertTrue(all(item["address"] is None for item in events.values()))

    def test_detail_fields_from_source(self):
        """행사 기간·지역은 공급자 원문을 쓰고 장소명을 주소로 바꾸지 않는다."""
        row = json.loads((EXAMPLES / "seoul-events.capture.json").read_bytes())["captures"][0]["rows"][0]
        row.update(STRTDATE="2026-10-01 00:00:00", END_DATE="2026-11-30 00:00:00", GUNAME="테스트구",
                   PRO_TIME="00:00~23:59", CODENAME="전시/미술")
        with patch("outing.seoul_page", return_value=([row],"test",1)):
            event = recommend(self.request)["candidates"][0]
        self.assertEqual((event["event_start_date"],event["event_end_date"],event["district"]),
                         ("2026-10-01","2026-11-30","테스트구"))
        self.assertIsNone(event["address"])
        row.pop("GUNAME")
        with patch("outing.seoul_page", return_value=([row],"test",1)):
            self.assertIsNone(recommend(self.request)["candidates"][0]["district"])

    def test_end_boundary(self):
        """전시 종료 시각에 도착하는 입력은 단순 운영구간에서 제외한다."""
        self.request.update(start_at="2026-10-31T19:00+09:00", end_at="2026-10-31T20:00+09:00")
        events = recommend(self.request, "recorded")["candidates"]
        self.assertNotIn("seoul:159829", [e["id"] for e in events])
        self.assertTrue(all(e["status"] == "check" for e in events))

    def test_minimum_duration_before_source(self):
        """59분과 59분59초는 외부 조회 전에 거절하며 정확히 60분은 허용한다."""
        for kind in ("place", "course", "route"):
            for end in ("14:59:00", "14:59:59"):
                request = dict(self.request, request_kind=kind, start_at="2026-10-31T14:00:00+09:00",
                               end_at="2026-10-31T" + end + "+09:00")
                with patch("outing.seoul_page") as source, self.assertRaises(InputError) as error:
                    recommend(request)
                source.assert_not_called()
                self.assertEqual((error.exception.code, error.exception.field), ("minimum_duration", "end_at"))
            request["end_at"] = "2026-10-31T06:00:00+00:00"
            self.assertEqual((validate(request)[1]-validate(request)[0]).total_seconds(),3600)

    def test_input_error_fields(self):
        """시간 누락·형식·시간대·역전·다음날 및 잘못된 좌표의 필드를 특정한다."""
        for field,value,code in [("start_at",None,"invalid_time"),("end_at","bad","invalid_time"),
                                 ("end_at","2026-10-31T17:00","timezone_required"),
                                 ("end_at",self.request["start_at"],"invalid_time_range"),
                                 ("end_at","2026-11-01T17:00+09:00","invalid_time_range")]:
            with self.subTest(field=field, code=code), self.assertRaises(InputError) as error:
                validate(dict(self.request, **{field:value}))
            self.assertEqual((error.exception.field,error.exception.code),(field,code))
        request = dict(self.request, start_location={"label":"공개 장소","lat":True,"lng":127})
        with self.assertRaises(InputError) as error:
            validate(request)
        self.assertEqual(error.exception.field,"start_location.lat")

    def test_bad_input(self):
        """잘못된 출발 좌표나 종료 시각으로 외부 API를 호출하지 않는다."""
        for lat, end in [(None,self.request["end_at"]), ("NaN",self.request["end_at"]), (37,self.request["start_at"])]:
            with self.subTest(lat=lat), self.assertRaises(ValueError):
                self.request["start_location"]["lat"] = lat
                recommend(dict(self.request, end_at=end))

    def test_empty_and_error(self):
        """실제 후보 0건을 공급자 장애와 구분한다."""
        with patch("outing.seoul_page", return_value=([], "2026-10-31T06:30:00+09:00", 0)):
            self.assertEqual(recommend(self.request)["status"], "no_results")
        with patch("outing.seoul_page", side_effect=OSError("offline")), self.assertRaises(OSError):
            recommend(self.request)

    def test_genre_mismatch(self):
        """국악 조회에 전시가 섞이거나 전시만 반환돼도 국악 외 행사는 제외한다."""
        captures = json.loads((EXAMPLES / "seoul-events.capture.json").read_bytes())["captures"]
        exhibit = captures[0]["rows"][0]
        music = next(row for row in captures[1]["rows"] if row["CODENAME"] == "국악")
        query = dict(self.request, category="국악")
        with patch("outing.seoul_page", return_value=([exhibit, music], "test", 2)):
            self.assertEqual([item["title"] for item in recommend(query)["candidates"]], [music["TITLE"]])
        with patch("outing.seoul_page", return_value=([exhibit], "test", 1)):
            self.assertEqual(recommend(query)["status"], "no_results")

    def test_recording_scope(self):
        """저장하지 않은 분류를 같은 날의 전체 기록으로 대체하지 않는다."""
        with self.assertRaises(ValueError):
            recommend(dict(self.request, category="연극"), "recorded")
