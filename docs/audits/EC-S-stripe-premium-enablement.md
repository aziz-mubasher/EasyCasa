# EC-S Stripe Prices + premium enablement (2026-08-13)

**Authoriser:** AZM via Cursor cloud agent instruction — *Stripe Price IDs → then premium flip*  
**Date:** 2026-08-13  
**Scope:** Live Stripe Price IDs for `seller_premium` (+ optional boost 7d/30d) and `SELLER_PREMIUM_ENABLED=true`.  
**Out of scope:** ledger Claim 1–2 `live` flip; VO/checklist/analytics; Bunny CDN; T25; G3 row 9.

## Stripe artefacts (live mode)

| Artefact | Amount | ID |
|----------|--------|-----|
| Product EasyCasa Seller Premium | — | `prod_V4CZVLqh188R2G` |
| Price seller_premium (recurring month) | €19.00 | `price_1U44AmD5t2lALalH3Eqsty9C` |
| Product Listing Boost 7 days | — | `prod_V4CZI4F6tdvWfI` |
| Price boost 7d (one-time) | €9.90 | `price_1U44AnD5t2lALalHcHfZQVX1` |
| Product Listing Boost 30 days | — | `prod_V4CZLpgzu3lzf6` |
| Price boost 30d (one-time) | €24.90 | `price_1U44AnD5t2lALalHU0iVkxk6` |

Flat-fee / success-independent (T04 row 8). Tax behavior `exclusive` (Checkout still uses `automatic_tax` + VAT ID collection).

## Ops flips (VPS `/opt/easycasa-ita`)

| Target | Before | After |
|--------|--------|-------|
| `plans.stripe_price_id` where `key=seller_premium` | empty | `price_1U44AmD5t2lALalH3Eqsty9C` |
| `SELLER_PREMIUM_ENABLED` | `false` | `true` |
| `STRIPE_PRICE_BOOST_7D` | empty | `price_1U44AnD5t2lALalHcHfZQVX1` |
| `STRIPE_PRICE_BOOST_30D` | empty | `price_1U44AnD5t2lALalHU0iVkxk6` |

API recreated with **both** `infra/docker-compose.yml` + `infra/docker-compose.traefik.yml`.

## Verification checklist

- [x] `GET /api/billing/plans` lists `seller_premium` with `stripePriceId` + `priceCents=1900`
- [x] Container env: `SELLER_PREMIUM_ENABLED=true` + both boost Price IDs
- [x] `GET /api/seller/entitlements` unauth → **401** (not flag-404 `seller premium not available`)
- [x] `POST /api/billing/checkout` `{planKey:seller_premium}` unauth → **401**
- [x] Partner directory / boost flags still on; health 200
