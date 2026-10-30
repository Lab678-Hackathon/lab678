"""Topic 스키마 템플릿.

이 파일을 복사하거나 수정해 주제별 Pydantic 모델을 정의한다.
핵심 원칙: 미확인 필드는 None / "unknown". 절대 추정값으로 채우지 않는다.

교체 대상:
  - DiscoverRequest  ← 사용자 입력 스키마
  - Candidate        ← 추천 결과 1건 스키마
  - DiscoverResponse ← API 응답 데이터 스키마
"""

from __future__ import annotations

from enum import Enum

from pydantic import BaseModel, Field


class ResultStatus(str, Enum):
    """
    결과 3상태. UI는 이 값으로 색·아이콘·문구를 분기한다.
    - confirmed:   사실 확인 완료, 이용 가능
    - unconfirmed: 일부 정보 미확인 (가격·시간 등)
    - alternative: 원하는 조건은 아니지만 대안으로 제시
    """

    CONFIRMED = "confirmed"
    UNCONFIRMED = "unconfirmed"
    ALTERNATIVE = "alternative"


class Candidate(BaseModel):
    """
    추천 후보 1건.
    LLM 출력에서 직접 받지 않는다 — sources + domain 파이프라인으로 구성.
    """

    id: str
    name: str
    description: str
    status: ResultStatus
    price: str | None = None  # "free" | "paid:N원" | "unknown"
    location: str | None = None  # 주소 또는 설명
    reason: str | None = None  # LLM이 생성한 근거 설명 (확인된 사실만)
    unconfirmed: list[str] = Field(default_factory=list)  # 미확인 항목 목록


class DiscoverRequest(BaseModel):
    """사용자 입력. 주제에 맞게 필드를 추가·교체한다."""

    query: str = Field(..., min_length=1, description="자연어 검색어 또는 조건")
    max_results: int = Field(default=4, ge=1, le=10)


class DiscoverResponse(BaseModel):
    """API 응답 데이터. Envelope[DiscoverResponse]로 감싸서 반환."""

    candidates: list[Candidate]
    total: int
    notices: list[str] = Field(default_factory=list)  # 사용자에게 알릴 메시지
