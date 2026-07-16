from __future__ import annotations

from ..db import get_pool, vector_literal
from ..providers.embeddings import get_embedder
from ..schemas import ListingHit, ParsedQuery, SearchResponse
from .nlq import parse_query


def _load_regions() -> list[tuple[str, str]]:
    with get_pool().connection() as conn:
        return [(r[0], r[1]) for r in conn.execute("SELECT slug, name FROM regions").fetchall()]


def semantic_search(query: str, limit: int = 24) -> SearchResponse:
    parsed = parse_query(query, _load_regions())
    return SearchResponse(parsed=parsed, items=_run(parsed, limit))


def _build_conditions(parsed: ParsedQuery) -> tuple[list[str], list[object]]:
    f = parsed.filters
    conds = ["status = 'published'", "embedding IS NOT NULL"]
    params: list[object] = []
    if f.transaction_type:
        conds.append("transaction_type = %s")
        params.append(f.transaction_type)
    if f.min_price is not None:
        conds.append("price >= %s")
        params.append(f.min_price)
    if f.max_price is not None:
        conds.append("price <= %s")
        params.append(f.max_price)
    if f.min_bedrooms is not None:
        conds.append("bedrooms >= %s")
        params.append(f.min_bedrooms)
    if f.region_slug:
        conds.append("region_id = (SELECT id FROM regions WHERE slug = %s)")
        params.append(f.region_slug)
    if f.category_slug:
        conds.append("category_id = (SELECT id FROM categories WHERE slug = %s)")
        params.append(f.category_slug)
    return conds, params


def _run(parsed: ParsedQuery, limit: int) -> list[ListingHit]:
    conds, cond_params = _build_conditions(parsed)
    qvec = vector_literal(get_embedder().embed([parsed.text])[0])

    sql = f"""
        SELECT id::text, slug, title, price::float, city, bedrooms, size_sqm::float,
               1 - (embedding <=> %s::vector) AS score
          FROM listings
         WHERE {' AND '.join(conds)}
         ORDER BY embedding <=> %s::vector
         LIMIT %s
    """
    # Placeholder order in SQL text: [SELECT qvec] + [WHERE conds] + [ORDER BY qvec] + [LIMIT]
    params = [qvec, *cond_params, qvec, limit]

    with get_pool().connection() as conn:
        rows = conn.execute(sql, params).fetchall()
    return [
        ListingHit(
            id=r[0], slug=r[1], title=r[2], price=r[3], city=r[4],
            bedrooms=r[5], size_sqm=r[6],
            score=round(r[7], 4) if r[7] is not None else None,
        )
        for r in rows
    ]
