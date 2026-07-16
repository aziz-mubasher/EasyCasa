from __future__ import annotations

from ..db import get_pool
from ..schemas import ListingHit


def similar(listing_id: str, limit: int = 8) -> list[ListingHit]:
    sql = """
        WITH target AS (SELECT embedding FROM listings WHERE id = %s)
        SELECT l.id::text, l.slug, l.title, l.price::float, l.city, l.bedrooms, l.size_sqm::float,
               1 - (l.embedding <=> t.embedding) AS score
          FROM listings l, target t
         WHERE l.id <> %s
           AND l.status = 'published'
           AND l.embedding IS NOT NULL
           AND t.embedding IS NOT NULL
         ORDER BY l.embedding <=> t.embedding
         LIMIT %s
    """
    with get_pool().connection() as conn:
        rows = conn.execute(sql, [listing_id, listing_id, limit]).fetchall()
    return [
        ListingHit(id=r[0], slug=r[1], title=r[2], price=r[3], city=r[4],
                   bedrooms=r[5], size_sqm=r[6], score=round(r[7], 4) if r[7] is not None else None)
        for r in rows
    ]
