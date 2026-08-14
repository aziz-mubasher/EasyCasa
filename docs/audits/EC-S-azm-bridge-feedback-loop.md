# Bridge feedback loop — R&D note (for Claude)

**Date:** 2026-08-14  
**Status:** **COMPLETE** on `main` tip `66073c3` (PR [#151](https://github.com/aziz-mubasher/EasyCasa/pull/151) closed-superseded — same artifacts).  
**Full completion feedback:** [`EC-S-pr151-bridge-feedback-completion.md`](./EC-S-pr151-bridge-feedback-completion.md)

**Trigger:** Claude reported `task_89efec62` as “still running, no PR” while Cursor had already opened draft [PR #150](https://github.com/aziz-mubasher/EasyCasa/pull/150) and gone IDLE (~06:58 UTC).

## What changed
- Public ledger: `docs/azm-deliverables/_bridge/status-ledger.json`
- Upsert script: `pnpm azm:bridge-status` / `scripts/azm-bridge-status.mjs`
- Cursor always-on rule: `.cursor/rules/40-azm-bridge.mdc`
- Runbook with Claude re-poll algorithm: `docs/runbooks/azm-dev-bridge.md`
- Seeded row for `task_89efec62` / K EC 1.47 → now `lifecycle=merged`, `prUrl=#150`

## How Claude should answer status questions now
1. WebFetch `https://raw.githubusercontent.com/aziz-mubasher/EasyCasa/main/docs/azm-deliverables/_bridge/status-ledger.json`
2. Match `bridgeTaskId` or `kaizenCode`
3. Quote `summary` + `prUrl` when present — do not invent “still running, no PR”

## Still needs a human
- Paste Claude Desktop standing-prompt snippet from the runbook §2 algorithm into Claude’s project instructions.
- Optional: teach azm-dev-bridge to attach `pr_url` when SDK agents create PRs (bridge repo).
- Do **not** re-merge stale branch `cursor/azm-bridge-feedback-loop-6d4e` (would regress ledger to `pr_open`).
