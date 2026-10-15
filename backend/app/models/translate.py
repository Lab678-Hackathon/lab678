"""온디맨드 번역 입출력 스키마 (POST /api/translate).

한글 유래 표시 문자열(제목 원문·가격 원문)을 모아 보내면 {원문: 영어} 매핑으로 돌려준다.
기본 표시는 결정론이고, 이 응답은 '결과 상단 Translate' 토글이 켜질 때만 쓴다.
"""

from __future__ import annotations

from pydantic import BaseModel, Field


class TranslateRequest(BaseModel):
    # 번역할 한글 원문 목록(중복 허용 — 서버가 dedup). 상한은 과도한 호출 방지.
    texts: list[str] = Field(default_factory=list, max_length=200)


class TranslateResult(BaseModel):
    # 원문 → 영어 번역. 입력에 없던 키는 포함하지 않는다.
    translations: dict[str, str] = Field(default_factory=dict)
