-- EC-S-T20 — seller enquiry inbox columns (read + attestation initials).
-- Migration id 0055 (verify tip was 0054).
-- holder_initials stored for row-6 four-field display; expiry still computed at read.

ALTER TABLE enquiries
  ADD COLUMN IF NOT EXISTS read_at timestamptz,
  ADD COLUMN IF NOT EXISTS b4a_holder_initials text,
  ADD COLUMN IF NOT EXISTS b4a_status text
    CHECK (b4a_status IS NULL OR b4a_status IN ('valid', 'revoked'));

CREATE INDEX IF NOT EXISTS idx_enquiries_owner_unread
  ON enquiries(owner_user_id)
  WHERE read_at IS NULL;
