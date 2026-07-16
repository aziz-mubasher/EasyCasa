from __future__ import annotations

import statistics
from dataclasses import dataclass

from ..db import get_pool
from ..schemas import ValuationRequest, ValuationResponse


@dataclass
class Comparable:
    price: float
    size_sqm: float


def compute_valuation(comps: list[Comparable], size_sqm: float) -> ValuationResponse:
    """Transparent comparables AVM v1: value from the distribution of €/m² among
    similar listings. Range = interquartile spread; confidence from sample size."""
    ppsqm = [c.price / c.size_sqm for c in comps if c.size_sqm and c.price]
    n = len(ppsqm)
    if n == 0 or size_sqm <= 0:
        return ValuationResponse(
            estimate=None, low=None, high=None, price_per_sqm=None,
            confidence="none", comparables=0,
        )
    ppsqm.sort()
    median = statistics.median(ppsqm)
    if n >= 4:
        q1 = statistics.median(ppsqm[: n // 2])
        q3 = statistics.median(ppsqm[(n + 1) // 2 :])
    else:
        q1, q3 = min(ppsqm), max(ppsqm)
    confidence = "high" if n >= 20 else "medium" if n >= 6 else "low"
    return ValuationResponse(
        estimate=round(median * size_sqm),
        low=round(q1 * size_sqm),
        high=round(q3 * size_sqm),
        price_per_sqm=round(median, 2),
        confidence=confidence,
        comparables=n,
    )


def value(req: ValuationRequest) -> ValuationResponse:
    conds = ["status = 'published'", "price IS NOT NULL", "size_sqm IS NOT NULL", "size_sqm > 0"]
    params: list[object] = []
    if req.region_slug:
        conds.append("region_id = (SELECT id FROM regions WHERE slug = %s)")
        params.append(req.region_slug)
    if req.category_slug:
        conds.append("category_id = (SELECT id FROM categories WHERE slug = %s)")
        params.append(req.category_slug)
    if req.city:
        conds.append("lower(city) = lower(%s)")
        params.append(req.city)
    # size band ±40% keeps comparables relevant
    conds.append("size_sqm BETWEEN %s AND %s")
    params.extend([req.size_sqm * 0.6, req.size_sqm * 1.4])

    sql = f"SELECT price::float, size_sqm::float FROM listings WHERE {' AND '.join(conds)} LIMIT 500"
    with get_pool().connection() as conn:
        rows = conn.execute(sql, params).fetchall()
    comps = [Comparable(price=r[0], size_sqm=r[1]) for r in rows]
    return compute_valuation(comps, req.size_sqm)
