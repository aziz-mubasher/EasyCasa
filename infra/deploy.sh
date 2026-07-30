#!/usr/bin/env bash
# Deploy Easy Casa Ita on the VPS. Run from the repo root or via CI over SSH.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [ ! -f .env ]; then
  echo "ERROR: .env not found in $ROOT_DIR. Copy .env.example and fill it in." >&2
  exit 1
fi

export GIT_SHA="${GIT_SHA:-$(git rev-parse --short HEAD 2>/dev/null || echo unknown)}"
export BUILD_TIME="${BUILD_TIME:-$(date -u +%Y-%m-%dT%H:%M:%SZ)}"
echo "==> Build marker GIT_SHA=$GIT_SHA BUILD_TIME=$BUILD_TIME"

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

# EC-14: default path can still cache; FORCE_REBUILD=1 for a real land.
if [ "${FORCE_REBUILD:-0}" = "1" ]; then
  echo "==> FORCE_REBUILD=1 — building without cache + force-recreate"
  $COMPOSE build --no-cache
  $COMPOSE up -d --force-recreate
else
  echo "==> Building images (set FORCE_REBUILD=1 if prior deploy looked CACHED)"
  $COMPOSE build
  echo "==> Starting stack"
  $COMPOSE up -d
fi

echo "==> Pruning old images"
docker image prune -f >/dev/null 2>&1 || true

echo "==> Waiting for services"
sleep 8

echo "==> Health checks"
$COMPOSE exec -T api node -e "fetch('http://localhost:4000/health').then(r=>r.json()).then(j=>{console.log('api',j.status)}).catch(e=>{console.error(e);process.exit(1)})" || echo "api check skipped"
$COMPOSE exec -T api node -e "fetch('http://localhost:4000/version').then(r=>r.json()).then(j=>console.log('version',JSON.stringify(j))).catch(e=>{console.error(e);process.exit(1)})" || echo "version check skipped"
if [ "$EDGE" = "traefik" ]; then
  # shellcheck disable=SC1091
  set -a; . ./.env; set +a
  curl -fsS "https://${STAGING_DOMAIN}/api/health" && echo "" || echo "edge check pending TLS/DNS"
  curl -fsS "https://${STAGING_DOMAIN}/api/version" && echo "" || echo "version edge check pending"
else
  curl -fsS "http://localhost/api/health" && echo "" || echo "edge check pending TLS/DNS"
fi
echo "==> Deploy complete — confirm Recreated + /version SHA (see docs/deploy.md)"
