"""EC-29 — merge precedence, not_found union, token grouping tests."""

from __future__ import annotations

from app.services.aste_extract import empty_extraction
from app.services.aste_extract_merge import (
    group_documents_for_extract,
    merge_not_found,
    merge_partial_extractions,
    pick_best_sourced,
)


def _partial_prezzo(file: str, doc_type: str, value: float, page: int = 1) -> dict:
    return {
        "schema_version": 2,
        "economics": {
            "prezzo_base": {"value": value, "source": {"file": file, "page": page}},
        },
        "meta": {
            "not_found": [],
            "warnings": [],
            "lotti_trovati": [],
            "documents": [{"file": file, "doc_type": doc_type, "pages": 1, "ocr_pages": 0}],
        },
    }


def test_prezzo_base_precedence_avviso_over_ordinanza_ex2() -> None:
    """Ex2 GT-2: avviso 36039 beats ordinanza 85425."""
    doc_types = {"ord.pdf": "ordinanza", "avv.pdf": "avviso"}
    partials = [
        _partial_prezzo("ord.pdf", "ordinanza", 85425),
        _partial_prezzo("avv.pdf", "avviso", 36039),
    ]
    base = empty_extraction(
        [
            {"file": "ord.pdf", "doc_type": "ordinanza", "pages": 1, "ocr_pages": 0},
            {"file": "avv.pdf", "doc_type": "avviso", "pages": 1, "ocr_pages": 0},
        ],
    )
    merged = merge_partial_extractions(partials, doc_types, base)
    assert merged["economics"]["prezzo_base"]["value"] == 36039
    assert merged["economics"]["prezzo_base"]["source"]["file"] == "avv.pdf"


def test_prezzo_base_precedence_ordinanza_over_perizia() -> None:
    doc_types = {"per.pdf": "perizia", "ord.pdf": "ordinanza"}
    candidates = [
        {"value": 120000, "source": {"file": "per.pdf", "page": 2}},
        {"value": 95000, "source": {"file": "ord.pdf", "page": 1}},
    ]
    best = pick_best_sourced(candidates, doc_types)
    assert best is not None
    assert best["value"] == 95000


def test_not_found_union_field_found_in_any_partial_wins() -> None:
    partials = [
        {
            "schema_version": 2,
            "economics": {"cauzione": None},
            "meta": {"not_found": ["economics.cauzione"]},
        },
        {
            "schema_version": 2,
            "economics": {
                "cauzione": {
                    "pct": 10,
                    "base": "prezzo_base",
                    "importo": None,
                    "source": {"file": "avv.pdf", "page": 1},
                },
            },
            "meta": {"not_found": []},
        },
    ]
    base = empty_extraction([])
    merged = merge_partial_extractions(partials, {"avv.pdf": "avviso"}, base)
    assert merged["economics"]["cauzione"]["pct"] == 10
    assert "economics.cauzione" not in merged["meta"]["not_found"]


def test_not_found_union_true_miss_when_all_partials_miss() -> None:
    partials = [
        {"schema_version": 2, "meta": {"not_found": ["economics.valore_stima"]}},
        {"schema_version": 2, "meta": {"not_found": ["economics.valore_stima"]}},
    ]
    merged = {"economics": {"valore_stima": None}, "meta": {}}
    assert merge_not_found(partials, merged) == ["economics.valore_stima"]


def test_group_documents_respects_token_budget() -> None:
    docs = [
        {
            "file": f"doc{i}.pdf",
            "doc_type": "perizia",
            "pages": [{"page": 1, "text": "x" * 2000}],
        }
        for i in range(12)
    ]
    groups = group_documents_for_extract(
        docs,
        language="it",
        lotto_label=None,
        max_request_tokens=4000,
        system_prompt_tokens=500,
        response_reserve=512,
    )
    assert len(groups) >= 2
    for group in groups:
        assert len(group) >= 1


def test_lotti_trovati_union() -> None:
    partials = [
        {"schema_version": 2, "meta": {"lotti_trovati": ["H", "I"]}},
        {"schema_version": 2, "meta": {"lotti_trovati": ["I", "M"]}},
    ]
    base = empty_extraction([])
    merged = merge_partial_extractions(partials, {}, base)
    assert merged["meta"]["lotti_trovati"] == ["H", "I", "M"]
