"""장소/주소 검색의 입력·좌표·실제0건·공급자 장애·비밀값 노출 방지 회귀."""
import io
import json
import unittest
from urllib.error import HTTPError, URLError
from unittest.mock import patch

from outing import InputError
from places import normalize_places, search_places


class PlaceSearchTests(unittest.TestCase):
    """외부 조회를 대체한 경계 검사다. 실제 키 호출은 별도 브라우저 검사로 수행한다."""

    def fixture(self, **changes):
        """공개 장소를 뜻하지 않는 모의 공급자 문서를 만든다."""
        return dict(id="123",place_name="검증 장소",address_name="검증 주소",road_address_name="",
                    x="127.04",y="37.58",place_url="https://place.map.kakao.com/123",**changes)

    def test_inputs_before_network(self):
        """공백·길이초과·제어문자·잘못된 종류를 키 조회/외부 호출 전에 거절한다."""
        for data in [{}, {"query":" "}, {"query":"가"*81}, {"query":"a\nb"},
                     {"query":True}, {"query":"청량리","type":"unknown"}]:
            with self.subTest(data=data), patch("places.api_key") as key, self.assertRaises(InputError):
                search_places(data)
            key.assert_not_called()

    def test_keyword_coordinates_and_null(self):
        """x/y를 올바른 축으로 변환하고 공란 주소·출처 URL을 임의 보완하지 않는다."""
        item=self.fixture();item["place_url"]="javascript:alert(1)"
        result=normalize_places(dict(meta=dict(total_count=1),documents=[item]),"keyword")
        place=result["places"][0]
        self.assertEqual((place["lat"],place["lng"]),(37.58,127.04))
        self.assertIsNone(place["road_address"])
        self.assertIsNone(place["official_url"])
        self.assertEqual(place["id"],"kakao:keyword:123")

    def test_address_id_and_coordinates(self):
        """주소 결과는 공급자 주소·좌표를 보존하고 재조회에도 같은 파생 식별자를 만든다."""
        body=dict(meta=dict(total_count=1),documents=[dict(address_name="검증 주소",x="127.04",y="37.58",road_address=None)])
        first=normalize_places(body,"address")["places"][0]
        self.assertEqual(first,normalize_places(body,"address")["places"][0])
        self.assertEqual(first["label"],"검증 주소")
        self.assertIsNone(first["road_address"])
        self.assertIsNone(first["official_url"])

    def test_empty_vs_invalid_source(self):
        """정상0건과 좌표 손상·목록 누락을 구분하며 일부 손상 행은 별도 집계한다."""
        self.assertEqual(normalize_places(dict(meta=dict(total_count=0),documents=[]),"keyword")["status"],"no_results")
        bad=self.fixture();bad["x"]="nan"
        with self.assertRaises(ValueError):
            normalize_places(dict(meta=dict(total_count=1),documents=[bad]),"keyword")
        result=normalize_places(dict(meta=dict(total_count=2),documents=[bad,self.fixture()]),"keyword")
        self.assertEqual((len(result["places"]),result["skipped_count"]),(1,1))
        with self.assertRaises(ValueError):
            normalize_places(dict(meta=dict(total_count=1),documents=[]),"keyword")

    def test_provider_request(self):
        """키는 헤더에만 두고 검색어는 URL 인코딩하며 최대5건을 요청한다."""
        raw=json.dumps(dict(meta=dict(total_count=1),documents=[self.fixture()])).encode()
        with patch("places.api_key",return_value="private-secret"), patch("places.urlopen",return_value=io.BytesIO(raw)) as call:
            status,body=search_places(dict(query="서울 & 역"))
        self.assertEqual(status,200)
        request=call.call_args.args[0]
        self.assertIn("size=5",request.full_url)
        self.assertNotIn("private-secret",request.full_url+str(body))
        self.assertEqual(request.get_header("Authorization"),"KakaoAK private-secret")

    def test_missing_key(self):
        """키 미설정을 정상0건으로 반환하거나 외부 조회하지 않는다."""
        with patch("places.api_key",return_value=""), patch("places.urlopen") as call:
            status,body=search_places(dict(query="검증"))
        self.assertEqual((status,body["status"]),(503,"unconfigured"))
        call.assert_not_called()

    def test_failures(self):
        """권한·쿼터·시간초과·손상 응답의 공개 오류만 반환하며 공급자 상세는 숨긴다."""
        for error,expected in [(HTTPError("https://private",403,"private-secret",{},io.BytesIO()),503),
                               (HTTPError("https://private",429,"private-secret",{},io.BytesIO()),429),
                               (TimeoutError("private-secret"),504),(URLError(TimeoutError()),504),
                               (URLError("private-secret"),502)]:
            with self.subTest(expected=expected), patch("places.api_key",return_value="key"), patch("places.urlopen",side_effect=error):
                status,body=search_places(dict(query="검증"))
            self.assertEqual(status,expected)
            self.assertNotIn("private",str(body))
        with patch("places.api_key",return_value="key"), patch("places.urlopen",return_value=io.BytesIO(b"invalid")):
            self.assertEqual(search_places(dict(query="검증"))[0],502)
