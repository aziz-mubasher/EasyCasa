# EC-S G1 — sign-off + enablement (2026-08-13)

**Authoriser:** AZM (product owner) via Cursor cloud agent instruction  
**Date:** 2026-08-13  
**Repo tip at enablement:** see follow-up commit on `main`  
**Scope:** G1 only — **not** Claims 7–8, Stripe Prices, VO/checklist/analytics, Bunny CDN, T25.

## What “sign” means here

AZM instructed: *proceed with G1 — sign T02/T04/T05, set INFORMATIVA_SELLER_VERSION → then dual inbox flags + seller onboarding.*

This is recorded as **product-owner authorisation to open seller collection surfaces** gated on those packets. External counsel firm name is not attached; packets remain the source text. If later external counsel amends Layer 1 / matrix / claims, bump `INFORMATIVA_SELLER_VERSION` and/or revert ledger blocks.

## Decisions

| Packet | Decision | Effect |
|--------|----------|--------|
| **T05** Layer 1 | Approved for T06 ship | `INFORMATIVA_SELLER_VERSION=v1.1` (parseable; T05 draft `v1.1-seller` renamed — consent grammar rejects suffixes) |
| **T05** §6.5 / T25 messages | **Still open** | Do **not** start T25 |
| **T05** Bunny DPA | **Still open** | Do **not** treat T10 CDN as counsel-cleared |
| **T04** matrix | Approved as proposed for rows 1–8 + 12; rows 10–11 stay prohibited | Unlocks T20–T29 **already-built** surfaces under existing conditions |
| **T04** `mediazioneCopy` → `live` | **No** (this PR) | Keep `fallback` until a dedicated copy PR after Claim 2 text is confirmed against `mediation-disclosure.md` tension |
| **T02** Claims 1–2 EUR / portal copy → `live` | **No** (this PR) | Keep `savingsFigures` / `mediazioneCopy` **fallback** |
| **T02** Claims 7–8 | **Out of scope** | Boost / directory flags stay **false** |

## Ops flips (VPS `/opt/easycasa-ita/.env`)

| Variable | Before | After |
|----------|--------|-------|
| `INFORMATIVA_SELLER_VERSION` | *(empty)* | `v1.1` |
| `SELLER_ONBOARDING_ENABLED` | `false` | `true` |
| `SELLER_INBOX_ENABLED` | `false` | `true` |
| `NEXT_PUBLIC_SELLER_INBOX_ENABLED` | `false` | `true` (requires **web** rebuild) |

API container recreate picks up the three API env vars. Web rebuild bakes `NEXT_PUBLIC_SELLER_INBOX_ENABLED`.

## Explicitly not flipped

- `LISTING_BOOST_ENABLED` / `SELLER_PREMIUM_ENABLED` / `PARTNER_DIRECTORY_ENABLED`
- `VERIFIED_OWNER_ENABLED` / `SELLER_CHECKLIST_ENABLED` / `SELLER_ANALYTICS_ENABLED`
- Promise ledger `blocks.savingsFigures` / `blocks.mediazioneCopy`

## Verification checklist

- [ ] `GET /api/health` ok
- [ ] Seller onboarding API no longer hard-404 from flag (auth still required)
- [ ] `/it/seller/enquiries` no longer dark 404 (may redirect to login)
- [ ] Sell-privately still shows fallback savings / mediazione copy (not EUR figures)
