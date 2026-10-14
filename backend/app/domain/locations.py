"""시작 좌표 해석 (A2).

우선순위: 요청에 실제 좌표(현재위치) > 대표 시작점(FR-A5) 하드코딩 좌표 > 도심 기본값.
임의 자유텍스트의 정밀 지오코딩은 이후 슬라이스(보조 소스)에서 보강한다.
좌표를 추정으로 지어내지 않되, MVP 우선 지역(서울 도심 문화권)에서 조회가
성립하도록 알려진 대표 좌표만 매핑한다.
"""

from __future__ import annotations

from app.models.recommend import StartLocation

# 대표 시작점 가젯티어 — 프론트 'Start from' 시트 프리셋(frontend/js/components/location-sheet.js
# POPULAR)과 **동일한 목록을 미러링**한다. 프리셋을 고르면 좌표가 함께 전송돼 이 표가 필요 없지만,
# 좌표 없이 라벨/프롬프트로만 위치가 들어오는 경로(챗 프롬프트의 지명·검색 자유입력)에서는 이 표로
# 해석한다. A·B 가 같은 표를 쓰므로 둘의 위치 매칭이 일치해야 한다(불일치 시 종각 디폴트로 빠짐).
# 값은 공개 랜드마크 좌표(lat, lng). substring 매칭이라 짧은 핵심 키를 함께 둔다.
_QUICK_COORDS: dict[str, tuple[float, float]] = {
    "gyeongbokgung": (37.5796, 126.9770),
    "gwanghwamun": (37.5724, 126.9769),
    "anguk": (37.5742, 126.9858),
    "insadong": (37.5740, 126.9850),
    "bukchon": (37.5826, 126.9850),
    "jonggak": (37.5703, 126.9830),
    "jongmyo": (37.5745, 126.9941),
    "city hall": (37.5663, 126.9779),
    "deoksugung": (37.5658, 126.9751),
    "myeongdong": (37.5637, 126.9850),
    "namsangol": (37.5593, 126.9942),
    "ddp": (37.5663, 127.0090),
    "dongdaemun": (37.5663, 127.0090),
    "daehangno": (37.5820, 127.0020),  # 대학로 소극장 밀집(연극·공연 테스트)
    "hyehwa": (37.5820, 127.0020),
}

# 서울 도심 문화권 기본 중심(광화문/종로 근처). 라벨 매칭 실패 시 폴백.
_DEFAULT = (37.5700, 126.9830)


def resolve_start_coords(loc: StartLocation) -> tuple[float, float]:
    if loc.lat is not None and loc.lng is not None:
        return loc.lat, loc.lng
    key = (loc.label or "").strip().lower()
    for name, coords in _QUICK_COORDS.items():
        if name in key:
            return coords
    return _DEFAULT


def detect_location_in_text(text: str | None) -> StartLocation | None:
    """자유 텍스트에서 '알려진 대표 지명'을 감지해 StartLocation 으로 반환(없으면 None).

    사용자가 프롬프트에 직접 밝힌 위치(예: "I am at Myeongdong")를 앱 default 보다 우선
    적용하기 위한 결정론 조회 — LLM 생성이 아니라 _QUICK_COORDS 테이블 매칭이다. 좌표를
    지어내지 않으며, 테이블에 없는 임의 지명은 None(앱 컨텍스트/기본값으로 폴백, 정밀
    지오코딩은 이후 슬라이스). 가장 긴 이름부터 매칭해 부분일치 오인을 줄인다.
    """
    if not text:
        return None
    low = text.lower()
    for name in sorted(_QUICK_COORDS, key=len, reverse=True):
        if name in low:
            lat, lng = _QUICK_COORDS[name]
            return StartLocation(label=name.title(), lat=lat, lng=lng)
    return None
