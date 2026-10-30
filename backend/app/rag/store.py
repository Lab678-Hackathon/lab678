"""Synchronous vecs operations; async callers use worker threads."""
from contextlib import contextmanager
from app.config import settings
from app.core.exceptions import ConfigurationError

@contextmanager
def collection(name: str):
    if not settings.rag_enabled:
        raise ConfigurationError("SUPABASE_DB_URL이 설정되지 않았습니다.")
    import vecs
    dsn = settings.supabase_db_url
    for prefix in ("postgresql://", "postgres://"):
        if dsn.startswith(prefix):
            dsn = "postgresql+psycopg2://" + dsn[len(prefix):]
            break
    client = vecs.create_client(dsn)
    try:
        yield client.get_or_create_collection(name=name, dimension=settings.rag_embedding_dimension)
    finally:
        client.disconnect()

def query(vector: list[float], name: str):
    if len(vector) != settings.rag_embedding_dimension:
        raise ConfigurationError("임베딩 차원과 RAG_EMBEDDING_DIMENSION이 일치하지 않습니다.")
    with collection(name) as col:
        return col.query(data=vector, limit=settings.rag_top_k,
                         measure="cosine_distance", include_value=True, include_metadata=True)

def replace_document(name: str, source: str, records: list) -> None:
    # Embeddings are prepared first. Only this source is replaced.
    with collection(name) as col:
        col.delete(filters={"source": {"$eq": source}})
        if records:
            col.upsert(records=records)

def create_index(name: str) -> None:
    with collection(name) as col:
        col.create_index()
