-- Phase 10: order totals + legal basis + mandates (incarico).

CREATE TYPE legal_basis AS ENUM ('mediazione', 'mandato_oneroso', 'review_required');
CREATE TYPE mandate_status AS ENUM ('draft', 'sent', 'signed', 'withdrawn', 'expired');

ALTER TABLE service_catalog_items
  ADD COLUMN IF NOT EXISTS legal_basis legal_basis NOT NULL DEFAULT 'review_required';

ALTER TABLE service_orders
  ADD COLUMN IF NOT EXISTS item_codes text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS due_now_gross_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS estimated_total_gross_cents integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS mandates (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id               uuid NOT NULL UNIQUE REFERENCES service_orders(id) ON DELETE CASCADE,
  property_id            uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  types                  text[] NOT NULL DEFAULT '{}',
  review_required_items  text[] NOT NULL DEFAULT '{}',
  status                 mandate_status NOT NULL DEFAULT 'draft',
  exclusive              boolean NOT NULL DEFAULT false,
  duration_months        integer NOT NULL,
  signature_envelope_id  text,
  signing_url            text,
  signed_at              timestamptz,
  created_at             timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS mandates_property_idx ON mandates (property_id);
CREATE INDEX IF NOT EXISTS mandates_envelope_idx ON mandates (signature_envelope_id);
