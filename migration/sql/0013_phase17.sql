-- Phase 17: payments (PaymentIntent) + fattura elettronica (Invoice).

CREATE TYPE payment_status AS ENUM (
  'requires_payment', 'processing', 'succeeded', 'failed', 'refunded'
);
CREATE TYPE payment_purpose AS ENUM ('due_now', 'provvigione');

ALTER TABLE service_orders
  ADD COLUMN IF NOT EXISTS client_fiscal_code text,
  ADD COLUMN IF NOT EXISTS due_now_net_cents integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS payment_intents (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id       uuid NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
  purpose        payment_purpose NOT NULL,
  amount_cents   integer NOT NULL,
  status         payment_status NOT NULL DEFAULT 'requires_payment',
  provider_ref   text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS payment_intents_order_idx ON payment_intents (order_id);
CREATE INDEX IF NOT EXISTS payment_intents_provider_ref_idx ON payment_intents (provider_ref);
CREATE INDEX IF NOT EXISTS payment_intents_status_idx ON payment_intents (status);

CREATE TABLE IF NOT EXISTS invoices (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id                  uuid NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
  payment_intent_id         uuid REFERENCES payment_intents(id),
  totale_documento_cents    integer NOT NULL,
  payload                   jsonb NOT NULL,
  sdi_protocollo            text,
  transmitted_at            timestamptz,
  created_at                timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS invoices_order_idx ON invoices (order_id);
CREATE INDEX IF NOT EXISTS invoices_sdi_protocollo_idx ON invoices (sdi_protocollo);
