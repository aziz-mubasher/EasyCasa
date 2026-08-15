-- EC-36 — tag preview-mode analyses for purge before public G2 flip.
ALTER TABLE aste_analyses
  ADD COLUMN IF NOT EXISTS internal_preview boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS aste_analyses_internal_preview_idx
  ON aste_analyses (internal_preview)
  WHERE internal_preview = true;

COMMENT ON COLUMN aste_analyses.internal_preview IS
  'EC-36: true when created during ASTE_INTERNAL_PREVIEW (public flag off). Purge before G2.';
