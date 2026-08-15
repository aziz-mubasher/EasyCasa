# EC-S — VO staffing decision (keep live)

**Date:** 2026-08-15  
**Authoriser:** AZM (Cursor)  
**Related:** K EC 1.56 close-out Item 1 · PK-1 / K EC 1.54 · `docs/audits/EC-S-closeout-2026-08-15.md`

## Decision

| Field | Value |
|-------|-------|
| Choice | **Keep VO live** (do **not** roll back) |
| Flag | `VERIFIED_OWNER_ENABLED=true` (unchanged) |
| P3 chip | **Attivo** / ledger `live` (unchanged) |
| Queue | `https://admin.easycasaita.com/#vo` |
| Capability | `vo_moderation` via Keycloak role **`admin_superadmin`** |
| Named reviewers | **Ibrahim**; **Silvana** |
| SLA | **2 business days** (unchanged from PK-1) |
| Stall policy | Cases stay `submitted` / `in_review` until Claim → Verify/Reject; escalate in `#vo` |
| Submissions at decision | **0** (`verified_owner_case` count) |

## Why now

Close-out required either staffing or rollback while submissions were still zero. AZM named reviewers and chose keep-live — moderation capacity is now an **ops commitment**, not an open product fork.

## Ops checklist for Ibrahim / Silvana

1. Sign in to admin with an account that has **`admin_superadmin`** (grants `vo_moderation`).
2. Open **Verified Owner** → `#vo`.
3. On first seller submit: **Claim** → review private docs → **Verify** or **Reject** (canonical reject phrases in `docs/runbooks/ec-s-vo-enablement.md` §3).
4. Target turnaround: **2 business days**.

## Status

| Item | State |
|------|-------|
| VO product fork (staff vs rollback) | **CLOSED — staff / keep live** |
| Production moderation untested | Still true until first real case — reviewers must be ready |

*No env or web rebuild required for this decision.*
