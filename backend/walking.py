"""개인 점검 화면에서 선택한 행사장 두 곳의 Valhalla 보행 경로를 조회한다."""
import json
import math
from datetime import datetime, timezone
from threading import Lock
from time import monotonic, sleep
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from outing import coordinate

_gate = Lock()
_last_request = -math.inf


def query_walking(action, data):
    """개인 화면의 도보 조회 간격을 제한하고 공급자의 JSON 또는 실패 상태를 반환한다."""
    global _last_request
    if not _gate.acquire(blocking=False):
        return 429, dict(message="다른 도보 조회가 진행 중이에요. 잠시 후 다시 조회해 주세요.")
    try:
        delay = 1.1 - (monotonic() - _last_request)
        if delay > 0 and action == "sources_to_targets":
            sleep(delay)
        elif delay > 0:
            return 429, dict(message="잠시 후 다시 조회해 주세요.")
        _last_request = monotonic()
    finally:
        _gate.release()
    req = Request("https://valhalla1.openstreetmap.de/" + action, data=json.dumps(data).encode(),
                  headers={"Content-Type": "application/json", "X-Client-Id": "lab678-local-preview",
                           "User-Agent": "LAB678-local-preview/1.0"})
    try:
        with urlopen(req, timeout=10) as response:
            return 200, json.load(response)
    except HTTPError as exc:
        try:
            code = json.loads(exc.read(8192)).get("error_code")
        except (ValueError, AttributeError):
            code = None
        if code == 442:
            return 404, dict(message="두 행사장을 잇는 보행 경로를 찾지 못했어요.")
        if exc.code == 429:
            return 429, dict(message="도보 조회가 몰렸어요. 잠시 후 다시 시도해 주세요.")
    except (URLError, OSError, ValueError, KeyError, TypeError):
        pass
    return 502, dict(message="도보 경로를 확인하지 못했어요. 잠시 후 다시 조회해 주세요.")


def decode_shape(encoded):
    """Valhalla polyline6를 위도·경도 배열로 변환한다. 손상·범위 초과는 ValueError다."""
    if not isinstance(encoded, str) or not 1 <= len(encoded) <= 200000:
        raise ValueError("경로선 형식 오류")
    values, value, shift = [], 0, 0
    for char in encoded:
        part = ord(char) - 63
        if not 0 <= part <= 63 or shift > 30:
            raise ValueError("경로선 문자 오류")
        value |= (part & 31) << shift
        if part >= 32:
            shift += 5
            continue
        values.append(~(value >> 1) if value & 1 else value >> 1)
        value = shift = 0
    if shift or len(values) < 4 or len(values) % 2:
        raise ValueError("경로선 좌표 누락")
    lat = lng = 0
    path = []
    for i in range(0, len(values), 2):
        lat += values[i]
        lng += values[i+1]
        path.append([coordinate(lat / 1000000, 90), coordinate(lng / 1000000, 180)])
    return path


def walking_details(trip):
    """같은 공급자 응답에서 한국어 단계·m·경로 인덱스·좌표를 검증해 반환한다."""
    if trip.get("language") != "ko-KR" or len(trip["legs"]) != 1:
        raise ValueError("한국어 안내 응답 오류")
    leg = trip["legs"][0]
    path = decode_shape(leg["shape"])
    maneuvers = leg["maneuvers"]
    if not isinstance(maneuvers, list) or not 1 <= len(maneuvers) <= 1000:
        raise ValueError("이동 단계 누락")
    steps = []
    for maneuver in maneuvers:
        instruction, km = maneuver["instruction"], maneuver["length"]
        begin, end = maneuver["begin_shape_index"], maneuver["end_shape_index"]
        if (not isinstance(instruction, str) or not instruction.strip() or len(instruction) > 2000
                or type(km) not in (int, float) or not math.isfinite(km) or km < 0
                or type(begin) is not int or type(end) is not int or not 0 <= begin <= end < len(path)):
            raise ValueError("이동 단계 형식 오류")
        steps.append(dict(instruction=instruction, distance_m=round(km * 1000), begin=begin, end=end))
    return dict(steps=steps, path=path, provider="Valhalla / FOSSGIS",
                checked_at=datetime.now(timezone.utc).isoformat(timespec="seconds"))


def walk_between(points, details=False):
    """두 행사 좌표로 도보 예상 초·m를 얻는다. 잘못된 입력과 조회 실패를 구분한다."""
    if not isinstance(points, list) or len(points) != 2 or not all(isinstance(p, dict) for p in points):
        raise ValueError("행사장 두 곳을 선택해 주세요.")
    locations = [dict(lat=coordinate(p.get("lat"), 90), lon=coordinate(p.get("lng"), 180)) for p in points]
    if locations[0] == locations[1]:
        raise ValueError("두 행사장의 좌표가 같아요. 건물 안의 이동시간은 따로 확인해 주세요.")
    status, payload = query_walking("route", dict(locations=locations, costing="pedestrian",
                                                 units="kilometers", language="ko-KR",
                                                 directions_type="instructions" if details else "none"))
    if status != 200:
        return status, payload
    try:
        trip = payload["trip"]
        seconds, km = (trip["summary"][k] for k in ("time", "length"))
        if trip["status"] == 0 and trip["units"] == "kilometers" and all(
            type(n) in (int, float) and math.isfinite(n) and n > 0 for n in (seconds, km)
        ):
            result = dict(duration_s=seconds, distance_m=round(km * 1000))
            if details:
                result.update(walking_details(trip))
            return 200, result
    except (KeyError, TypeError, ValueError):
        pass
    return 502, dict(message="도보 경로 응답을 확인하지 못했어요.")
