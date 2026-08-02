-- EC-16 / K EC 8.7: WhatsApp delivery status (no message body content).

CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_message_id  text UNIQUE,
  template_name        text NOT NULL,
  locale               text NOT NULL,
  to_user_id           uuid REFERENCES users(id) ON DELETE SET NULL,
  related_type         text,
  related_id           uuid,
  status               text NOT NULL,
  failure_reason       text,
  sent_at              timestamptz NOT NULL DEFAULT now(),
  status_updated_at    timestamptz
);

CREATE INDEX IF NOT EXISTS whatsapp_messages_related_idx
  ON whatsapp_messages (related_type, related_id);

CREATE INDEX IF NOT EXISTS whatsapp_messages_status_idx
  ON whatsapp_messages (status, sent_at DESC);

COMMENT ON TABLE whatsapp_messages IS
  'EC-16: Cloud send/status audit. Template name + refs only — no message body.';
COMMENT ON COLUMN whatsapp_messages.status IS
  'queued|sent|delivered|read|failed (Meta webhook updates by provider_message_id).';
COMMENT ON COLUMN whatsapp_messages.related_type IS
  'viewing | enquiry | otp';
