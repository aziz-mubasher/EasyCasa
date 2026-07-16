from fastapi import APIRouter, Request, HTTPException

from ..cache import RateLimiter
from ..schemas import AssistantRequest, AssistantResponse
from ..services.assistant import answer
from ..settings import get_settings

router = APIRouter(prefix="/assistant", tags=["assistant"])
_limiter = RateLimiter(get_settings().AI_RATE_LIMIT_PER_MIN)


@router.post("", response_model=AssistantResponse)
def assistant(req: AssistantRequest, request: Request) -> AssistantResponse:
    key = request.client.host if request.client else "anon"
    if not _limiter.allow(key):
        raise HTTPException(status_code=429, detail="rate limit exceeded")
    return answer(req)
