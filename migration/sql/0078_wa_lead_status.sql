-- EC-WA-INTAKE-2 — pipeline status on wa_intake_leads.
-- 0077 already used `status` for complete|partial. That column is renamed
-- intake_status so `status` can be the consultant pipeline.

ALTER TABLE wa_intake_leads RENAME COLUMN status TO intake_status;

ALTER TABLE wa_intake_leads
  ADD COLUMN status text NOT NULL DEFAULT 'new',
  ADD COLUMN owner_user_id uuid REFERENCES users(id),
  ADD COLUMN crm_contact_id uuid REFERENCES crm.contacts(id),
  ADD COLUMN contacted_at timestamptz,
  ADD COLUMN closed_reason text,
  ADD COLUMN closed_at timestamptz,
  ADD COLUMN assigned_at timestamptz,
  ADD COLUMN assign_alerted_at timestamptz,
  ADD COLUMN window_alerted_at timestamptz;

ALTER TABLE wa_intake_leads
  ADD CONSTRAINT wa_intake_leads_status_chk
  CHECK (status IN ('new', 'assigned', 'contacted', 'closed'));

ALTER TABLE wa_intake_leads
  ADD CONSTRAINT wa_intake_leads_closed_reason_chk
  CHECK (
    (status = 'closed' AND closed_reason IN ('no_reply', 'not_our_service', 'handed_to_professional', 'completed') AND closed_at IS NOT NULL)
    OR (status <> 'closed' AND closed_reason IS NULL)
  );

ALTER TABLE wa_contacts
  ADD COLUMN IF NOT EXISTS consultant_replied_at timestamptz;

ALTER TABLE wa_thread_outbound
  ADD COLUMN IF NOT EXISTS original_body text,
  ADD COLUMN IF NOT EXISTS machine_translated boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS template_name text,
  ADD COLUMN IF NOT EXISTS window_open boolean;
