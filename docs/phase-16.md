# Phase 16 — Remaining Owner Screens + Integration Layer

Two parts: (1) owner **checkout** + polished rental tax summary in the universal app, and (2) tightening the **integration layer** (OIDC fail-fast when `DEV_AUTH` is off) without regressing the live `DEV_AUTH=true` VPS.

Design reference: scaffold `phase-16.md`. Auth (jose JWKS + DEV_AUTH), MinIO/S3 presign, health, and module wiring were already in place from earlier phases — this phase verifies and closes the owner UX gaps.

---

## Part 1 — Owner screens (universal app)

### Rental flow — `app/(owner)/[propertyId]/lease.tsx`
Existing Phase 12 lease screen (live `previewLease` → create → RLI → register). Phase 16 extracts **`LeaseTaxSummary`** (cedolare waiver vs registro/bollo + 30-day deadline).

### Checkout / mandate flow — `app/(owner)/[propertyId]/checkout.tsx`
Services quote → **Continue to checkout** → accept → order → mandate → sign:
- **Accept** creates the order (server recomputes pricing), then the mandate.
- If every item's legal basis is classified (`reviewRequiredItems` empty and types resolved) → request e-signature and open `signingUrl` via `Linking`.
- Otherwise **`MandateStatusCard`** shows awaiting legal review with the blocking item codes.

Hooks live in `src/api/owner-tx-hooks.ts` on top of the existing `TransactionsApiProvider` (no duplicate client).

---

## Part 2 — Integration layer (API)

| Piece | Repo status |
| --- | --- |
| Zod `config.ts` | Extended: when `DEV_AUTH` is false, require `OIDC_ISSUER` / `OIDC_AUDIENCE` / `OIDC_JWKS_URL` |
| `JwtAuthGuard` (jose JWKS) | Kept; clearer error if JWKS unset outside DEV_AUTH |
| `@Public()` / `@Roles()` / `RolesGuard` | Already global via `AuthModule` |
| MinIO/S3 presign | Already real in `MediaService` (`S3_*` / `MINIO_*` — not scaffold `STORAGE_*`) |
| Health | Public `{ status, service, time }` |
| Traefik `/api` strip | Do **not** add Nest `setGlobalPrefix('api')` |

---

## Acceptance criteria

- [x] Checkout route + MandateStatusCard + LeaseTaxSummary wired; EN/IT/ES locales.
- [x] Config fail-fast tests for OIDC when `DEV_AUTH=false`.
- [x] `pnpm lint` / `typecheck` / `test`.
- [ ] Live boot against Keycloak + MinIO when flipping `DEV_AUTH=false`.

---

## Honest caveats

- **Do not** drop in the scaffold's `main.ts` / `app.module.ts` / required-OIDC-at-boot / `STORAGE_*` — they would break the current Traefik deploy with `DEV_AUTH=true`.
- Rental screen remains `lease.tsx` (not a second `rental.tsx`).
- Checkout still uses placeholder signer email + mandate PDF URL until owner identity + PDF generation land.
- e-signature / RLI / AML remain configured HTTP seams.
