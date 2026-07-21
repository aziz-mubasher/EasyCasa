FROM postgis/postgis:16-3.4

# Install pgvector from source. Apt's postgresql-16-pgvector can pull mismatched
# contrib binaries that break pg_trgm (undefined symbol: pg_mblen_unbounded).
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      build-essential \
      ca-certificates \
      git \
      postgresql-server-dev-16 \
 && git clone --depth 1 --branch v0.8.0 https://github.com/pgvector/pgvector.git /tmp/pgvector \
 && make -C /tmp/pgvector \
 && make -C /tmp/pgvector install \
 && rm -rf /tmp/pgvector \
 && apt-get purge -y --auto-remove build-essential git postgresql-server-dev-16 \
 && rm -rf /var/lib/apt/lists/*
