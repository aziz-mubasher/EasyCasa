-- Extensions: one Postgres does relational + geo + vector + fuzzy text.
CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS postgis;    -- geography/geometry
CREATE EXTENSION IF NOT EXISTS vector;     -- pgvector embeddings
CREATE EXTENSION IF NOT EXISTS pg_trgm;    -- trigram fuzzy search
CREATE EXTENSION IF NOT EXISTS unaccent;   -- accent-insensitive search
