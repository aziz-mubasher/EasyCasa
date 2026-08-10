from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, File, Header, HTTPException, UploadFile

from ..providers.embeddings import get_embedder
from ..schemas_aste import EmbedRequest, EmbedResponse, ExtractRequest, OcrResponse
from ..services.aste_extract import run_extract
from ..services.aste_ocr import run_ocr
from ..settings import Settings, get_settings

log = logging.getLogger("aste.router")

router = APIRouter(prefix="/aste", tags=["aste"])


def require_internal(
    x_ec_internal: str | None = Header(default=None, alias="X-EC-Internal"),
    settings: Settings = Depends(get_settings),
) -> None:
    expected = (settings.AI_INTERNAL_TOKEN or "").strip()
    if not expected or not x_ec_internal or x_ec_internal != expected:
        raise HTTPException(status_code=401, detail="unauthorized")


@router.post("/ocr", response_model=OcrResponse, dependencies=[Depends(require_internal)])
async def aste_ocr(file: UploadFile = File(...)) -> OcrResponse:
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="empty_file")
    try:
        return run_ocr(file.filename or "document", file.content_type or "", data)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        log.warning("ocr_failed")
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.post("/extract", dependencies=[Depends(require_internal)])
def aste_extract(body: ExtractRequest) -> dict:
    try:
        return run_extract(body)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.post("/embed", response_model=EmbedResponse, dependencies=[Depends(require_internal)])
def aste_embed(body: EmbedRequest) -> EmbedResponse:
    s = get_settings()
    embedder = get_embedder(s)
    vectors = embedder.embed(body.texts) if body.texts else []
    dim = s.EMBEDDING_DIM
    for v in vectors:
        if len(v) != dim:
            raise HTTPException(status_code=500, detail="embed_dim_mismatch")
    return EmbedResponse(embeddings=vectors, dim=dim)
