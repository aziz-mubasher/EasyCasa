# EC-S — VO staffing + Bunny DPA cite — R&D report (for Claude)

**Date:** 2026-08-15  
**Authoriser:** AZM — VO reviewers named + Bunny DPA PDF uploaded; *issue a rd report*  
**Kaizen:** **K EC 1.56** (follow-on to close-out forks)  
**Bridge:** `task_ec_s_closeout`  
**PRs:** [#175](https://github.com/aziz-mubasher/EasyCasa/pull/175) (VO keep-live + DPA Option 1 path) · [#176](https://github.com/aziz-mubasher/EasyCasa/pull/176) (DPA PDF cite + T05 §4)  
**Land tip:** `7e153f2` on `origin/main` + VPS `/opt/easycasa-ita`  
**Eng tip still live:** api `gitSha=b197d65` (K156 directory honesty) — these PRs were **docs/legal only**

---

## Merge + deploy status

| Surface | State |
|---------|--------|
| `origin/main` / VPS | **`7e153f2`** |
| PR #175 | **MERGED** — VO staffing decision + Option 1 selection |
| PR #176 | **MERGED** — executed DPA PDF + T05 §4 ☑ |
| API / web rebuild | **Not required** (no runtime code change) |
| `MEDIA_CDN_ENABLED` | **`true`** (unchanged) |
| `VERIFIED_OWNER_ENABLED` | **`true`** (unchanged) |
| `verified_owner_case` count | **0** |

---

## Outcomes

| Fork | Decision | Evidence |
|------|----------|----------|
| **VO staff vs rollback** | **Keep live** | Reviewers **Ibrahim**; **Silvana** · role **`admin_superadmin`** · queue `#vo` · SLA 2bd · `docs/audits/EC-S-vo-staffing-decision.md` |
| **Bunny DPA** | **Option 1 — cite** | Mundida ↔ BunnyWay Art. 28 DPA **v2** · processing from **15 Aug 2026** · PDF `docs/legal/vendors/bunny-dpa-2026-08-15.pdf` · SHA-256 `c391dea4c9f4f004f5e394f455c7309fa122d76e987958f9eb3904dafd558b10` · citation `docs/legal/vendors/bunny-dpa-citation.md` |
| **T05 §4** | **☑** | `docs/legal/ec-s-t05-seller-data-memo.md` |
| **PK-4 gap packet** | **CLOSED** | `docs/audits/EC-S-pk4-dpa-gap.md` |
| **T10 counsel gate** | **Cleared** for DPA | CDN already ops-live since PK-4 |

### Still open (not this report’s scope)

| Item | State |
|------|--------|
| Claude Kaizen codes for PK-5…PK-8 (+ invented 1.54/1.55 reconcile) | Pending Claude |
| P7 empty-state honesty (~78% published listings with zero metrics) | Optional eng brief |
| Bunny purge-on-erase (listing media) | Optional eng — purge API still unwired |
| First real VO submission | Ops exercise for Ibrahim / Silvana |

---

## R&D FEEDBACK — for Claude

### 1. BRIEF ADHERENCE
- Recorded VO **keep-live** with named humans (**Ibrahim**; **Silvana**) and **`admin_superadmin`** — no flag rollback, no invented Kaizen codes.
- Completed Bunny **Option 1** only after executed PDF was provided; ticked T05 §4 with citation path + SHA-256.
- Did **not** treat product-owner “proceed” alone as DPA evidence (standing rule held until PDF landed).
- Merged via `:main` push; VPS docs pulled; no unnecessary container rebuild.

### 2. WHERE THE BRIEF FAILED YOU
- **Ambiguous:** Keycloak *usernames* for Ibrahim/Silvana were not supplied — recorded as human display names + role `admin_superadmin`. Guess: they already have (or will use) accounts with that role; not re-verified in Keycloak this turn.
- **Missing:** Bunny dashboard credentials — agent cannot Accept DPA; blocked until AZM uploaded `bunny.net DPA v2 15 Aug 2026.pdf`.
- **Over-specified:** none — Option 1 steps in the gap packet were usable.
- **Wrong:** none about stack; prior residual-risk “CLOSED” language had already been reopened correctly by K EC 1.56.

### 3. REPO REALITY CHECK
- **Stack:** pnpm monorepo; Nest API; Next web; Traefik-pair VPS `/opt/easycasa-ita`; SQL under `migration/sql/`; land = `git push origin <branch>:main`.
- **Conventions:** counsel evidence under `docs/legal/`; audits under `docs/audits/`; bridge via `node scripts/azm-bridge-status.mjs`; Kaizen codes must not be invented by Cursor.
- **Already existed:** CDN live (`easycasa1.b-cdn.net`); VO live with 0 cases; K EC 1.56 close-out had left VO fork + DPA Option 1 pending.
- **PDF facts:** Controller **Mundida** (Piazza Roma 8, 25030 Torbole Casaglia); Processor **BunnyWay d.o.o.**; start **15 Aug 2026**; 6-page wkhtmltopdf export.
- **Fragile:** Storage Zone keys ≠ account login; docs-only deploys need VPS `git pull` but not `--no-cache` rebuild.

### 4. EFFORT SIGNAL
- Smaller than K156 eng (directory `operator_managed`). Correctly two short follow-ons (#175 path, #176 cite) after human decisions + PDF.
- Should stay one Kaizen (1.56 follow-on) — do not invent a new code for the cite alone unless Claude wants a board row.

### 5. BLOCKED / NEEDS A HUMAN
- **Claude:** assign real Kaizen codes for PENDING Claude PK-5…8; reconcile invented **K EC 1.54 / 1.55**.
- **AZM / ops:** ensure Ibrahim & Silvana can actually sign into `https://admin.easycasaita.com/#vo` before first seller submit.
- **Optional eng brief:** Bunny Storage/CDN purge on listing erase; P7 seller empty-state copy.

### 6. NEXT TASK SHOULD ACCOUNT FOR
- Attach executed vendor DPA PDF **in the same message** as Option 1 if full close is required in one agent turn.
- Name Keycloak usernames (not only first names) when staffing admin capabilities.
- Prefer draft PR **before** `:main` land when Claude needs a mid-flight PR URL (this pair opened #175/#176 then landed).
- Do not re-open Bunny DPA residual-risk language — cite is authoritative now.
- Remaining EC-S honesty work is **P7 sparse dashboards** + board code hygiene, not CDN/VO forks.

---

*Forward this section to Claude as the R&D close-out for VO staffing + Bunny DPA cite (K EC 1.56 follow-on).*
