# EC-35 — Ex2 lotto-7 auction lot association (completion)

**Date:** 2026-08-14  
**Kaizen:** K EC 7.3 · Operations · Improve  
**Branch:** `cursor/ec-35-ex2-lot7-association-5db0`  
**Adjudication:** `Ex2-7 = 64906` (AZM screenshot of `avviso quarta vendita lotto 4_7.pdf` — Lotto 7 prezzo base €64.906 / offerta minima €48.680)

## What shipped

1. **Tighten lot association** for sourced auction numbers on multi-lot pages:
   - Reject values that appear only under another lot’s section (overrides wrong LLM `lotto` / `dettaglio` tags).
   - Require numeric values to sit in the target lot section when sections exist (drop page-mention fallthrough).
2. **Clear first-fill bleed** when every candidate is lot-rejected (`auction_other_lot_cleared`).
3. **Deterministic avviso lot-section parse** for `prezzo_base` / `offerta_minima` (Italian money + current-vendita scoring) so a wrong-only LLM pick of `153850` recovers `64906`/`48680` (`auction_lot_section_parse`).
4. **Fixtures** covering: untagged distractor lot, wrong LLM tags, older vendita under same lot, first-fill survival. Lotto 4 = `36039` regression fence.

## Out of scope

- No schema bump, no flag flips, no Ex7 micro-chunk changes, no counsel send.

## Verify

- `services/ai` pytest `tests/test_aste_extract.py` — **57 passed** (includes EC-35).
- **Still required on Mac:** live Ex2-7 (ideally full 8/8) after deploy tip ≥ this PR; counsel packet send remains the other G1 human gate.
