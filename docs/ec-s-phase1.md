# EC-S Phase 1 — Listing creation & genuineness (T06–T12)

**Status:** Engineering foundation landed 2026-08-10.  
**Artifacts:** Claude `phase1/` directory was **not** attached to the agent workspace; `listingWizard` and `dupdetect` were rebuilt from brief ACs (tests green). Prefer replacing with the validated Claude packages when available.

## Task status

| Task | Status | Notes |
|------|--------|-------|
| T06 Seller onboarding | ✅ Build, ⛔ enable-gated | `SELLER_ONBOARDING_ENABLED=false`; `INFORMATIVA_SELLER_VERSION` required for insert |
| T07 Listing wizard machine | ✅ | `@easycasa/shared` listing-wizard + web vitest; `listing_draft` autosave API |
| T08 OMI zone resolve | ✅ | `GET /omi/zone`, `POST /omi/resolve` on `omi_zone_polygons` GiST |
| T09 OMI pricing panel | ✅ | Observation-only copy; CI grep `scripts/check-omi-price-copy.sh`; **P2 → live** |
| T10 Photo pipeline | ✅ partial | EXIF strip + content-addressed `media/{aa}/{sha}.webp`; `MEDIA_CDN_ENABLED=false` |
| T11 AI descriptions | ✅ | `POST /ai/v1/listing-description` + guardrail validator |
| T12 Dupdetect | ✅ | `services/ai/app/dupdetect` + Nest ingest hook (flag-only enforce) |

## Env (see `.env.example` / `docs/env.md`)

- `SELLER_ONBOARDING_ENABLED` (default false)
- `INFORMATIVA_SELLER_VERSION` (empty ⇒ refuse profile insert)
- `MEDIA_CDN_ENABLED` (default false — Bunny DPA gate)
- `IMAGE_DUPDETECT_ENFORCE` (default false — first-week flag-only)
- `NOMINATIM_URL` / `GEOCODER_USER_AGENT` (runtime geocode for T08)

## Migration

`migration/sql/0049_ecs_phase1_seller_listing.sql` — `seller_profile`, `listing_draft`, media hash columns, `moderation_events`.

## Enable gates (human)

1. Counsel/DPO signs T05 Layer 1 → set `INFORMATIVA_SELLER_VERSION` → `SELLER_ONBOARDING_ENABLED=true`
2. Bunny DPA → `MEDIA_CDN_ENABLED=true` (then `MEDIA_ORIGIN=bunny` allowed)
3. Calibrate T12 on real photos → `IMAGE_DUPDETECT_ENFORCE=true`
