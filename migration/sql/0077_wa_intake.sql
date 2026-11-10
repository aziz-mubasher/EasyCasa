-- EC-WA-INTAKE-1 — scripted WhatsApp intake lead + in-progress state.
-- Also lets the existing journey persist: the live check only allowed
-- auto_ack and operator, so source 'journey' threw after a successful send.

ALTER TABLE wa_contacts
  ADD COLUMN IF NOT EXISTS intake_state jsonb;

ALTER TABLE wa_thread_outbound DROP CONSTRAINT IF EXISTS wa_thread_outbound_source_check;
ALTER TABLE wa_thread_outbound
  ADD CONSTRAINT wa_thread_outbound_source_check
  CHECK (source IN ('auto_ack', 'operator', 'journey', 'intake'));

CREATE TABLE IF NOT EXISTS wa_intake_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wa_id text NOT NULL,
  venture text NOT NULL DEFAULT 'easycasa',
  product text NOT NULL,
  route text NOT NULL,
  locale text NOT NULL,
  answers jsonb NOT NULL,
  media jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL CHECK (status IN ('complete', 'partial')),
  contact_pref text,
  booking_request_id uuid,
  booking_status text,
  disclosure_sent_at timestamptz,
  summary jsonb,
  summary_status text,
  previous_lead_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wa_intake_leads_wa_created_idx
  ON wa_intake_leads (wa_id, created_at DESC);
