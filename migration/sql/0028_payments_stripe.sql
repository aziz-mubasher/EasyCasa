-- K EC 1.38 — Stripe order payments: webhook idempotency + catalog checkout user link.

CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  id           text PRIMARY KEY,
  processed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE service_orders
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES users(id);

CREATE INDEX IF NOT EXISTS service_orders_user_idx ON service_orders (user_id);
