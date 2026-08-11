-- EC-S-T27 — local seller subscription row (webhook-maintained).
-- Entitlements resolve ONLY from this table — never live Stripe reads.
-- Staleness bound ≈ Stripe webhook delivery SLA (typically seconds).

CREATE TABLE IF NOT EXISTS seller_subscription (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('active', 'past_due', 'canceled')),
  current_period_end timestamptz NOT NULL,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  stripe_subscription_id text UNIQUE,
  stripe_customer_id text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS seller_subscription_status_idx
  ON seller_subscription (status);

-- Flat-fee seller premium plan (T04 row 8): fixed monthly EUR, not listing-price contingent.
INSERT INTO plans (key, name, price_cents, currency, interval, features)
SELECT
  'seller_premium',
  'Seller Premium',
  1900,
  'EUR',
  'month',
  '{"maxActiveListings":20,"maxUploadsPerDay":100,"analyticsWindowDays":365,"priorityModeration":true}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE key = 'seller_premium');
