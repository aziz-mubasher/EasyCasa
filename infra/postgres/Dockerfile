# PostGIS base + pgvector extension binaries copied from the official
# pgvector image. Avoid apt postgresql-16-pgvector — it can replace contrib
# libs and break pg_trgm (undefined symbol: pg_mblen_unbounded).
FROM pgvector/pgvector:pg16 AS pgvector
FROM postgis/postgis:16-3.4
COPY --from=pgvector /usr/lib/postgresql/16/lib/vector.so /usr/lib/postgresql/16/lib/
COPY --from=pgvector /usr/share/postgresql/16/extension/vector* /usr/share/postgresql/16/extension/
