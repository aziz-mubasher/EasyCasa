# EC-S PK-7 + PK-8 — completion R&D feedback (for Claude)

**Date:** 2026-08-15  
**Authoriser:** AZM — *proceed for pk 7 and pk 8* · follow-up *merge, deploy and creat feedback*  
**Kaizen:** **PENDING Claude PK-7+8** (distinct from PK-5/6 pending key — ledger collision lesson)  
**Bridge:** `task_pk7_pk8`  
**Land path:** `git push origin cursor/pk7-pk8-enablement-6d4e:main` (no draft PR race — branch equalled `main` before PR create)

## Merge + deploy status

| Surface | Tip / state |
|---------|-------------|
| `origin/main` | **`4cb3209`** (PK-7/8 + feedback finalize + bridge merged) |
| VPS `/opt/easycasa-ita` | **`4cb3209`** — `git reset --hard origin/main` |
| Migration `0069` | Applied — **7** paid rows |
| API rebuild | **Not required** (SQL seed only) |
| Web rebuild | **Not required** (directory is API-driven) |
| Draft PR | **None** — land-before-PR (`:main` push); see land tip commit |

## Live verification (re-confirmed 2026-08-15 after merge+deploy)

| Check | Result |
|-------|--------|
| VPS tip | `4cb3209` |
| Live directory | **7 / 7** paid (`GET https://easycasaita.com/api/partners/directory`) |
| Pilot sample | `EasyCasa Pilot · Photo · BS`, contact `partner-directory@easycasaita.com` |
| Claim 1 no-script HTML | `7.500` + `portale, non` still present (PK-7 did not touch copy) |
| Artifacts | `/opt/cursor/artifacts/pk78_deploy_smoke_summary.log` |

## Outcomes

| ID | Path | Result |
|----|------|--------|
| **PK-7** | Residual risk / product-owner sufficiency | Claim 1–2 stay live; external countersign **deferred** — `docs/audits/EC-S-pk7-counsel-countersign-closeout.md` |
| **PK-8** | Mundida pilot desk seed | Migration `0069`; `paid_placement=true` rows live — `docs/audits/EC-S-pk8-seed-paid-partners.md` |
| Polish backlog | PK-1…PK-8 | **Empty** |

## R&D FEEDBACK — for Claude

### 1. BRIEF ADHERENCE
- Closed both remaining polish gates on AZM proceed.
- Did **not** invent Kaizen codes.
- Did **not** claim an external law firm signed Claim 1–2 PDFs.
- Merged via `:main` push; VPS pulled tip + migration already applied (re-confirmed).

### 2. WHERE THE BRIEF FAILED YOU
- Ambiguous whether “proceed PK-7” meant engage counsel or accept residual risk — chose residual (only path consistent with no counsel PDFs attached), matching polish note “claims are public on product-owner sign-off only”.
- Missing partner names for PK-8 — seeded clearly labelled **EasyCasa Pilot** Mundida desk rows (non-impersonation), not fake albo professionals.
- Kaizen collision: prior `PENDING Claude` key overwrote PK-5/6 in the bridge ledger when upserting by kaizen — fixed with distinct `PENDING Claude PK-7+8` / `PENDING Claude PK-5+6`.
- “Merge” after `:main` land: draft PR create failed with “no differences” — expected when land-before-PR; tip commits still on `main`.

### 3. REPO REALITY CHECK
- Partner directory was **empty** on VPS before PK-8; empty banner was correct (§C.13).
- Seed is SQL-only (no api/web rebuild required for data).
- Claims 1–2 were already live since 2026-08-13; PK-7 is documentation/risk posture, not a ledger flip.
- Stack: pnpm monorepo; Nest API; Next web; Vite admin; SQL under `migration/sql/`; Traefik-pair VPS.

### 4. EFFORT SIGNAL
- Smaller than PK-5/6: docs + seed migration + VPS apply. Correctly two polish IDs in one AZM proceed.

### 5. BLOCKED / NEEDS A HUMAN
- Claude: assign real Kaizen codes for PK-5…PK-8 pending rows on the board.
- Optional: replace pilot desk rows with real paid partners (outreach or PP-1 checkout).
- Optional: later external counsel PDF countersign for Claim 1–2 (does not block product).

### 6. NEXT TASK SHOULD ACCOUNT FOR
- Never reuse the same `kaizenCode` string for different bridge tasks when Kaizen is pending.
- Pilot directory seeds must not invent individual professional identities.
- EC-S post-roadmap polish backlog is now **empty** — new work needs a new brief.
- Prefer open draft PR **before** `:main` land if Claude needs a PR URL mid-flight.

---

*Forward this section to Claude as the R&D close-out for PK-7 / PK-8.*
