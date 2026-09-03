-- EC-TRIAL-1 Phase 0 — measure free-file duplicates. Log-only: no HOLD/REVIEW enforcement.
-- Production applies this on EasyCasa until Nest cutover.
-- Does NOT add a unique constraint on users.email: two accounts may share a canonical
-- form; they may not have two free credits (enforced in Phase 2, measured here).

CREATE OR REPLACE FUNCTION aste_canonical_email(raw text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  trimmed text;
  local_part text;
  domain text;
  plus_at int;
BEGIN
  IF raw IS NULL OR btrim(raw) = '' THEN
    RETURN NULL;
  END IF;
  trimmed := lower(btrim(raw));
  IF position('@' IN trimmed) < 2 THEN
    RETURN NULL;
  END IF;
  domain := substring(trimmed FROM '@([^@]+)$');
  local_part := substring(trimmed FROM '^(.*)@[^@]+$');
  IF local_part IS NULL OR domain IS NULL OR local_part = '' OR domain = '' THEN
    RETURN NULL;
  END IF;
  plus_at := position('+' IN local_part);
  IF plus_at > 1 THEN
    local_part := left(local_part, plus_at - 1);
  END IF;
  IF domain IN ('gmail.com', 'googlemail.com') THEN
    local_part := replace(local_part, '.', '');
    domain := 'gmail.com';
  END IF;
  RETURN local_part || '@' || domain;
END;
$$;

CREATE TABLE IF NOT EXISTS aste_trial_grants (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email_canonical    text,
  decision           text NOT NULL DEFAULT 'ALLOW',
  score              integer NOT NULL DEFAULT 0,
  reasons            text[] NOT NULL DEFAULT ARRAY[]::text[],
  granted_at         timestamptz,
  credit_id          uuid REFERENCES aste_credit_ledger(id) ON DELETE SET NULL,
  email_verified_at  timestamptz,
  reviewed_by        text,
  reviewed_at        timestamptz,
  overturned         boolean NOT NULL DEFAULT false,
  created_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT aste_trial_grants_user_uniq UNIQUE (user_id),
  CONSTRAINT aste_trial_grants_decision_chk CHECK (decision IN ('ALLOW', 'REVIEW', 'HOLD'))
);

CREATE INDEX IF NOT EXISTS aste_trial_grants_canonical_idx
  ON aste_trial_grants (email_canonical);

CREATE TABLE IF NOT EXISTS aste_abuse_counters (
  bucket_hash  text PRIMARY KEY,
  window_start timestamptz NOT NULL,
  count        integer NOT NULL DEFAULT 1,
  last_seen_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS aste_abuse_salts (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key_id     text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  retired_at timestamptz
);

COMMENT ON TABLE aste_trial_grants IS
  'EC-TRIAL-1: one free-file decision per account. reasons = signal codes only; never a raw IP or domain.';
COMMENT ON TABLE aste_abuse_counters IS
  'EC-TRIAL-1: salted HMAC of an IP bucket. No account id, no email, no raw IP. Drop after 90 days.';
COMMENT ON TABLE aste_abuse_salts IS
  'EC-TRIAL-1: salt rotation log (key id only). HMAC secret stays in the secret store. Rotate every 30 days.';
COMMENT ON FUNCTION aste_canonical_email(text) IS
  'EC-TRIAL-1: uniqueness form only. Never used to send mail or log in.';

-- Backfill existing first_file_free grants. Do not merge accounts.
INSERT INTO aste_trial_grants (
  user_id, email_canonical, decision, score, reasons, granted_at, credit_id, created_at
)
SELECT
  l.user_id,
  aste_canonical_email(u.email),
  'ALLOW',
  0,
  ARRAY[]::text[],
  l.created_at,
  l.id,
  l.created_at
FROM aste_credit_ledger l
JOIN users u ON u.id = l.user_id
WHERE l.reason = 'first_file_free'
ON CONFLICT (user_id) DO NOTHING;

DO $$
DECLARE
  accounts int;
  distinct_canonical int;
  collision_accounts int;
BEGIN
  SELECT count(*), count(DISTINCT aste_canonical_email(email))
    INTO accounts, distinct_canonical
  FROM users
  WHERE email IS NOT NULL AND email <> '';

  SELECT count(*)
    INTO collision_accounts
  FROM (
    SELECT aste_canonical_email(email) AS c
    FROM users
    WHERE email IS NOT NULL AND email <> ''
    GROUP BY 1
    HAVING count(*) > 1
  ) collisions;

  RAISE NOTICE 'EC-TRIAL-1 backfill: accounts_with_email=%, distinct_canonical=%, collision_groups=% (not merged)',
    accounts, distinct_canonical, collision_accounts;
END;
$$;
