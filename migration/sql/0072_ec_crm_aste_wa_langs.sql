-- Easy Legenda (Aste) → CRM pipeline + B4A WhatsApp language list on wa_contacts.
-- No debtor / CF / buyer_profile PII in CRM.

ALTER TABLE crm.contacts DROP CONSTRAINT IF EXISTS crm_contacts_source_chk;
ALTER TABLE crm.contacts ADD CONSTRAINT crm_contacts_source_chk CHECK (
  source IN (
    'enquiry', 'manual', 'import', 'b4a_referral', 'partner_intake', 'whatsapp', 'aste'
  )
);

ALTER TABLE crm.activities DROP CONSTRAINT IF EXISTS crm_activity_type_chk;
ALTER TABLE crm.activities ADD CONSTRAINT crm_activity_type_chk CHECK (
  type IN (
    'note', 'call', 'email', 'enquiry_ref', 'viewing_ref',
    'stage_change', 'task_done', 'system', 'whatsapp_in', 'aste_ref'
  )
);

ALTER TABLE wa_contacts DROP CONSTRAINT IF EXISTS wa_contacts_language_chk;
ALTER TABLE wa_contacts ADD CONSTRAINT wa_contacts_language_chk CHECK (
  language IS NULL OR language IN (
    'it', 'en', 'es', 'fr', 'de', 'pt', 'ur', 'hi', 'pa', 'ar'
  )
);

-- Waitlist emails that are not already a CRM contact.
INSERT INTO crm.contacts (full_name, email, locale, source, tags)
SELECT
  split_part(l.email, '@', 1),
  l.email,
  CASE WHEN l.language IN ('en', 'es') THEN l.language ELSE 'it' END,
  'aste',
  ARRAY['easy-legenda', 'aste-waitlist']::text[]
FROM aste_leads l
WHERE l.email IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM crm.contacts c
    WHERE c.deleted_at IS NULL AND lower(c.email) = lower(l.email)
  );

-- Existing contacts: keep source, merge Easy Legenda tags.
UPDATE crm.contacts c
SET tags = ARRAY(
  SELECT DISTINCT t
  FROM unnest(COALESCE(c.tags, ARRAY[]::text[]) || ARRAY['easy-legenda', 'aste-waitlist']) AS t
)
WHERE c.deleted_at IS NULL
  AND EXISTS (
    SELECT 1 FROM aste_leads l WHERE lower(l.email) = lower(c.email)
  )
  AND NOT ('aste-waitlist' = ANY (COALESCE(c.tags, ARRAY[]::text[])));

INSERT INTO crm.seeker_profiles (contact_id, stage, search_intent)
SELECT
  c.id,
  'new_enquiry',
  jsonb_build_object(
    'channel', 'aste',
    'brand', 'easy-legenda',
    'kind', 'waitlist'
  )
FROM crm.contacts c
WHERE 'aste-waitlist' = ANY (c.tags)
  AND NOT EXISTS (
    SELECT 1 FROM crm.seeker_profiles s WHERE s.contact_id = c.id
  );

-- Authenticated analysis users (one contact per user).
INSERT INTO crm.contacts (user_id, full_name, email, phone, locale, source, tags)
SELECT DISTINCT ON (u.id)
  u.id,
  COALESCE(NULLIF(u.display_name, ''), NULLIF(u.email, ''), 'Easy Legenda'),
  u.email,
  u.phone,
  CASE WHEN a.language IN ('en', 'es') THEN a.language ELSE 'it' END,
  'aste',
  ARRAY['easy-legenda', 'aste-analysis']::text[]
FROM aste_analyses a
JOIN users u ON u.id = a.user_id
WHERE NOT EXISTS (
  SELECT 1 FROM crm.contacts c
  WHERE c.deleted_at IS NULL
    AND (c.user_id = u.id OR (u.email IS NOT NULL AND lower(c.email) = lower(u.email)))
)
ORDER BY u.id, a.created_at DESC;

UPDATE crm.contacts c
SET tags = ARRAY(
  SELECT DISTINCT t
  FROM unnest(COALESCE(c.tags, ARRAY[]::text[]) || ARRAY['easy-legenda', 'aste-analysis']) AS t
)
WHERE c.deleted_at IS NULL
  AND EXISTS (
    SELECT 1
    FROM aste_analyses a
    JOIN users u ON u.id = a.user_id
    WHERE c.user_id = u.id
       OR (u.email IS NOT NULL AND lower(c.email) = lower(u.email))
  )
  AND NOT ('aste-analysis' = ANY (COALESCE(c.tags, ARRAY[]::text[])));

INSERT INTO crm.seeker_profiles (contact_id, stage, search_intent)
SELECT
  c.id,
  'new_enquiry',
  jsonb_build_object(
    'channel', 'aste',
    'brand', 'easy-legenda',
    'kind', 'analysis'
  )
FROM crm.contacts c
WHERE 'aste-analysis' = ANY (c.tags)
  AND NOT EXISTS (
    SELECT 1 FROM crm.seeker_profiles s WHERE s.contact_id = c.id
  );
