-- EC-23: Aste extraction pipeline — claim/retry columns on aste_analyses.
-- Confirmed free on origin/main immediately before add (highest was 0047_aste_analysis.sql).

ALTER TABLE aste_analyses
  ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS processing_started_at timestamptz;

COMMENT ON COLUMN aste_analyses.attempts IS 'EC-23 — pipeline claim/retry count (max 2 then failed)';
COMMENT ON COLUMN aste_analyses.processing_started_at IS 'EC-23 — when status entered processing (stale recovery)';
