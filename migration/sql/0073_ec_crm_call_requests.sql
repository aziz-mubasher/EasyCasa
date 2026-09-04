-- Public "book a call" share links → CRM source + scheduled task.
-- T04 rows 4/5 analogue (callback request). No offer / proposta fields.

ALTER TABLE crm.contacts DROP CONSTRAINT IF EXISTS crm_contacts_source_chk;
ALTER TABLE crm.contacts ADD CONSTRAINT crm_contacts_source_chk CHECK (
  source IN (
    'enquiry', 'manual', 'import', 'b4a_referral', 'partner_intake',
    'whatsapp', 'aste', 'call_request'
  )
);

COMMENT ON CONSTRAINT crm_contacts_source_chk ON crm.contacts IS
  'call_request = public /prenota-chiamata form (province + reason)';
