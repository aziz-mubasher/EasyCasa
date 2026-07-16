#!/usr/bin/env bash
# Fast local secrets sweep — run before pushing. CI runs gitleaks properly;
# this is a zero-dependency pre-flight that greps tracked files.
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

fail=0
note() { printf '  \033[31m✗\033[0m %s\n' "$1"; fail=1; }

echo "▸ Scanning tracked files for likely secrets…"

# 1. .env files that shouldn't be tracked (only .env.example is allowed).
while IFS= read -r f; do
  case "$f" in
    *.env.example) ;;
    *.env|*.env.*) note "tracked env file: $f" ;;
  esac
done < <(git ls-files | grep -E '(^|/)\.env')

# 2. High-signal patterns in tracked, non-doc, non-fixture files.
patterns='sk_live_[0-9a-zA-Z]{24,}|AKIA[0-9A-Z]{16}|-----BEGIN (RSA|EC|OPENSSH) PRIVATE KEY-----|postgres(ql)?://[^:/[:space:]]+:[^@/[:space:]]+@'
while IFS= read -r f; do
  case "$f" in
    *docs/*|*fixtures/*|*__tests__/*|*.env.example|*secrets-audit.sh|*.gitleaks.toml) continue ;;
  esac
  if grep -EnI "$patterns" "$f" >/dev/null 2>&1; then
    note "secret-like match in: $f"
    grep -EnI "$patterns" "$f" | sed 's/^/      /' | cut -c1-120
  fi
done < <(git ls-files)

if [ "$fail" -eq 0 ]; then
  echo "✅ No obvious secrets found. (CI gitleaks is still authoritative.)"
else
  echo "❌ Potential secrets found — resolve before pushing."
  exit 1
fi
