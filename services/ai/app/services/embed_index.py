from __future__ import annotations

from ..db import get_pool, vector_literal
from ..providers.embeddings import get_embedder


def _text_for(row: tuple) -> str:
    title, desc, city, cat, region = row[1], row[2], row[3], row[4], row[5]
    return " ".join(str(x) for x in [title, city, region, cat, desc] if x)


def reindex(batch: int = 128, only_missing: bool = True) -> int:
    """Generate + store embeddings for listings. Idempotent; run after ETL and on changes."""
    embedder = get_embedder()
    where = "WHERE embedding IS NULL" if only_missing else ""
    sql = f"""
        SELECT l.id::text, l.title, l.description, l.city,
               c.name AS category, r.name AS region
          FROM listings l
          LEFT JOIN categories c ON c.id = l.category_id
          LEFT JOIN regions r ON r.id = l.region_id
          {where}
    """
    done = 0
    with get_pool().connection() as conn:
        rows = conn.execute(sql).fetchall()
        for i in range(0, len(rows), batch):
            chunk = rows[i : i + batch]
            vectors = embedder.embed([_text_for(r) for r in chunk])
            with conn.cursor() as cur:
                for r, vec in zip(chunk, vectors):
                    cur.execute(
                        "UPDATE listings SET embedding = %s::vector WHERE id = %s",
                        [vector_literal(vec), r[0]],
                    )
            conn.commit()
            done += len(chunk)
    return done


if __name__ == "__main__":
    n = reindex()
    print(f"embedded {n} listings")
