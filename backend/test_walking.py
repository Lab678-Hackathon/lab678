"""한국어 경로 단계와 지도 좌표가 같은 응답을 사용하는지 검증한다."""
import copy
import unittest
from unittest.mock import patch

from walking import decode_shape, walk_between


class WalkingTests(unittest.TestCase):
    """경로선 정밀도와 손상된 단계 응답을 검증한다."""

    def setUp(self):
        """두 지점과 짧은 공급자 응답을 독립적으로 준비한다."""
        self.points = [dict(lat=37.58,lng=127.04),dict(lat=37.60,lng=126.97)]
        self.trip = dict(status=0, units="kilometers", language="ko-KR",
                         summary=dict(time=60,length=0.05),
                         legs=[dict(shape="????", maneuvers=[dict(instruction="왼쪽으로 이동",
                            length=0.05,begin_shape_index=0,end_shape_index=1)])])

    def test_polyline_precision(self):
        """공개 polyline 예제의 정수 값을 백만분의 일 도 단위로 해독한다."""
        self.assertEqual(decode_shape("_p~iF~ps|U_ulLnnqC_mqNvxq`@"),
                         [[3.85,-12.02],[4.07,-12.095],[4.3252,-12.6453]])
        for shape in ["", "?", "????~", "!!!!"]:
            with self.subTest(shape=shape), self.assertRaises(ValueError):
                decode_shape(shape)

    def test_detail_and_summary(self):
        """기존 요약 응답을 유지하고 상세 요청에만 단계와 경로선을 추가한다."""
        with patch("walking.query_walking", return_value=(200,dict(trip=self.trip))):
            status, result = walk_between(self.points, True)
            self.assertEqual(status, 200)
            self.assertEqual(result["steps"][0]["instruction"], "왼쪽으로 이동")
            self.assertEqual(result["steps"][0]["distance_m"], 50)
            self.assertEqual(result["path"], [[0,0],[0,0]])
            self.assertNotIn("steps", walk_between(self.points)[1])

    def test_bad_steps(self):
        """지도 밖 단계나 영어 대체 응답을 한국어 안내 성공으로 표시하지 않는다."""
        for language, end in [("en-US",1),("ko-KR",9)]:
            trip = copy.deepcopy(self.trip)
            trip["language"] = language
            trip["legs"][0]["maneuvers"][0]["end_shape_index"] = end
            with patch("walking.query_walking", return_value=(200,dict(trip=trip))):
                self.assertEqual(walk_between(self.points, True)[0], 502)
