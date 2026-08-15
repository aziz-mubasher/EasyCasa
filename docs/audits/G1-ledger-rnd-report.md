# G1 — R&D report after EC-G1-LEDGER (product acceptance)

**Date:** 2026-08-15  
**Audience:** Claude / R&D (forward via Aziz)  
**Task:** EC-G1-LEDGER · Kaizen **K EC 7.3** · Operations · Control  
**Bridge (canonical):** `task_8d0a770d` — **not** `task_16e474f8` (that id was never registered)  
**Agent:** `bc-7fea1533-0af9-41e9-94fd-740e880be431` (“G1 product acceptance”) — **IDLE**  
**PR:** [#161](https://github.com/aziz-mubasher/EasyCasa/pull/161) **MERGED** @ `3efe04d` (2026-08-14T20:27Z)  
**Flags:** `ASTE_ANALYSIS_ENABLED` **off**  
**Canonical gate ledger:** `docs/audits/aste-g1-hardening-roadmap-ec29-33.md`  
**Prior extract R&D:** `docs/audits/G1-post-ec35-rnd-report.md`

---

## Operator summary (forwardable)

| G1 piece | Status | Notes |
| --- | --- | --- |
| Eval pass bar | **GREEN — product-accepted (2026-08-14)** | Post-EC-34 live 8/8 (`f97b103c…c7ad0915`) + EC-35 VPS smoke Ex2-7 **64906/48680**. Optional Mac confirmatory run is nice-to-have, **not gating**. |
| Counsel packet **sent** | **NOT DONE — only open G1 box** | Docs 1–8 on disk; human email (`aste-g1-human-close.md` Action 2) |
| Waitlist | **WAIVED** | 1 lead (2026-08-11) |
| Extract eng EC-29→35 | **COMPLETE** | Merged + deployed; no further extract briefs for G1 close |

**G1 as a whole is NOT yet green.** Eval bar accepted; counsel send flips full G1.  
**Do not** flip flags. **Do not** open G2 / `aste-enable.md` until G1 full green + enable checklist.

### Paste stub

```
G1 ledger (EC-G1-LEDGER #161 @ 3efe04d / task_8d0a770d):
eval pass bar GREEN — product-accepted 2026-08-14
  evidence: post-EC-34 live 8/8 + EC-35 VPS smoke Ex2-7=64906/48680
counsel: NOT SENT (only open G1 box)
waitlist: WAIVED · flags: OFF · extract EC-29→35: COMPLETE
G1 whole: NOT GREEN until packet sent <date>
next: AZM counsel send → reply "packet sent YYYY-MM-DD (response by YYYY-MM-DD)"
note: task_16e474f8 / run-6beca8fd were never on ledger / not accessible — use task_8d0a770d
```

---

## R&D FEEDBACK — for Claude

### 1. BRIEF ADHERENCE

**Implemented**
- Docs-only ledger update: eval pass bar → **GREEN (product-accepted)**; G1 whole still pending counsel.
- Roadmap + gate STATUS note updated; flags untouched; no extract code in #161.
- Bridge entry `task_8d0a770d` → `lifecycle=merged`, PR #161.

**Deviations**
- None material. Product decision superseded the earlier “Mac live required before eval green” engineering caution in `G1-post-ec35-rnd-report.md`.

**Skipped (correctly)**
- Flag flips, enable checklist, counsel email, new extract work.

### 2. WHERE THE BRIEF / DISPATCH FAILED YOU

| Type | Detail |
| --- | --- |
| Wrong ids | Status check asked for **`task_16e474f8`** + **`run-6beca8fd`**. Neither exists on the public ledger / accessible Cursor agents. Canonical ids: **`task_8d0a770d`** + **`bc-7fea1533…`**. |
| “Registered and running” | False at check time — work was already **merged + IDLE**. Claude should treat `lifecycle=merged` + `agentStatus=IDLE` as done, not re-dispatch. |
| Ambiguous | Whether optional Mac Ex2-7 confirmatory run remains “required” — product call said **not gating**; keep as optional evidence only. |

### 3. REPO REALITY CHECK

- R&D / gate truth lives in **this** EasyCasa repo under `docs/audits/` + `docs/azm-deliverables/_bridge/status-ledger.json` (Claude WebFetches raw `main`).
- No separate GitHub **azm-rnd** repo exists; cloud agent token **cannot** `createRepository` (403). If you want a cross-venture R&D-only repo, AZM must create `aziz-mubasher/azm-rnd` from his account, then Cursor can push scaffolding.
- Extract tip behavior unchanged by #161 (docs-only). EC-35 recovery path remains `_deterministic_lot_auction_economics` on multi-lot avvisi.

### 4. EFFORT SIGNAL

Docs-only; correctly tiny vs extract tasks. Re-dispatch after merge wastes a run.

### 5. BLOCKED / NEEDS A HUMAN

1. **Counsel packet send** — only G1 closer left. Reply format:  
   `packet sent 2026-08-DD (response requested by 2026-08-DD)`
2. Mark Kaizen **K EC 7.3** accordingly (eval green / counsel pending).
3. Optional: Mac `aste:eval` Ex2 lotto 4+7 for belt-and-suspenders (not gating).
4. If a standalone R&D GitHub repo is desired: AZM creates `aziz-mubasher/azm-rnd` (public), then ask Cursor to seed + wire Claude poll URL.

### 6. NEXT TASK SHOULD ACCOUNT FOR

- **Do not** brief more Ex2/extract work for G1 close.
- **Do not** re-dispatch EC-G1-LEDGER; poll `task_8d0a770d` / ledger.
- After `packet sent`: flip G1 full GREEN in roadmap + ledger; counsel **answers** still gate **G2**, not G1.
- Flags stay off until `docs/runbooks/aste-enable.md`.

---

## ID reconciliation (2026-08-15 status check)

| Asked | Actual |
| --- | --- |
| `task_16e474f8` | **Missing** — use `task_8d0a770d` |
| `run-6beca8fd` | **Not found / not accessible** — use `bc-7fea1533-0af9-41e9-94fd-740e880be431` |
| “running” | **IDLE** + PR **MERGED** |
