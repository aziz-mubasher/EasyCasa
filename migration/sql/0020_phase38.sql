-- Phase 38: GDPR consent ledger (append-only).

CREATE TABLE IF NOT EXISTS consent_records (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose         text NOT NULL,
  granted         boolean NOT NULL,
  policy_version  text NOT NULL,
  ip_hash         text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consent_subject_purpose_created
  ON consent_records (subject_user_id, purpose, created_at DESC);
