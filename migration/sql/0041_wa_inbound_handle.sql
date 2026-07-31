-- EC-19a: opaque routing handle for inbound WhatsApp (HMAC of wa_id).
-- Nullable during backfill window; app backfill sets values (no pgcrypto hmac).

ALTER TABLE wa_inbound_messages
  ADD COLUMN IF NOT EXISTS wa_handle text;

CREATE INDEX IF NOT EXISTS wa_inbound_messages_wa_handle_idx
  ON wa_inbound_messages (wa_handle);

COMMENT ON COLUMN wa_inbound_messages.wa_handle IS
  'EC-19a: HMAC-SHA256(wa_id, WA_HANDLE_SECRET) truncated to 128-bit hex. Opaque list/detail routing key.';
