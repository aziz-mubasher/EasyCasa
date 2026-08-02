# Admin realm roles (EC-14)

Assignment is **manual in the Keycloak console**. Two operators at pilot scale —
do not build a role-management UI.

## Realm roles

| Realm role | AdminRole | Portal access |
|---|---|---|
| `admin_support` | `support` | Coverage (read), credentials **redacted**; unredact is audited; **EC WhatsApp** read + reply |
| `admin_operations` | `operations` | Credentials, coverage, takedown, identity, catalog, orchestration; **EC WhatsApp** read + reply |
| `admin_finance` | `finance` | Finance surfaces (when present) |
| `admin_dpo` | `dpo` | DSAR queue, retention purge, email outbox |
| `admin_aml` | `aml` | AML / KYC cases |
| `admin_superadmin` | `superadmin` | All of the above |
| `admin` (bare) | _(none)_ | Capability `admin` only — **sees nothing** in the portal |

### K EC 4.1 — CRM realm roles (separate from `admin_*`)

| Realm role | Access |
|---|---|
| `crm-admin` | Everything incl. erasure requests, exports, assignment |
| `crm-ops` | Full read/write except erasure & export |
| `crm-conductor` | Only contacts linked to their assigned viewings |
| `crm-marketing` | Aggregates + list views; **no** free-text notes, no phone numbers |
| `crm-readonly` | Read-only, no exports |

CRM roles grant capability `admin` so `/admin/crm` is reachable, but they do **not** grant EC-14 `AdminRole` personas (credentials/DSAR/etc. stay separate). Routes require `CRM_ENABLED=true`.

Fail closed: absence of any `admin_*` role → empty nav / API `403 insufficient admin role` (except CRM nav when a `crm-*` role is present).

## Assign in Keycloak (production)

1. Open `https://auth.easycasaita.com` → realm **easycasa**
2. **Users** → select the operator → **Role mapping** → **Assign role**
3. Filter by `admin_` → assign exactly one primary persona (or `admin_superadmin`)
4. Also ensure the user can reach the admin client (`easycasa-admin`) — public PKCE client; no confidential secret
5. Sign out / sign in on `https://admin.easycasaita.com` so the access token refreshes

Realm export includes these roles in `infra/keycloak/realm-easycasa.json`. On an
already-imported realm, create any missing role by name (same strings) before assigning.

## Token claim

Roles appear under `realm_access.roles` (see `OIDC_ROLES_CLAIM`). Nest
`@RequiresAdminRole` and the admin SPA both read that claim via
`adminRolesFromRoles` in `@easycasa/shared` — do not add a parallel check.
