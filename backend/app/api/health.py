from fastapi import APIRouter
from app.config import settings

router = APIRouter()


@router.get("/health")
async def health() -> dict:
    missing = settings.missing_keys()
    return {
        "ok": True,
        "env": settings.app_env,
        "llm_provider": settings.llm_provider,
        "rag": settings.rag_enabled,
        "config": "ok" if not missing else f"missing: {missing}",
    }
