# Web analytics (Tier 0) — runbook

Flags ship **off**. Turn `WEB_ANALYTICS_ENABLED` (API, runtime) and `NEXT_PUBLIC_WEB_ANALYTICS_ENABLED` (web, **build arg**) on together, and only after privacy-notice section 10 is live. The web value is inlined by Next at image build. Changing the API env alone does not make the browser send beacons.

`ANALYTICS_HONOR_GPC` defaults to `true`. `LISTING_VIEWS_FROM_WEB_ANALYTICS` defaults to `false` and is not flipped in this change. After 14 days of both flags on, compare `listing_analytics_daily.views` with rollup `listing.view` counts and report the bot/real ratio before considering the flag.

## How `/api` reaches Nest

From `infra/docker-compose.traefik.yml` (do not infer a different edge):

- Public router `easycasa-api`: `Host(STAGING_DOMAIN) && PathPrefix(/api)`, priority 100.
- Middleware strips the `/api` prefix.
- Service port 4000. Nest has no global prefix (`apps/api/src/main.ts`), so the collector is `POST /collect` inside the container and `POST /api/collect` on the public host.
- Web is a different container: router `easycasa-web`, priority 1, port 3000. Same public host. The beacon posts same-origin `/api/collect` as `text/plain` (no CORS preflight). `apps/web/middleware.ts` skips `/api`.

## Client IP

`main.ts` does not set `trust proxy`. The phone-verify controller reads the **first** `X-Forwarded-For` hop. The collector does **not** copy that. It takes the **rightmost** `X-Forwarded-For` address, else `X-Real-IP`, else the socket address (`apps/api/src/web-analytics/ip.ts`).

Host Traefik `forwardedHeaders.insecure` is not in this repo. If Traefik replaces the header, the rightmost value is the TCP client. If Traefik appends, the rightmost value is the hop Traefik observed. Confirm on the VPS before trusting counts. The address is truncated (IPv4 `/24`, IPv6 `/48`) before the in-memory throttle key and before the hash. It is not stored and must not be logged.

## Postgres

Image `postgis/postgis:16-3.4` (`infra/postgres/Dockerfile`). Nullable rollup keys use `UNIQUE NULLS NOT DISTINCT` (PostgreSQL 15+). A primary key cannot hold NULL, so those tables do not use a nullable primary key.

## Migration `0076_ec_web_analytics.sql`

Host-side `pnpm migrate` cannot resolve the hostname `db`. Apply with an ephemeral node container on the compose network `easycasa-ita_internal`. Do not print `DATABASE_URL`.

```bash
# From the VPS checkout of this SHA, network easycasa-ita_internal already up.
docker run --rm --network easycasa-ita_internal \
  -v "$PWD":/repo -w /repo \
  -e DATABASE_URL \
  node:20-alpine \
  sh -c 'corepack enable && pnpm install --no-frozen-lockfile && pnpm --filter @easycasa/shared build && pnpm --filter @easycasa/migration migrate'
```

Pass `DATABASE_URL` from the VPS env (host `db`, not `localhost`). Confirm `_migrations` contains `0076_ec_web_analytics.sql`.

## Deploy

Name the git SHA and the pull request in the operator note. After deploy, `GET /version` on the API must show that SHA.

**API overlay.** `docs/runbooks/keycloak.md`: if `docker inspect` of the running API disagrees with the compose image, tag or mounts, stop. A bare `docker compose up -d --force-recreate api` is how live features disappear. Do not tag images `easycasa-ita-api-*`. Inspect the running API and follow the overlay procedure already used on the VPS. This runbook does not invent a new recreate command.

**Web.** `apps/web` reaches production as the compose service `web` (`apps/web/Dockerfile`) behind Traefik router `easycasa-web`, port 3000. It is not a separate CDN deploy. `NEXT_PUBLIC_*` values, including `NEXT_PUBLIC_WEB_ANALYTICS_ENABLED`, are build args. Rebuild the web image with both compose files (`infra/docker-compose.yml` and `infra/docker-compose.traefik.yml`). Prefer `--no-deps` for the web service, as in `docs/runbooks/seller-dashboard.md`. Do not recreate the API as a side effect of a web rollout.

## Staff cookie

After an admin login the SPA sets `ec_staff=1` (Domain `.easycasaita.com`, 180 days, `SameSite=Lax`) when the host is `easycasaita.com` or a subdomain. Admin (`admin.easycasaita.com`) and web (`easycasaita.com`) share that parent, so the cookie is visible to the site. Localhost cannot share it; the beacon already does nothing on localhost.

## `ec_sl_vid` — not decided

(a) Shorten the 400-day share-link cookie to 30 days and disclose it.  
(b) Remove the cookie and dedupe share-link views with the daily hash. Recommended. Not implemented.

## Brevo

This repo sends mail through the SMTP relay only. It does not call a Brevo tracking API and it does not embed an open pixel. The dashboard open/click setting was not readable from here. Recommend turning open tracking off for transactional mail.

## Smoke (after flags are on, not before the notice is live)

Visit five pages in two locales with `?utm_source=test&utm_medium=cpc&utm_campaign=ec_test_bs_smoke_202611`. Expect beacon `204`, no new analytics cookie, and the visit under Paid Search in admin within 15 minutes (rollup interval). Repeat with Global Privacy Control on and expect no new row.
