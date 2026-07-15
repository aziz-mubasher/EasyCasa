#!/usr/bin/env bash
# Deploy EasyCasa on the VPS. Run from the repo root or via CI over SSH.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [ ! -f .env ]; then
  echo "ERROR: .env not found in $ROOT_DIR. Copy .env.example and fill it in." >&2
  exit 1
fi

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
  # shellcheck disable=SC1091
  set -a; . ./.env; set +a
  curl -fsS "https://${STAGING_DOMAIN}/api/health" && echo "" || echo "edge check pending TLS/DNS"
else
  curl -fsS "http://localhost/api/health" && echo "" || echo "edge check pending TLS/DNS"
fi
echo "==> Deploy complete"
