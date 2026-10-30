from typing import Generic, TypeVar
from pydantic import BaseModel

T = TypeVar("T")


class ErrorDetail(BaseModel):
    code: str
    message: str


class Envelope(BaseModel, Generic[T]):
    """모든 API 응답의 공통 포맷."""
    ok: bool
    data: T | None = None
    error: ErrorDetail | None = None
    trace: list[dict] | None = None  # 개발 환경에서만 포함

    @classmethod
    def ok_response(cls, data: T, trace: list[dict] | None = None) -> "Envelope[T]":
        return cls(ok=True, data=data, trace=trace)

    @classmethod
    def error_response(cls, code: str, message: str) -> "Envelope[None]":
        return cls(ok=False, error=ErrorDetail(code=code, message=message))
