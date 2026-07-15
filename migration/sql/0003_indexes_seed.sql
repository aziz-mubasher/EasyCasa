-- Geospatial + query indexes
CREATE INDEX IF NOT EXISTS idx_listings_location ON listings USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_listings_category ON listings (category_id);
CREATE INDEX IF NOT EXISTS idx_listings_region   ON listings (region_id);
CREATE INDEX IF NOT EXISTS idx_listings_status   ON listings (status);
CREATE INDEX IF NOT EXISTS idx_listings_price     ON listings (price);
CREATE INDEX IF NOT EXISTS idx_listings_txn       ON listings (transaction_type);
CREATE INDEX IF NOT EXISTS idx_listings_title_trgm ON listings USING GIN (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_media_listing      ON media (listing_id);
-- Vector index added in Phase 4 once embeddings are populated:
-- CREATE INDEX idx_listings_embedding ON listings USING hnsw (embedding vector_cosine_ops);

-- Seed the six EasyCasa categories (idempotent).
INSERT INTO categories (key, name, slug) VALUES
  ('residential', 'Residential', 'residential'),
  ('renovatable', 'Renovatable', 'renovatable'),
  ('nib',         'New Build (NIB)', 'new-build'),
  ('commercial',  'Commercial', 'commercial'),
  ('auction',     'Auction', 'auction'),
  ('rooms',       'Rooms', 'rooms')
ON CONFLICT (key) DO NOTHING;

-- Seed the 20 Italian regions (idempotent). Boundaries can be added later.
INSERT INTO regions (name, slug) VALUES
  ('Abruzzo','abruzzo'), ('Basilicata','basilicata'), ('Calabria','calabria'),
  ('Campania','campania'), ('Emilia-Romagna','emilia-romagna'),
  ('Friuli-Venezia Giulia','friuli-venezia-giulia'), ('Lazio','lazio'),
  ('Liguria','liguria'), ('Lombardia','lombardia'), ('Marche','marche'),
  ('Molise','molise'), ('Piemonte','piemonte'), ('Puglia','puglia'),
  ('Sardegna','sardegna'), ('Sicilia','sicilia'), ('Toscana','toscana'),
  ('Trentino-Alto Adige','trentino-alto-adige'), ('Umbria','umbria'),
  ('Valle d''Aosta','valle-d-aosta'), ('Veneto','veneto')
ON CONFLICT (slug) DO NOTHING;
