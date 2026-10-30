"""From repository root: python utils/scripts/ingest_rag.py [knowledge_dir]."""
import asyncio
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))

from app.rag.ingest import KNOWLEDGE_DIR, ingest

if __name__ == "__main__":
    asyncio.run(ingest(Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else KNOWLEDGE_DIR))
