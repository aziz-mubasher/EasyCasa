# Phase 14 — API Completeness Pass

**Goal:** close the thin backend gaps that Phases 7, 9, and 13 UIs assume — so every screen built so far runs against a real API. No new product surface.

> **Repo note:** EasyCasa uses **Drizzle**. Device table, `/me/*`, admin lists, and catalog editors already shipped in Phases 7–13. This phase adds the tested pure derivation/hardening pieces and documents the complete surface.

---

## Endpoints (status in this repo)

| Endpoint | Status |
| --- | --- |
| `GET /me/properties` | Done (title falls back to linked listing) |
| `POST /uploads/presign` | Done — traversal-safe keys + content-type allowlist |
| `POST /me/devices` | Done (Phase 7) |
| `GET /assignments?status=open` | Done (Phase 13) |
| `GET /aml/cases` | Done (Phase 13) |
| `GET /leases` | Done (Phase 13) |
| `PUT /admin/catalog/:code/legal-basis` | Done (Phase 13) |
| `PUT /admin/catalog/:code/credential` | Done (Phase 13) |

---

## Pure logic added

- `apps/api/src/orders/domain/order-tasks.ts` — `tasksForOrder` (skip NONE, dedupe); used by `AssignmentsService.spawnForOrder`
- `apps/api/src/uploads/domain/keys.ts` — `safeBasename`, `buildObjectKey`, `isAllowedContentType` (pdf/jpeg/png/webp)

---

## Client

`packages/api-client/src/phase14.ts` — `EasyCasaMeApi` (`listMyProperties`, `presignUpload`, `registerDevice`).  
`EasyCasaOwnerApi.presignUpload` also available for the owner portal.

---

## Caveats

- Auth remains global JWT + roles (`DEV_AUTH` stubs until OIDC).
- Upload keys keep the Phase 9 prefix `users/{id}/docs/` for storage compatibility.
- Credential policy lives in `credential_policies` (not a column on catalog items).
