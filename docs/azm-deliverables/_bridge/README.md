# AZM bridge status ledger

Public machine-readable status of Claude Desktop → Cursor dispatches for EasyCasa.

- **Claude polls:** [`status-ledger.json`](./status-ledger.json) via raw `main` URL (see runbook).
- **Cursor writes:** `pnpm azm:bridge-status upsert …` (see `scripts/azm-bridge-status.mjs`).
- **Runbook:** [`docs/runbooks/azm-dev-bridge.md`](../../runbooks/azm-dev-bridge.md).
