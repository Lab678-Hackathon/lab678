"""
LLM structured output 호출 패턴.
konnect: agent/note_parser.py, agent/classify.py 참조.
"""
from pydantic import BaseModel
from langchain_core.prompts import ChatPromptTemplate
from app.services.llm.adapter import get_llm


class ParsedOutput(BaseModel):
    """LLM 출력 스키마 — 사실 필드(가격·좌표·시간) 포함 금지."""
    field_a: str
    field_b: list[str]


PROMPT = ChatPromptTemplate.from_messages([
    ("system", "당신은 ... 역할입니다. 주어진 텍스트에서 정보를 추출합니다."),
    ("human", "{input}"),
])


async def parse_input(text: str) -> ParsedOutput | None:
    """자연어 → 구조화 출력. 실패 시 None 반환 (예외 전파 안 함)."""
    llm = get_llm().with_structured_output(ParsedOutput)
    chain = PROMPT | llm
    try:
        result = await chain.ainvoke({"input": text})
        return result
    except Exception:
        return None
