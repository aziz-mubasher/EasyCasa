# EC-S azm-dev-bridge feedback loop — completion R&D feedback (for Claude)

**As of tip `66073c3` on `main` + VPS `/opt/easycasa-ita` tip `66073c3` (2026-08-14).**  
**PR [#151](https://github.com/aziz-mubasher/EasyCasa/pull/151)** (draft) was **closed as superseded** after the same artifacts landed on `main` via the PP-4 completion tip — not abandoned. Scope is **docs/tooling only** (no app image rebuild).

## What landed

| Artifact | Role |
|----------|------|
| [#151](https://github.com/aziz-mubasher/EasyCasa/pull/151) | Original draft for bridge ledger protocol |
| Tip `66073c3` | Effective merge: ledger + script + Cursor rule + runbook + PP-4 `lifecycle=merged` seed |
| VPS | `git pull` only — containers unchanged (docs/scripts; no runtime code) |

## Deploy / smoke (2026-08-14)

| Check | Result |
|-------|--------|
| VPS tip | **`66073c3`** |
| Ledger on disk | `docs/azm-deliverables/_bridge/status-ledger.json` present + valid JSON |
| Claude poll URL | `https://raw.githubusercontent.com/aziz-mubasher/EasyCasa/main/docs/azm-deliverables/_bridge/status-ledger.json` → **200** |
| Runbook raw | `…/docs/runbooks/azm-dev-bridge.md` → **200** |
| Seeded row | `task_89efec62` / K EC 1.47 → `lifecycle=merged`, `prState=MERGED`, PR #150 |

No web/api recreate required (no Nest/Next runtime change in this scope).

## R&D FEEDBACK — for Claude

### 1. BRIEF ADHERENCE
- Closed the detection gap: Cursor must upsert a **public** status ledger; Claude must WebFetch it before answering dispatch status.
- Always-on Cursor rule `.cursor/rules/40-azm-bridge.mdc` + `pnpm azm:bridge-status` upsert/validate/`claude-block`.
- Runbook documents Claude re-poll algorithm (ledger first, bridge soft-state second).
- Seeded the incident task (`task_89efec62`) through to **merged** after PP-4 deploy.

**Deviation / process note:** PR #151 itself was not fast-forward-merged. Content landed via tip `66073c3` while #151 was still draft/closed-superseded — treat **`66073c3` as the merge tip** for this work.

### 2. WHERE THE BRIEF FAILED YOU
- “Merge 151” after it was already superseded — no unique commits remain vs `main` (branch is stale `pr_open` seed). Re-pushing #151 would **regress** the ledger to DRAFT/#150-open.
- Bridge MCP source is **outside** EasyCasa — this PR cannot make `list_tasks` attach `pr_url` natively; EasyCasa-side poll URL is the workaround.
- Kaizen MCP `needsAuth` in cloud agents — board %/status still human.

### 3. REPO REALITY CHECK
- Stack unchanged: pnpm monorepo; Cursor rules under `.cursor/rules/`.
- Prior R&D feedback lived only in PR bodies / `docs/audits/*` — Claude never saw mid-flight PRs.
- Incident: SDK agent IDLE + PR #150 @ 06:58 UTC; Claude still said “still running, no PR” because nothing pollable existed.

### 4. EFFORT SIGNAL
- Correctly one small docs/tooling task. Smaller than PP-4 eng; larger than a chat-only correction.

### 5. BLOCKED / NEEDS A HUMAN
- Paste runbook §2 re-poll algorithm into **Claude Desktop** standing / project instructions.
- Optional: azm-dev-bridge repo — sync `pr_url` + flip status when Cursor SDK agents open PRs.
- Do **not** reopen/merge stale branch `cursor/azm-bridge-feedback-loop-6d4e` as-is (would overwrite `merged` with `pr_open`).

### 6. NEXT TASK SHOULD ACCOUNT FOR
- Every `send_dev_task` brief must include `bridgeTaskId` + Kaizen code.
- Cursor: upsert `running` at start, `pr_open` immediately after draft PR, `merged` after land+deploy.
- Claude status answers: WebFetch ledger → quote `summary`/`prUrl`; never invent “no PR” from bridge soft-state alone.
- Next eng polish: **PP-5** (monetisation UI).

## Forwardable status block

```
<!-- AZM_BRIDGE_STATUS_BEGIN -->
bridgeTaskId: null
kaizenCode: bridge-feedback-loop
polishId: null
lifecycle: merged
prUrl: https://github.com/aziz-mubasher/EasyCasa/pull/151
prState: CLOSED_SUPERSEDED
summary: Bridge feedback loop LIVE on main @ 66073c3 (PR #151 superseded by same artifacts). Claude poll URL 200; task_89efec62 row shows merged/PR #150.
nextAction: Update Claude Desktop standing prompt to WebFetch ledger; do not re-merge stale #151 branch; dispatch PP-5.
pollUrl: https://raw.githubusercontent.com/aziz-mubasher/EasyCasa/main/docs/azm-deliverables/_bridge/status-ledger.json
<!-- AZM_BRIDGE_STATUS_END -->
```
