# EC-S PK-3 — seller analytics enablement (2026-08-14)

**Authoriser:** AZM (product owner) — enable seller analytics + price nudges **now**; keep Verified Owner **dark**  
**Kaizen:** K EC 1.53 · **Polish gate:** PK-3  
**Scope:** `SELLER_ANALYTICS_ENABLED` + P7 ledger live only — **not** VO (`VERIFIED_OWNER_ENABLED`), P3, checklist rollback, CDN, T25, T19.2  
**Pattern:** Same shape as PK-2 (`docs/audits/EC-S-pk2-checklist-enablement.md`)

**VPS deploy tip:** after merge of PK-3 PR on `main` (branch `cursor/pk3-analytics-enablement-43e8`).

## Decisions

| Item | Decision | Effect |
|------|----------|--------|
| Seller analytics + nudges (T23/T24 / P7) | **Enable now** | `SELLER_ANALYTICS_ENABLED=true` + P7 `coming` → `live` |
| Verified Owner (T14–T17 / P3) | **Stay dark** | `VERIFIED_OWNER_ENABLED=false`; P3 remains `coming` |
| Web `NEXT_PUBLIC_*` | **None for analytics** | Gating is API runtime only — **no web rebuild for the flag** |
| Sell-privately ledger P7 | **Web rebuild required** | `promises.json` is bundled at Next build — rebuild **web** after ledger flip |

## Ops flips (VPS `/opt/easycasa-ita/.env`)

| Variable | Before | After |
|----------|--------|-------|
| `SELLER_ANALYTICS_ENABLED` | absent / `false` | **`true`** |
| `VERIFIED_OWNER_ENABLED` | `false` | **`false`** (unchanged) |
| `SELLER_CHECKLIST_ENABLED` | `true` | **`true`** (unchanged) |

### Apply (Traefik pair — mandatory)

```bash
cd /opt/easycasa-ita
# 1) Ledger + code on tip (after main merge)
git fetch origin main && git checkout main && git pull origin main

# 2) Flip analytics flag only (add if absent)
grep -q '^SELLER_ANALYTICS_ENABLED=' .env \
  && sed -i 's/^SELLER_ANALYTICS_ENABLED=.*/SELLER_ANALYTICS_ENABLED=true/' .env \
  || echo 'SELLER_ANALYTICS_ENABLED=true' >> .env
grep -E '^(SELLER_ANALYTICS|VERIFIED_OWNER|SELLER_CHECKLIST)_ENABLED' .env

# 3) Rebuild web (P7 ledger) + recreate api (runtime flag)
docker compose -f infra/docker-compose.yml -f infra/docker-compose.traefik.yml --env-file .env \
  build --no-cache web
docker compose -f infra/docker-compose.yml -f infra/docker-compose.traefik.yml --env-file .env \
  up -d --no-deps --force-recreate web api

# 4) Confirm container env
docker compose -f infra/docker-compose.yml -f infra/docker-compose.traefik.yml --env-file .env \
  exec -T api printenv SELLER_ANALYTICS_ENABLED VERIFIED_OWNER_ENABLED SELLER_CHECKLIST_ENABLED
```

**Why web rebuild:** `apps/web/src/config/sell-privately/promises.json` is statically imported (`next.config.mjs` validates at build; `SellPrivatelyPage` reads ledger at bundle time). Runtime `.env` alone does not change P7 chip on `/vendi-da-privato`.

**Why no web rebuild for the flag:** T23/T24 did not add `NEXT_PUBLIC_SELLER_ANALYTICS_ENABLED`. Seller analytics page always renders; API routes 404 when flag off, 401 unauth when flag on.

## Ledger flip (repo)

| Item | Before | After |
|------|--------|-------|
| `promises.P7.state` | `coming` | **`live`** |
| `promises.P3.state` | `coming` | `coming` (unchanged) |
| `promises.P6.state` | `live` | unchanged |
| `blocks.savingsFigures` / `mediazioneCopy` | `live` | unchanged |

Protocol: `promises.json` + `sell-privately.spec.ts` + `promiseLedger.test.ts` (validators unchanged — P7 `live` is valid).

## Verification checklist (production smoke)

| Check | Expected | Result |
|-------|----------|--------|
| Container `SELLER_ANALYTICS_ENABLED` | `true` | _after deploy_ |
| Container `VERIFIED_OWNER_ENABLED` | `false` | **false** (unchanged) |
| `GET /api/health` | **200** | **200** (pre-flip baseline) |
| `GET /api/seller/listings/:id/analytics` unauth | **401** (not flag-404 when flag on) | **401** (JWT before flag; baseline) |
| `GET /api/seller/listings/:id/nudges` unauth | **401** | **401** (baseline) |
| `/it/vendi-da-privato` no-script HTML — P7 tile | `Attivo` + `Dashboard venditore` | _after web rebuild_ |
| `/it/vendi-da-privato` P3 tile | `In arrivo` | **PASS** pre-flip — `sp-chip--coming` |
| `/it/vendi-da-privato` P6 tile | `Attivo` | **PASS** pre-flip — checklist still live |
| Claim 1–2 regression | EUR savings + portal copy | **PASS** pre-flip — `7.500` + portale copy |
| Authenticated `/it/seller/listings/<id>/analytics` | windowed metrics + nudge cards | _operator follow-up_ |
| Nudge copy T04 | data-triggered, no advice framing | see R&D feedback in PR |
| Analytics data path | non-zero rows for published listings | **PASS pre-flip** — 118 published; 63 listings with rows; 590 total views in `listing_analytics_daily` (no backfill; ~55 listings may show empty charts) |

### No-script HTML probe (P7 live)

```bash
curl -fsS https://easycasaita.com/it/vendi-da-privato \
  | sed 's/<script\b[^>]*>[\s\S]*?<\/script>//gI' \
  | grep -E 'Dashboard venditore|Attivo|P7' | head
```

### Data-density probe (before declaring P7 honest)

```bash
docker compose -f infra/docker-compose.yml -f infra/docker-compose.traefik.yml --env-file .env \
  exec -T db psql -U easycasa -d easycasa -c "
SELECT count(*) AS published FROM listings WHERE status='published';
SELECT count(*) AS analytics_rows, count(DISTINCT listing_id) AS listings_with_rows,
       coalesce(sum(views),0) AS total_views FROM listing_analytics_daily;
"
```

Views increment on public listing detail fetches (`recordListingView` in `listings.service.ts`) — **no historical backfill**. Listings published before T23 deploy or with zero detail views may show **empty charts** despite P7 live.

## Rollback

```bash
cd /opt/easycasa-ita
sed -i 's/^SELLER_ANALYTICS_ENABLED=true/SELLER_ANALYTICS_ENABLED=false/' .env
git checkout main~1 -- apps/web/src/config/sell-privately/promises.json   # or revert PK-3 merge commit
docker compose -f infra/docker-compose.yml -f infra/docker-compose.traefik.yml --env-file .env \
  build --no-cache web
docker compose -f infra/docker-compose.yml -f infra/docker-compose.traefik.yml --env-file .env \
  up -d --no-deps --force-recreate web api
```

Nudge rows in DB are harmless when flag off (API 404).

## Explicitly not flipped

- `VERIFIED_OWNER_ENABLED` / P3 ledger
- `MEDIA_CDN_ENABLED`
- `SELLER_CHECKLIST_ENABLED` (stays on from PK-2)
- Ledger `blocks.savingsFigures` / `blocks.mediazioneCopy`
