-- EC-S-T26 — listing boost (flat-fee featured placement).
-- Ranking + DSA "In evidenza" label; pause on unpublish preserves remaining time.

CREATE TABLE IF NOT EXISTS listing_boost (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  stripe_payment_ref text,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'cancelled', 'expired')),
  paused_at timestamptz,
  remaining_ms bigint,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS listing_boost_listing_idx ON listing_boost (listing_id);
CREATE INDEX IF NOT EXISTS listing_boost_active_idx
  ON listing_boost (status, ends_at)
  WHERE status = 'active';
