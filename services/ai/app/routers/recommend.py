from fastapi import APIRouter

from ..schemas import ListingHit
from ..services.recommend import similar

router = APIRouter(prefix="/recommendations", tags=["recommendations"])


@router.get("/{listing_id}", response_model=list[ListingHit])
def recommend(listing_id: str, limit: int = 8) -> list[ListingHit]:
    return similar(listing_id, limit)
