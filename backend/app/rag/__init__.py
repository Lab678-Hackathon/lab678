"""RAG 지식베이스 파이프라인.

chunk.py    : 마크다운 문서 → 청크 분할 (tiktoken)
embed.py    : OpenAI text-embedding-3-small 래퍼 (1536차원)
ingest.py   : 지식 문서 적재 CLI (chunk → embed → pgvector upsert)
store.py    : vecs(pgvector) 컬렉션 CRUD
retrieve.py : 유사도 검색(SIM ≥ 0.35) → 근거 판정 → LLM 답변 or refuse

신뢰 경계: RAG는 사실(가격·운영시간·예약)을 생성하지 않는다. 지식 문서 범위 안에서만.
"""
