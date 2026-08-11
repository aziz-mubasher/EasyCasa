-- EC-S-T30 — seller informativa acceptance ledger (append-only).
-- `seller_profile.informativa_version_accepted` remains the current pointer;
-- this table is the Art. 7 evidence trail of every acceptance event.

CREATE TABLE IF NOT EXISTS consent_acceptance_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  policy_version text NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT consent_acceptance_log_version_nonempty
    CHECK (policy_version <> '')
);

CREATE INDEX IF NOT EXISTS consent_acceptance_log_user_accepted_idx
  ON consent_acceptance_log (user_id, accepted_at DESC);

COMMENT ON TABLE consent_acceptance_log IS
  'EC-S-T30 append-only seller informativa acceptance ledger. Pointer stays on seller_profile.';
