-- Phase 27: free AVM — OMI €/m² band cache + valuation-request lead capture.

CREATE TABLE IF NOT EXISTS omi_quotes (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comune             text NOT NULL,
  provincia          text NOT NULL,
  type               text NOT NULL,
  min_per_m2_cents   integer NOT NULL,
  max_per_m2_cents   integer NOT NULL,
  period             text NOT NULL,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_omi_quotes_lookup
  ON omi_quotes (comune, provincia, type, period DESC);

CREATE TABLE IF NOT EXISTS valuation_requests (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid REFERENCES users(id) ON DELETE SET NULL,
  contact_email  text,
  comune         text NOT NULL,
  provincia      text NOT NULL,
  subject        jsonb NOT NULL,
  estimate       jsonb NOT NULL,
  point_cents    integer NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_valuation_requests_user ON valuation_requests (user_id);
CREATE INDEX IF NOT EXISTS idx_valuation_requests_created ON valuation_requests (created_at DESC);
