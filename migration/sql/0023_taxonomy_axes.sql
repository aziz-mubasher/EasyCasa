-- Phase: multi-axis property taxonomy (docs/taxonomy.md)
-- Expand transaction_type; add asset_class, financing_options, lease_type, seller_type on listings.
-- Backfill from legacy categories. Keep category_id for URL/API compat.

ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'auction';
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'bare_ownership';

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS asset_class text,
  ADD COLUMN IF NOT EXISTS financing_options text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS lease_type text,
  ADD COLUMN IF NOT EXISTS seller_type text;

CREATE INDEX IF NOT EXISTS idx_listings_asset_class ON listings (asset_class);
CREATE INDEX IF NOT EXISTS idx_listings_seller_type ON listings (seller_type);
CREATE INDEX IF NOT EXISTS idx_listings_lease_type ON listings (lease_type);

-- Backfill axes from legacy categories (key or slug).
UPDATE listings l
   SET asset_class = 'residential',
       condition = COALESCE(NULLIF(l.condition, ''), 'to_renovate')
  FROM categories c
 WHERE l.category_id = c.id
   AND (c.key = 'renovatable' OR c.slug = 'renovatable');

UPDATE listings l
   SET asset_class = COALESCE(l.asset_class, 'residential'),
       financing_options = CASE
         WHEN cardinality(l.financing_options) = 0 THEN ARRAY['rent_to_buy']::text[]
         ELSE l.financing_options
       END
  FROM categories c
 WHERE l.category_id = c.id
   AND (c.key IN ('nib') OR c.slug IN ('new-build'));

UPDATE listings l
   SET asset_class = 'commercial'
  FROM categories c
 WHERE l.category_id = c.id
   AND (c.key = 'commercial' OR c.slug = 'commercial');

UPDATE listings l
   SET transaction_type = 'auction',
       asset_class = COALESCE(l.asset_class, 'residential')
  FROM categories c
 WHERE l.category_id = c.id
   AND (c.key = 'auction' OR c.slug = 'auction');

UPDATE listings l
   SET asset_class = COALESCE(l.asset_class, 'residential'),
       property_type = COALESCE(NULLIF(l.property_type, ''), 'room')
  FROM categories c
 WHERE l.category_id = c.id
   AND (c.key = 'rooms' OR c.slug = 'rooms');

UPDATE listings l
   SET asset_class = COALESCE(l.asset_class, 'residential')
  FROM categories c
 WHERE l.category_id = c.id
   AND (c.key = 'residential' OR c.slug = 'residential');

-- Default remaining published listings without asset_class to residential (pilot inventory).
UPDATE listings
   SET asset_class = 'residential'
 WHERE asset_class IS NULL
   AND status = 'published';

UPDATE listings
   SET seller_type = COALESCE(seller_type, 'private')
 WHERE seller_type IS NULL
   AND status = 'published';
