# EC-14 — Admin: harden and activate

## Part 0 — auth bypass removed

See `docs/ec-14-part0-dev-auth.md`. Production had `VITE_DEV_AUTH=true` in the
admin bundle; Traefik strip covered `admin.*`. Bypass deleted; OIDC-only admin.

## Part 1 — Keycloak `admin_*` roles

Realm roles in `infra/keycloak/realm-easycasa.json`. Assignment steps:
`docs/admin-roles.md`. `adminRolesFromRoles` no longer elevates bare `admin`.

## Part 2 — Support redaction

`professionalForSupport` masks name / credential reference / document URL.
`POST /professionals/:id/unredact` requires a typed reason, writes
`admin_audit_log`, grants one record for the actor session.

## Part 3 — Deploy verification

`docs/deploy.md`. `GET /version` exposes `GIT_SHA`. Admin footer shows
`VITE_GIT_SHA`. `FORCE_REBUILD=1 ./infra/deploy.sh` for no-cache recreate.
