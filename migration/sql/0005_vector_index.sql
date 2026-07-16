-- Approximate-nearest-neighbour index for pgvector cosine distance.
-- Create AFTER embeddings are populated (Phase 4 reindex) for a faster build.
CREATE INDEX IF NOT EXISTS idx_listings_embedding
  ON listings USING hnsw (embedding vector_cosine_ops);
