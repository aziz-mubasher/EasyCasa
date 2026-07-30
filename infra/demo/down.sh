#!/usr/bin/env bash
# Tear down demo containers (volumes retained unless --volumes).
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"
export COMPOSE_PROJECT_NAME=easycasa-demo
ARGS=(-f infra/docker-compose.demo.yml --env-file .env.demo down)
if [ "${1:-}" = "--volumes" ]; then
  ARGS+=(--volumes)
fi
docker compose "${ARGS[@]}"
