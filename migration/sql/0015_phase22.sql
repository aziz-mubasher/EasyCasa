-- Phase 22: saved-search alert frequency + dedup log.
-- Reuses existing saved_searches.query as Phase 20 criteria JSON.

ALTER TABLE saved_searches
  ADD COLUMN IF NOT EXISTS frequency text NOT NULL DEFAULT 'instant',
  ADD COLUMN IF NOT EXISTS last_run_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Migrate legacy notify=false → frequency off
UPDATE saved_searches SET frequency = 'off' WHERE notify = false AND frequency = 'instant';

CREATE INDEX IF NOT EXISTS idx_saved_searches_frequency ON saved_searches (frequency);

CREATE TABLE IF NOT EXISTS alert_logs (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  saved_search_id  uuid NOT NULL REFERENCES saved_searches(id) ON DELETE CASCADE,
  listing_id       uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  sent_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (saved_search_id, listing_id)
);

CREATE INDEX IF NOT EXISTS idx_alert_logs_saved_search ON alert_logs (saved_search_id);
