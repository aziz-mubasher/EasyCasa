# EC-S Phase 1 (T06–T12) — R&D Feedback for Claude

**Date:** 2026-08-10  
**Branch:** `cursor/ecs-phase1-listing-genuineness-6d4e`  
**Doc:** `docs/ec-s-phase1.md`

## 1. BRIEF ADHERENCE

**Implemented**
- T06 seller onboarding (flag-gated 404), `seller_profile` + DB CHECK, informativa version gate
- T07 wizard machine in `@easycasa/shared` + draft autosave API (`listing_draft`)
- T08 `GET /omi/zone`, `POST /omi/resolve` on existing `omi_zone_polygons` GiST
- T09 OMI band + observation-only panel + CI forbidden-token grep; **P2 → live**
- T10 EXIF-strip path, content-addressed `media/{aa}/{sha}.webp`, 25MB cap, `MEDIA_CDN_ENABLED` Bunny gate
- T11 `POST /ai/v1/listing-description` with forbidden-token / price / numeric validators
- T12 `dupdetect` module + Nest ingest hook + `moderation_events` (enforce flag default off)

**Deviated**
- Claude `phase1/` artifacts **not in workspace** — rebuilt listingWizard + dupdetect from ACs (not bit-identical to your 13/17 validated packages)
- OMI SQL adapted to repo tables (`omi_zone_polygons` / `omi_quotes`), not brief’s assumed `omi_zones`
- Wizard source lives in `@easycasa/shared` (API+web), web keeps vitest suite
- Full guided wizard UI not replacing `/add` yet — machine + API + OmiPricePanel landed; wire into a dedicated page next
- HEIC accept/transcode variants (400/800/1600) not fully shipped — sharp webp master + edge cap remains; variants follow-up
- Keycloak self-assign realm role `seller` not automated (app `users.role` promoted; JWT still from Keycloak)

**Skipped / partial**
- e2e “flag off ⇒ zero seller routes” browser test (unit guard coverage only)
- Visual ochre/mono screenshot test (inline styles + unit math only)
- Real-photo T12 calibration / 20-interior canary (synthetic pytest only)

## 2. WHERE THE BRIEF FAILED YOU

- **Missing attach:** `phase1/` never reached the cloud VM despite workspace rule — agents cannot see Claude Desktop paths
- **Assumed schema names** for OMI / tables — must map to existing PostGIS polygons
- **Over-specified SQL** that doesn’t match drizzle/migration history (`0048` already used by aste pipeline → used `0049`)
- T07 agent branch accidentally pulled unrelated aste pipeline into history (merged; coexistence OK)

## 3. REPO REALITY CHECK

- pnpm monorepo; Nest API; Next 14; FastAPI AI; Traefik VPS
- Seller capability already maps from Keycloak `seller` role (`@easycasa/shared` authority)
- Media pipeline already EXIF-stripped via sharp; Bunny path exists behind new `MEDIA_CDN_ENABLED`
- Consent ledger Contatta pattern reused for optional marketing only
- EC-11 route authority static scan requires `@Roles` **above** `@Get`/`@Post`

## 4. EFFORT SIGNAL

Larger than one PR’s worth — correctly a batch, but UI wiring + HEIC variants + Keycloak role assign should be follow-ups. Foundation is the right first land.

## 5. BLOCKED / HUMAN

1. Attach validated `phase1/` packages for golden-file replace if bit-exactness matters  
2. Sign T05 Layer 1 → set `INFORMATIVA_SELLER_VERSION` → `SELLER_ONBOARDING_ENABLED=true`  
3. Bunny DPA → `MEDIA_CDN_ENABLED=true`  
4. Calibrate T12 → `IMAGE_DUPDETECT_ENFORCE=true`  
5. Apply migration `0049` on VPS before enabling flags  

## 6. NEXT TASK SHOULD ACCOUNT FOR

- Replace rebuilt machines with attached artifacts if they differ  
- Dedicated seller wizard page consuming `WIZARD_STEPS` + draft API + OmiPricePanel  
- HEIC + multi-variant webp sizes  
- Keycloak admin API or account console for realm role `seller` self-assign  
- Consolidation checkpoint: wizard × photos × dup × autosave before more ledger flips  
- Do not flip counsel blocks; P2 already live
