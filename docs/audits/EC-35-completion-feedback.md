# EC-35 — Deterministic lot-section economics parse (completion)

**Date:** 2026-08-14  
**Kaizen:** K EC 7.3 · Operations · Improve  
**Branch:** `cursor/ec-35-ex2-lot7-association-5db0`  
**Adjudication:** `Ex2-7 = 64906` (AZM screenshot of `avviso quarta vendita lotto 4_7.pdf` — Lotto 7 prezzo base €64.906 / offerta minima €48.680)

## What shipped

1. **Deterministic avviso lot-section parse** (multi-lot docs only, when `lotto_label` set):
   - `prezzo_base`, `offerta_minima`, `rilancio_minimo`, `cauzione.pct` from target lot section text.
   - Italian money formats (`64.906,00`, `€ 64.906`, `Euro 64.906,00`).
   - Current-vendita scoring + **75% prezzo/offerta pair heuristic** when multiple rows exist in one section.
   - Authoritative over lot-filtered LLM candidates; source doc + page on parsed values.
2. **Lot association hardening** (EC-34 gap): reject values appearing only under another lot’s section; clear first-fill bleed.
3. **Fixtures**: wrong-only LLM (red on main @ d7f24fb → green after), Ex2 headline L4/L7, honest `not_found`, single-lot bypass, Italian formats.

## Red-before / green-after

Main tip `merge_extractions(..., lotto "7")` with untagged LLM `153850/115387.5` on Ex2-shaped avviso → **153850** (fail).  
After EC-35 → **64906/48680** + `auction_lot_section_parse` warning.

## Verify

- `services/ai` pytest `tests/test_aste_extract.py` — **61 passed** (8 EC-35).
- **Mac operator post-merge:** Ex2 `--lotto 4` → 36039/27029; `--lotto 7` → 64906/48680.
