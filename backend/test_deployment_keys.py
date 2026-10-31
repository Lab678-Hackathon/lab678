"""배포 환경변수가 개인 로컬 키 파일보다 우선하는지 가짜 키로 검사한다. 외부 호출/실제 키 조회 없음."""
import unittest
from unittest.mock import patch

from culture_config import culture_key
from naito_chat import settings
from transit import api_key


class DeploymentKeyTests(unittest.TestCase):
    """환경변수 기반 배포와 로컬 개발의 설정 경계를 확인한다."""

    def test_culture_environment_precedence(self):
        """서울시/공공데이터 표준명과 호환명을 환경에서 읽으면 로컬 파일을 열지 않는다."""
        for source, name in [('seoul', 'LAB678_SEOUL_API_KEY'), ('tour', 'LAB678_TOUR_API_KEY'),
                             ('seoul', 'SEOUL_OPENAPI_KEY'), ('tour', 'DATA_GO_KR_SERVICE_KEY')]:
            with self.subTest(name=name), patch.dict('os.environ', {name: 'deployment-test'}, clear=True), \
                    patch('culture_config.Path', side_effect=AssertionError('local file must not be used')):
                self.assertEqual(culture_key(source), 'deployment-test')

    def test_naito_environment_precedence(self):
        """로컬 파일이 존재해도 서버 환경의 Naito 키/모델이 우선한다."""
        with patch.dict('os.environ', {'LAB678_NAITO_API_KEY': 'deployment-test', 'LAB678_NAITO_MODEL': 'deployment-model'}, clear=True), \
                patch('naito_chat.Path.is_file', return_value=True), \
                patch('naito_chat.Path.read_text', return_value='LAB678_NAITO_API_KEY=local-test\nLAB678_NAITO_MODEL=local-model'):
            self.assertEqual(settings(), ('deployment-test', 'deployment-model'))

    def test_explicit_empty_naito_and_culture_disable_local_keys(self):
        """서버에서 명시적으로 비운 공공데이터/Naito 키를 개인 파일로 몰래 대체하지 않는다."""
        with patch.dict('os.environ', {'LAB678_NAITO_API_KEY': '', 'LAB678_TOUR_API_KEY': ''}, clear=True), \
                patch('naito_chat.Path.is_file', return_value=True), \
                patch('naito_chat.Path.read_text', return_value='LAB678_NAITO_API_KEY=local-test\nLAB678_TOUR_API_KEY=local-tour'):
            self.assertEqual(settings()[0], '')
            self.assertEqual(culture_key('tour'), '')

    def test_rest_environment_precedence(self):
        """서버 REST 키가 있으면 개인 파일을 읽지 않는다. 공개 지도 설정과 혼동하지 않는다."""
        with patch.dict('os.environ', {'LAB678_KAKAO_REST_API_KEY': 'deployment-test'}, clear=True), \
                patch('transit.KEY_FILE') as local:
            self.assertEqual(api_key(), 'deployment-test')
            local.is_file.assert_not_called()
