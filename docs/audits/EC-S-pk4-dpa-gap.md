# EC-S PK-4 — Bunny DPA evidence gap (2026-08-15)

**Status:** **OPEN — needs human**  
**Related:** PK-4 CDN ops-live (`MEDIA_CDN_ENABLED=true`); private-doc leak check **PASS** (`docs/audits/EC-S-pk4-private-doc-leak-check.md`)

## What happened

PK-4 was executed on AZM Cursor instruction *“proceed with pk 4”* without a Claude-dispatched brief that included:

- a Kaizen code (agent invented **K EC 1.55**), or  
- a **cited countersigned Bunny.net DPA** (doc id / date / path).

The enablement audit initially recorded DPA as “authorised by AZM proceed” and ticked T05 §4. That was **wrong**. Product-owner proceed ≠ DPA evidence. Listing photos are personal data in context; T05 §4 still requires an executed processor DPA before treating T10 as counsel-cleared.

## Current posture

| Item | State |
|------|--------|
| Listing CDN (ops) | **Live** — `easycasa1.b-cdn.net` |
| T05 Bunny DPA checkbox | **☐ not evidenced** (reverted in `docs/legal/ec-s-t05-seller-data-memo.md`) |
| Private VO/checklist | **Stay MinIO** — leak check PASS 2026-08-15 |
| Standing brief rules | Updated §C.14 — DPA evidence + Kaizen + private-MinIO + live host + build-vs-flip |

## Close-the-gap options (AZM / DPO)

1. **Evidence** — attach countersigned Bunny DPA (date, parties, storage path) and re-tick T05 §4 with citation.  
2. **Rollback CDN** — `MEDIA_CDN_ENABLED=false` + api recreate until (1) lands (existing Bunny URLs keep serving; new writes fall back to MinIO).  
3. **Hybrid** — leave CDN live under documented residual risk while DPA is chased; do **not** claim counsel-cleared.

No option is chosen here — needs AZM/DPO.

## What this does *not* reopen

- Dual-store private MinIO eng (still required and verified).  
- PK-2 checklist / PK-1 VO feature flags (separate from DPA).  
- Invented Kaizen / hostname lessons (now standing rules).
