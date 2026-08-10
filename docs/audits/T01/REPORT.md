# EC-S-T01 verification pack — 2026-08-10

Runtime checks against production (`easycasaita.com`) after deploy `ad602de`.

## Results

| # | Check | Result | Notes |
|---|-------|--------|-------|
| 1 | Lighthouse mobile **Performance ≥ 90** | **PASS** | IT 91 · EN 93 · ES 93. Reports in this folder (pre-redeploy URLs; Perf already ≥90). |
| 1b | Lighthouse SEO category | **FAIL** | Score 66 — `meta robots=noindex` because VPS `NEXT_PUBLIC_DEMO_MODE=true`. Assertion not weakened. |
| 2 | hreflang it/en/es + **x-default**; self-canonical; sitemap | **PASS** | Live head uses `hrefLang`; all four present; ES `/vender-entre-particulares`; legacy 308 → new; sitemap counts OK. |
| 3 | No € while `blocks.savingsFigures === "fallback"` | **PASS** | No `€` / 7.500–9.150 in body HTML (scripts stripped). |
| 3b | `mediazioneCopy === "fallback"` neutral variant | **PASS** | “Clear roles…” / “Ruoli chiari…” / “Roles claros…” rendered. |
| 4 | No hardcoded availability strings in app/src TS/TSX | **PASS** | Labels only via next-intl messages. |
| 5 | Footer link home/search all locales | **PASS** | Listing detail pages omit site footer by design (`isListingLandingPath`). |
| 6 | FAQPage + Service JSON-LD | **PASS** | Structural required fields OK (`schema-extract.json`). |
| 7 | Chip `role="status"` + aria-label; contrast ≥ 4.5:1 | **PASS** | Live markup has `role="status"`; chip colors updated to AA pairs. |

## Lighthouse (mobile)

| URL | Perf | A11y | BP | SEO |
|-----|------|------|----|-----|
| `/it/vendi-da-privato` | 91 | 92 | 100 | 66 |
| `/en/sell-privately` | 93 | 92 | 100 | 66 |
| `/es/vender-como-particular` (legacy, pre-redirect) | 93 | 92 | 100 | 66 |

## Ops blocker

**`NEXT_PUBLIC_DEMO_MODE=true` on VPS** → sitewide `noindex`. Unset and rebuild web before closing T33 SEO.

## T03 note

`phase0/T03_promise_ledger/` was not present in the agent workspace. Equivalent module landed at `apps/web/src/lib/promiseLedger/` with build-time `validateLedger` in `next.config.mjs` and vitest `promiseLedger.test.ts` (T02/T04 interim guards).
