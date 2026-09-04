-- Operator canned replies: add Urdu + Hindi to the five desk languages.
-- Built-in session templates live in @easycasa/shared (inbox chips).
-- T04 rows 4–5 — no offer / proposta fields.

ALTER TABLE wa_canned_replies DROP CONSTRAINT IF EXISTS wa_canned_locale_chk;
ALTER TABLE wa_canned_replies ADD CONSTRAINT wa_canned_locale_chk CHECK (
  locale IN ('it', 'en', 'es', 'ur', 'hi')
);

COMMENT ON CONSTRAINT wa_canned_locale_chk ON wa_canned_replies IS
  'Desk languages for operator canned + inbox chips: it en es ur hi';
