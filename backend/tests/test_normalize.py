"""정규화 단위 테스트 (PRD §6.2 · 신뢰 게이트).

핵심: 요금 빈값·모호값을 free 로 매핑하지 않는다. 명시된 Free만 free.
"""

from __future__ import annotations

from app.domain.normalize import (
    english_display,
    enrich_intro,
    normalize_candidate,
    normalize_hours,
    normalize_price,
    parse_duration_min,
)
from app.models.recommend import (
    ExperienceType,
    PriceStatus,
    Provenance,
    ReservationVerdict,
)


# ── 가격 정규화 (무료 추정 금지) ──
def test_price_empty_is_unknown_not_free():
    p = normalize_price("")
    assert p.status is PriceStatus.UNKNOWN
    assert p.provenance is Provenance.UNCONFIRMED
    assert p.raw is None


def test_price_explicit_free():
    p = normalize_price("Free admission")
    assert p.status is PriceStatus.FREE
    assert p.provenance is Provenance.CONFIRMED


def test_price_korean_free():
    assert normalize_price("무료").status is PriceStatus.FREE


def test_price_with_amount_is_paid():
    p = normalize_price("Adults 3,000 won / Children 1,500 won")
    assert p.status is PriceStatus.PAID
    assert p.raw == "Adults 3,000 won / Children 1,500 won"


def test_price_free_and_paid_is_partial():
    assert (
        normalize_price("Free for children, Adults 3,000 won").status
        is PriceStatus.PARTIAL_OR_AMBIGUOUS
    )


def test_price_paid_without_amount_is_unknown():
    # 유료는 확인되지만 금액 미상 → unknown(긍정으로 메우지 않음)
    p = normalize_price("Paid (inquire by phone)")
    assert p.status is PriceStatus.UNKNOWN


def test_price_vague_is_unknown():
    assert normalize_price("Varies by program").status is PriceStatus.UNKNOWN


# ── detailInfo2 보강 (enrich_intro) ──
def test_enrich_fills_empty_fee_from_info():
    intro = {"usefee": "", "usetime": "09:00-18:00"}
    info = [
        {"infoname": "Restrooms", "infotext": "Available"},
        {
            "infoname": "Admission Fees",
            "infotext": "Adults 5,000 won / Children 2,000 won",
        },
    ]
    out = enrich_intro(intro, info)
    assert normalize_price(out["usefee"]).status is PriceStatus.PAID
    assert out["usetime"] == "09:00-18:00"  # 이미 있는 값은 덮어쓰지 않음


def test_enrich_fills_free_fee_from_info():
    out = enrich_intro({}, [{"infoname": "Admission Fees", "infotext": "Free"}])
    assert normalize_price(out["usefee"]).status is PriceStatus.FREE


def test_enrich_does_not_overwrite_existing_fee():
    intro = {"usefee": "Adults 3,000 won"}
    out = enrich_intro(intro, [{"infoname": "Admission Fees", "infotext": "Free"}])
    assert out["usefee"] == "Adults 3,000 won"


def test_enrich_no_info_is_noop():
    intro = {"usefee": ""}
    assert enrich_intro(intro, []) is intro
    assert enrich_intro(intro, None) is intro


def test_enrich_ignores_non_fee_rows():
    # 요금/시간과 무관한 행만 있으면 보강하지 않음(빈값 유지 → unknown)
    out = enrich_intro({}, [{"infoname": "Available Facilities", "infotext": "Cafe"}])
    assert not out.get("usefee")


# ── 제목 정리 (한글 제거, english_display) ──
def test_english_display_strips_korean_parens():
    assert english_display("Gyeongbokgung Palace (경복궁)") == "Gyeongbokgung Palace"


def test_english_display_nested_parens():
    assert (
        english_display("Dongdaemun Design Plaza (동대문디자인플라자 (DDP))")
        == "Dongdaemun Design Plaza"
    )


def test_english_display_keeps_english_parens():
    assert english_display("Museum (Main Hall)") == "Museum (Main Hall)"


def test_english_display_strips_square_bracket_korean():
    # 사용자 보고 케이스 — 대괄호 안 한글(+중첩 소괄호) 제거.
    assert (
        english_display("Alive Museum (Insa-dong Branch) [박물관은 살아있다(인사동점)]")
        == "Alive Museum (Insa-dong Branch)"
    )


def test_english_display_strips_leading_korean_run():
    assert english_display("경복궁 Gyeongbokgung") == "Gyeongbokgung"


def test_english_display_all_korean_romanized():
    # 전부 한글(서울 행사 등)은 영문 이름이 없어 발음 보존 로마자화(의미 번역 아님).
    out = english_display("서울서예박물관")
    assert out == "Seoulseoyebakmulgwan"
    assert not _has_hangul(out)


def test_english_display_korean_name_with_year_romanized():
    # 한글 + 연도 숫자 — 한글은 로마자화하고 숫자는 보존(발음 살려 읽을 수 있게).
    assert english_display("서울빛초롱축제 2026") == "Seoulbitchorongchukje 2026"
    assert english_display("2026 서울거리공연") == "2026 Seoulgeorigongyeon"


def _has_hangul(s: str) -> bool:
    return any("가" <= c <= "힣" for c in s)


def test_english_display_mixed_inline_korean_romanized():
    # 혼합 제목에서도 인라인 한글은 발음 보존 로마자화(지우지 않음).
    assert english_display("서울 K-POP Festival") == "Seoul K-POP Festival"
    # 한글이 옆 영문의 중복이면 로마자화 후 인접 중복어로 접힌다(1개로).
    assert english_display("경복궁 Gyeongbokgung") == "Gyeongbokgung"
    assert english_display("Gyeongbokgung 경복궁") == "Gyeongbokgung"
    assert english_display("경복궁 (Gyeongbokgung)") == "Gyeongbokgung"


def test_english_display_romanization_familiar_forms():
    # 발음 보존 + 익숙한 표기(음절 기반 RR) — 사용자 예시 '한글날'→'Hangeulnal'.
    assert english_display("한글날") == "Hangeulnal"
    assert english_display("경복궁") == "Gyeongbokgung"
    assert english_display("북촌") == "Bukchon"
    assert english_display("서울") == "Seoul"
    assert english_display("인사동") == "Insadong"


def test_english_display_british_to_american():
    # 공식 영문 API 가 영국식으로 줄 때 미국영어로 통일(대소문자 보존).
    assert english_display("Sejong Centre") == "Sejong Center"
    assert english_display("National Theatre of Korea") == "National Theater of Korea"
    # 한글 괄호 제거 + 영국식 철자 교정이 함께 적용.
    assert english_display("Seoul Arts Centre (예술의전당)") == "Seoul Arts Center"


def test_to_american_preserves_case_and_non_matches():
    from app.domain.normalize import to_american

    assert to_american("centre") == "center"
    assert to_american("Centre") == "Center"
    assert to_american("CENTRE") == "CENTER"
    assert to_american("Grand Theatre Hall") == "Grand Theater Hall"
    assert to_american("Museum Hall") == "Museum Hall"  # 매칭 없으면 그대로
    assert to_american("") == ""


def test_english_display_empty():
    assert english_display(None) == ""
    assert english_display("") == ""


# ── 시간 ──
def test_hours_present_confirmed():
    t = normalize_hours({"usetime": "09:00-18:00"})
    assert t is not None and t.provenance is Provenance.CONFIRMED


def test_hours_absent_is_none():
    assert normalize_hours({}) is None


# ── 후보 조립 (좌표 검증 · flag) ──
def _item(**kw):
    base = {
        "contentid": "1",
        "contenttypeid": "78",
        "title": "Test Museum (테스트)",
        "mapx": "126.98",
        "mapy": "37.57",
        "firstimage": "",
    }
    base.update(kw)
    return base


def test_candidate_unknown_price_gets_flag():
    c = normalize_candidate(_item(), intro={}, common={})
    assert c is not None
    assert c.type is ExperienceType.EXHIBITION
    assert c.price.status is PriceStatus.UNKNOWN
    flag_texts = [f.text for f in c.flags]
    assert "Price needs checking" in flag_texts
    assert "Hours need checking" in flag_texts  # intro 비어 hours 미확인
    assert c.image_url is None  # firstimage 빈값 → None(가짜 이미지 금지)


def test_candidate_out_of_range_coords_dropped():
    assert normalize_candidate(_item(mapx="0", mapy="0"), {}, {}) is None


# ── 공식 링크: 영문 우선(VisitKorea) + 자체 홈페이지 보조 ──
def test_candidate_english_official_link_primary():
    c = normalize_candidate(_item(contentid="264337"), intro={}, common={})
    assert c.official_links[0].label == "View on VISITKOREA"
    assert "english.visitkorea.or.kr" in c.official_links[0].url
    assert "cid=264337" in c.official_links[0].url


def test_candidate_homepage_is_secondary_website():
    common = {"homepage": '<a href="https://example.com/">site</a>'}
    c = normalize_candidate(_item(contentid="264337"), intro={}, common=common)
    assert len(c.official_links) == 2
    assert c.official_links[0].label == "View on VISITKOREA"
    assert c.official_links[1].label == "Official Website"
    assert c.official_links[1].url == "https://example.com/"


def test_candidate_title_original_only_when_display_romanized():
    # 괄호 속 한글만 있던 영어 제목 → 표시는 순수 영문 → title_original None(Translate 불필요).
    c = normalize_candidate(
        _item(title="The Children's Museum of Korea (국립민속박물관 어린이박물관)"), {}, {}
    )
    assert c.title == "The Children's Museum of Korea"
    assert c.title_original is None
    # 한글을 로마자화해 표시한 제목(한글발음 보존) → title_original 보존(Translate 대상).
    c2 = normalize_candidate(_item(title="경복궁"), {}, {})
    assert c2.title == "Gyeongbokgung"
    assert c2.title_original == "경복궁"


def test_candidate_free_no_price_flag():
    c = normalize_candidate(_item(), intro={"usefeeculture": "Free"}, common={})
    assert c.price.status is PriceStatus.FREE
    assert "Price needs checking" not in [f.text for f in c.flags]


# ── 예약 적용성(유형+공식 신호) ──
def test_candidate_reservation_performance_signal_in_festival_type():
    # 축제·공연(85)에 공연 신호(agelimit/playtime)가 있으면 예매공연 → APPLIES_UNCONFIRMED
    c = normalize_candidate(
        _item(contenttypeid="85", title="A Play"),
        intro={"agelimit": "14 years old or older", "playtime": "90 minutes"},
        common={},
    )
    assert c is not None
    assert c.reservation is ReservationVerdict.APPLIES_UNCONFIRMED


def test_candidate_reservation_open_festival_is_not_required():
    # 축제·공연(85)에 공연 신호가 없으면 개방축제 → NOT_REQUIRED(워크인)
    c = normalize_candidate(
        _item(contenttypeid="85", title="Open Festival"), intro={}, common={}
    )
    assert c.reservation is ReservationVerdict.NOT_REQUIRED


def test_candidate_reservation_museum_is_not_required():
    # 문화시설(78)은 워크인 입장형 → NOT_REQUIRED
    c = normalize_candidate(_item(), intro={}, common={})
    assert c.reservation is ReservationVerdict.NOT_REQUIRED


def test_parse_duration_min():
    assert parse_duration_min("180 minutes") == 180
    assert parse_duration_min("1시간 30분") == 90
    assert parse_duration_min("About 2 hours") == 120
    assert parse_duration_min("60분") == 60
    assert parse_duration_min("") is None  # 빈값 → 추정 안 함
    assert parse_duration_min("free") is None  # 숫자 없음 → None


# ── 텍스트 짤림 수정: 운영시간 요약(A) · 가격 단어경계 트림 ──


def test_normalize_hours_summarized_not_char_cut():
    from app.domain.normalize import normalize_hours

    # 길고 계절/마지막입장이 섞인 원문도 글자수로 자르지 않고 깔끔한 범위만(또는 None).
    t = normalize_hours({"usetime": "09:00-18:00 (Last admission 17:00), Closed Tuesdays"})
    assert t is not None and t.display == "09:00–18:00"
    # 계절 운영시간 → 한 시간대로 단정 불가 → None(호출부가 'Hours need checking' 처리).
    assert normalize_hours({"usetime": "Mar-Oct 09:00-18:00 / Nov-Feb 09:00-17:00"}) is None


def test_normalize_price_trims_at_word_boundary():
    from app.domain.normalize import normalize_price

    long_fee = (
        "Adults 3,000 won, Youth 2,400 won, Children 1,500 won, "
        "Free for under 6 and over 65"
    )
    disp = normalize_price(long_fee).display
    assert disp.endswith("…")
    assert len(disp) <= 61  # 60 + 생략부호
    assert "wo…" not in disp and "Yout…" not in disp  # 단어 중간 끊김 없음
