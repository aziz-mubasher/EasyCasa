"""Saved-search alerts worker.

Periodically finds listings published since the last run that match each saved
search, and enqueues a notification. Email/push delivery is stubbed — wire it to
the API's notification system (Phase 5). Run via cron or as a long-lived loop.
"""
from __future__ import annotations

import json
import sys
import time
from datetime import datetime, timedelta, timezone

sys.path.insert(0, ".")
from app.db import get_pool  # noqa: E402


def _matches_since(query: dict, since: datetime) -> int:
    conds = ["status = 'published'", "published_at > %s"]
    params: list[object] = [since]
    if query.get("transactionType"):
        conds.append("transaction_type = %s")
        params.append(query["transactionType"])
    if query.get("maxPrice"):
        conds.append("price <= %s")
        params.append(query["maxPrice"])
    if query.get("minBedrooms"):
        conds.append("bedrooms >= %s")
        params.append(query["minBedrooms"])
    if query.get("regionSlug"):
        conds.append("region_id = (SELECT id FROM regions WHERE slug = %s)")
        params.append(query["regionSlug"])
    sql = f"SELECT count(*) FROM listings WHERE {' AND '.join(conds)}"
    with get_pool().connection() as conn:
        return int(conn.execute(sql, params).fetchone()[0])


def run_once(window_minutes: int = 60) -> int:
    since = datetime.now(timezone.utc) - timedelta(minutes=window_minutes)
    notified = 0
    with get_pool().connection() as conn:
        searches = conn.execute(
            "SELECT id::text, user_id::text, name, query FROM saved_searches WHERE notify = true"
        ).fetchall()
    for sid, user_id, name, query in searches:
        q = query if isinstance(query, dict) else json.loads(query or "{}")
        count = _matches_since(q, since)
        if count > 0:
            with get_pool().connection() as conn:
                conn.execute(
                    """INSERT INTO notifications (user_id, type, channel, payload, status)
                       VALUES (%s, 'saved_search', 'in_app', %s::jsonb, 'sent')""",
                    [user_id, json.dumps({"search": name, "new_matches": count})],
                )
                conn.commit()
            print(f"[alert] user={user_id} search='{name}' new_matches={count} -> notification created")
            notified += 1
    return notified


if __name__ == "__main__":
    loop = "--loop" in sys.argv
    while True:
        n = run_once()
        print(f"alerts run complete — {n} searches notified")
        if not loop:
            break
        time.sleep(3600)
