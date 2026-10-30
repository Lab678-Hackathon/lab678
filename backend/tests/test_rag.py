import asyncio
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock

import pytest
from fastapi.testclient import TestClient
from app.config import settings
from app.core.exceptions import ExternalSourceError
from app.main import app
from app.rag import ingest as ingestion, retrieve, store

@pytest.fixture(autouse=True)
def offline_settings(monkeypatch):
    monkeypatch.setattr(settings, "supabase_db_url", "")
    monkeypatch.setattr(settings, "openai_api_key", "")
    monkeypatch.setattr(settings, "rag_similarity_threshold", 0.35)

def test_api_routes_and_empty_configuration():
    client = TestClient(app)
    assert client.get("/health").status_code == 200
    assert client.get("/").status_code == 200
    assert client.post("/api/topic/discover", json={"query": "test"}).status_code == 200
    response = client.post("/api/ask", json={"question": "질문"})
    assert response.status_code == 200
    assert response.json()["data"]["status"] == "not_configured"

@pytest.mark.parametrize("question", ["", "   ", "x" * 4001])
def test_blank_and_oversize_questions(question):
    response = TestClient(app).post("/api/ask", json={"question": question})
    assert response.status_code == 422
    assert response.json()["ok"] is False

def test_distance_conversion_and_source_metadata(monkeypatch):
    monkeypatch.setattr(settings, "supabase_db_url", "mock")
    monkeypatch.setattr(settings, "openai_api_key", "mock")
    monkeypatch.setattr(retrieve, "embed_query", AsyncMock(return_value=[1.0]))
    monkeypatch.setattr(store, "query", Mock(return_value=[
        ("near", 0.1, {"text": "answer", "source": "guide.md"}),
        ("far", 0.9, {"text": "irrelevant", "source": "other.md"}),
        ("empty", 0.0, {"text": " ", "source": "empty.md"}),
    ]))
    rows = asyncio.run(retrieve.search_knowledge("question"))
    assert len(rows) == 1
    assert rows[0]["source"] == "guide.md"
    assert rows[0]["similarity"] == pytest.approx(0.9)

def test_no_evidence_never_calls_llm(monkeypatch):
    monkeypatch.setattr(settings, "supabase_db_url", "mock")
    monkeypatch.setattr(retrieve, "search_knowledge", AsyncMock(return_value=[]))
    llm = Mock(side_effect=AssertionError("LLM must not run"))
    monkeypatch.setattr(retrieve, "get_llm", llm)
    result = asyncio.run(retrieve.answer_question("question"))
    assert result["status"] == "no_evidence"
    assert result["grounded"] is False
    llm.assert_not_called()

def test_answer_with_citations(monkeypatch):
    monkeypatch.setattr(settings, "supabase_db_url", "mock")
    monkeypatch.setattr(retrieve, "search_knowledge", AsyncMock(return_value=[
        {"text": "일반 자료 내용", "source": "manual.txt", "similarity": 0.8}
    ]))
    model = SimpleNamespace(ainvoke=AsyncMock(return_value=SimpleNamespace(content="답변 [1]")))
    monkeypatch.setattr(retrieve, "get_llm", lambda: model)
    result = asyncio.run(retrieve.answer_question("question"))
    assert result["grounded"] is True
    assert result["citations"][0]["source"] == "manual.txt"
    assert result["citations"][0]["snippet"] == "일반 자료 내용"

def test_db_failure_is_not_empty_result(monkeypatch):
    monkeypatch.setattr(settings, "supabase_db_url", "mock")
    monkeypatch.setattr(settings, "openai_api_key", "mock")
    monkeypatch.setattr(retrieve, "embed_query", AsyncMock(return_value=[1.0]))
    monkeypatch.setattr(store, "query", Mock(side_effect=RuntimeError("secret DSN")))
    response = TestClient(app).post("/api/ask", json={"question": "question"})
    assert response.status_code == 503
    assert response.json()["ok"] is False
    assert "secret DSN" not in response.text

def test_llm_failure_is_explicit(monkeypatch):
    monkeypatch.setattr(settings, "supabase_db_url", "mock")
    monkeypatch.setattr(retrieve, "search_knowledge", AsyncMock(return_value=[
        {"text": "자료", "source": "manual.md", "similarity": 0.8}
    ]))
    model = SimpleNamespace(ainvoke=AsyncMock(side_effect=RuntimeError("secret key")))
    monkeypatch.setattr(retrieve, "get_llm", lambda: model)
    with pytest.raises(ExternalSourceError, match="답변 생성"):
        asyncio.run(retrieve.answer_question("question"))

def test_empty_folder_needs_no_keys(tmp_path):
    assert asyncio.run(ingestion.ingest(tmp_path)) == 0

def test_embedding_dimension_mismatch_does_not_remove_existing_data(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "supabase_db_url", "mock")
    monkeypatch.setattr(settings, "openai_api_key", "mock")
    (tmp_path / "manual.md").write_text("자료", encoding="utf-8")
    monkeypatch.setattr(ingestion, "embed_documents", AsyncMock(return_value=[[1.0]]))
    replace = Mock()
    monkeypatch.setattr(store, "replace_document", replace)
    with pytest.raises(ValueError, match="임베딩 차원"):
        asyncio.run(ingestion.ingest(tmp_path))
    replace.assert_not_called()

def test_reingest_uses_same_source_and_replaces_shortened_document(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "supabase_db_url", "mock")
    monkeypatch.setattr(settings, "openai_api_key", "mock")
    monkeypatch.setattr(settings, "rag_embedding_dimension", 1)
    doc = tmp_path / "manual.txt"
    doc.write_text("a" * 1800, encoding="utf-8")
    async def embed(chunks):
        return [[1.0] for _ in chunks]
    monkeypatch.setattr(ingestion, "embed_documents", embed)
    replace = Mock()
    monkeypatch.setattr(store, "replace_document", replace)
    monkeypatch.setattr(store, "create_index", Mock())
    assert asyncio.run(ingestion.ingest(tmp_path)) == 3
    original_id = replace.call_args.args[2][0][0]
    doc.write_text("short", encoding="utf-8")
    assert asyncio.run(ingestion.ingest(tmp_path)) == 1
    assert replace.call_args.args[1] == "manual.txt"
    assert replace.call_args.args[2][0][0] == original_id

def test_chunk_overlap_and_empty():
    assert ingestion._chunk_text(" ") == []
    chunks = ingestion._chunk_text("a" * 800 + "b" * 700)
    assert len(chunks[0]) == 800
    assert chunks[0][-100:] == chunks[1][:100]

def test_store_requests_metadata_and_replaces_only_source(monkeypatch):
    monkeypatch.setattr(settings, "rag_embedding_dimension", 1)
    from contextlib import contextmanager
    col = Mock()
    @contextmanager
    def collection(name):
        yield col
    monkeypatch.setattr(store, "collection", collection)
    store.query([1.0], "test")
    assert col.query.call_args.kwargs["include_metadata"] is True
    assert col.query.call_args.kwargs["include_value"] is True
    records = [("id", [1.0], {"source": "test.md"})]
    store.replace_document("test", "test.md", records)
    col.delete.assert_called_once_with(filters={"source": {"$eq": "test.md"}})
    col.upsert.assert_called_once_with(records=records)
