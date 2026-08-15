# EC-S PK-2 — document checklist enablement (2026-08-14)

**Authoriser:** AZM (product owner) — enable checklist **now**; keep Verified Owner **dark** until moderation capacity confirmed  
**Kaizen:** K EC 1.52 · **Polish gate:** PK-2  
**Scope:** `SELLER_CHECKLIST_ENABLED` + P6 ledger live only — **not** VO (`VERIFIED_OWNER_ENABLED`), P3, analytics, CDN, T25, T19.2  
**Companion runbook (prepare only):** `docs/runbooks/ec-s-vo-enablement.md` (PK-1)

**VPS deploy tip:** `6e1a468` on `main` (2026-08-14T19:13Z).

## Decisions

| Item | Decision | Effect |
|------|----------|--------|
| Document checklist (T18 / P6) | **Enable now** | `SELLER_CHECKLIST_ENABLED=true` + P6 `coming` → `live` |
| Verified Owner (T14–T17 / P3) | **Stay dark** | `VERIFIED_OWNER_ENABLED=false`; P3 remains `coming` |
| Web `NEXT_PUBLIC_*` | **None added in PP-6** | Checklist gating is API runtime only — **no web rebuild for the flag** |
| Sell-privately ledger P6 | **Web rebuild required** | `promises.json` is bundled at Next build — rebuild **web** after ledger flip |

## Ops flips (VPS `/opt/easycasa-ita/.env`)

| Variable | Before | After |
|----------|--------|-------|
| `SELLER_CHECKLIST_ENABLED` | `false` | **`true`** |
| `VERIFIED_OWNER_ENABLED` | `false` | **`false`** (unchanged) |

### Apply (Traefik pair — mandatory)

```bash
cd /opt/easycasa-ita
# 1) Ledger + code on tip (after main merge)
git fetch origin main && git checkout main && git pull origin main

# 2) Flip checklist flag only
sed -i 's/^SELLER_CHECKLIST_ENABLED=false/SELLER_CHECKLIST_ENABLED=true/' .env
grep -E '^(SELLER_CHECKLIST|VERIFIED_OWNER)_ENABLED' .env

# 3) Rebuild web (P6 ledger) + recreate api (runtime flag)
docker compose -f infra/docker-compose.yml -f infra/docker-compose.traefik.yml --env-file .env \
  build --no-cache web
docker compose -f infra/docker-compose.yml -f infra/docker-compose.traefik.yml --env-file .env \
  up -d --no-deps --force-recreate web api

# 4) Confirm container env
docker compose -f infra/docker-compose.yml -f infra/docker-compose.traefik.yml --env-file .env \
  exec -T api printenv SELLER_CHECKLIST_ENABLED VERIFIED_OWNER_ENABLED
```

**Why web rebuild:** `apps/web/src/config/sell-privately/promises.json` is statically imported (`next.config.mjs` validates at build; `SellPrivatelyPage` reads ledger at bundle time). Runtime `.env` alone does not change P6 chip on `/vendi-da-privato`.

**Why no web rebuild for the flag:** PP-6 did not add `NEXT_PUBLIC_SELLER_CHECKLIST_ENABLED`. Seller surfaces read `flags.sellerChecklistEnabled` from `GET /api/seller/listings` (API config at recreate).

## Ledger flip (repo)

| Item | Before | After |
|------|--------|-------|
| `promises.P6.state` | `coming` | **`live`** |
| `promises.P3.state` | `coming` | `coming` (unchanged) |
| `blocks.savingsFigures` / `mediazioneCopy` | `live` | unchanged |

Protocol: `promises.json` + `sell-privately.spec.ts` + `promiseLedger.test.ts` (validators unchanged — P6 `live` is valid).

## Verification checklist (production smoke)

| Check | Expected | Result |
|-------|----------|--------|
| Container `SELLER_CHECKLIST_ENABLED` | `true` | **true** (2026-08-14 deploy) |
| Container `VERIFIED_OWNER_ENABLED` | `false` | **false** (unchanged) |
| `GET /api/health` | **200** | **200** |
| `GET /api/seller/checklist/:listingId` unauth | **401** (not flag-404) | **401** |
| `GET /api/seller/vo/:listingId` unauth | **401** (JWT before flag guard; flag still off) | **401** |
| `GET /api/seller/vo` (no listing id) | **404** | **404** |
| `/it/vendi-da-privato` no-script HTML — P6 tile | `Attivo` + `Checklist documenti` | **PASS** — `sp-chip--live` + `Attivo` on P6 tile |
| Claim 1–2 regression | EUR savings + portal copy still present | **PASS** — `7.500` + portale copy in no-script HTML |
| Authenticated seller `GET /api/seller/checklist/:id` | empty score `0/4` | **PASS** (2026-08-15) — listing `f05d1508-…` |
| Authenticated `POST …/docs` (APE PDF) | score → `1/4`, completeness 25 | **PASS** — **201**; private `docKey` under `users/…/docs/checklist/…` |
| Seller listings card `docScore` | `{ have: 1, total: 4 }` when flag on | **PASS** — `trust.docScore` + `flags.sellerChecklistEnabled=true` |
| Page `/it/seller/listings/<id>/documents` | SSR loads | **PASS** — **200** |
| Private docs | no public URL / no `docKey` on public listing | **PASS** — public API + `/it/listings/<slug>` lack private key |
| Cleanup | ownership restored; KC + checklist row removed | **PASS** |
| VO badge / surfaces | unchanged (dark) | **PASS** — `VERIFIED_OWNER_ENABLED=false`; no VO badge path lit |

### Authenticated smoke (checklist honesty) — 2026-08-15

Same ephemeral-Keycloak pattern as PK-3 (no durable `SMOKE_BEARER`): confidential client `easycasa-pk2-smoke` + temporary ownership of `demo-mb-monza-115`, upload minimal PDF to slot `APE`, assert score + card `docScore`, assert public surfaces do not leak `docKey`, then remove doc and delete client/user.

Artifact: `/opt/cursor/artifacts/pk2_authenticated_checklist_smoke.log` (`AUTH_SMOKE_COMPLETE … upload=201`).

**Verdict:** P6 is honest — checklist API + seller card score work end-to-end; private docs stay private.

### No-script HTML probe (P6 live)

```bash
curl -fsS https://easycasaita.com/it/vendi-da-privato \
  | sed 's/<script\b[^>]*>[\s\S]*?<\/script>//gI' \
  | grep -E 'Checklist documenti|Attivo|P6' | head
```

## Rollback

```bash
cd /opt/easycasa-ita
sed -i 's/^SELLER_CHECKLIST_ENABLED=true/SELLER_CHECKLIST_ENABLED=false/' .env
git checkout main~1 -- apps/web/src/config/sell-privately/promises.json   # or revert PK-2 merge commit
docker compose -f infra/docker-compose.yml -f infra/docker-compose.traefik.yml --env-file .env \
  build --no-cache web
docker compose -f infra/docker-compose.yml -f infra/docker-compose.traefik.yml --env-file .env \
  up -d --no-deps --force-recreate web api
```

Re-deploy prior `main` tip if ledger revert is insufficient. Checklist rows in DB are harmless when flag off (API 404).

## Explicitly not flipped

- `VERIFIED_OWNER_ENABLED` / P3 ledger
- `SELLER_ANALYTICS_ENABLED` / P7
- `MEDIA_CDN_ENABLED`
- Ledger `blocks.savingsFigures` / `blocks.mediazioneCopy`
