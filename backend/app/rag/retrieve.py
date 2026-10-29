"""
RAG 검색·답변 생성.
근거(유사도 ≥ 임계치)가 있을 때만 LLM 답변. 없으면 거부.
"""
from langchain_core.prompts import ChatPromptTemplate
from app.config import settings
from app.rag.embed import embed_query
from app.services.llm.adapter import get_llm

_SIM_THRESHOLD = 0.35
_TOP_K = 5

_ANSWER_PROMPT = ChatPromptTemplate.from_messages([
    ("system",
     "Answer the question using ONLY the provided context. "
     "If the context does not contain enough information, say so clearly. "
     "Never fabricate facts.\n\nContext:\n{context}"),
    ("human", "{question}"),
])


async def search_knowledge(question: str, collection: str = "knowledge") -> list[dict]:
    """pgvector 유사도 검색. SUPABASE_DB_URL 없으면 빈 리스트."""
    if not settings.rag_enabled:
        return []
    try:
        import vecs
        client = vecs.create_client(settings.supabase_db_url)
        col = client.get_or_create_collection(name=collection, dimension=1536)
        vector = await embed_query(question)
        results = col.query(data=vector, limit=_TOP_K, include_value=True)
        return [
            {"text": r[1].get("text", ""), "similarity": r[2]}
            for r in results
            if r[2] >= _SIM_THRESHOLD
        ]
    except Exception:
        return []


async def answer_question(question: str, collection: str = "knowledge") -> dict:
    """
    RAG 전체 흐름: 검색 → 근거 판정 → LLM 답변.
    반환: {answer, grounded, sources_count}
    """
    results = await search_knowledge(question, collection)

    if not results:
        return {
            "answer": "I don't have enough information to answer that. Please check official sources.",
            "grounded": False,
            "sources_count": 0,
        }

    context = "\n\n".join(r["text"] for r in results)
    llm = get_llm()
    chain = _ANSWER_PROMPT | llm
    response = await chain.ainvoke({"context": context, "question": question})

    return {
        "answer": response.content,
        "grounded": True,
        "sources_count": len(results),
    }
