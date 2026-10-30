"""서울시 공개 응답 재생으로 입력·선별·결측·실패를 검사한다."""
import json
import unittest
from unittest.mock import patch

from outing import EXAMPLES, recommend


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

    def test_end_boundary(self):
        """전시 종료 시각에 도착하는 입력은 단순 운영구간에서 제외한다."""
        self.request.update(start_at="2026-10-31T19:00+09:00", end_at="2026-10-31T20:00+09:00")
        events = recommend(self.request, "recorded")["candidates"]
        self.assertNotIn("seoul:159829", [e["id"] for e in events])
        self.assertTrue(all(e["status"] == "check" for e in events))

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

    def test_recording_scope(self):
        """저장하지 않은 분류를 같은 날의 전체 기록으로 대체하지 않는다."""
        with self.assertRaises(ValueError):
            recommend(dict(self.request, category="연극"), "recorded")
