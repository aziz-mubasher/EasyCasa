-- Phase 31: service_orders may root on a Property (owner) OR a Listing (buyer).
-- Resolves the Phase 26 bridge tension: buyer orders must not invent a fascicolo.

ALTER TABLE service_orders
  ALTER COLUMN property_id DROP NOT NULL;

ALTER TABLE service_orders
  ADD COLUMN IF NOT EXISTS listing_id uuid REFERENCES listings(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS service_orders_listing_idx ON service_orders (listing_id);

-- At least one subject root (owner property and/or published listing).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'service_orders_subject_chk'
  ) THEN
    ALTER TABLE service_orders
      ADD CONSTRAINT service_orders_subject_chk
      CHECK (property_id IS NOT NULL OR listing_id IS NOT NULL);
  END IF;
END $$;
