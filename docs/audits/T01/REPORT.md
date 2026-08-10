# EC-S-T01 verification pack — 2026-08-10

Runtime checks against production (`easycasaita.com`) and post-fix branch.

## Results

| # | Check | Result | Notes |
|---|-------|--------|-------|
| 1 | Lighthouse mobile **Performance ≥ 90** | **PASS** | IT 91 · EN 93 · ES 93. Reports in this folder. |
| 1b | Lighthouse SEO category | **FAIL** | Score 66 — page emits `noindex,nofollow` because VPS `NEXT_PUBLIC_DEMO_MODE=true`. Not weakened. |
| 2 | hreflang it/en/es + **x-default**; self-canonical; sitemap paths | **PASS*** | *After this deploy:* x-default added; ES canonical `/es/vender-entre-particulares` (+ redirect from legacy). Pre-fix: it/en/es + self-canonical + sitemap OK; x-default missing. |
| 3 | No € figures while `blocks.savingsFigures === "fallback"` | **PASS** | Neutral body only; figure/slider/AGCM not rendered. |
| 3b | `mediazioneCopy === "fallback"` neutral variant | **PASS*** | *After this deploy:* fallback “clear roles” copy. Pre-fix: block was fully hidden (also compliant with interim). |
| 4 | No hardcoded In arrivo / Coming soon / Próximamente in `app/`+`src` TS/TSX | **PASS** | Only via next-intl message keys (`sellPrivately.tags`, `forBuyers.tags`, aste messages). |
| 5 | Footer link on home/search (all locales) | **PASS** | Listing detail pages intentionally omit site footer (`isListingLandingPath`) — N/A by chrome design. |
| 6 | FAQPage + Service JSON-LD structure | **PASS** | Both `@type` present; FAQ has 7 Questions; Service has Offer price 0 EUR. See schema note below. |
| 7 | Chip `role="status"` + aria-label; contrast ≥ 4.5:1 | **PASS*** | *After this deploy.* Pre-fix LH a11y failed `color-contrast` on `.sp-chip--live/coming`. |

\* Requires redeploy of this branch to be true on production.

## Lighthouse (mobile, production, pre-redeploy)

| URL | Perf | A11y | BP | SEO |
|-----|------|------|----|-----|
| `/it/vendi-da-privato` | 91 | 92 | 100 | 66 |
| `/en/sell-privately` | 93 | 92 | 100 | 66 |
| `/es/vender-como-particular` (legacy) | 93 | 92 | 100 | 66 |

Files: `*-report.json` / `*-report.html` in this directory.

## Schema.org

Extracted JSON-LD from live HTML. Types `Service` and `FAQPage` are valid shapes for schema.org.  
Automated POST to validator.schema.org was not used (no public machine API); structure asserted in `docs/audits/T01/schema-extract.json`.

## Blockers / ops

1. **`NEXT_PUBLIC_DEMO_MODE=true` on VPS** → global `noindex`. Flip to unset/`false` and rebuild web before treating T33 SEO as done.
2. T03 package path `phase0/T03_promise_ledger/` was **not** in the workspace; implemented equivalent `apps/web/src/lib/promiseLedger/` + build-time `validateLedger` in `next.config.mjs` from the integration note.
