"""Saved-search alerts worker.

Periodically finds listings published since the last run that match each saved
search, inserts an in-app notification, and fans out Expo push to registered
devices (Phase 7). Run via cron or as a long-lived loop.
"""
from __future__ import annotations

import json
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone

sys.path.insert(0, ".")
from app.db import get_pool  # noqa: E402

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


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


def _device_tokens(user_id: str) -> list[str]:
    with get_pool().connection() as conn:
        rows = conn.execute(
            "SELECT token FROM devices WHERE user_id = %s::uuid AND platform IN ('ios','android')",
            [user_id],
        ).fetchall()
    return [r[0] for r in rows]


def _send_expo_push(tokens: list[str], title: str, body: str, data: dict) -> None:
    """Batch Expo push; drop DeviceNotRegistered tokens."""
    if not tokens:
        return
    for i in range(0, len(tokens), 100):
        batch = tokens[i : i + 100]
        messages = [
            {
                "to": t,
                "sound": "default",
                "title": title,
                "body": body,
                "data": data,
            }
            for t in batch
        ]
        req = urllib.request.Request(
            EXPO_PUSH_URL,
            data=json.dumps(messages).encode("utf-8"),
            headers={"Content-Type": "application/json", "Accept": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=20) as res:
                payload = json.loads(res.read().decode("utf-8"))
        except urllib.error.URLError as e:
            print(f"[alert] expo push failed: {e}")
            continue

        # Drop dead tokens
        tickets = payload.get("data") or []
        dead: list[str] = []
        for token, ticket in zip(batch, tickets):
            if isinstance(ticket, dict) and ticket.get("status") == "error":
                details = ticket.get("details") or {}
                if details.get("error") == "DeviceNotRegistered":
                    dead.append(token)
        if dead:
            with get_pool().connection() as conn:
                conn.execute("DELETE FROM devices WHERE token = ANY(%s)", [dead])
                conn.commit()
            print(f"[alert] dropped {len(dead)} DeviceNotRegistered tokens")


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
            tokens = _device_tokens(user_id)
            _send_expo_push(
                tokens,
                title="EasyCasa",
                body=f"{count} nuovi annunci per «{name}»",
                data={"type": "saved_search", "searchId": sid, "count": count},
            )
            print(
                f"[alert] user={user_id} search='{name}' new_matches={count} "
                f"-> notification + {len(tokens)} push"
            )
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
