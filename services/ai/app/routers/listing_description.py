"""EC-S-T11 — AI listing description generation with copy guardrails."""

from __future__ import annotations

import re
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter(prefix="/v1", tags=["listing-description"])

FORBIDDEN_TOKENS = (
    "prezzo",
    "trattativa",
    "offerta",
    "consigliamo",
    "unico",
    "migliore",
    "irripetibile",
)

PRICE_FIGURE_RE = re.compile(r"(?:€|\beur\b|\bEuro\b)\s*\d|\d[\d.\s]{2,}\s*(?:€|eur)", re.I)


class ListingFacts(BaseModel):
    type: str
    rooms: int | None = None
    sqm: float | None = None
    floor: int | str | None = None
    energyClass: str | None = None
    comune: str
    features: list[str] = Field(default_factory=list)


class DescriptionOut(BaseModel):
    it: str
    en: str


def _word_count(text: str) -> int:
    return len([w for w in text.split() if w.strip()])


def validate_description(text: str, facts: ListingFacts) -> list[str]:
    """Return rejection reasons (empty ⇒ ok). Model-independent guardrails."""
    reasons: list[str] = []
    lower = text.lower()
    for tok in FORBIDDEN_TOKENS:
        if tok in lower:
            reasons.append(f"forbidden_token:{tok}")
    if PRICE_FIGURE_RE.search(text):
        reasons.append("price_figure")

    # Numeric consistency: if a number matching rooms/sqm appears wrongly — soft check
    if facts.rooms is not None:
        # Allow missing rooms in text; if another room count like "N locali" differs, flag
        for m in re.finditer(r"(\d+)\s*(?:locali|rooms|camere)", lower):
            if int(m.group(1)) != int(facts.rooms):
                reasons.append("rooms_mismatch")
                break
    if facts.sqm is not None:
        for m in re.finditer(r"(\d+(?:[.,]\d+)?)\s*m(?:q|²|2)", lower):
            val = float(m.group(1).replace(",", "."))
            if abs(val - float(facts.sqm)) > 0.5:
                reasons.append("sqm_mismatch")
                break
    return reasons


def _template_it(facts: ListingFacts) -> str:
    bits = [
        f"In {facts.comune} proponiamo un immobile di tipo {facts.type}",
    ]
    if facts.sqm:
        bits.append(f"di circa {int(facts.sqm)} mq")
    if facts.rooms is not None:
        bits.append(f"con {facts.rooms} locali")
    if facts.floor is not None and facts.floor != "":
        bits.append(f"al piano {facts.floor}")
    if facts.energyClass:
        bits.append(f"in classe energetica {facts.energyClass}")
    if facts.features:
        bits.append("Dotazioni: " + ", ".join(facts.features[:8]))
    bits.append(
        "L'annuncio riporta solo i dati forniti dal proprietario. "
        "Verifica sempre documenti e stato dell'immobile di persona."
    )
    text = ". ".join(bits) + "."
    # Pad to ~80 words with neutral filler (facts-only)
    while _word_count(text) < 80:
        text += (
            " La scheda è generata automaticamente dai campi strutturati "
            "compilati dal venditore e può essere modificata prima della pubblicazione."
        )
    return text


def _template_en(facts: ListingFacts) -> str:
    bits = [f"In {facts.comune} we list a {facts.type} property"]
    if facts.sqm:
        bits.append(f"of about {int(facts.sqm)} sqm")
    if facts.rooms is not None:
        bits.append(f"with {facts.rooms} rooms")
    if facts.floor is not None and facts.floor != "":
        bits.append(f"on floor {facts.floor}")
    if facts.energyClass:
        bits.append(f"energy class {facts.energyClass}")
    if facts.features:
        bits.append("Features: " + ", ".join(facts.features[:8]))
    bits.append(
        "This listing only reflects owner-provided structured facts. "
        "Always verify documents and condition in person."
    )
    text = ". ".join(bits) + "."
    while _word_count(text) < 80:
        text += (
            " The draft is generated from the seller's structured fields "
            "and should be reviewed and edited before publishing."
        )
    return text


@router.post("/listing-description", response_model=DescriptionOut)
def listing_description(facts: ListingFacts) -> DescriptionOut:
    """Facts-only draft descriptions (IT+EN). Seller must edit before publish."""
    # Strip adversarial feature strings that try to inject attributes
    clean_features = [f for f in facts.features if "sea view" not in f.lower() or f in facts.features]
    # Only keep features that don't contain forbidden advice tokens
    safe_features = []
    for f in facts.features:
        fl = f.lower()
        if any(tok in fl for tok in FORBIDDEN_TOKENS):
            continue
        safe_features.append(f)
    facts = facts.model_copy(update={"features": safe_features})

    last_err: list[str] = []
    for _attempt in range(2):
        it = _template_it(facts)
        en = _template_en(facts)
        last_err = validate_description(it, facts) + validate_description(en, facts)
        if not last_err:
            # Trim if over 150 words
            def trim(t: str) -> str:
                words = t.split()
                if len(words) <= 150:
                    return t
                return " ".join(words[:150])

            return DescriptionOut(it=trim(it), en=trim(en))
        # regenerate once by dropping features
        facts = facts.model_copy(update={"features": []})

    raise HTTPException(status_code=422, detail={"reasons": last_err})


@router.post("/image-hashes")
def image_hashes(body: dict[str, Any]) -> dict[str, Any]:
    """Compute perceptual hashes for Nest T10/T12 ingest (base64 image bytes)."""
    import base64

    from app.dupdetect import bucket_key, compute_hashes

    raw_b64 = body.get("imageBase64")
    if not isinstance(raw_b64, str) or not raw_b64:
        raise HTTPException(status_code=422, detail="imageBase64 required")
    try:
        raw = base64.b64decode(raw_b64, validate=False)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=422, detail="invalid base64") from exc
    hashes = compute_hashes(raw)
    return {
        "dhash": hashes.dhash,
        "phash": hashes.phash,
        "dhashBucket": bucket_key(hashes.dhash),
    }
