from langchain_openai import ChatOpenAI
from app.config import settings


def build_openai_llm(streaming: bool = False) -> ChatOpenAI:
    return ChatOpenAI(
        model=settings.openai_model,
        api_key=settings.openai_api_key,
        streaming=streaming,
        temperature=0,
    )
