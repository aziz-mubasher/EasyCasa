# AZM Dev Bridge — EasyCasa feedback loop

**Audience:** Claude Desktop (R&D coordinator) + Cursor cloud agents + Aziz  
**Problem this solves:** Claude cannot read EasyCasa / GitHub. Bridge `list_tasks` alone has been reporting **“still running, no PR”** after Cursor already opened a PR and went IDLE (incident: `task_89efec62` / K EC 1.47 / PP-4 → PR [#150](https://github.com/aziz-mubasher/EasyCasa/pull/150) at 06:58 UTC while Claude still said “no PR”).

---

## 1. Roles

| Actor | Can see | Must do |
|-------|---------|---------|
| **Claude** | Bridge tools + public URLs (WebFetch). **No** venture repo checkout | On every status ask: poll **ledger** (below), then bridge; never claim “no PR” without ledger miss |
| **Cursor agent** | Repo + GitHub | Upsert ledger at start / PR-open / fail; paste `AZM_BRIDGE_STATUS` in chat |
| **Aziz** | Boards + both sides | Forward Cursor status block to Claude when asked mid-flight; merge ledger PR promptly |

---

## 2. Canonical poll surface (Claude)

After this lands on `main`, Claude **must** WebFetch:

```text
https://raw.githubusercontent.com/aziz-mubasher/EasyCasa/main/docs/azm-deliverables/_bridge/status-ledger.json
```

Until the ledger PR merges, ask Aziz for the Cursor chat `AZM_BRIDGE_STATUS` block or fetch the raw URL on the feature branch:

```text
https://raw.githubusercontent.com/aziz-mubasher/EasyCasa/<branch>/docs/azm-deliverables/_bridge/status-ledger.json
```

Per-task mirror (same payload, one file):

```text
docs/azm-deliverables/<K-EC-x.y>/STATUS.json
```

Schema: `docs/azm-deliverables/_bridge/status-ledger.schema.json`.

### Claude re-poll algorithm (copy into Claude’s standing instructions)

1. `WebFetch` the ledger URL above.
2. Find row by `bridgeTaskId` (e.g. `task_89efec62`) **or** `kaizenCode` (e.g. `K EC 1.47`).
3. If `lifecycle` ∈ `{pr_open, pr_ready, merged}` **and** `prUrl` is set → report that PR. Do **not** say “still running, no PR”.
4. If `lifecycle` ∈ `{running, dispatched}` and no `prUrl` → then check bridge `list_tasks` / agent status; only then say “still running”.
5. If ledger miss **and** bridge says running → say “ledger miss — ask Cursor for `AZM_BRIDGE_STATUS` block”, not a confident “no PR”.

---

## 3. Cursor reporting (script)

```bash
# validate
node scripts/azm-bridge-status.mjs validate

# after draft PR exists
node scripts/azm-bridge-status.mjs upsert \
  --bridge task_89efec62 \
  --kaizen "K EC 1.47" \
  --polish PP-4 \
  --lifecycle pr_open \
  --pr 150 --pr-state DRAFT \
  --agent-status IDLE \
  --agent-bc bc-51dcfe26-06b0-4887-bcbf-fdf0bde8f4d8 \
  --agent-url https://cursor.com/agents/bc-51dcfe26-06b0-4887-bcbf-fdf0bde8f4d8 \
  --branch cursor/seller-onboarding-form-f4d8 \
  --summary "Draft PR #150 open; agent IDLE" \
  --next-action "Review/merge PR #150"

# paste into chat / PR for Aziz → Claude
node scripts/azm-bridge-status.mjs claude-block --bridge task_89efec62
```

Lifecycle enum: `dispatched | running | pr_open | pr_ready | merged | blocked | failed | cancelled`.

Cursor rule (always on): `.cursor/rules/40-azm-bridge.mdc`.

---

## 4. Bridge tool expectations (Claude side)

Keep using `send_dev_task` / `list_tasks`, but treat them as **dispatch + soft state** only.

Ideal bridge improvement (outside this repo): when Cursor SDK agents create a PR, bridge should set `pr_url` and flip task status. Until that exists, **the ledger is the source of truth for “is there a PR?”**.

Never re-issue the same Kaizen code after a timeout without:

1. Ledger lookup  
2. Bridge `list_tasks`  
3. GitHub search for `[K EC x.y]` open PRs (Aziz/Cursor)

---

## 5. Incident backfill — `task_89efec62`

| Field | Value |
|-------|-------|
| Kaizen | K EC 1.47 |
| Polish | PP-4 |
| Dispatched | ~2026-08-14 06:53 UTC |
| Agent | `bc-51dcfe26-06b0-4887-bcbf-fdf0bde8f4d8` (IDLE) |
| PR | [#150](https://github.com/aziz-mubasher/EasyCasa/pull/150) draft @ 06:58 UTC |
| Claude false report | “still running, no PR” |

Ledger row seeded in `status-ledger.json` with `lifecycle=pr_open`.

---

## 6. Definition of done for this feedback loop

- [x] Public ledger + schema in repo  
- [x] Upsert/validate/claude-block script  
- [x] Always-on Cursor rule  
- [x] Claude poll algorithm documented here  
- [ ] Claude Desktop standing prompt updated to WebFetch ledger before answering status questions (Aziz / Claude config — **human**)  
- [ ] Optional: bridge native `pr_url` sync (bridge repo — **human**)
