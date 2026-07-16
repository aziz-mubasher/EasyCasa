-- Phase 7: push device registration for the universal app.
CREATE TABLE IF NOT EXISTS devices (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token         text NOT NULL,
  platform      text NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  locale        text NOT NULL DEFAULT 'it',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, token)
);

CREATE INDEX IF NOT EXISTS devices_user_idx ON devices (user_id);
