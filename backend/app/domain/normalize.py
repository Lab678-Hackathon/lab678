"""TourAPI 응답 → 정규화 (단일 지점, PRD §6.2).

신뢰 불변식(CLAUDE §6):
- 요금 필드가 비었으면 `free` 가 아니라 `unknown` 으로 둔다(추정 금지).
- 운영시간이 없으면 `미확인`. 임의 숫자/시간 생성 금지.
- 좌표는 한국 범위로 range 검증 후 이상치 drop.
- 예약·참여는 TourAPI로 확인 불가 → 표기하지 않는다(‘예약 불필요’로 매핑 금지).

판정(3상태·시간충돌)은 여기서 하지 않는다 — A3(domain/constraints)에서. A2는
모두 `check_needed` 로 두고 미확인 flag만 표기한다(판정 전 상태).
"""

from __future__ import annotations

import re
from typing import Any

from app.domain.reservation import judge_reservation
from app.domain.timing import summarize_hours
from app.models.recommend import (
    Candidate,
    ExperienceType,
    OfficialLink,
    PriceInfo,
    PriceStatus,
    Provenance,
    ResultStatus,
    TimeInfo,
    UnconfirmedFlag,
)

# KTO 공식 영문 포털(VisitKorea English) 상세 딥링크 템플릿.
# EngService2 contentId = VisitKorea 영문 사이트 cid(동일 KTO 콘텐츠 DB) → 외국인 FIT
# 대상이라 자체 홈페이지(한국어 많음)보다 이 영문 상세를 공식 링크로 우선한다.
# (레거시 상세 엔드포인트. 유효 cid 는 영문 상세, 무효 cid 는 400 — 생성 아님·graceful.)
_VISITKOREA_EN_DETAIL = (
    "https://english.visitkorea.or.kr/enu/SI/SI_EN_3_1_1_1.jsp?cid={cid}"
)

# contenttypeid(EngService2) → 유형 키 (DESIGN §3.4). 미상은 default.
_TYPE_MAP = {
    "76": ExperienceType.HISTORIC_VISIT,  # Tourist attractions (궁·역사 등)
    "78": ExperienceType.EXHIBITION,  # Cultural facilities (박물관·미술관)
    "85": ExperienceType.FESTIVAL_EVENT,  # Festivals/Performances/Events
}


def type_from_contenttype(contenttypeid: str | None) -> ExperienceType:
    """contenttypeid → 유형(상세조회 전 선발용). 미상은 default."""
    return _TYPE_MAP.get(str(contenttypeid), ExperienceType.DEFAULT)


# 좌표 한국 범위 (이상치 drop)
_LAT_RANGE = (33.0, 39.0)
_LNG_RANGE = (124.0, 132.0)

# 운영시간/요금은 타입별로 필드명이 다름 → 존재하는 첫 값을 쓴다.
_HOURS_KEYS = [
    "usetime",
    "usetimeculture",
    "usetimefestival",
    "opentime",
    "usetimeleports",
]
_FEE_KEYS = ["usefee", "usefeeculture", "usetimefestival2"]

# detailInfo2(반복 행)에서 요금·운영시간을 보강할 때 매칭할 infoname 키워드.
# detailIntro2 의 usefee/usetime 이 빈 경우에만 fallback 으로 쓴다(공식 데이터).
_INFO_FEE_NAMES = ("admission", "fee", "요금", "입장")
_INFO_HOURS_NAMES = (
    "operating hour",
    "hours of",
    "use time",
    "business hour",
    "운영시간",
    "이용시간",
    "관람시간",
)


def _info_value(info_rows: list[dict[str, Any]], name_keywords: tuple[str, ...]) -> str:
    """infoname 이 키워드에 매칭되는 첫 행의 infotext(정리본). 없으면 ''."""
    for row in info_rows:
        name = str(row.get("infoname") or "").lower()
        if any(k in name for k in name_keywords):
            text = _strip_html(row.get("infotext"))
            if text:
                return text
    return ""


def enrich_intro(
    intro: dict[str, Any], info_rows: list[dict[str, Any]] | None
) -> dict[str, Any]:
    """detailIntro2 에 요금·운영시간이 비면 detailInfo2 행에서 보강한 intro 사본을 반환.
    공식 TourAPI 데이터만 사용 — 추정/생성 아님. 값이 이미 있으면 덮어쓰지 않는다."""
    if not info_rows:
        return intro
    out = dict(intro)
    if not _first(out, _FEE_KEYS):
        fee = _info_value(info_rows, _INFO_FEE_NAMES)
        if fee:
            out["usefee"] = fee
    if not _first(out, _HOURS_KEYS):
        hours = _info_value(info_rows, _INFO_HOURS_NAMES)
        if hours:
            out["usetime"] = hours
    return out


# 한글(완성형·자모·호환자모) 문자 클래스. 표시 문자열에서 한글을 정확히 제거한다.
_HANGUL = r"가-힣ᄀ-ᇿ㄰-㆏ꥠ-꥿ힰ-퟿"
_HANGUL_RE = re.compile(f"[{_HANGUL}]")
# 한글이 든 괄호 묶음(소/대/중/꺾쇠/모서리). 소괄호는 1단계 중첩까지 균형 매칭
# ('동대문디자인플라자 (DDP)' 같은 내부 영문 괄호 포함 통째 제거), 나머지는 비탐욕 매칭.
_BRACKET_PATS = (
    re.compile(r"\s*\[[^\[\]]*\]"),
    re.compile(r"\s*\((?:[^()]|\([^()]*\))*\)"),
    re.compile(r"\s*\{[^{}]*\}"),
    re.compile(r"\s*<[^<>]*>"),
    re.compile(r"\s*「[^」]*」"),
    re.compile(r"\s*『[^』]*』"),
)
_HANGUL_RUN_RE = re.compile(f"[{_HANGUL}]+(?:[\\s·]+[{_HANGUL}]+)*")
# 영문 '이름'이 남았는지 — 숫자·기호만으론 이름이 못 되므로 ASCII 글자 기준으로 본다.
_LATIN_LETTER_RE = re.compile(r"[A-Za-z]")


def _strip_hangul_brackets(text: str) -> str:
    """한글이 든 괄호 묶음을 제거(2회 — 중첩 잔여 대응). 영문만 든 괄호는 보존.
    english_display 1단계와 동일 — 표시가 '로마자화된 한글'인지 판정(title_original)에 공유한다."""
    t = text
    for _ in range(2):
        for pat in _BRACKET_PATS:
            t = pat.sub(lambda m: "" if _HANGUL_RE.search(m.group()) else m.group(), t)
    return t


# ── 로마자화(국어의 로마자 표기법, 음절 기반·음절 간 음운동화 없음) ──
# 외국인 FIT 대상이라 한글만 있는 공식 명칭(서울 행사 등)을 '발음 보존'해 읽을 수 있게 바꾼다.
# 의미 번역이 아니다: '한글날' → 'Hangeulnal'(X 'A Day of Hangeul'). 결정론·오프라인
# (LLM/네트워크 호출 없음). 설치형 lib(hangul-romanize 0.1.0)는 '서울'을 'seo-ul',
# '북촌'을 'bugchon'으로 내는 등 표기가 낯설어 쓰지 않고 표준 RR 매핑을 직접 둔다.
_RR_CHO = [
    "g",
    "kk",
    "n",
    "d",
    "tt",
    "r",
    "m",
    "b",
    "pp",
    "s",
    "ss",
    "",
    "j",
    "jj",
    "ch",
    "k",
    "t",
    "p",
    "h",
]
_RR_JUNG = [
    "a",
    "ae",
    "ya",
    "yae",
    "eo",
    "e",
    "yeo",
    "ye",
    "o",
    "wa",
    "wae",
    "oe",
    "yo",
    "u",
    "wo",
    "we",
    "wi",
    "yu",
    "eu",
    "ui",
    "i",
]
_RR_JONG = [
    "",
    "k",
    "k",
    "k",
    "n",
    "n",
    "n",
    "t",
    "l",
    "k",
    "m",
    "p",
    "l",
    "l",
    "l",
    "l",
    "m",
    "p",
    "p",
    "t",
    "t",
    "ng",
    "t",
    "t",
    "k",
    "t",
    "p",
    "t",
]
_HANGUL_SYL_RUN_RE = re.compile(r"[가-힣]+")


def _romanize_syllable(ch: str) -> str:
    """완성형 한글 음절 1자 → RR. 초성+중성+종성 조합. 비음절 문자는 그대로 둔다."""
    code = ord(ch) - 0xAC00
    if 0 <= code < 11172:
        return _RR_CHO[code // 588] + _RR_JUNG[(code % 588) // 28] + _RR_JONG[code % 28]
    return ch


def _romanize(text: str) -> str:
    """문자열 속 한글 음절 런을 RR 로(런별 첫 글자 대문자). 비한글(영문·숫자·기호)은 보존."""

    def repl(m: re.Match[str]) -> str:
        r = "".join(_romanize_syllable(c) for c in m.group())
        return r[:1].upper() + r[1:] if r else r

    return _HANGUL_SYL_RUN_RE.sub(repl, text or "")


# ── 외래어(영어·외국어를 한글로 적은 것) → 영어 복원 사전 ──
# 행사·공연·장소 제목엔 '발음대로 적힌 영어'(글로벌·콘서트·페스티벌…)가 흔한데, 그대로
# 로마자화하면 'Geulrobeol·Konseoteu' 같은 소음이 된다. 로마자화 '전에' 이 사전으로
# 원래 영어를 되살린다. 의미 번역이 아니라 '원 영어 표기 복원'만 하고(한글날→Hangeulnal은
# 그대로), 사전에 없는 한글은 기존대로 발음 보존 로마자화한다. 결정론·오프라인.
# 긴 표제부터 매칭한다(아트나이트 > 아트/나이트). 오탐 위험이 큰 1음절 외래어(홀·돔·쇼·
# 북·데이 등 — 네이티브 한국어에 섞여들 수 있음)와 '파트'(아파트에 매칭)는 일부러 제외.
_LOANWORDS = {
    # 행사·형식
    "페스티벌": "Festival", "페스티발": "Festival", "콘서트": "Concert",
    "아트나이트": "Art Night", "비엔날레": "Biennale", "카니발": "Carnival",
    "퍼레이드": "Parade", "쇼케이스": "Showcase", "엑스포": "Expo",
    "페어": "Fair", "마켓": "Market", "투어": "Tour", "워크숍": "Workshop",
    "워크샵": "Workshop", "세미나": "Seminar", "컨퍼런스": "Conference",
    "포럼": "Forum", "심포지엄": "Symposium", "프로젝트": "Project",
    "컬렉션": "Collection", "에디션": "Edition", "갈라": "Gala",
    # 공연·음악
    "뮤지컬": "Musical", "오페라": "Opera", "오케스트라": "Orchestra",
    "발레": "Ballet", "리사이틀": "Recital", "클래식": "Classic",
    "재즈": "Jazz", "힙합": "Hip-hop", "버스킹": "Busking", "밴드": "Band",
    "댄스": "Dance", "라이브": "Live", "뮤직": "Music", "필름": "Film",
    "시네마": "Cinema",
    # 장소
    "뮤지엄": "Museum", "갤러리": "Gallery", "센터": "Center",
    "플라자": "Plaza", "스퀘어": "Square", "테마파크": "Theme Park",
    "파크": "Park", "타워": "Tower", "스튜디오": "Studio", "라운지": "Lounge",
    "스테이지": "Stage", "아레나": "Arena", "스타디움": "Stadium",
    "컨벤션": "Convention", "스트리트": "Street", "빌리지": "Village",
    "가든": "Garden",
    # 주제·일반
    "글로벌": "Global", "케이팝": "K-POP", "코리아": "Korea",
    "아티스트": "Artist", "아트": "Art", "나이트": "Night", "위크": "Week",
    "패션": "Fashion", "뷰티": "Beauty", "푸드": "Food", "와인": "Wine",
    "커피": "Coffee", "미디어": "Media", "디지털": "Digital",
    "아카이브": "Archive", "크리스마스": "Christmas", "할로윈": "Halloween",
    "스페셜": "Special", "시즌": "Season",
}
_LOANWORD_RE = re.compile("|".join(sorted(_LOANWORDS, key=len, reverse=True)))


def _apply_loanwords(text: str) -> str:
    """한글로 적힌 영어·외래어를 영어로 복원(로마자화 '전'에). 치환어 양옆에 공백을 넣어
    인접 한글·영문과 붙지 않게 하고(공백은 뒤 단계에서 축약), 사전에 없는 한글은 그대로 둬
    발음 보존 로마자화로 넘긴다. 예: '서울글로벌 아트나이트' → '서울 Global  Art Night '."""
    if not text:
        return text
    return _LOANWORD_RE.sub(lambda m: f" {_LOANWORDS[m.group()]} ", text)


# 영국식 → 미국식 철자(관광 영문 텍스트 빈출 — 공식 영문 API 가 영국식으로 주는 경우 통일).
_BRITISH_TO_AMERICAN = {
    "centre": "center",
    "centres": "centers",
    "theatre": "theater",
    "theatres": "theaters",
    "colour": "color",
    "colours": "colors",
    "favour": "favor",
    "favourite": "favorite",
    "honour": "honor",
    "harbour": "harbor",
    "neighbour": "neighbor",
    "programme": "program",
    "catalogue": "catalog",
    "organisation": "organization",
    "organised": "organized",
    "recognised": "recognized",
    "metre": "meter",
    "metres": "meters",
    "litre": "liter",
    "defence": "defense",
    "licence": "license",
    "traveller": "traveler",
    "travelling": "traveling",
    "jewellery": "jewelry",
    "artefact": "artifact",
    "storey": "story",
    "grey": "gray",
    "cosy": "cozy",
    "moustache": "mustache",
    "sceptical": "skeptical",
    "kerb": "curb",
}
_BRITISH_RE = re.compile(
    r"\b(" + "|".join(sorted(_BRITISH_TO_AMERICAN, key=len, reverse=True)) + r")\b",
    re.IGNORECASE,
)


def _match_case(src: str, dst: str) -> str:
    """원 단어의 대소문자 꼴을 치환어에 입힌다(ALLCAPS/첫글자대문자/소문자)."""
    if src.isupper():
        return dst.upper()
    if src[:1].isupper():
        return dst[:1].upper() + dst[1:]
    return dst


def to_american(text: str) -> str:
    """영국식 철자를 미국식으로(단어 단위·대소문자 보존). 매칭 없으면 원문 그대로."""
    if not text:
        return text
    return _BRITISH_RE.sub(
        lambda m: _match_case(m.group(), _BRITISH_TO_AMERICAN[m.group().lower()]), text
    )


def _dedup_adjacent_words(text: str) -> str:
    """인접한 동일 단어(대소문자 무시)를 1개로 축약한다. 한글 로마자화가 바로 옆 영문과
    겹칠 때를 정리한다 — '경복궁 Gyeongbokgung' → 'Gyeongbokgung Gyeongbokgung' →
    'Gyeongbokgung'. 'X (X)' 괄호 메아리도 함께 접는다. 'K-POP' 처럼 서로 다른 단어는 보존."""
    # 'word (word)' → 'word'
    text = re.sub(r"\b(\w+)\b\s*\(\s*\1\s*\)", r"\1", text, flags=re.IGNORECASE)
    # 'word word [word …]' → 'word'
    text = re.sub(r"\b(\w+)\b(?:\s+\1\b)+", r"\1", text, flags=re.IGNORECASE)
    return text


def english_display(text: str | None) -> str:
    """표시 문자열을 외국인 FIT 가 읽을 영문 표기로(정규식·로마자화, 사실 생성 아님).

    예: 'Alive Museum (Insa-dong Branch) [박물관은 살아있다(인사동점)]'
        → 'Alive Museum (Insa-dong Branch)'; '서울서예박물관' → 'Seoulseoyebakmulgwan';
        '서울 K-POP Festival' → 'Seoul K-POP Festival'.
    1) 한글이 든 괄호 묶음 제거 — 괄호 속 한글은 보통 '전체 명칭의 번역 중복'이라(예 영문
       'Dongdaemun Design Plaza' + '(동대문디자인플라자)') 로마자화하면 'Dongdaemundijainpeullaja'
       같은 소음이 되므로 제거한다. 영문만 든 괄호는 보존.
    2) 외래어 복원 → 로마자화. 한글로 적힌 영어·외래어(글로벌·콘서트…)는 _apply_loanwords 로
       원 영어 표기를 되살리고('서울글로벌 아트나이트'→'Seoul Global Art Night'), 사전에 없는
       한글만 **발음 보존 로마자화**(혼합 제목의 한글도 지우지 않고 읽게 — '한글날'→'Hangeulnal',
       의미 번역 아님). 결정론·오프라인(LLM 없음).
    3) 인접 중복어 축약으로 '경복궁 Gyeongbokgung' 같은 로마자화-영문 중복을 접고, 미국영어로
       통일(centre→center). 모두 비면(괄호 제거로 사라짐) 원문 전체를 로마자화해 이름을 살린다.
    """
    # 1) 한글 포함 괄호 묶음 제거. 영문만 든 괄호는 유지.
    t = _strip_hangul_brackets(text or "")
    # 2) 외래어를 영어로 복원한 뒤, 남은 인라인 한글을 로마자화(제거하지 않는다 — 발음 보존).
    t = _romanize(_apply_loanwords(t))
    # 3) 정리: 빈 괄호·중복 공백·괄호 안쪽 공백·양끝 구분자.
    t = re.sub(r"[\(\[\{<「『]\s*[\)\]\}>」』]", "", t)
    t = re.sub(r"\s+([)\]\}>」』])", r"\1", t)
    t = re.sub(r"([(\[\{<「『])\s+", r"\1", t)
    t = re.sub(r"\s{2,}", " ", t).strip(" \t-·,/|")
    t = _dedup_adjacent_words(t).strip()
    if _LATIN_LETTER_RE.search(t):
        return to_american(t)
    # 괄호 제거로 이름이 사라진 경우 등 — 원문 전체를 외래어 복원+로마자화(이름을 지우지 않는다).
    romanized = _dedup_adjacent_words(
        re.sub(r"\s{2,}", " ", _romanize(_apply_loanwords(text or "")))
        .strip(" \t-·,/|")
        .strip()
    )
    return to_american(romanized)


def _strip_html(s: str | None) -> str:
    return (
        re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", s or ""))
        .replace("&nbsp;", " ")
        .strip()
    )


def _trim_at_word(text: str, limit: int) -> str:
    """limit 초과 시 **단어 경계**에서 자르고 '…' — 글자수 컷으로 단어 중간을 끊지 않는다
    (가격 등 자유기술 텍스트의 짤림 방지). 전체는 공식 링크/상세로 확인."""
    text = text.strip()
    if len(text) <= limit:
        return text
    cut = text[:limit].rsplit(" ", 1)[0].rstrip(" ,/·-")
    return (cut or text[:limit].rstrip()) + "…"


def _first(d: dict[str, Any], keys: list[str]) -> str:
    for k in keys:
        v = d.get(k)
        if v and str(v).strip():
            return str(v).strip()
    return ""


def _href(html: str | None) -> str:
    m = re.search(r'href="([^"]+)"', html or "")
    return m.group(1) if m else ""


def normalize_price(raw: str) -> PriceInfo:
    """요금 문자열 → 정규화. 빈값·모호값은 unknown(무료 추정 금지)."""
    text = _strip_html(raw)
    if not text:
        return PriceInfo(
            status=PriceStatus.UNKNOWN,
            display="Price needs checking",
            raw=None,
            provenance=Provenance.UNCONFIRMED,
        )
    low = text.lower()
    has_num = bool(re.search(r"\d", text))
    mentions_free = "free" in low or "무료" in text
    mentions_paid = "paid" in low or "유료" in text or "charge" in low

    if mentions_free and not has_num:
        return PriceInfo(
            status=PriceStatus.FREE,
            display="Free",
            raw=text,
            provenance=Provenance.CONFIRMED,
        )
    if mentions_free and has_num:
        # 일부 무료·일부 유료 → 애매(대표가격으로 쓰지 않음)
        return PriceInfo(
            status=PriceStatus.PARTIAL_OR_AMBIGUOUS,
            display=_trim_at_word(text, 60),
            raw=text,
            provenance=Provenance.CONFIRMED,
        )
    if has_num:
        return PriceInfo(
            status=PriceStatus.PAID,
            display=_trim_at_word(text, 60),
            raw=text,
            provenance=Provenance.CONFIRMED,
        )
    if mentions_paid:
        # 유료 확인·금액 미상
        return PriceInfo(
            status=PriceStatus.UNKNOWN,
            display="Paid · amount needs checking",
            raw=text,
            provenance=Provenance.UNCONFIRMED,
        )
    # 모호/자유기술 → 미확인
    return PriceInfo(
        status=PriceStatus.UNKNOWN,
        display="Price needs checking",
        raw=text,
        provenance=Provenance.UNCONFIRMED,
    )


# 공식 권장 방문시간 필드(문화시설 spendtime·행사 spendtimefestival). 있을 때만 사용.
_SPEND_KEYS = ["spendtime", "spendtimefestival"]


def parse_duration_min(text: str | None) -> int | None:
    """'180 minutes'·'1시간 30분'·'about 2 hours' → 분. 파싱 불가/빈값은 None(추정 금지)."""
    t = _strip_html(text).lower()
    if not t:
        return None
    total = 0
    found = False
    for h in re.findall(r"(\d+)\s*(?:hours?|hrs?|시간)", t):
        total += int(h) * 60
        found = True
    for m in re.findall(r"(\d+)\s*(?:minutes?|mins?|분)", t):
        total += int(m)
        found = True
    return total if found and total > 0 else None


def official_visit_minutes(intro: dict[str, Any]) -> int | None:
    """공식 권장 방문 소요시간(분). spendtime/spendtimefestival 있을 때만, 없으면 None."""
    return parse_duration_min(_first(intro, _SPEND_KEYS))


def normalize_hours(intro: dict[str, Any]) -> TimeInfo | None:
    """운영시간 → 카드용 간결 표시값. 없거나 '그날 한 시간대'로 요약 불가(계절·문의 등)면
    None(미확인 — 호출부가 'Hours need checking' 플래그 + 공식 링크로). 글자수 컷으로 단어
    중간을 끊지 않는다(텍스트 짤림 방지) — summarize_hours 가 시각 범위만 결정론으로 뽑는다."""
    raw = _first(intro, _HOURS_KEYS)
    if not raw:
        return None
    clean = _strip_html(raw)
    display = summarize_hours(clean)
    # 요약 불가(복수범위·계절·caveat)여도 raw 는 버리지 않는다 — 카드는 display(단일범위 확실)가
    # 있을 때만 쓰고, 상세는 raw 전체를 보여준다(가격 raw 와 동일 패턴). display 는 None 일 수 있다.
    return TimeInfo(display=display, raw=clean, provenance=Provenance.CONFIRMED)


def _valid_coords(item: dict[str, Any]) -> tuple[float, float] | None:
    try:
        lat = float(item.get("mapy"))
        lng = float(item.get("mapx"))
    except (TypeError, ValueError):
        return None
    if _LAT_RANGE[0] <= lat <= _LAT_RANGE[1] and _LNG_RANGE[0] <= lng <= _LNG_RANGE[1]:
        return lat, lng
    return None


# ── 서울문화포털 문화행사(culturalEventInfo) 정규화 ─────────────────────────────
# CODENAME(분류) → 유형. 미상/일반은 festival_event(행사 포털 기본).
_SEOUL_TYPE_KEYWORDS: list[tuple[tuple[str, ...], ExperienceType]] = [
    (("전시", "미술"), ExperienceType.EXHIBITION),
    (
        ("공연", "콘서트", "연극", "뮤지컬", "클래식", "무용", "국악", "오페라"),
        ExperienceType.PERFORMANCE,
    ),
    (("교육", "체험"), ExperienceType.HANDS_ON),
    (("축제", "행사"), ExperienceType.FESTIVAL_EVENT),
]


def _seoul_type(codename: str | None) -> ExperienceType:
    name = str(codename or "")
    for keywords, etype in _SEOUL_TYPE_KEYWORDS:
        if any(k in name for k in keywords):
            return etype
    return ExperienceType.FESTIVAL_EVENT


def _seoul_yyyymmdd(s: Any) -> str:
    """'2024-05-01 00:00:00.0' / '2024-05-01' → '20240501'. 파싱 불가면 ''(추정 금지)."""
    digits = re.sub(r"\D", "", str(s or ""))[:8]
    return digits if len(digits) == 8 else ""


def _valid_seoul_coords(row: dict[str, Any]) -> tuple[float, float] | None:
    """LOT/LAT 두 값을 범위로 안전 할당(이 API 는 이름이 관례와 뒤바뀜).

    위도(33–39)·경도(124–132) 범위에 각각 들어맞는 값으로 (lat, lng) 재구성한다.
    두 역할이 모두 채워질 때만 유효. 아니면 None(drop — 지도 핀 불가).
    """
    vals: list[float] = []
    for key in ("LOT", "LAT"):
        try:
            vals.append(float(str(row.get(key) or "").strip()))
        except (TypeError, ValueError):
            continue
    lat = next((v for v in vals if _LAT_RANGE[0] <= v <= _LAT_RANGE[1]), None)
    lng = next((v for v in vals if _LNG_RANGE[0] <= v <= _LNG_RANGE[1]), None)
    if lat is None or lng is None:
        return None
    return lat, lng


def seoul_event_intro(row: dict[str, Any]) -> dict[str, Any]:
    """서울 행사 row → 기간 판정용 합성 intro(STRTDATE/END_DATE 만). 운영시간은 미제공.

    기존 결정론 판정(judge_event_period·judge_timing)을 소스 불문 그대로 재사용하기 위한
    어댑터. 시간값을 지어내지 않는다 — 날짜만 매핑(없으면 빈값 → 미확인 판정).
    """
    return {
        "eventstartdate": _seoul_yyyymmdd(row.get("STRTDATE")),
        "eventenddate": _seoul_yyyymmdd(row.get("END_DATE")),
    }


def _seoul_price_text(row: dict[str, Any]) -> str:
    """요금 텍스트: USE_FEE 우선, 없으면 IS_FREE('무료'/'유료')만 신호로.

    빈값을 free 로 매핑하지 않는다(불변식). IS_FREE='무료'는 공식 소스의 '확인된 무료'.
    """
    fee = str(row.get("USE_FEE") or "").strip()
    if fee:
        return fee
    is_free = str(row.get("IS_FREE") or "").strip()
    return is_free  # '무료'→FREE, '유료'→UNKNOWN(금액 미확인), ''→UNKNOWN


def normalize_seoul_event(row: dict[str, Any]) -> Candidate | None:
    """서울문화포털 행사 row → Candidate. 좌표 이상치는 None(drop).

    제목은 english_display 로 한글 제거(표시 영문화). 단 영문 이름이 남지 않으면(한글
    축제명 등) 원문 한글을 그대로 유지한다(이름을 지우지 않음). 출처 배지 source='seoul'.
    """
    coords = _valid_seoul_coords(row)
    if coords is None:
        return None
    lat, lng = coords
    raw_title = str(row.get("TITLE") or "").strip()
    title = english_display(raw_title)
    if not title:
        return None
    # 한글이 든 원문만 보존(온디맨드 번역용). 영문 원문은 번역 불필요.
    title_original = raw_title if _HANGUL_RE.search(raw_title) else None

    price = normalize_price(_seoul_price_text(row))
    # 행사는 '그날 안의 운영시간'이 구조화돼 있지 않다 → 미확인(시간 지어내지 않음).
    time_info = None

    flags: list[UnconfirmedFlag] = []
    if price.status == PriceStatus.UNKNOWN:
        flags.append(UnconfirmedFlag(text="Price needs checking"))
    flags.append(UnconfirmedFlag(text="Hours need checking"))

    links: list[OfficialLink] = []
    link = str(row.get("ORG_LINK") or row.get("HMPG_ADDR") or "").strip()
    if link.startswith("http"):
        links.append(OfficialLink(label="View official details", url=link))

    image = str(row.get("MAIN_IMG") or "").strip() or None

    # 안정적 id: 좌표 없는 소스라 TITLE+시작일로 합성(중복제거·재조회 일관성).
    uid = f"{title}|{_seoul_yyyymmdd(row.get('STRTDATE'))}"

    etype = _seoul_type(row.get("CODENAME"))
    return Candidate(
        id=f"seoul-{abs(hash(uid)) % (10**10)}",
        title=title,
        title_original=title_original,
        source="seoul",
        type=etype,
        status=ResultStatus.CHECK_NEEDED,  # 판정 전(orchestrator 에서 3상태 산정)
        reasons=[],
        time=time_info,
        price=price,
        movement=None,
        flags=flags,
        image_url=image,
        official_links=links,
        lat=lat,
        lng=lng,
        reservation=judge_reservation(etype),  # 유형만으로(서울 소스는 intro 신호 없음)
    )


def normalize_candidate(
    item: dict[str, Any], intro: dict[str, Any], common: dict[str, Any]
) -> Candidate | None:
    """list item + 상세(intro/common) → Candidate. 이상치는 None(drop)."""
    coords = _valid_coords(item)
    if coords is None:
        return None
    lat, lng = coords
    raw_title = str(item.get("title") or "").strip()
    title = english_display(raw_title)
    if not title:
        return None
    # title_original = Translate 소스. '우리가 한글을 로마자화해 표시한' 경우에만 둔다.
    # english_display 가 '한글 괄호 묶음'은 표시에서 지우므로(예: "The Children's Museum… (국립
    # 민속…)" → "The Children's Museum…"), 괄호 한글을 걷어낸 뒤에도 인라인 한글이 남을 때만
    # 보존한다. 괄호 안에만 한글이 있던 경우(표시는 순수 영문)엔 번역해도 안 바뀌므로 None —
    # Translate 버튼이 영어 제목 카드에 불필요하게 뜨던 것 방지.
    title_original = (
        raw_title if _HANGUL_RE.search(_strip_hangul_brackets(raw_title)) else None
    )

    etype = _TYPE_MAP.get(str(item.get("contenttypeid")), ExperienceType.DEFAULT)
    price = normalize_price(_first(intro, _FEE_KEYS))
    time_info = normalize_hours(intro)

    flags: list[UnconfirmedFlag] = []
    if price.status == PriceStatus.UNKNOWN:
        flags.append(UnconfirmedFlag(text="Price needs checking"))
    # 운영시간 미확인(raw 조차 없음) 또는 요약 불가(display None — 카드엔 단일범위를 못 보임)면
    # 플래그. raw 는 상세에 노출되지만 카드 레벨에선 '확인 필요'로 투명 표기 유지.
    if time_info is None or time_info.display is None:
        flags.append(UnconfirmedFlag(text="Hours need checking"))

    # 공식 링크: VisitKorea 영문 상세(출처 명시 'VISITKOREA')를 우선, 시설 자체 공식 홈페이지는
    # 있을 때 'Official Website'로 함께 제공한다(둘은 다른 공식 출처 — 사용자가 구분해 열 수 있게).
    links: list[OfficialLink] = []
    content_id = item.get("contentid")
    if content_id:
        links.append(
            OfficialLink(
                label="View on VISITKOREA",
                url=_VISITKOREA_EN_DETAIL.format(cid=content_id),
            )
        )
    homepage = _href(common.get("homepage", ""))
    if homepage:
        links.append(OfficialLink(label="Official Website", url=homepage))

    image = item.get("firstimage") or None  # 공식 이미지만, 없으면 None(제외 안 함)

    return Candidate(
        id=f"tour-{item.get('contentid')}",
        title=title,
        title_original=title_original,
        type=etype,
        visit_minutes=official_visit_minutes(intro),  # 공식 권장 방문시간(있을 때만)
        status=ResultStatus.CHECK_NEEDED,  # 판정 전(A3에서 3상태 산정)
        reasons=[],  # Reason은 A5(LLM)
        time=time_info,
        price=price,
        movement=None,  # 도보 거리/시간은 A4(Tmap)
        flags=flags,
        image_url=image,
        official_links=links,
        lat=lat,
        lng=lng,
        reservation=judge_reservation(etype, intro),  # 예약 적용성(유형+공식 신호)
    )
