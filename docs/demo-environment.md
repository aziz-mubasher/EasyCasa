# EC-15 — Demo environment

Isolated stakeholder demo stack. **Must never share** production DB, MinIO, Redis, or Meili volumes.

## Hosts

| Host | Service |
|------|---------|
| `demo.easycasaita.com` | web + `/api` + `/ai` |
| `admin.demo.easycasaita.com` | admin SPA |

## Guardrails

- `DEMO_MODE=true` — API forces email outbox dry-run (never SMTP/HTTP), clears WhatsApp Cloud send, leaves Banks4All unset (stub / fail-soft).
- `NEXT_PUBLIC_DEMO_MODE=true` — permanent demo banner; `robots.txt` disallow all; meta `noindex,nofollow`.
- Traefik adds `X-Robots-Tag: noindex, nofollow`.
- Stripe: `sk_test_*` only; `GO_LIVE_PAYMENTS_ACK=false`.
- Casafari stays for comps/research tooling — **not** as public demo inventory.

## Commands

```bash
# From repo root on the VPS (or local with Docker)
cp .env.demo.example .env.demo   # fill secrets
./infra/demo/up.sh               # compose up --build
# migrate (same as prod migrate against DEMO database URL)
pnpm --filter @easycasa/api demo:seed   # listings + 12 scenarios
pnpm --filter @easycasa/api demo:reset  # wipe demo rows + re-seed
```

Scenario coverage after seed: badged / plain / expired enquiries, confirmed viewing,
Cremona demand ×11, two Milan CENED certificatori, DSA takedown + open report,
open DSAR, credential expiring in 12 days. See `docs/demo-script.md`.

## Pre-flight notes (2026-07-30)

- Migrations through `0037_admin_portal.sql`.
- Compose lives under `infra/` (no root `docker-compose.yml`).
- OMI: `omi_quotes` / `omi_zone_quotes` via `apps/api/src/omi`.
- Casafari import code: `apps/api/src/imports/casafari/*`, `listings.source = 'casafari'`.
- No prior `demo:*` scripts or demo compose existed.
