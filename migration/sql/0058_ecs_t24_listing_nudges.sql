-- EC-S-T24 — seller nudge cooldown history (observations only; T04 row 3).
-- Migration id 0058 (0055=T20, 0056=T21, 0057=T23 reserved — do not reuse).
--
-- `listing_nudges` IS the cooldown ledger: one row per emission.
-- Optional `dismissed_at` for seller dismissible UI (does not delete history).

CREATE TABLE IF NOT EXISTS listing_nudges (
  listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  code text NOT NULL,
  emitted_at timestamptz NOT NULL DEFAULT now(),
  dismissed_at timestamptz,
  PRIMARY KEY (listing_id, code, emitted_at)
);

CREATE INDEX IF NOT EXISTS listing_nudges_listing_emitted_idx
  ON listing_nudges (listing_id, emitted_at DESC);

CREATE INDEX IF NOT EXISTS listing_nudges_listing_code_idx
  ON listing_nudges (listing_id, code, emitted_at DESC);

COMMENT ON TABLE listing_nudges IS
  'EC-S-T24 nudge emission history (cooldown + dismiss). Codes only; copy in i18n.';
