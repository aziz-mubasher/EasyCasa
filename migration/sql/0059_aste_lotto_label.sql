-- EC-23b: user-selected lot label for multi-lot dossiers (schema v2 lot scoping).
-- Renumbered from 0055 → 0059 after ECS concurrently shipped 0055_ecs_t20_enquiry_inbox.sql on main.
-- Column already applied on VPS as 0055_aste; IF NOT EXISTS keeps re-apply safe.

ALTER TABLE aste_analyses
  ADD COLUMN IF NOT EXISTS lotto_label text;

COMMENT ON COLUMN aste_analyses.lotto_label IS
  'EC-23b — user intent lot selector (NULL = unico/only lot). Distinct from denormalized lotto (extracted).';
