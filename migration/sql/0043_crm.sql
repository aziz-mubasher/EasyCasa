-- K EC 4.1 — Internal CRM (schema crm). Feature-flagged: CRM_ENABLED=false by default.
-- GDPR: soft-delete via deleted_at; hard-delete only via erasure job (audit-logged).
-- B4A: only four attestation fields on crm.b4a_referrals (status, band_max_cents, expires_at, holder_initials).

CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS crm;

CREATE TABLE IF NOT EXISTS crm.contacts (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid REFERENCES users(id),
  full_name        text NOT NULL,
  email            citext,
  phone            text,
  locale           text NOT NULL DEFAULT 'it',
  source           text NOT NULL DEFAULT 'manual',
  owner_admin_id   uuid REFERENCES users(id),
  tags             text[] NOT NULL DEFAULT '{}',
  notes_summary    text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  deleted_at       timestamptz,
  CONSTRAINT crm_contacts_source_chk CHECK (
    source IN ('enquiry', 'manual', 'import', 'b4a_referral', 'partner_intake')
  ),
  CONSTRAINT crm_contacts_locale_chk CHECK (locale IN ('it', 'en', 'es'))
);

CREATE UNIQUE INDEX IF NOT EXISTS crm_contacts_email_uidx
  ON crm.contacts (email)
  WHERE email IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS crm_contacts_email_idx ON crm.contacts (email);
CREATE INDEX IF NOT EXISTS crm_contacts_owner_idx ON crm.contacts (owner_admin_id)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS crm_contacts_user_idx ON crm.contacts (user_id)
  WHERE user_id IS NOT NULL AND deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS crm.seeker_profiles (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id         uuid NOT NULL REFERENCES crm.contacts(id) ON DELETE CASCADE,
  search_intent      jsonb NOT NULL DEFAULT '{}',
  first_enquiry_id   uuid REFERENCES enquiries(id),
  stage              text NOT NULL DEFAULT 'new_enquiry',
  stage_changed_at   timestamptz NOT NULL DEFAULT now(),
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  deleted_at         timestamptz,
  CONSTRAINT crm_seeker_stage_chk CHECK (
    stage IN (
      'new_enquiry', 'contacted', 'viewing_requested', 'viewing_confirmed',
      'viewing_done', 'outcome_positive', 'outcome_negative', 'dormant'
    )
  ),
  CONSTRAINT crm_seeker_contact_uidx UNIQUE (contact_id)
);

CREATE INDEX IF NOT EXISTS crm_seeker_stage_idx ON crm.seeker_profiles (stage)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS crm.owner_profiles (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id         uuid NOT NULL REFERENCES crm.contacts(id) ON DELETE CASCADE,
  stage              text NOT NULL DEFAULT 'prospect',
  listing_ids        uuid[] NOT NULL DEFAULT '{}',
  preferred_channel  text NOT NULL DEFAULT 'email',
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  deleted_at         timestamptz,
  CONSTRAINT crm_owner_stage_chk CHECK (
    stage IN ('prospect', 'in_conversation', 'onboarding', 'live_listing', 'paused')
  ),
  CONSTRAINT crm_owner_channel_chk CHECK (
    preferred_channel IN ('email', 'phone', 'whatsapp')
  ),
  CONSTRAINT crm_owner_contact_uidx UNIQUE (contact_id)
);

CREATE INDEX IF NOT EXISTS crm_owner_stage_idx ON crm.owner_profiles (stage)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS crm.b4a_referrals (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id               uuid NOT NULL REFERENCES crm.contacts(id) ON DELETE CASCADE,
  referred_at              timestamptz NOT NULL DEFAULT now(),
  attestation_status       text NOT NULL DEFAULT 'none',
  band_max_cents           bigint,
  attestation_expires_at   timestamptz,
  holder_initials          text,
  last_sweep_at            timestamptz,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  deleted_at               timestamptz,
  CONSTRAINT crm_b4a_status_chk CHECK (
    attestation_status IN ('none', 'active', 'expired')
  ),
  CONSTRAINT crm_b4a_contact_uidx UNIQUE (contact_id)
);

CREATE INDEX IF NOT EXISTS crm_b4a_status_idx ON crm.b4a_referrals (attestation_status)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS crm.partner_profiles (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id     uuid NOT NULL REFERENCES crm.contacts(id) ON DELETE CASCADE,
  partner_type   text NOT NULL DEFAULT 'other',
  stage          text NOT NULL DEFAULT 'prospect',
  service_zones  text[] NOT NULL DEFAULT '{}',
  vat_number     text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  deleted_at     timestamptz,
  CONSTRAINT crm_partner_type_chk CHECK (
    partner_type IN ('photographer', 'notary', 'conductor', 'agent', 'other')
  ),
  CONSTRAINT crm_partner_stage_chk CHECK (
    stage IN ('prospect', 'vetting', 'active', 'inactive')
  ),
  CONSTRAINT crm_partner_contact_uidx UNIQUE (contact_id)
);

CREATE INDEX IF NOT EXISTS crm_partner_stage_idx ON crm.partner_profiles (stage)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS crm.activities (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id      uuid NOT NULL REFERENCES crm.contacts(id) ON DELETE CASCADE,
  type            text NOT NULL,
  ref_table       text,
  ref_id          uuid,
  body            text NOT NULL DEFAULT '',
  actor_admin_id  uuid REFERENCES users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz,
  CONSTRAINT crm_activity_type_chk CHECK (
    type IN (
      'note', 'call', 'email', 'enquiry_ref', 'viewing_ref',
      'stage_change', 'task_done', 'system'
    )
  )
);

CREATE INDEX IF NOT EXISTS crm_activities_contact_created_idx
  ON crm.activities (contact_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS crm.tasks (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id         uuid NOT NULL REFERENCES crm.contacts(id) ON DELETE CASCADE,
  title              text NOT NULL,
  due_at             timestamptz,
  assignee_admin_id  uuid REFERENCES users(id),
  status             text NOT NULL DEFAULT 'open',
  completed_at       timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  deleted_at         timestamptz,
  CONSTRAINT crm_task_status_chk CHECK (status IN ('open', 'done', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS crm_tasks_assignee_status_due_idx
  ON crm.tasks (assignee_admin_id, status, due_at)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS crm.audit_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_admin_id  uuid REFERENCES users(id),
  action          text NOT NULL,
  entity_type     text NOT NULL,
  entity_id       text,
  detail          jsonb NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS crm_audit_log_entity_idx
  ON crm.audit_log (entity_type, entity_id, created_at DESC);

CREATE INDEX IF NOT EXISTS crm_audit_log_actor_idx
  ON crm.audit_log (actor_admin_id, created_at DESC);

COMMENT ON SCHEMA crm IS
  'K EC 4.1 internal CRM. Production personal-data processing gated on CRM_ENABLED + counsel informativa (§10.5).';

COMMENT ON TABLE crm.b4a_referrals IS
  'B4A data minimisation: only attestation_status, band_max_cents (€25k bands), attestation_expires_at, holder_initials. No other B4A PII.';

COMMENT ON TABLE crm.audit_log IS
  'Append-only CRM accountability log (GDPR Art. 5(2)). Application must not UPDATE/DELETE.';

DO $$
BEGIN
  REVOKE UPDATE, DELETE ON crm.audit_log FROM easycasa;
EXCEPTION
  WHEN undefined_object THEN NULL;
  WHEN invalid_grant_operation THEN NULL;
END $$;
