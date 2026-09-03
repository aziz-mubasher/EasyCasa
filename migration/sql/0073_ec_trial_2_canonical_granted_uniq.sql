-- EC-TRIAL-2 — one GRANTED trial per canonical email.
-- Accounts may share a canonical form; they may not share a second free credit.
-- Partial on granted_at so withheld/HOLD rows never collide.
-- Null email_canonical is excluded — the 36 users without email are not covered.
--
-- CONCURRENTLY cannot run inside a transaction. Apply this file with
-- `psql -v ON_ERROR_STOP=1 -f` (autocommit), not a migrator that wraps BEGIN.

CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS aste_trial_grants_email_canonical_granted_uniq
  ON aste_trial_grants (email_canonical)
  WHERE granted_at IS NOT NULL AND email_canonical IS NOT NULL;
