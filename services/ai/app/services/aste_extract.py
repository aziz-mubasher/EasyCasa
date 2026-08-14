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
PRECEDENCE_URBANISTICA = ("perizia", "avviso", "ordinanza", "certificazione")

# Perizia sections for occupazione / valore_stima / conformità must not be starved by lot-priority pack.
FIELD_CONTEXT_KEYWORDS = re.compile(
    r"stato\s+occupativ|occupato|occupazione|\blibero\b|condotto\s+in\s+locazione|canone|"
    r"valore\s+di\s+stima|stima\s+del\s+valore|valore\s+commerciale|valore\s+stima|"
    r"valore\s+di\s+mercato|pi[uù]\s+probabile\s+valore|valore\s+complessivo|riepilogo\s+valori|"
    r"\bstima\b|"
    r"ctu|consulente\s+tecnico|"
    r"conformit[aà]\s+(?:urbanistica|catastale|edilizia)|difformit[aà]|"
    r"difformit[aà]\s+(?:edilizie|urbanistiche|catastali)|abuso\s+edilizio|"
    r"\bcondono\b|sanatoria|agibilit[aà]|"
    r"opere\s+realizzate\s+in\s+assenza\s+di\s+titolo|"
    r"\b(?:cila|scia)\b.*sanatoria|titolo\s+edilizio",
    re.IGNORECASE,
)

CONFORMITA_ENUM = (
    "conforme",
    "non_conforme",
    "non_rilevato",
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
- Extract cauzione.importo ONLY when explicitly stated in the text (e.g. "deposito cauzionale di euro 3.603,90", "a titolo di cauzione euro …", "cauzione pari al 10% del prezzo base pari a euro …").
- Italian phrasing for pct: "cauzione pari al 10% del prezzo base/offerto", "deposito cauzionale", "a titolo di cauzione", "10% a titolo di cauzione".
- If only pct is stated with base "prezzo_base", leave importo null (post-processing may derive it from prezzo_base).
- If pct is stated with base "prezzo_offerto" (e.g. "10% del prezzo OFFERTO"), set base="prezzo_offerto" and leave importo null — never fabricate importo from prezzo_base.
- Prefer avviso over ordinanza for prezzo_base, offerta_minima, cauzione, rilancio_minimo when they conflict (ribassi / successive vendite).
- If both avviso and ordinanza prezzo_base appear, set economics.prezzo_base from the avviso and add meta.prezzo_base_candidates with both sourced values.
- economics.valore_stima = CTU/perizia TOTAL estimate {value, source, dettaglio?} for the target property/lot.
- valore_stima is the TOTAL stima ("valore di stima", "valore di mercato", "più probabile valore di mercato", "valore complessivo del lotto") — NEVER a per-square-metre (€/mq) figure, per-unit table row, or coefficient.
- If the perizia states only €/mq without an explicit total for the lot, set valore_stima to null and add economics.valore_stima to meta.not_found — NEVER multiply €/mq × surface (that is invention, not derivation).
- When lotto_label is set, extract ONLY the target lot's stima from multi-lot stima tables; cite lot in dettaglio when helpful (e.g. "Lotto 4"). Do NOT bleed another lot's stima.
- Prefer perizia over avviso/ordinanza for valore_stima.

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

Urbanistica / catastale (per lot when lotto_label set):
- urbanistica.conformita_urbanistica = {stato, dettaglio, source?}
- urbanistica.conformita_catastale = {stato, dettaglio, source?}
- stato MUST be one of: conforme | non_conforme | non_rilevato
- Map Italian phrasing in CTU/perizia sections:
  "conformità urbanistica e catastale", "conforme", "in regola" → conforme;
  "difformità edilizie/urbanistiche/catastali", "abuso edilizio", "non conforme", "difforme" → non_conforme;
  "condono", "sanatoria", "CILA/SCIA in sanatoria", "opere realizzate in assenza di titolo" → non_conforme with difformita entries;
  "agibilità" passages may indicate conforme or non_conforme depending on context;
  if conformity cannot be determined → non_rilevato (never guess).
- urbanistica.difformita = [{descrizione, sanabile|null, costo_stimato|null, source:{file,page}}]
  Each difformità MUST include descrizione and source; set sanabile true/false when text states sanabile/non sanabile/condonabile.
- Prefer perizia (CTU section) over avviso for conformità urbanistica/catastale; cite source page.
- When lotto_label is set, do NOT assign another lot's difformità to this lot.

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

STIMA_MICROCHUNK_HINT = (
    "FOCUSED PASS: extract ONLY economics.valore_stima (total CTU/perizia stima for the target lot). "
    "Leave all other fields null. If no explicit total stima for the target lot, set valore_stima null "
    "and include economics.valore_stima in meta.not_found. NEVER use €/mq or invent totals."
)

STIMA_MICROCHUNK_KEYWORDS = re.compile(
    r"valore\s+di\s+stima|stima\s+del\s+valore|valore\s+commerciale|valore\s+stima|"
    r"valore\s+di\s+mercato|pi[uù]\s+probabile\s+valore|valore\s+complessivo|riepilogo\s+valori|"
    r"\bstima\b|ctu|consulente\s+tecnico",
    re.IGNORECASE,
)

MAX_STIMA_MICROCHUNK_CHARS = 12_000


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
        page_text_index = _build_page_text_index(req.documents)
        normalized = _finalize_extraction(
            normalized,
            [normalized],
            meta_docs,
            req.lotto_label,
            min_prezzo_base_ratio=s.VALORE_STIMA_MIN_PREZZO_BASE_RATIO,
            page_text_index=page_text_index,
        )
        normalized = _maybe_stima_microchunk_pass(req, normalized, s, meta_docs, page_text_index)
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

    page_text_index = _build_page_text_index(req.documents)
    merged = merge_extractions(
        parts,
        meta_docs,
        req.lotto_label,
        min_prezzo_base_ratio=s.VALORE_STIMA_MIN_PREZZO_BASE_RATIO,
        page_text_index=page_text_index,
    )
    merged["meta"].setdefault("warnings", []).append(f"extract_chunked:{total}")
    merged = _maybe_stima_microchunk_pass(req, merged, s, meta_docs, page_text_index)
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
    *,
    min_prezzo_base_ratio: float = 0.01,
    page_text_index: dict[tuple[str, int], str] | None = None,
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
    return _finalize_extraction(
        base,
        parts,
        meta_docs,
        lotto_label,
        min_prezzo_base_ratio=min_prezzo_base_ratio,
        page_text_index=page_text_index,
    )


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


def _build_page_text_index(
    documents: list[ExtractDocumentIn],
) -> dict[tuple[str, int], str]:
    index: dict[tuple[str, int], str] = {}
    for doc in documents:
        for page in doc.pages:
            index[(doc.file, page.page)] = page.text or ""
    return index


def _lookup_page_text(
    page_text_index: dict[tuple[str, int], str] | None,
    source: Any,
) -> str | None:
    if not page_text_index or not isinstance(source, dict):
        return None
    file_id = source.get("file")
    page_no = source.get("page")
    if not file_id or page_no is None:
        return None
    try:
        page_i = int(page_no)
    except (TypeError, ValueError):
        return None
    return page_text_index.get((str(file_id), page_i))


def _split_by_lot_sections(text: str) -> dict[str, str]:
    sections: dict[str, str] = {}
    pattern = re.compile(r"\blotto\s+([A-Za-z0-9]+)\b", re.IGNORECASE)
    matches = list(pattern.finditer(text or ""))
    for i, match in enumerate(matches):
        label = match.group(1).upper()
        start = match.start()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        sections[label] = text[start:end]
    return sections


def _value_numeric_variants(value: Any) -> list[str]:
    if value is None:
        return []
    try:
        num = float(value)
    except (TypeError, ValueError):
        return []
    variants: list[str] = []
    if num == int(num):
        variants.append(str(int(num)))
    variants.append(str(num))
    whole = int(round(num))
    variants.append(f"{whole:,}".replace(",", "."))
    variants.append(f"{whole:,}".replace(",", " "))
    return [v for v in variants if v]


def _value_in_lot_section(value: Any, lot_label: str, text: str) -> bool:
    sections = _split_by_lot_sections(text)
    section = sections.get(lot_label.strip().upper())
    if not section:
        return False
    blob = section.lower()
    for variant in _value_numeric_variants(value):
        if variant.lower() in blob.replace(" ", ""):
            return True
        if variant in section:
            return True
    return False


def _sourced_value_for_other_lot_only(
    val: Any,
    lotto_label: str | None,
    page_text_index: dict[tuple[str, int], str] | None,
) -> bool:
    """True when a sourced economics/occupazione value clearly belongs to another lot."""
    if not lotto_label or not isinstance(val, dict):
        return False
    selected = lotto_label.strip().upper()

    lot = val.get("lotto")
    if isinstance(lot, str) and lot.strip():
        return lot.strip().upper() != selected

    det = val.get("dettaglio")
    if isinstance(det, str) and det.strip():
        if selected in _lots_mentioned(det):
            return False
        if _conformita_mentions_other_lots_only(det, lotto_label):
            return True

    source_text = _lookup_page_text(page_text_index, val.get("source"))
    if source_text:
        sections = _split_by_lot_sections(source_text)
        if sections:
            value = val.get("value")
            if value is not None and _value_in_lot_section(value, selected, source_text):
                return False
            if selected not in sections:
                mentioned = set(sections.keys())
                if mentioned and selected not in mentioned:
                    if value is None or any(
                        _value_in_lot_section(value, other, source_text) for other in mentioned
                    ):
                        return True
        elif _lot_mention_re(lotto_label).search(source_text) is None:
            lots = _lots_mentioned(source_text)
            if lots and selected not in lots:
                return True

    return False


def _sourced_value_matches_target_lot(
    val: Any,
    lotto_label: str | None,
    page_text_index: dict[tuple[str, int], str] | None,
) -> bool:
    if not lotto_label or not isinstance(val, dict):
        return False
    selected = lotto_label.strip().upper()

    lot = val.get("lotto")
    if isinstance(lot, str) and lot.strip().upper() == selected:
        return True

    det = val.get("dettaglio")
    if isinstance(det, str) and selected in _lots_mentioned(det):
        return True

    source_text = _lookup_page_text(page_text_index, val.get("source"))
    if source_text:
        value = val.get("value")
        if value is not None and _value_in_lot_section(value, selected, source_text):
            return True
        if _lot_mention_re(lotto_label).search(source_text):
            sections = _split_by_lot_sections(source_text)
            if not sections or selected in sections:
                return True

    return False


def _pick_by_precedence_lot_aware(
    candidates: list[tuple[Any, str | None]],
    precedence: tuple[str, ...],
    lotto_label: str | None,
    page_text_index: dict[tuple[str, int], str] | None,
) -> Any:
    if not candidates:
        return None
    pool = candidates
    if lotto_label:
        explicit = [
            (val, dtype)
            for val, dtype in pool
            if _sourced_value_matches_target_lot(val, lotto_label, page_text_index)
        ]
        if explicit:
            pool = explicit
    return _pick_by_precedence(pool, precedence)


def _occupazione_for_other_lot_only(
    occ: dict[str, Any],
    lotto_label: str | None,
    page_text_index: dict[tuple[str, int], str] | None,
) -> bool:
    if not lotto_label:
        return False
    det = occ.get("dettaglio")
    if isinstance(det, str) and det.strip():
        if lotto_label.strip().upper() in _lots_mentioned(det):
            return False
        if _conformita_mentions_other_lots_only(det, lotto_label):
            return True
    source_text = _lookup_page_text(page_text_index, occ.get("source"))
    if source_text:
        lots = _lots_mentioned(source_text)
        selected = lotto_label.strip().upper()
        if lots and selected not in lots:
            if _lot_mention_re(lotto_label).search(source_text) is None:
                return True
    return False


def _has_explicit_target_nonconformity(dettaglio: Any, lotto_label: str | None) -> bool:
    """True when dettaglio states non-conformity for the target lot (not other-lot-only)."""
    if not isinstance(dettaglio, str) or not dettaglio.strip():
        return False
    if lotto_label and lotto_label.strip().upper() in _lots_mentioned(dettaglio):
        return True
    if _conformita_mentions_other_lots_only(dettaglio, lotto_label):
        return False
    blob = dettaglio.lower()
    return bool(re.search(r"non[\s_]?conform|difform|abuso\s+ediliz", blob))


def _reconcile_orphaned_conformita_stato(
    urbanistica: dict[str, Any],
    lotto_label: str | None,
    meta: dict[str, Any],
) -> None:
    """Drop bare non_conforme when target-lot difformità evidence was fully filtered out (GT-5)."""
    dif = urbanistica.get("difformita")
    has_difformita = isinstance(dif, list) and len(dif) > 0
    warnings = meta.setdefault("warnings", [])

    for field in ("conformita_urbanistica", "conformita_catastale"):
        block = urbanistica.get(field)
        if not isinstance(block, dict):
            continue
        stato = block.get("stato")
        if not _is_non_conforme(stato):
            continue
        if has_difformita:
            continue
        det = block.get("dettaglio")
        if _has_explicit_target_nonconformity(det, lotto_label):
            continue
        block["stato"] = "non_rilevato"
        block["dettaglio"] = None
        if "orphaned_conformita_stato_dropped" not in warnings:
            warnings.append("orphaned_conformita_stato_dropped")


def _reconcile_not_found(meta: dict[str, Any], data: dict[str, Any]) -> None:
    """Remove not_found paths after late fills (micro-chunk, derive, guards)."""
    nf = meta.get("not_found")
    if not isinstance(nf, list):
        return
    found = _non_null_field_paths(data)
    drop: set[str] = set()
    for path in found:
        drop.add(path)
        if "." in path:
            drop.add(f"{path}.value")
    econ = data.get("economics") if isinstance(data.get("economics"), dict) else {}
    vs = econ.get("valore_stima")
    if isinstance(vs, dict) and vs.get("value") is not None:
        drop.update({"economics.valore_stima", "economics.valore_stima.value"})
    meta["not_found"] = sorted(p for p in nf if p not in drop)


def _build_stima_microchunk_documents(
    documents: list[ExtractDocumentIn],
    lotto_label: str | None,
    *,
    max_chars: int = MAX_STIMA_MICROCHUNK_CHARS,
) -> list[ExtractDocumentIn]:
    ranked: list[tuple[int, str, str, ExtractPageIn]] = []
    for doc in documents:
        if (doc.doc_type or "").lower() != "perizia":
            continue
        for page in doc.pages:
            text = page.text or ""
            if not STIMA_MICROCHUNK_KEYWORDS.search(text):
                continue
            pri = page_lot_priority(text, lotto_label, "perizia")
            ranked.append((pri, doc.file, doc.doc_type, ExtractPageIn(page=page.page, text=text)))

    ranked.sort(key=lambda t: (-t[0], t[1], t[3].page))

    out_docs: dict[str, ExtractDocumentIn] = {}
    order: list[str] = []
    size = 0
    for _pri, file_id, doc_type, page in ranked:
        trial = dict(out_docs)
        if file_id not in trial:
            trial[file_id] = ExtractDocumentIn(file=file_id, doc_type=doc_type, pages=[])
        trial_doc = ExtractDocumentIn(
            file=file_id,
            doc_type=doc_type,
            pages=[*trial[file_id].pages, page],
        )
        trial[file_id] = trial_doc
        trial_order = order if file_id in out_docs else [*order, file_id]
        payload = _build_user_payload(
            "it",
            lotto_label,
            [trial[k] for k in trial_order],
        )
        trial_size = len(json.dumps(payload, ensure_ascii=False))
        if out_docs and trial_size > max_chars:
            break
        out_docs = trial
        order = trial_order
        size = trial_size

    return [out_docs[k] for k in order]


def _maybe_stima_microchunk_pass(
    req: ExtractRequest,
    merged: dict[str, Any],
    settings: Settings,
    meta_docs: list[dict[str, Any]],
    page_text_index: dict[tuple[str, int], str],
) -> dict[str, Any]:
    if not settings.ASTE_STIMA_MICROCHUNK_ENABLED:
        return merged

    econ = merged.get("economics") if isinstance(merged.get("economics"), dict) else {}
    vs = econ.get("valore_stima")
    if isinstance(vs, dict) and vs.get("value") is not None:
        return merged

    nf = merged.get("meta", {}).get("not_found") if isinstance(merged.get("meta"), dict) else []
    needs_stima = "economics.valore_stima" in (nf or []) or "economics.valore_stima.value" in (nf or [])
    if not needs_stima and not _is_empty(vs):
        return merged

    has_perizia = any((d.doc_type or "").lower() == "perizia" for d in req.documents)
    if not has_perizia:
        return merged

    micro_docs = _build_stima_microchunk_documents(req.documents, req.lotto_label)
    if not micro_docs:
        return merged

    payload = _build_user_payload(req.language, req.lotto_label, micro_docs)
    payload["microchunk"] = {"focus": "economics.valore_stima", "hint": STIMA_MICROCHUNK_HINT}
    user_json = json.dumps(payload, ensure_ascii=False)
    raw = _complete_long(settings, SYSTEM_PROMPT, user_json)
    parsed = _parse_json_object(raw)
    part = _normalize(parsed, meta_docs, req.lotto_label)

    micro_val = part.get("economics", {}).get("valore_stima") if isinstance(part.get("economics"), dict) else None
    if _is_empty(micro_val) or not isinstance(micro_val, dict):
        merged.setdefault("meta", {}).setdefault("warnings", []).append("stima_microchunk:no_fill")
        return merged

    if _sourced_value_for_other_lot_only(micro_val, req.lotto_label, page_text_index):
        merged.setdefault("meta", {}).setdefault("warnings", []).append("stima_microchunk:other_lot_rejected")
        return merged

    merged.setdefault("economics", {})["valore_stima"] = micro_val
    merged = _finalize_extraction(
        merged,
        [merged, part],
        meta_docs,
        req.lotto_label,
        min_prezzo_base_ratio=settings.VALORE_STIMA_MIN_PREZZO_BASE_RATIO,
        page_text_index=page_text_index,
    )
    merged.setdefault("meta", {}).setdefault("warnings", []).append("stima_microchunk:fill")
    return merged


def _collect_sourced_candidates(
    parts: list[dict[str, Any]],
    field_path: str,
    meta_docs: list[dict[str, Any]],
    lotto_label: str | None = None,
    page_text_index: dict[tuple[str, int], str] | None = None,
) -> list[tuple[Any, str | None]]:
    """Collect (value, doc_type) from chunk parts for economics.* sourced numbers."""
    field = field_path.split(".")[-1] if "." in field_path else field_path
    out: list[tuple[Any, str | None]] = []
    for part in parts:
        econ = part.get("economics") if isinstance(part.get("economics"), dict) else {}
        val = econ.get(field)
        if _is_empty(val) or not isinstance(val, dict):
            continue
        if _sourced_value_for_other_lot_only(val, lotto_label, page_text_index):
            continue
        dtype = _source_doc_type(val.get("source"), meta_docs)
        out.append((val, dtype))
    return out


def _collect_cauzione_candidates(
    parts: list[dict[str, Any]],
    meta_docs: list[dict[str, Any]],
    lotto_label: str | None = None,
    page_text_index: dict[tuple[str, int], str] | None = None,
) -> list[tuple[Any, str | None]]:
    out: list[tuple[Any, str | None]] = []
    for part in parts:
        econ = part.get("economics") if isinstance(part.get("economics"), dict) else {}
        val = econ.get("cauzione")
        if _is_empty(val) or not isinstance(val, dict):
            continue
        if _sourced_value_for_other_lot_only(val, lotto_label, page_text_index):
            continue
        dtype = _source_doc_type(val.get("source"), meta_docs)
        out.append((val, dtype))
    return out


def _collect_occupazione_candidates(
    parts: list[dict[str, Any]],
    meta_docs: list[dict[str, Any]],
    lotto_label: str | None = None,
    page_text_index: dict[tuple[str, int], str] | None = None,
) -> list[tuple[Any, str | None]]:
    out: list[tuple[Any, str | None]] = []
    for part in parts:
        giu = part.get("giuridica") if isinstance(part.get("giuridica"), dict) else {}
        occ = giu.get("stato_occupazione") if isinstance(giu.get("stato_occupazione"), dict) else {}
        if _is_empty(occ.get("stato")):
            continue
        if _occupazione_for_other_lot_only(occ, lotto_label, page_text_index):
            continue
        dtype = _source_doc_type(occ.get("source"), meta_docs)
        out.append((occ, dtype))
    return out


def _collect_valore_stima_candidates(
    parts: list[dict[str, Any]],
    meta_docs: list[dict[str, Any]],
    lotto_label: str | None = None,
    page_text_index: dict[tuple[str, int], str] | None = None,
) -> list[tuple[Any, str | None]]:
    out: list[tuple[Any, str | None]] = []
    for part in parts:
        econ = part.get("economics") if isinstance(part.get("economics"), dict) else {}
        val = econ.get("valore_stima")
        if _is_empty(val) or not isinstance(val, dict):
            continue
        if _sourced_value_for_other_lot_only(val, lotto_label, page_text_index):
            continue
        dtype = _source_doc_type(val.get("source"), meta_docs)
        out.append((val, dtype))
    return out


def _valore_stima_for_other_lot_only(valore: Any, lotto_label: str | None) -> bool:
    """True when valore_stima clearly belongs to another lot (Ex2 multi-lot stima tables)."""
    return _sourced_value_for_other_lot_only(valore, lotto_label, None)


def guard_valore_stima_plausibility(
    economics: dict[str, Any],
    meta: dict[str, Any],
    *,
    min_prezzo_base_ratio: float = 0.01,
) -> None:
    """Reject implausibly small valore_stima vs prezzo_base (Ex5 €/mq mis-parse class)."""
    vs = economics.get("valore_stima")
    if not isinstance(vs, dict) or vs.get("value") is None:
        return
    pb = economics.get("prezzo_base")
    if not isinstance(pb, dict) or pb.get("value") is None:
        return
    try:
        stima = float(vs["value"])
        prezzo = float(pb["value"])
    except (TypeError, ValueError):
        return
    if prezzo <= 0 or min_prezzo_base_ratio <= 0:
        return
    if stima >= prezzo * min_prezzo_base_ratio:
        return
    economics["valore_stima"] = None
    nf = meta.setdefault("not_found", [])
    if isinstance(nf, list) and "economics.valore_stima" not in nf:
        nf.append("economics.valore_stima")
    warnings = meta.setdefault("warnings", [])
    if isinstance(warnings, list) and "valore_stima_suspect" not in warnings:
        warnings.append("valore_stima_suspect")


def _collect_conformita_candidates(
    parts: list[dict[str, Any]],
    field: str,
    meta_docs: list[dict[str, Any]],
    lotto_label: str | None = None,
) -> list[tuple[Any, str | None]]:
    out: list[tuple[Any, str | None]] = []
    for part in parts:
        urb = part.get("urbanistica") if isinstance(part.get("urbanistica"), dict) else {}
        block = urb.get(field) if isinstance(urb.get(field), dict) else {}
        stato = block.get("stato")
        dettaglio = block.get("dettaglio")
        if _is_empty(stato):
            continue
        if _is_non_conforme(stato) and _conformita_mentions_other_lots_only(dettaglio, lotto_label):
            continue
        dtype = _source_doc_type(block.get("source"), meta_docs)
        out.append((block, dtype))
    return out


def _merge_cauzione_fields(cauzione: dict[str, Any], candidates: list[tuple[Any, str | None]]) -> None:
    """Fill missing pct/importo/base from other chunk cauzione objects (EC-32 pattern b)."""
    for val, _dtype in candidates:
        if not isinstance(val, dict):
            continue
        if cauzione.get("pct") is None and val.get("pct") is not None:
            cauzione["pct"] = val["pct"]
        if cauzione.get("importo") is None and val.get("importo") is not None:
            cauzione["importo"] = val["importo"]
            cauzione.pop("derived", None)
        if cauzione.get("base") is None and val.get("base") is not None:
            cauzione["base"] = val["base"]
        if cauzione.get("source") is None and val.get("source") is not None:
            cauzione["source"] = val["source"]


def _apply_field_precedence(
    merged: dict[str, Any],
    parts: list[dict[str, Any]],
    meta_docs: list[dict[str, Any]],
    lotto_label: str | None = None,
    page_text_index: dict[tuple[str, int], str] | None = None,
) -> None:
    """Field-specific doc-type precedence after chunk merge (EC-30)."""
    econ = merged.setdefault("economics", {})
    giu = merged.setdefault("giuridica", {})

    for field in ("prezzo_base", "offerta_minima", "rilancio_minimo"):
        picked = _pick_by_precedence_lot_aware(
            _collect_sourced_candidates(
                parts, field, meta_docs, lotto_label, page_text_index
            ),
            PRECEDENCE_AUCTION,
            lotto_label,
            page_text_index,
        )
        if not _is_empty(picked):
            econ[field] = picked

    valore = _pick_by_precedence_lot_aware(
        _collect_valore_stima_candidates(parts, meta_docs, lotto_label, page_text_index),
        PRECEDENCE_VALORE_STIMA,
        lotto_label,
        page_text_index,
    )
    if not _is_empty(valore):
        econ["valore_stima"] = valore

    cau_candidates = _collect_cauzione_candidates(
        parts, meta_docs, lotto_label, page_text_index
    )
    cauzione = _pick_by_precedence_lot_aware(
        cau_candidates,
        PRECEDENCE_AUCTION,
        lotto_label,
        page_text_index,
    )
    if not _is_empty(cauzione) and isinstance(cauzione, dict):
        _merge_cauzione_fields(cauzione, cau_candidates)
        econ["cauzione"] = cauzione

    occupazione = _pick_by_precedence_lot_aware(
        _collect_occupazione_candidates(
            parts, meta_docs, lotto_label, page_text_index
        ),
        PRECEDENCE_OCCUPAZIONE,
        lotto_label,
        page_text_index,
    )
    if not _is_empty(occupazione):
        giu["stato_occupazione"] = occupazione

    urb = merged.setdefault("urbanistica", {})
    for field in ("conformita_urbanistica", "conformita_catastale"):
        picked = _pick_by_precedence(
            _collect_conformita_candidates(parts, field, meta_docs, lotto_label),
            PRECEDENCE_URBANISTICA,
        )
        if not _is_empty(picked) and isinstance(picked, dict):
            urb[field] = picked

    # Ex2 regression: explicit dual candidates override sequential merge.
    meta = merged.get("meta") if isinstance(merged.get("meta"), dict) else {}
    dual = meta.get("prezzo_base_candidates")
    if isinstance(dual, list) and len(dual) >= 2:
        avviso = next(
            (
                c
                for c in dual
                if isinstance(c, dict)
                and not _sourced_value_for_other_lot_only(c, lotto_label, page_text_index)
                and _source_doc_type(c.get("source"), meta_docs) == "avviso"
            ),
            None,
        )
        ordinanza = next(
            (
                c
                for c in dual
                if isinstance(c, dict)
                and not _sourced_value_for_other_lot_only(c, lotto_label, page_text_index)
                and _source_doc_type(c.get("source"), meta_docs) == "ordinanza"
            ),
            None,
        )
        if avviso and ordinanza:
            econ["prezzo_base"] = avviso


def derive_cauzione_importo(economics: dict[str, Any]) -> None:
    """Compute cauzione.importo from pct × prezzo_base when only pct is stated (EC-30/32)."""
    cau = economics.get("cauzione")
    if not isinstance(cau, dict):
        return
    if cau.get("importo") is not None:
        cau.pop("derived", None)
        return

    pct = _coerce_pct(cau.get("pct"))
    if pct is None:
        return
    cau["pct"] = pct

    base_kind = cau.get("base")
    if base_kind is None:
        base_kind = "prezzo_base"
        cau["base"] = base_kind
    if base_kind != "prezzo_base":
        return

    prezzo = economics.get("prezzo_base")
    if not isinstance(prezzo, dict) or prezzo.get("value") is None:
        return
    try:
        prezzo_f = float(prezzo["value"])
    except (TypeError, ValueError):
        return
    importo = round(prezzo_f * pct / 100.0, 2)
    cau["importo"] = importo
    cau["derived"] = True


def _coerce_pct(raw: Any) -> float | None:
    if raw is None:
        return None
    if isinstance(raw, (int, float)):
        return float(raw)
    if isinstance(raw, str):
        m = re.search(r"(\d+(?:[.,]\d+)?)", raw.replace(",", "."))
        if m:
            try:
                return float(m.group(1))
            except ValueError:
                return None
    return None


def _coerce_importo(raw: Any) -> float | None:
    if raw is None:
        return None
    if isinstance(raw, (int, float)):
        return float(raw)
    if isinstance(raw, str):
        cleaned = raw.replace(".", "").replace(",", ".") if re.search(r"\d,\d{2}\b", raw) else raw.replace(",", ".")
        m = re.search(r"(\d+(?:\.\d+)?)", cleaned)
        if m:
            try:
                return float(m.group(1))
            except ValueError:
                return None
    return None


def _normalize_cauzione(economics: dict[str, Any]) -> None:
    cau = economics.get("cauzione")
    if not isinstance(cau, dict):
        return
    pct = _coerce_pct(cau.get("pct"))
    if pct is not None:
        cau["pct"] = pct
    importo = _coerce_importo(cau.get("importo"))
    if importo is not None:
        cau["importo"] = importo
        cau.pop("derived", None)
    base = cau.get("base")
    if isinstance(base, str):
        blob = base.lower().replace(" ", "_")
        if "offert" in blob:
            cau["base"] = "prezzo_offerto"
        elif "base" in blob:
            cau["base"] = "prezzo_base"


def _normalize_conformita_block(block: dict[str, Any]) -> None:
    stato = block.get("stato")
    if not isinstance(stato, str) or not stato.strip():
        return
    blob = stato.strip().lower().replace(" ", "_").replace("-", "_")
    alias = {
        "in_regola": "conforme",
        "conforme_urbanisticamente": "conforme",
        "conforme_catastalmente": "conforme",
        "difforme": "non_conforme",
        "non_conforme": "non_conforme",
        "non_conformita": "non_conforme",
        "non_conformità": "non_conforme",
        "non_rilevato": "non_rilevato",
        "non_rilevata": "non_rilevato",
    }
    normalized = alias.get(blob, blob)
    if normalized in CONFORMITA_ENUM:
        block["stato"] = normalized
        return
    det = (block.get("dettaglio") or "").lower()
    combined = f"{blob} {det}"
    if "non_rilev" in combined or "non indicat" in combined:
        block["stato"] = "non_rilevato"
    elif re.search(r"non[\s_]?conform|difform|abuso\s+ediliz", combined):
        block["stato"] = "non_conforme"
    elif "conform" in combined or "in regola" in combined:
        block["stato"] = "conforme"


def _normalize_urbanistica(urbanistica: dict[str, Any]) -> None:
    for key in ("conformita_urbanistica", "conformita_catastale"):
        block = urbanistica.get(key)
        if isinstance(block, dict):
            _normalize_conformita_block(block)
    dif = urbanistica.get("difformita")
    if isinstance(dif, list):
        for item in dif:
            if not isinstance(item, dict):
                continue
            san = item.get("sanabile")
            if isinstance(san, str):
                sl = san.strip().lower()
                if sl in ("true", "si", "sì", "sanabile", "condonabile"):
                    item["sanabile"] = True
                elif sl in ("false", "no", "non sanabile", "non_sanabile"):
                    item["sanabile"] = False
                else:
                    item["sanabile"] = None


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
    lotto_label: str | None = None,
    *,
    min_prezzo_base_ratio: float = 0.01,
    page_text_index: dict[tuple[str, int], str] | None = None,
) -> dict[str, Any]:
    _apply_field_precedence(merged, parts, meta_docs, lotto_label, page_text_index)
    giu = merged.get("giuridica") if isinstance(merged.get("giuridica"), dict) else {}
    _normalize_occupazione_stato(giu)
    urb = merged.get("urbanistica") if isinstance(merged.get("urbanistica"), dict) else {}
    _normalize_urbanistica(urb)
    meta = merged.setdefault("meta", {})
    _reconcile_orphaned_conformita_stato(urb, lotto_label, meta)
    econ = merged.get("economics") if isinstance(merged.get("economics"), dict) else {}
    _normalize_cauzione(econ)
    derive_cauzione_importo(econ)
    guard_valore_stima_plausibility(
        econ,
        meta,
        min_prezzo_base_ratio=min_prezzo_base_ratio,
    )
    # Clear economics.cauzione from not_found when derived importo fills the gap.
    cau = econ.get("cauzione") if isinstance(econ.get("cauzione"), dict) else {}
    if cau.get("importo") is not None:
        nf = meta.get("not_found")
        if isinstance(nf, list):
            meta["not_found"] = [p for p in nf if p not in ("economics.cauzione", "economics.cauzione.importo")]
    _reconcile_not_found(meta, merged)
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
            if lotto_label:
                d_block["stato"] = "non_rilevato"
                d_block["dettaglio"] = None
            s_stato = None
            s_det = None
        if _is_non_conforme(d_block.get("stato")) and _conformita_mentions_other_lots_only(
            d_block.get("dettaglio"), lotto_label
        ):
            d_block["stato"] = "non_rilevato" if lotto_label else None
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
    if isinstance(urb.get("difformita"), list) and urb["difformita"]:
        found.add("urbanistica.difformita")
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
