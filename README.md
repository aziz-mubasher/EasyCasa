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

### Phase 18 — Owner checkout payment step
See `docs/phase-18.md`. Checkout shows a fattura preview, collects due-now payment, then unlocks the mandate.

### Phase 19 — Feature-gap matrix + messaging alignment
See `docs/phase-19.md`. Competitive matrix vs immobiliare / idealista / Zillow; homepage copy aligned with à-la-carte + success fee (not “zero commission”).

### Phase 20 — Map-search backend
See `docs/phase-20.md`. `POST /search/bounds` + `/search/area` with filters, clustering, and energy class.

### Phase 21 — Listing-detail surface
See `docs/phase-21.md`. Assembled detail (APE, catastal, quality score) + similar listings.

### Phase 22 — Saved searches + alerts
See `docs/phase-22.md`. Save Phase 20 criteria + frequency; instant fan-out on publish; daily digests + alert-log dedup.
```bash
pnpm --filter @easycasa/migration migrate     # applies 0015_phase22
# POST/GET /me/saved-searches  ·  PUT …/frequency  ·  DELETE …
# EasyCasaSavedSearchesApi; AlertsService.onListingPublished on publish
```

### Phase 23 — Seeker discovery UI
See `docs/phase-23.md`. Expo map search (Phase 20) + listing detail (Phase 21) + saved searches (Phase 22); default landing tab.

### Phase 24 — Enquiry → order funnel
See `docs/phase-24.md`. Contact-agent CTA → enquiry lifecycle → convert to Phase 10 order.
```bash
pnpm --filter @easycasa/migration migrate     # applies 0016_phase24
# POST /listings/:id/enquiries  ·  GET /me/enquiries  ·  POST /enquiries/:id/convert
# EasyCasaEnquiriesApi + EnquiryModal on listing detail
```

### Phase 25 — Owner enquiries inbox
See `docs/phase-25.md`. Owner/mediator triage UI: contact → qualify → convert to order.

### Phase 26 — Enquiry → Phase 10 order bridge
See `docs/phase-26.md`. Convert maps the enquiry draft through `OrdersBridge` → `Phase10OrdersAdapter` → `OrdersService.create`.

### Phase 27 — Free AVM
See `docs/phase-27.md`. Instant min/mid/max valuation + lead capture.
```bash
pnpm --filter @easycasa/migration migrate     # applies 0017_phase27
# POST /avm/estimate  ·  EasyCasaValuationApi  ·  (owner)/valuation
```

### Phase 28 — Messaging reconciliation (no "zero commission")
See `docs/phase-28.md`. Option B positioning: à-la-carte transparency + provvigione disclosure; public `/pricing` page.

### Phase 29 — Viewings & scheduling
See `docs/phase-29.md`. Slot booking + lifecycle for listing viewings.
```bash
pnpm --filter @easycasa/migration migrate     # applies 0018_phase29
# GET /listings/:id/slots  ·  POST /listings/:id/viewings  ·  booking/[listingId]
```

### Phase 30 — Productionization foundation
See `docs/phase-30.md`. Ops Makefile, optional Keycloak compose, consolidated env seams + backlog.
```bash
make help    # up / migrate / reindex / keycloak / …
```

### Phase 31 — Schema unification (buyer order roots)
See `docs/phase-31.md`. Drizzle already unified; `0019` makes `service_orders` listing-rooted for buyers.
```bash
pnpm --filter @easycasa/migration migrate     # applies 0019_phase31
```

### Phase 32 — Composition-root reconciliation
See `docs/phase-32.md`. Inventory + regression tests for `AppModule` imports (guards stay on `AuthModule`).
```bash
pnpm --filter @easycasa/api test -- src/app.module.spec.ts
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
