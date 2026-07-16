from psycopg_pool import ConnectionPool

from .settings import get_settings

_pool: ConnectionPool | None = None


def get_pool() -> ConnectionPool:
    """Lazily-opened connection pool (so importing the app never hits the DB)."""
    global _pool
    if _pool is None:
        _pool = ConnectionPool(conninfo=get_settings().DATABASE_URL, min_size=1, max_size=8, open=True)
    return _pool


def vector_literal(vec: list[float]) -> str:
    """pgvector text literal: [0.1,0.2,...] — bind as text and cast ::vector in SQL."""
    return "[" + ",".join(f"{x:.6f}" for x in vec) + "]"
