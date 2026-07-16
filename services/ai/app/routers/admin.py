from fastapi import APIRouter

from ..services.embed_index import reindex

router = APIRouter(prefix="/admin", tags=["admin"])


@router.post("/reindex-embeddings")
def reindex_embeddings(only_missing: bool = True) -> dict[str, int]:
    return {"embedded": reindex(only_missing=only_missing)}
