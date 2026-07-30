#!/usr/bin/env bash
# Bring up the isolated EC-15 demo stack (separate Compose project + volumes).
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

if [ ! -f .env.demo ]; then
  echo "ERROR: .env.demo missing. Copy .env.demo.example → .env.demo and fill secrets." >&2
  exit 1
fi

export COMPOSE_PROJECT_NAME=easycasa-demo
COMPOSE=(docker compose -f infra/docker-compose.demo.yml --env-file .env.demo)

echo "==> Building easycasa-demo"
"${COMPOSE[@]}" build

echo "==> Starting easycasa-demo"
"${COMPOSE[@]}" up -d

echo "==> Waiting"
sleep 8
"${COMPOSE[@]}" ps
echo "==> Demo up. Migrate + seed next (see docs/demo-environment.md)."
