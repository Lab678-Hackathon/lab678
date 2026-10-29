from langchain_openai import ChatOpenAI
from app.config import settings
from app.core.exceptions import ConfigurationError


def build_naito_llm(streaming: bool = False) -> ChatOpenAI:
    """
    Naito API를 OpenAI 호환 포맷으로 호출.
    endpoint·인증·모델은 주최 측 문서 확인 후 .env에 입력.
    """
    if not settings.naito_base_url:
        raise ConfigurationError("NAITO_BASE_URL not set")
    if not settings.naito_api_key:
        raise ConfigurationError("NAITO_API_KEY not set")
    if not settings.naito_model:
        raise ConfigurationError("NAITO_MODEL not set")

    return ChatOpenAI(
        model=settings.naito_model,
        api_key=settings.naito_api_key,
        base_url=settings.naito_base_url,
        streaming=streaming,
        temperature=0,
    )
