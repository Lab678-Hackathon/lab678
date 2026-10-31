"""지도 표시용 공개 JavaScript 키만 읽는다. 서버 REST 키와 설정 파일은 공개하지 않는다."""
import os
import re
from pathlib import Path

KEY_FILE = Path(__file__).resolve().parents[1] / ".local" / "map.env"


def map_config():
    """환경변수 우선으로 JS 키를 반환한다. 미설정은 기존 지도를 유지하며 값은 로그하지 않는다."""
    name = "LAB678_KAKAO_JAVASCRIPT_KEY"
    key = os.environ.get(name, "").strip()
    if not key and KEY_FILE.is_file():
        for line in KEY_FILE.read_text(encoding="utf-8-sig").splitlines():
            field, separator, value = line.partition("=")
            if separator and field.strip() == name:
                key = value.strip()
                break
    if not re.fullmatch(r"[0-9a-fA-F]{32}", key):
        return dict(provider="leaflet", javascript_key="")
    return dict(provider="kakao", javascript_key=key)
