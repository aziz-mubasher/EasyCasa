# EasyCasa

Foundation for re-platforming easycasaita.com into a modern PropTech app.
Monorepo → Docker Compose → single VPS behind Traefik (or Caddy locally).

## What's here
```
apps/web         Next.js (TypeScript) — map-first search, i18n IT/EN/ES
apps/api         NestJS (TypeScript) backend — listings, search, auth
apps/mobile      Expo Router universal app (iOS / Android / web shell)
services/ai      FastAPI (Python) — embeddings, AVM, alerts worker
packages/shared  Shared TS types + env schema (zod)
packages/api-client  Typed API client + zod (web + mobile)
packages/design-tokens  Design tokens for mobile theme bridge
migration        Schema + WP ETL / geocode / media / redirects
infra            docker-compose, Traefik overlay, Postgres(PostGIS+pgvector), deploy & backup
.cursor/rules    Conventions Cursor reads automatically
.github/workflows CI + deploy + mobile-ci
docs             phase-0..17, schema.md, wp-audit.md, env.md, vps-setup.md
```

## Local quickstart
```bash
corepack enable
pnpm install
cp .env.example .env
docker compose -f infra/docker-compose.yml --env-file .env --profile caddy up -d --build
```

### Phase 2 — Core API
See `docs/phase-2.md` and `docs/api.md`.
```bash
pnpm --filter @easycasa/migration migrate   # applies 0004 favorites/saved_searches
pnpm --filter @easycasa/api start:dev
# Swagger: http://localhost/api/docs (or :4000/docs)
# Dev auth: DEV_AUTH=true + headers x-dev-user / x-dev-roles / x-dev-email
```

### Phase 3 — Frontend + Search
See `docs/phase-3.md`.
```bash
pnpm --filter @easycasa/api search:backfill   # index listings into Meilisearch
pnpm --filter @easycasa/web dev               # http://localhost:3000/it
```

### Phase 4 — AI layer
See `docs/phase-4.md` and `docs/ai.md`.
```bash
pnpm --filter @easycasa/migration migrate     # applies 0005 vector ANN index (after embed)
# inside services/ai (or via docker):
python -m app.services.embed_index            # fill listings.embedding (hashing offline)
# AI routes: https://easycasaita.com/ai/docs  (or /ai/health)
```

### Phase 5 — Billing, messaging & partners
See `docs/phase-5.md` and `docs/billing.md`.
```bash
pnpm --filter @easycasa/migration migrate     # applies 0006 plans/messaging/leads
# Set STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET in .env for live Checkout
# Public: GET /api/billing/plans
```

### Phase 6 — Hardening & SEO-safe cutover
See `docs/phase-6.md` and `docs/cutover.md`.
```bash
pnpm --filter @easycasa/migration redirects   # → migration/out/redirects.caddy + .csv
# SEO: /sitemap.xml /robots.txt  ·  JSON-LD on listing pages
# Edge: Traefik headers/rate-limit (VPS) or infra/caddy (local --profile caddy)
# Load: k6 run load/k6/search.js   Drill: ./scripts/backup-restore-drill.sh
```

### Phase 7 — Universal app (Expo)
See `docs/phase-7.md`.
```bash
pnpm --filter @easycasa/migration migrate     # applies 0007 devices
pnpm --filter @easycasa/mobile start          # Expo (iOS / Android / web)
pnpm --filter @easycasa/mobile export:web
# Well-known: /.well-known/apple-app-site-association  ·  /listing/{slug} deep link
```

### Phase 8 — Service catalog + fascicolo
See `docs/phase-8.md` and `docs/system-design.md`.
```bash
pnpm --filter @easycasa/migration migrate     # applies 0008 properties/documents/catalog
# Public: GET /api/service-catalog  ·  Owner: /it/owner → fascicolo wizard
```

### Phase 9 — Owner portal (Expo)
See `docs/phase-9.md`.
```bash
pnpm --filter @easycasa/mobile start
# Profile → owner section  ·  GET /api/me/properties  ·  POST /api/uploads/presign
```

### Phase 10 — Orders + mandate (incarico)
See `docs/phase-10.md`.
```bash
pnpm --filter @easycasa/migration migrate     # applies 0009 legal_basis + mandates
# POST /api/properties/:id/orders  ·  POST /api/mandates  ·  POST /api/mandates/:id/signature-request
# Admin: /it/admin/legal-basis  ·  GET /api/admin/catalog/legal-basis
```

### Phase 11 — Professionals + assignments
See `docs/phase-11.md`.
```bash
pnpm --filter @easycasa/migration migrate     # applies 0010 professionals/assignments
# Admin: /it/admin/assignments  ·  /it/admin/professionals  ·  /it/admin/credential-policy
# Mobile: Profile → Professional inbox (EXPO_PUBLIC_PROFESSIONAL_ID)
```

### Phase 12 — Rentals compliance (RLI + cedolare + AML)
See `docs/phase-12.md`.
```bash
pnpm --filter @easycasa/migration migrate     # applies 0011 leases + kyc_cases
# POST /api/leases/preview  ·  POST /api/properties/:id/leases  ·  POST /api/leases/:id/register
# POST /api/aml/cases  ·  GET /api/admin/leases/deadlines
# Mobile: Profile → My properties → Lease / RLI
```

### Phase 13 — Admin back-office console
See `docs/phase-13.md`.
```bash
pnpm --filter @easycasa/admin dev             # Vite SPA on :5174
# Deployed: https://admin.easycasaita.com
# Orchestration · Credentials · Compliance · AML · RLI monitor
```

### Phase 14 — API completeness
See `docs/phase-14.md`.
```bash
# Hardens uploads + order→task derivation; documents /me + admin list endpoints
# EasyCasaMeApi: listMyProperties · presignUpload · registerDevice
```

### Phase 15 — Professional portal
See `docs/phase-15.md`.
```bash
pnpm --filter @easycasa/migration migrate     # applies 0012 professionals.user_id + professional role
# GET /api/me/professional  ·  GET /api/me/assignments  ·  POST .../start  ·  POST .../deliver
# Mobile: Profile → Professional (role-gated) → inbox / credentials / deliverable upload
```

### Phase 16 — Owner checkout + integration harden
See `docs/phase-16.md`.
```bash
# Mobile: services → checkout (order + mandate + sign); lease uses LeaseTaxSummary
# API: OIDC required when DEV_AUTH=false (jose JWKS + S3/MinIO already real)
```

### Phase 17 — Payments + fattura elettronica
See `docs/phase-17.md`.
```bash
pnpm --filter @easycasa/migration migrate     # applies 0013 payment_intents + invoices
# POST /api/payments/intents  ·  POST /api/payments/webhook  ·  POST /api/invoices/orders/:id
# EasyCasaPaymentsApi; SUCCEEDED → auto SdI fattura (DEV stub when SDI_* empty)
```

### Python AI service (local tests)
```bash
cd services/ai
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
pytest   # from repo root: pytest services/ai
```

## Deploy
See `docs/vps-setup.md`. On the shared Hostinger VPS, Traefik routes `easycasaita.com` (Caddy is skipped automatically). Docker Compose project name: **`easycasa-ita`** (Easy Casa Ita), install path `/opt/easycasa-ita`.

## Definition of Done
Spec in `/docs` → `pnpm lint && pnpm typecheck && pnpm test` pass → verified on staging → human-reviewed → no secrets in git.
