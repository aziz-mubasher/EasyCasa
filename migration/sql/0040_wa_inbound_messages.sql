-- EC-17: thin WhatsApp inbound store (ack + ops forward). No queue / threading.
-- Migration number 0040: main tip was 0038; 0039 claimed by open PR #68 (EC-16).

CREATE TABLE IF NOT EXISTS wa_inbound_messages (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_message_id text        NOT NULL,
  wa_id               text        NOT NULL,
  phone_number_id     text        NOT NULL,
  message_type        text        NOT NULL,
  body                text,
  received_at         timestamptz NOT NULL,
  window_expires_at   timestamptz NOT NULL,
  auto_replied_at     timestamptz,
  forwarded_at        timestamptz,
  forward_error       text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS wa_inbound_messages_provider_message_id_key
  ON wa_inbound_messages (provider_message_id);
CREATE INDEX IF NOT EXISTS wa_inbound_messages_wa_id_received_at_idx
  ON wa_inbound_messages (wa_id, received_at DESC);
CREATE INDEX IF NOT EXISTS wa_inbound_messages_auto_reply_idx
  ON wa_inbound_messages (wa_id, auto_replied_at DESC) WHERE auto_replied_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS wa_inbound_messages_created_at_idx
  ON wa_inbound_messages (created_at);

COMMENT ON TABLE wa_inbound_messages IS
  'EC-17: inbound WhatsApp messages. PII (wa_id + body). Retention default 90d — COUNSEL TO CONFIRM.';
