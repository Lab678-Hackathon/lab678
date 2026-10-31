"""서울시 후보 최대 다섯 곳의 방문 순서를 비교해 두 곳 도보 일정 하나를 제시한다."""
import math
import re
from datetime import datetime, time, timedelta
from itertools import permutations

from outing import validate
from walking import query_walking


def visit_window(event, day):
    """행사 시간 원문에서 검증 가능한 당일 시작·종료와 고정 공연 여부를 얻는다."""
    genre = event["genre"]
    exhibit = genre == "전시/미술" or genre == "전시"
    performance = genre in {"국악", "콘서트", "클래식", "연극"}
    hours = (event["opening_info"] or "").strip()
    if exhibit and hours.startswith("월-일요일 "):
        hours = hours.removeprefix("월-일요일 ")
    weekly = re.fullmatch(r"주중 ([\d:~]+) / 주말 ([\d:~]+)", hours)
    if exhibit and weekly:
        hours = weekly[1 if day.weekday() < 5 else 2]
    span = re.fullmatch(r"(\d{1,2}:\d{2})\s*[~-]\s*(\d{1,2}:\d{2})", hours)
    if span and (exhibit or performance):
        try:
            opening, closing = [datetime.combine(day.date(), time.fromisoformat(t.zfill(5)), day.tzinfo)
                                for t in span.groups()]
            if opening < closing:
                return opening, closing, performance
        except ValueError:
            pass
    fixed = event.get("fixed_start_at")
    return datetime.fromisoformat(fixed) if fixed else None, None, performance


def schedule_pair(events, seconds, start, end, stay):
    """두 구간과 당일 시간표를 합산해 가능·미확인·충돌 및 방문별 예상시각을 반환한다."""
    cursor = start
    stops, missing = [], []
    for event, walk in zip(events, seconds):
        cursor += timedelta(seconds=walk)
        opening, closing, fixed = visit_window(event, start)
        if fixed and opening and cursor > opening:
            return dict(status="conflict", message=event["venue"].strip() + " 공연 시작 전에 도착할 수 없어요.")
        arrival = cursor
        if opening:
            cursor = max(cursor, opening)
        begin = cursor
        if fixed and closing:
            cursor = closing
        elif event["genre"] in {"전시", "전시/미술"}:
            cursor += timedelta(minutes=stay)
        else:
            missing.append(event["venue"] + " 관람 종료시각")
        if not opening:
            missing.append(event["venue"] + " 운영·회차 시간")
        if (closing and cursor > closing) or cursor > end or begin >= end:
            limit = min(end, closing) if closing else end
            label = "행사 운영 종료" if closing and closing < end else "나들이 종료"
            return dict(status="conflict", message=f"{event['venue'].strip()} 관람 시간이 부족해요. "
                        f"{label} {limit:%H:%M}까지이며 예상 도착은 {arrival:%H:%M}입니다.")
        stops.append(dict(id=event["id"], title=event["title"], walk_min=math.ceil(walk / 60),
                          arrive=arrival.strftime("%H:%M"), begin=begin.strftime("%H:%M"), finish=cursor.strftime("%H:%M")))
    if missing:
        return dict(status="check", message="확인할 정보 · " + ", ".join(missing))
    count = "두 곳" if len(events) == 2 else "한 곳"
    return dict(status="ready", message=f"입력한 시간 안에 {count}을 관람할 수 있는 예상 일정입니다.", stops=stops)


def course_alternatives(events, matrix, origin, start, end, stay):
    """동의 요청에만 같은 시간 한 곳·최대 두 시간 이른 두 곳의 검증된 대안을 반환한다."""
    choices = []
    for count, offsets, label in [(1, [0], "같은 시간 안에 한 곳 관람"),
                                  (2, range(30, 121, 30), "출발을 앞당겨 두 곳 관람")]:
        for offset in offsets:
            proposed = start - timedelta(minutes=offset)
            if proposed.date() != start.date():
                continue
            options = []
            for indexes in permutations(range(len(events)), count):
                selected = [events[i] for i in indexes]
                locations = [(e["lat"], e["lng"]) for e in selected]
                if len(set(locations)) != count or len({e["id"] for e in selected}) != count:
                    continue
                legs = [matrix[0][indexes[0]]]
                if count == 2:
                    legs.append(matrix[indexes[0] + 1][indexes[1]])
                if any(n is None for n in legs) or (legs[0] == 0 and locations[0] != origin) or (count == 2 and legs[1] == 0):
                    continue
                course = schedule_pair(selected, legs, proposed, end, stay)
                if course["status"] != "ready":
                    continue
                course.update(ids=[e["id"] for e in selected], venues=[e["venue"] for e in selected],
                              walk_minutes=[math.ceil(n / 60) for n in legs])
                options.append((sum(legs), indexes, course))
            if options:
                choices.append(dict(label=label, start_at=proposed.isoformat(), end_at=end.isoformat(),
                                    course=min(options)[-1]))
                break
    return choices


def build_course(data, candidates):
    """사용자 출발 좌표와 공개 후보의 도보 초를 한 번 조회해 가장 짧은 가능한 조합을 선택한다."""
    start, end, lat, lng = validate(data)
    consent = data.get("alternatives", False)
    if type(consent) is not bool:
        raise ValueError("대안 조회 동의를 확인해 주세요.")
    stay = data.get("stay_minutes")
    if type(stay) is not int or not 1 <= stay <= 240:
        raise ValueError("전시 한 곳의 관람시간을 1~240분으로 입력해 주세요.")
    excluded = data.get("exclude_ids", [])
    if not isinstance(excluded, list) or len(excluded) > 5 or not all(isinstance(i, str) for i in excluded):
        raise ValueError("제외할 행사를 확인해 주세요.")
    events = [e for e in candidates if e["id"] not in excluded and e["lat"] is not None and e["lng"] is not None]
    if len(events) < 2:
        return dict(status="insufficient", message="조회한 후보 중 좌표가 있는 행사가 두 곳 이상 필요해요.")
    locations = [dict(lat=e["lat"], lon=e["lng"]) for e in events]
    status, body = query_walking("sources_to_targets", dict(sources=[dict(lat=lat, lon=lng), *locations],
                                 targets=locations, costing="pedestrian", units="kilometers", verbose=False))
    if status != 200:
        return dict(status="unavailable", message=body["message"])
    try:
        matrix = body["sources_to_targets"]["durations"]
        if len(matrix) != len(events) + 1 or any(len(row) != len(events) for row in matrix):
            raise ValueError
        if any(n is not None and not (type(n) in (float, int) and math.isfinite(n) and 0 <= n <= 864000)
               for row in matrix for n in row):
            raise ValueError
    except (KeyError, TypeError, ValueError):
        return dict(status="unavailable", message="구간별 도보 응답을 확인하지 못했어요.")
    options = []
    uncertain_route = False
    for i, j in permutations(range(len(events)), 2):
        if events[i]["id"] == events[j]["id"] or locations[i] == locations[j]:
            continue
        legs = [matrix[0][i], matrix[i+1][j]]
        if None in legs or legs[1] == 0 or (legs[0] == 0 and locations[i] != dict(lat=lat, lon=lng)):
            uncertain_route = True
            continue
        pair = [events[i], events[j]]
        result = schedule_pair(pair, legs, start, end, stay)
        result.update(ids=[e["id"] for e in pair], venues=[e["venue"] for e in pair],
                      walk_minutes=[math.ceil(s / 60) for s in legs])
        options.append(({"ready":0, "check":1, "conflict":2}[result["status"]], sum(legs), i, j, result))
    if not options:
        return dict(status="check", message="서로 다른 두 장소를 잇는 도보 시간을 확인할 수 없어요.")
    result = min(options)[-1]
    if result["status"] == "conflict" and uncertain_route:
        result["message"] += " 다른 조합에는 확인되지 않은 도보 구간이 있어요."
    if consent:
        result["alternatives"] = course_alternatives(events, matrix, (lat, lng), start, end, stay)
    return result
