-- EC-WA-ALERTS-1 — duty roster and one-send-per-step.
-- Presence is memory on the API, not a table.
-- wa_phone is stored for a later opt-in. This build does not send staff WhatsApp.

ALTER TABLE wa_intake_leads
  ADD COLUMN opened_at timestamptz;

CREATE TABLE wa_alert_roster (
  user_id uuid PRIMARY KEY REFERENCES users(id),
  role text NOT NULL CHECK (role IN ('primary', 'backup', 'owner')),
  days smallint[] NOT NULL,
  start_min smallint NOT NULL,
  end_min smallint NOT NULL,
  email text NOT NULL,
  wa_phone text,
  active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (start_min >= 0 AND start_min < 1440),
  CHECK (end_min > start_min AND end_min <= 1440),
  CHECK (cardinality(days) > 0),
  CHECK (email !~ '[[:cntrl:]]')
);

CREATE TABLE wa_alert_sent (
  lead_id uuid NOT NULL REFERENCES wa_intake_leads(id) ON DELETE CASCADE,
  step text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (lead_id, step)
);

CREATE TABLE wa_alert_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES wa_intake_leads(id) ON DELETE CASCADE,
  step text NOT NULL,
  channel text NOT NULL CHECK (channel IN ('in_app', 'email', 'digest')),
  recipient_user_id uuid,
  sent_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX wa_alert_audit_lead_idx ON wa_alert_audit (lead_id, step);
