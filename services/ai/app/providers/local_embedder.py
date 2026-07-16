from __future__ import annotations

from ..settings import Settings


class LocalEmbedder:
    """sentence-transformers embedder. Requires requirements-ml.txt.
    NOTE: local models have their own dimension; if it differs from 1536 you must
    add a migration to change listings.embedding to vector(<dim>)."""

    def __init__(self, s: Settings) -> None:
        from sentence_transformers import SentenceTransformer  # type: ignore
        self.model = SentenceTransformer(s.EMBEDDING_MODEL)
        self.dim = int(self.model.get_sentence_embedding_dimension())

    def embed(self, texts: list[str]) -> list[list[float]]:
        return [v.tolist() for v in self.model.encode(texts, normalize_embeddings=True)]
