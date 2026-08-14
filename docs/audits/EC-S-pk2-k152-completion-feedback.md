# EC-S PK-2 / K EC 1.52 — completion R&D feedback (for Claude)

**As of tip on `main` + VPS `/opt/easycasa-ita` (2026-08-14).** Document checklist **LIVE**; Verified Owner **stays dark**. Enablement record: `docs/audits/EC-S-pk2-checklist-enablement.md`. VO prep runbook: `docs/runbooks/ec-s-vo-enablement.md` (**do not execute**).

## What landed

| Item | Notes |
|------|-------|
| Flag | `SELLER_CHECKLIST_ENABLED=true` (runtime api recreate) |
| Ledger | `promises.P6` `coming` → **`live`** (web rebuild required) |
| VO | `VERIFIED_OWNER_ENABLED=false` unchanged; P3 stays `coming` |
| PR | [#159](https://github.com/aziz-mubasher/EasyCasa/pull/159) — residual ledger tip after feat `be8517b` already on main |
| Bridge | `task_e38c40e8` · agent `bc-0ec20d2c-…` |

## Deploy smoke (re-verified on merge close-out)

| Check | Result |
|-------|--------|
| Container `SELLER_CHECKLIST_ENABLED` | **true** |
| Container `VERIFIED_OWNER_ENABLED` | **false** |
| `GET /api/seller/checklist/me` unauth | **401** (not flag-404) |
| `/it/vendi-da-privato` P6 | **Attivo** / `sp-chip--live` + Checklist documenti |

## R&D FEEDBACK — for Claude

### 1. BRIEF ADHERENCE
- Checklist flip only; VO deliberately dark; VO runbook written prepare-only; P6 ledger live; seller-dashboard flag matrix updated.

### 2. WHERE THE BRIEF FAILED YOU
- Building agent initially pointed ledger at **PR #158** (EC-35) with `bridgeTaskId: null` — corrected to `task_e38c40e8` / #159.
- Bridge `run-*` id is not a Cursor `bcId`.

### 3. REPO REALITY CHECK
- Checklist flag = API runtime (no `NEXT_PUBLIC_*`). P6 chip = web build-time (`promises.json`).
- Traefik compose pair mandatory on recreate.
- Unauth + flag on → **401**; VO JWT-before-flag may also 401 while still dark.

### 4. EFFORT SIGNAL
- Ops flip + docs/runbook; correctly one Kaizen. Residual PR was ledger hygiene after direct main land of feat.

### 5. BLOCKED / NEEDS A HUMAN
- Mark **K EC 1.52** complete on Kaizen.
- Operator: authenticated `/seller/listings/<id>/documents` upload → score.
- **PK-1** blocked on moderation capacity (named reviewer + SLA) — runbook ready.

### 6. NEXT TASK SHOULD ACCOUNT FOR
- Next product gate: **PK-1** (VO) or **PK-3** (analytics).
- Always set `bridgeTaskId` + correct `prUrl` when upserting (do not reuse stale `existing.prUrl`).

## Bridge status

```
<!-- AZM_BRIDGE_STATUS_BEGIN -->
bridgeTaskId: task_e38c40e8
kaizenCode: K EC 1.52
polishId: PK-2
lifecycle: merged
agentStatus: IDLE
prUrl: https://github.com/aziz-mubasher/EasyCasa/pull/159
prState: MERGED
summary: PK-2 / K EC 1.52 MERGED + DEPLOYED. Checklist live; VO dark; P6 Attivo.
nextAction: Mark Kaizen K EC 1.52 complete; authenticated checklist smoke; PK-1 when moderation ready.
pollUrl: https://raw.githubusercontent.com/aziz-mubasher/EasyCasa/main/docs/azm-deliverables/_bridge/status-ledger.json
<!-- AZM_BRIDGE_STATUS_END -->
```
