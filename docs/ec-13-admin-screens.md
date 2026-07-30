# EC-13 — Admin portal (five screens + foundation)

Admin SPA (`apps/admin`) is an ordinary OIDC client. Enforcement is on the API
via EC-11 `@RequiresCapability('admin')` + `@RequiresAdminRole(...)`.

## Part 0 — Foundation

| Piece | Location |
|---|---|
| Six admin roles | `@easycasa/shared` `AdminRole` (EC-11) |
| `admin_audit_log` | Migration `0037_admin_portal.sql` — **REVOKE UPDATE, DELETE** from `easycasa` |
| `AdminAuditService` | Insert-only; every admin PII read / decision records a row with `reason` |

## Screens

| Screen | Role | API |
|---|---|---|
| Credentials (default: expiring ≤30d) | `operations` | `/professionals*` |
| Coverage matrix | `operations` full, `support` read | `/admin/coverage-matrix` |
| DSAR queue | `dpo` only | `/admin/dsar*` — reuses `DsarService` / `ErasureService` |
| Listing takedown | `operations` | `/admin/listing-reports*` |
| Identity review | `operations` | `/admin/identity-reviews*` — document URL cleared on decision |

Legal holds listed on DSAR erasure match `ERASURE_LEGAL_HOLDS_*` / *I miei dati*.

## Credential types (EC-13)

Adds `CENED_ACCREDITAMENTO`, `ALBO_ISCRIZIONE`, `RC_PROFESSIONALE`, `PARTITA_IVA`.
Eligibility aliases: CENED ↔ APE_CERTIFIER, ALBO_ISCRIZIONE ↔ ALBO_TECNICO,
RC_PROFESSIONALE ↔ RC_INSURANCE.

## Deferred / human

- Revoke production `psql` after screens work in pilot
- Keycloak `admin_operations` / `admin_dpo` / … realm roles (legacy `admin` → superadmin)
- Traefik IP allowlist on `admin.*`
- Impersonation / user CRUD / finance screens — non-goals

## Apply

```bash
psql … < migration/sql/0037_admin_portal.sql
```
