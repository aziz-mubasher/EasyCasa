-- EC-12: phone verification after OIDC login (WhatsApp OTP / email fallback).

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS phone_verified_at timestamptz;

COMMENT ON COLUMN users.phone_verified_at IS
  'EC-12: set when WhatsApp (or email fallback) OTP succeeds; owner trust signal.';

CREATE TABLE IF NOT EXISTS phone_otp_challenges (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  phone_e164    text NOT NULL,
  code_hash     text NOT NULL,
  channel       text NOT NULL CHECK (channel IN ('whatsapp', 'email')),
  attempts      integer NOT NULL DEFAULT 0,
  max_attempts  integer NOT NULL DEFAULT 3,
  expires_at    timestamptz NOT NULL,
  consumed_at   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS phone_otp_challenges_user_idx
  ON phone_otp_challenges (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS phone_otp_challenges_phone_idx
  ON phone_otp_challenges (phone_e164, created_at DESC);

COMMENT ON TABLE phone_otp_challenges IS
  'EC-12: hashed single-use OTP for phone verification; expire 10 min.';
