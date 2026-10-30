"""서울시 행사 다섯 건에서 날짜·시간·분류를 확인하고 직선거리 순으로 반환한다."""
import json
import math
import re
from datetime import date, datetime, time, timedelta, timezone
from pathlib import Path
from urllib.parse import parse_qs, quote, urlsplit
from urllib.request import urlopen

KST = timezone(timedelta(hours=9))
EXAMPLES = Path(__file__).resolve().parents[1] / "docs/development/examples"
CATEGORIES = {"전시", "전체", "국악", "클래식", "콘서트", "연극"}


def coordinate(value, limit):
    """유한한 위경도 숫자를 검증하고 잘못된 입력은 ValueError로 알린다."""
    if isinstance(value, bool) or not isinstance(value, (str, int, float)):
        raise ValueError("위도·경도를 확인해 주세요.")
    number = float(value)
    if not math.isfinite(number) or abs(number) > limit:
        raise ValueError("위도·경도를 확인해 주세요.")
    return number


def validate(data):
    """개인 장소 요청을 검증하고 한국 시각의 당일 구간과 출발점을 반환한다."""
    origin = data.get("start_location")
    if not isinstance(origin, dict) or not isinstance(origin.get("label"), str) or not origin["label"].strip():
        raise ValueError("출발지를 입력해 주세요.")
    if data.get("request_kind") != "place" or data.get("category") not in CATEGORIES:
        raise ValueError("장소 찾기와 지원하는 분류를 선택해 주세요.")
    start, end = (datetime.fromisoformat(data[key]) for key in ("start_at", "end_at"))
    if not start.tzinfo or not end.tzinfo:
        raise ValueError("시간대를 포함해 주세요.")
    start, end = start.astimezone(KST), end.astimezone(KST)
    if start >= end or start.date() != end.date():
        raise ValueError("같은 날 출발보다 늦은 종료 시각을 입력해 주세요.")
    return start, end, coordinate(origin.get("lat"), 90), coordinate(origin.get("lng"), 180)


def seoul_page(day, category, mode):
    """지정일 첫 5건·조회시각·전체 수를 가져온다. 기록과 실시간은 명시적으로 분리한다."""
    if mode == "recorded":
        captures = json.loads((EXAMPLES / "seoul-events.capture.json").read_bytes())["captures"]
        for capture in captures:
            if capture["date"] == day and capture["category"] == category:
                return capture["rows"], capture["checked_at"], capture["total"]
        raise ValueError("이 날짜·분류의 저장된 조회가 없습니다. 실시간 조회를 선택해 주세요.")
    if mode != "live":
        raise ValueError("조회 방식을 선택해 주세요.")
    segment = quote(" " if category == "전체" else category)
    url = f"http://openapi.seoul.go.kr:8088/sample/json/culturalEventInfo/1/5/{segment}/%20/{day}/"
    with urlopen(url, timeout=8) as response:
        payload = json.load(response)
    if not isinstance(payload, dict):
        raise RuntimeError("서울시 응답 형식 오류")
    page = payload.get("culturalEventInfo", {})
    code = page.get("RESULT", payload.get("RESULT", {})).get("CODE")
    checked = datetime.now(KST).isoformat(timespec="seconds")
    if code == "INFO-200":
        return [], checked, 0
    if code != "INFO-000" or not isinstance(page.get("row"), list):
        raise RuntimeError("서울시 문화행사 응답을 확인하지 못했습니다.")
    for row in page["row"]:
        if not isinstance(row, dict) or not all(isinstance(row.get(k), str) for k in ("TITLE", "PLACE", "CODENAME")):
            raise RuntimeError("서울시 행사 항목 형식 오류")
    if not isinstance(page.get("list_total_count"), (str, int)):
        raise RuntimeError("서울시 조회 건수 형식 오류")
    return page["row"], checked, int(page["list_total_count"])


def distance_km(lat, lng, other_lat, other_lng):
    """두 좌표의 대권거리(km)를 구한다. 보행·대중교통 이동시간을 뜻하지 않는다."""
    dlat, dlng = math.radians(other_lat - lat), math.radians(other_lng - lng)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat)) * math.cos(math.radians(other_lat)) * math.sin(dlng / 2)**2
    return round(6371 * 2 * math.asin(math.sqrt(min(1, a))), 2)


def time_match(row, start, end):
    """단순 전시 개방구간/공연 시작을 검사한다. 복합 운영규칙은 미확인(None)이다."""
    hours = (row.get("PRO_TIME") or "").strip()
    try:
        if "전시" in row["CODENAME"] and re.fullmatch(r"\d{1,2}:\d{2}\s*[~-]\s*\d{1,2}:\d{2}", hours):
            begin, finish = [time(*map(int, x.strip().split(":"))) for x in re.split("[~-]", hours)]
            if begin < finish:
                return start.time() < finish and end.time() > begin
        if re.fullmatch(r"\d{1,2}:\d{2}", hours):
            show = time(*map(int, hours.split(":")))
            return start.time() <= show < end.time()
    except ValueError:
        pass
    return None


def recommend(data, mode="live"):
    """검증된 요청의 후보를 계산한다. 입력 오류와 공급자 오류를 별도로 전달한다."""
    start, end, lat, lng = validate(data)
    try:
        rows, checked, total = seoul_page(start.date().isoformat(), data["category"], mode)
    except ValueError as exc:
        if mode == "live":
            raise RuntimeError("서울시 응답을 읽지 못했습니다.") from exc
        raise
    candidates = []
    for row in rows:
        genres = {part.strip() for part in row["CODENAME"].split("/")}
        if data["category"] != "전체" and data["category"] not in genres:
            continue
        url = urlsplit(row.get("HMPG_ADDR") or "")
        ids = parse_qs(url.query).get("cultcode", [])
        if url.scheme not in {"http", "https"} or url.hostname != "culture.seoul.go.kr" or not ids or not ids[0].isdigit():
            raise RuntimeError("행사 식별 정보를 확인해 주세요.")
        try:
            first, last = (date.fromisoformat(row[key][:10]) for key in ("STRTDATE", "END_DATE"))
        except (KeyError, TypeError, ValueError) as exc:
            raise RuntimeError("서울시 행사 날짜를 확인할 수 없습니다.") from exc
        match = time_match(row, start, end)
        if not first <= start.date() <= last or match is False:
            continue
        checks = ["예약 가능 여부·실제 이동시간 확인"]
        if match is None:
            checks.append("요일·휴관·회차별 시간 확인")
        elif "전시" not in row["CODENAME"]:
            checks.append("공연 종료시각 확인")
        try:
            event_lat, event_lng = coordinate(row.get("LAT"), 90), coordinate(row.get("LOT"), 180)
            distance = distance_km(lat, lng, event_lat, event_lng)
        except ValueError:
            event_lat = event_lng = distance = None
            checks.append("지도 좌표 확인")
        candidates.append(dict(id="seoul:" + ids[0], title=row["TITLE"], venue=row["PLACE"], lat=event_lat,
                               lng=event_lng, distance_km=distance, official_url=url.geturl(),
                               opening_info=row.get("PRO_TIME") or None, price_info=row.get("USE_FEE") or None,
                               fee_type=row.get("IS_FREE") or None, audience=row.get("USE_TRGT") or None,
                               status="check", checks_required=checks, source_checked_at=checked))
    candidates.sort(key=lambda item: (item["distance_km"] is None, item["distance_km"], item["id"]))
    return dict(status="ready" if candidates else "no_results", mode=mode, source_checked_at=checked,
                searched_count=len(rows), source_total=total, candidates=candidates)
