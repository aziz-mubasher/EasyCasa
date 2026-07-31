-- EC-19b: users.phone_e164 — Meta-style wa_id digits for DSAR match (no '+').
-- Nullable: unparseable phones stay null rather than blocking signup.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS phone_e164 text;

CREATE INDEX IF NOT EXISTS users_phone_e164_idx
  ON users (phone_e164);

COMMENT ON COLUMN users.phone_e164 IS
  'EC-19b: Meta wa_id form (E.164 digits, no +). Populated via toWaId(); nullable.';
