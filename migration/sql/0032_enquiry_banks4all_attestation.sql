-- EC-1: Banks4All financing attestation cache on enquiries (minimal columns only).
-- Reverse:
--   DROP INDEX IF EXISTS idx_enquiries_b4a_checked;
--   ALTER TABLE enquiries
--     DROP COLUMN IF EXISTS b4a_token,
--     DROP COLUMN IF EXISTS b4a_band_max_cents,
--     DROP COLUMN IF EXISTS b4a_expires_at,
--     DROP COLUMN IF EXISTS b4a_checked_at;

ALTER TABLE enquiries
  ADD COLUMN IF NOT EXISTS b4a_token text,
  ADD COLUMN IF NOT EXISTS b4a_band_max_cents integer,
  ADD COLUMN IF NOT EXISTS b4a_expires_at date,
  ADD COLUMN IF NOT EXISTS b4a_checked_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_enquiries_b4a_checked
  ON enquiries (b4a_checked_at)
  WHERE b4a_token IS NOT NULL;
