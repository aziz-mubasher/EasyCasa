-- EC-S PK-5 / PK-6 — enquiry thread messages + seller suspend fields.
-- PK-5: T25 seller↔buyer messages on enquiries (content = hosting carve-out per T05 §3.1).
-- PK-6: T19.2 manual suspend UX (LIA accepted — docs/legal/ec-s-t19-2-lia.md).

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS suspended_at timestamptz,
  ADD COLUMN IF NOT EXISTS suspend_reason text;

COMMENT ON COLUMN users.suspended_at IS
  'EC-S-T19.2: set by admin abuse suspend; blocks upload/publish until cleared.';
COMMENT ON COLUMN users.suspend_reason IS
  'EC-S-T19.2: required operator reason at suspend time; cleared on unsuspend.';

CREATE TABLE IF NOT EXISTS enquiry_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enquiry_id uuid NOT NULL REFERENCES enquiries(id) ON DELETE CASCADE,
  sender_user_id uuid NOT NULL REFERENCES users(id),
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);

CREATE INDEX IF NOT EXISTS enquiry_messages_enquiry_created_idx
  ON enquiry_messages (enquiry_id, created_at);

COMMENT ON TABLE enquiry_messages IS
  'EC-S-T25: private-seller enquiry thread replies. Initial enquiry.message is the seed; do not duplicate agency conversations/messages.';
