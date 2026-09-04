# PostGIS + pgvector for amd64 and arm64 (Apple Silicon).
#
# Build pgvector from source so the .so matches the image arch.
# Avoid apt postgresql-16-pgvector — it can break pg_trgm.
#
# Pin FROM to TARGETPLATFORM so Docker Desktop does not reuse a cached
# linux/amd64 postgis layer when building linux/arm64. Default so
# testcontainers (no BuildKit TARGETPLATFORM) still builds on CI.
ARG TARGETPLATFORM=linux/amd64
FROM --platform=$TARGETPLATFORM postgis/postgis:16-3.4

ARG PGVECTOR_REF=v0.8.0

RUN set -eux; \
  apt-get update; \
  apt-get install -y --no-install-recommends \
    build-essential \
    ca-certificates \
    git \
    postgresql-server-dev-16; \
  git clone --depth 1 --branch "${PGVECTOR_REF}" https://github.com/pgvector/pgvector.git /tmp/pgvector; \
  make -C /tmp/pgvector OPTFLAGS="" with_llvm=no; \
  make -C /tmp/pgvector OPTFLAGS="" with_llvm=no install; \
  rm -rf /tmp/pgvector; \
  apt-get purge -y --auto-remove build-essential git postgresql-server-dev-16; \
  rm -rf /var/lib/apt/lists/*
