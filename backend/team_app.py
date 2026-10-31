"""검증한 로컬 팀 프론트를 /app/에서 제공한다. 선택 파일·비밀값·저장소 전체를 공개하지 않는다."""
import json
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
ACTIVE_FILE = ROOT / ".local/active-team-frontend.json"
TYPES = {".html":"text/html", ".js":"text/javascript", ".css":"text/css", ".svg":"image/svg+xml",
         ".png":"image/png", ".jpg":"image/jpeg", ".jpeg":"image/jpeg", ".webp":"image/webp", ".ico":"image/x-icon"}


def app_directory():
    """.local의 인계 패키지 frontend만 선택한다. 미설정/손상은 경로 노출 없이 미연결로 처리한다."""
    try:
        setting = json.loads(ACTIVE_FILE.read_text(encoding="utf-8"))
        name = setting.get("directory")
        if not isinstance(name, str) or Path(name).is_absolute():
            return None
        directory = (ROOT / name).resolve()
        local = (ROOT / ".local").resolve()
        if not local.is_relative_to(ROOT.resolve()) or not directory.is_relative_to(local):
            return None
        if directory.name != "frontend" or directory.parent.name != "project" or not directory.parent.parent.name.startswith("chat-handoff-"):
            return None
        if (directory / "index.html").is_file():
            return directory
    except (OSError, ValueError, TypeError, AttributeError):
        pass
    return None


def app_asset(url):
    """현재 /app/ 요청의 제한된 정적 자산을 반환한다. 경로이탈/비밀파일/과대 파일은 거절한다."""
    directory = app_directory()
    path = unquote(urlsplit(url).path)
    if directory is None or not path.startswith("/app/") or "\\" in path or "\x00" in path:
        return None
    relative = path[len("/app/"):] or "index.html"
    if ".." in Path(relative).parts:
        return None
    try:
        target = (directory / relative).resolve()
        content_type = TYPES.get(target.suffix.lower())
        if not target.is_relative_to(directory) or not content_type or not target.is_file() or target.stat().st_size > 5000000:
            return None
        return target.read_bytes(), content_type
    except (OSError, ValueError):
        return None
