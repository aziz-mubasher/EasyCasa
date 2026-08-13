# EC-S-T33 — Lighthouse SEO operator scores (2026-08-13)

**Runner:** Cursor cloud agent · Lighthouse `12.8.2` · mobile form-factor · `--only-categories=seo`  
**Prod tip at first run:** web deploy `c6e4fdc` (docs `0821f44`). Listing meta fix landed afterward (see below).

## Scores

| URL | SEO (first run) | SEO (after listing `generateMetadata`) | Notes |
|-----|-----------------|----------------------------------------|-------|
| `https://easycasaita.com/it` | **100** | **100** | Pass ≥95 |
| `https://easycasaita.com/it/vendi-da-privato` | **100** | **100** | Pass ≥95 |
| `https://easycasaita.com/it/listings/demo-sc1-verified` | **82** | *(re-run after deploy)* | First run failed `document-title` + `meta-description` — page had **no** `generateMetadata` |

### First-run listing failures (82)

- `document-title` — Document doesn't have a `<title>` element (score 0)
- `meta-description` — Document does not have a meta description (score 0)
- Other SEO audits (crawlable, robots, hreflang, HTTP 200): pass

## Inventory / Meili / sitemap (deploy-time “no listing slug” flag)

**False alarm on empty sitemap listings** — at T33 deploy verify, `grep` on a truncated `head` of `sitemap.xml` missed listing URLs. Live state:

| Source | Count / state |
|--------|----------------|
| DB `listings` | **published 118** · draft 1 · archived 61 |
| Meili index `listings` | **118 documents**, `isIndexing=false`, health `available` |
| `GET /api/listings/sitemap` | **118** entries |
| Live `sitemap.xml` IT listing locs | **118** (e.g. `demo-sc1-verified`, …) |

Meili and Postgres published inventory are **in sync**. Sitemap listing emission works via `API/listings/sitemap` → `buildListingSitemapEntries`.

## Operator commands used

```bash
npx lighthouse https://easycasaita.com/it --only-categories=seo --output=json --quiet \
  --chrome-flags="--headless --no-sandbox --disable-gpu"
npx lighthouse https://easycasaita.com/it/vendi-da-privato --only-categories=seo --output=json --quiet \
  --chrome-flags="--headless --no-sandbox --disable-gpu"
npx lighthouse https://easycasaita.com/it/listings/demo-sc1-verified --only-categories=seo --output=json --quiet \
  --chrome-flags="--headless --no-sandbox --disable-gpu"
```

## Follow-up fix (this PR)

Add `generateMetadata` on `apps/web/app/[locale]/listings/[slug]/page.tsx` using listing title + plain description (fallback i18n). Re-run listing Lighthouse after web rebuild; target ≥95.
