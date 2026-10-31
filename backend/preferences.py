"""대화 선호의 형식과 공식 행사 사실 기반 선별. AI가 가격·경로 사실을 만들지 않는다."""
import re

CATEGORIES = {"전시", "전체", "국악", "클래식", "콘서트", "연극"}
FIELDS = {"categories", "music_followup", "free_only", "budget_krw", "keywords",
          "exclude_terms", "walking_preference", "indoor_outdoor", "unsupported_requirements"}


def normalize(values):
    """선호 부분 갱신을 검증한다. 빈 목록/false/any는 명시적 해제이며 null은 변경 없음이다."""
    result = {}
    for key in FIELDS & values.keys():
        value = values[key]
        if value is None:
            continue
        if key in {"categories", "keywords", "exclude_terms", "unsupported_requirements"}:
            if (not isinstance(value, list) or len(value) > 8
                    or any(not isinstance(s, str) or not 1 <= len(s.strip()) <= 80
                           or any(ord(c) < 32 for c in s) for s in value)):
                raise ValueError(f"{key}: 짧은 문자열 목록이 필요합니다.")
            value = list(dict.fromkeys(s.strip() for s in value))
            if key == "categories" and (not value or set(value) - CATEGORIES
                                          or ("전체" in value and len(value) > 1)):
                raise ValueError("관심 분류를 확인해 주세요.")
        elif key in {"music_followup", "free_only"}:
            if type(value) is not bool:
                raise ValueError(f"{key}: 참/거짓이 필요합니다.")
        elif key == "budget_krw":
            if value != "any" and (type(value) is not int or not 0 <= value <= 1000000):
                raise ValueError("관람 예산은 0~1000000원 또는 any입니다.")
        elif key == "walking_preference" and value not in ("any", "short"):
            raise ValueError("걷기 선호를 확인해 주세요.")
        elif key == "indoor_outdoor" and value not in ("any", "indoor", "outdoor"):
            raise ValueError("실내·실외 선호를 확인해 주세요.")
        result[key] = value
    return result


def known_price(candidate):
    """공식 무료 표시 또는 단일 원화 가격만 판독한다. 할인/복수 좌석/범위는 미확인이다."""
    if candidate.get("fee_type") == "무료":
        return 0
    text = (candidate.get("price_info") or "").strip()
    match = re.fullmatch(r"(?:전석\s*)?(\d[\d,]*)\s*(만원|원)", text)
    if not match:
        return None
    return int(match[1].replace(",", "")) * (10000 if match[2] == "만원" else 1)


def apply(candidates, preferences):
    """무료/예산/명시 제외를 적용하고 관심 키워드·직선 근접성으로 정렬한다. 미확인은 숨기지 않는다."""
    accepted, excluded, unknown_price = [], 0, 0
    for candidate in candidates:
        text = " ".join(str(candidate.get(k) or "") for k in ("title", "venue", "genre", "district")).casefold()
        if any(term.casefold() in text for term in preferences.get("exclude_terms", [])):
            excluded += 1
            continue
        price = known_price(candidate)
        budget = preferences.get("budget_krw", "any")
        if preferences.get("free_only") or budget != "any":
            if price is None:
                unknown_price += 1
                continue
            if (preferences.get("free_only") and price != 0) or (budget != "any" and price > budget):
                excluded += 1
                continue
        reasons = []
        hits = [word for word in preferences.get("keywords", []) if word.casefold() in text]
        if hits:
            reasons.append("공식 행사 정보에 관심어 포함: " + ", ".join(hits))
        if preferences.get("free_only"):
            reasons.append("공개 요금 무료 확인")
        if budget != "any":
            reasons.append(f"공개 관람요금 {price:,}원 · 1인 관람 예산 이내")
        candidate["preference_reasons"] = reasons
        candidate["matched_keywords"] = hits
        accepted.append(candidate)
    def order(item):
        """걷기 최소 선호 시 근접성 먼저, 그 외 관심어 먼저. 실제 도보 시간으로 간주하지 않는다."""
        distance = (item["distance_km"] is None, item["distance_km"] or 0)
        interest = -len(item["matched_keywords"])
        return (*distance, interest, item["id"]) if preferences.get("walking_preference") == "short" else (interest, *distance, item["id"])
    accepted.sort(key=order)
    notes = []
    if preferences.get("walking_preference") == "short":
        notes.append("적게 걷기 선호: 직선으로 가까운 후보부터 표시했습니다. 실제 도보·계단 조건 충족은 미확인입니다.")
    if preferences.get("indoor_outdoor", "any") != "any":
        notes.append("실내·실외 여부는 공개 데이터로 확인되지 않아 선별에 적용하지 못했습니다.")
    if preferences.get("exclude_terms"):
        notes.append("제외 조건은 행사명·장소·분류·지역의 명시한 단어 일치로 검사했습니다.")
    if unknown_price:
        notes.append(f"요금이 확인되지 않은 {unknown_price}건은 예산 충족으로 간주하지 않고 제외했습니다.")
    return accepted, dict(excluded_count=excluded, unknown_price_count=unknown_price, preference_notes=notes)
