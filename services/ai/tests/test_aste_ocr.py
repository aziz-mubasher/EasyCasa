"""EC-23 — aste OCR unit tests (mocked tesseract / synthetic PDF)."""

from __future__ import annotations

import io

import pytest

from app.services.aste_ocr import run_ocr, _has_meaningful_text


def _minimal_text_pdf(text: str) -> bytes:
    """Build a one-page PDF with a text content stream."""
    safe = text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
    stream = f"BT /F1 12 Tf 50 750 Td ({safe}) Tj ET".encode("latin-1", errors="replace")
    objects = []
    objects.append(b"1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n")
    objects.append(b"2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n")
    objects.append(
        b"3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
        b"/Contents 4 0 R /Resources<< /Font<< /F1 5 0 R >> >> >>endobj\n"
    )
    objects.append(
        f"4 0 obj<< /Length {len(stream)} >>stream\n".encode() + stream + b"\nendstream\nendobj\n"
    )
    objects.append(b"5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n")
    out = bytearray(b"%PDF-1.4\n")
    offsets = [0]
    for obj in objects:
        offsets.append(len(out))
        out.extend(obj)
    xref_pos = len(out)
    out.extend(f"xref\n0 {len(objects) + 1}\n".encode())
    out.extend(b"0000000000 65535 f \n")
    for off in offsets[1:]:
        out.extend(f"{off:010d} 00000 n \n".encode())
    out.extend(
        f"trailer<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref_pos}\n%%EOF\n".encode()
    )
    return bytes(out)


def test_has_meaningful_text() -> None:
    assert _has_meaningful_text(
        "Valore di stima euro 100000 prezzo base offerta minima cauzione rilancio superficie"
    )
    assert not _has_meaningful_text("...")
    assert not _has_meaningful_text("")


def test_native_pdf_text_layer() -> None:
    data = _minimal_text_pdf(
        "Perizia di stima. Valore di stima 250000 euro. Prezzo base 200000. "
        "Comune di Milano. Superficie commerciale mq 95."
    )
    try:
        res = run_ocr("perizia.pdf", "application/pdf", data)
    except RuntimeError as exc:
        if "ocr_unavailable" in str(exc):
            pytest.skip("tesseract/poppler not installed in this environment")
        raise
    assert res.page_count >= 1
    assert len(res.pages) == res.page_count
    assert all(p.page >= 1 for p in res.pages)


def test_png_goes_ocr_path(monkeypatch: pytest.MonkeyPatch) -> None:
    from PIL import Image

    buf = io.BytesIO()
    Image.new("RGB", (200, 80), color=(255, 255, 255)).save(buf, format="PNG")
    data = buf.getvalue()

    def fake_ocr(img, lang="ita+eng"):  # noqa: ARG001
        return "Prezzo base 100000"

    monkeypatch.setattr("pytesseract.image_to_string", fake_ocr)
    res = run_ocr("scan.png", "image/png", data)
    assert res.page_count == 1
    assert res.pages[0].ocr_used is True
    assert "100000" in res.pages[0].text
