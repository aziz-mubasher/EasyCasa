#!/usr/bin/env bash
# Phase 36 / 36.1 — fail if `process.env` is READ outside sanctioned files.
# Config (load.ts) is the only place env is parsed; boot-check seeds test env.
set -euo pipefail

ROOT="${1:-apps/api/src}"
ACCESS='process\.env(\.[A-Za-z_][A-Za-z_0-9]*|\[)'
ALLOW='(config/load\.ts|scripts/boot-check\.ts):'

hits="$(grep -rnE "$ACCESS" "$ROOT" --include='*.ts' | grep -vE "$ALLOW" || true)"

if [[ -n "$hits" ]]; then
  echo "✗ process.env accessed outside config — inject ApiConfig or use an adapter:"
  echo "$hits"
  exit 1
fi
echo "✓ no stray process.env access under $ROOT"
