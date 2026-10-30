"""개인 점검 화면에서 선택한 행사장 두 곳의 Valhalla 보행 경로를 조회한다."""
import json
import math
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


def walk_between(points):
    """두 행사 좌표로 도보 예상 초·m를 얻는다. 잘못된 입력과 조회 실패를 구분한다."""
    if not isinstance(points, list) or len(points) != 2 or not all(isinstance(p, dict) for p in points):
        raise ValueError("행사장 두 곳을 선택해 주세요.")
    locations = [dict(lat=coordinate(p.get("lat"), 90), lon=coordinate(p.get("lng"), 180)) for p in points]
    if locations[0] == locations[1]:
        raise ValueError("두 행사장의 좌표가 같아요. 건물 안의 이동시간은 따로 확인해 주세요.")
    status, payload = query_walking("route", dict(locations=locations, costing="pedestrian",
                                                 units="kilometers", directions_type="none"))
    if status != 200:
        return status, payload
    try:
        trip = payload["trip"]
        seconds, km = (trip["summary"][k] for k in ("time", "length"))
        if trip["status"] == 0 and trip["units"] == "kilometers" and all(
            type(n) in (int, float) and math.isfinite(n) and n > 0 for n in (seconds, km)
        ):
            return 200, dict(duration_s=seconds, distance_m=round(km * 1000))
    except (KeyError, TypeError):
        pass
    return 502, dict(message="도보 경로 응답을 확인하지 못했어요.")
