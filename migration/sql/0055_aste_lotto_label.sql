-- EC-23b: user-selected lot label for multi-lot dossiers (schema v2 lot scoping).
-- Confirmed free on origin/main immediately before add (highest was 0054_ecs_t13_publish_lifecycle.sql).

ALTER TABLE aste_analyses
  ADD COLUMN IF NOT EXISTS lotto_label text;

COMMENT ON COLUMN aste_analyses.lotto_label IS
  'EC-23b — user intent lot selector (NULL = unico/only lot). Distinct from denormalized lotto (extracted).';
