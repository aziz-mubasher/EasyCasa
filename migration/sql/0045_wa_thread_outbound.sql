-- EC WhatsApp: contact display name on inbound + outbound thread bodies (auto-ack / operator).

ALTER TABLE wa_inbound_messages
  ADD COLUMN IF NOT EXISTS contact_name text;

COMMENT ON COLUMN wa_inbound_messages.contact_name IS
  'Meta contacts[].profile.name from the inbound webhook payload (nullable).';

CREATE TABLE IF NOT EXISTS wa_thread_outbound (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wa_id               text        NOT NULL,
  wa_handle           text,
  provider_message_id text,
  body                text        NOT NULL,
  source              text        NOT NULL
    CHECK (source IN ('auto_ack', 'operator')),
  actor_user_id       uuid,
  sent_at             timestamptz NOT NULL DEFAULT now(),
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS wa_thread_outbound_provider_message_id_key
  ON wa_thread_outbound (provider_message_id)
  WHERE provider_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS wa_thread_outbound_wa_id_sent_at_idx
  ON wa_thread_outbound (wa_id, sent_at ASC);

COMMENT ON TABLE wa_thread_outbound IS
  'EC WhatsApp: outbound free-form bodies for the admin thread (auto-ack + operator). PII.';
