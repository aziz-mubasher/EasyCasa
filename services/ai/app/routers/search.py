from fastapi import APIRouter

from ..schemas import SearchRequest, SearchResponse
from ..services.search import semantic_search

router = APIRouter(prefix="/search", tags=["search"])


@router.post("", response_model=SearchResponse)
def search(req: SearchRequest) -> SearchResponse:
    return semantic_search(req.query, req.limit)
