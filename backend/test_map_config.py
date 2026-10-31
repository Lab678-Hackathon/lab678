"""지도 공개 설정이 JS 키만 노출하고 서버 키·잘못된 입력을 배제하는지 검증한다."""
import unittest
from unittest.mock import Mock, patch

from map_config import map_config


class MapConfigTests(unittest.TestCase):
    """실제 로컬 키를 읽지 않고 환경·파일 우선순위와 공개 범위를 점검한다."""

    def test_key_priority_and_public_scope(self):
        """환경변수의 JS 키만 공개하고 REST 키나 로컬 파일은 조회하지 않는다."""
        with patch.dict("os.environ", {"LAB678_KAKAO_JAVASCRIPT_KEY":"a"*32,
                                      "LAB678_KAKAO_REST_API_KEY":"private"}, clear=True), patch("map_config.KEY_FILE") as file:
            self.assertEqual(map_config(),dict(provider="kakao",javascript_key="a"*32))
            file.is_file.assert_not_called()

    def test_file_or_missing_key(self):
        """BOM 허용 파일의 정확한 변수만 읽고 미설정·부적절한 값은 기본 지도로 남긴다."""
        for value,expected in [("b"*32,"kakao"),("","leaflet"),("<script>","leaflet")]:
            file=Mock()
            file.is_file.return_value=True
            file.read_text.return_value="LAB678_KAKAO_REST_API_KEY=private\nLAB678_KAKAO_JAVASCRIPT_KEY="+value
            with self.subTest(value=expected), patch.dict("os.environ",{},clear=True), patch("map_config.KEY_FILE",file):
                config=map_config()
            self.assertEqual(config["provider"],expected)
            self.assertNotIn("private",str(config))
