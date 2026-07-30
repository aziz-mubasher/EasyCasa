# EC-14 Part 0 — remove admin auth bypass

## Production finding (2026-07-30)

| Question | Answer |
|---|---|
| Is `VITE_DEV_AUTH` set on the running production admin? | **Yes** — VPS `.env` had `VITE_DEV_AUTH=true`, and `grep -r DEV_AUTH` hit the baked admin JS under `/usr/share/nginx/html/assets/`. |
| Does Traefik strip cover the admin route? | **Yes** — `easycasa-admin` / `easycasa-admin-http` both use `easycasa-strip-dev-auth` (`infra/docker-compose.traefik.yml`). API `/api` also strips. |

**Classification:** client bypass string was present in the shipped admin bundle (readable by anyone who opens the admin URL). Traefik + API (`EC_TEST_AUTH` only under `NODE_ENV=test`) meant forged `x-dev-*` headers should not grant a production API session, but the SPA still treated the operator as signed-in without OIDC. Treat as an exposure with a window on the admin UI path, mitigated at the API edge — not a clean near-miss.

## What changed

- Deleted `VITE_DEV_AUTH` from admin source, Dockerfile, Compose build args, `.env.example`, `.env.oidc.example`
- Admin SPA is OIDC-only (no `x-dev-*` fetch path)
- API continues to accept header auth **only** when `NODE_ENV=test` and `EC_TEST_AUTH=true` (vitest) — no production `DEV_AUTH` flag
- Regression test: `apps/api/src/auth/dev-auth-absent.spec.ts` scans admin/api/infra/env/CI for the banned token

## Deploy checklist (Part 0)

1. Remove `VITE_DEV_AUTH` from VPS `.env` entirely (absent, not `false`)
2. Ensure `VITE_OIDC_ISSUER` / `VITE_OIDC_CLIENT_ID` are set for the admin build
3. `docker compose build --no-cache admin && docker compose up -d --force-recreate admin`
4. Confirm: `docker compose run --rm --entrypoint sh admin -c 'grep -r DEV_AUTH /usr/share/nginx/html || echo CLEAN'`
