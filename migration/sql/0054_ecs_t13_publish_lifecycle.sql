-- EC-S-T13 — publish/unpublish honesty columns + unpublished status.
-- Migration id 0054 (verify tip was 0053 before landing).
--
-- Backfill: first_published_at = published_at for existing rows.
-- Sanity: no historical relist event table exists in this schema; native
-- publish() previously overwrote published_at on every publish, so equality
-- is the best available reconstruction for rows that predate this migration
-- (they have at most one meaningful "first" timestamp stored).

ALTER TYPE listing_status ADD VALUE IF NOT EXISTS 'unpublished';

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS first_published_at timestamptz,
  ADD COLUMN IF NOT EXISTS unpublished_at timestamptz;

UPDATE listings
SET first_published_at = published_at
WHERE first_published_at IS NULL
  AND published_at IS NOT NULL;

-- App-layer + tests enforce immutability; DB trigger as belt-and-suspenders.
CREATE OR REPLACE FUNCTION listings_protect_first_published_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.first_published_at IS NOT NULL
     AND NEW.first_published_at IS DISTINCT FROM OLD.first_published_at THEN
    RAISE EXCEPTION 'listings.first_published_at is immutable once set';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_listings_protect_first_published_at ON listings;
CREATE TRIGGER trg_listings_protect_first_published_at
  BEFORE UPDATE OF first_published_at ON listings
  FOR EACH ROW
  EXECUTE FUNCTION listings_protect_first_published_at();

CREATE INDEX IF NOT EXISTS idx_listings_first_published_at
  ON listings(first_published_at)
  WHERE first_published_at IS NOT NULL;
