# EC-S-34 — PK-7 reopened

**Date:** 2026-09-07  
**Kaizen:** K EC 1.59 (honesty pass). Do not invent a new code for PK-7.  
**counsel_status:** `not-reviewed`

## Why this is not closed

The 2026-08-15 close-out (`docs/audits/EC-S-pk7-counsel-countersign-closeout.md`) treated product-owner residual risk as sufficient to leave Claim 1–2 live. That collapses `signedBy: AZM` and `signedBy: counsel` into one boolean, which `CLAUDE.md` §4 forbids.

Homepal (CCIAA Milano 2019) makes that collapse material: the live seller-track configuration is the sanctioned model, feature for feature. A product-owner signature on consumer copy that asserts a regulatory posture is not counsel.

## What this note does not do

- Does not flip flags.
- Does not edit `docs/legal/T04_mediazione_boundary.md` or `mediation-disclosure.md`.
- Does not restore P1 / `savingsFigures` / `mediazioneCopy` / P8. Those are `hidden` on the seller page (register = retracted until EC-S-35).
