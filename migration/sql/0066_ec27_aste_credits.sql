-- EC-27 — Aste credit packs + report unlock ledger (dark behind ASTE_ANALYSIS_ENABLED + PAYMENTS_ENABLED).
-- Next free index verified against origin/main (0065_ecs_pp1_partner_directory_checkout.sql).

CREATE TABLE IF NOT EXISTS aste_credit_balances (
  user_id    uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  balance    integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT aste_credit_balances_nonneg CHECK (balance >= 0)
);

CREATE TABLE IF NOT EXISTS aste_credit_ledger (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  delta              integer NOT NULL,
  reason             text NOT NULL,
  stripe_payment_id  text,
  analysis_id        uuid REFERENCES aste_analyses(id) ON DELETE SET NULL,
  idempotency_key    text NOT NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT aste_credit_ledger_idempotency_uniq UNIQUE (idempotency_key),
  CONSTRAINT aste_credit_ledger_reason_chk CHECK (
    reason IN ('stripe_purchase', 'report_unlock', 'admin_adjust')
  )
);

CREATE INDEX IF NOT EXISTS aste_credit_ledger_user_idx
  ON aste_credit_ledger (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS aste_report_unlocks (
  user_id          uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  analysis_id      uuid NOT NULL REFERENCES aste_analyses(id) ON DELETE CASCADE,
  credit_ledger_id uuid REFERENCES aste_credit_ledger(id),
  unlocked_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, analysis_id)
);

COMMENT ON TABLE aste_credit_balances IS
  'EC-27: per-user Aste full-report credit balance (Stripe grant + atomic unlock consume).';
COMMENT ON TABLE aste_credit_ledger IS
  'EC-27: append-only credit grants/consumptions; idempotency_key prevents double grant/consume.';
COMMENT ON TABLE aste_report_unlocks IS
  'EC-27: entitled full-report views — one row per (user, analysis); re-view is free.';
