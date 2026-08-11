#!/usr/bin/env bash
# Counsel copy gates: observation-only surfaces (OMI panel + seller analytics).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
bash "$ROOT/scripts/check-omi-price-copy.sh"
bash "$ROOT/scripts/check-seller-analytics-copy.sh"
