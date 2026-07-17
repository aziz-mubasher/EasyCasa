# Phase 9 — Owner Portal (Proprietario)

**Goal:** owner workbench in the Phase 7 universal app — list properties, drive the
*fascicolo* checklist, and assemble services with a live transparent quote.

Design reference: `docs/system-design.md` §3.1. Consumes Phase 8 via `@easycasa/api-client`.

## What's shipped

| Area | Path |
|------|------|
| Owner routes | `apps/mobile/app/(owner)/` |
| Owner UI | `apps/mobile/src/components/owner/` |
| Owner API hooks | `apps/mobile/src/api/owner*.ts` + `upload.ts` |
| Client | `packages/api-client/{http,phase8,money}.ts` |
| API | `GET /me/properties`, `POST /uploads/presign`, `POST /properties/:id/orders` |

Entry: Profile → **I miei immobili** → `/(owner)`.

## Local

```bash
pnpm install
pnpm --filter @easycasa/api-client typecheck
pnpm --filter @easycasa/api-client test
pnpm --filter @easycasa/mobile typecheck
pnpm --filter @easycasa/mobile start
```

## Notes

- Document upload uses MinIO presign (`POST /uploads/presign`) then PUT.
- Accepting a quote persists a `ServiceOrder` via `POST /properties/:id/orders`.
- Mandate e-signature remains Phase 10+.
