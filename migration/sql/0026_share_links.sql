-- SmartLink share tokens + privacy-respecting view tracking (K EC 1.29).

CREATE TABLE share_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL,
  listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES users(id),
  agent_user_id uuid REFERENCES users(id),
  agent_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  include_valuation_band boolean NOT NULL DEFAULT true,
  include_sources_table boolean NOT NULL DEFAULT false,
  view_count integer NOT NULL DEFAULT 0,
  unique_view_count integer NOT NULL DEFAULT 0,
  last_viewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  CONSTRAINT share_links_token_unique UNIQUE (token)
);

CREATE INDEX idx_share_links_listing_id ON share_links(listing_id);
CREATE INDEX idx_share_links_created_by ON share_links(created_by);
CREATE INDEX idx_share_links_active_token ON share_links(token) WHERE revoked_at IS NULL;

-- Lifetime unique visitors — SHA-256 hashes only; no raw IP or cookie values.
CREATE TABLE share_link_visitor_hashes (
  share_link_id uuid NOT NULL REFERENCES share_links(id) ON DELETE CASCADE,
  visitor_hash char(64) NOT NULL,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (share_link_id, visitor_hash)
);

CREATE INDEX idx_share_link_visitor_hashes_seen ON share_link_visitor_hashes(first_seen_at);
