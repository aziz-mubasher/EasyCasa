-- Phase 12: leases (RLI) + AML KYC cases.

CREATE TYPE lease_type AS ENUM (
  'libero_4_4', 'concordato_3_2', 'transitorio', 'studenti'
);
CREATE TYPE kyc_status AS ENUM ('open', 'verified', 'escalated', 'cleared');

CREATE TABLE IF NOT EXISTS leases (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id              uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  type                     lease_type NOT NULL,
  start_at                 date NOT NULL,
  duration_months          integer NOT NULL,
  annual_rent_cents        integer NOT NULL,
  cedolare_secca           boolean NOT NULL DEFAULT false,
  high_tension             boolean NOT NULL DEFAULT false,
  ape_attached             boolean NOT NULL DEFAULT false,
  signed_at                date,
  registration_protocollo  text,
  registered_at            timestamptz,
  created_at               timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS leases_property_idx ON leases (property_id);
CREATE INDEX IF NOT EXISTS leases_protocollo_idx ON leases (registration_protocollo);

CREATE TABLE IF NOT EXISTS kyc_cases (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_ref    text NOT NULL,
  factors        jsonb NOT NULL,
  risk_level     text NOT NULL,
  measure        text NOT NULL,
  must_escalate  boolean NOT NULL DEFAULT false,
  score          integer NOT NULL DEFAULT 0,
  status         kyc_status NOT NULL DEFAULT 'open',
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS kyc_cases_subject_idx ON kyc_cases (subject_ref);
CREATE INDEX IF NOT EXISTS kyc_cases_status_idx ON kyc_cases (status);
