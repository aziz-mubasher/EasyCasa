# EC-S PK-1 — Verified Owner enablement (2026-08-15)

**Authoriser:** AZM via Cursor — *proceed with PK-1 VO when moderation capacity is confirmed*  
**Kaizen:** K EC 1.54 · **Polish gate:** PK-1  
**Scope:** `VERIFIED_OWNER_ENABLED=true` + P3 ledger `coming` → `live`  
**Companion runbook:** `docs/runbooks/ec-s-vo-enablement.md` (executed)

**VPS tip:** `406538a` on `main` (2026-08-15).

## Go/no-go record

| # | Precondition | Record |
|---|--------------|--------|
| 1 | Named VO reviewer(s) | **Confirmed** — Keycloak users `muba_operations` (`admin_operations`) + `muba_superadmin` (`admin_superadmin`) have `vo_moderation` capability. Queue: `https://admin.easycasaita.com/#vo` |
| 2 | Target turnaround SLA | **2 business days** (runbook default; AZM proceed = capacity go) |
| 3 | Stall policy | Sellers stay on `submitted` / `in_review` until Claim/Verify/Reject; escalate via admin `#vo` |
| 4 | Doc retention | Acknowledge T05 §1 (outcome + 12m); no bulk purge on this flip |
| 5 | Reject reason discipline | Canonical phrases in runbook §3; admin UI still free-text (known gap) |
| 6 | Premium priority | Order-only in queue; standards unchanged |

## Decisions

| Item | Decision | Effect |
|------|----------|--------|
| Verified Owner (T14–T17 / P3) | **Enable now** | `VERIFIED_OWNER_ENABLED=true` + P3 `coming` → `live` |
| Checklist / analytics | Unchanged | Still live (PK-2 / PK-3) |
| Web `NEXT_PUBLIC_*` | **None for VO** | API runtime gate; pages always render |
| Sell-privately P3 chip | **Web rebuild required** | `promises.json` bundled at Next build |

## Ops flips (VPS `/opt/easycasa-ita/.env`)

| Variable | Before | After |
|----------|--------|-------|
| `VERIFIED_OWNER_ENABLED` | `false` | **`true`** |
| `VERIFIED_OWNER_VALIDITY_MONTHS` | `12` | **`12`** (unchanged) |
| `SELLER_CHECKLIST_ENABLED` | `true` | unchanged |
| `SELLER_ANALYTICS_ENABLED` | `true` | unchanged |

### Apply (Traefik pair)

```bash
cd /opt/easycasa-ita
git fetch origin main && git checkout main && git pull origin main
sed -i 's/^VERIFIED_OWNER_ENABLED=.*/VERIFIED_OWNER_ENABLED=true/' .env
docker compose -f infra/docker-compose.yml -f infra/docker-compose.traefik.yml --env-file .env \
  up -d --no-deps --force-recreate api
docker compose -f infra/docker-compose.yml -f infra/docker-compose.traefik.yml --env-file .env \
  build --no-cache web
docker compose -f infra/docker-compose.yml -f infra/docker-compose.traefik.yml --env-file .env \
  up -d --no-deps --force-recreate web
```

## Ledger flip (repo)

| Item | Before | After |
|------|--------|-------|
| `promises.P3.state` | `coming` | **`live`** |
| `promises.P6` / `P7` | `live` | unchanged |
| Claim 1–2 blocks | `live` | unchanged |

## Verification

| Check | Expected | Result |
|-------|----------|--------|
| Container `VERIFIED_OWNER_ENABLED` | `true` | **true** |
| `VERIFIED_OWNER_VALIDITY_MONTHS` | `12` | **12** |
| `GET /api/seller/vo/:id` unauth | **401** | **401** |
| `GET /api/seller/checklist/:id` unauth | **401** | **401** (PK-2) |
| `/it/seller/listings/:id/verification` | **200** | **200** |
| `/it/vendi-da-privato` P3 | `Attivo` + Proprietario verificato | **PASS** — `sp-chip--live` |
| P6 still live | Checklist documenti Attivo | **PASS** |
| Claim 1 EUR | `7.500` present | **PASS** |
| Auth `GET /seller/vo/:id` | state `none` | **PASS** |
| Auth `POST /seller/vo/:id/submit` | state `submitted` | **PASS** — **201** |
| Auth GET after submit | `submitted` | **PASS** |
| Cleanup | case deleted; owner restored | **PASS** |

Artifacts:
- `/opt/cursor/artifacts/pk1_vo_deploy_smoke.log`
- `/opt/cursor/artifacts/pk1_authenticated_vo_submit_smoke.log` (`PK1_AUTH_SMOKE_COMPLETE`)

**Admin claim→verify→public badge** left as operator follow-up with a real reviewer session (smoke stopped at `submitted` + queue row present before cleanup).

## Rollback

See `docs/runbooks/ec-s-vo-enablement.md` §7.
