-- EC-13: admin portal foundation — audit log, credential docs, DSAR/takedown/identity queues.

-- Append-only admin audit (personal-data reads + decisions with reason).
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id   uuid NOT NULL REFERENCES users(id),
  action          text NOT NULL,
  resource_type   text NOT NULL,
  resource_id     text,
  subject_user_id uuid REFERENCES users(id),
  reason          text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_audit_log_subject_idx
  ON admin_audit_log (subject_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS admin_audit_log_actor_idx
  ON admin_audit_log (actor_user_id, created_at DESC);

COMMENT ON TABLE admin_audit_log IS
  'EC-13: append-only admin portal audit. Application role must not UPDATE/DELETE.';

DO $$
BEGIN
  REVOKE UPDATE, DELETE ON admin_audit_log FROM easycasa;
EXCEPTION
  WHEN undefined_object THEN NULL;
  WHEN invalid_grant_operation THEN NULL;
END $$;

-- Tighten EC-11 authority audit as well.
DO $$
BEGIN
  REVOKE UPDATE, DELETE ON authority_audit_log FROM easycasa;
EXCEPTION
  WHEN undefined_object THEN NULL;
  WHEN invalid_grant_operation THEN NULL;
END $$;

-- Supporting document URL on credentials (ops upload / link).
ALTER TABLE credentials
  ADD COLUMN IF NOT EXISTS document_url text;

COMMENT ON COLUMN credentials.document_url IS
  'EC-13: optional supporting document URL for credential verification.';

-- Identity review (EC-9 manual adapter queue).
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS identity_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS identity_method text;

COMMENT ON COLUMN users.identity_verified_at IS
  'EC-13: set when identity review succeeds (manual / SPID later).';
COMMENT ON COLUMN users.identity_method IS
  'EC-13: e.g. manual | spid | cie.';

CREATE TABLE IF NOT EXISTS identity_review_requests (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_name    text NOT NULL,
  document_url    text NOT NULL,
  status          text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'verified', 'rejected')),
  reject_reason   text,
  decided_at      timestamptz,
  decided_by      uuid REFERENCES users(id),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS identity_review_pending_idx
  ON identity_review_requests (status, created_at ASC)
  WHERE status = 'pending';

COMMENT ON TABLE identity_review_requests IS
  'EC-13: manual identity verification queue; document_url cleared on decision.';

-- DSAR admin queue (email / judged erasure).
CREATE TABLE IF NOT EXISTS dsar_admin_requests (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_user_id uuid REFERENCES users(id),
  subject_email   text NOT NULL,
  request_type    text NOT NULL
                    CHECK (request_type IN ('access', 'erasure', 'rectification', 'objection')),
  status          text NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open', 'in_progress', 'completed', 'rejected')),
  received_at     timestamptz NOT NULL DEFAULT now(),
  deadline_at     timestamptz NOT NULL,
  response_note   text,
  response_sent_at timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS dsar_admin_deadline_idx
  ON dsar_admin_requests (deadline_at ASC)
  WHERE status IN ('open', 'in_progress');

COMMENT ON TABLE dsar_admin_requests IS
  'EC-13: DPO queue for privacy@ requests; statutory deadline = received + 1 month.';

-- DSA listing reports / takedown.
CREATE TABLE IF NOT EXISTS listing_reports (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id      uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  reporter_user_id uuid REFERENCES users(id),
  reporter_email  text,
  category        text NOT NULL,
  free_text       text,
  status          text NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open', 'removed', 'kept', 'more_info')),
  decision_motivation text,
  decided_at      timestamptz,
  decided_by      uuid REFERENCES users(id),
  notified_at     timestamptz,
  contest_received_at timestamptz,
  contest_note    text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS listing_reports_open_idx
  ON listing_reports (status, created_at ASC)
  WHERE status = 'open';

COMMENT ON TABLE listing_reports IS
  'EC-13: DSA listing takedown queue; motivation required on every decision.';
