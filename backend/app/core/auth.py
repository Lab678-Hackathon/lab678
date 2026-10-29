from dataclasses import dataclass
from functools import lru_cache

import httpx
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from app.config import settings
from app.core.exceptions import AuthError

_bearer = HTTPBearer(auto_error=False)


@dataclass
class AuthUser:
    id: str
    is_anonymous: bool
    role: str


@lru_cache(maxsize=1)
def _get_jwks() -> dict:
    """JWKS를 한 번 로드하고 캐시. 재시작 시 갱신."""
    url = f"{settings.supabase_url}/auth/v1/.well-known/jwks.json"
    resp = httpx.get(url, timeout=5.0)
    resp.raise_for_status()
    return resp.json()


async def verify_token(token: str) -> AuthUser:
    try:
        jwks = _get_jwks()
        header = jwt.get_unverified_header(token)
        key = next(
            (k for k in jwks.get("keys", []) if k.get("kid") == header.get("kid")),
            jwks["keys"][0] if jwks.get("keys") else None,
        )
        if not key:
            raise AuthError("No matching JWKS key")

        payload = jwt.decode(token, key, algorithms=["RS256", "HS256"])
        return AuthUser(
            id=payload["sub"],
            is_anonymous=payload.get("is_anonymous", False),
            role=payload.get("role", "authenticated"),
        )
    except (JWTError, KeyError, StopIteration) as e:
        raise AuthError(f"Invalid token: {e}")


async def get_optional_user(
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> AuthUser | None:
    if not creds:
        return None
    return await verify_token(creds.credentials)


async def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> AuthUser:
    if not creds:
        raise AuthError()
    return await verify_token(creds.credentials)
