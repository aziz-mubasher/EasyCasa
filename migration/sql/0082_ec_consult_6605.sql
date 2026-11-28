-- EC-CONSULT-TEXT-1.B — 6605 webhook store + text callbacks (dry-run until flags on).

CREATE SCHEMA IF NOT EXISTS ec_consult;

CREATE TABLE ec_consult.kb_snapshots (
  doc_id text PRIMARY KEY,
  content_hash text NOT NULL,
  content_text text NOT NULL,
  updated_at_unix bigint NOT NULL DEFAULT 0,
  synced_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE ec_consult.contact_state (
  wa_id text PRIMARY KEY,
  language text,
  first_contact_step text NOT NULL DEFAULT 'none',
  menu_miss_count integer NOT NULL DEFAULT 0,
  last_route text,
  window_started_at timestamptz,
  opt_out boolean NOT NULL DEFAULT false,
  ai_paused_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE ec_consult.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wa_id text NOT NULL,
  direction text NOT NULL CHECK (direction IN ('in', 'out')),
  author text NOT NULL CHECK (author IN ('customer', 'ai', 'human')),
  body text NOT NULL DEFAULT '',
  provider_message_id text UNIQUE,
  phone_number_id text NOT NULL DEFAULT '1448737268325965',
  message_type text NOT NULL DEFAULT 'text',
  received_at timestamptz NOT NULL DEFAULT now(),
  dry_run_logged boolean NOT NULL DEFAULT false
);

CREATE INDEX ec_consult_messages_wa_idx ON ec_consult.messages (wa_id, received_at DESC);

ALTER TABLE crm.contacts DROP CONSTRAINT IF EXISTS crm_contacts_source_chk;
ALTER TABLE crm.contacts ADD CONSTRAINT crm_contacts_source_chk CHECK (
  source IN (
    'enquiry', 'manual', 'import', 'b4a_referral', 'partner_intake',
    'whatsapp', 'aste', 'call_request', 'whatsapp_voice', 'whatsapp_text'
  )
);

ALTER TABLE crm.voice_calls
  ADD COLUMN IF NOT EXISTS ingest_source text NOT NULL DEFAULT 'whatsapp_voice';

ALTER TABLE crm.callback_requests
  ALTER COLUMN voice_call_id DROP NOT NULL;

ALTER TABLE crm.callback_requests
  ADD COLUMN IF NOT EXISTS ingest_source text NOT NULL DEFAULT 'whatsapp_voice';

ALTER TABLE crm.callback_requests
  ADD COLUMN IF NOT EXISTS whatsapp_wa_id text NOT NULL DEFAULT '';