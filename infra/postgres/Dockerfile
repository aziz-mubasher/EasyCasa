# PostGIS base + pgvector extension binaries copied from the official
# pgvector image. Avoid apt postgresql-16-pgvector — it can replace contrib
# libs and break pg_trgm (undefined symbol: pg_mblen_unbounded).
#
# Use the built-in TARGETPLATFORM on both FROM lines (do NOT redeclare
# `ARG TARGETPLATFORM` with an empty default — that clears the automatic
# value and breaks multi-arch COPY). Same-arch COPY avoids Apple Silicon
# dlopen failures: "cannot open shared object file: No such file or directory".
FROM --platform=$TARGETPLATFORM pgvector/pgvector:pg16 AS pgvector
FROM --platform=$TARGETPLATFORM postgis/postgis:16-3.4
COPY --from=pgvector /usr/lib/postgresql/16/lib/vector.so /usr/lib/postgresql/16/lib/
COPY --from=pgvector /usr/share/postgresql/16/extension/vector* /usr/share/postgresql/16/extension/
