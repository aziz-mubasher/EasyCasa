from __future__ import annotations

import io
import logging
import re
from typing import Any

from ..schemas_aste import OcrPageOut, OcrResponse

log = logging.getLogger("aste.ocr")

# Heuristic: pages with fewer than this many word chars are treated as needing OCR.
MIN_NATIVE_CHARS = 40


def run_ocr(filename: str, content_type: str, data: bytes) -> OcrResponse:
    """Native PDF text when present; Tesseract OCR fallback for scans/images."""
    ct = (content_type or "").split(";")[0].strip().lower()
    name = (filename or "").lower()

    if ct == "application/pdf" or name.endswith(".pdf"):
        return _ocr_pdf(data)
    if ct in {"image/jpeg", "image/png"} or name.endswith((".jpg", ".jpeg", ".png")):
        return _ocr_image(data)
    raise ValueError("unsupported_media_type")


def _ocr_pdf(data: bytes) -> OcrResponse:
    from pypdf import PdfReader

    reader = PdfReader(io.BytesIO(data))
    pages: list[OcrPageOut] = []
    ocr_pages = 0
    for i, page in enumerate(reader.pages, start=1):
        native = (page.extract_text() or "").strip()
        if _has_meaningful_text(native):
            pages.append(OcrPageOut(page=i, text=native, ocr_used=False))
            continue
        text = _ocr_pdf_page_raster(data, i)
        pages.append(OcrPageOut(page=i, text=text, ocr_used=True))
        ocr_pages += 1
    return OcrResponse(pages=pages, page_count=len(pages), ocr_pages=ocr_pages)


def _ocr_pdf_page_raster(data: bytes, page_num: int) -> str:
    try:
        from pdf2image import convert_from_bytes
        import pytesseract
    except ImportError as exc:  # pragma: no cover
        log.warning("ocr_deps_missing")
        raise RuntimeError("ocr_unavailable") from exc

    images = convert_from_bytes(data, first_page=page_num, last_page=page_num, dpi=200)
    if not images:
        return ""
    return pytesseract.image_to_string(images[0], lang="ita+eng") or ""


def _ocr_image(data: bytes) -> OcrResponse:
    try:
        from PIL import Image
        import pytesseract
    except ImportError as exc:  # pragma: no cover
        raise RuntimeError("ocr_unavailable") from exc

    img = Image.open(io.BytesIO(data))
    text = pytesseract.image_to_string(img, lang="ita+eng") or ""
    return OcrResponse(
        pages=[OcrPageOut(page=1, text=text, ocr_used=True)],
        page_count=1,
        ocr_pages=1,
    )


def _has_meaningful_text(text: str) -> bool:
    words = re.findall(r"[A-Za-zÀ-ÿ0-9]{2,}", text or "")
    return sum(len(w) for w in words) >= MIN_NATIVE_CHARS
