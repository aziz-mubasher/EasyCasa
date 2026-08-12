"""EC-23 / EC-29 — extract contract tests (mocked LLM)."""

from __future__ import annotations

import json

import httpx
import pytest

from app.schemas_aste import ExtractDocumentIn, ExtractPageIn, ExtractRequest
from app.services import aste_extract
from app.services.aste_extract import (
    ExtractUpstreamError,
    empty_extraction,
    run_extract,
    scrub_person_names,
)
from app.settings import Settings


def test_scrub_person_names_clears_giudice() -> None:
    data = empty_extraction([])
    data["procedura"]["giudice_delegato"] = "Mario Rossi"
    out = scrub_person_names(data)
    assert out["procedura"]["giudice_delegato"] is None
    assert "scrubbed_person_name_field" in out["meta"]["warnings"]


def test_extract_requires_openai(monkeypatch: pytest.MonkeyPatch) -> None:
    s = Settings(CHAT_PROVIDER="none", OPENAI_API_KEY="")
    req = ExtractRequest(
        language="it",
        documents=[
            ExtractDocumentIn(
                file="d1",
                doc_type="perizia",
                pages=[ExtractPageIn(page=1, text="Prezzo base 100000")],
            )
        ],
    )
    with pytest.raises(RuntimeError, match="extract_unavailable"):
        run_extract(req, settings=s)


def test_extract_parses_llm_json(monkeypatch: pytest.MonkeyPatch) -> None:
    payload = empty_extraction(
        [{"file": "d1", "doc_type": "perizia", "pages": 1, "ocr_pages": 0}],
        not_found=["economics.cauzione"],
    )
    payload["economics"]["prezzo_base"] = {
        "value": 100000,
        "source": {"file": "d1", "page": 1},
    }
    payload["procedura"]["tribunale"] = "Milano"

    def fake_complete(s, system, user):  # noqa: ARG001
        return json.dumps(payload)

    monkeypatch.setattr(aste_extract, "_complete_long", fake_complete)
    s = Settings(CHAT_PROVIDER="openai", OPENAI_API_KEY="sk-test")
    req = ExtractRequest(
        language="it",
        documents=[
            ExtractDocumentIn(
                file="d1",
                doc_type="perizia",
                pages=[ExtractPageIn(page=1, text="Prezzo base 100000 Tribunale di Milano")],
            )
        ],
    )
    out = run_extract(req, settings=s)
    assert out["schema_version"] == 2
    assert out["economics"]["prezzo_base"]["value"] == 100000
    assert out["economics"]["prezzo_base"]["source"]["page"] == 1
    assert "economics.cauzione" in out["meta"]["not_found"]
    blob = json.dumps(out)
    assert "Mario Rossi" not in blob


def test_normalize_lg_and_cauzione_and_immobili(monkeypatch: pytest.MonkeyPatch) -> None:
    raw = {
        "schema_version": 2,
        "procedura": {"tipo": "lg", "numero": "26/2025", "tribunale": "Nocera Inferiore"},
        "economics": {
            "cauzione": {"pct": 20, "base": "prezzo_offerto", "importo": None, "source": {"file": "d1", "page": 1}},
            "prezzo_base": {"value": 156000, "source": {"file": "d1", "page": 1}},
        },
        "immobili": [
            {"tipologia": "Appartamento", "foglio": "17", "particella": "383", "subalterno": "8", "locali": [], "note_valore": None},
            {"tipologia": "Box", "foglio": "17", "particella": "590", "subalterno": "7", "locali": [], "note_valore": None},
        ],
        "meta": {"lotti_trovati": ["unico"], "not_found": [], "warnings": []},
    }

    def fake_complete(s, system, user):  # noqa: ARG001
        assert "lotto_label" in user
        return json.dumps(raw)

    monkeypatch.setattr(aste_extract, "_complete_long", fake_complete)
    s = Settings(CHAT_PROVIDER="openai", OPENAI_API_KEY="sk-test")
    req = ExtractRequest(
        language="it",
        lotto_label="unico",
        documents=[
            ExtractDocumentIn(
                file="d1",
                doc_type="avviso",
                pages=[ExtractPageIn(page=1, text="L.G. 26/2025 cauzione 20% del prezzo offerto")],
            )
        ],
    )
    out = run_extract(req, settings=s)
    assert out["schema_version"] == 2
    assert out["procedura"]["tipo"] == "lg"
    assert out["procedura"]["numero"] == "26/2025"
    assert out["economics"]["cauzione"]["pct"] == 20
    assert out["economics"]["cauzione"]["base"] == "prezzo_offerto"
    assert len(out["immobili"]) == 2


def test_extract_upstream_error_surfaces_status(monkeypatch: pytest.MonkeyPatch) -> None:
    class FakeResponse:
        status_code = 400
        text = '{"error":{"message":"context length exceeded","type":"invalid_request_error"}}'

        def json(self) -> dict:
            return {}

        headers: dict[str, str] = {}

    def fake_post(*args, **kwargs):  # noqa: ARG001
        return FakeResponse()

    monkeypatch.setattr(httpx, "post", fake_post)
    s = Settings(CHAT_PROVIDER="openai", OPENAI_API_KEY="sk-test")
    with pytest.raises(ExtractUpstreamError, match="extract_upstream:400"):
        aste_extract._complete_long(s, "system", "user")


def test_extract_map_reduce_nine_doc_dossier(monkeypatch: pytest.MonkeyPatch) -> None:
    """Synthetic ≥9-doc dossier: multiple map calls, merged schema v2 output."""
    call_count = {"n": 0}
    max_payload_tokens = {"max": 0}

    def fake_complete(s, system, user):  # noqa: ARG001
        call_count["n"] += 1
        payload = json.loads(user)
        max_payload_tokens["max"] = max(
            max_payload_tokens["max"],
            len(user) // 4,
        )
        docs = payload["documents"]
        files = [d["file"] for d in docs]
        partial = empty_extraction(
            [{"file": f, "doc_type": "perizia", "pages": 1, "ocr_pages": 0} for f in files],
        )
        if "avviso.pdf" in files:
            partial["economics"]["prezzo_base"] = {
                "value": 36039,
                "source": {"file": "avviso.pdf", "page": 1},
            }
            partial["meta"]["prezzo_base_candidates"] = [
                {"value": 36039, "source": {"file": "avviso.pdf", "page": 1}},
            ]
        if "ordinanza.pdf" in files:
            partial["meta"].setdefault("prezzo_base_candidates", []).append(
                {"value": 85425, "source": {"file": "ordinanza.pdf", "page": 1}},
            )
            if "avviso.pdf" not in files:
                partial["economics"]["prezzo_base"] = {
                    "value": 85425,
                    "source": {"file": "ordinanza.pdf", "page": 1},
                }
        if any(d.get("doc_type") == "perizia" for d in docs):
            partial["procedura"]["tribunale"] = "Milano"
        partial["meta"]["lotti_trovati"] = ["H"]
        return json.dumps(partial)

    monkeypatch.setattr(aste_extract, "_complete_long", fake_complete)
    s = Settings(
        CHAT_PROVIDER="openai",
        OPENAI_API_KEY="sk-test",
        ASTE_EXTRACT_MAX_REQUEST_TOKENS=6000,
    )
    documents = [
        ExtractDocumentIn(
            file="avviso.pdf" if i == 0 else ("ordinanza.pdf" if i == 1 else f"doc{i}.pdf"),
            doc_type="avviso" if i == 0 else ("ordinanza" if i == 1 else "perizia"),
            pages=[ExtractPageIn(page=1, text="Lotto H prezzo base " + ("36039" if i == 0 else "85425" if i == 1 else f"text{i} ") + ("x" * 1500))],
        )
        for i in range(10)
    ]
    req = ExtractRequest(language="it", lotto_label="H", documents=documents)
    out = run_extract(req, settings=s)
    assert out["schema_version"] == 2
    assert call_count["n"] >= 2
    assert out["economics"]["prezzo_base"]["value"] == 36039
    assert out["meta"]["lotti_trovati"] == ["H"]
    assert out["procedura"]["tribunale"] == "Milano"
