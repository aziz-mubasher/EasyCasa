-- Phase 21: listing-detail fields (APE performance, catastal, fees, property type).

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS total_floors integer,
  ADD COLUMN IF NOT EXISTS energy_performance_kwh_m2_y numeric(10, 2),
  ADD COLUMN IF NOT EXISTS foglio text,
  ADD COLUMN IF NOT EXISTS particella text,
  ADD COLUMN IF NOT EXISTS subalterno text,
  ADD COLUMN IF NOT EXISTS condominio_fees_cents integer,
  ADD COLUMN IF NOT EXISTS heating text,
  ADD COLUMN IF NOT EXISTS property_type text,
  ADD COLUMN IF NOT EXISTS has_floor_plan boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_listings_similar
  ON listings (province, transaction_type, property_type, status);
