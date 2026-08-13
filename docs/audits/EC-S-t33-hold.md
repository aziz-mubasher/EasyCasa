<<<<<<< HEAD
# EC-S-T33 — DISPATCHED (K EC 1.46)

**Status:** LIFTED — G7 cleared (`NEXT_PUBLIC_DEMO_MODE=false` on VPS, site indexable).

T33 SEO wiring landed in PR **[K EC 1.46] T33 SEO wiring — JSON-LD hardening, sitemap, sell-privately schema**.

## What shipped

1. **JSON-LD** — all `application/ld+json` emission in `apps/web` goes through `serializeJsonLd` via `JsonLdScript`; CI `check:json-ld-escape` blocks raw `JSON.stringify` in ld+json files.
2. **Listing detail** — `RealEstateListing` from `@easycasa/shared` `buildRealEstateListing` (honest `datePosted`, seller PII guard).
3. **Sell-privately** — `FAQPage` + `Service` built from G4-approved i18n only (`sell-privately-schema.ts`); ES slug `/vender-entre-particulares` via rewrites + hreflang.
4. **Sitemap** — sell-privately per locale; static `lastmod` from content-change dates (not build `now`); listings use API `updated_at`; `/seller/enquiries` excluded while inbox flag is dark.

## Supersedes

This document replaces the pre-dispatch HOLD brief. Pre-staged builders remain in `packages/shared/src/structured-data/`.

## Lighthouse (operator)

CI does not run Lighthouse. From repo root with web dev/prod reachable:

```bash
npx lighthouse https://easycasaita.com/it --only-categories=seo --output=json --quiet
npx lighthouse https://easycasaita.com/it/vendi-da-privato --only-categories=seo --output=json --quiet
npx lighthouse https://easycasaita.com/it/listings/<published-slug> --only-categories=seo --output=json --quiet
```

Target: SEO category ≥ 95 on home, sell-privately, and one live listing page.
=======
/**
 * EC-S-T33 — G7 cleared (`NEXT_PUBLIC_DEMO_MODE=false` on VPS, web rebuilt
 * 2026-08-13). Still HOLD until T33 is **explicitly dispatched** — do not wire
 * Next on opportunistic drive-bys.
 *
 * Pre-validated artifact landed in `@easycasa/shared` (`structured-data/`) with
 * injection-safety tests under `apps/api/src/seo/structured-data.spec.ts`.
 * On dispatch: replace `apps/web/src/components/StructuredData.tsx` raw
 * stringify; extend sitemap / hreflang honesty.
 *
 * Brief (summary):
 * 1. JSON-LD via `serializeJsonLd` only (never raw JSON.stringify into ld+json).
 * 2. Sitemap: three sell-privately locales + published listings with honest lastmod.
 * 3. hreflang audit (T01 carryover).
 * 4. Content cluster from G4-approved claims only.
 */
>>>>>>> origin/cursor/ecs-g7-demo-mode-off-6d4e
