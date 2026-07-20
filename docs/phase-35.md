# Phase 35 — OIDC Cutover / Real Auth

**Goal:** turn off `DEV_AUTH` and authenticate against a real IdP. Hardened
token verification (real RS256 tests), a Keycloak realm for web + mobile, and a
cutover that is a **config flip** — not a code change.

---

## What this monorepo ships

```
apps/api/src/auth/jwt-verifier.ts     # jose: sig/iss/aud/exp + OIDC_ROLES_CLAIM
apps/api/src/auth/jwks.provider.ts    # JWKS_RESOLVER — remote in prod, local in tests
apps/api/src/auth/jwt.guard.ts        # @Public soft-attach; Bearer; DEV_AUTH headers
apps/api/src/auth/auth.module.ts      # @Global + APP_GUARD (stays on AuthModule)
apps/api/src/auth/jwt-verifier.spec.ts   # 8 real-crypto tests
apps/api/src/auth/auth.e2e.spec.ts        # 6 HTTP-pipeline tests
apps/api/src/auth/realm.spec.ts           # realm export structure
infra/keycloak/easycasa-realm.json    # roles, PKCE clients, audience mapper
infra/docker-compose.keycloak.yml     # local Keycloak + realm import
.env.oidc.example                     # exact vars to flip for cutover
```

### Adaptations vs sandbox

- Keep `OIDC_JWKS_URL` (not `OIDC_JWKS_URI`).
- Keep `AuthUser` / `UserRole` from `@easycasa/shared` (`Principal` is an alias).
- Keep existing decorator file paths (`public.decorator`, `roles.decorator`, …).
- Keep `APP_GUARD` on `AuthModule` (Phase 32 rule — not re-registered on AppModule).
- Soft-attach on `@Public` for `@OptionalUser`.
- Realm roles use `pro_marketer` + `professional` (not `pro-marketer`).
- Mobile: `easycasa-mobile` + `easycasa-app` alias for existing Expo client id.

---

## Cutover runbook

```bash
make keycloak
# issuer: http://localhost:8080/realms/easycasa  (admin/admin — change if shared)

# Merge into .env:
cp .env.oidc.example .env.oidc && cat .env.oidc   # then edit .env

pnpm --filter @easycasa/api build
# health @Public → 200; authed route without token → 401
curl -fsS http://localhost:4000/health
curl -i    http://localhost:4000/me/enquiries
```

**Production:** `OIDC_ISSUER=https://<keycloak>/realms/easycasa`, TLS via Traefik,
replace bootstrap admin, keep `easycasa-api` as bearer-only audience.

---

## Validation

```bash
pnpm --filter @easycasa/api test
# JwtVerifier (8) + auth e2e (6) + realm (3) + existing unit suite
```

VPS stays on `DEV_AUTH=true` until the live realm is ready — flipping is env-only.

---

## Follow-ups

1. Wire Next.js + Expo to PKCE clients; attach `Authorization: Bearer`.
2. Harden realm (brute-force, password policy, email verify, token lifetimes).
3. Make `api-integration` + auth suite required checks on `main`.
