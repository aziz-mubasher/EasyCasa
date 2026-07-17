# Phase 8 — Service Catalog + Fascicolo / Compliance Engine

**Goal:** the two primitives for the licensed-agency model — the **unbundled service
catalog** (à la carte + packages, transparent pricing) and the **fascicolo compliance
engine** that gates publishing, closing, and lease registration.

Design reference: `docs/system-design.md` §2 and §5.1.

## Architecture (Drizzle, not Prisma)

Domain logic is pure TypeScript (no Nest/ORM). Persistence uses the existing Drizzle stack:

| Path | Role |
|------|------|
| `apps/api/src/service-catalog/domain/` | catalog, packages, `buildQuote` |
| `apps/api/src/fascicolo/domain/` | document types, `evaluateFascicolo` |
| `apps/api/src/fascicolo/drizzle-fascicolo.repository.ts` | port adapter |
| `migration/sql/0008_phase8.sql` | properties, documents, catalog, orders |

## API

```
GET  /service-catalog
GET  /service-catalog/packages
POST /service-catalog/quote
POST /service-catalog/orders              → confirm quote → ServiceOrder

GET  /properties
POST /properties
GET  /properties/:id
GET  /properties/:id/fascicolo
GET  /properties/:id/fascicolo/gates
POST /properties/:id/fascicolo/documents
POST /properties/:id/fascicolo/documents/:code/verify   (admin)
```

## Owner UI

- `/it/owner` — create Property
- `/it/owner/properties/:id/fascicolo` — checklist + gate banners

## Gates

| Gate | Hard blockers |
|------|----------------|
| PUBLISH | Verified APE (≤10y) |
| CLOSE | Provenance, visura (≤6m), planimetria, RTI, identity (+ condo docs if condominio) |
| REGISTER_LEASE | APE + identity |

## Local

```bash
pnpm --filter @easycasa/migration migrate   # 0008
pnpm --filter @easycasa/api test            # includes 19 domain tests
curl -s https://easycasaita.com/api/service-catalog | head
```
