"""
asyncio 병렬 소스 조회 패턴.
konnect: agent/orchestrator._fetch_pool 참조.
소스 하나 실패해도 나머지 결과는 사용한다.
"""
import asyncio
from app.core.exceptions import ExternalSourceError


async def fetch_all_sources(param: str) -> list[dict]:
    """여러 소스를 병렬 조회. 실패한 소스는 빈 리스트로 대체."""
    results = await asyncio.gather(
        _safe_fetch(source_a, param),
        _safe_fetch(source_b, param),
        return_exceptions=False,
    )
    combined = []
    for r in results:
        combined.extend(r)
    return combined


async def _safe_fetch(fetch_fn, param: str) -> list[dict]:
    """단일 소스 조회. ExternalSourceError는 빈 리스트로 graceful 처리."""
    try:
        return await fetch_fn(param)
    except ExternalSourceError:
        return []
