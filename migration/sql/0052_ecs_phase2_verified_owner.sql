-- EC-S Phase 2 — Verified Owner cases (T14) + name-match columns (T16)
-- Migration id 0052: aste already claimed 0050/0051.
-- Depends: seller_profile (0049), listings, users, moderation_events

CREATE TABLE IF NOT EXISTS verified_owner_case (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_user_id uuid NOT NULL REFERENCES seller_profile(user_id) ON DELETE CASCADE,
  listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  state text NOT NULL DEFAULT 'submitted'
    CHECK (state IN ('submitted','in_review','verified','rejected','revoked','expired')),
  doc_keys jsonb NOT NULL DEFAULT '[]'::jsonb,
  name_match_verdict text
    CHECK (name_match_verdict IS NULL OR name_match_verdict IN ('match','partial','no_match','company')),
  name_match_score numeric(4,3),
  decided_by uuid REFERENCES users(id),
  decision_reason text,
  verified_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (seller_user_id, listing_id)
);

CREATE INDEX IF NOT EXISTS idx_vo_case_state ON verified_owner_case(state);
CREATE INDEX IF NOT EXISTS idx_vo_case_expires ON verified_owner_case(expires_at)
  WHERE state = 'verified' AND expires_at IS NOT NULL;
