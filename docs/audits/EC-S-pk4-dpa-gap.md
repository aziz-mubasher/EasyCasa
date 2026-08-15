# EC-S PK-4 — Bunny DPA evidence gap (2026-08-15)

**Status:** **CLOSED 2026-08-15 — residual risk accepted (option 3)**  
**Related:** PK-4 CDN ops-live (`MEDIA_CDN_ENABLED=true`); private-doc leak check **PASS** (`docs/audits/EC-S-pk4-private-doc-leak-check.md`)  
**Authoriser:** AZM via Cursor — *proceed to complete PK-4 DPA gap … evidence | rollback | accept residual risk* (chose **accept residual risk**; no DPA citation supplied; no rollback ordered).

## What happened

PK-4 was executed on AZM Cursor instruction *“proceed with pk 4”* without a Claude-dispatched brief that included:

- a Kaizen code (agent invented **K EC 1.55**), or  
- a **cited countersigned Bunny.net DPA** (doc id / date / path).

The enablement audit initially recorded DPA as “authorised by AZM proceed” and ticked T05 §4. That was **wrong**. Product-owner proceed ≠ DPA evidence. Listing photos are personal data in context; T05 §4 still requires an executed processor DPA before treating T10 as **counsel-cleared**.

## Decision (2026-08-15)

| Option | Chosen? | Notes |
|--------|---------|-------|
| 1. Evidence — cite countersigned DPA | **No** | No doc id / date / path provided |
| 2. Rollback CDN | **No** | AZM ordered complete-gap without rollback; CDN stays on |
| 3. Accept residual risk | **Yes** | CDN remains ops-live under documented product-owner residual risk |

### Residual-risk acceptance (record)

- **Who:** AZM (product owner) via Cursor cloud agent instruction to close the gap.  
- **What stays live:** `MEDIA_CDN_ENABLED=true`, host `https://easycasa1.b-cdn.net`, listing masters on Bunny.  
- **What is NOT claimed:** Bunny.net DPA executed / T10 counsel-cleared. T05 §4 checkbox stays **☐** until a countersigned DPA is cited.  
- **Private docs:** Unchanged — VO/checklist on MinIO only (leak check PASS).  
- **Follow-up still recommended:** Obtain and file Bunny.net DPA; then re-tick T05 §4 with citation (does not require another CDN flip).

## Posture after close

| Item | State |
|------|--------|
| Listing CDN (ops) | **Live** — `easycasa1.b-cdn.net` |
| Gap closure path | **Residual risk accepted** |
| T05 Bunny DPA checkbox | **☐ not evidenced** — counsel gate still open |
| Private VO/checklist | **Stay MinIO** — leak check PASS 2026-08-15 |
| Standing brief rules | §C.14 unchanged — future CDN work still needs DPA **evidence** in the brief |

## What this does *not* reopen

- Dual-store private MinIO eng (still required and verified).  
- PK-2 checklist / PK-1 VO feature flags (separate from DPA).  
- Invented Kaizen / hostname lessons (standing rules).  
- PK-5–PK-8 parked counsel/product gates.
