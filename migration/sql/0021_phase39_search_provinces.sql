-- Phase 39 / K EC 1.20 — Province reference table + backfill listings.province (sigla).
-- Rollback: DROP TABLE IF EXISTS provinces; (listings.province values are preserved)

CREATE TABLE IF NOT EXISTS provinces (
  slug        text PRIMARY KEY,          -- official sigla (BS, MI, …)
  name        text NOT NULL,
  region_slug text NOT NULL REFERENCES regions(slug),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_provinces_region ON provinces (region_slug);
CREATE INDEX IF NOT EXISTS idx_listings_province_slug ON listings (province);

-- Seed all 107 ordinary Italian provinces (idempotent).
INSERT INTO provinces (slug, name, region_slug) VALUES
  ('AG','Agrigento','sicilia'), ('AL','Alessandria','piemonte'), ('AN','Ancona','marche'),
  ('AO','Aosta','valle-d-aosta'), ('AP','Ascoli Piceno','marche'), ('AQ','L''Aquila','abruzzo'),
  ('AR','Arezzo','toscana'), ('AT','Asti','piemonte'), ('AV','Avellino','campania'),
  ('BA','Bari','puglia'), ('BG','Bergamo','lombardia'), ('BI','Biella','piemonte'),
  ('BL','Belluno','veneto'), ('BN','Benevento','campania'), ('BO','Bologna','emilia-romagna'),
  ('BR','Brindisi','puglia'), ('BS','Brescia','lombardia'), ('BT','Barletta-Andria-Trani','puglia'),
  ('BZ','Bolzano','trentino-alto-adige'), ('CA','Cagliari','sardegna'), ('CB','Campobasso','molise'),
  ('CE','Caserta','campania'), ('CH','Chieti','abruzzo'), ('CL','Caltanissetta','sicilia'),
  ('CN','Cuneo','piemonte'), ('CO','Como','lombardia'), ('CR','Cremona','lombardia'),
  ('CS','Cosenza','calabria'), ('CT','Catania','sicilia'), ('CZ','Catanzaro','calabria'),
  ('EN','Enna','sicilia'), ('FC','Forlì-Cesena','emilia-romagna'), ('FE','Ferrara','emilia-romagna'),
  ('FG','Foggia','puglia'), ('FI','Firenze','toscana'), ('FM','Fermo','marche'),
  ('FR','Frosinone','lazio'), ('GE','Genova','liguria'), ('GO','Gorizia','friuli-venezia-giulia'),
  ('GR','Grosseto','toscana'), ('IM','Imperia','liguria'), ('IS','Isernia','molise'),
  ('KR','Crotone','calabria'), ('LC','Lecco','lombardia'), ('LE','Lecce','puglia'),
  ('LI','Livorno','toscana'), ('LO','Lodi','lombardia'), ('LT','Latina','lazio'),
  ('LU','Lucca','toscana'), ('MB','Monza e Brianza','lombardia'), ('MC','Macerata','marche'),
  ('ME','Messina','sicilia'), ('MI','Milano','lombardia'), ('MN','Mantova','lombardia'),
  ('MO','Modena','emilia-romagna'), ('MS','Massa-Carrara','toscana'), ('MT','Matera','basilicata'),
  ('NA','Napoli','campania'), ('NO','Novara','piemonte'), ('NU','Nuoro','sardegna'),
  ('OR','Oristano','sardegna'), ('PA','Palermo','sicilia'), ('PC','Piacenza','emilia-romagna'),
  ('PD','Padova','veneto'), ('PE','Pescara','abruzzo'), ('PG','Perugia','umbria'),
  ('PI','Pisa','toscana'), ('PN','Pordenone','friuli-venezia-giulia'), ('PO','Prato','toscana'),
  ('PR','Parma','emilia-romagna'), ('PT','Pistoia','toscana'), ('PU','Pesaro e Urbino','marche'),
  ('PV','Pavia','lombardia'), ('PZ','Potenza','basilicata'), ('RA','Ravenna','emilia-romagna'),
  ('RC','Reggio Calabria','calabria'), ('RE','Reggio Emilia','emilia-romagna'), ('RG','Ragusa','sicilia'),
  ('RI','Rieti','lazio'), ('RM','Roma','lazio'), ('RN','Rimini','emilia-romagna'),
  ('RO','Rovigo','veneto'), ('SA','Salerno','campania'), ('SI','Siena','toscana'),
  ('SO','Sondrio','lombardia'), ('SP','La Spezia','liguria'), ('SR','Siracusa','sicilia'),
  ('SS','Sassari','sardegna'), ('SU','Sud Sardegna','sardegna'), ('SV','Savona','liguria'),
  ('TA','Taranto','puglia'), ('TE','Teramo','abruzzo'), ('TN','Trento','trentino-alto-adige'),
  ('TO','Torino','piemonte'), ('TP','Trapani','sicilia'), ('TR','Terni','umbria'),
  ('TS','Trieste','friuli-venezia-giulia'), ('TV','Treviso','veneto'), ('UD','Udine','friuli-venezia-giulia'),
  ('VA','Varese','lombardia'), ('VB','Verbano-Cusio-Ossola','piemonte'), ('VC','Vercelli','piemonte'),
  ('VE','Venezia','veneto'), ('VI','Vicenza','veneto'), ('VR','Verona','veneto'),
  ('VT','Viterbo','lazio'), ('VV','Vibo Valentia','calabria')
ON CONFLICT (slug) DO NOTHING;

-- Normalize existing province values to uppercase sigla where they match a known province.
UPDATE listings l
   SET province = p.slug
  FROM provinces p
 WHERE UPPER(TRIM(l.province)) = p.slug
   AND l.province IS DISTINCT FROM p.slug;

-- Backfill province from comune where deterministically mappable (no guessing).
UPDATE listings l
   SET province = m.sigla
  FROM (VALUES
    ('brescia', 'BS'),
    ('torbole casaglia', 'BS'),
    ('gussago', 'BS'),
    ('concesio', 'BS'),
    ('cellatica', 'BS'),
    ('rodengo-saiano', 'BS'),
    ('rodengo saiano', 'BS'),
    ('rovato', 'BS'),
    ('desenzano del garda', 'BS'),
    ('montichiari', 'BS'),
    ('palazzolo sull''oglio', 'BS'),
    ('palazzolo sull oglio', 'BS'),
    ('lumezzane', 'BS'),
    ('chiari', 'BS'),
    ('orzinuovi', 'BS'),
    ('leno', 'BS'),
    ('passirano', 'BS'),
    ('corte franca', 'BS'),
    ('cazzago san martino', 'BS'),
    ('roncadelle', 'BS'),
    ('rezzato', 'BS'),
    ('mazzano', 'BS'),
    ('calcinato', 'BS'),
    ('carpenedolo', 'BS'),
    ('ghedi', 'BS'),
    ('manerbio', 'BS'),
    ('isorella', 'BS'),
    ('milano', 'MI'),
    ('roma', 'RM'),
    ('torino', 'TO'),
    ('napoli', 'NA'),
    ('firenze', 'FI'),
    ('bologna', 'BO'),
    ('genova', 'GE'),
    ('venezia', 'VE'),
    ('verona', 'VR'),
    ('padova', 'PD'),
    ('trieste', 'TS'),
    ('palermo', 'PA'),
    ('catania', 'CT')
  ) AS m(city, sigla)
 WHERE LOWER(TRIM(l.city)) = m.city
   AND (l.province IS NULL OR TRIM(l.province) = '');

-- Backfill region_id from province where missing.
UPDATE listings l
   SET region_id = r.id
  FROM provinces p
  JOIN regions r ON r.slug = p.region_slug
 WHERE UPPER(TRIM(l.province)) = p.slug
   AND l.region_id IS NULL;
