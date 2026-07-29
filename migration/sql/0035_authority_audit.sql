-- EC-11: append-only authority / personal-data access audit.
-- No UPDATE/DELETE grants for application roles; retain per privacy policy.

CREATE TABLE IF NOT EXISTS authority_audit_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid,
  actor_sub   text,
  subject_user_id uuid,
  resource    text NOT NULL,
  action      text NOT NULL,
  reason      text,
  meta        jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS authority_audit_log_actor_idx
  ON authority_audit_log (actor_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS authority_audit_log_subject_idx
  ON authority_audit_log (subject_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS authority_audit_log_resource_idx
  ON authority_audit_log (resource, created_at DESC);

COMMENT ON TABLE authority_audit_log IS
  'EC-11: append-only audit of admin/personal-data reads and sensitive authz actions.';

-- Revoke delete from typical app role if present (idempotent best-effort).
DO $$
BEGIN
  REVOKE DELETE ON authority_audit_log FROM easycasa;
EXCEPTION
  WHEN undefined_object THEN NULL;
  WHEN invalid_grant_operation THEN NULL;
END $$;
