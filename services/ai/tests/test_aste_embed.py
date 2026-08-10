"""EC-23 — embed endpoint returns 1536-dim vectors."""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app
from app.settings import get_settings

client = TestClient(app)


def test_embed_requires_token() -> None:
    res = client.post("/aste/embed", json={"texts": ["hello"]})
    assert res.status_code == 401


def test_embed_dim(monkeypatch) -> None:
    get_settings.cache_clear()
    monkeypatch.setenv("AI_INTERNAL_TOKEN", "test-token")
    monkeypatch.setenv("EMBEDDING_PROVIDER", "hashing")
    monkeypatch.setenv("EMBEDDING_DIM", "1536")
    get_settings.cache_clear()
    res = client.post(
        "/aste/embed",
        json={"texts": ["ciao", "asta"]},
        headers={"X-EC-Internal": "test-token"},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["dim"] == 1536
    assert len(body["embeddings"]) == 2
    assert all(len(v) == 1536 for v in body["embeddings"])
    get_settings.cache_clear()
