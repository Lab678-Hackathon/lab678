from langchain_core.language_models import BaseChatModel
from app.config import settings


def get_llm(streaming: bool = False) -> BaseChatModel:
    """
    LLM_PROVIDER 환경변수로 provider 선택.
    openai | naito — 코드 변경 없이 .env만 변경.
    """
    if settings.llm_provider == "naito":
        from app.services.llm.naito import build_naito_llm
        return build_naito_llm(streaming=streaming)

    from app.services.llm.openai import build_openai_llm
    return build_openai_llm(streaming=streaming)


def get_embedding_model():
    """OpenAI Embeddings — RAG 전용."""
    from langchain_openai import OpenAIEmbeddings
    return OpenAIEmbeddings(
        model=settings.openai_embedding_model,
        api_key=settings.openai_api_key,
    )
