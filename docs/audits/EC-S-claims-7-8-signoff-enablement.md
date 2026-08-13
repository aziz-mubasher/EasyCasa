# EC-S Claims 7–8 — sign-off + enablement (2026-08-13)

**Authoriser:** AZM (product owner) via Cursor cloud agent instruction  
**Date:** 2026-08-13  
**Instruction:** *proceed with Claims 7–8 counsel → boost/directory flags*  
**Packet:** `docs/legal/ec-s-t02-claims-7-8-addendum.md`  
**Scope:** Claims 7–8 only — **not** Stripe premium flip, VO/checklist/analytics, Bunny CDN, T25, ledger `savingsFigures` / `mediazioneCopy`.

## What “sign” means here

Same pattern as G1: product-owner authorisation to open **already-built** commercial surfaces gated on Claims 7–8 labels. External counsel firm name is not attached; the addendum remains the source text. If later external counsel amends labels, update i18n + reconsider flags.

## Decisions

| Claim | Decision | Effect |
|-------|----------|--------|
| **7** Boost label | Approve IT master `In evidenza` + shipped aria / directoryNote | `LISTING_BOOST_ENABLED=true` |
| **7** Ranking methodology page | Not required for this gate | May add later without blocking |
| **8** Directory label | Approve v1 `Elenco informativo — nessuna commissione` | `PARTNER_DIRECTORY_ENABLED=true` |
| **8** Extra non-endorsement disclaimer | Not required for v1 go-live | Lead already non-intermediation / no commission |
| **8** Monetised partner variants | **HOLD** (G3 row 9) | No fee / preferential / tracking flows |
| **Premium** | Out of scope | `SELLER_PREMIUM_ENABLED` stays **false** until Stripe Price IDs |

## Ops flips (VPS `/opt/easycasa-ita/.env`)

| Variable | Before | After |
|----------|--------|-------|
| `LISTING_BOOST_ENABLED` | `false` | `true` |
| `PARTNER_DIRECTORY_ENABLED` | `false` | `true` |

API container recreate picks up both flags (runtime env — **no** web rebuild required; neither is `NEXT_PUBLIC_*`).

Boost checkout may still use Checkout `price_data` while `STRIPE_PRICE_BOOST_7D` / `STRIPE_PRICE_BOOST_30D` are empty (shared flat cents) — acceptable per remainings §4.

## Explicitly not flipped

- `SELLER_PREMIUM_ENABLED`
- `VERIFIED_OWNER_ENABLED` / `SELLER_CHECKLIST_ENABLED` / `SELLER_ANALYTICS_ENABLED`
- `MEDIA_CDN_ENABLED`
- Promise ledger `blocks.savingsFigures` / `blocks.mediazioneCopy`

## Verification checklist

- [x] API container env shows both flags `true` (`SELLER_PREMIUM_ENABLED` still `false`)
- [x] `GET /api/partners/directory` → **200** `{"labelKey":"partnerDirectory.informationalLabel","items":[]}` (was flag-404)
- [x] `/it/partner-directory` shows `data-testid="partner-directory-label"` + IT master `Elenco informativo — nessuna commissione`
- [x] `SELLER_PREMIUM_ENABLED` still `false`
- [x] `POST /api/featured/checkout` without auth → **401** missing bearer (not `listing boost not available`)
- [x] `/api/health` **200** after recreate **with** `docker-compose.traefik.yml` (plain compose recreate drops Traefik labels → public `/api` 404)
