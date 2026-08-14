"""EC-23 / EC-30 — extract contract tests (mocked LLM)."""

from __future__ import annotations

import json

import pytest

from app.schemas_aste import ExtractDocumentIn, ExtractPageIn, ExtractRequest
from app.services import aste_extract
from app.services.aste_extract import (
    derive_cauzione_importo,
    empty_extraction,
    guard_valore_stima_plausibility,
    merge_extractions,
    page_lot_priority,
    run_extract,
    scrub_person_names,
    split_documents_for_extract,
)
from app.settings import Settings


def _meta_docs() -> list[dict]:
    return [
        {"file": "avviso.pdf", "doc_type": "avviso", "pages": 2, "ocr_pages": 0},
        {"file": "ordinanza.pdf", "doc_type": "ordinanza", "pages": 1, "ocr_pages": 0},
        {"file": "perizia.pdf", "doc_type": "perizia", "pages": 5, "ocr_pages": 0},
    ]


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


def test_page_lot_priority_boosts_perizia_field_keywords() -> None:
    perizia_stima = page_lot_priority(
        "Il valore di stima CTU ammonta a euro 120000",
        "4",
        "perizia",
    )
    perizia_generic = page_lot_priority("Descrizione generica catastale", "4", "perizia")
    assert perizia_stima > perizia_generic


def test_merge_valore_stima_prefers_perizia_over_avviso() -> None:
    meta_docs = _meta_docs()
    avviso_part = empty_extraction(meta_docs)
    avviso_part["economics"]["valore_stima"] = {
        "value": 80000,
        "source": {"file": "avviso.pdf", "page": 1},
    }
    perizia_part = empty_extraction(meta_docs)
    perizia_part["economics"]["valore_stima"] = {
        "value": 120000,
        "source": {"file": "perizia.pdf", "page": 12},
    }
    merged = merge_extractions([avviso_part, perizia_part], meta_docs, "4")
    assert merged["economics"]["valore_stima"]["value"] == 120000
    assert merged["economics"]["valore_stima"]["source"]["file"] == "perizia.pdf"


def test_merge_prezzo_base_prefers_avviso_over_ordinanza_ex2() -> None:
    meta_docs = _meta_docs()
    ordinanza = empty_extraction(meta_docs)
    ordinanza["economics"]["prezzo_base"] = {
        "value": 50000,
        "source": {"file": "ordinanza.pdf", "page": 3},
    }
    avviso = empty_extraction(meta_docs)
    avviso["economics"]["prezzo_base"] = {
        "value": 36039,
        "source": {"file": "avviso.pdf", "page": 1},
    }
    avviso["meta"]["prezzo_base_candidates"] = [
        avviso["economics"]["prezzo_base"],
        ordinanza["economics"]["prezzo_base"],
    ]
    merged = merge_extractions([ordinanza, avviso], meta_docs, "4")
    assert merged["economics"]["prezzo_base"]["value"] == 36039
    assert merged["economics"]["prezzo_base"]["source"]["file"] == "avviso.pdf"


def test_merge_occupazione_prefers_perizia_over_avviso() -> None:
    meta_docs = _meta_docs()
    avviso = empty_extraction(meta_docs)
    avviso["giuridica"]["stato_occupazione"] = {
        "stato": "non_rilevato",
        "dettaglio": "Non indicato in avviso",
        "opponibilita": None,
        "source": {"file": "avviso.pdf", "page": 1},
    }
    perizia = empty_extraction(meta_docs)
    perizia["giuridica"]["stato_occupazione"] = {
        "stato": "occupato_esecutato",
        "dettaglio": "Occupato dall'esecutato",
        "opponibilita": None,
        "source": {"file": "perizia.pdf", "page": 8},
    }
    merged = merge_extractions([avviso, perizia], meta_docs, "4")
    assert merged["giuridica"]["stato_occupazione"]["stato"] == "occupato_esecutato"


@pytest.mark.parametrize(
    ("raw_stato", "expected"),
    [
        ("libero", "libero"),
        ("Libero da persone e cose", "libero"),
        ("occupato_esecutato", "occupato_esecutato"),
        ("occupato dall'esecutato", "occupato_esecutato"),
        ("occupato_con_titolo", "occupato_con_titolo"),
        ("occupato_senza_titolo", "occupato_senza_titolo"),
        ("non_rilevato", "non_rilevato"),
    ],
)
def test_merge_normalizes_occupazione_enum(raw_stato: str, expected: str) -> None:
    meta_docs = _meta_docs()
    part = empty_extraction(meta_docs)
    part["giuridica"]["stato_occupazione"] = {
        "stato": raw_stato,
        "dettaglio": None,
        "opponibilita": None,
        "source": {"file": "perizia.pdf", "page": 2},
    }
    merged = merge_extractions([part], meta_docs, "4")
    assert merged["giuridica"]["stato_occupazione"]["stato"] == expected


def test_derive_cauzione_importo_from_pct_and_prezzo_base() -> None:
    economics = {
        "prezzo_base": {"value": 36039, "source": {"file": "avviso.pdf", "page": 1}},
        "cauzione": {
            "pct": 10,
            "base": "prezzo_base",
            "importo": None,
            "source": {"file": "avviso.pdf", "page": 1},
        },
    }
    derive_cauzione_importo(economics)
    assert economics["cauzione"]["importo"] == 3603.9
    assert economics["cauzione"]["derived"] is True


def test_derive_cauzione_importo_skips_when_stated() -> None:
    economics = {
        "prezzo_base": {"value": 36039, "source": {"file": "avviso.pdf", "page": 1}},
        "cauzione": {
            "pct": 10,
            "base": "prezzo_base",
            "importo": 5000,
            "source": {"file": "avviso.pdf", "page": 1},
            "derived": True,
        },
    }
    derive_cauzione_importo(economics)
    assert economics["cauzione"]["importo"] == 5000
    assert "derived" not in economics["cauzione"]


def test_merge_derives_cauzione_importo_when_only_pct() -> None:
    meta_docs = [{"file": "avviso.pdf", "doc_type": "avviso", "pages": 1, "ocr_pages": 0}]
    part = empty_extraction(meta_docs, not_found=["economics.cauzione.importo"])
    part["economics"]["prezzo_base"] = {
        "value": 100000,
        "source": {"file": "avviso.pdf", "page": 1},
    }
    part["economics"]["cauzione"] = {
        "pct": 10,
        "base": "prezzo_base",
        "importo": None,
        "source": {"file": "avviso.pdf", "page": 1},
    }
    merged = merge_extractions([part], meta_docs, None)
    assert merged["economics"]["cauzione"]["importo"] == 10000.0
    assert merged["economics"]["cauzione"]["derived"] is True
    assert "economics.cauzione.importo" not in merged["meta"]["not_found"]


def test_split_prioritizes_perizia_stato_occupativo_pages() -> None:
    docs = [
        ExtractDocumentIn(
            file="filler",
            doc_type="avviso",
            pages=[ExtractPageIn(page=1, text="Lotto H avviso " + ("x" * 800))],
        ),
        ExtractDocumentIn(
            file="perizia_occ",
            doc_type="perizia",
            pages=[
                ExtractPageIn(
                    page=1,
                    text="Lotto H stato occupativo: libero da persone e cose " + ("y" * 800),
                )
            ],
        ),
        *[
            ExtractDocumentIn(
                file=f"d{i}",
                doc_type="perizia",
                pages=[ExtractPageIn(page=1, text=f"Lotto H filler {i} " + ("z" * 800))],
            )
            for i in range(6)
        ],
    ]
    chunks = split_documents_for_extract(
        docs, language="it", lotto_label="H", max_user_chars=3_500
    )
    first_files = {d.file for d in chunks[0]}
    assert "perizia_occ" in first_files


# --- EC-32: urbanistica conformità + cauzione importo ---


@pytest.mark.parametrize(
    ("raw_stato", "dettaglio", "expected"),
    [
        ("conforme", "Conformità urbanistica e catastale in regola", "conforme"),
        ("Conforme", None, "conforme"),
        ("non conforme", "Difformità edilizie rilevate", "non_conforme"),
        ("difforme", "Abuso edilizio", "non_conforme"),
        ("non_rilevato", "Non indicato", "non_rilevato"),
    ],
)
def test_normalize_conformita_stato(raw_stato: str, dettaglio: str | None, expected: str) -> None:
    meta_docs = _meta_docs()
    part = empty_extraction(meta_docs)
    part["urbanistica"]["conformita_urbanistica"] = {"stato": raw_stato, "dettaglio": dettaglio}
    merged = merge_extractions([part], meta_docs, "4")
    assert merged["urbanistica"]["conformita_urbanistica"]["stato"] == expected


def test_merge_conformita_prefers_perizia_over_avviso() -> None:
    meta_docs = _meta_docs()
    avviso = empty_extraction(meta_docs)
    avviso["urbanistica"]["conformita_urbanistica"] = {
        "stato": "non_conforme",
        "dettaglio": "Difformità segnalata in avviso",
        "source": {"file": "avviso.pdf", "page": 1},
    }
    perizia = empty_extraction(meta_docs)
    perizia["urbanistica"]["conformita_urbanistica"] = {
        "stato": "conforme",
        "dettaglio": "CTU: conformità urbanistica e catastale",
        "source": {"file": "perizia.pdf", "page": 18},
    }
    merged = merge_extractions([avviso, perizia], meta_docs, "4")
    assert merged["urbanistica"]["conformita_urbanistica"]["stato"] == "conforme"


def test_merge_conformita_non_conforme_with_difformita_list() -> None:
    meta_docs = [{"file": "perizia.pdf", "doc_type": "perizia", "pages": 3, "ocr_pages": 0}]
    part = empty_extraction(meta_docs)
    part["urbanistica"]["conformita_urbanistica"] = {
        "stato": "non_conforme",
        "dettaglio": "Opere realizzate in assenza di titolo",
    }
    part["urbanistica"]["conformita_catastale"] = {"stato": "non_conforme", "dettaglio": "Planimetria difforme"}
    part["urbanistica"]["difformita"] = [
        {
            "descrizione": "CILA in sanatoria presentata",
            "sanabile": True,
            "costo_stimato": None,
            "source": {"file": "perizia.pdf", "page": 20},
        }
    ]
    merged = merge_extractions([part], meta_docs, "unico")
    assert merged["urbanistica"]["conformita_urbanistica"]["stato"] == "non_conforme"
    assert len(merged["urbanistica"]["difformita"]) == 1
    assert merged["urbanistica"]["difformita"][0]["sanabile"] is True


def test_gt5_negative_space_lotto_h_stays_conforme_with_other_lot_difformita() -> None:
    meta_docs = [{"file": "perizia.pdf", "doc_type": "perizia", "pages": 10, "ocr_pages": 0}]
    other_lot = empty_extraction(meta_docs)
    other_lot["urbanistica"]["conformita_urbanistica"] = {
        "stato": "non_conforme",
        "dettaglio": "Lotti A, C, D presentano difformità edilizie",
    }
    other_lot["urbanistica"]["difformita"] = [
        {
            "descrizione": "Abuso edilizio lotto A",
            "sanabile": False,
            "costo_stimato": None,
            "source": {"file": "perizia.pdf", "page": 5},
        }
    ]
    target_lot = empty_extraction(meta_docs)
    target_lot["urbanistica"]["conformita_urbanistica"] = {
        "stato": "conforme",
        "dettaglio": "Lotto H conforme urbanisticamente e catastale",
    }
    merged = merge_extractions([other_lot, target_lot], meta_docs, "H")
    assert merged["urbanistica"]["conformita_urbanistica"]["stato"] == "conforme"
    assert merged["urbanistica"]["difformita"] == []


def test_page_lot_priority_boosts_perizia_conformita_keywords() -> None:
    perizia_conf = page_lot_priority(
        "Conformità urbanistica e catastale: difformità edilizie CTU",
        "H",
        "perizia",
    )
    perizia_generic = page_lot_priority("Descrizione generica", "H", "perizia")
    assert perizia_conf > perizia_generic


def test_derive_cauzione_importo_coerces_string_pct() -> None:
    economics = {
        "prezzo_base": {"value": 64906, "source": {"file": "avviso.pdf", "page": 1}},
        "cauzione": {
            "pct": "10%",
            "base": None,
            "importo": None,
            "source": {"file": "avviso.pdf", "page": 4},
        },
    }
    derive_cauzione_importo(economics)
    assert economics["cauzione"]["pct"] == 10.0
    assert economics["cauzione"]["base"] == "prezzo_base"
    assert economics["cauzione"]["importo"] == 6490.6
    assert economics["cauzione"]["derived"] is True


def test_derive_cauzione_importo_skips_prezzo_offerto_base() -> None:
    economics = {
        "prezzo_base": {"value": 100000, "source": {"file": "avviso.pdf", "page": 1}},
        "cauzione": {
            "pct": 20,
            "base": "prezzo_offerto",
            "importo": None,
            "source": {"file": "avviso.pdf", "page": 2},
        },
    }
    derive_cauzione_importo(economics)
    assert economics["cauzione"].get("importo") is None
    assert "derived" not in economics["cauzione"]


def test_merge_cauzione_fills_pct_from_other_chunk_and_derives_importo() -> None:
    meta_docs = [{"file": "avviso.pdf", "doc_type": "avviso", "pages": 2, "ocr_pages": 0}]
    pct_only = empty_extraction(meta_docs, not_found=["economics.cauzione.importo"])
    pct_only["economics"]["prezzo_base"] = {
        "value": 36039,
        "source": {"file": "avviso.pdf", "page": 1},
    }
    pct_only["economics"]["cauzione"] = {
        "pct": 10,
        "base": "prezzo_base",
        "importo": None,
        "source": {"file": "avviso.pdf", "page": 5},
    }
    importo_only = empty_extraction(meta_docs)
    importo_only["economics"]["cauzione"] = {
        "pct": None,
        "base": "prezzo_base",
        "importo": 3603.9,
        "source": {"file": "avviso.pdf", "page": 5},
    }
    merged = merge_extractions([pct_only, importo_only], meta_docs, "4")
    assert merged["economics"]["cauzione"]["pct"] == 10
    assert merged["economics"]["cauzione"]["importo"] == 3603.9
    assert "derived" not in merged["economics"]["cauzione"]


def test_merge_derives_cauzione_when_pct_in_later_chunk() -> None:
    meta_docs = [{"file": "avviso.pdf", "doc_type": "avviso", "pages": 2, "ocr_pages": 0}]
    prezzo = empty_extraction(meta_docs)
    prezzo["economics"]["prezzo_base"] = {
        "value": 100355.25,
        "source": {"file": "avviso.pdf", "page": 4},
    }
    cau = empty_extraction(meta_docs, not_found=["economics.cauzione.importo"])
    cau["economics"]["cauzione"] = {
        "pct": 10,
        "base": "prezzo_base",
        "importo": None,
        "source": {"file": "avviso.pdf", "page": 6},
    }
    merged = merge_extractions([prezzo, cau], meta_docs, "H")
    assert merged["economics"]["cauzione"]["importo"] == 10035.52
    assert merged["economics"]["cauzione"]["derived"] is True


# --- EC-33: valore_stima correctness (€/mq guard, per-lot stima, packing) ---


def test_guard_valore_stima_rejects_suspect_euro_mq_misparse() -> None:
    economics = {
        "prezzo_base": {"value": 84000, "source": {"file": "avviso.pdf", "page": 1}},
        "valore_stima": {
            "value": 84,
            "source": {"file": "perizia.pdf", "page": 16},
        },
    }
    meta: dict = {"not_found": [], "warnings": []}
    guard_valore_stima_plausibility(economics, meta, min_prezzo_base_ratio=0.01)
    assert economics["valore_stima"] is None
    assert "economics.valore_stima" in meta["not_found"]
    assert "valore_stima_suspect" in meta["warnings"]


def test_guard_valore_stima_keeps_plausible_total() -> None:
    economics = {
        "prezzo_base": {"value": 84000, "source": {"file": "avviso.pdf", "page": 1}},
        "valore_stima": {
            "value": 130466.02,
            "source": {"file": "perizia.pdf", "page": 25},
        },
    }
    meta: dict = {"not_found": [], "warnings": []}
    guard_valore_stima_plausibility(economics, meta, min_prezzo_base_ratio=0.01)
    assert economics["valore_stima"]["value"] == 130466.02
    assert "valore_stima_suspect" not in meta["warnings"]


def test_merge_valore_stima_rejects_suspect_with_prezzo_base() -> None:
    meta_docs = _meta_docs()
    part = empty_extraction(meta_docs)
    part["economics"]["prezzo_base"] = {
        "value": 84000,
        "source": {"file": "avviso.pdf", "page": 1},
    }
    part["economics"]["valore_stima"] = {
        "value": 84,
        "source": {"file": "perizia.pdf", "page": 16},
    }
    merged = merge_extractions([part], meta_docs, None)
    assert merged["economics"]["valore_stima"] is None
    assert "economics.valore_stima" in merged["meta"]["not_found"]
    assert "valore_stima_suspect" in merged["meta"]["warnings"]


def test_merge_valore_stima_per_lot_selects_target_only() -> None:
    meta_docs = [{"file": "perizia.pdf", "doc_type": "perizia", "pages": 20, "ocr_pages": 0}]
    lot7 = empty_extraction(meta_docs)
    lot7["economics"]["valore_stima"] = {
        "value": 180000,
        "dettaglio": "Lotto 7 — valore di stima complessivo",
        "source": {"file": "perizia.pdf", "page": 14},
    }
    lot4 = empty_extraction(meta_docs)
    lot4["economics"]["valore_stima"] = {
        "value": 242776,
        "dettaglio": "Lotto 4 — valore di stima complessivo",
        "source": {"file": "perizia.pdf", "page": 14},
    }
    merged = merge_extractions([lot7, lot4], meta_docs, "4")
    assert merged["economics"]["valore_stima"]["value"] == 242776


def test_merge_valore_stima_drops_other_lot_via_lotto_field() -> None:
    meta_docs = [{"file": "perizia.pdf", "doc_type": "perizia", "pages": 20, "ocr_pages": 0}]
    other = empty_extraction(meta_docs)
    other["economics"]["valore_stima"] = {
        "value": 58056,
        "lotto": "7",
        "source": {"file": "perizia.pdf", "page": 17},
    }
    target = empty_extraction(meta_docs)
    target["economics"]["valore_stima"] = {
        "value": 242776,
        "lotto": "4",
        "source": {"file": "perizia.pdf", "page": 17},
    }
    merged = merge_extractions([other, target], meta_docs, "4")
    assert merged["economics"]["valore_stima"]["value"] == 242776


def test_extract_valore_stima_euro_mq_only_returns_not_found(monkeypatch: pytest.MonkeyPatch) -> None:
    payload = empty_extraction(
        [{"file": "perizia.pdf", "doc_type": "perizia", "pages": 1, "ocr_pages": 0}],
        not_found=["economics.valore_stima"],
    )
    payload["economics"]["prezzo_base"] = {
        "value": 84000,
        "source": {"file": "perizia.pdf", "page": 1},
    }

    def fake_complete(s, system, user):  # noqa: ARG001
        assert "NEVER a per-square-metre" in system
        assert "NEVER multiply" in system
        return json.dumps(payload)

    monkeypatch.setattr(aste_extract, "_complete_long", fake_complete)
    s = Settings(CHAT_PROVIDER="openai", OPENAI_API_KEY="sk-test")
    req = ExtractRequest(
        language="it",
        documents=[
            ExtractDocumentIn(
                file="perizia.pdf",
                doc_type="perizia",
                pages=[
                    ExtractPageIn(
                        page=16,
                        text="Valore unitario €/mq 84 — nessun valore complessivo indicato",
                    )
                ],
            )
        ],
    )
    out = run_extract(req, settings=s)
    assert out["economics"]["valore_stima"] is None
    assert "economics.valore_stima" in out["meta"]["not_found"]


def test_extract_valore_stima_total_from_table(monkeypatch: pytest.MonkeyPatch) -> None:
    payload = empty_extraction(
        [{"file": "perizia.pdf", "doc_type": "perizia", "pages": 1, "ocr_pages": 0}],
        not_found=[],
    )
    payload["economics"]["prezzo_base"] = {
        "value": 84000,
        "source": {"file": "perizia.pdf", "page": 1},
    }
    payload["economics"]["valore_stima"] = {
        "value": 130466.02,
        "dettaglio": "Valore complessivo del lotto (non €/mq)",
        "source": {"file": "perizia.pdf", "page": 16},
    }

    def fake_complete(s, system, user):  # noqa: ARG001
        return json.dumps(payload)

    monkeypatch.setattr(aste_extract, "_complete_long", fake_complete)
    s = Settings(CHAT_PROVIDER="openai", OPENAI_API_KEY="sk-test")
    req = ExtractRequest(
        language="it",
        documents=[
            ExtractDocumentIn(
                file="perizia.pdf",
                doc_type="perizia",
                pages=[
                    ExtractPageIn(
                        page=16,
                        text="€/mq 1.550 — Valore complessivo euro 130.466,02",
                    )
                ],
            )
        ],
    )
    out = run_extract(req, settings=s)
    assert out["economics"]["valore_stima"]["value"] == 130466.02


def test_page_lot_priority_boosts_late_perizia_valore_mercato_keywords() -> None:
    late_stima = page_lot_priority(
        "Lotto H riepilogo valori — valore di mercato euro 58056 CTU pag. 25",
        "H",
        "perizia",
    )
    filler = page_lot_priority("Lotto H descrizione catastale generica", "H", "perizia")
    assert late_stima > filler


def test_split_prioritizes_late_perizia_valore_stima_pages() -> None:
    docs = [
        ExtractDocumentIn(
            file="filler",
            doc_type="avviso",
            pages=[ExtractPageIn(page=1, text="Lotto H avviso " + ("x" * 800))],
        ),
        *[
            ExtractDocumentIn(
                file=f"d{i}",
                doc_type="perizia",
                pages=[ExtractPageIn(page=i, text=f"Lotto H filler {i} " + ("z" * 800))],
            )
            for i in range(1, 25)
        ],
        ExtractDocumentIn(
            file="perizia_stima",
            doc_type="perizia",
            pages=[
                ExtractPageIn(
                    page=25,
                    text=(
                        "Lotto H valore di mercato — più probabile valore di mercato "
                        "euro 58056 riepilogo valori CTU " + ("y" * 800)
                    ),
                )
            ],
        ),
    ]
    chunks = split_documents_for_extract(
        docs, language="it", lotto_label="H", max_user_chars=3_500
    )
    first_files = {d.file for d in chunks[0]}
    assert "perizia_stima" in first_files


# --- EC-34: lot-bleed economics, orphaned stato, stima micro-chunk ---


def _two_lot_avviso_page_text() -> str:
    return (
        "Quarta vendita senza incanto\n"
        "Lotto 4\n"
        "Prezzo base € 36.039,00\n"
        "Offerta minima € 27.029,25\n"
        "Cauzione 10% del prezzo base\n"
        "Lotto 7\n"
        "Prezzo base € 64.906,00\n"
        "Offerta minima € 48.680,00\n"
        "Cauzione 10% del prezzo base\n"
    )


def test_ec34_two_lot_avviso_economics_isolation_both_directions() -> None:
    meta_docs = [{"file": "avviso.pdf", "doc_type": "avviso", "pages": 1, "ocr_pages": 0}]
    page_text = _two_lot_avviso_page_text()
    page_text_index = {("avviso.pdf", 1): page_text}

    lot4 = empty_extraction(meta_docs)
    lot4["economics"]["prezzo_base"] = {
        "value": 36039,
        "dettaglio": "Lotto 4",
        "source": {"file": "avviso.pdf", "page": 1},
    }
    lot4["economics"]["offerta_minima"] = {
        "value": 27029.25,
        "dettaglio": "Lotto 4",
        "source": {"file": "avviso.pdf", "page": 1},
    }
    lot7 = empty_extraction(meta_docs)
    lot7["economics"]["prezzo_base"] = {
        "value": 64906,
        "dettaglio": "Lotto 7",
        "source": {"file": "avviso.pdf", "page": 1},
    }
    lot7["economics"]["offerta_minima"] = {
        "value": 48680,
        "dettaglio": "Lotto 7",
        "source": {"file": "avviso.pdf", "page": 1},
    }

    merged4 = merge_extractions(
        [lot4, lot7], meta_docs, "4", page_text_index=page_text_index
    )
    assert merged4["economics"]["prezzo_base"]["value"] == 36039
    assert merged4["economics"]["offerta_minima"]["value"] == 27029.25

    merged7 = merge_extractions(
        [lot4, lot7], meta_docs, "7", page_text_index=page_text_index
    )
    assert merged7["economics"]["prezzo_base"]["value"] == 64906
    assert merged7["economics"]["offerta_minima"]["value"] == 48680


def test_ec34_two_lot_avviso_occupazione_no_cross_bleed() -> None:
    meta_docs = [{"file": "avviso.pdf", "doc_type": "avviso", "pages": 1, "ocr_pages": 0}]
    page_text_index = {("avviso.pdf", 1): _two_lot_avviso_page_text()}

    lot4_occ = empty_extraction(meta_docs)
    lot4_occ["giuridica"]["stato_occupazione"] = {
        "stato": "libero",
        "dettaglio": "Lotto 4 libero da persone e cose",
        "source": {"file": "avviso.pdf", "page": 1},
    }
    lot7_occ = empty_extraction(meta_docs)
    lot7_occ["giuridica"]["stato_occupazione"] = {
        "stato": "occupato_senza_titolo",
        "dettaglio": "Lotto 7 occupato senza titolo",
        "source": {"file": "avviso.pdf", "page": 1},
    }

    merged4 = merge_extractions(
        [lot4_occ, lot7_occ], meta_docs, "4", page_text_index=page_text_index
    )
    assert merged4["giuridica"]["stato_occupazione"]["stato"] == "libero"

    merged7 = merge_extractions(
        [lot4_occ, lot7_occ], meta_docs, "7", page_text_index=page_text_index
    )
    assert merged7["giuridica"]["stato_occupazione"]["stato"] == "occupato_senza_titolo"


def test_ec34_orphaned_non_conforme_stato_becomes_non_rilevato() -> None:
    meta_docs = [{"file": "perizia.pdf", "doc_type": "perizia", "pages": 5, "ocr_pages": 0}]
    part = empty_extraction(meta_docs)
    part["urbanistica"]["conformita_urbanistica"] = {
        "stato": "non_conforme",
        "dettaglio": "Lotti A, C, D presentano difformità edilizie",
        "source": {"file": "perizia.pdf", "page": 3},
    }
    part["urbanistica"]["difformita"] = [
        {
            "descrizione": "Abuso edilizio lotto A",
            "sanabile": False,
            "costo_stimato": None,
            "source": {"file": "perizia.pdf", "page": 3},
        }
    ]
    merged = merge_extractions([part], meta_docs, "H")
    assert merged["urbanistica"]["conformita_urbanistica"]["stato"] == "non_rilevato"
    assert merged["urbanistica"]["difformita"] == []
    assert "orphaned_conformita_stato_dropped" in merged["meta"]["warnings"]


def test_ec34_not_found_reconciled_after_valore_stima_fill() -> None:
    meta_docs = _meta_docs()
    part = empty_extraction(meta_docs, not_found=["economics.valore_stima.value"])
    part["economics"]["valore_stima"] = {
        "value": 156000,
        "source": {"file": "perizia.pdf", "page": 31},
    }
    merged = merge_extractions([part], meta_docs, "H")
    assert merged["economics"]["valore_stima"]["value"] == 156000
    assert "economics.valore_stima" not in merged["meta"]["not_found"]
    assert "economics.valore_stima.value" not in merged["meta"]["not_found"]


def test_ec34_per_lot_cauzione_derive_deterministic_same_avviso() -> None:
    meta_docs = [{"file": "avviso.pdf", "doc_type": "avviso", "pages": 1, "ocr_pages": 0}]
    page_text = _two_lot_avviso_page_text()
    page_text_index = {("avviso.pdf", 1): page_text}

    def _part_for_lot(label: str, prezzo: float) -> dict:
        part = empty_extraction(meta_docs)
        part["economics"]["prezzo_base"] = {
            "value": prezzo,
            "dettaglio": f"Lotto {label}",
            "source": {"file": "avviso.pdf", "page": 1},
        }
        part["economics"]["cauzione"] = {
            "pct": 10,
            "base": "prezzo_base",
            "importo": None,
            "dettaglio": f"Lotto {label}",
            "source": {"file": "avviso.pdf", "page": 1},
        }
        return part

    merged_a = merge_extractions(
        [_part_for_lot("A", 130000)], meta_docs, "A", page_text_index=page_text_index
    )
    merged_b = merge_extractions(
        [_part_for_lot("B", 80000)], meta_docs, "B", page_text_index=page_text_index
    )
    assert merged_a["economics"]["cauzione"]["importo"] == 13000.0
    assert merged_b["economics"]["cauzione"]["importo"] == 8000.0
    assert merged_a["economics"]["cauzione"]["derived"] is True
    assert merged_b["economics"]["cauzione"]["derived"] is True


def test_ec34_stima_microchunk_fills_valore_stima(monkeypatch: pytest.MonkeyPatch) -> None:
    calls: list[str] = []

    def fake_complete(s, system, user):  # noqa: ARG001
        calls.append(user)
        if '"microchunk"' in user:
            payload = empty_extraction(
                [{"file": "perizia.pdf", "doc_type": "perizia", "pages": 1, "ocr_pages": 0}],
                not_found=[],
            )
            payload["economics"]["valore_stima"] = {
                "value": 58056,
                "dettaglio": "Lotto H valore di mercato CTU",
                "source": {"file": "perizia.pdf", "page": 25},
            }
            return json.dumps(payload)
        payload = empty_extraction(
            [{"file": "perizia.pdf", "doc_type": "perizia", "pages": 1, "ocr_pages": 0}],
            not_found=["economics.valore_stima"],
        )
        payload["economics"]["prezzo_base"] = {
            "value": 50000,
            "source": {"file": "avviso.pdf", "page": 1},
        }
        return json.dumps(payload)

    monkeypatch.setattr(aste_extract, "_complete_long", fake_complete)
    s = Settings(
        CHAT_PROVIDER="openai",
        OPENAI_API_KEY="sk-test",
        ASTE_STIMA_MICROCHUNK_ENABLED=True,
    )
    req = ExtractRequest(
        language="it",
        lotto_label="H",
        documents=[
            ExtractDocumentIn(
                file="avviso.pdf",
                doc_type="avviso",
                pages=[ExtractPageIn(page=1, text="Lotto H prezzo base 50000")],
            ),
            ExtractDocumentIn(
                file="perizia.pdf",
                doc_type="perizia",
                pages=[
                    ExtractPageIn(
                        page=25,
                        text="Lotto H valore di mercato CTU euro 58056 riepilogo valori",
                    )
                ],
            ),
        ],
    )
    out = run_extract(req, settings=s)
    assert len(calls) == 2
    assert any('"microchunk"' in c for c in calls)
    assert out["economics"]["valore_stima"]["value"] == 58056
    assert "economics.valore_stima" not in out["meta"]["not_found"]
    assert "stima_microchunk:fill" in out["meta"]["warnings"]


def test_ec34_stima_microchunk_skipped_without_perizia(monkeypatch: pytest.MonkeyPatch) -> None:
    calls: list[str] = []

    def fake_complete(s, system, user):  # noqa: ARG001
        calls.append(user)
        payload = empty_extraction(
            [{"file": "avviso.pdf", "doc_type": "avviso", "pages": 1, "ocr_pages": 0}],
            not_found=["economics.valore_stima"],
        )
        payload["economics"]["prezzo_base"] = {
            "value": 64906,
            "source": {"file": "avviso.pdf", "page": 1},
        }
        return json.dumps(payload)

    monkeypatch.setattr(aste_extract, "_complete_long", fake_complete)
    s = Settings(
        CHAT_PROVIDER="openai",
        OPENAI_API_KEY="sk-test",
        ASTE_STIMA_MICROCHUNK_ENABLED=True,
    )
    req = ExtractRequest(
        language="it",
        lotto_label="7",
        documents=[
            ExtractDocumentIn(
                file="avviso.pdf",
                doc_type="avviso",
                pages=[ExtractPageIn(page=1, text="Lotto 7 prezzo base 64906")],
            )
        ],
    )
    out = run_extract(req, settings=s)
    assert len(calls) == 1
    assert out["economics"]["valore_stima"] is None
    assert "economics.valore_stima" in out["meta"]["not_found"]


def test_ec34_stima_microchunk_guard_rejects_suspect(monkeypatch: pytest.MonkeyPatch) -> None:
    def fake_complete(s, system, user):  # noqa: ARG001
        if '"microchunk"' in user:
            payload = empty_extraction(
                [{"file": "perizia.pdf", "doc_type": "perizia", "pages": 1, "ocr_pages": 0}],
                not_found=[],
            )
            payload["economics"]["valore_stima"] = {
                "value": 84,
                "source": {"file": "perizia.pdf", "page": 16},
            }
            return json.dumps(payload)
        payload = empty_extraction(
            [{"file": "perizia.pdf", "doc_type": "perizia", "pages": 1, "ocr_pages": 0}],
            not_found=["economics.valore_stima"],
        )
        payload["economics"]["prezzo_base"] = {
            "value": 84000,
            "source": {"file": "perizia.pdf", "page": 1},
        }
        return json.dumps(payload)

    monkeypatch.setattr(aste_extract, "_complete_long", fake_complete)
    s = Settings(
        CHAT_PROVIDER="openai",
        OPENAI_API_KEY="sk-test",
        ASTE_STIMA_MICROCHUNK_ENABLED=True,
    )
    req = ExtractRequest(
        language="it",
        documents=[
            ExtractDocumentIn(
                file="perizia.pdf",
                doc_type="perizia",
                pages=[
                    ExtractPageIn(page=16, text="Valore di stima unitario €/mq 84"),
                    ExtractPageIn(page=1, text="Prezzo base 84000"),
                ],
            )
        ],
    )
    out = run_extract(req, settings=s)
    assert out["economics"]["valore_stima"] is None
    assert "economics.valore_stima" in out["meta"]["not_found"]
    assert "valore_stima_suspect" in out["meta"]["warnings"]


# --- EC-35: Ex2 lotto-7 association — competing 153850 must lose ---


def _ex2_avviso_competing_other_lot_text() -> str:
    """Synthetic shape: correct L4/L7 rows + distractor lot carrying the live wrong pair."""
    return (
        "Tribunale di Ragusa — Quarta vendita senza incanto\n"
        "Lotto 4: immobili siti in C/da Esempio, foglio 1, particelle 10-11.\n"
        "Prezzo base d'asta: Euro 36.039,00\n"
        "Offerta minima: Euro 27.029,25\n"
        "Cauzione: 10% del prezzo offerto. Rilancio minimo: Euro 1.000,00\n"
        "Lotto 7: immobili siti in C/da Esempio, foglio 95, particelle 89-29-30-91.\n"
        "Prezzo base d'asta: Euro 64.906,00\n"
        "Offerta minima: Euro 48.680,00\n"
        "Cauzione: 10% del prezzo offerto. Rilancio minimo: Euro 1.500,00\n"
        "Lotto 12: fabbricato rurale.\n"
        "Prezzo base d'asta: Euro 153.850,00\n"
        "Offerta minima: Euro 115.387,50\n"
    )


def _ex2_avviso_older_attempt_under_lot7_text() -> str:
    """Synthetic shape: older vendita 153850 under Lotto 7; current quarta = 64906."""
    return (
        "Avviso di vendita — Quarta vendita senza incanto\n"
        "Lotto 7\n"
        "Prima vendita: prezzo base euro 153.850,00 — offerta minima euro 115.387,50\n"
        "Quarta vendita: prezzo base d'asta euro 64.906,00 — offerta minima euro 48.680,00\n"
        "Lotto 4\n"
        "Prezzo base d'asta euro 36.039,00 — offerta minima euro 27.029,25\n"
    )


def test_ec35_untagged_wrong_lot_row_rejected_for_lotto7() -> None:
    """Live failure class: LLM emits only 153850 untagged on a multi-lot avviso page."""
    meta_docs = [{"file": "avviso.pdf", "doc_type": "avviso", "pages": 1, "ocr_pages": 0}]
    page_text = _ex2_avviso_competing_other_lot_text()
    page_text_index = {("avviso.pdf", 1): page_text}

    wrong = empty_extraction(meta_docs)
    wrong["economics"]["prezzo_base"] = {
        "value": 153850,
        "source": {"file": "avviso.pdf", "page": 1},
    }
    wrong["economics"]["offerta_minima"] = {
        "value": 115387.5,
        "source": {"file": "avviso.pdf", "page": 1},
    }

    merged7 = merge_extractions([wrong], meta_docs, "7", page_text_index=page_text_index)
    assert merged7["economics"]["prezzo_base"]["value"] == 64906
    assert merged7["economics"]["offerta_minima"]["value"] == 48680
    assert "auction_lot_section_parse" in merged7["meta"]["warnings"]

    merged4 = merge_extractions([wrong], meta_docs, "4", page_text_index=page_text_index)
    assert merged4["economics"]["prezzo_base"]["value"] == 36039
    assert merged4["economics"]["offerta_minima"]["value"] == 27029.25


def test_ec35_wrong_dettaglio_tag_overridden_by_section() -> None:
    """LLM tags 153850 as Lotto 7 but the number only appears under another lot."""
    meta_docs = [{"file": "avviso.pdf", "doc_type": "avviso", "pages": 1, "ocr_pages": 0}]
    page_text_index = {("avviso.pdf", 1): _ex2_avviso_competing_other_lot_text()}

    wrong = empty_extraction(meta_docs)
    wrong["economics"]["prezzo_base"] = {
        "value": 153850,
        "dettaglio": "Lotto 7",
        "lotto": "7",
        "source": {"file": "avviso.pdf", "page": 1},
    }
    wrong["economics"]["offerta_minima"] = {
        "value": 115387.5,
        "dettaglio": "Lotto 7",
        "lotto": "7",
        "source": {"file": "avviso.pdf", "page": 1},
    }

    merged = merge_extractions([wrong], meta_docs, "7", page_text_index=page_text_index)
    assert merged["economics"]["prezzo_base"]["value"] == 64906
    assert merged["economics"]["offerta_minima"]["value"] == 48680


def test_ec35_older_vendita_under_same_lot_prefers_current() -> None:
    meta_docs = [{"file": "avviso.pdf", "doc_type": "avviso", "pages": 1, "ocr_pages": 0}]
    page_text_index = {("avviso.pdf", 1): _ex2_avviso_older_attempt_under_lot7_text()}

    wrong = empty_extraction(meta_docs)
    wrong["economics"]["prezzo_base"] = {
        "value": 153850,
        "dettaglio": "Lotto 7",
        "source": {"file": "avviso.pdf", "page": 1},
    }
    wrong["economics"]["offerta_minima"] = {
        "value": 115387.5,
        "dettaglio": "Lotto 7",
        "source": {"file": "avviso.pdf", "page": 1},
    }

    merged7 = merge_extractions([wrong], meta_docs, "7", page_text_index=page_text_index)
    assert merged7["economics"]["prezzo_base"]["value"] == 64906
    assert merged7["economics"]["offerta_minima"]["value"] == 48680

    merged4 = merge_extractions([wrong], meta_docs, "4", page_text_index=page_text_index)
    assert merged4["economics"]["prezzo_base"]["value"] == 36039


def test_ec35_first_fill_bleed_cleared_when_only_other_lot_candidate() -> None:
    """Tagged-other-lot candidate must not leave first-fill 153850 after finalize."""
    meta_docs = [{"file": "avviso.pdf", "doc_type": "avviso", "pages": 1, "ocr_pages": 0}]
    page_text_index = {("avviso.pdf", 1): _ex2_avviso_competing_other_lot_text()}

    other = empty_extraction(meta_docs)
    other["economics"]["prezzo_base"] = {
        "value": 153850,
        "dettaglio": "Lotto 12",
        "source": {"file": "avviso.pdf", "page": 1},
    }
    other["economics"]["offerta_minima"] = {
        "value": 115387.5,
        "dettaglio": "Lotto 12",
        "source": {"file": "avviso.pdf", "page": 1},
    }

    merged = merge_extractions([other], meta_docs, "7", page_text_index=page_text_index)
    assert merged["economics"]["prezzo_base"]["value"] == 64906
    assert merged["economics"]["offerta_minima"]["value"] == 48680


def test_ec35_wrong_only_llm_red_on_main_tip() -> None:
    """Documents EC-34 gap: untagged wrong-lot LLM row kept 153850 on main before EC-35."""
    # Verified manually against main @ d7f24fb: merge_extractions(..., "7") → 153850/115387.5
    meta_docs = [{"file": "avviso.pdf", "doc_type": "avviso", "pages": 1, "ocr_pages": 0}]
    page_text_index = {("avviso.pdf", 1): _ex2_avviso_competing_other_lot_text()}
    wrong = empty_extraction(meta_docs)
    wrong["economics"]["prezzo_base"] = {
        "value": 153850,
        "source": {"file": "avviso.pdf", "page": 1},
    }
    wrong["economics"]["offerta_minima"] = {
        "value": 115387.5,
        "source": {"file": "avviso.pdf", "page": 1},
    }
    merged = merge_extractions([wrong], meta_docs, "7", page_text_index=page_text_index)
    assert merged["economics"]["prezzo_base"]["value"] != 153850
    assert merged["economics"]["offerta_minima"]["value"] != 115387.5


def test_ec35_honest_not_found_when_no_target_section_or_candidates() -> None:
    """Neither deterministic parse nor lot-filtered LLM → not_found (no cross-lot bleed)."""
    meta_docs = [{"file": "avviso.pdf", "doc_type": "avviso", "pages": 1, "ocr_pages": 0}]
    page_text = (
        "Lotto 4\nPrezzo base d'asta Euro 36.039,00\nOfferta minima Euro 27.029,25\n"
        "Lotto 12\nPrezzo base d'asta Euro 153.850,00\nOfferta minima Euro 115.387,50\n"
    )
    page_text_index = {("avviso.pdf", 1): page_text}
    other = empty_extraction(meta_docs, not_found=["economics.prezzo_base", "economics.offerta_minima"])
    other["economics"]["prezzo_base"] = {
        "value": 153850,
        "dettaglio": "Lotto 12",
        "source": {"file": "avviso.pdf", "page": 1},
    }
    other["economics"]["offerta_minima"] = {
        "value": 115387.5,
        "dettaglio": "Lotto 12",
        "source": {"file": "avviso.pdf", "page": 1},
    }
    merged = merge_extractions([other], meta_docs, "7", page_text_index=page_text_index)
    assert merged["economics"]["prezzo_base"] is None
    assert merged["economics"]["offerta_minima"] is None
    assert "economics.prezzo_base" in merged["meta"]["not_found"]
    assert "economics.offerta_minima" in merged["meta"]["not_found"]


def test_ec35_single_lot_doc_skips_deterministic_override() -> None:
    """Single-lot avviso: LLM candidate kept; no auction_lot_section_parse warning."""
    meta_docs = [{"file": "avviso.pdf", "doc_type": "avviso", "pages": 1, "ocr_pages": 0}]
    page_text = (
        "Lotto 7\nPrezzo base d'asta Euro 64.906,00\nOfferta minima Euro 48.680,00\n"
    )
    page_text_index = {("avviso.pdf", 1): page_text}
    llm = empty_extraction(meta_docs)
    llm["economics"]["prezzo_base"] = {
        "value": 70000,
        "source": {"file": "avviso.pdf", "page": 1},
    }
    llm["economics"]["offerta_minima"] = {
        "value": 52500,
        "source": {"file": "avviso.pdf", "page": 1},
    }
    merged = merge_extractions([llm], meta_docs, "7", page_text_index=page_text_index)
    assert merged["economics"]["prezzo_base"]["value"] == 70000
    assert "auction_lot_section_parse" not in merged["meta"].get("warnings", [])


def test_ec35_italian_number_formats_in_section_parse() -> None:
    """Italian formats € 64.906 / Euro 64.906,00 / 48.680,00 parse correctly."""
    meta_docs = [{"file": "avviso.pdf", "doc_type": "avviso", "pages": 1, "ocr_pages": 0}]
    page_text = (
        "Lotto 4\nPrezzo base d'asta € 36.039\nOfferta minima € 27.029,25\n"
        "Lotto 7\nPrezzo base d'asta Euro 64.906,00\nOfferta minima: Euro 48.680,00\n"
        "Cauzione: 10% del prezzo offerto. Rilancio minimo: Euro 1.500,00\n"
    )
    page_text_index = {("avviso.pdf", 1): page_text}
    empty = empty_extraction(meta_docs)
    merged7 = merge_extractions([empty], meta_docs, "7", page_text_index=page_text_index)
    assert merged7["economics"]["prezzo_base"]["value"] == 64906
    assert merged7["economics"]["offerta_minima"]["value"] == 48680
    assert merged7["economics"]["rilancio_minimo"]["value"] == 1500
    assert merged7["economics"]["cauzione"]["pct"] == 10
    assert merged7["economics"]["prezzo_base"]["source"] == {"file": "avviso.pdf", "page": 1}
    assert "auction_lot_section_parse" in merged7["meta"]["warnings"]
