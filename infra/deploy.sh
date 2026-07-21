#!/usr/bin/env bash
# Deploy Easy Casa Ita on the VPS. Run from the repo root or via CI over SSH.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [ ! -f .env ]; then
  echo "ERROR: .env not found in $ROOT_DIR. Copy .env.example and fill it in." >&2
  exit 1
fi

# Read a single KEY=value from .env without sourcing the whole file.
# Avoids shell breakage from unquoted values (e.g. NOTIFY_FROM=Name <email@x>).
env_get() {
  local key="$1"
  local line
  line="$(grep -E "^${key}=" .env | tail -n1 || true)"
  [ -n "$line" ] || return 0
  local val="${line#*=}"
  val="${val%$'\r'}"
  if [[ "$val" == \"*\" ]]; then
    val="${val:1:${#val}-2}"
  elif [[ "$val" == \'*\' ]]; then
    val="${val:1:${#val}-2}"
  fi
  printf '%s' "$val"
}

# Compose project name is set in docker-compose.yml (`name: easycasa-ita`).
COMPOSE="docker compose -f infra/docker-compose.yml --env-file .env"
EDGE="caddy"
if docker network inspect root_default >/dev/null 2>&1; then
  echo "==> Traefik network detected — using docker-compose.traefik.yml (no Caddy)"
  COMPOSE="$COMPOSE -f infra/docker-compose.traefik.yml"
  EDGE="traefik"
else
  COMPOSE="$COMPOSE --profile caddy"
fi

echo "==> Building images"
$COMPOSE build

echo "==> Starting stack"
$COMPOSE up -d

echo "==> Pruning old images"
docker image prune -f >/dev/null 2>&1 || true

echo "==> Waiting for services"
sleep 8

echo "==> Health checks"
$COMPOSE exec -T api node -e "fetch('http://localhost:4000/health').then(r=>r.json()).then(j=>{console.log('api',j.status)}).catch(e=>{console.error(e);process.exit(1)})" || echo "api check skipped"
if [ "$EDGE" = "traefik" ]; then
  STAGING_DOMAIN="$(env_get STAGING_DOMAIN)"
  if [ -z "${STAGING_DOMAIN}" ]; then
    echo "WARN: STAGING_DOMAIN unset in .env — skipping edge health check" >&2
  else
    curl -fsS "https://${STAGING_DOMAIN}/api/health" && echo "" || echo "edge check pending TLS/DNS"
  fi
else
  curl -fsS "http://localhost/api/health" && echo "" || echo "edge check pending TLS/DNS"
fi
echo "==> Deploy complete"
