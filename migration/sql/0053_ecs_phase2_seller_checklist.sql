-- EC-S Phase 2 — private-seller document checklist (T18 / P6)
-- Migration id 0053 (aste 0050/0051; VO 0052). NOT fascicolo / document_assets.

CREATE TABLE IF NOT EXISTS seller_doc_checklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  seller_user_id uuid NOT NULL REFERENCES seller_profile(user_id) ON DELETE CASCADE,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  completeness smallint NOT NULL DEFAULT 0
    CHECK (completeness >= 0 AND completeness <= 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (listing_id)
);

CREATE INDEX IF NOT EXISTS idx_seller_doc_checklist_seller
  ON seller_doc_checklist(seller_user_id);
