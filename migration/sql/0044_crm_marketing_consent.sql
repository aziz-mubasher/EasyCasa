-- K EC 4.1 v1.1 — link CRM marketing follow-up to existing consent_records (no new consent table).

ALTER TABLE crm.contacts
  ADD COLUMN IF NOT EXISTS marketing_consent_id uuid REFERENCES consent_records(id);

CREATE INDEX IF NOT EXISTS crm_contacts_marketing_consent_idx
  ON crm.contacts (marketing_consent_id)
  WHERE marketing_consent_id IS NOT NULL;

COMMENT ON COLUMN crm.contacts.marketing_consent_id IS
  'FK to consent_records row (purpose=marketing, granted=true) authorizing CRM marketing follow-up beyond Art. 6(1)(b).';
