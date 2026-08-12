# PostGIS + pgvector for amd64 and arm64 (Apple Silicon).
#
# Do NOT COPY vector.so from a second image — multi-arch COPY often yields a
# .so that dlopen rejects with "cannot open shared object file" under Docker
# Desktop. Build pgvector from source in this image so the binary matches
# the PostGIS runtime arch.
#
# Avoid apt postgresql-16-pgvector — it can replace contrib libs and break
# pg_trgm (undefined symbol: pg_mblen_unbounded).
FROM postgis/postgis:16-3.4

ARG PGVECTOR_REF=v0.8.0

RUN set -eux; \
  apt-get update; \
  apt-get install -y --no-install-recommends \
    build-essential \
    ca-certificates \
    git \
    postgresql-server-dev-16; \
  git clone --depth 1 --branch "${PGVECTOR_REF}" https://github.com/pgvector/pgvector.git /tmp/pgvector; \
  make -C /tmp/pgvector; \
  make -C /tmp/pgvector install; \
  rm -rf /tmp/pgvector; \
  apt-get purge -y --auto-remove build-essential git postgresql-server-dev-16; \
  rm -rf /var/lib/apt/lists/*
