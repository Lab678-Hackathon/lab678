"""문화정보 키를 서버 환경/무시된 로컬 파일에서 읽는다. 비밀값을 응답·로그에 내보내지 않는다."""
import os
from pathlib import Path


def culture_key(source):
    """seoul/tour 키를 읽는다. 명시 환경값이 로컬 파일보다 우선하며 미설정은 빈 문자열이다."""
    names = {"seoul": ("LAB678_SEOUL_API_KEY", "SEOUL_OPENAPI_KEY"),
             "tour": ("LAB678_TOUR_API_KEY", "DATA_GO_KR_SERVICE_KEY")}[source]
    for name in names:
        if name in os.environ:
            return os.environ[name].strip()
    path = Path(__file__).resolve().parents[1] / ".local/culture.env"
    if not path.is_file():
        return ""
    values = {}
    for line in path.read_text(encoding="utf-8-sig").splitlines():
        if "=" in line and not line.lstrip().startswith("#"):
            key, value = line.split("=", 1)
            values[key.strip()] = value.strip()
    return next((values[name] for name in names if values.get(name)), "")
