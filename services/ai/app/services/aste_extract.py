from __future__ import annotations

import json
import logging
import re
from typing import Any

from ..schemas_aste import ExtractDocumentIn, ExtractPageIn, ExtractRequest
from ..settings import Settings, get_settings

log = logging.getLogger("aste.extract")

PERSON_NAME_HINT = re.compile(
    r"\b(sig\.?|dott\.?|avv\.?|mr\.?|mrs\.?|ms\.?)\s+[A-ZÀ-Ü][a-zà-ü]+\b|"
    r"\b[A-ZÀ-Ü][a-zà-ü]+\s+[A-ZÀ-Ü][a-zà-ü]{2,}\b",
    re.UNICODE,
)

# Field-specific doc-type precedence (EC-30). Lower index = higher priority.
PRECEDENCE_AUCTION = ("avviso", "ordinanza", "perizia", "certificazione")
PRECEDENCE_VALORE_STIMA = ("perizia", "avviso", "ordinanza", "certificazione")
PRECEDENCE_OCCUPAZIONE = ("perizia", "avviso", "ordinanza", "certificazione")

# Perizia sections for occupazione / valore_stima must not be starved by lot-priority pack.
FIELD_CONTEXT_KEYWORDS = re.compile(
    r"stato\s+occupativ|occupato|occupazione|\blibero\b|condotto\s+in\s+locazione|canone|"
    r"valore\s+di\s+stima|stima\s+del\s+valore|valore\s+commerciale|valore\s+stima|"
    r"ctu|consulente\s+tecnico",
    re.IGNORECASE,
)

OCCUPAZIONE_ENUM = (
    "libero",
    "occupato_esecutato",
    "occupato_con_titolo",
    "occupato_senza_titolo",
    "non_rilevato",
)

# gpt-4o-mini ~128k tokens; leave headroom for system prompt + JSON completion.
# Large multi-doc dossiers (Ex7) exceed this in a single request → HTTP 400.
MAX_EXTRACT_USER_CHARS = 90_000
MAX_PAGE_CHARS = 24_000

SYSTEM_PROMPT = """You are an Italian judicial auction (asta immobiliare) document extractor.
Return ONLY valid JSON matching schema_version 2.

Lot scoping (CRITICAL):
- If lotto_label is provided, extract economics, catasto, conformità, and per-lot occupazione ONLY for that lot.
- Shared fields (tribunale, procedura, servitù, general terms) may come from shared passages.
- List ALL lot labels found in the documents in meta.lotti_trovati (e.g. ["4","7"] or ["H","I","M"]).
- Set meta.lotto = {label: <lotto_label or unico>, source: "user"|"inferred"}.
- NEVER bleed another lot's prezzo_base / offerta_minima / rilancio into the result.
- If a non-conformity list names lots A,C,D but not B and lotto_label is B, do NOT mark B as non-conforme.

Procedura:
- procedura.tipo is one of: rge | lg | ei | fall | altro
- procedura.numero is the numeric/year part (e.g. "26/2025", "249/2011")
- Also set procedura.rge = numero when tipo=rge (compat); otherwise rge may be null.

Economics:
- economics.cauzione = {pct, base: "prezzo_base"|"prezzo_offerto", importo|null, source}
- Extract cauzione.importo ONLY when explicitly stated in the text. If only pct is stated, leave importo null (post-processing may derive it from prezzo_base).
- Prefer avviso over ordinanza for prezzo_base, offerta_minima, cauzione, rilancio_minimo when they conflict (ribassi / successive vendite).
- If both avviso and ordinanza prezzo_base appear, set economics.prezzo_base from the avviso and add meta.prezzo_base_candidates with both sourced values.
- economics.valore_stima = CTU/perizia estimate {value, source}. Prefer perizia over avviso/ordinanza. Look for "valore di stima", "stima del valore", "valore commerciale" in the perizia.

Giuridica / occupazione (per lot when lotto_label set):
- giuridica.stato_occupazione = {stato, dettaglio, opponibilita, source:{file,page}}
- stato MUST be one of: libero | occupato_esecutato | occupato_con_titolo | occupato_senza_titolo | non_rilevato
- Map Italian phrasing: "stato occupativo" passages; "occupato dall'esecutato" → occupato_esecutato;
  "libero" / "libero da persone e cose" → libero;
  "occupato con titolo opponibile alla procedura" → occupato_con_titolo;
  "occupato senza titolo opponibile" → occupato_senza_titolo;
  "condotto in locazione" / canone references → occupato_con_titolo or occupato_senza_titolo per opponibilità;
  if stato cannot be determined → non_rilevato (never guess).
- Prefer perizia over avviso for stato_occupazione; cite source page.

Immobili:
- immobili is an ARRAY (apartment+box, or multi-unit compendio). Each may include note_valore.

Vincoli:
- When the avviso defers to certificazione notarile / older ordinanze, pull vincoli from those docs and cite them, or add a not_found entry with the deferral reference.

Rules:
- Every numeric/economic value MUST include source:{file,page} citing the input document file id and page.
- If a value is not explicitly present, set it to null and add the field path to meta.not_found.
- NEVER invent, compute, or guess values that are not in the text.
- Do NOT extract names of natural persons. Omit person names entirely.
- schema_version must be 2.
"""

CHUNK_HINT = (
    "This is a PARTIAL document set from a larger dossier (chunk {index}/{total}). "
    "Extract only what is explicitly present in these pages. "
    "Leave missing fields null and list them in meta.not_found. "
    "Do not invent values from outside this chunk."
)


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
            "stato_occupazione": {
                "stato": None,
                "dettaglio": None,
                "opponibilita": None,
                "source": None,
            },
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

    user_payload = _build_user_payload(req.language, req.lotto_label, req.documents)
    user_json = json.dumps(user_payload, ensure_ascii=False)

    if len(user_json) <= MAX_EXTRACT_USER_CHARS:
        raw = _complete_long(s, SYSTEM_PROMPT, user_json)
        parsed = _parse_json_object(raw)
        normalized = _normalize(parsed, meta_docs, req.lotto_label)
        normalized = _finalize_extraction(normalized, [normalized], meta_docs)
        return scrub_person_names(normalized)

    chunks = split_documents_for_extract(
        req.documents,
        language=req.language,
        lotto_label=req.lotto_label,
        max_user_chars=MAX_EXTRACT_USER_CHARS,
    )
    log.info(
        "extract_chunked",
        extra={
            "chunks": len(chunks),
            "docs": len(req.documents),
            "user_chars": len(user_json),
            "lotto_label": req.lotto_label,
        },
    )

    parts: list[dict[str, Any]] = []
    total = len(chunks)
    for idx, chunk_docs in enumerate(chunks, start=1):
        chunk_payload = _build_user_payload(req.language, req.lotto_label, chunk_docs)
        chunk_payload["chunk"] = {"index": idx, "total": total, "hint": CHUNK_HINT.format(index=idx, total=total)}
        chunk_json = json.dumps(chunk_payload, ensure_ascii=False)
        raw = _complete_long(s, SYSTEM_PROMPT, chunk_json)
        parsed = _parse_json_object(raw)
        parts.append(_normalize(parsed, meta_docs, req.lotto_label))

    merged = merge_extractions(parts, meta_docs, req.lotto_label)
    merged["meta"].setdefault("warnings", []).append(f"extract_chunked:{total}")
    return scrub_person_names(merged)


def _build_user_payload(
    language: str,
    lotto_label: str | None,
    documents: list[ExtractDocumentIn],
) -> dict[str, Any]:
    return {
        "language": language,
        "lotto_label": lotto_label,
        "documents": [
            {
                "file": d.file,
                "doc_type": d.doc_type,
                "pages": [{"page": p.page, "text": p.text} for p in d.pages],
            }
            for d in documents
        ],
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


def _lot_mention_re(lotto_label: str) -> re.Pattern[str]:
    # Letter lots (H) and numeric lots (4, 001) — word-ish boundary after label.
    escaped = re.escape(lotto_label.strip())
    return re.compile(
        rf"(?:lotto|lot)\s*[\"']?{escaped}\b|{escaped}\b",
        re.IGNORECASE,
    )


def page_lot_priority(text: str, lotto_label: str | None, doc_type: str) -> int:
    """Higher = pack earlier. Lot mentions beat shared avviso/ordinanza pages."""
    score = 0
    dt = (doc_type or "").lower()
    if dt in ("avviso", "ordinanza", "perizia", "certificazione"):
        score += 2
    if FIELD_CONTEXT_KEYWORDS.search(text or ""):
        score += 5
        if dt == "perizia":
            score += 3
    if lotto_label:
        if _lot_mention_re(lotto_label).search(text or ""):
            score += 10
    return score


def _truncate_page_text(text: str, max_chars: int = MAX_PAGE_CHARS) -> str:
    if len(text) <= max_chars:
        return text
    keep = max_chars - 32
    return text[:keep] + "\n…[truncated]…"


def split_documents_for_extract(
    documents: list[ExtractDocumentIn],
    *,
    language: str,
    lotto_label: str | None,
    max_user_chars: int = MAX_EXTRACT_USER_CHARS,
) -> list[list[ExtractDocumentIn]]:
    """Pack pages into chunk payloads that stay under max_user_chars (map phase)."""
    pages: list[tuple[int, str, str, ExtractPageIn]] = []
    for d in documents:
        for p in d.pages:
            text = _truncate_page_text(p.text or "")
            page = ExtractPageIn(page=p.page, text=text)
            pri = page_lot_priority(text, lotto_label, d.doc_type)
            pages.append((pri, d.file, d.doc_type, page))

    # Lot-relevant / key doc types first so early chunks are most informative for merge.
    pages.sort(key=lambda t: (-t[0], t[1], t[3].page))

    chunks: list[list[ExtractDocumentIn]] = []
    current: dict[str, ExtractDocumentIn] = {}
    order: list[str] = []

    def flush() -> None:
        nonlocal current, order
        if not current:
            return
        chunks.append([current[k] for k in order])
        current = {}
        order = []

    for _pri, file_id, doc_type, page in pages:
        trial = dict(current)
        if file_id not in trial:
            trial[file_id] = ExtractDocumentIn(file=file_id, doc_type=doc_type, pages=[])
        trial_doc = ExtractDocumentIn(
            file=file_id,
            doc_type=doc_type,
            pages=[*trial[file_id].pages, page],
        )
        trial[file_id] = trial_doc
        trial_order = order if file_id in current else [*order, file_id]
        trial_docs = [trial[k] for k in trial_order]
        size = len(json.dumps(_build_user_payload(language, lotto_label, trial_docs), ensure_ascii=False))
        if current and size > max_user_chars:
            flush()
            current = {
                file_id: ExtractDocumentIn(file=file_id, doc_type=doc_type, pages=[page]),
            }
            order = [file_id]
            solo = len(json.dumps(_build_user_payload(language, lotto_label, [current[file_id]]), ensure_ascii=False))
            if solo > max_user_chars:
                # Pathological page: keep truncated page alone (already truncated once).
                shorter = _truncate_page_text(page.text, max(4_000, max_user_chars // 4))
                current[file_id] = ExtractDocumentIn(
                    file=file_id,
                    doc_type=doc_type,
                    pages=[ExtractPageIn(page=page.page, text=shorter)],
                )
        else:
            current = trial
            order = trial_order

    flush()
    return chunks or [[]]


def merge_extractions(
    parts: list[dict[str, Any]],
    meta_docs: list[dict[str, Any]],
    lotto_label: str | None,
) -> dict[str, Any]:
    """Deterministic reduce: fill nulls from later chunks; never invent; union lists."""
    if not parts:
        return empty_extraction(meta_docs, not_found=["*"])

    base = empty_extraction(meta_docs)
    found_paths: set[str] = set()
    not_found_union: set[str] = set()
    warnings: list[str] = []
    lotti: list[str] = []
    prezzo_candidates: list[Any] = []

    for part in parts:
        _merge_dict_fill(base["procedura"], part.get("procedura") if isinstance(part.get("procedura"), dict) else {})
        _merge_economics(base["economics"], part.get("economics") if isinstance(part.get("economics"), dict) else {})
        _merge_dict_fill(base["giuridica"], part.get("giuridica") if isinstance(part.get("giuridica"), dict) else {})
        _merge_urbanistica(
            base["urbanistica"],
            part.get("urbanistica") if isinstance(part.get("urbanistica"), dict) else {},
            lotto_label,
        )
        _merge_dict_fill(base["condizioni"], part.get("condizioni") if isinstance(part.get("condizioni"), dict) else {})
        _merge_spese(base["spese"], part.get("spese") if isinstance(part.get("spese"), dict) else {})

        imm = part.get("immobili")
        if isinstance(imm, list):
            base["immobili"] = _merge_immobili(base["immobili"], imm)

        meta = part.get("meta") if isinstance(part.get("meta"), dict) else {}
        for nf in meta.get("not_found") or []:
            if isinstance(nf, str):
                not_found_union.add(nf)
        for w in meta.get("warnings") or []:
            if isinstance(w, str) and w not in warnings:
                warnings.append(w)
        for lab in meta.get("lotti_trovati") or []:
            if isinstance(lab, str) and lab not in lotti:
                lotti.append(lab)
        if isinstance(meta.get("lotto"), dict) and base["meta"]["lotto"] is None:
            base["meta"]["lotto"] = meta["lotto"]
        for c in meta.get("prezzo_base_candidates") or []:
            prezzo_candidates.append(c)

        found_paths |= _non_null_field_paths(part)

    # Fields found in any chunk are not "not_found".
    base["meta"]["not_found"] = sorted(nf for nf in not_found_union if nf not in found_paths)
    base["meta"]["warnings"] = warnings
    base["meta"]["lotti_trovati"] = lotti
    if prezzo_candidates:
        base["meta"]["prezzo_base_candidates"] = prezzo_candidates
    if lotto_label and not base["meta"].get("lotto"):
        base["meta"]["lotto"] = {"label": lotto_label, "source": "user"}
    if lotto_label and not base["procedura"].get("lotto"):
        base["procedura"]["lotto"] = lotto_label
    base["schema_version"] = 2
    base["meta"]["schema_version"] = 2
    base["meta"]["documents"] = meta_docs
    return _finalize_extraction(base, parts, meta_docs)


def _doc_type_rank(doc_type: str | None, precedence: tuple[str, ...]) -> int:
    dt = (doc_type or "").lower()
    try:
        return precedence.index(dt)
    except ValueError:
        return len(precedence)


def _source_doc_type(
    source: Any,
    meta_docs: list[dict[str, Any]],
) -> str | None:
    if not isinstance(source, dict):
        return None
    file_id = source.get("file")
    if not file_id:
        return None
    for doc in meta_docs:
        if doc.get("file") == file_id:
            dtype = doc.get("doc_type")
            return str(dtype).lower() if dtype else None
    return None


def _pick_by_precedence(
    candidates: list[tuple[Any, str | None]],
    precedence: tuple[str, ...],
) -> Any:
    if not candidates:
        return None
    best_val: Any = None
    best_rank = len(precedence) + 1
    for val, doc_type in candidates:
        rank = _doc_type_rank(doc_type, precedence)
        if rank < best_rank:
            best_rank = rank
            best_val = val
    return best_val


def _collect_sourced_candidates(
    parts: list[dict[str, Any]],
    field_path: str,
    meta_docs: list[dict[str, Any]],
) -> list[tuple[Any, str | None]]:
    """Collect (value, doc_type) from chunk parts for economics.* sourced numbers."""
    out: list[tuple[Any, str | None]] = []
    for part in parts:
        econ = part.get("economics") if isinstance(part.get("economics"), dict) else {}
        val = econ.get(field_path.split(".")[-1] if "." in field_path else field_path)
        if _is_empty(val) or not isinstance(val, dict):
            continue
        dtype = _source_doc_type(val.get("source"), meta_docs)
        out.append((val, dtype))
    return out


def _collect_cauzione_candidates(
    parts: list[dict[str, Any]],
    meta_docs: list[dict[str, Any]],
) -> list[tuple[Any, str | None]]:
    out: list[tuple[Any, str | None]] = []
    for part in parts:
        econ = part.get("economics") if isinstance(part.get("economics"), dict) else {}
        val = econ.get("cauzione")
        if _is_empty(val) or not isinstance(val, dict):
            continue
        dtype = _source_doc_type(val.get("source"), meta_docs)
        out.append((val, dtype))
    return out


def _collect_occupazione_candidates(
    parts: list[dict[str, Any]],
    meta_docs: list[dict[str, Any]],
) -> list[tuple[Any, str | None]]:
    out: list[tuple[Any, str | None]] = []
    for part in parts:
        giu = part.get("giuridica") if isinstance(part.get("giuridica"), dict) else {}
        occ = giu.get("stato_occupazione") if isinstance(giu.get("stato_occupazione"), dict) else {}
        if _is_empty(occ.get("stato")):
            continue
        dtype = _source_doc_type(occ.get("source"), meta_docs)
        out.append((occ, dtype))
    return out


def _apply_field_precedence(
    merged: dict[str, Any],
    parts: list[dict[str, Any]],
    meta_docs: list[dict[str, Any]],
) -> None:
    """Field-specific doc-type precedence after chunk merge (EC-30)."""
    econ = merged.setdefault("economics", {})
    giu = merged.setdefault("giuridica", {})

    for field in ("prezzo_base", "offerta_minima", "rilancio_minimo"):
        picked = _pick_by_precedence(
            _collect_sourced_candidates(parts, field, meta_docs),
            PRECEDENCE_AUCTION,
        )
        if not _is_empty(picked):
            econ[field] = picked

    valore = _pick_by_precedence(
        _collect_sourced_candidates(parts, "valore_stima", meta_docs),
        PRECEDENCE_VALORE_STIMA,
    )
    if not _is_empty(valore):
        econ["valore_stima"] = valore

    cauzione = _pick_by_precedence(
        _collect_cauzione_candidates(parts, meta_docs),
        PRECEDENCE_AUCTION,
    )
    if not _is_empty(cauzione):
        econ["cauzione"] = cauzione

    occupazione = _pick_by_precedence(
        _collect_occupazione_candidates(parts, meta_docs),
        PRECEDENCE_OCCUPAZIONE,
    )
    if not _is_empty(occupazione):
        giu["stato_occupazione"] = occupazione

    # Ex2 regression: explicit dual candidates override sequential merge.
    meta = merged.get("meta") if isinstance(merged.get("meta"), dict) else {}
    dual = meta.get("prezzo_base_candidates")
    if isinstance(dual, list) and len(dual) >= 2:
        avviso = next(
            (c for c in dual if isinstance(c, dict) and _source_doc_type(c.get("source"), meta_docs) == "avviso"),
            None,
        )
        ordinanza = next(
            (c for c in dual if isinstance(c, dict) and _source_doc_type(c.get("source"), meta_docs) == "ordinanza"),
            None,
        )
        if avviso and ordinanza:
            econ["prezzo_base"] = avviso


def derive_cauzione_importo(economics: dict[str, Any]) -> None:
    """Compute cauzione.importo from pct × prezzo_base when only pct is stated (EC-30)."""
    cau = economics.get("cauzione")
    if not isinstance(cau, dict):
        return
    if cau.get("importo") is not None:
        cau.pop("derived", None)
        return
    pct = cau.get("pct")
    if pct is None:
        return
    base_kind = cau.get("base") or "prezzo_base"
    if base_kind != "prezzo_base":
        return
    prezzo = economics.get("prezzo_base")
    if not isinstance(prezzo, dict) or prezzo.get("value") is None:
        return
    try:
        pct_f = float(pct)
        prezzo_f = float(prezzo["value"])
    except (TypeError, ValueError):
        return
    importo = round(prezzo_f * pct_f / 100.0, 2)
    cau["importo"] = importo
    cau["derived"] = True


def _normalize_occupazione_stato(giuridica: dict[str, Any]) -> None:
    occ = giuridica.get("stato_occupazione")
    if not isinstance(occ, dict):
        return
    stato = occ.get("stato")
    if not isinstance(stato, str) or not stato.strip():
        return
    blob = stato.strip().lower()
    normalized = blob.replace(" ", "_").replace("-", "_")
    alias = {
        "occupato_dall_esecutato": "occupato_esecutato",
        "occupato_dal_debitore": "occupato_esecutato",
        "occupato_dal_esecutato": "occupato_esecutato",
    }
    normalized = alias.get(normalized, normalized)
    if normalized in OCCUPAZIONE_ENUM:
        occ["stato"] = normalized
        return
    det = (occ.get("dettaglio") or "").lower()
    combined = f"{blob} {det}"
    if "libero" in combined and "occupat" not in combined:
        occ["stato"] = "libero"
    elif re.search(r"occupat.*(esecutat|debitore)", combined):
        occ["stato"] = "occupato_esecutato"
    elif "occupat" in combined and "titolo" in combined and "opponib" in combined:
        occ["stato"] = "occupato_con_titolo"
    elif "occupat" in combined and "senza" in combined and "titolo" in combined:
        occ["stato"] = "occupato_senza_titolo"
    elif "locazione" in combined or "canone" in combined:
        if "opponib" in combined:
            occ["stato"] = "occupato_con_titolo"
        else:
            occ["stato"] = "occupato_senza_titolo"


def _finalize_extraction(
    merged: dict[str, Any],
    parts: list[dict[str, Any]],
    meta_docs: list[dict[str, Any]],
) -> dict[str, Any]:
    _apply_field_precedence(merged, parts, meta_docs)
    giu = merged.get("giuridica") if isinstance(merged.get("giuridica"), dict) else {}
    _normalize_occupazione_stato(giu)
    econ = merged.get("economics") if isinstance(merged.get("economics"), dict) else {}
    derive_cauzione_importo(econ)
    # Clear economics.cauzione from not_found when derived importo fills the gap.
    meta = merged.setdefault("meta", {})
    cau = econ.get("cauzione") if isinstance(econ.get("cauzione"), dict) else {}
    if cau.get("importo") is not None:
        nf = meta.get("not_found")
        if isinstance(nf, list):
            meta["not_found"] = [p for p in nf if p not in ("economics.cauzione", "economics.cauzione.importo")]
    return merged


def _is_empty(value: Any) -> bool:
    if value is None:
        return True
    if isinstance(value, str) and not value.strip():
        return True
    if isinstance(value, dict):
        if not value:
            return True
        # sourced number / nested status objects: empty if all values empty
        return all(_is_empty(v) for v in value.values())
    if isinstance(value, list):
        return len(value) == 0
    return False


def _merge_dict_fill(dst: dict[str, Any], src: dict[str, Any]) -> None:
    for key, val in src.items():
        if key not in dst:
            dst[key] = val
            continue
        cur = dst[key]
        if isinstance(cur, dict) and isinstance(val, dict):
            _merge_dict_fill(cur, val)
        elif _is_empty(cur) and not _is_empty(val):
            dst[key] = val
        elif isinstance(cur, list) and isinstance(val, list):
            for item in val:
                if item not in cur:
                    cur.append(item)


def _merge_economics(dst: dict[str, Any], src: dict[str, Any]) -> None:
    for key, val in src.items():
        if key not in dst or _is_empty(dst.get(key)):
            if not _is_empty(val):
                dst[key] = val


def _merge_spese(dst: dict[str, Any], src: dict[str, Any]) -> None:
    if _is_empty(dst.get("condominiali_arretrate")) and not _is_empty(src.get("condominiali_arretrate")):
        dst["condominiali_arretrate"] = src["condominiali_arretrate"]
    oneri = src.get("oneri_acquirente")
    if isinstance(oneri, list):
        cur = dst.setdefault("oneri_acquirente", [])
        if isinstance(cur, list):
            for item in oneri:
                if item not in cur:
                    cur.append(item)


def _lots_mentioned(text: str) -> set[str]:
    """Parse lot labels from Italian phrases like 'Lotto H' / 'Lotti A, C, D'."""
    found: set[str] = set()
    for m in re.finditer(r"\blotto\s+([A-Za-z0-9]+)\b", text, flags=re.IGNORECASE):
        found.add(m.group(1).upper())
    for m in re.finditer(
        r"\blotti\s+([A-Za-z0-9]+(?:\s*,\s*[A-Za-z0-9]+)*)",
        text,
        flags=re.IGNORECASE,
    ):
        for part in re.split(r"\s*,\s*", m.group(1)):
            p = part.strip()
            if p:
                found.add(p.upper())
    return found


def _conformita_mentions_other_lots_only(dettaglio: Any, lotto_label: str | None) -> bool:
    """True when dettaglio lists other lots but not the selected lot (GT-5 trap)."""
    if not lotto_label or not isinstance(dettaglio, str) or not dettaglio.strip():
        return False
    normalized = _lots_mentioned(dettaglio)
    if not normalized:
        return False
    selected = lotto_label.strip().upper()
    return selected not in normalized


def _is_non_conforme(stato: Any) -> bool:
    return isinstance(stato, str) and stato.lower().replace(" ", "_").startswith("non")


def _merge_urbanistica(dst: dict[str, Any], src: dict[str, Any], lotto_label: str | None) -> None:
    for key in ("conformita_urbanistica", "conformita_catastale"):
        s_block = src.get(key) if isinstance(src.get(key), dict) else {}
        d_block = dst.setdefault(key, {"stato": None, "dettaglio": None})
        if not isinstance(d_block, dict):
            dst[key] = {"stato": None, "dettaglio": None}
            d_block = dst[key]
        s_stato = s_block.get("stato")
        s_det = s_block.get("dettaglio")
        # Drop non-conforme that only names other lots (negative-space).
        if _is_non_conforme(s_stato) and _conformita_mentions_other_lots_only(s_det, lotto_label):
            s_stato = None
            s_det = None
        if _is_non_conforme(d_block.get("stato")) and _conformita_mentions_other_lots_only(
            d_block.get("dettaglio"), lotto_label
        ):
            d_block["stato"] = None
            d_block["dettaglio"] = None
        if _is_empty(d_block.get("stato")) and not _is_empty(s_stato):
            d_block["stato"] = s_stato
        elif (
            not _is_empty(s_stato)
            and not _is_non_conforme(s_stato)
            and _is_non_conforme(d_block.get("stato"))
            and _conformita_mentions_other_lots_only(d_block.get("dettaglio"), lotto_label)
        ):
            d_block["stato"] = s_stato
        if _is_empty(d_block.get("dettaglio")) and not _is_empty(s_det):
            d_block["dettaglio"] = s_det
        elif (
            not _is_empty(s_det)
            and _is_non_conforme(d_block.get("stato")) is False
            and _conformita_mentions_other_lots_only(d_block.get("dettaglio"), lotto_label)
        ):
            d_block["dettaglio"] = s_det

    dif = src.get("difformita")
    if isinstance(dif, list):
        cur = dst.setdefault("difformita", [])
        if isinstance(cur, list):
            for item in dif:
                if item not in cur:
                    # Skip difformita entries that only name other lots.
                    if isinstance(item, dict):
                        blob = json.dumps(item, ensure_ascii=False)
                        if _conformita_mentions_other_lots_only(blob, lotto_label):
                            continue
                    cur.append(item)


def _immobile_key(unit: dict[str, Any]) -> tuple[Any, ...]:
    return (
        unit.get("foglio"),
        unit.get("particella"),
        unit.get("subalterno"),
        unit.get("tipologia"),
    )


def _merge_immobili(dst: list[Any], src: list[Any]) -> list[Any]:
    out = list(dst)
    seen = {_immobile_key(u) for u in out if isinstance(u, dict)}
    for unit in src:
        if not isinstance(unit, dict):
            continue
        key = _immobile_key(unit)
        if key in seen and any(key):
            continue
        if key in seen and not any(key):
            # empty identity — append only if not exact duplicate
            if unit in out:
                continue
        out.append(unit)
        seen.add(key)
    return out


def _non_null_field_paths(data: dict[str, Any]) -> set[str]:
    """Paths useful for clearing meta.not_found after merge."""
    found: set[str] = set()
    econ = data.get("economics") if isinstance(data.get("economics"), dict) else {}
    for k, v in econ.items():
        if not _is_empty(v):
            found.add(f"economics.{k}")
    giu = data.get("giuridica") if isinstance(data.get("giuridica"), dict) else {}
    occ = giu.get("stato_occupazione") if isinstance(giu.get("stato_occupazione"), dict) else {}
    if not _is_empty(occ.get("stato")):
        found.add("giuridica.stato_occupazione")
        found.add("occupazione")
    urb = data.get("urbanistica") if isinstance(data.get("urbanistica"), dict) else {}
    for k in ("conformita_urbanistica", "conformita_catastale"):
        block = urb.get(k) if isinstance(urb.get(k), dict) else {}
        if not _is_empty(block.get("stato")):
            found.add(f"urbanistica.{k}")
    proc = data.get("procedura") if isinstance(data.get("procedura"), dict) else {}
    for k, v in proc.items():
        if not _is_empty(v):
            found.add(f"procedura.{k}")
    return found


def _redact_error_body(text: str, limit: int = 500) -> str:
    cleaned = re.sub(r"sk-[A-Za-z0-9_-]+", "[REDACTED]", text or "")
    cleaned = re.sub(r"[Bb]earer\s+\S+", "Bearer [REDACTED]", cleaned)
    return cleaned[:limit]


def _complete_long(s: Settings, system: str, user: str) -> str:
    import time

    import httpx

    # Live golden-set PDFs are large; OpenAI often returns 429 on burst retries.
    max_attempts = 6
    backoff_s = 15.0
    last_err: Exception | None = None
    for attempt in range(1, max_attempts + 1):
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
        if resp.status_code == 429:
            last_err = httpx.HTTPStatusError(
                f"429 Too Many Requests (attempt {attempt}/{max_attempts})",
                request=resp.request,
                response=resp,
            )
            retry_after = resp.headers.get("retry-after")
            try:
                wait = float(retry_after) if retry_after else backoff_s
            except ValueError:
                wait = backoff_s
            wait = max(5.0, min(wait, 120.0))
            log.warning("extract_openai_429_backoff", extra={"attempt": attempt, "wait_s": wait})
            time.sleep(wait)
            backoff_s = min(backoff_s * 1.5, 90.0)
            continue
        if resp.status_code >= 400:
            log.error(
                "extract_openai_http_error status=%s user_chars=%s body=%s",
                resp.status_code,
                len(user),
                _redact_error_body(resp.text),
            )
            resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"]
    assert last_err is not None
    raise last_err


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
