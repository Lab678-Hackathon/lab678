from app.services.llm.adapter import get_embedding_model


async def embed_query(text: str) -> list[float]:
    model = get_embedding_model()
    return await model.aembed_query(text)


async def embed_documents(texts: list[str]) -> list[list[float]]:
    model = get_embedding_model()
    return await model.aembed_documents(texts)
