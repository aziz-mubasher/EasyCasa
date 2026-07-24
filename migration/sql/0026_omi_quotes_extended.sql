-- K EC 1.28 — OMI quotazioni cache: microzone fields, provenance, optional zone polygons (PostGIS).

ALTER TABLE omi_quotes
  ADD COLUMN IF NOT EXISTS omi_zone text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS link_zona text,
  ADD COLUMN IF NOT EXISTS cod_tip integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS descr_tipologia text,
  ADD COLUMN IF NOT EXISTS stato text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS rectified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS geo_level text NOT NULL DEFAULT 'microzone',
  ADD COLUMN IF NOT EXISTS licence_url text,
  ADD COLUMN IF NOT EXISTS attribution text NOT NULL DEFAULT 'Fonte: Agenzia delle Entrate – OMI',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DROP INDEX IF EXISTS idx_omi_quotes_lookup;

CREATE INDEX IF NOT EXISTS idx_omi_quotes_lookup
  ON omi_quotes (provincia, comune, type, period DESC);

CREATE INDEX IF NOT EXISTS idx_omi_quotes_link
  ON omi_quotes (link_zona, period DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_omi_quotes_natural_key
  ON omi_quotes (
    period,
    provincia,
    comune,
    omi_zone,
    type,
    stato,
    cod_tip
  );

-- Zone perimeters when available under an open licence (e.g. municipal dati.gov.it releases).
CREATE TABLE IF NOT EXISTS omi_zone_polygons (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  link_zona    text NOT NULL,
  period       text NOT NULL,
  comune       text NOT NULL,
  provincia    text NOT NULL,
  geom         geometry(MultiPolygon, 4326) NOT NULL,
  licence_url  text,
  attribution  text NOT NULL DEFAULT 'Fonte: Agenzia delle Entrate – OMI',
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_omi_zone_polygons_link_period
  ON omi_zone_polygons (link_zona, period);

CREATE INDEX IF NOT EXISTS idx_omi_zone_polygons_geom
  ON omi_zone_polygons USING GIST (geom);

CREATE INDEX IF NOT EXISTS idx_omi_zone_polygons_comune
  ON omi_zone_polygons (provincia, comune, period DESC);
