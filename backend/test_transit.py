"""실제 노선 성공과 구분한 대중교통 어댑터 단위 검증. 가상 수치로 응답/오류 경계를 검사한다."""
import io
import json
import unittest
from unittest.mock import patch
from urllib.error import HTTPError, URLError

from transit import normalize_routes, transit_between


def provider_response():
    """공식 스키마를 따르는 가상 도보·지하철·도보 3구간을 만든다. 시연 데이터가 아니다."""
    return {"status":"OK", "routes":[{"properties":{"totalTime":1800,"totalDistance":7000,"transfers":0,"fare":{"value":1550}},
            "steps":[{"properties":{"type":mode,"guidance":text,"time":seconds,"distance":distance}}
                     for mode,text,seconds,distance in [("WALKING","출발역으로 이동",300,300),
                         ("SUBWAY","가상 1호선: 출발역에서 도착역까지",1200,6400),("WALKING","목적지로 이동",300,300)]]}]}


class TransitTests(unittest.TestCase):
    """비밀값 비노출·단위·미연결·잘못된 좌표·HTTP200 오류·한도를 독립적으로 검사한다."""

    def setUp(self):
        """실제 사용자 위치와 무관한 공개 장소 좌표를 준비한다."""
        self.points = [{"lat":37.5805961,"lng":127.0482573},{"lat":37.57725,"lng":126.99073}]

    def test_normalization(self):
        """초/m/환승/요금 및 미확인 요금을 보존한다."""
        raw = provider_response()
        route = normalize_routes(raw)["routes"][0]
        self.assertEqual((route["duration_s"],route["listed_walk_duration_s"],route["listed_walk_distance_m"]),(1800,600,600))
        self.assertIsNone(route["walk_duration_s"])
        self.assertIsNone(route["walk_distance_m"])
        self.assertEqual(route["fare_won"],1550)
        raw["routes"][0]["properties"]["fare"] = {"min":1500,"max":2000}
        self.assertIsNone(normalize_routes(raw)["routes"][0]["fare_won"])
        self.assertIn("출발시각은 적용되지",normalize_routes(raw)["time_basis"])

    def test_missing_access_walk(self):
        """실응답처럼 지하철만 표시되어도 생략된 접근/마지막 도보를 0으로 확정하지 않는다."""
        raw = provider_response()
        raw["routes"][0]["steps"] = raw["routes"][0]["steps"][1:2]
        route = normalize_routes(raw)["routes"][0]
        self.assertEqual(route["duration_s"],1800)
        self.assertIsNone(route["walk_duration_s"])
        self.assertIsNone(route["listed_walk_duration_s"])
        self.assertIsNone(route["listed_walk_distance_m"])
        self.assertIn("전체 도보량은 확인되지",route["walk_note"])

    def test_bad_payloads(self):
        """음수·누락·잘못된 이동수단·손상된 성공 응답을 정상이 아닌 것으로 처리한다."""
        for field,value in [("totalTime",True),("totalTime",float("nan")),("totalTime",-1),("transfers",1.2)]:
            raw=provider_response(); raw["routes"][0]["properties"][field]=value
            with self.assertRaises(ValueError): normalize_routes(raw)
        raw=provider_response(); raw["routes"][0]["steps"][0]["properties"]["time"]=9999
        with self.assertRaises(ValueError): normalize_routes(raw)
        for raw in [{"status":"INVALID_REQUEST"},{"status":"STARTNODES_NULL"},{"status":"OK","routes":[]}]:
            with self.assertRaises(ValueError): normalize_routes(raw)
        self.assertEqual(normalize_routes({"status":"NO_RESULTS"})["status"],"no_results")

    def test_unconfigured_and_coordinates(self):
        """미설정 시 외부 호출을 하지 않고 입력 누락·중복 좌표는 거절한다."""
        with patch("transit.api_key",return_value=""),patch("transit.urlopen") as request:
            status,body=transit_between(self.points)
            self.assertEqual((status,body["status"]),(503,"unconfigured")); request.assert_not_called()
            for points in [None,[{}],self.points[:1]*2,[{"lat":91,"lng":127},self.points[1]]]:
                with self.assertRaises((ValueError,TypeError)): transit_between(points)

    def test_request_and_provider_errors(self):
        """헤더만 키를 담고 날짜는 보내지 않으며 인증·한도·통신·본문 오류를 구분한다."""
        with patch("transit.api_key",return_value="test-secret"),patch("transit.monotonic",return_value=1e20),patch("transit._last_request",-1):
            with patch("transit.urlopen",return_value=io.BytesIO(json.dumps(provider_response()).encode())) as request:
                status,body=transit_between(self.points)
                self.assertEqual(status,200)
                req=request.call_args.args[0]
                self.assertEqual(req.get_header("Authorization"),"KakaoAK test-secret")
                self.assertNotIn("test-secret",req.full_url)
                self.assertNotIn("test-secret",json.dumps(body))
                self.assertNotIn("start_at",req.full_url)
                self.assertEqual(transit_between(self.points)[0],429)
        for error,expected in [(HTTPError("https://example",401,"hidden",{},None),503),
                               (HTTPError("https://example",403,"hidden",{},None),503),
                               (HTTPError("https://example",429,"hidden",{},None),429),
                               (TimeoutError(),504),(URLError("test-secret"),502)]:
            with patch("transit.api_key",return_value="test-secret"),patch("transit._last_request",-1e20),patch("transit.urlopen",side_effect=error):
                status,body=transit_between(self.points)
                self.assertEqual(status,expected)
                self.assertNotIn("test-secret",str(body))
        with patch("transit.api_key",return_value="test-secret"),patch("transit._last_request",-1e20),patch("transit.urlopen",return_value=io.BytesIO(b'{"status":"INVALID_REQUEST"}')):
            self.assertEqual(transit_between(self.points)[0],502)
