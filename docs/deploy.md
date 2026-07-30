# Deploy (VPS)

Standing procedure for Easy Casa on `banks4all-vps` → `/opt/easycasa-ita`.

## Why this exists

Compose `build` can report success while BuildKit serves fully **CACHED** layers and
containers stay **Running** (never **Recreated**). That is a silent no-op deploy.
Do not retry the same command hoping for a different result.

## Force a real deploy

From `/opt/easycasa-ita` (after `git pull --ff-only origin main`):

```bash
export GIT_SHA="$(git rev-parse --short HEAD)"
export BUILD_TIME="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

COMPOSE="docker compose -f infra/docker-compose.yml -f infra/docker-compose.traefik.yml --env-file .env"

# Pick the services that changed — always include api when Nest changes, admin when SPA changes
$COMPOSE build --no-cache api admin web
$COMPOSE up -d --force-recreate api admin web
```

`infra/deploy.sh` is the convenience wrapper; for code that must land, prefer the
`--no-cache` / `--force-recreate` path above and set `GIT_SHA` / `BUILD_TIME`.

## Verification — deploy is not done until these pass

1. Build log shows layers actually executing, not `CACHED` throughout
2. `docker compose up` output says `Recreated`, not only `Running` / `up-to-date`
3. `docker inspect --format '{{.Created}}' easycasa-ita-api-1` is within minutes of now
4. Build marker changed:
   ```bash
   curl -fsS https://easycasaita.com/api/version
   # {"service":"api","gitSha":"<short>","builtAt":"..."}
   ```
   Admin footer shows the same SHA (baked as `VITE_GIT_SHA`).

## Admin auth bypass policy

`VITE_DEV_AUTH` must be **absent** from VPS `.env` (not `false`). See
`docs/ec-14-part0-dev-auth.md`. After admin rebuild:

```bash
$COMPOSE run --rm --entrypoint sh admin -c 'grep -r DEV_AUTH /usr/share/nginx/html || echo CLEAN'
```

## Migrations

Apply new SQL under `migration/sql/` before or with the API recreate (same pattern as
prior EC tasks — `psql` via the `db` service).
