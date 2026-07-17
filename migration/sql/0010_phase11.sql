-- Phase 11: professionals, credentials, service tasks, assignments, credential policy.

CREATE TYPE verification_status AS ENUM ('pending', 'verified', 'rejected');
CREATE TYPE assignment_status AS ENUM (
  'requested', 'assigned', 'in_progress', 'delivered', 'approved'
);

CREATE TABLE IF NOT EXISTS professionals (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name        text NOT NULL,
  coverage_provinces  text[] NOT NULL DEFAULT '{}',
  active_assignments  integer NOT NULL DEFAULT 0,
  max_concurrent      integer NOT NULL DEFAULT 5,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS credentials (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id  uuid NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  type             text NOT NULL,
  status           verification_status NOT NULL DEFAULT 'pending',
  reference        text,
  expires_at       timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS credentials_pro_idx ON credentials (professional_id);
CREATE INDEX IF NOT EXISTS credentials_pro_type_idx ON credentials (professional_id, type);

CREATE TABLE IF NOT EXISTS service_tasks (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id              uuid NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
  property_id           uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  item_code             text NOT NULL,
  required_credential   text NOT NULL,
  province              text NOT NULL,
  created_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS service_tasks_order_idx ON service_tasks (order_id);
CREATE INDEX IF NOT EXISTS service_tasks_property_idx ON service_tasks (property_id);

CREATE TABLE IF NOT EXISTS assignments (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id           uuid NOT NULL REFERENCES service_tasks(id) ON DELETE CASCADE,
  professional_id   uuid REFERENCES professionals(id) ON DELETE SET NULL,
  status            assignment_status NOT NULL DEFAULT 'requested',
  deliverable_url   text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS assignments_task_idx ON assignments (task_id);
CREATE INDEX IF NOT EXISTS assignments_pro_idx ON assignments (professional_id);
CREATE INDEX IF NOT EXISTS assignments_status_idx ON assignments (status);

CREATE TABLE IF NOT EXISTS credential_policies (
  item_code              text PRIMARY KEY,
  required_credential    text NOT NULL DEFAULT 'NONE'
);

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS province text;
