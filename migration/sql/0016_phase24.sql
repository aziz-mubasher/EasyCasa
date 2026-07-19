-- Phase 24: enquiry funnel (discovery → order pipeline).
-- Listing parties for routing; buyer-side catalog codes for conversion drafts.

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS owner_user_id uuid REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS mediator_user_id uuid REFERENCES users(id);

UPDATE listings
SET owner_user_id = agent_id
WHERE owner_user_id IS NULL AND agent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_listings_owner_user ON listings (owner_user_id);

CREATE TABLE IF NOT EXISTS enquiries (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id        uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  seeker_user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  owner_user_id     uuid NOT NULL REFERENCES users(id),
  mediator_user_id  uuid REFERENCES users(id),
  intent            text NOT NULL,
  status            text NOT NULL DEFAULT 'NEW',
  message           text NOT NULL,
  contact_email     text,
  contact_phone     text,
  order_id          uuid REFERENCES service_orders(id),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_enquiries_seeker ON enquiries (seeker_user_id);
CREATE INDEX IF NOT EXISTS idx_enquiries_owner ON enquiries (owner_user_id);
CREATE INDEX IF NOT EXISTS idx_enquiries_listing ON enquiries (listing_id);
CREATE INDEX IF NOT EXISTS idx_enquiries_status ON enquiries (status);

-- Buyer-side catalog items suggested when converting viewing/offer enquiries.
INSERT INTO service_catalog_items (
  code, label_en, label_it, category, price_model, amount_cents, rate_percent,
  iva_applicable, active, legal_basis
) VALUES
  ('VIEWING_ACCOMPANIMENT', 'Viewing accompaniment', 'Accompagnamento visita',
   'mediation', 'fixed', 4900, NULL, true, true, 'mediazione'),
  ('BUYER_MEDIATION', 'Buyer-side mediation', 'Mediazione lato acquirente',
   'mediation', 'provvigione', NULL, 0.0249, true, true, 'mediazione'),
  ('OFFER_DRAFTING', 'Offer drafting', 'Redazione proposta di acquisto',
   'mediation', 'fixed', 9900, NULL, true, true, 'mediazione')
ON CONFLICT (code) DO NOTHING;
