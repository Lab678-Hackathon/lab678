"""
FastAPI 라우터 템플릿.
복사 후 [FEATURE], [InputModel], [OutputModel] 교체.
main.py: app.include_router([feature].router, prefix="/api")
"""
from fastapi import APIRouter, Depends
from app.core.auth import get_optional_user, AuthUser
from app.core.exceptions import ValidationFailure
from app.core.trace import Trace
from app.models.common import Envelope
from app.models.[topic] import [InputModel], [OutputModel]
from app.services.[feature] import run_[feature]

router = APIRouter()


@router.post("/[feature]", response_model=Envelope[[OutputModel]])
async def [feature]_endpoint(
    body: [InputModel],
    user: AuthUser | None = Depends(get_optional_user),
) -> Envelope[[OutputModel]]:
    trace = Trace()
    result = await run_[feature](body, user=user, trace=trace)
    return Envelope(ok=True, data=result)
