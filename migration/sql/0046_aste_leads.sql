-- EC-21: Aste landing lead magnet — email capture for guide + early-access waitlist.
-- Confirmed free on origin/main immediately before add (highest was 0045_wa_thread_outbound.sql).

CREATE TABLE IF NOT EXISTS aste_leads (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email        text NOT NULL,
  language     text NOT NULL,
  province     text,
  buyer_type   text,
  consent      boolean NOT NULL,
  locale       text NOT NULL,
  guide_token  text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT aste_leads_language_chk CHECK (language IN ('it', 'en', 'es')),
  CONSTRAINT aste_leads_locale_chk CHECK (locale IN ('it', 'en', 'es')),
  CONSTRAINT aste_leads_buyer_type_chk CHECK (
    buyer_type IS NULL OR buyer_type IN ('prima_casa', 'investimento', 'curiosita')
  ),
  CONSTRAINT aste_leads_consent_chk CHECK (consent = true)
);

CREATE UNIQUE INDEX IF NOT EXISTS aste_leads_email_lower_uidx
  ON aste_leads (lower(email));

CREATE UNIQUE INDEX IF NOT EXISTS aste_leads_guide_token_uidx
  ON aste_leads (guide_token);

CREATE INDEX IF NOT EXISTS aste_leads_created_idx
  ON aste_leads (created_at DESC);

COMMENT ON TABLE aste_leads IS
  'EC-21: Dossier Asta waitlist + guide lead magnet. PII: email + preferences. Consent required.';
