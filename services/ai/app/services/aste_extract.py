from __future__ import annotations

import json
import logging
import re
import time
from typing import Any

import httpx

from ..schemas_aste import ExtractRequest
from ..settings import Settings, get_settings
from .aste_extract_merge import (
    estimate_tokens,
    group_documents_for_extract,
    merge_partial_extractions,
)

log = logging.getLogger("aste.extract")

PERSON_NAME_HINT = re.compile(
    r"\b(sig\.?|dott\.?|avv\.?|mr\.?|mrs\.?|ms\.?)\s+[A-ZÀ-Ü][a-zà-ü]+\b|"
    r"\b[A-ZÀ-Ü][a-zà-ü]+\s+[A-ZÀ-Ü][a-zà-ü]{2,}\b",
    re.UNICODE,
)

SECRET_REDACT = re.compile(
    r"(Bearer\s+)[^\s\"']+|"
    r'("(?:api[_-]?key|authorization)"\s*:\s*")[^"]*(")|'
    r"(sk-[A-Za-z0-9_-]{8,})",
    re.IGNORECASE,
)

MAP_SYSTEM_PROMPT = """You are an Italian judicial auction (asta immobiliare) document extractor.
This is a PARTIAL extraction pass over a SUBSET of dossier documents.
Return ONLY valid JSON matching schema_version 2.

Lot scoping (CRITICAL):
- If lotto_label is provided, extract economics, catasto, conformità, and per-lot occupazione ONLY for that lot.
- Shared fields (tribunale, procedura, servitù, general terms) may come from shared passages.
- List ALL lot labels found in THESE documents in meta.lotti_trovati.
- Set meta.lotto = {label: <lotto_label or unico>, source: "user"|"inferred"} when inferable.
- NEVER bleed another lot's prezzo_base / offerta_minima / rilancio into the result.
- If a non-conformity list names lots A,C,D but not B and lotto_label is B, do NOT mark B as non-conforme.

Procedura:
- procedura.tipo is one of: rge | lg | ei | fall | altro
- procedura.numero is the numeric/year part (e.g. "26/2025", "249/2011")
- Also set procedura.rge = numero when tipo=rge (compat); otherwise rge may be null.

Economics:
- economics.cauzione = {pct, base: "prezzo_base"|"prezzo_offerto", importo|null, source}
- Record ALL prezzo_base values you find in meta.prezzo_base_candidates with source.
- If both avviso and ordinanza prezzo_base appear, include both in prezzo_base_candidates.

Immobili:
- immobili is an ARRAY (apartment+box, or multi-unit compendio). Each may include note_valore.

Vincoli:
- When the avviso defers to certificazione notarile / older ordinanze, pull vincoli from those docs and cite them, or add a not_found entry with the deferral reference.

Rules:
- Every numeric/economic value MUST include source:{file,page} citing the input document file id and page.
- If a value is not explicitly present in THESE documents, set it to null and add the field path to meta.not_found.
- NEVER invent, compute, or guess values that are not in the text.
- Do NOT extract names of natural persons. Omit person names entirely.
- schema_version must be 2.
- Extract ONLY from the documents provided in this request.
"""

# Backward-compatible alias for tests that patch SYSTEM_PROMPT.
SYSTEM_PROMPT = MAP_SYSTEM_PROMPT

MAX_UPSTREAM_RETRIES = 6


class ExtractUpstreamError(RuntimeError):
    """Non-2xx from OpenAI chat/completions; message is extract_upstream:<status>."""

    def __init__(self, status_code: int, body_snippet: str = "") -> None:
        self.status_code = status_code
        self.body_snippet = body_snippet
        super().__init__(f"extract_upstream:{status_code}")


def empty_extraction(meta_docs: list[dict[str, Any]], not_found: list[str] | None = None) -> dict[str, Any]:
    return {
        "schema_version": 2,
        "procedura": {
            "tipo": None,
            "numero": None,
            "rge": None,
            "tribunale": None,
            "lotto": None,
            "giudice_delegato": None,
            "data_asta": None,
            "termine_offerte": None,
            "modalita": None,
        },
        "economics": {
            "valore_stima": None,
            "prezzo_base": None,
            "offerta_minima": None,
            "cauzione": None,
            "rilancio_minimo": None,
            "superficie_commerciale_mq": None,
        },
        "immobili": [],
        "giuridica": {
            "diritto_venduto": None,
            "stato_occupazione": {"stato": None, "dettaglio": None, "opponibilita": None},
            "vincoli": [],
            "formalita": [],
        },
        "urbanistica": {
            "conformita_urbanistica": {"stato": None, "dettaglio": None},
            "conformita_catastale": {"stato": None, "dettaglio": None},
            "difformita": [],
        },
        "condizioni": {"stato_manutentivo": None, "impianti": None, "lavori_stimati": None},
        "spese": {"condominiali_arretrate": None, "oneri_acquirente": []},
        "meta": {
            "documents": meta_docs,
            "not_found": not_found or [],
            "warnings": [],
            "schema_version": 2,
            "lotto": None,
            "lotti_trovati": [],
        },
    }


def sanitize_upstream_body(text: str) -> str:
    redacted = SECRET_REDACT.sub(lambda m: m.group(0)[:12] + "…" if m.group(0).startswith("sk-") else "…", text)
    return redacted[:2000]


def run_extract(req: ExtractRequest, settings: Settings | None = None) -> dict[str, Any]:
    s = settings or get_settings()
    meta_docs = [
        {
            "file": d.file,
            "doc_type": d.doc_type,
            "pages": len(d.pages),
            "ocr_pages": 0,
        }
        for d in req.documents
    ]

    if s.CHAT_PROVIDER != "openai" or not s.OPENAI_API_KEY:
        log.warning("extract_unavailable")
        raise RuntimeError("extract_unavailable")

    doc_type_by_file = {d.file: d.doc_type for d in req.documents}
    doc_payloads = [
        {
            "file": d.file,
            "doc_type": d.doc_type,
            "pages": [{"page": p.page, "text": p.text} for p in d.pages],
        }
        for d in req.documents
    ]

    max_tokens = getattr(s, "ASTE_EXTRACT_MAX_REQUEST_TOKENS", 80000)
    system_tokens = estimate_tokens(MAP_SYSTEM_PROMPT)
    groups = group_documents_for_extract(
        doc_payloads,
        req.language,
        req.lotto_label,
        max_tokens,
        system_tokens,
    )

    log.info(
        "extract_map_groups",
        extra={
            "document_count": len(doc_payloads),
            "group_count": len(groups),
            "max_request_tokens": max_tokens,
        },
    )

    partials: list[dict[str, Any]] = []
    for idx, group in enumerate(groups):
        group_tokens = estimate_tokens(
            json.dumps(
                {
                    "language": req.language,
                    "lotto_label": req.lotto_label,
                    "documents": group,
                },
                ensure_ascii=False,
            ),
        )
        log.debug(
            "extract_map_group",
            extra={"group_index": idx, "docs": len(group), "payload_tokens": group_tokens},
        )
        user_payload = {
            "language": req.language,
            "lotto_label": req.lotto_label,
            "partial": True,
            "documents": group,
            "schema_hint": {
                "schema_version": 2,
                "blocks": [
                    "procedura",
                    "economics",
                    "immobili",
                    "giuridica",
                    "urbanistica",
                    "condizioni",
                    "spese",
                    "meta",
                ],
            },
        }
        raw = _complete_long(s, MAP_SYSTEM_PROMPT, json.dumps(user_payload, ensure_ascii=False))
        parsed = _parse_json_object(raw)
        partials.append(_normalize(parsed, meta_docs, req.lotto_label))

    base = empty_extraction(meta_docs)
    merged = merge_partial_extractions(partials, doc_type_by_file, base)
    normalized = _normalize(merged, meta_docs, req.lotto_label)
    scrubbed = scrub_person_names(normalized)
    return scrubbed


def _complete_long(s: Settings, system: str, user: str) -> str:
    last_status = 0
    last_body = ""
    for attempt in range(MAX_UPSTREAM_RETRIES):
        resp = httpx.post(
            f"{s.OPENAI_BASE_URL}/chat/completions",
            headers={"Authorization": f"Bearer {s.OPENAI_API_KEY}"},
            json={
                "model": s.CHAT_MODEL,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
                "temperature": 0,
                "response_format": {"type": "json_object"},
            },
            timeout=s.ASTE_EXTRACT_HTTP_TIMEOUT,
        )
        if resp.status_code == 429 and attempt < MAX_UPSTREAM_RETRIES - 1:
            retry_after = resp.headers.get("Retry-After")
            if retry_after:
                try:
                    wait = float(retry_after)
                except ValueError:
                    wait = min(2**attempt, 60)
            else:
                wait = min(2**attempt, 60)
            log.warning(
                "extract_upstream_rate_limited",
                extra={"attempt": attempt + 1, "wait_s": wait},
            )
            time.sleep(wait)
            continue

        if resp.status_code >= 400:
            last_status = resp.status_code
            last_body = sanitize_upstream_body(resp.text)
            log.error(
                "extract_upstream_error status=%s body=%s",
                resp.status_code,
                last_body,
            )
            raise ExtractUpstreamError(resp.status_code, last_body)

        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"]

    raise ExtractUpstreamError(last_status or 429, last_body)


def _parse_json_object(raw: str) -> dict[str, Any]:
    text = (raw or "").strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        m = re.search(r"\{.*\}", text, re.DOTALL)
        if not m:
            raise ValueError("extract_invalid_json")
        data = json.loads(m.group(0))
    if not isinstance(data, dict):
        raise ValueError("extract_not_object")
    return data


def _normalize(
    data: dict[str, Any],
    meta_docs: list[dict[str, Any]],
    lotto_label: str | None,
) -> dict[str, Any]:
    base = empty_extraction(meta_docs)
    for key in (
        "procedura",
        "economics",
        "giuridica",
        "urbanistica",
        "condizioni",
        "spese",
    ):
        if isinstance(data.get(key), dict):
            base[key] = {**base[key], **data[key]}

    # immobili[] — also accept legacy singular immobile
    if isinstance(data.get("immobili"), list):
        base["immobili"] = data["immobili"]
    elif isinstance(data.get("immobile"), dict):
        unit = {**data["immobile"]}
        unit.setdefault("note_valore", None)
        base["immobili"] = [unit]

    # Legacy cauzione_pct → cauzione object
    econ = base["economics"]
    if econ.get("cauzione") is None and isinstance(econ.get("cauzione_pct"), dict):
        cp = econ["cauzione_pct"]
        econ["cauzione"] = {
            "pct": cp.get("value"),
            "base": "prezzo_base",
            "importo": None,
            "source": cp.get("source"),
        }
    econ.pop("cauzione_pct", None)

    proc = base["procedura"]
    if not proc.get("numero") and proc.get("rge"):
        proc["numero"] = proc["rge"]
        proc.setdefault("tipo", "rge")
    if proc.get("tipo") == "rge" and proc.get("numero") and not proc.get("rge"):
        proc["rge"] = proc["numero"]

    meta = data.get("meta") if isinstance(data.get("meta"), dict) else {}
    base["meta"]["not_found"] = list(meta.get("not_found") or [])
    base["meta"]["warnings"] = list(meta.get("warnings") or [])
    base["meta"]["lotti_trovati"] = list(meta.get("lotti_trovati") or [])
    if isinstance(meta.get("lotto"), dict):
        base["meta"]["lotto"] = meta["lotto"]
    elif lotto_label:
        base["meta"]["lotto"] = {"label": lotto_label, "source": "user"}
    if isinstance(meta.get("prezzo_base_candidates"), list):
        base["meta"]["prezzo_base_candidates"] = meta["prezzo_base_candidates"]
    if isinstance(meta.get("documents"), list) and meta["documents"]:
        base["meta"]["documents"] = meta["documents"]
    base["schema_version"] = 2
    base["meta"]["schema_version"] = 2
    if lotto_label and not proc.get("lotto"):
        proc["lotto"] = lotto_label
    return base


def scrub_person_names(data: dict[str, Any]) -> dict[str, Any]:
    def walk(node: Any, path: str) -> Any:
        if isinstance(node, dict):
            return {k: walk(v, f"{path}.{k}" if path else k) for k, v in node.items()}
        if isinstance(node, list):
            return [walk(v, path) for v in node]
        if isinstance(node, str) and path.endswith("giudice_delegato"):
            if PERSON_NAME_HINT.search(node) and len(node.split()) >= 2:
                data.setdefault("meta", {}).setdefault("warnings", []).append(
                    "scrubbed_person_name_field"
                )
                return None
        return node

    return walk(data, "")
