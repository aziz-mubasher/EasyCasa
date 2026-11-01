-- EC-ANALYTICS-1 — Tier 0 website measurement.
-- Postgres 16 (infra/postgres/Dockerfile: postgis/postgis:16-3.4).
-- Nullable rollup keys use UNIQUE NULLS NOT DISTINCT (PG15+).
-- No column stores an IP, user agent, email, phone, or user id.
-- Rollup tables have no visitor_hash.

CREATE TABLE analytics_salts (
  day date PRIMARY KEY,
  salt bytea NOT NULL
);

CREATE TABLE analytics_events (
  id bigserial PRIMARY KEY,
  ts timestamptz NOT NULL DEFAULT now(),
  day date NOT NULL,
  visitor_hash char(32) NOT NULL,
  type text NOT NULL CHECK (type IN ('pageview', 'engage', 'event')),
  path_template text NOT NULL,
  entity_id uuid NULL,
  locale text NULL CHECK (locale IN ('it', 'en', 'es')),
  referrer_host text NULL,
  channel text NOT NULL,
  utm_source text NULL,
  utm_medium text NULL,
  utm_campaign text NULL,
  utm_content text NULL,
  utm_term text NULL,
  click_flag text NULL CHECK (click_flag IN ('google_ads', 'meta', 'tiktok', 'bing')),
  device text NULL,
  browser text NULL,
  os text NULL,
  country char(2) NULL,
  screen_bucket text NULL,
  event_name text NULL,
  event_props jsonb NULL,
  engaged_ms integer NULL CHECK (engaged_ms BETWEEN 0 AND 1800000),
  scroll_pct smallint NULL CHECK (scroll_pct IN (0, 25, 50, 75, 100))
);

CREATE INDEX analytics_events_day_idx ON analytics_events (day);
CREATE INDEX analytics_events_day_visitor_idx ON analytics_events (day, visitor_hash, ts);
CREATE INDEX analytics_events_ts_idx ON analytics_events (ts);

CREATE TABLE analytics_daily_pages (
  day date NOT NULL,
  path_template text NOT NULL,
  locale text NULL,
  entity_id uuid NULL,
  pageviews int NOT NULL,
  visitors int NOT NULL,
  entries int NOT NULL,
  engaged_ms_sum bigint NOT NULL,
  engaged_samples int NOT NULL
);
CREATE UNIQUE INDEX analytics_daily_pages_key
  ON analytics_daily_pages (day, path_template, locale, entity_id) NULLS NOT DISTINCT;

CREATE TABLE analytics_daily_sources (
  day date NOT NULL,
  channel text NOT NULL,
  utm_source text NULL,
  utm_medium text NULL,
  utm_campaign text NULL,
  locale text NULL,
  sessions int NOT NULL,
  visitors int NOT NULL,
  engaged_sessions int NOT NULL,
  pageviews int NOT NULL
);
CREATE UNIQUE INDEX analytics_daily_sources_key
  ON analytics_daily_sources (day, channel, utm_source, utm_medium, utm_campaign, locale)
  NULLS NOT DISTINCT;

CREATE TABLE analytics_daily_conversions (
  day date NOT NULL,
  event_name text NOT NULL,
  channel text NOT NULL,
  utm_campaign text NULL,
  locale text NULL,
  count int NOT NULL
);
CREATE UNIQUE INDEX analytics_daily_conversions_key
  ON analytics_daily_conversions (day, event_name, channel, utm_campaign, locale)
  NULLS NOT DISTINCT;

CREATE TABLE analytics_daily_dims (
  day date NOT NULL,
  dim text NOT NULL CHECK (dim IN ('device', 'browser', 'os', 'country', 'screen', 'locale', 'referrer')),
  value text NOT NULL,
  visitors int NOT NULL,
  sessions int NOT NULL,
  PRIMARY KEY (day, dim, value)
);

CREATE TABLE analytics_daily_funnels (
  day date NOT NULL,
  funnel text NOT NULL,
  step smallint NOT NULL,
  channel text NOT NULL,
  visitors int NOT NULL,
  PRIMARY KEY (day, funnel, step, channel)
);

CREATE TABLE analytics_server_conversions (
  day date NOT NULL,
  event_name text NOT NULL,
  count int NOT NULL,
  PRIMARY KEY (day, event_name)
);

CREATE TABLE analytics_campaign_spend (
  utm_campaign text NOT NULL,
  month date NOT NULL,
  spend_eur numeric(10, 2) NOT NULL,
  note text NULL,
  updated_by text NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (utm_campaign, month)
);

-- Day-level totals so the overview does not sum visitors across channels.
CREATE TABLE analytics_daily_totals (
  day date PRIMARY KEY,
  visitors int NOT NULL,
  sessions int NOT NULL,
  pageviews int NOT NULL,
  engaged_sessions int NOT NULL,
  engaged_ms_sum bigint NOT NULL,
  engaged_samples int NOT NULL,
  conversions int NOT NULL
);

-- Listing views and enquiries by province. Reads stay on rollups.
CREATE TABLE analytics_daily_provinces (
  day date NOT NULL,
  province text NOT NULL,
  listing_views int NOT NULL,
  enquiries int NOT NULL,
  PRIMARY KEY (day, province)
);
