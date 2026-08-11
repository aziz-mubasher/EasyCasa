#!/usr/bin/env bash
# EC-S-T31 — forbid hardcoded user-facing copy on seller wizard + dashboard surfaces.
# Scopes:
#   apps/web/src/components/seller/**
#   apps/web/app/[locale]/seller/**
# Also asserts quota 429 render sites use errors.quota.* (not prose literals).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HITS=0

scan_dirs=(
  "$ROOT/apps/web/src/components/seller"
  "$ROOT/apps/web/app/[locale]/seller"
)

for d in "${scan_dirs[@]}"; do
  if [[ ! -d "$d" ]]; then
    echo "missing scan dir: $d" >&2
    exit 1
  fi
done

# 1) JSX text nodes with letters (prose) — must go through next-intl.
# Allow punctuation-only (e.g. em dash) and pure whitespace.
while IFS= read -r line; do
  echo "HARDCODED JSX text: $line" >&2
  HITS=$((HITS + 1))
done < <(
  # shellcheck disable=SC2086
  rg -n --glob '*.tsx' --glob '*.ts' \
    '>[^<{]*[A-Za-zÀ-ÿ]{2,}[^<]*<' \
    "${scan_dirs[@]}" 2>/dev/null || true
)

# 2) Prose string literals in UI attributes (placeholder / aria-label / title / alt / label).
# Allow URL-ish placeholders and single punctuation glyphs.
while IFS= read -r line; do
  # Skip URL / protocol placeholders
  if echo "$line" | rg -q 'placeholder="https?://|placeholder='\''https?://|placeholder=\{`https?://'; then
    continue
  fi
  echo "HARDCODED attr copy: $line" >&2
  HITS=$((HITS + 1))
done < <(
  rg -n --glob '*.tsx' --glob '*.ts' \
    '(placeholder|aria-label|title|alt|label)=["'\''][^"'\'']*[A-Za-zÀ-ÿ]{3,}[^"'\'']*["'\'']' \
    "${scan_dirs[@]}" 2>/dev/null || true
)

# 3) setError / throw with multi-word prose (internal short keys like 'load' are OK).
while IFS= read -r line; do
  echo "HARDCODED setError/throw: $line" >&2
  HITS=$((HITS + 1))
done < <(
  rg -n --glob '*.tsx' --glob '*.ts' \
    "setError\(['\"][^'\"]*[ ][^'\"]*['\"]\)|throw new Error\(['\"][^'\"]*[A-Za-zÀ-ÿ]{4,}" \
    "${scan_dirs[@]}" 2>/dev/null || true
)

# 4) Raw machine codes / slugs rendered as option or list children without t(.
# Catch `{p}` / `{c}` alone as children (legacy wizard bug).
while IFS= read -r line; do
  echo "HARDCODED raw code render: $line" >&2
  HITS=$((HITS + 1))
done < <(
  rg -n --glob '*.tsx' --glob '*.ts' \
    '>\s*\{[pc]\}\s*<' \
    "${scan_dirs[@]}" 2>/dev/null || true
)

# 5) Quota render sites must use errors.quota (activeListings / uploadsPerDay), not prose.
WIZARD="$ROOT/apps/web/src/components/seller/SellerListingWizard.tsx"
if [[ -f "$WIZARD" ]]; then
  if ! rg -q "useTranslations\(['\"]errors\.quota['\"]\)" "$WIZARD"; then
    echo "HARDCODED quota: $WIZARD must use useTranslations('errors.quota')" >&2
    HITS=$((HITS + 1))
  fi
  if rg -n "setError\(['\"][^'\"]*[Ll]imit[^'\"]*['\"]\)|setError\(['\"][^'\"]*[Qq]uota[^'\"]*['\"]\)" "$WIZARD" >/dev/null; then
    echo "HARDCODED quota prose in setError in $WIZARD" >&2
    HITS=$((HITS + 1))
  fi
  # 429 path should call tQuota / errors.quota keys
  if ! rg -q "status === 429" "$WIZARD"; then
    echo "WARN: no 429 handler in SellerListingWizard (expected for quota)" >&2
  elif ! rg -n -A3 "status === 429" "$WIZARD" | rg -q "activeListings|uploadsPerDay"; then
    echo "HARDCODED quota: 429 handler must render errors.quota.activeListings|uploadsPerDay" >&2
    HITS=$((HITS + 1))
  fi
fi

if [[ "$HITS" -ne 0 ]]; then
  echo "FAIL: $HITS hardcoded seller string hit(s) (EC-S-T31)" >&2
  exit 1
fi

echo "OK: no hardcoded user-facing strings on seller wizard/dashboard surfaces"
