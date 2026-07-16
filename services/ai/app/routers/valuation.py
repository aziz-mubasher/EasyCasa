from fastapi import APIRouter

from ..schemas import ValuationRequest, ValuationResponse
from ..services.valuation import value

router = APIRouter(prefix="/valuation", tags=["valuation"])


@router.post("", response_model=ValuationResponse)
def valuation(req: ValuationRequest) -> ValuationResponse:
    return value(req)
