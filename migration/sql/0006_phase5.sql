-- ============ Billing / plans ============
CREATE TABLE IF NOT EXISTS plans (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key            text NOT NULL UNIQUE,            -- free | basic | pro | agency
  name           text NOT NULL,
  stripe_price_id text UNIQUE,
  price_cents    int NOT NULL DEFAULT 0,
  currency       text NOT NULL DEFAULT 'EUR',
  interval       text NOT NULL DEFAULT 'month',    -- month | year | one_time
  features       jsonb NOT NULL DEFAULT '{}',
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- Extend memberships with Stripe linkage (idempotent).
ALTER TABLE memberships ADD COLUMN IF NOT EXISTS plan_id uuid REFERENCES plans(id);
ALTER TABLE memberships ADD COLUMN IF NOT EXISTS stripe_customer_id text;
ALTER TABLE memberships ADD COLUMN IF NOT EXISTS stripe_subscription_id text UNIQUE;
ALTER TABLE memberships ADD COLUMN IF NOT EXISTS current_period_end timestamptz;
ALTER TABLE memberships ADD COLUMN IF NOT EXISTS vat_id text;   -- P.Iva for EU invoicing

-- ============ Featured / boosted placements + ads ============
ALTER TABLE listings ADD COLUMN IF NOT EXISTS featured_until timestamptz;

CREATE TABLE IF NOT EXISTS featured_placements (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id     uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  kind           text NOT NULL DEFAULT 'featured',   -- featured | boosted | ad
  starts_at      timestamptz NOT NULL DEFAULT now(),
  ends_at        timestamptz NOT NULL,
  stripe_payment_id text,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_featured_active ON featured_placements (ends_at);

-- ============ Messaging ============
CREATE TABLE IF NOT EXISTS conversations (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id     uuid REFERENCES listings(id) ON DELETE SET NULL,
  buyer_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agent_id       uuid REFERENCES users(id) ON DELETE SET NULL,
  last_message_at timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (listing_id, buyer_id)
);
CREATE INDEX IF NOT EXISTS idx_conversations_agent ON conversations (agent_id);
CREATE INDEX IF NOT EXISTS idx_conversations_buyer ON conversations (buyer_id);

CREATE TABLE IF NOT EXISTS messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body            text NOT NULL,
  read_at         timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages (conversation_id, created_at);

-- ============ Notifications ============
CREATE TABLE IF NOT EXISTS notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        text NOT NULL,                       -- message | lead | saved_search | system
  channel     text NOT NULL DEFAULT 'in_app',      -- in_app | email | push
  payload     jsonb NOT NULL DEFAULT '{}',
  status      text NOT NULL DEFAULT 'pending',      -- pending | sent | failed
  read_at     timestamptz,
  sent_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications (user_id, created_at DESC);

-- ============ Partners / pro-marketers ============
CREATE TABLE IF NOT EXISTS partner_profiles (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  company      text,
  tier         text NOT NULL DEFAULT 'partner',     -- partner | pro_marketer
  regions      text[] NOT NULL DEFAULT '{}',        -- region slugs they cover
  payout_ref   text,                                -- Stripe Connect acct, etc.
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS leads (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id   uuid REFERENCES listings(id) ON DELETE SET NULL,
  buyer_id     uuid REFERENCES users(id) ON DELETE SET NULL,
  partner_id   uuid REFERENCES users(id) ON DELETE SET NULL,
  status       text NOT NULL DEFAULT 'new',          -- new | working | won | lost
  score        int NOT NULL DEFAULT 0,
  source       text,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_leads_partner ON leads (partner_id, status);

CREATE TABLE IF NOT EXISTS payouts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id   uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount_cents int NOT NULL,
  currency     text NOT NULL DEFAULT 'EUR',
  period       text NOT NULL,
  status       text NOT NULL DEFAULT 'pending',
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Seed baseline plans (idempotent).
INSERT INTO plans (key, name, price_cents, interval) VALUES
  ('free',   'Free',      0,    'month'),
  ('basic',  'Basic',     900,  'month'),
  ('pro',    'Pro',       2900, 'month'),
  ('agency', 'Agency',    9900, 'month')
ON CONFLICT (key) DO NOTHING;
