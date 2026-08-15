# EC-S PK-4 — Bunny CDN enablement (2026-08-15)

**Authoriser:** AZM via Cursor — *proceed with pk 4*  
**Kaizen:** K EC 1.55 · **Polish gate:** PK-4  
**Scope:** `MEDIA_CDN_ENABLED=true` + eng dual-store so VO/checklist stay on MinIO  
**Companion:** `docs/media-hosting.md`

**VPS tip:** `59295f6` on `main` (2026-08-15).

## Go/no-go record

| # | Precondition | Record |
|---|--------------|--------|
| 1 | Bunny.net DPA | **NOT EVIDENCED** — AZM “proceed” only; no countersigned DPA cited. Gap record: `docs/audits/EC-S-pk4-dpa-gap.md`. T05 §4 remains open. |
| 2 | Pull Zone / storage | Live zone `easycasaita`; CDN host **`https://easycasa1.b-cdn.net`** (custom `cdn.easycasaita.com` SSL broken — do not switch until cert fixed). |
| 3 | Private docs stay off CDN | Eng fix: dedicated MinIO client for `users/` (`resolveMinioObjectStorage` + `putPrivateUserDoc`). |
| 4 | Listing upload path | `POST /api/media/upload` → Bunny HTTP PUT → `media.url` on CDN. |

## Decisions

| Item | Decision | Effect |
|------|----------|--------|
| Listing CDN (T10) | **Enable now** | `MEDIA_CDN_ENABLED=true` with existing `MEDIA_ORIGIN=bunny` |
| VO / checklist storage | **Stay MinIO** | Never write `users/` to Bunny |
| Custom CDN hostname | **Defer** | Keep `easycasa1.b-cdn.net` |
| CDN purge / Optimizer whitelist | **Not in PK-4** | Still open in `docs/media-hosting.md` |

## Ops flips (VPS `/opt/easycasa-ita/.env`)

| Variable | Before | After |
|----------|--------|-------|
| `MEDIA_CDN_ENABLED` | `false` | **`true`** |
| `MEDIA_ORIGIN` | `bunny` | unchanged |
| `BUNNY_CDN_BASE` / `MEDIA_PUBLIC_BASE` | `https://easycasa1.b-cdn.net` | unchanged |
| `MEDIA_PRIVATE_BASE` | `https://easycasaita.com/api/media/file` | unchanged |

### Apply (Traefik pair)

```bash
cd /opt/easycasa-ita
git fetch origin main && git checkout main && git pull origin main
sed -i 's/^MEDIA_CDN_ENABLED=.*/MEDIA_CDN_ENABLED=true/' .env
docker compose -f infra/docker-compose.yml -f infra/docker-compose.traefik.yml --env-file .env build api
docker compose -f infra/docker-compose.yml -f infra/docker-compose.traefik.yml --env-file .env \
  up -d --no-deps --force-recreate api
```

## Eng (same PR / tip)

1. `putPrivateUserDoc` / `getObject(users/)` / `deletePrivateUserDoc` always use MinIO.
2. `toPgInt64OrNull` — AI perceptual hashes outside Postgres signed bigint fail-soft (surfaced on first CDN upload smoke).

## Verification

| Check | Expected | Result |
|-------|----------|--------|
| Container `MEDIA_CDN_ENABLED` | `true` | **true** |
| Existing CDN object | **200** image/webp | **PASS** |
| Auth `POST /media/upload` | **201** + URL on `easycasa1.b-cdn.net` | **PASS** |
| CDN fetch of new object | **200** | **PASS** |
| Auth VO submit | **201** `submitted`; `docKeys` under `users/` | **PASS** |
| Private leak check (VO+checklist) | CDN ≠200; unauth API 401; auth 200; MinIO present | **PASS** — `docs/audits/EC-S-pk4-private-doc-leak-check.md` |
| Regression VO/checklist gates | still **401** unauth | unchanged |

Artifacts:
- `/opt/cursor/artifacts/pk4_cdn_flag_verify.log`
- `/opt/cursor/artifacts/pk4_authenticated_cdn_smoke.log` (`PK4_AUTH_SMOKE_COMPLETE`)
- `/opt/cursor/artifacts/pk4_private_doc_leak_check.log` (`PK4_PRIVATE_DOC_LEAK_CHECK_PASS`)
- `/opt/cursor/artifacts/pk4_object_storage_unit.log`

## DPA gap

CDN is **ops-live** without cited countersigned DPA. Do not treat T10 as counsel-cleared. Options: evidence DPA, rollback flag, or accept residual risk — `docs/audits/EC-S-pk4-dpa-gap.md`.

## Rollback

```bash
sed -i 's/^MEDIA_CDN_ENABLED=.*/MEDIA_CDN_ENABLED=false/' .env
# recreate api (Traefik pair) — new listing writes fall back to MinIO
```

Existing Bunny URLs keep working via Pull Zone.
