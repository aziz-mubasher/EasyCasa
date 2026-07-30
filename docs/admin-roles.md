# Admin realm roles (EC-14)

Assignment is **manual in the Keycloak console**. Two operators at pilot scale —
do not build a role-management UI.

## Realm roles

| Realm role | AdminRole | Portal access |
|---|---|---|
| `admin_support` | `support` | Coverage (read), credentials **redacted**; unredact is audited |
| `admin_operations` | `operations` | Credentials, coverage, takedown, identity, catalog, orchestration |
| `admin_finance` | `finance` | Finance surfaces (when present) |
| `admin_dpo` | `dpo` | DSAR queue, retention purge, email outbox |
| `admin_aml` | `aml` | AML / KYC cases |
| `admin_superadmin` | `superadmin` | All of the above |
| `admin` (bare) | _(none)_ | Capability `admin` only — **sees nothing** in the portal |

Fail closed: absence of any `admin_*` role → empty nav / API `403 insufficient admin role`.

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
