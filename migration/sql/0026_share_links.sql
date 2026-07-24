-- K EC 1.29 — SmartLink share tokens + privacy-preserving view deduplication

CREATE TABLE IF NOT EXISTS share_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL,
  listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES users(id),
  agent_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  include_valuation_band boolean NOT NULL DEFAULT true,
  view_count integer NOT NULL DEFAULT 0,
  unique_view_count integer NOT NULL DEFAULT 0,
  last_viewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS share_links_token_uq ON share_links (token);
CREATE INDEX IF NOT EXISTS share_links_listing_idx ON share_links (listing_id);
CREATE INDEX IF NOT EXISTS share_links_created_by_idx ON share_links (created_by);

-- Daily unique viewers: stores only HMAC hashes (no IP, no raw visitor id).
CREATE TABLE IF NOT EXISTS share_link_view_dedup (
  share_link_id uuid NOT NULL REFERENCES share_links(id) ON DELETE CASCADE,
  view_date date NOT NULL,
  visitor_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (share_link_id, view_date, visitor_hash)
);

CREATE INDEX IF NOT EXISTS share_link_view_dedup_date_idx ON share_link_view_dedup (view_date);
