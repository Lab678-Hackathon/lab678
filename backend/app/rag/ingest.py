"""
지식 문서 → pgvector 적재.
python -m app.rag.ingest [knowledge_dir]

knowledge_dir 기본값: app/rag/knowledge/
"""
import sys
import uuid
from pathlib import Path
from app.config import settings
from app.rag.embed import embed_documents

_CHUNK_SIZE = 800
_CHUNK_OVERLAP = 100


def _chunk_text(text: str) -> list[str]:
    chunks, start = [], 0
    while start < len(text):
        end = min(start + _CHUNK_SIZE, len(text))
        chunks.append(text[start:end].strip())
        start += _CHUNK_SIZE - _CHUNK_OVERLAP
    return [c for c in chunks if c]


async def ingest(knowledge_dir: Path, collection: str = "knowledge") -> int:
    if not settings.rag_enabled:
        print("⚠️  SUPABASE_DB_URL 없음. 적재 건너뜀.")
        return 0

    import vecs
    client = vecs.create_client(settings.supabase_db_url)
    col = client.get_or_create_collection(name=collection, dimension=1536)

    docs = list(knowledge_dir.glob("*.md"))
    if not docs:
        print(f"⚠️  문서 없음: {knowledge_dir}")
        return 0

    records = []
    for doc in docs:
        text = doc.read_text(encoding="utf-8")
        chunks = _chunk_text(text)
        vectors = await embed_documents(chunks)
        for chunk, vector in zip(chunks, vectors):
            records.append((str(uuid.uuid4()), vector, {"text": chunk, "source": doc.name}))

    col.upsert(records=records)
    col.create_index()
    print(f"✅ {len(records)}개 청크 적재 완료 ({len(docs)}개 문서)")
    return len(records)


if __name__ == "__main__":
    import asyncio
    knowledge_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("app/rag/knowledge")
    asyncio.run(ingest(knowledge_dir))
