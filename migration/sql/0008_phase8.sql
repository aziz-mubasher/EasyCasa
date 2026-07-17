-- Phase 8: owner Property + fascicolo documents + service catalog / orders.

CREATE TYPE property_deal_type AS ENUM ('sale', 'rent');
CREATE TYPE property_status AS ENUM (
  'draft', 'fascicolo_intake', 'compliance_review', 'valuation_ready',
  'published', 'under_negotiation', 'closing', 'sold', 'archived', 'withdrawn'
);
CREATE TYPE service_price_model AS ENUM ('fixed', 'provvigione', 'passthrough');
CREATE TYPE service_order_status AS ENUM (
  'quoted', 'confirmed', 'in_progress', 'completed', 'cancelled'
);

CREATE TABLE IF NOT EXISTS properties (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  listing_id      uuid REFERENCES listings(id) ON DELETE SET NULL,
  deal_type       property_deal_type NOT NULL DEFAULT 'sale',
  status          property_status NOT NULL DEFAULT 'draft',
  in_condominio   boolean NOT NULL DEFAULT false,
  title           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS properties_owner_idx ON properties (owner_id);
CREATE INDEX IF NOT EXISTS properties_status_idx ON properties (status);

CREATE TABLE IF NOT EXISTS document_assets (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id  uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  type_code    text NOT NULL,
  url          text NOT NULL,
  issued_at    timestamptz,
  verified_at  timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS document_assets_property_idx ON document_assets (property_id);
CREATE INDEX IF NOT EXISTS document_assets_property_type_idx ON document_assets (property_id, type_code);

CREATE TABLE IF NOT EXISTS service_catalog_items (
  code             text PRIMARY KEY,
  label_en         text NOT NULL,
  label_it         text NOT NULL,
  category         text NOT NULL,
  price_model      service_price_model NOT NULL,
  amount_cents     integer,
  rate_percent     double precision,
  iva_applicable   boolean NOT NULL DEFAULT true,
  active           boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS service_packages (
  code                text PRIMARY KEY,
  label_en            text NOT NULL,
  label_it            text NOT NULL,
  bundle_fixed_cents  integer,
  active              boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS package_items (
  package_code text NOT NULL REFERENCES service_packages(code) ON DELETE CASCADE,
  item_code    text NOT NULL REFERENCES service_catalog_items(code),
  PRIMARY KEY (package_code, item_code)
);

CREATE TABLE IF NOT EXISTS service_orders (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id   uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  package_code  text REFERENCES service_packages(code),
  status        service_order_status NOT NULL DEFAULT 'quoted',
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS service_orders_property_idx ON service_orders (property_id);

CREATE TABLE IF NOT EXISTS service_order_lines (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     uuid NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
  item_code    text NOT NULL,
  kind         text NOT NULL,
  net_cents    integer NOT NULL,
  iva_cents    integer NOT NULL,
  gross_cents  integer NOT NULL,
  estimated    boolean NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS service_order_lines_order_idx ON service_order_lines (order_id);
