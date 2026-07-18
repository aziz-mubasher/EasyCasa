-- Phase 15: link professionals to auth users; professional role for portal entry.

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'professional';

ALTER TABLE professionals
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES users(id);

CREATE UNIQUE INDEX IF NOT EXISTS professionals_user_id_uidx
  ON professionals (user_id)
  WHERE user_id IS NOT NULL;
