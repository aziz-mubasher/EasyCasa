# Internal CRM — Controller responsibility acknowledgment (K EC 4.1)

**Date:** 2026-08-02  
**Entity:** MUNDIDA S.r.l. (EasyCasa) — P.IVA IT04531990986  
**Audience:** Internal + counsel package  

---

## Decision

MUNDIDA S.r.l., as **data controller** for EasyCasa, takes **full legal responsibility** for personal data processed in the internal CRM (`crm` schema / `/admin/crm`), including contacts unified across seekers, owners, Banks4All Phase A attestation fields, partners, activities, tasks, and the CRM audit log.

## Consent applied (gate status)

| Field | Value |
| --- | --- |
| **Status** | **Consent applied** — engineering gate for §1.6 Q2a / B7 cleared for enablement |
| **Applied** | 2026-08-02 |
| **By** | MUNDIDA S.r.l. (controller) |
| **Scope** | Art. 13 informativa coverage + retention schedule for internal CRM (engineering defaults confirmed: dormant seekers **24 months** via `CRM_DORMANT_RETENTION_MONTHS`) |
| **Effect** | Production may set **`CRM_ENABLED=true`**. Repo/code default remains `false` so local/CI/demo stay off unless explicitly enabled. |

Draft public wording remains in `privacy-policy.md` §8 until counsel supplies final IT/EN/ES text and a `policyVersion` bump is scheduled.

## Enablement checklist

1. [x] Controller responsibility acknowledged.
2. [x] Consent applied for informativa + retention gate (§1.6 Q2a / B7) — this document.
3. [ ] Ops: set `CRM_ENABLED=true` (and confirm `CRM_DORMANT_RETENTION_MONTHS=24`) in the **production** environment `.env` only — never commit live secrets.
4. [ ] When counsel returns final copy: merge into live privacy surfaces and bump `policyVersion` as directed.

## Related

| Item | Path |
| --- | --- |
| Spec | `docs/crm.md` |
| Counsel Q2a | `docs/legal/COUNSEL-REVIEW-PACKAGE.md` §1.6 |
| Draft privacy wording | `docs/legal/privacy-policy.md` §8 |
| Instruction letter item | `docs/legal/counsel-instruction-letter.md` B7 |
