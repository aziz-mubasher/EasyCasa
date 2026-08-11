/**
 * EC-S-T33 — HOLD until G7 (`NEXT_PUBLIC_DEMO_MODE` unset).
 *
 * Pre-validated artifact landed in `@easycasa/shared` (`structured-data/`) with
 * injection-safety tests under `apps/api/src/seo/structured-data.spec.ts`.
 * Do **not** replace `apps/web/src/components/StructuredData.tsx` or extend
 * sitemap / hreflang until ops unsets demo mode and T33 is explicitly dispatched.
 *
 * Brief (summary):
 * 1. JSON-LD via `serializeJsonLd` only (never raw JSON.stringify into ld+json).
 * 2. Sitemap: three sell-privately locales + published listings with honest lastmod.
 * 3. hreflang audit (T01 carryover).
 * 4. Content cluster from G4-approved claims only.
 */
