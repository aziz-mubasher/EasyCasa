"""EC-29 — deterministic map-reduce merge + token budgeting for aste extract."""

from __future__ import annotations

import json
import re
from typing import Any

# Economics precedence: avviso > ordinanza > perizia (validated on Ex2 GT-2).
DOC_TYPE_RANK: dict[str, int] = {
    "avviso": 3,
    "ordinanza": 2,
    "perizia": 1,
}

FILENAME_DOC_HINT = re.compile(
    r"(avviso|ordinanza|perizia|decreto|sentenza|planimetria|visura|relazione)",
    re.IGNORECASE,
)

ECONOMICS_SOURCED_FIELDS = (
    "valore_stima",
    "prezzo_base",
    "offerta_minima",
    "rilancio_minimo",
    "superficie_commerciale_mq",
)


def estimate_tokens(text: str, model: str = "gpt-4o-mini") -> int:
    """Estimate token count; tiktoken when installed, else chars/4 heuristic."""
    try:
        import tiktoken

        try:
            enc = tiktoken.encoding_for_model(model)
        except KeyError:
            enc = tiktoken.get_encoding("cl100k_base")
        return len(enc.encode(text))
    except Exception:
        return max(1, len(text) // 4)


def infer_doc_type(file_label: str, doc_type_by_file: dict[str, str]) -> str | None:
    if file_label in doc_type_by_file:
        return doc_type_by_file[file_label].lower()
    m = FILENAME_DOC_HINT.search(file_label)
    return m.group(1).lower() if m else None


def doc_type_rank(doc_type: str | None) -> int:
    if not doc_type:
        return 0
    return DOC_TYPE_RANK.get(doc_type.lower(), 0)


def rank_sourced_field(
    value: dict[str, Any] | None,
    doc_type_by_file: dict[str, str],
) -> tuple[int, dict[str, Any] | None]:
    if not value or not isinstance(value, dict):
        return (-1, None)
    inner = value.get("value")
    if inner is None and value.get("importo") is None and value.get("pct") is None:
        return (-1, None)
    src = value.get("source") if isinstance(value.get("source"), dict) else {}
    file_label = str(src.get("file") or "")
    dt = infer_doc_type(file_label, doc_type_by_file)
    return (doc_type_rank(dt), value)


def pick_best_sourced(
    candidates: list[dict[str, Any] | None],
    doc_type_by_file: dict[str, str],
) -> dict[str, Any] | None:
    ranked = [rank_sourced_field(c, doc_type_by_file) for c in candidates]
    ranked = [(r, v) for r, v in ranked if v is not None]
    if not ranked:
        return None
    ranked.sort(key=lambda x: -x[0])
    return ranked[0][1]


def pick_best_cauzione(
    candidates: list[dict[str, Any] | None],
    doc_type_by_file: dict[str, str],
) -> dict[str, Any] | None:
    return pick_best_sourced(candidates, doc_type_by_file)


def _get_by_path(data: dict[str, Any], path: str) -> Any:
    cur: Any = data
    for part in path.split("."):
        if not isinstance(cur, dict):
            return None
        cur = cur.get(part)
    return cur


def field_has_value(data: dict[str, Any], path: str) -> bool:
    val = _get_by_path(data, path)
    if val is None:
        return False
    if isinstance(val, dict):
        if "value" in val:
            return val.get("value") is not None
        if "importo" in val or "pct" in val:
            return val.get("importo") is not None or val.get("pct") is not None
        if "stato" in val:
            return val.get("stato") is not None
    if isinstance(val, list):
        return len(val) > 0
    return True


def merge_not_found(partials: list[dict[str, Any]], merged: dict[str, Any]) -> list[str]:
    """Union of partial not_found minus fields that ended up populated in merged."""
    paths: set[str] = set()
    for p in partials:
        meta = p.get("meta") if isinstance(p.get("meta"), dict) else {}
        for item in meta.get("not_found") or []:
            if isinstance(item, str) and item.strip():
                paths.add(item.strip())
    return sorted(p for p in paths if not field_has_value(merged, p))


def _merge_scalar_block(
    key: str,
    partials: list[dict[str, Any]],
    base: dict[str, Any],
) -> dict[str, Any]:
    out = dict(base.get(key) or {})
    for p in partials:
        block = p.get(key)
        if not isinstance(block, dict):
            continue
        for field, val in block.items():
            if val is None:
                continue
            if field not in out or out[field] is None:
                out[field] = val
            elif isinstance(val, dict) and isinstance(out[field], dict):
                # shallow merge nested dicts (stato_occupazione, conformita_*)
                merged_inner = dict(out[field])
                for k, v in val.items():
                    if v is not None and merged_inner.get(k) is None:
                        merged_inner[k] = v
                out[field] = merged_inner
    return out


def _immobile_key(unit: dict[str, Any]) -> tuple[str, str, str]:
    return (
        str(unit.get("foglio") or ""),
        str(unit.get("particella") or ""),
        str(unit.get("subalterno") or ""),
    )


def merge_immobili(partials: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen: dict[tuple[str, str, str], dict[str, Any]] = {}
    order: list[tuple[str, str, str]] = []
    for p in partials:
        for unit in p.get("immobili") or []:
            if not isinstance(unit, dict):
                continue
            key = _immobile_key(unit)
            if key not in seen:
                seen[key] = dict(unit)
                order.append(key)
            else:
                existing = seen[key]
                for k, v in unit.items():
                    if v is not None and existing.get(k) is None:
                        existing[k] = v
    return [seen[k] for k in order]


def merge_partial_extractions(
    partials: list[dict[str, Any]],
    doc_type_by_file: dict[str, str],
    base: dict[str, Any],
) -> dict[str, Any]:
    """Deterministic reduce: precedence in code, not LLM."""
    if not partials:
        return base
    if len(partials) == 1:
        merged = dict(partials[0])
        merged.setdefault("meta", {})
        if not merged["meta"].get("documents"):
            merged["meta"]["documents"] = base.get("meta", {}).get("documents", [])
        return merged

    merged = dict(base)
    merged["procedura"] = _merge_scalar_block("procedura", partials, base)
    merged["giuridica"] = _merge_scalar_block("giuridica", partials, base)
    merged["urbanistica"] = _merge_scalar_block("urbanistica", partials, base)
    merged["condizioni"] = _merge_scalar_block("condizioni", partials, base)
    merged["spese"] = _merge_scalar_block("spese", partials, base)

    econ = dict(base.get("economics") or {})
    for field in ECONOMICS_SOURCED_FIELDS:
        candidates = [
            p.get("economics", {}).get(field)
            for p in partials
            if isinstance(p.get("economics"), dict)
        ]
        if field == "prezzo_base":
            for p in partials:
                meta = p.get("meta") if isinstance(p.get("meta"), dict) else {}
                for c in meta.get("prezzo_base_candidates") or []:
                    if isinstance(c, dict):
                        candidates.append(c)
        best = pick_best_sourced(candidates, doc_type_by_file)
        if best is not None:
            econ[field] = best
    cauzione_candidates = [
        p.get("economics", {}).get("cauzione")
        for p in partials
        if isinstance(p.get("economics"), dict)
    ]
    best_cauzione = pick_best_cauzione(cauzione_candidates, doc_type_by_file)
    if best_cauzione is not None:
        econ["cauzione"] = best_cauzione
    merged["economics"] = econ

    merged["immobili"] = merge_immobili(partials)

    lotti: list[str] = []
    warnings: list[str] = []
    candidates_pb: list[dict[str, Any]] = []
    for p in partials:
        meta = p.get("meta") if isinstance(p.get("meta"), dict) else {}
        for lot in meta.get("lotti_trovati") or []:
            s = str(lot).strip()
            if s and s not in lotti:
                lotti.append(s)
        for w in meta.get("warnings") or []:
            if isinstance(w, str) and w not in warnings:
                warnings.append(w)
        for c in meta.get("prezzo_base_candidates") or []:
            if isinstance(c, dict) and c not in candidates_pb:
                candidates_pb.append(c)

    meta_out = dict(base.get("meta") or {})
    meta_out["lotti_trovati"] = lotti
    meta_out["warnings"] = warnings
    if candidates_pb:
        meta_out["prezzo_base_candidates"] = candidates_pb

    lotto_meta = None
    for p in partials:
        m = p.get("meta") if isinstance(p.get("meta"), dict) else {}
        if isinstance(m.get("lotto"), dict):
            lotto_meta = m["lotto"]
            break
    if lotto_meta:
        meta_out["lotto"] = lotto_meta

    merged["meta"] = meta_out
    meta_out["not_found"] = merge_not_found(partials, merged)
    merged["schema_version"] = 2
    meta_out["schema_version"] = 2
    return merged


def estimate_document_payload_tokens(doc: dict[str, Any]) -> int:
    return estimate_tokens(json.dumps(doc, ensure_ascii=False))


def estimate_group_payload_tokens(
    language: str,
    lotto_label: str | None,
    documents: list[dict[str, Any]],
) -> int:
    payload = {
        "language": language,
        "lotto_label": lotto_label,
        "documents": documents,
        "schema_hint": {"schema_version": 2},
        "partial": True,
    }
    return estimate_tokens(json.dumps(payload, ensure_ascii=False))


def split_document_pages(
    doc: dict[str, Any],
    max_doc_tokens: int,
) -> list[dict[str, Any]]:
    pages = doc.get("pages") or []
    if not pages:
        return [doc]
    chunks: list[dict[str, Any]] = []
    current_pages: list[dict[str, Any]] = []
    base = {k: v for k, v in doc.items() if k != "pages"}
    for page in pages:
        trial = {**base, "pages": [*current_pages, page]}
        if current_pages and estimate_document_payload_tokens(trial) > max_doc_tokens:
            chunks.append({**base, "pages": current_pages})
            current_pages = [page]
        else:
            current_pages.append(page)
    if current_pages:
        chunks.append({**base, "pages": current_pages})
    return chunks or [doc]


def group_documents_for_extract(
    documents: list[dict[str, Any]],
    language: str,
    lotto_label: str | None,
    max_request_tokens: int,
    system_prompt_tokens: int,
    response_reserve: int = 4096,
) -> list[list[dict[str, Any]]]:
    """
    Bin-pack documents (splitting oversized docs by page) so each map request
    stays under max_request_tokens including prompt overhead.
    """
    overhead = system_prompt_tokens + response_reserve + 512
    budget = max(1024, max_request_tokens - overhead)
    expanded: list[dict[str, Any]] = []
    for doc in documents:
        doc_tokens = estimate_document_payload_tokens(
            {"file": doc["file"], "doc_type": doc["doc_type"], "pages": doc["pages"]},
        )
        if doc_tokens > budget:
            expanded.extend(split_document_pages(doc, budget))
        else:
            expanded.append(doc)

    groups: list[list[dict[str, Any]]] = []
    current: list[dict[str, Any]] = []
    current_tokens = estimate_group_payload_tokens(language, lotto_label, [])

    for doc in expanded:
        doc_only = estimate_document_payload_tokens(doc)
        group_tokens = estimate_group_payload_tokens(language, lotto_label, [*current, doc])
        if current and group_tokens > budget:
            groups.append(current)
            current = [doc]
            current_tokens = estimate_group_payload_tokens(language, lotto_label, current)
        else:
            current.append(doc)
            current_tokens += doc_only

    if current:
        groups.append(current)

    return groups or [[]]
