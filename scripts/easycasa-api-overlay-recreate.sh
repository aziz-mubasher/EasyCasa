#!/usr/bin/env bash
# Recreate EasyCasa API from a committed overlay. Never GitHub latest.
# VPS copy: /root/azm/easycasa-api-overlay-recreate.sh
# Two copies can drift — copy this file with the snapshot script after every edit.
#
# Preconditions, in this order. Fail closed if any is missing.
#   (a) compose project easycasa-ita shows the real replica + siblings, no keepers
#   (b) overlay image override file is present and is not :latest
#   (c) up --no-build --no-deps --force-recreate api
set -euo pipefail

PROJECT="${PROJECT:-easycasa-ita}"
COMPOSE_DIR="${COMPOSE_DIR:-/opt/easycasa-ita/infra}"
ENV_FILE="${ENV_FILE:-/opt/easycasa-ita/.env}"
OVERRIDE="${OVERRIDE:-/root/azm/docker-compose.api-overlay-image.yml}"
REPLICA="${REPLICA:-easycasa-ita-api-1}"

echo "==> (a) compose project must be only the real estate"
if ! docker compose -p "$PROJECT" -f "$COMPOSE_DIR/docker-compose.yml" ps --format '{{.Name}} {{.Service}}' | grep -q "^${REPLICA} api$"; then
  echo "missing real replica $REPLICA in project $PROJECT" >&2
  docker compose -p "$PROJECT" -f "$COMPOSE_DIR/docker-compose.yml" ps
  exit 1
fi
extras=$(docker ps -a --filter label=com.docker.compose.project="$PROJECT" --format '{{.Names}}' | grep -E 'azm-keep-|easycasa-ita-api-overlay-' || true)
if [ -n "$extras" ]; then
  echo "keepers or overlay-named containers are still in project $PROJECT:" >&2
  printf '%s\n' "$extras" >&2
  echo "remove or relabel them before recreate" >&2
  exit 1
fi
docker compose -p "$PROJECT" -f "$COMPOSE_DIR/docker-compose.yml" ps

echo "==> (b) overlay image override"
if [ ! -f "$OVERRIDE" ]; then
  echo "missing $OVERRIDE" >&2
  exit 1
fi
if grep -E 'image:[[:space:]]*easycasa-ita-api:latest' "$OVERRIDE"; then
  echo "$OVERRIDE points at :latest — refuse" >&2
  exit 1
fi
if ! grep -E 'image:[[:space:]]*easycasa-ita-api:overlay-' "$OVERRIDE"; then
  echo "$OVERRIDE must set image: easycasa-ita-api:overlay-…" >&2
  exit 1
fi
cat "$OVERRIDE"

echo "==> (c) --no-build --no-deps --force-recreate api"
cd "$COMPOSE_DIR"
docker compose -p "$PROJECT" \
  -f docker-compose.yml -f docker-compose.traefik.yml -f docker-compose.legenda-redirect.yml \
  -f "$OVERRIDE" \
  --env-file "$ENV_FILE" \
  up -d --no-deps --no-build --force-recreate api

echo "==> health"
sleep 3
curl -fsS -o /dev/null -w "https://easycasaita.com/api/health %{http_code}\n" https://easycasaita.com/api/health
docker inspect "$REPLICA" --format 'status={{.State.Status}} started={{.State.StartedAt}} image={{.Config.Image}}'
