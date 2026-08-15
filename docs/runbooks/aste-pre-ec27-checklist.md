# Pre-EC-27 checklist — Analisi Aste monetization lane

**Opened:** 2026-08-15 (G1 FULL GREEN flip)  
**Owner:** R&D / AZM · **Board:** Kaizen K EC 7.3  
**Canonical G1 ledger:** `docs/audits/aste-g1-hardening-roadmap-ec29-33.md`  
**G2 / public enable:** still `docs/runbooks/aste-enable.md` (counsel **answers**, not this checklist)

Do **not** flip `ASTE_ANALYSIS_ENABLED`. Do **not** treat G1 green as G2.

---

## Gates

| # | Gate | Status | Notes |
| --- | --- | --- | --- |
| **(a)** | G1 fully green | **✓ DONE** 2026-08-15 | Eval bar product-accepted + `packet sent 2026-08-15 (response requested by 2026-08-29)` + waitlist WAIVED |
| **(b)** | EC-24 OMI sconto-reale tolerates `valore_stima = not_found` | **✓ DONE** 2026-08-15 | Tolerant as-built; tests in PR — `buildOmiCheck` null-safe; report shows em dash / `non rilevato` |
| **(c)** | Drive GT true-score vs `EC_Aste_GoldenSet_GroundTruth_v1.md` | **OPEN** (recommended) | Human; watch GT-3/Ex4 urbanistica prose vs `non_rilevato` |

**Dispatch rule:** EC-27 (payments split) / further monetization briefs may be **authored** after (a). **Do not start build/merge** until **(b) is ✓**. Prefer (c) before charging real users.

EC-28 financing lane code already shipped (#119) dark — re-send only if product wants a new slice; do not re-brief as if missing.

---

## (b) EC-24 verify recipe (agent or Mac)

1. Locate OMI sconto-reale path (report / AI service) that consumes `valore_stima`.
2. Fixture or unit case: extraction has `prezzo_base` but `valore_stima` is `not_found` (and/or `meta.warnings` contains `valore_stima_suspect`).
3. Expected: no throw; no invented stima; sconto-reale omitted / honest empty / flagged unavailable — product-decide wording, engineering must not fabricate.
4. Paste pass note into this file under **Verify log** and mark (b) ✓.

---

## (c) Drive GT true-score (human)

1. Score post-EC-35 paste / latest Mac run against Drive GT.
2. Note residual misses (especially urbanistica on GT-3/Ex4).
3. Paste summary to R&D; mark (c) ✓ or “waived with reason”.

---

## Verify log

| Date | Gate | Result | By |
| --- | --- | --- | --- |
| 2026-08-15 | (a) | G1 FULL GREEN — counsel packet sent | AZM + ledger flip |
| 2026-08-15 | (b) | **PASS — tolerant as-built.** Fixtures: Ex2 no-perizia (lotti 4/7), suspect-cleared, derived cauzione, Ex7 honest — `buildOmiCheck` + report API return null `valore_stima_vs_omi_pct`, OMI band present, sconto from prezzo_base only when superficie known. No code fix required. | EC-24-VERIFY agent |

---

## After all ✓

1. R&D may dispatch **EC-27** (scoped payments split) as its own brief/PR.
2. G2 enable remains a **separate** checklist — counsel answers due ~2026-08-29 + VPS observability + `aste-enable.md` smoke.
