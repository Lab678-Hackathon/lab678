"""
RAG 지식 문서 → Supabase pgvector 적재 스크립트.
python utils/scripts/ingest_rag.py [knowledge_dir]

knowledge_dir 기본값: backend/app/rag/knowledge/
SUPABASE_DB_URL 환경변수 필요.
"""
import sys
import os
from pathlib import Path


def main():
    knowledge_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("backend/app/rag/knowledge")

    if not os.getenv("SUPABASE_DB_URL"):
        print("❌ SUPABASE_DB_URL 환경변수 없음. .env 확인.")
        sys.exit(1)

    if not knowledge_dir.exists():
        print(f"❌ 디렉터리 없음: {knowledge_dir}")
        sys.exit(1)

    docs = list(knowledge_dir.glob("*.md"))
    if not docs:
        print(f"⚠️  .md 파일 없음: {knowledge_dir}")
        sys.exit(0)

    print(f"📄 적재할 문서 {len(docs)}개: {[d.name for d in docs]}")

    # 실제 ingest는 backend 패키지를 통해 실행
    os.system(f"cd backend && python -m app.rag.ingest")
    print("✅ RAG 적재 완료")


if __name__ == "__main__":
    main()
