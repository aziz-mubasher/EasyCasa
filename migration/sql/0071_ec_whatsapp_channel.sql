-- K EC 7.4 / EC-21 — EC WhatsApp channel (B4A-shaped inbox + API Hub + first-contact).
-- Own WABA. CRM source 'whatsapp'. No credit journeys. T04 rows 4/5 only.

ALTER TABLE crm.contacts DROP CONSTRAINT IF EXISTS crm_contacts_source_chk;
ALTER TABLE crm.contacts ADD CONSTRAINT crm_contacts_source_chk CHECK (
  source IN ('enquiry', 'manual', 'import', 'b4a_referral', 'partner_intake', 'whatsapp')
);

ALTER TABLE crm.activities DROP CONSTRAINT IF EXISTS crm_activity_type_chk;
ALTER TABLE crm.activities ADD CONSTRAINT crm_activity_type_chk CHECK (
  type IN (
    'note', 'call', 'email', 'enquiry_ref', 'viewing_ref',
    'stage_change', 'task_done', 'system', 'whatsapp_in'
  )
);

CREATE INDEX IF NOT EXISTS crm_contacts_phone_digits_idx
  ON crm.contacts (phone)
  WHERE phone IS NOT NULL AND deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS wa_contacts (
  wa_id                     text PRIMARY KEY,
  wa_handle                 text,
  language                  text,
  greeting_sent_at          timestamptz,
  last_language_prompt_at   timestamptz,
  last_inbound_at           timestamptz,
  last_casual_prompt_at     timestamptz,
  journey_step              text NOT NULL DEFAULT 'none',
  contact_type              text NOT NULL DEFAULT 'lead',
  blocked_at                timestamptz,
  crm_contact_id            uuid,
  matched_user_id           uuid,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wa_contacts_language_chk CHECK (language IS NULL OR language IN ('it', 'en', 'es')),
  CONSTRAINT wa_contacts_type_chk CHECK (contact_type IN ('lead', 'client')),
  CONSTRAINT wa_contacts_step_chk CHECK (journey_step IN (
    'none', 'language', 'greeted', 'book_viewing', 'search_brief',
    'brief_received', 'open_listings'
  ))
);

CREATE INDEX IF NOT EXISTS wa_contacts_handle_idx ON wa_contacts (wa_handle);
CREATE INDEX IF NOT EXISTS wa_contacts_crm_idx ON wa_contacts (crm_contact_id)
  WHERE crm_contact_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS wa_canned_replies (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title      text NOT NULL,
  body       text NOT NULL,
  locale     text NOT NULL DEFAULT 'it',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wa_canned_locale_chk CHECK (locale IN ('it', 'en', 'es'))
);

CREATE TABLE IF NOT EXISTS wa_thread_notes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wa_id         text NOT NULL,
  wa_handle     text,
  body          text NOT NULL,
  actor_user_id uuid,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wa_thread_notes_wa_id_idx
  ON wa_thread_notes (wa_id, created_at DESC);

INSERT INTO wa_canned_replies (title, body, locale)
SELECT * FROM (VALUES
  (
    'Visita',
    'Per prenotare una visita, indica l''annuncio o la città. Un operatore ti risponderà su WhatsApp.',
    'it'
  ),
  (
    'Ricerca',
    'Scrivi città e fascia di prezzo che stai cercando (preferenza di ricerca, non un''offerta). Un operatore ti risponderà qui.',
    'it'
  ),
  (
    'Portale',
    'Puoi sfogliare gli annunci sul portale EasyCasa: https://easycasaita.com',
    'it'
  )
) AS seed(title, body, locale)
WHERE NOT EXISTS (SELECT 1 FROM wa_canned_replies LIMIT 1);
