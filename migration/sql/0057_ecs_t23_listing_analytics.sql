-- EC-S-T23 — seller listing analytics (aggregates non-personal).
-- T05 Layer 1: behavioural metrics for own-listing analytics (Art. 6(1)(b)).
-- Raw visitor events (if introduced later) retain 14m; this table stores only
-- day-bucketed counts with no visitor identifiers (aggregates-non-personal).

CREATE TABLE IF NOT EXISTS listing_analytics_daily (
  listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  day date NOT NULL,
  views integer NOT NULL DEFAULT 0,
  saves integer NOT NULL DEFAULT 0,
  enquiries integer NOT NULL DEFAULT 0,
  PRIMARY KEY (listing_id, day)
);

CREATE INDEX IF NOT EXISTS listing_analytics_daily_day_idx
  ON listing_analytics_daily (day);

-- Windowed favorites count for seller analytics (saves in period).
CREATE INDEX IF NOT EXISTS favorites_listing_created_idx
  ON favorites (listing_id, created_at);

-- Enquiries already keyed by listing_id; add created_at for window scans.
CREATE INDEX IF NOT EXISTS enquiries_listing_created_idx
  ON enquiries (listing_id, created_at);
