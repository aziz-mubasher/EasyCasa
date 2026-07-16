from __future__ import annotations

import hashlib
import math
from typing import Protocol

import httpx
import numpy as np

from ..settings import Settings, get_settings


class EmbeddingProvider(Protocol):
    dim: int
    def embed(self, texts: list[str]) -> list[list[float]]: ...


class HashingEmbedder:
    """Deterministic, dependency-free embedder for offline dev + tests.
    Bag-of-tokens hashed into a fixed-dim, L2-normalized vector. Not semantic-grade,
    but keeps the whole pipeline runnable without a model or network."""

    def __init__(self, dim: int) -> None:
        self.dim = dim

    def embed(self, texts: list[str]) -> list[list[float]]:
        out: list[list[float]] = []
        for text in texts:
            vec = np.zeros(self.dim, dtype=np.float32)
            for tok in _tokens(text):
                h = int(hashlib.md5(tok.encode()).hexdigest(), 16)
                vec[h % self.dim] += 1.0
                vec[(h // self.dim) % self.dim] += 0.5
            norm = float(np.linalg.norm(vec))
            if norm > 0:
                vec = vec / norm
            out.append(vec.tolist())
        return out


class OpenAIEmbedder:
    """OpenAI-compatible embeddings (OpenAI, TEI, LiteLLM, Ollama /v1...)."""

    def __init__(self, s: Settings) -> None:
        self.s = s
        self.dim = s.EMBEDDING_DIM

    def embed(self, texts: list[str]) -> list[list[float]]:
        resp = httpx.post(
            f"{self.s.OPENAI_BASE_URL}/embeddings",
            headers={"Authorization": f"Bearer {self.s.OPENAI_API_KEY}"},
            json={"model": self.s.EMBEDDING_MODEL, "input": texts},
            timeout=self.s.HTTP_TIMEOUT,
        )
        resp.raise_for_status()
        data = resp.json()["data"]
        return [d["embedding"] for d in data]


def _tokens(text: str) -> list[str]:
    return [t for t in "".join(c.lower() if c.isalnum() else " " for c in text).split() if len(t) > 1]


def get_embedder(s: Settings | None = None) -> EmbeddingProvider:
    s = s or get_settings()
    if s.EMBEDDING_PROVIDER == "openai":
        return OpenAIEmbedder(s)
    if s.EMBEDDING_PROVIDER == "local":
        from .local_embedder import LocalEmbedder  # lazy: heavy import
        return LocalEmbedder(s)
    return HashingEmbedder(s.EMBEDDING_DIM)


def cosine(a: list[float], b: list[float]) -> float:
    va, vb = np.array(a), np.array(b)
    na, nb = np.linalg.norm(va), np.linalg.norm(vb)
    if na == 0 or nb == 0:
        return 0.0
    return float(np.dot(va, vb) / (na * nb))
