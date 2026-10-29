from typing import Literal
from pydantic import BaseModel, Field, field_validator

class AskRequest(BaseModel):
    question: str = Field(min_length=1, max_length=4000)

    @field_validator("question")
    @classmethod
    def strip_question(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("질문을 입력해 주세요.")
        return value.strip()

class Citation(BaseModel):
    source: str
    snippet: str
    similarity: float

class RagAnswer(BaseModel):
    answer: str
    grounded: bool
    status: Literal["not_configured", "no_evidence", "answered"]
    sources_count: int
    citations: list[Citation]
