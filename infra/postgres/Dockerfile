# PostGIS base + pgvector extension binaries copied from the official
# pgvector image. Avoid apt postgresql-16-pgvector — it can replace contrib
# libs and break pg_trgm (undefined symbol: pg_mblen_unbounded).
#
# Pin both stages to $TARGETPLATFORM so `COPY --from=pgvector` does not pull an
# amd64 vector.so into an arm64 PostGIS image (Apple Silicon / multi-arch).
# That mismatch surfaces as: cannot open shared object file: No such file or directory.
ARG TARGETPLATFORM
FROM --platform=$TARGETPLATFORM pgvector/pgvector:pg16 AS pgvector
FROM --platform=$TARGETPLATFORM postgis/postgis:16-3.4
COPY --from=pgvector /usr/lib/postgresql/16/lib/vector.so /usr/lib/postgresql/16/lib/
COPY --from=pgvector /usr/share/postgresql/16/extension/vector* /usr/share/postgresql/16/extension/
