# OIDC Cutover Runbook — K EC 1.12

**Scope:** manual production cutover only. This document is preparation and verification — do not flip `DEV_AUTH=false` until every gate below passes.

**Authoritative realm file:** `infra/keycloak/realm-easycasa.json` (import this one). The legacy `easycasa-realm.json` was removed — it lacked the `seeker` role alias and was never mounted by compose.

---

## Pre-flight (repo-verified)

| Check | Status | Notes |
|---|---|---|
| Realm name `easycasa` → issuer `https://auth.easycasaita.com/realms/easycasa` | ✅ | Matches `.env.oidc.example` `OIDC_ISSUER` |
| `easycasa-api` bearer-only client + audience mapper | ✅ | Client scope `easycasa-audience` uses `oidc-audience-mapper` with `included.client.audience=easycasa-api`, `access.token.claim=true` — emits `aud: ["easycasa-api", …]` |
| Roles at `realm_access.roles` | ✅ | Default Keycloak `roles` scope; `OIDC_ROLES_CLAIM=realm_access.roles` |
| `easycasa-web` public + PKCE S256 | ✅ | Redirects include `https://easycasaita.com/auth/callback` and `https://easycasaita.com/*` |
| `easycasa-admin` public + PKCE | ✅ | Redirect `https://admin.easycasaita.com/*` |
| `easycasa-app` / `easycasa-mobile` Expo scheme | ✅ | `easycasa://auth/*` |
| `buyer`, `seeker`, `admin` roles | ✅ | `seeker` is alias of `buyer` |
| No secrets in realm JSON | ✅ | All clients public or bearer-only; no client secrets committed |
| Keycloak Traefik router | ✅ | `auth.${STAGING_DOMAIN}` with TLS; middleware `easycasa-headers` only — **not** `easycasa-strip-dev-auth` |
| Keycloak production mode | ✅ | `docker-compose.yml`: `command: ['start', '--import-realm']` with `KC_HOSTNAME`, `KC_HOSTNAME_STRICT=true`, `KC_PROXY_HEADERS=xforwarded` |
| API boot when `DEV_AUTH=false` | ⚠️ | **Fails fast** if `OIDC_ISSUER` / `OIDC_AUDIENCE` / `OIDC_JWKS_URL` missing (`loadApiConfig` Zod). **Boots** if vars set but JWKS unreachable — auth requests then **401** (lazy JWKS fetch). |

### Keycloak 26 behind Traefik (production)

From `infra/docker-compose.yml`:

```yaml
KC_HOSTNAME: ${KEYCLOAK_HOSTNAME:-auth.easycasaita.com}
KC_HOSTNAME_STRICT: 'true'
KC_PROXY_HEADERS: xforwarded
KC_HTTP_ENABLED: 'true'
command: ['start', '--import-realm']
```

Keycloak 26 expects `KC_PROXY_HEADERS=xforwarded` (not the deprecated `KC_PROXY=edge`). Traefik forwards `X-Forwarded-*`; Keycloak builds issuer URLs from `KC_HOSTNAME`.

---

## ⚠️ Sequencing trap

**Do not set `DEV_AUTH=false` until Steps 1–4 pass.**

If you flip the API to OIDC before Keycloak is live and JWKS is reachable, the API **will boot** (vars are set) but **every authenticated request returns 401**. Public routes (`/health`, `/search`) keep working; seeker login, enquiry, viewing, admin, and smoke all fail.

---

## Deploy context

Staging CI deploy is red — **apply manually on the VPS**. Changes must be **merged to `main`** before the VPS pulls; an unmerged branch vanishes on the next `git checkout main && git pull`.

```bash
cd /opt/easycasa-ita
git checkout main && git pull origin main
```

Keycloak is defined in the main compose file (not a separate overlay). Bring up the full stack including Traefik:

```bash
docker compose \
  -f infra/docker-compose.yml \
  -f infra/docker-compose.traefik.yml \
  --env-file .env \
  up -d --no-build
```

Local-only Keycloak overlay (dev laptop, **not** VPS):

```bash
make keycloak
# or: docker compose -f infra/docker-compose.keycloak.yml up -d
```

---

## Step 1 — DNS

Point `auth.easycasaita.com` A/AAAA record at the VPS.

**Gate:**

```bash
dig +short auth.easycasaita.com
# expect VPS IP

curl -sI "https://auth.easycasaita.com" | head -1
# expect HTTP/2 200 or 302 (TLS must succeed)
```

---

## Step 2 — Keycloak behind Traefik with TLS

Ensure `KEYCLOAK_HOSTNAME=auth.easycasaita.com`, `KEYCLOAK_ADMIN`, `KEYCLOAK_ADMIN_PASSWORD`, and `KEYCLOAK_DB=keycloak` are in the VPS `.env`. Postgres init script `infra/postgres/init/02-keycloak-db.sql` creates the `keycloak` database on first boot.

Redeploy (command above). Keycloak imports `realm-easycasa.json` on first start via `--import-realm`.

**Gate:**

```bash
curl -s -o /dev/null -w '%{http_code}\n' \
  https://auth.easycasaita.com/realms/easycasa/.well-known/openid-configuration
# expect 200
```

Inspect issuer (must match exactly — no trailing slash, https):

```bash
curl -s https://auth.easycasaita.com/realms/easycasa/.well-known/openid-configuration \
  | jq -r .issuer
# expect: https://auth.easycasaita.com/realms/easycasa
```

---

## Step 3 — Realm import and secrets

On first boot, compose mounts `infra/keycloak/realm-easycasa.json` → `/opt/keycloak/data/import/realm-easycasa.json`. If Keycloak already ran without import, use the admin console → **Create realm** → **Import** → select `realm-easycasa.json`.

Replace bootstrap admin password in `.env` (never commit). No client secrets are required — all SPA clients are public + PKCE.

**Gate:**

```bash
curl -s https://auth.easycasaita.com/realms/easycasa/protocol/openid-connect/certs | jq '.keys | length'
# expect >= 1

# Confirm audience mapper is active (after creating a test user and logging in via easycasa-web):
# decode access token JWT payload — "aud" must include "easycasa-api"
```

Verify issuer string **exactly** equals `OIDC_ISSUER` in `.env.oidc.example`:

```
OIDC_ISSUER=https://auth.easycasaita.com/realms/easycasa
```

---

## Step 4 — Test users

Create at least one seeker and one admin user in the Keycloak admin console (`https://auth.easycasaita.com/admin`):

| User | Realm role | Purpose |
|---|---|---|
| `pilot-seeker@…` | `buyer` or `seeker` | Web login + smoke |
| `pilot-admin@…` | `admin` | Admin SPA login |

**Gate:** browser login at `https://auth.easycasaita.com/realms/easycasa/account` succeeds for the seeker user.

---

## Step 5 — Flip API and frontends to OIDC

**Only after Steps 1–4 pass.** Merge `.env.oidc.example` keys into the VPS `.env`:

```bash
DEV_AUTH=false
OIDC_ISSUER=https://auth.easycasaita.com/realms/easycasa
OIDC_JWKS_URL=https://auth.easycasaita.com/realms/easycasa/protocol/openid-connect/certs
OIDC_AUDIENCE=easycasa-api
OIDC_ROLES_CLAIM=realm_access.roles

KEYCLOAK_HOSTNAME=auth.easycasaita.com
# KEYCLOAK_ADMIN / KEYCLOAK_ADMIN_PASSWORD already set

NEXT_PUBLIC_OIDC_ISSUER=https://auth.easycasaita.com/realms/easycasa
NEXT_PUBLIC_OIDC_CLIENT_ID=easycasa-web

VITE_OIDC_ISSUER=https://auth.easycasaita.com/realms/easycasa
VITE_OIDC_CLIENT_ID=easycasa-admin
VITE_DEV_AUTH=false
```

Rebuild **web** and **admin** images (OIDC vars are baked at build). Redeploy:

```bash
docker compose -f infra/docker-compose.yml -f infra/docker-compose.traefik.yml --env-file .env up -d --build
```

**Gate:** API starts without config errors. If `DEV_AUTH=false` with missing OIDC vars, the API **crashes at boot** with a Zod validation error — that is intentional fail-fast.

---

## Step 6 — End-to-end verification

### Public routes still work

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://easycasaita.com/api/health    # 200
curl -s -o /dev/null -w '%{http_code}\n' https://easycasaita.com/api/search    # 200
curl -s -o /dev/null -w '%{http_code}\n' https://easycasaita.com/               # 200 or 307
```

### PR #4 regression — forged dev headers rejected

```bash
curl -s -o /dev/null -w '%{http_code}\n' \
  -H 'x-dev-user: attacker' -H 'x-dev-roles: admin' \
  https://easycasaita.com/api/me
# expect 401
```

### Real browser login (seeker)

1. Open `https://easycasaita.com`, click sign-in, complete Keycloak PKCE round trip.
2. Authenticated call:

```bash
# paste token from browser sessionStorage key ec.access
curl -s -H "Authorization: Bearer $TOKEN" https://easycasaita.com/api/me | jq .
# expect 200 with seeker identity
```

3. Full seeker path in browser: search → listing → **Contatta** (both consents) → enquiry created → viewing booked.

### Admin SPA

1. Open `https://admin.easycasaita.com`, sign in via Keycloak (`easycasa-admin` client).
2. Orchestration / credentials pages load without 401.

---

## Smoke token (Phase 40)

After cutover, live smoke **requires** `SMOKE_BEARER` — `SMOKE_DEV_USER` headers are stripped at the Traefik edge and ignored by the API when `DEV_AUTH=false`.

### Option A — Browser (recommended for cutover verification)

1. Sign in at `https://easycasaita.com` as the pilot seeker user.
2. DevTools → Application → Session Storage → `ec.access` → copy value.
3. Run:

```bash
pnpm --filter @easycasa/api build
BASE_URL=https://easycasaita.com/api \
  SMOKE_TARGET=live \
  SMOKE_BEARER="<paste access token>" \
  pnpm --filter @easycasa/api pilot:smoke
```

Tokens expire in 300s (realm `accessTokenLifespan`). Refresh via browser re-login if smoke fails with 401.

### Option B — Keycloak token endpoint (automation / CI)

Realm clients have `directAccessGrantsEnabled: false` — password grant is **not** available on `easycasa-web`. For automated smoke, either:

- Temporarily enable **Direct access grants** on a dedicated confidential smoke client (ops-only, not in pilot scope), **or**
- Use the authorization-code + PKCE flow via a headless tool (`oauth2c`, Playwright login).

Do **not** enable direct access grants on production SPA clients.

---

## Step 7 — Rollback

One-command safe rollback — PR #4 edge strip means dev headers cannot be injected from the internet even with `DEV_AUTH=true`:

```bash
# On VPS .env:
DEV_AUTH=true
# clear or comment OIDC_* if desired (optional — API ignores them when DEV_AUTH=true)

docker compose -f infra/docker-compose.yml -f infra/docker-compose.traefik.yml --env-file .env up -d --no-build
```

Public browsing continues. Authenticated paths remain blocked from the internet until OIDC is re-applied (expected).

Also revert admin/web build args if images were rebuilt with OIDC (`VITE_DEV_AUTH=true`, rebuild admin).

---

## Human-only checks (not verifiable from repo)

- [ ] DNS propagation for `auth.easycasaita.com`
- [ ] Traefik ACME certificate issuance for `auth.easycasaita.com`
- [ ] Keycloak admin password rotated from bootstrap
- [ ] Live JWT `aud` claim contains `easycasa-api` after real login
- [ ] Email transport for enquiry confirmations post-login
- [ ] Web/admin image rebuild with `NEXT_PUBLIC_OIDC_*` / `VITE_OIDC_*` on VPS

---

## Related docs

- `.env.oidc.example` — exact env contract
- `docs/phase-35.md` — OIDC architecture
- `docs/phase-40.md` — pilot smoke / preflight
- `apps/api/src/auth/realm.spec.ts` — automated realm structure tests
