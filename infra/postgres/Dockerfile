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
# Pin Debian indexes. deb.debian.org/security regularly 404s mid-transition
# (libssl1.1_1.1.1w-0+deb11u8 vanished from Fastly while Packages still listed it).
ARG DEBIAN_SNAPSHOT=20260801T000000Z

RUN set -eux; \
  . /etc/os-release; \
  echo 'Acquire::Check-Valid-Until "false";' > /etc/apt/apt.conf.d/99snapshot; \
  echo 'Acquire::Retries "5";' > /etc/apt/apt.conf.d/80retries; \
  rm -f /etc/apt/sources.list.d/*; \
  printf '%s\n' \
    "deb [check-valid-until=no] http://snapshot.debian.org/archive/debian/${DEBIAN_SNAPSHOT} ${VERSION_CODENAME} main" \
    "deb [check-valid-until=no] http://snapshot.debian.org/archive/debian-security/${DEBIAN_SNAPSHOT} ${VERSION_CODENAME}-security main" \
    > /etc/apt/sources.list; \
  apt_ok=0; \
  for i in 1 2 3 4 5; do \
    apt-get update; \
    if apt-get install -y --no-install-recommends --fix-missing \
        build-essential \
        ca-certificates \
        git \
        postgresql-server-dev-16; then \
      apt_ok=1; \
      break; \
    fi; \
    echo "apt install failed (attempt ${i}); retrying"; \
    sleep $((i * 4)); \
  done; \
  test "${apt_ok}" = 1; \
  git clone --depth 1 --branch "${PGVECTOR_REF}" https://github.com/pgvector/pgvector.git /tmp/pgvector; \
  make -C /tmp/pgvector OPTFLAGS="" with_llvm=no; \
  make -C /tmp/pgvector OPTFLAGS="" with_llvm=no install; \
  rm -rf /tmp/pgvector; \
  apt-get purge -y --auto-remove build-essential git postgresql-server-dev-16; \
  rm -rf /var/lib/apt/lists/*
