"""EC-23 — extract contract tests (mocked LLM)."""

from __future__ import annotations

import json

import pytest

from app.schemas_aste import ExtractDocumentIn, ExtractPageIn, ExtractRequest
from app.services import aste_extract
from app.services.aste_extract import (
    empty_extraction,
    merge_extractions,
    page_lot_priority,
    run_extract,
    scrub_person_names,
    split_documents_for_extract,
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
    # No person-name fields should appear as invented strings in economics
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


def test_page_lot_priority_prefers_lot_mentions() -> None:
    assert page_lot_priority("Lotto H prezzo base 100", "H", "perizia") > page_lot_priority(
        "Lotto A non conforme", "H", "perizia"
    )
    assert page_lot_priority("prezzo", None, "avviso") > page_lot_priority("prezzo", None, "altro")


def test_split_documents_packs_under_budget() -> None:
    # Many mid-size pages → multiple chunks under a tight budget.
    docs = [
        ExtractDocumentIn(
            file=f"d{i}",
            doc_type="perizia" if i % 2 else "avviso",
            pages=[
                ExtractPageIn(
                    page=1,
                    text=("Lotto H economics " if i == 0 else f"doc{i} ") + ("x" * 800),
                )
            ],
        )
        for i in range(8)
    ]
    chunks = split_documents_for_extract(
        docs, language="it", lotto_label="H", max_user_chars=3_500
    )
    assert len(chunks) >= 2
    # Lot-mentioning page should land in an early chunk (priority sort).
    first_files = {d.file for d in chunks[0]}
    assert "d0" in first_files
    # All pages preserved across chunks.
    seen = {(d.file, p.page) for c in chunks for d in c for p in d.pages}
    assert len(seen) == 8


def test_merge_extractions_fills_nulls_and_drops_other_lot_nonconform() -> None:
    meta_docs = [{"file": "d1", "doc_type": "avviso", "pages": 1, "ocr_pages": 0}]
    a = empty_extraction(meta_docs, not_found=["economics.offerta_minima", "giuridica.stato_occupazione"])
    a["economics"]["prezzo_base"] = {"value": 1000, "source": {"file": "d1", "page": 1}}
    a["urbanistica"]["conformita_urbanistica"] = {
        "stato": "non_conforme",
        "dettaglio": "Lotti A, C, D non conformi",
    }
    a["meta"]["lotti_trovati"] = ["A", "H"]

    b = empty_extraction(meta_docs, not_found=["economics.prezzo_base"])
    b["economics"]["offerta_minima"] = {"value": 750, "source": {"file": "d2", "page": 2}}
    b["giuridica"]["stato_occupazione"] = {
        "stato": "libero",
        "dettaglio": None,
        "opponibilita": None,
    }
    b["urbanistica"]["conformita_urbanistica"] = {"stato": "conforme", "dettaglio": "Lotto H ok"}
    b["meta"]["lotti_trovati"] = ["H", "I"]

    merged = merge_extractions([a, b], meta_docs, "H")
    assert merged["economics"]["prezzo_base"]["value"] == 1000
    assert merged["economics"]["offerta_minima"]["value"] == 750
    assert merged["giuridica"]["stato_occupazione"]["stato"] == "libero"
    # Other-lot non-conforme from chunk A must not stick when lotto H is selected.
    assert merged["urbanistica"]["conformita_urbanistica"]["stato"] == "conforme"
    assert set(merged["meta"]["lotti_trovati"]) == {"A", "H", "I"}
    assert "economics.offerta_minima" not in merged["meta"]["not_found"]
    assert "economics.prezzo_base" not in merged["meta"]["not_found"]


def test_extract_chunked_calls_complete_per_chunk(monkeypatch: pytest.MonkeyPatch) -> None:
    calls: list[str] = []

    def fake_complete(s, system, user):  # noqa: ARG001
        calls.append(user)
        payload = json.loads(user)
        idx = payload.get("chunk", {}).get("index", 1)
        out = empty_extraction([])
        if idx == 1:
            out["economics"]["prezzo_base"] = {
                "value": 42,
                "source": {"file": "d0", "page": 1},
            }
            out["meta"]["lotto"] = {"label": "H", "source": "user"}
        else:
            out["economics"]["offerta_minima"] = {
                "value": 30,
                "source": {"file": "d1", "page": 1},
            }
        out["meta"]["lotti_trovati"] = ["H"]
        out["meta"]["not_found"] = []
        return json.dumps(out)

    monkeypatch.setattr(aste_extract, "_complete_long", fake_complete)
    monkeypatch.setattr(aste_extract, "MAX_EXTRACT_USER_CHARS", 3_500)

    s = Settings(CHAT_PROVIDER="openai", OPENAI_API_KEY="sk-test")
    docs = [
        ExtractDocumentIn(
            file=f"d{i}",
            doc_type="perizia",
            pages=[ExtractPageIn(page=1, text=f"Lotto H page {i} " + ("y" * 900))],
        )
        for i in range(6)
    ]
    req = ExtractRequest(language="it", lotto_label="H", documents=docs)
    out = run_extract(req, settings=s)

    assert len(calls) >= 2
    assert any('"chunk"' in c for c in calls)
    assert out["economics"]["prezzo_base"]["value"] == 42
    assert out["economics"]["offerta_minima"]["value"] == 30
    assert any(w.startswith("extract_chunked:") for w in out["meta"]["warnings"])
    assert out["meta"]["lotto"]["label"] == "H"
    assert out["procedura"]["lotto"] == "H"
