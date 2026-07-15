FROM postgis/postgis:16-3.4
# Add pgvector on top of the PostGIS image (both extensions in one DB).
RUN apt-get update \
 && apt-get install -y --no-install-recommends postgresql-16-pgvector \
 && rm -rf /var/lib/apt/lists/*
