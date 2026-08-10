# EC-S Roadmap v2 — Private Seller Track

**33 numbered tasks.** Source of truth for promise-ledger flips.  
Page/spec implementation: `docs/sell-privately.md` · ledger: `apps/web/src/config/sell-privately/promises.json`.

## Status delta — 2026-08-10

| Item | Status |
|------|--------|
| **T01** | ✅ Built — Next 14 + next-intl; locale URLs via Next rewrites; scoped CSS; IT+EN+ES; live on VPS |
| **T03** | ✅ Ledger + chips shipped with T01 (`promises.json` + `StatusChip`) |
| **T31** | ⤵ Rescoped — page i18n done; remaining = wizard + dashboard only |
| **T02 / T04** | ⛔ Counsel packet ready — `docs/legal/ec-s-t02-counsel-review-packet.md` + `docs/legal/T04_mediazione_boundary.md`. Interim: `blocks.savingsFigures` / `mediazioneCopy` = `fallback` (enforced by `validateLedger`) |
| **T03** | ✅ `apps/web/src/lib/promiseLedger` + build-time validation (package handoff not in repo; implemented from integration note) |
| **T33** | ⚠ Partial — canonical/hreflang/x-default/sitemap OK after verification pack; Lighthouse Perf ≥90 PASS; SEO category FAIL while `NEXT_PUBLIC_DEMO_MODE=true` |

**Rule:** the page may promise only what the ledger marks `live`. Flip a flag only when its tasks pass validation gates.

## Phase 0 — Page + compliance (ship first)

| # | Task | Fulfils | Depends | Status |
|---|------|---------|---------|--------|
| T01 | Build “Vendi da privato” page + footer link | P1–P8 as promises | T03 | ✅ |
| T02 | Counsel: savings figures, zero commission, B4A disclosure, mediazione wording | page deploy gate | — | ⛔ packet ready |
| T03 | Promise-ledger config + live/coming chip | honesty mechanic | — | ✅ |
| T04 | Mediazione boundary doc (portal vs mediatore, L. 39/1989) | P8; gate for T20–T29 | counsel | ⛔ matrix template ready |
| T05 | Seller-data legal memo + informativa extension | P8 | counsel packet | ☐ |

**Phase 0 exit:** page live with P1/P8 `live`, P4/P5 `live` where EC-1/EC-3–7 cover them, else `coming`. *(Met in ledger; counsel gates keep figures/boundary copy off.)*

## Phase 1 — Listing creation & genuineness → P2, P6, parts of P3

| # | Task | Fulfils | Depends |
|---|------|---------|---------|
| T06 | Seller role + onboarding (Keycloak, profile, T05 acceptance) | P8 | T05 |
| T07 | Guided listing wizard UI | P1 | T06 |
| T08 | Address → OMI zone resolution | P2 | OMI importer |
| T09 | OMI pricing panel in wizard | P2 | T08, T04 |
| T10 | Photo pipeline (EXIF strip → MinIO → CDN) | P3 | infra |
| T11 | AI description IT/EN from structured facts | P1 | T07 |
| T12 | Duplicate/scraped-image detection | P3 | T10 |
| T13 | Draft autosave + publish/unpublish | P1 | T07 |

## Phase 2 — Trust & verification → P3

| # | Task | Fulfils | Depends |
|---|------|---------|---------|
| T14 | Verified Owner upload + state machine | P3 | T06, T10 |
| T15 | Moderation queue + admin UI | P3 | T14 |
| T16 | Owner-name match logic | P3 | T14 |
| T17 | Listing-card trust signals | P3, P6 | T14, T18 |
| T18 | Document checklist engine | P6 | T10 |
| T19 | Abuse controls | P3 | T12 |

## Phase 3 — Seller dashboard → P4 seller-side, P5, P7

| # | Task | Fulfils | Depends |
|---|------|---------|---------|
| T20 | Enquiry inbox + Verified Buyer badge | P4 | T06, T04 |
| T21 | Seller-as-conductor viewings | P5 | T20 |
| T22 | Open-house mode | P5 | T21 |
| T23 | Listing analytics | P7 | T09, T13 |
| T24 | Price-adjustment nudges | P7 | T23 |
| T25 | In-portal messaging | P8 | T20 |

## Phase 4 — Monetisation + cross-cutting

| # | Task | Fulfils | Depends |
|---|------|---------|---------|
| T26 | Featured/boosted listing (Stripe) | P1 sustainability | T13 |
| T27 | Premium seller tier | P1 sustainability | T23, T15 |
| T28 | Partner directory (notaio/geometra/APE) | P6 | T04 |
| T29 | Pro media package referral | P3 | T10 |
| T30 | Consent-ledger seller consents | P8 | T05 |
| T31 | i18n wizard + dashboard (page done) | all | T01, T07 |
| T32 | Consolidation / cross-module tests | all | end of P3 |
| T33 | SEO harden (schema, sitemap, Lighthouse) | P1 reach | T01 |

## Promise → task traceability

| Promise | Goes `live` after |
|---------|-------------------|
| P1 Zero commission | T01 (launch); sustained by T26–T27 |
| P2 OMI price guidance | T08 + T09 |
| P3 Verified Owner | T14 + T15 + T16 + T17 |
| P4 Verified buyers | EC-1 live; seller inbox T20 |
| P5 Viewing scheduler | EC-3–7 live; seller-conducted T21 (+T22) |
| P6 Document checklist | T18 (+T17) |
| P7 Seller dashboard | T23 (+T24) |
| P8 Control & data protection | T05 + T06 + T25 + T30 (baseline live at T01) |

## Suggested delivery order

T02–T05 (counsel first) → T06–T13 → T14–T19 → T20–T25 → T26–T33, with T32 before the last ledger flips.
