-- Normalize listings.province to official ISTAT sigla (BS, MI, …).
-- Fixes duplicate facet labels like BRESCIA / PROVINCIA DI BRESCIA vs BS.

UPDATE listings l
   SET province = p.slug
  FROM provinces p
 WHERE lower(trim(l.province)) = lower(p.name)
   AND l.province IS DISTINCT FROM p.slug;

UPDATE listings l
   SET province = p.slug
  FROM provinces p
 WHERE lower(trim(l.province)) = lower('provincia di ' || p.name)
   AND l.province IS DISTINCT FROM p.slug;

UPDATE listings
   SET province = upper(trim(province))
 WHERE province IS NOT NULL
   AND province <> upper(trim(province))
   AND length(trim(province)) = 2;
