# EC-S-T33 — Lighthouse SEO operator scores (2026-08-13)

**Runner:** Cursor cloud agent · Lighthouse `12.8.2` · mobile form-factor · `--only-categories=seo`  
**Prod after listing-meta deploy:** web tip `1f1269b`

## Final scores (pass ≥95)

| URL | SEO | Notes |
|-----|-----|-------|
| `https://easycasaita.com/it` | **100** | Pass |
| `https://easycasaita.com/it/vendi-da-privato` | **100** | Pass |
| `https://easycasaita.com/it/listings/demo-sc1-verified` | **100** | Pass after `generateMetadata` + headless WebGL flags |

JSON artifacts: `/opt/cursor/artifacts/lighthouse/*.json` (agent run).

## First-run (pre-fix) — for the record

| URL | SEO | Notes |
|-----|-----|-------|
| `/it` | **100** | |
| `/it/vendi-da-privato` | **100** | |
| `/it/listings/demo-sc1-verified` | **82** | Failed `document-title` + `meta-description` |

**Root cause (real product bug):** listing detail route had **no** `generateMetadata` — SSR HTML lacked `<title>` / meta description. Fixed in `1f1269b` (`listing-meta.ts` + page metadata + IT/EN/ES fallbacks).

**Secondary (operator / headless only):** after the meta fix, default headless Chrome still hit `html#__next_error__` on listing pages because **MapLibre** needs WebGL; without software GL the client crashed and wiped the document (Lighthouse then reported missing title again). Re-run with:

```text
--chrome-flags="--headless=new --no-sandbox --disable-dev-shm-usage --enable-unsafe-swiftshader --use-gl=angle --use-angle=swiftshader-webgl"
```

SSR HTML for Googlebot already included title/description after the fix (verified via curl). This is **not** a crawl-time indexing defect.

## Inventory / Meili / sitemap

Deploy-time “no listing slug in sitemap” was a **false alarm** (truncated `head` of a large `sitemap.xml`).

| Source | State |
|--------|--------|
| DB `listings` | **published 118** · draft 1 · archived 61 |
| Meili `listings` | **118 documents**, `isIndexing=false`, health available |
| `GET /api/listings/sitemap` | **118** |
| Live sitemap IT listing locs | **118** (sample: `demo-sc1-verified`) |

Postgres published inventory and Meili are **in sync**. Sitemap listings come from the API sitemap endpoint (not Meili search).

## Operator commands (final)

```bash
FLAGS='--headless=new --no-sandbox --disable-dev-shm-usage --enable-unsafe-swiftshader --use-gl=angle --use-angle=swiftshader-webgl'

npx lighthouse https://easycasaita.com/it --only-categories=seo --output=json --quiet --chrome-flags="$FLAGS"
npx lighthouse https://easycasaita.com/it/vendi-da-privato --only-categories=seo --output=json --quiet --chrome-flags="$FLAGS"
npx lighthouse https://easycasaita.com/it/listings/demo-sc1-verified --only-categories=seo --output=json --quiet --chrome-flags="$FLAGS"
```

## Related code

- `apps/web/app/[locale]/listings/[slug]/page.tsx` — `generateMetadata`
- `apps/web/src/lib/listing-meta.ts` (+ spec)
- `apps/web/messages/{it,en,es}.json` — `listingDetail.meta.*`
