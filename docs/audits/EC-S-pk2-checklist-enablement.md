# EC-S PK-2 — document checklist enablement (2026-08-14)

**Authoriser:** AZM (product owner) — enable checklist **now**; keep Verified Owner **dark** until moderation capacity confirmed  
**Kaizen:** K EC 1.52 · **Polish gate:** PK-2  
**Scope:** `SELLER_CHECKLIST_ENABLED` + P6 ledger live only — **not** VO (`VERIFIED_OWNER_ENABLED`), P3, analytics, CDN, T25, T19.2  
**Companion runbook (prepare only):** `docs/runbooks/ec-s-vo-enablement.md` (PK-1)

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
| Container `SELLER_CHECKLIST_ENABLED` | `true` | _see deploy log_ |
| Container `VERIFIED_OWNER_ENABLED` | `false` | _see deploy log_ |
| `GET /api/health` | **200** | _see deploy log_ |
| `GET /api/seller/checklist/<id>` unauth | **401** (not flag-404) | _see deploy log_ |
| `GET /api/seller/vo/<id>` unauth | **404** (flag dark) | _see deploy log_ |
| `/it/vendi-da-privato` no-script HTML — P6 tile | `Attivo` + `Checklist documenti` (not only `In arrivo`) | _see deploy log_ |
| Claim 1–2 regression | EUR savings + portal copy still present | _see deploy log_ |
| Authenticated seller `/it/seller/listings/<id>/documents` | slots render; upload updates score | _operator follow-up_ |
| Listing card doc score | visible when checklist on | _operator follow-up_ |
| Private docs | no public URL on listing page | _operator follow-up_ |
| VO badge / surfaces | unchanged (dark) | _see deploy log_ |

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
