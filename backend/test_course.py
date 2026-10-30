"""두 곳 도보 일정의 마감 경계·휴관 원문·결측·방문 순서를 검사한다."""
import unittest
from unittest.mock import patch
from datetime import datetime

from course import build_course, schedule_pair


class CourseTests(unittest.TestCase):
    """전시와 고정 공연이 있는 당일 요청을 독립적으로 검증한다."""

    def setUp(self):
        """한국 시각 한 시간과 20분씩 관람할 수 있는 두 전시를 준비한다."""
        self.start = datetime.fromisoformat("2026-10-31T14:00+09:00")
        self.end = self.start.replace(hour=15)
        self.events = [dict(id=str(i), title=str(i), venue=str(i), lat=37+i/100, lng=127,
                            genre="전시/미술", opening_info="14:00~15:00") for i in (1, 2)]
        self.data = dict(request_kind="course", category="전시", start_at=self.start.isoformat(),
                         end_at=self.end.isoformat(), start_location=dict(lat=37,lng=127,label="역"), stay_minutes=20)

    def test_boundary(self):
        """도보 두 구간과 관람이 마감에 딱 맞으면 허용하고 1초 초과하면 제외한다."""
        self.assertEqual(schedule_pair(self.events, [600,600], self.start,self.end,20)["status"], "ready")
        self.assertEqual(schedule_pair(self.events, [600,601], self.start,self.end,20)["status"], "conflict")

    def test_unknown_and_wait(self):
        """공연 시작 전 대기는 포함하고 종료 미상 또는 휴관 조건 미상은 확정하지 않는다."""
        self.events[1].update(genre="국악",opening_info="14:40",fixed_start_at=self.start.replace(minute=40).isoformat())
        self.assertEqual(schedule_pair(self.events, [60,60], self.start,self.end,20)["status"], "check")
        self.events[1].update(opening_info="14:40~15:00")
        result = schedule_pair(self.events, [60,60], self.start,self.end,20)
        self.assertEqual(result["stops"][1]["begin"], "14:40")
        self.events[0]["opening_info"] += ", 공휴일 휴관"
        self.assertEqual(schedule_pair(self.events, [60,60], self.start,self.end,20)["status"], "check")

    def test_order_and_missing_routes(self):
        """순서를 바꿔 가능한 일정만 선택하고 누락된 구간은 이동 0초로 쓰지 않는다."""
        matrix = [[None,60],[0,200],[200,0]]
        with patch("course.query_walking", return_value=(200, {"sources_to_targets":{"durations":matrix}})):
            self.assertEqual(build_course(self.data,self.events)["ids"], ["2","1"])
            matrix[2][0] = None
            self.assertEqual(build_course(self.data,self.events)["status"], "check")
            matrix.pop()
            self.assertEqual(build_course(self.data,self.events)["status"], "unavailable")
            self.assertEqual(build_course(dict(self.data,exclude_ids=["2"]),self.events)["status"], "insufficient")
