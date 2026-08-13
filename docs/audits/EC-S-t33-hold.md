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
