-- EC-S Phase 1 — seller onboarding, listing drafts, media perceptual hashes (T06–T12)
-- Depends: users, media, consent_records, PostGIS (omi_zone_polygons)

-- T06 seller_profile (GDPR gate: informativa version required at DB layer)
CREATE TABLE IF NOT EXISTS seller_profile (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  phone text,
  informativa_version_accepted text NOT NULL,
  accepted_at timestamptz NOT NULL,
  marketing_consent boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT seller_profile_informativa_nonempty
    CHECK (informativa_version_accepted <> '')
);

CREATE INDEX IF NOT EXISTS seller_profile_accepted_at_idx
  ON seller_profile (accepted_at DESC);

-- T07 listing_draft (autosave payload; wizard machine validates before persist)
CREATE TABLE IF NOT EXISTS listing_draft (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES seller_profile(user_id) ON DELETE CASCADE,
  current_step text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT listing_draft_status_chk CHECK (status IN ('draft', 'submitted'))
);

CREATE INDEX IF NOT EXISTS listing_draft_seller_idx ON listing_draft (seller_id);
CREATE INDEX IF NOT EXISTS listing_draft_updated_idx ON listing_draft (updated_at DESC);

-- T10/T12 — perceptual hashes + content key on media
ALTER TABLE media ADD COLUMN IF NOT EXISTS storage_key text;
ALTER TABLE media ADD COLUMN IF NOT EXISTS sha256 text;
ALTER TABLE media ADD COLUMN IF NOT EXISTS dhash bigint;
ALTER TABLE media ADD COLUMN IF NOT EXISTS phash bigint;
ALTER TABLE media ADD COLUMN IF NOT EXISTS dhash_bucket integer;
ALTER TABLE media ADD COLUMN IF NOT EXISTS owner_user_id uuid REFERENCES users(id);
ALTER TABLE media ADD COLUMN IF NOT EXISTS moderation_flag text;

CREATE INDEX IF NOT EXISTS media_sha256_idx ON media (sha256) WHERE sha256 IS NOT NULL;
CREATE INDEX IF NOT EXISTS media_dhash_bucket_idx ON media (dhash_bucket) WHERE dhash_bucket IS NOT NULL;
CREATE INDEX IF NOT EXISTS media_owner_idx ON media (owner_user_id) WHERE owner_user_id IS NOT NULL;

-- Moderation events (T12 → T15/T19)
CREATE TABLE IF NOT EXISTS moderation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  listing_id uuid,
  media_id uuid,
  actor_user_id uuid,
  subject_user_id uuid,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS moderation_events_kind_idx ON moderation_events (kind, created_at DESC);
