-- PP-1 / K EC 1.50 — partner directory self-serve Stripe checkout.
-- Links directory rows to claiming users; records payment id for webhook idempotency.
-- Perpetual flat-fee placement (no paid_until) — matches admin manual marking shape.

ALTER TABLE partner_directory
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS stripe_payment_id text;

CREATE UNIQUE INDEX IF NOT EXISTS partner_directory_stripe_payment_id_uidx
  ON partner_directory (stripe_payment_id)
  WHERE stripe_payment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS partner_directory_user_id_idx
  ON partner_directory (user_id)
  WHERE user_id IS NOT NULL;

COMMENT ON COLUMN partner_directory.user_id IS
  'PP-1: partner who claimed this row for self-serve checkout. NULL for admin-seeded entries.';

COMMENT ON COLUMN partner_directory.stripe_payment_id IS
  'PP-1: Stripe payment intent / session id for idempotent paid_placement activation.';

-- Config-driven price id (empty until AZM backfills Stripe test/live Price).
INSERT INTO plans (key, name, price_cents, currency, interval, stripe_price_id, features)
SELECT
  'partner_directory_placement',
  'Partner Directory Placement',
  0,
  'EUR',
  'once',
  NULL,
  '{"kind":"partner_directory","description":"Flat listing fee for preferential directory presence"}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE key = 'partner_directory_placement');

COMMENT ON TABLE partner_directory IS
  'EC-S-T28/T29 partner directory. G3/PP-1: paid_placement via admin mark or self-serve Stripe checkout. Outbound referral tracking remains stripped.';
