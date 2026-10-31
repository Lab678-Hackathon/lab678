"""국문 TourAPI 문화시설 조회. 상설 장소를 특정 날짜의 공연/전시로 간주하지 않는다."""
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from html import unescape
import json
import re
from threading import BoundedSemaphore
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, unquote, urlsplit
from urllib.request import urlopen

from culture_config import culture_key
from outing import InputError, KST, coordinate, distance_km, validate
from preferences import apply, normalize, known_price

BASE = "https://apis.data.go.kr/B551011/KorService2"
SLOTS = BoundedSemaphore(2)


def call(path, params, key):
    """공식 고정 주소로 호출하며 응답 크기/형식을 제한한다. 원본 URL/키 포함 오류를 반환하지 않는다."""
    query = dict(MobileOS="ETC", MobileApp="LAB678", _type="json", serviceKey=unquote(key), **params)
    with urlopen(BASE + "/" + path + "?" + urlencode(query), timeout=8) as response:
        raw = response.read(1000001)
    if len(raw) > 1000000:
        raise ValueError("TourAPI response too large")
    payload = json.loads(raw)
    response = payload["response"]
    if str(response["header"].get("resultCode")) not in {"00", "0000"}:
        raise ValueError("TourAPI provider error")
    body = response["body"]
    total = int(body.get("totalCount", 0))
    items = body.get("items")
    if items in (None, ""):
        rows = []
    elif isinstance(items, dict):
        rows = items.get("item", [])
        rows = [rows] if isinstance(rows, dict) else rows
    else:
        raise ValueError("TourAPI items malformed")
    if not isinstance(rows, list) or any(not isinstance(row, dict) for row in rows) or total < len(rows) or (total and not rows):
        raise ValueError("TourAPI rows missing")
    return rows, total


def plain(value):
    """공식 응답의 HTML 표기를 평문으로 바꾸고 빈 값은 null로 유지한다."""
    if not isinstance(value, str):
        return None
    text = unescape(re.sub(r"<[^>]*>", " ", value)).strip()
    return text[:2000] or None


def official_link(value):
    """공식 응답이 제공한 홈페이지만 허용한다. ID로 확인하지 않은 상세 URL을 만들어 내지 않는다."""
    if not isinstance(value, str):
        return None
    match = re.search(r'''href\s*=\s*["']([^"']+)["']''', value, re.I)
    link = unescape(match[1] if match else value).strip()
    parsed = urlsplit(link)
    if parsed.scheme in {"http", "https"} and parsed.hostname and not parsed.username and not parsed.password:
        return link
    return None


def normalize_place(row, intro, common, origin, checked):
    """목록/상세 사실만 통합한다. 결측 좌표·운영·요금은 null, 관람 가능 여부는 check다."""
    identity = str(row.get("contentid", ""))
    title = plain(row.get("title"))
    if not identity.isdigit() or not title or str(row.get("contenttypeid")) != "14":
        raise ValueError("TourAPI identity missing")
    for detail in (intro, common):
        if detail and str(detail.get("contentid")) != identity:
            raise ValueError("TourAPI detail ID mismatch")
    try:
        lat, lng = coordinate(row.get("mapy"), 90), coordinate(row.get("mapx"), 180)
        if lat == 0 or lng == 0:
            raise ValueError("TourAPI coordinates missing")
        distance = distance_km(origin[0], origin[1], lat, lng)
    except ValueError:
        lat = lng = distance = None
    fee = plain(intro.get("usefee"))
    fee_type = "무료" if fee in {"무료", "0원"} else None
    amount = known_price(dict(fee_type=fee_type, price_info=fee))
    if amount is not None and amount > 0:
        fee_type = "유료"
    checks = ["상설 문화시설 정보 · 해당 날짜의 행사 개최 여부 미확인", "운영일·휴관·예약·실제 이동시간 확인"]
    if not intro:
        checks.append("소개 상세정보 없음")
    if lat is None:
        checks.append("지도 좌표 확인")
    return dict(id="tour:" + identity, title=title, venue=title, lat=lat, lng=lng, distance_km=distance,
                address=" ".join(filter(None, [plain(row.get("addr1")), plain(row.get("addr2"))])) or None,
                district=None, genre="문화시설", candidate_kind="cultural_facility", source="tourapi_kor",
                event_start_date=None, event_end_date=None, fixed_start_at=None,
                official_url=official_link(common.get("homepage")), opening_info=plain(intro.get("usetimeculture")),
                closed_info=plain(intro.get("restdateculture")), price_info=fee, fee_type=fee_type, audience=None,
                status="check", checks_required=checks, source_checked_at=checked)


def culture_places(data):
    """선택적 문화시설 API. 키 없음503/조회 실패502/정상0건을 구분하며 행사 추천에 몰래 혼합하지 않는다."""
    _, _, lat, lng = validate(data)
    if data.get("mode", "live") != "live":
        raise InputError("culture_mode", "mode", "문화시설은 현재 실시간 조회만 지원합니다. 기록 데이터로 표시하지 않습니다.")
    options = normalize(data)
    if data.get("request_kind") != "place" or options.get("categories", [data["category"]]) != ["전체"]:
        raise InputError("culture_scope", "category", "상설 문화시설 조회는 전체 분류의 장소 찾기만 지원합니다. 공연·전시 개최 여부는 별도 확인이 필요해요.")
    radius = data.get("radius_m", 3000)
    if type(radius) is not int or not 100 <= radius <= 20000:
        raise InputError("invalid_radius", "radius_m", "검색 반경은 100~20000m로 입력해 주세요.")
    key = culture_key("tour")
    if not key:
        return 503, dict(status="unconfigured", code="tour_not_configured", message="국문 문화시설 조회 키 설정이 필요합니다.")
    if not SLOTS.acquire(blocking=False):
        return 429, dict(status="busy", code="culture_busy", message="문화시설 조회 중입니다. 잠시 뒤 다시 시도해 주세요.")
    try:
        rows, total = call("locationBasedList2", dict(mapX=lng, mapY=lat, radius=radius, contentTypeId=14,
                                                     numOfRows=3, pageNo=1, arrange="E"), key)
        checked = datetime.now(KST).isoformat(timespec="seconds")
        def details(row):
            """동일 ID의 소개/홈페이지를 가져온다. 상세 호출 실패를 값 없음으로 숨기지 않는다."""
            identity = str(row.get("contentid", ""))
            if not identity.isdigit():
                raise ValueError("TourAPI ID invalid")
            intro, _ = call("detailIntro2", dict(contentId=identity, contentTypeId=14), key)
            common, _ = call("detailCommon2", dict(contentId=identity), key)
            return normalize_place(row, intro[0] if intro else {}, common[0] if common else {}, (lat, lng), checked)
        with ThreadPoolExecutor(max_workers=3) as pool:
            candidates = list(pool.map(details, rows[:3]))
        candidates = list({c["id"]: c for c in candidates}.values())
        candidates, assessment = apply(candidates, options)
        return 200, dict(status="ready" if candidates else "no_results", mode="live", source="tourapi_kor",
                         source_checked_at=checked, source_total=total, searched_count=min(3, len(rows)),
                         candidates=candidates, applied_preferences=options, radius_m=radius,
                         coverage_note="출발지 반경 내 문화시설 최대3곳입니다. 특정 날짜의 공연·전시 추천이나 영업 여부 보장이 아닙니다.", **assessment)
    except HTTPError as exc:
        status = 429 if exc.code == 429 else 502
        exc.close()
        return status, dict(status="error", code="tour_provider_error", message="문화시설 제공기관의 조회 권한 또는 응답을 확인해 주세요.")
    except TimeoutError:
        return 504, dict(status="error", code="tour_timeout", message="문화시설 응답이 늦습니다. 같은 조건으로 다시 시도해 주세요.")
    except (URLError, OSError, ValueError, TypeError, KeyError, AttributeError):
        return 502, dict(status="error", code="tour_lookup_failed", message="문화시설 정보를 확인하지 못했습니다. 기존 조건을 유지해 주세요.")
    finally:
        SLOTS.release()
