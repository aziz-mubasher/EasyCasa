-- ============ Enums ============
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('buyer','seller','agent','partner','pro_marketer','admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE listing_status AS ENUM ('draft','published','sold','archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE transaction_type AS ENUM ('sale','rent');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE media_type AS ENUM ('image','floorplan','video');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE content_type AS ENUM ('page','post');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ Reference data ============
CREATE TABLE IF NOT EXISTS regions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  slug        text NOT NULL UNIQUE,
  wp_term_id  bigint UNIQUE,
  boundary    geography(MultiPolygon, 4326),   -- optional region polygon (fill later)
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key         text NOT NULL UNIQUE,            -- residential|renovatable|nib|commercial|auction|rooms
  name        text NOT NULL,
  slug        text NOT NULL UNIQUE,
  wp_term_id  bigint UNIQUE,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ============ Users / agents ============
CREATE TABLE IF NOT EXISTS users (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wp_user_id     bigint UNIQUE,                -- idempotency key from WordPress
  email          text UNIQUE,
  display_name   text,
  slug           text UNIQUE,
  role           user_role NOT NULL DEFAULT 'buyer',
  phone          text,
  avatar_url     text,
  bio            text,
  membership_tier text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- ============ Listings ============
CREATE TABLE IF NOT EXISTS listings (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wp_post_id       bigint UNIQUE,              -- idempotency key from WordPress
  slug             text UNIQUE,
  title            text NOT NULL,
  description      text,
  category_id      uuid REFERENCES categories(id),
  region_id        uuid REFERENCES regions(id),
  agent_id         uuid REFERENCES users(id),
  status           listing_status NOT NULL DEFAULT 'draft',
  transaction_type transaction_type,
  price            numeric(14,2),
  currency         text NOT NULL DEFAULT 'EUR',

  -- property attributes
  bedrooms         int,
  bathrooms        int,
  rooms            int,
  size_sqm         numeric(10,2),
  land_sqm         numeric(12,2),
  floor            text,
  year_built       int,
  energy_class      text,
  condition        text,
  features         text[] NOT NULL DEFAULT '{}',
  attributes       jsonb  NOT NULL DEFAULT '{}',

  -- location
  address          text,
  city             text,
  province         text,
  postal_code      text,
  latitude         double precision,
  longitude        double precision,
  location         geography(Point, 4326),
  geocoded_at      timestamptz,
  geocode_source   text,

  -- search / ai
  embedding        vector(1536),              -- filled in Phase 4

  -- meta
  qr_code_url      text,
  source           text NOT NULL DEFAULT 'wordpress',
  published_at     timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- ============ Media ============
CREATE TABLE IF NOT EXISTS media (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id      uuid REFERENCES listings(id) ON DELETE CASCADE,
  type            media_type NOT NULL DEFAULT 'image',
  url             text NOT NULL,               -- MinIO/S3 URL after processing
  original_wp_url text UNIQUE,                 -- idempotency key
  position        int NOT NULL DEFAULT 0,
  width           int,
  height          int,
  alt             text,
  placeholder     text,                        -- tiny base64 blur
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ============ Memberships ============
CREATE TABLE IF NOT EXISTS memberships (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES users(id) ON DELETE CASCADE,
  tier        text NOT NULL,
  status      text NOT NULL DEFAULT 'active',
  wp_ref      text UNIQUE,
  started_at  timestamptz,
  expires_at  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ============ Editorial content (pages / blog) ============
CREATE TABLE IF NOT EXISTS content (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wp_post_id      bigint UNIQUE,
  type            content_type NOT NULL,
  slug            text NOT NULL,
  locale          text NOT NULL DEFAULT 'it',
  title           text NOT NULL,
  body_html       text,
  body_markdown   text,
  seo_title       text,
  seo_description text,
  status          text NOT NULL DEFAULT 'published',
  published_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (slug, locale)
);

-- ============ Redirects (for SEO-safe cutover) ============
CREATE TABLE IF NOT EXISTS redirects (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  old_path    text NOT NULL UNIQUE,
  new_path    text NOT NULL,
  status_code int  NOT NULL DEFAULT 301,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ============ Geocode cache (idempotent geocoding) ============
CREATE TABLE IF NOT EXISTS geocode_cache (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query      text NOT NULL UNIQUE,
  latitude   double precision,
  longitude  double precision,
  source     text,
  created_at timestamptz NOT NULL DEFAULT now()
);
