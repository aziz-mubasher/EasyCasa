from __future__ import annotations

import re

from ..schemas import ParsedFilters, ParsedQuery

_RENT = ("rent", "affitt", "alquil", "/mese", "per month")
_SALE = ("sale", "vend", "buy", "acquist", "compra")
_CATEGORY = {
    "renovatable": ("renovat", "ristruttur", "da sistemare", "reformar", "fixer"),
    "commercial": ("commercial", "negozio", "ufficio", "office", "shop", "local comercial"),
    "auction": ("auction", "asta", "subasta"),
    "nib": ("new build", "nuova costruzione", "nib", "obra nueva", "new-build"),
    "rooms": ("room", "stanza", "habitaci", "camera singola"),
}
_BED_WORDS = {"monolocale": 1, "bilocale": 2, "trilocale": 3, "quadrilocale": 4}


def _price(text: str) -> tuple[float | None, float | None]:
    t = text.lower()
    lo = hi = None
    # under / max
    m = re.search(r"(?:under|below|sotto|meno di|max|hasta|menos de)\D*([\d.,]+)\s*(k|mila|m|mln|million|milione)?", t)
    if m:
        hi = _num(m.group(1), m.group(2))
    m2 = re.search(r"(?:over|above|sopra|più di|min|desde|más de)\D*([\d.,]+)\s*(k|mila|m|mln|million|milione)?", t)
    if m2:
        lo = _num(m2.group(1), m2.group(2))
    return lo, hi


def _num(raw: str, unit: str | None) -> float:
    n = float(raw.replace(".", "").replace(",", "."))
    if unit in ("k", "mila"):
        n *= 1_000
    elif unit in ("m", "mln", "million", "milione"):
        n *= 1_000_000
    return n


def _bedrooms(text: str) -> int | None:
    t = text.lower()
    for word, n in _BED_WORDS.items():
        if word in t:
            return n
    m = re.search(r"(\d+)\s*(?:bed|bedroom|camere|camera|locali|dormitor)", t)
    return int(m.group(1)) if m else None


def parse_query(text: str, regions: list[tuple[str, str]] | None = None) -> ParsedQuery:
    """Heuristic multilingual (IT/EN/ES) NL query parser. `regions` = list of (slug, name)."""
    t = text.lower()
    f = ParsedFilters()

    if any(k in t for k in _RENT):
        f.transaction_type = "rent"
    elif any(k in t for k in _SALE):
        f.transaction_type = "sale"

    lo, hi = _price(text)
    f.min_price, f.max_price = lo, hi
    f.min_bedrooms = _bedrooms(text)

    for slug, keys in _CATEGORY.items():
        if any(k in t for k in keys):
            f.category_slug = slug
            break

    for slug, name in regions or []:
        if name.lower() in t or slug.replace("-", " ") in t:
            f.region_slug = slug
            break

    return ParsedQuery(text=text, filters=f)
