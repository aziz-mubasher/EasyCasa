-- EC-24 — Aste report: buyer profile + cached translations (OMI check column already exists).
-- Additive only. Applied by ops before ASTE_ANALYSIS_ENABLED.

ALTER TABLE aste_analyses
  ADD COLUMN IF NOT EXISTS buyer_profile jsonb,
  ADD COLUMN IF NOT EXISTS translations jsonb;

COMMENT ON COLUMN aste_analyses.buyer_profile IS
  'EC-24 — optional buyer profile for buyer_readiness (residency, purpose, CF/PEC/financing flags).';
COMMENT ON COLUMN aste_analyses.translations IS
  'EC-24 — cached free-text translations keyed by lang then stable field path; IT source always rendered alongside.';
COMMENT ON COLUMN aste_analyses.omi_check IS
  'EC-24 — deterministic OMI comparison (method zone|comune, range, sconto, warnings).';
