"""같은 서버 앱 서빙의 경로 제한·미설정·정적 자산만 검사한다. 외부 API를 호출하지 않는다."""
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import team_app


class TeamAppTests(unittest.TestCase):
    """선택한 검증 복사본 외 파일을 요청할 수 없도록 경계를 검사한다."""

    def setUp(self):
        """별도 임시 저장소에 공개 자산과 비밀 파일을 분리해 만든다."""
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.front = self.root / ".local/chat-handoff-test/project/frontend"
        self.front.mkdir(parents=True)
        (self.front / "index.html").write_text("<h1>test</h1>", encoding="utf-8")
        (self.front / "app.js").write_text("export const ready=true", encoding="utf-8")
        (self.front / ".env").write_text("private", encoding="utf-8")
        self.config = self.root / ".local/active-team-frontend.json"
        self.config.write_text(json.dumps(dict(directory=self.front.relative_to(self.root).as_posix())), encoding="utf-8")
        self.addCleanup(patch.stopall)
        patch.object(team_app, "ROOT", self.root).start()
        patch.object(team_app, "ACTIVE_FILE", self.config).start()

    def test_valid_assets(self):
        """아래 경로의 index/JS와 query만 허용한다."""
        self.assertEqual(team_app.app_directory(), self.front.resolve())
        self.assertEqual(team_app.app_asset("/app/?debug=1")[1], "text/html")
        self.assertEqual(team_app.app_asset("/app/app.js?v=1")[1], "text/javascript")

    def test_traversal_and_private_files(self):
        """퍼센트 인코딩·절대/역슬래시 경로와 비밀 확장자 요청은 거절한다."""
        for url in ["/app/../index.html", "/app/%2e%2e/index.html", "/app//outside.html", "/app/a\\..\\index.html", "/app/.env", "/app/missing.js", "/other/app.js"]:
            with self.subTest(url=url):
                self.assertIsNone(team_app.app_asset(url))

    def test_bad_selection(self):
        """미설정/손상/외부 폴더 설정은 모두 미연결이다."""
        for data in ["broken", "[]", json.dumps(dict(directory=str(self.front.resolve()))), json.dumps(dict(directory="../outside")), json.dumps(dict(directory="backend"))]:
            self.config.write_text(data, encoding="utf-8")
            self.assertIsNone(team_app.app_directory())
        self.config.unlink()
        self.assertIsNone(team_app.app_asset("/app/"))


if __name__ == "__main__":
    unittest.main()
