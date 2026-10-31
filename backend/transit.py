"""개인 점검용 카카오 대중교통 텍스트 안내. 키는 서버에서만 읽고 원문 응답은 저장하지 않는다."""
import json
import math
import os
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock
from time import monotonic
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from outing import coordinate

KEY_FILE = Path(__file__).resolve().parents[1] / ".local" / "transit.env"
_gate = Lock()
_last_request = -math.inf


def api_key():
    """전용 환경변수 또는 로컬 제외 파일의 키 한 개만 읽는다. 값은 응답·로그에 출력하지 않는다."""
    key = os.environ.get("LAB678_KAKAO_REST_API_KEY", "").strip()
    if not key and KEY_FILE.is_file():
        for line in KEY_FILE.read_text(encoding="utf-8-sig").splitlines():
            name, separator, value = line.partition("=")
            if separator and name.strip() == "LAB678_KAKAO_REST_API_KEY":
                key = value.strip().strip("\"'")
                break
    if key and (len(key) > 256 or any(c.isspace() for c in key)):
        raise ValueError("잘못된 서버 키 형식")
    return key


def metric(value, maximum=864000):
    """응답의 초·m·원 값을 유한한 음수 아닌 수로 제한한다. 미확인은 0으로 대체하지 않는다."""
    if type(value) not in (int, float) or not math.isfinite(value) or not 0 <= value <= maximum:
        raise ValueError("이동 수치 오류")
    return value


def short_text(value):
    """이동 안내 원문을 길이 제한된 텍스트로 받아 HTML 실행 없이 표시하도록 반환한다."""
    if not isinstance(value, str) or not value.strip() or len(value) > 2000:
        raise ValueError("이동 안내 누락")
    return value.strip()


def normalize_routes(body):
    """공식 응답의 경로 최대 세 개를 초·m 단위로 검증한다. 누락·공급자 오류는 실패로 구분한다."""
    status = body.get("status")
    if status == "NO_RESULTS":
        return dict(status="no_results", routes=[], message="이 구간의 대중교통 경로를 찾지 못했어요.")
    if status != "OK" or not isinstance(body.get("routes"), list) or not body["routes"]:
        raise ValueError("대중교통 응답 오류")
    routes = []
    for item in body["routes"][:3]:
        properties = item["properties"]
        duration = metric(properties["totalTime"])
        distance = metric(properties["totalDistance"], 10000000)
        transfers = properties["transfers"]
        if duration == 0 or type(transfers) is not int or not 0 <= transfers <= 30:
            raise ValueError("총시간·환승 오류")
        raw_steps = item["steps"]
        if not isinstance(raw_steps, list) or not 1 <= len(raw_steps) <= 100:
            raise ValueError("이동 단계 오류")
        steps = []
        for raw in raw_steps:
            step = raw["properties"]
            mode = step["type"]
            if mode not in {"WALKING", "BUS", "SUBWAY"}:
                raise ValueError("미지원 이동 수단")
            steps.append(dict(mode=mode, instruction=short_text(step["guidance"]),
                              duration_s=metric(step["time"]), distance_m=metric(step["distance"], 10000000)))
        if not any(s["mode"] != "WALKING" for s in steps):
            raise ValueError("대중교통 구간 없음")
        walk = [s for s in steps if s["mode"] == "WALKING"]
        walk_time = sum(s["duration_s"] for s in walk)
        walk_distance = sum(s["distance_m"] for s in walk)
        if walk_time > duration or walk_distance > distance:
            raise ValueError("합계 불일치")
        fare = properties.get("fare") or {}
        price = fare.get("value")
        routes.append(dict(duration_s=duration, distance_m=distance, transfers=transfers,
                           fare_won=metric(price, 1000000) if price is not None else None,
                           walk_duration_s=None, walk_distance_m=None,
                           listed_walk_duration_s=walk_time if walk else None,
                           listed_walk_distance_m=walk_distance if walk else None,
                           walk_note="전체 도보량은 확인되지 않았어요. 출발지에서 승차 지점까지와 하차 후 목적지까지의 이동은 지도에서 확인해 주세요.",
                           steps=steps))
    return dict(status="ready", routes=routes, provider="카카오맵",
                checked_at=datetime.now(timezone.utc).isoformat(),
                time_basis="조회 시점 경로예요. 나들이 날짜·출발시각은 적용되지 않으며 배차·막차는 별도 확인해 주세요.")


def transit_between(points):
    """좌표 두 개로 사용자 요청당 1회 조회한다. 미설정/인증/한도/빈 결과/실패를 구별한다."""
    global _last_request
    if not isinstance(points, list) or len(points) != 2 or not all(isinstance(p, dict) for p in points):
        raise ValueError("출발지와 목적지를 확인해 주세요.")
    coords = [(coordinate(p.get("lat"), 90), coordinate(p.get("lng"), 180)) for p in points]
    if coords[0] == coords[1]:
        raise ValueError("서로 다른 출발지와 목적지를 선택해 주세요.")
    try:
        key = api_key()
    except (OSError, ValueError):
        return 503, dict(status="unconfigured", message="대중교통 연결 설정을 확인해야 해요. 아래 카카오맵에서 확인할 수 있어요.")
    if not key:
        return 503, dict(status="unconfigured", message="앱 안의 대중교통 안내는 아직 연결 준비 중이에요. 아래 카카오맵에서 확인할 수 있어요.")
    if not _gate.acquire(blocking=False):
        return 429, dict(status="limited", message="대중교통 조회 중이에요. 잠시 후 다시 시도해 주세요.")
    try:
        if monotonic() - _last_request < 1:
            return 429, dict(status="limited", message="잠시 후 다시 조회해 주세요.")
        _last_request = monotonic()
        query = urlencode(dict(start_x=coords[0][1], start_y=coords[0][0], end_x=coords[1][1], end_y=coords[1][0],
                               input_coord="WGS84", output_coord="WGS84"))
        request = Request("https://dapi.kakao.com/v2/routing/publictraffic?" + query,
                          headers={"Authorization":"KakaoAK " + key, "User-Agent":"LAB678-local-preview/1.0"})
        with urlopen(request, timeout=10) as response:
            raw = response.read(2000001)
            if len(raw) > 2000000:
                raise ValueError("응답 크기 초과")
            return 200, normalize_routes(json.loads(raw))
    except HTTPError as exc:
        if exc.code in {401, 403}:
            return 503, dict(status="unauthorized", message="대중교통 연결 권한을 확인해야 해요. 아래 카카오맵을 이용해 주세요.")
        if exc.code == 429:
            return 429, dict(status="limited", message="대중교통 조회 한도에 도달했어요. 잠시 후 다시 조회해 주세요.")
    except TimeoutError:
        return 504, dict(status="timeout", message="대중교통 조회가 지연됐어요. 다시 조회하거나 아래 카카오맵을 이용해 주세요.")
    except (URLError, OSError, ValueError, TypeError, KeyError, AttributeError):
        pass
    finally:
        _gate.release()
    return 502, dict(status="unavailable", message="대중교통 경로를 확인하지 못했어요. 다시 조회하거나 아래 카카오맵을 이용해 주세요.")
