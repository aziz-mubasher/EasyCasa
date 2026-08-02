# Internal CRM — Controller responsibility acknowledgment (K EC 4.1)

**Date:** 2026-08-02  
**Entity:** MUNDIDA S.r.l. (EasyCasa) — P.IVA IT04531990986  
**Audience:** Internal + counsel package  

---

## Decision

MUNDIDA S.r.l., as **data controller** for EasyCasa, takes **full legal responsibility** for personal data processed in the internal CRM (`crm` schema / `/admin/crm`), including contacts unified across seekers, owners, Banks4All Phase A attestation fields, partners, activities, tasks, and the CRM audit log.

This acknowledgment does **not** replace counsel review. It records the company’s assumption of controller liability for client data once processing is lawfully enabled.

## Engineering gate (unchanged)

Counsel must still clear **Art. 13 informativa coverage + retention schedule** for this processing — see [`COUNSEL-REVIEW-PACKAGE.md`](./COUNSEL-REVIEW-PACKAGE.md) **§1.6 question 2a**.

Until counsel clears 2a:

- Keep **`CRM_ENABLED=false`** in production and defaults (`.env.example`, `docs/env.md`).
- Do **not** ingest production personal data into CRM hooks / retention jobs.
- Code and schema may remain merged behind the flag.

## After counsel clears 2a

1. Incorporate approved informativa / retention wording into the live privacy policy and bump `policyVersion` as counsel directs.
2. Set `CRM_ENABLED=true` only in the target environment `.env` (never commit secrets or live toggles).
3. Record counsel decision date + name under `docs/legal/` (do not treat drafts as approved until then).

## Related

| Item | Path |
| --- | --- |
| Spec | `docs/crm.md` |
| Counsel Q2a | `docs/legal/COUNSEL-REVIEW-PACKAGE.md` §1.6 |
| Draft privacy wording | `docs/legal/privacy-policy.md` §8 |
| Instruction letter item | `docs/legal/counsel-instruction-letter.md` B7 |
