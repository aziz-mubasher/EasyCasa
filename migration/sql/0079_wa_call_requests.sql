-- EC-WA-INTAKE-2 — WhatsApp call requests. The public /prenota-chiamata
-- form and its CRM task stay as they are. A WhatsApp request also creates
-- that task so #crm Tasks still shows it.

CREATE TABLE IF NOT EXISTS wa_call_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES wa_intake_leads(id),
  crm_task_id uuid REFERENCES crm.tasks(id),
  customer_preference text,
  requested_slot timestamptz,
  offered_slot timestamptz,
  duration_min integer NOT NULL DEFAULT 15,
  call_language text NOT NULL DEFAULT 'it',
  status text NOT NULL DEFAULT 'requested',
  decided_by uuid REFERENCES users(id),
  decided_at timestamptz,
  reminder_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wa_call_requests_duration_chk CHECK (duration_min = 15),
  CONSTRAINT wa_call_requests_language_chk CHECK (call_language IN ('it', 'en', 'es', 'hi', 'ur', 'pa', 'bn', 'ar')),
  CONSTRAINT wa_call_requests_status_chk CHECK (
    status IN ('requested', 'confirmed', 'offered_other', 'done', 'cancelled', 'no_show')
  )
);

CREATE INDEX IF NOT EXISTS wa_call_requests_lead_idx ON wa_call_requests (lead_id);
CREATE INDEX IF NOT EXISTS wa_call_requests_slot_idx
  ON wa_call_requests (status, requested_slot)
  WHERE reminder_sent_at IS NULL;
