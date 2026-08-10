from __future__ import annotations

import json
import logging
import re
from typing import Any

from ..schemas_aste import ExtractRequest
from ..settings import Settings, get_settings

log = logging.getLogger("aste.extract")

PERSON_NAME_HINT = re.compile(
    r"\b(sig\.?|dott\.?|avv\.?|mr\.?|mrs\.?|ms\.?)\s+[A-ZÀ-Ü][a-zà-ü]+\b|"
    r"\b[A-ZÀ-Ü][a-zà-ü]+\s+[A-ZÀ-Ü][a-zà-ü]{2,}\b",
    re.UNICODE,
)

SYSTEM_PROMPT = """You are an Italian judicial auction (asta immobiliare) document extractor.
Return ONLY valid JSON matching schema_version 1.
Rules:
- Every numeric/economic value MUST include source:{file,page} citing the input document file id and page.
- If a value is not explicitly present in the provided text, set it to null and add the field path to meta.not_found.
- NEVER invent, compute, or guess values that are not in the text.
- Do NOT extract names of natural persons (debitore/esecutato, occupants, giudice names as people identifiers beyond procedural labels if present as role-only). Omit person names entirely.
- schema_version must be 1.
- language of string fields should match the document language when possible.
"""


def empty_extraction(meta_docs: list[dict[str, Any]], not_found: list[str] | None = None) -> dict[str, Any]:
    return {
        "schema_version": 1,
        "procedura": {
            "tribunale": None,
            "rge": None,
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
            "cauzione_pct": None,
            "rilancio_minimo": None,
            "superficie_commerciale_mq": None,
        },
        "immobile": {
            "tipologia": None,
            "piano": None,
            "vani": None,
            "locali": [],
            "categoria_catastale": None,
            "foglio": None,
            "particella": None,
            "subalterno": None,
            "rendita": None,
            "indirizzo": None,
            "comune": None,
            "provincia": None,
        },
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
            "schema_version": 1,
        },
    }


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

    user_payload = {
        "language": req.language,
        "documents": [
            {
                "file": d.file,
                "doc_type": d.doc_type,
                "pages": [{"page": p.page, "text": p.text} for p in d.pages],
            }
            for d in req.documents
        ],
        "schema_hint": {
            "schema_version": 1,
            "blocks": [
                "procedura",
                "economics",
                "immobile",
                "giuridica",
                "urbanistica",
                "condizioni",
                "spese",
                "meta",
            ],
        },
    }
    raw = _complete_long(s, SYSTEM_PROMPT, json.dumps(user_payload, ensure_ascii=False))
    parsed = _parse_json_object(raw)
    normalized = _normalize(parsed, meta_docs)
    scrubbed = scrub_person_names(normalized)
    return scrubbed


def _complete_long(s: Settings, system: str, user: str) -> str:
    """OpenAI chat with aste extract timeout (not the short assistant HTTP_TIMEOUT)."""
    import httpx

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
    resp.raise_for_status()
    return resp.json()["choices"][0]["message"]["content"]


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


def _normalize(data: dict[str, Any], meta_docs: list[dict[str, Any]]) -> dict[str, Any]:
    base = empty_extraction(meta_docs)
    for key in (
        "procedura",
        "economics",
        "immobile",
        "giuridica",
        "urbanistica",
        "condizioni",
        "spese",
    ):
        if isinstance(data.get(key), dict):
            base[key] = {**base[key], **data[key]}
    meta = data.get("meta") if isinstance(data.get("meta"), dict) else {}
    base["meta"]["not_found"] = list(meta.get("not_found") or [])
    base["meta"]["warnings"] = list(meta.get("warnings") or [])
    if isinstance(meta.get("documents"), list) and meta["documents"]:
        base["meta"]["documents"] = meta["documents"]
    base["schema_version"] = 1
    base["meta"]["schema_version"] = 1
    return base


def scrub_person_names(data: dict[str, Any]) -> dict[str, Any]:
    """Drop string values that look like natural-person names; record warning only."""

    def walk(node: Any, path: str) -> Any:
        if isinstance(node, dict):
            return {k: walk(v, f"{path}.{k}" if path else k) for k, v in node.items()}
        if isinstance(node, list):
            return [walk(v, path) for v in node]
        if isinstance(node, str) and path.endswith("giudice_delegato"):
            # Keep role/office labels; strip likely personal names.
            if PERSON_NAME_HINT.search(node) and len(node.split()) >= 2:
                data.setdefault("meta", {}).setdefault("warnings", []).append(
                    "scrubbed_person_name_field"
                )
                return None
        return node

    return walk(data, "")
