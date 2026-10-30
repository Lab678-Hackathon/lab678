"""Run from backend: python -m app.rag.ingest [directory]. Reads .md and .txt."""
import asyncio
import hashlib
import sys
from pathlib import Path
from app.config import settings
from app.core.exceptions import ConfigurationError
from app.rag import store
from app.rag.embed import embed_documents

KNOWLEDGE_DIR = Path(__file__).parent / "knowledge"

def _chunk_text(text: str) -> list[str]:
    return [chunk for start in range(0, len(text), 700)
            if (chunk := text[start:start + 800].strip())]

async def ingest(knowledge_dir: Path, collection: str | None = None) -> int:
    if not knowledge_dir.is_dir():
        raise ValueError(f"자료 폴더가 없습니다: {knowledge_dir}")
    docs = sorted(p for p in knowledge_dir.rglob("*") if p.is_file() and p.suffix.lower() in {".md", ".txt"})
    if not docs:
        print("등록할 자료가 없습니다. .md 또는 .txt 파일을 추가해 주세요.")
        return 0
    if not settings.rag_enabled or not settings.openai_api_key:
        raise ConfigurationError("적재에는 SUPABASE_DB_URL과 OPENAI_API_KEY가 필요합니다.")
    name = collection or settings.rag_collection
    count = 0
    for doc in docs:
        source = doc.relative_to(knowledge_dir).as_posix()
        chunks = _chunk_text(doc.read_text(encoding="utf-8-sig"))
        vectors = await embed_documents(chunks) if chunks else []
        if any(len(vector) != settings.rag_embedding_dimension for vector in vectors):
            raise ValueError("임베딩 차원이 RAG_EMBEDDING_DIMENSION과 다릅니다. 기존 자료는 교체하지 않았습니다.")
        records = [(hashlib.sha256(f"{source}#{i}".encode()).hexdigest(), vector,
                    {"text": chunk, "source": source})
                   for i, (chunk, vector) in enumerate(zip(chunks, vectors, strict=True))]
        await asyncio.to_thread(store.replace_document, name, source, records)
        count += len(records)
    if count:
        await asyncio.to_thread(store.create_index, name)
    print(f"{len(docs)}개 문서에서 {count}개 청크 적재 완료")
    return count

if __name__ == "__main__":
    asyncio.run(ingest(Path(sys.argv[1]) if len(sys.argv) > 1 else KNOWLEDGE_DIR))
