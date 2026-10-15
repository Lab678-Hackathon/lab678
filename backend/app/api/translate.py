"""온디맨드 번역 라우터 — POST /api/translate.

얇게 유지: 번역은 agent/translate 가 담당. 한글 유래 제목·가격 원문을 받아 영어 매핑을
돌려준다. 키 없음·실패는 ExternalSourceError → 공통 핸들러가 봉투 ok=false 로 변환하고,
프론트는 원문(결정론 표시)을 그대로 유지한다.
"""

from __future__ import annotations

from fastapi import APIRouter

from app.agent.translate import translate_ko_en
from app.core.trace import Trace
from app.models.envelope import Envelope
from app.models.translate import TranslateRequest, TranslateResult

router = APIRouter(prefix="/api", tags=["translate"])


@router.post("/translate", response_model=Envelope[TranslateResult])
async def translate(req: TranslateRequest) -> Envelope[TranslateResult]:
    trace = Trace()
    mapping = await translate_ko_en(req.texts)
    return Envelope.success(
        data=TranslateResult(translations=mapping), trace_id=trace.trace_id
    )
