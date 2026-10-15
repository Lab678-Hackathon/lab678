"""한글 콘텐츠(제목·가격 등) → 영어 의미 번역 (온디맨드, LLM).

기본 표시는 결정론(로마자화·₩금액 정규화)으로 항상 읽히게 두고, 사용자가 '결과 상단
Translate' 토글을 켤 때만 이 함수가 호출된다(추천 핫패스 아님 — 지연은 토글 1회로 격리).

신뢰(§6): 번역 전용이다. 사실(가격·운영시간·가능성)을 새로 만들지 않는다 — 숫자·₩금액·
고유명사는 그대로 보존하고 '뜻'만 영어로 옮긴다. 실패/키 없음은 graceful(ExternalSourceError
→ 봉투 ok=false) 로 올려, 프론트는 원문(결정론 표시)을 유지한다.

캐시: 같은 원문은 다시 호출하지 않도록 프로세스 메모리에 저장한다. 외부 '소스 데이터' 캐싱
금지 규약은 공식 API 응답에 대한 것이고, 여기 저장하는 건 우리 LLM 산출물이라 허용된다.
"""

from __future__ import annotations

import logging

from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from pydantic import BaseModel

from app.config import settings
from app.core.exceptions import ExternalSourceError

logger = logging.getLogger("konnect.agent")

# 원문 → 번역. 프로세스 생명주기 동안 유지(간단 캐시 — 규모상 LRU 불필요).
_CACHE: dict[str, str] = {}

_SYSTEM = (
    "You translate short Korean strings from a Seoul cultural-experience app into "
    "natural, concise English for a foreign tourist. The strings are event/place TITLES "
    "and PRICE descriptions. Rules: "
    "(1) Translate the MEANING faithfully; do NOT add, infer, or omit any information. "
    "(2) Keep every number and amount EXACTLY; render Korean Won as '₩' before the number "
    "(e.g. '전석 30,000원' -> 'All seats ₩30,000'). "
    "(3) Keep proper nouns, venue, brand, and member-program names as their established "
    "English or romanized form; never invent a meaning for a name. "
    "(4) If an input is already English, return it unchanged. "
    "Return exactly one translation per input, in the SAME ORDER as the input list."
)
_PROMPT = ChatPromptTemplate.from_messages(
    [
        ("system", _SYSTEM),
        ("human", "Translate each numbered line to English (keep order):\n{lines}"),
    ]
)


class _Out(BaseModel):
    """정렬된 번역 리스트(입력 순서와 1:1)."""

    translations: list[str]


async def translate_ko_en(texts: list[str]) -> dict[str, str]:
    """한글 문자열 목록 → {원문: 번역} 매핑. 중복 제거·캐시 적중분 제외 후 1회 배치 호출."""
    # 1) 정리 + 중복 제거(순서 유지).
    uniq: list[str] = []
    seen: set[str] = set()
    for t in texts:
        s = (t or "").strip()
        if s and s not in seen:
            seen.add(s)
            uniq.append(s)

    result: dict[str, str] = {}
    misses: list[str] = []
    for s in uniq:
        if s in _CACHE:
            result[s] = _CACHE[s]
        else:
            misses.append(s)
    if not misses:
        return result

    if not settings.openai_api_key:
        raise ExternalSourceError("translation unavailable: OpenAI key not configured")

    try:
        llm = ChatOpenAI(
            model=settings.agent_orchestrator_model,  # 짧은 번역 — 경량·저지연 모델
            temperature=0,
            api_key=settings.openai_api_key,
            timeout=20,
        )
        chain = _PROMPT | llm.with_structured_output(_Out)
        lines = "\n".join(f"{i + 1}. {s}" for i, s in enumerate(misses))
        out: _Out | None = await chain.ainvoke({"lines": lines})
        translated = list(out.translations) if out else []
    except Exception as e:  # noqa: BLE001 — 어떤 실패든 graceful(원문 유지)
        logger.warning("translate failed: %s", type(e).__name__)
        raise ExternalSourceError("translation failed") from e

    # 2) 순서 매핑(길이 불일치 방어 — 모자라면 그 항목은 원문 유지, 캐시엔 넣지 않음).
    for i, s in enumerate(misses):
        dst = translated[i].strip() if i < len(translated) and translated[i] else ""
        if dst:
            _CACHE[s] = dst
            result[s] = dst
        else:
            result[s] = s
    return result
