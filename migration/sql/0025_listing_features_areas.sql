-- Listing characteristics, dual area fields, multi transaction types, year renovated.
-- surface_sqm = surface area; size_sqm remains built area.
-- transaction_types allows sale+rent (and other combos); transaction_type stays primary.

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS surface_sqm numeric(12,2),
  ADD COLUMN IF NOT EXISTS year_renovated int,
  ADD COLUMN IF NOT EXISTS transaction_types text[] NOT NULL DEFAULT '{}';

UPDATE listings
   SET transaction_types = ARRAY[transaction_type::text]
 WHERE transaction_type IS NOT NULL
   AND cardinality(transaction_types) = 0;

CREATE INDEX IF NOT EXISTS idx_listings_features ON listings USING GIN (features);
CREATE INDEX IF NOT EXISTS idx_listings_transaction_types ON listings USING GIN (transaction_types);
