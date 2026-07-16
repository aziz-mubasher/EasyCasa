from __future__ import annotations

import time
from collections import OrderedDict, defaultdict


class TTLCache:
    """Tiny in-process TTL cache (query embeddings, assistant answers)."""

    def __init__(self, maxsize: int = 512, ttl: float = 300.0) -> None:
        self.maxsize, self.ttl = maxsize, ttl
        self._store: OrderedDict[str, tuple[float, object]] = OrderedDict()

    def get(self, key: str) -> object | None:
        item = self._store.get(key)
        if not item:
            return None
        ts, val = item
        if time.time() - ts > self.ttl:
            self._store.pop(key, None)
            return None
        self._store.move_to_end(key)
        return val

    def set(self, key: str, val: object) -> None:
        self._store[key] = (time.time(), val)
        self._store.move_to_end(key)
        while len(self._store) > self.maxsize:
            self._store.popitem(last=False)


class RateLimiter:
    """Fixed-window per-key limiter for AI endpoints (cost control)."""

    def __init__(self, per_min: int) -> None:
        self.per_min = per_min
        self._hits: dict[str, list[float]] = defaultdict(list)

    def allow(self, key: str) -> bool:
        now = time.time()
        window = [t for t in self._hits[key] if now - t < 60]
        window.append(now)
        self._hits[key] = window
        return len(window) <= self.per_min
