# EC Aste — G1 Hardening Roadmap (EC-29 → EC-35)

**Venture:** Easy Casa Italia · repo `aziz-mubasher/EasyCasa`  
**Updated:** 2026-08-14 (EC-29→35 complete; **eval pass bar GREEN — product-accepted**; G1 pending counsel send only)  
**Gate spec:** `docs/runbooks/aste-g1-gate.md` · Public enable: G2 / `docs/runbooks/aste-enable.md`  
**Flags:** `ASTE_ANALYSIS_ENABLED` **off** in production. No brief in this set flips any flag.  
**Board:** Kaizen EC · K EC 7.3 (AI Agent) · Operations · EC-G1-LEDGER  

**Canonical post–EC-35 R&D report:** `docs/audits/G1-post-ec35-rnd-report.md`  
**Supersedes extract-next guidance in** `docs/audits/G1-aste-status-rnd-feedback.md` (that file’s 2026-08-13 paste tables remain the pre–EC-32/33 baseline; do not re-brief urbanistica / cauzione / valore_stima extract work from it).

**Unchanged (explicit):** `ASTE_ANALYSIS_ENABLED` **off** · EC-27 / EC-28 monetization briefs **locked** until G1 fully green · G2 / `docs/runbooks/aste-enable.md` **untouched** · counsel **ANSWERS** gate G2, not G1.

---

## Gate G1 definition (do not reinterpret)

`eval pass bar` + `counsel packet sent` + `waitlist read (met or WAIVED)`.  
Counsel **answers** unlock G2, not G1.

| G1 piece | Status |
| --- | --- |
| Eval pass bar | **GREEN (product-accepted 2026-08-14)** — evidence: post-EC-34 live 8/8 (analysisIds `f97b103c…c7ad0915`: GT-5 stato clean, Ex8 derive parity, not_found reconciled, occupazione bleed resolved, Ex7 stima honest not_found, zero invented values) + EC-35 VPS smoke Ex2-7 **64906/48680** (#158, `_deterministic_lot_auction_economics`; 153850 was other-lot/older-vendita; wrong-only-LLM fixtures). Optional confirmatory Mac run (Example 2 `--lotto 4\|7`) noted as nice-to-have, **not gating**. |
| Counsel packet sent | **NOT SENT — the only open G1 box.** G1 flips to full GREEN on `packet sent <date>`. |
| Waitlist | **WAIVED** (1 lead, 2026-08-11) |

**G1 as a whole is NOT yet green** — eval bar accepted; counsel send remains.

---

## Task ledger

| Task | Scope | Status | PR / SHA |
| --- | --- | --- | --- |
| **EC-29** | Large-dossier map-reduce chunking (~90k chars), 429 backoff, upstream 4xx surfacing, eval DX (compiled invoke, AppleDouble skip, process.exit) | **MERGED + deployed** | `57b0f1f` |
| **EC-30** | Field-specific source precedence (`_apply_field_precedence`), occupazione enum + normalization, perizia keyword packing (`FIELD_CONTEXT_KEYWORDS`), derived cauzione importo (`derived: true`) | **MERGED + deployed** | [#134](https://github.com/aziz-mubasher/EasyCasa/pull/134) `fab9973` |
| **EC-31** | Scorer unwrap `{value\|importo}` + page → paste-ready TSV; G1 runbook truth-up; commented .env placeholders | **MERGED + deployed** | [#136](https://github.com/aziz-mubasher/EasyCasa/pull/136) `0ebf1be` |
| **EC-32** | Urbanistica/catastale structured conformità (enum + difformita[]), lot-filtered precedence (lotto_label into `_apply_field_precedence`), cauzione patterns (a)/(b)/(c) + offer-based no-derive, GT-5 negative-space fixture, scorer lotto-H noise fix, same-shell-AI runbook note | **MERGED + deployed** | [#144](https://github.com/aziz-mubasher/EasyCasa/pull/144) `0b861ee` |
| **EC-33** | valore_stima correctness: total-not-€/mq prompt guard, `valore_stima_suspect` plausibility guard (`VALORE_STIMA_MIN_PREZZO_BASE_RATIO`, default 0.01), per-lot stima filter, stima keyword packing (micro-chunk held as fallback, 0 extra tokens) | **MERGED + deployed** | [#146](https://github.com/aziz-mubasher/EasyCasa/pull/146) `fe1e0c7` |
| **EC-34** | Ex2 lot-bleed economics (auction fields lot-scoped), GT-5 orphaned stato → `non_rilevato`, Ex7 stima micro-chunk (`ASTE_STIMA_MICROCHUNK_ENABLED`), not_found reconcile, Ex8 derive parity | **MERGED + deployed** | [#154](https://github.com/aziz-mubasher/EasyCasa/pull/154) `fc64987` |
| **EC-35** | Deterministic lot-section auction economics (`_deterministic_lot_auction_economics`); Ex2-7 adjudicated **64906/48680** (153850 = other-lot/older-vendita; wrong-only-LLM fixtures); VPS smoke green | **MERGED + deployed** | [#158](https://github.com/aziz-mubasher/EasyCasa/pull/158) `6f92e31` |

Completion audits: `docs/audits/EC-30-completion-feedback.md` … `EC-35-completion-feedback.md`, plus batch `EC-30-31-T20-batch-completion.md`.

---

## Eval state (post-EC-34 live 8/8 + EC-35 VPS smoke)

Post-EC-34 live 8/8 `ready` (analysisIds `f97b103c…c7ad0915`). EC-35 closed Ex2-7 economics on VPS smoke **64906/48680** (lot4 **36039**).

| Field | State | Owner |
| --- | --- | --- |
| prezzo_base / offerta_minima / rilancio | Hit all cases with page refs; Ex2-7 **64906/48680** product-accepted | EC-35 ✓ |
| occupazione (`giuridica.stato_occupazione`) | Hit 8/8 (enum + text) | EC-30 ✓ |
| urbanistica.conformita | Live green post-EC-34; optional Drive GT true-score | Verify at counsel/G2 |
| cauzione.importo | Live green post-EC-34 / EC-35 | EC-32 ✓ |
| valore_stima | EC-33 guards + Ex7 honest not_found live | EC-33 ✓ |
| Zero invented values | `meta.not_found` discipline holding | Standing rule |

**Product call (AZM, 2026-08-14):** eval pass bar **GREEN — product-accepted**. Mac Example 2 `--lotto 4\|7` re-run is confirmatory only.

---

## Standing rules (every future EC aste brief)

1. One agent per **scope**, not just per task code — check running tasks and open PRs for overlap before dispatch (#135/#137 lesson).
2. `aste_extract.py` is single-writer: sequence briefs that touch it; never parallel.
3. Additive schema fields only; no `schema_version` bump unless truly required (EC-30 precedent). Occupazione path is `giuridica.stato_occupazione`.
4. Zero invented values: unknown → `not_found`; deterministic arithmetic only, flagged `derived: true`; junk rejection (not invention) allowed with meta warning.
5. Field-specific source priority: auction economics avviso > ordinanza > perizia; valore_stima / occupazione / urbanistica perizia-first; lot filter via `lotto_label`.
6. Do not re-brief Ex7 400 / chunk size unless regression. Do not re-litigate the runbook invoke section.
7. Synthetic Italian fixtures only — no real court PDFs in git (third-party PII).
8. Flags stay off; G2 + `aste-enable.md` govern public enable; never brief EC-27/EC-28 as "G1 green" until the gate ledger says **full G1 green** (counsel sent).

---

## Operator verification recipe (host stack, AZM Mac)

Run on tip ≥ **`6f92e31`** (EC-35). AI service must live in the **same long-lived shell** as the suite; ~90s cooldown between cases; MinIO data dir on `/Volumes/Muba/easycasa-minio-data`; host tesseract + ita installed. Cloud agents cannot run this (Drive PDFs).

```bash
BASE="/Volumes/Muba/Easy Casa Italia/EC Aste "
# Env: EVAL_LIVE=1 ASTE_ANALYSIS_ENABLED=true ALLOW_PROVIDER_STUBS=true
#      AI_URL / S3_ENDPOINT / MEILI_URL / REDIS_URL / DATABASE_URL / AI_INTERNAL_TOKEN
pnpm --filter @easycasa/api run aste:eval "${BASE}/Example 1 "        # trailing space is real
pnpm --filter @easycasa/api run aste:eval "${BASE}/Example 2" --lotto 4
pnpm --filter @easycasa/api run aste:eval "${BASE}/Example 2" --lotto 7
pnpm --filter @easycasa/api run aste:eval "${BASE}/Example 4"
pnpm --filter @easycasa/api run aste:eval "${BASE}/Example 5"
pnpm --filter @easycasa/api run aste:eval "${BASE}/Example 7" --lotto H
pnpm --filter @easycasa/api run aste:eval "${BASE}/Example 8" --lotto A
pnpm --filter @easycasa/api run aste:eval "${BASE}/Example 8" --lotto B
```

Pass-bar checks on the paste tables: economics + page refs all hit; urbanistica.conformita populated; cauzione importo present or legitimately not_found (offer-based); valore_stima plausible totals (no €/mq-scale values); GT-5 lotto H difformita=0; `meta.not_found` honest.

---

## Remaining to close G1 (one box)

**Operator checklist (AZM):** `docs/runbooks/aste-g1-human-close.md` — counsel send only (eval bar accepted).

1. **Counsel email** — checklist rows 1–8 (LGL-1 = row 8) → reply `packet sent YYYY-MM-DD (response requested by YYYY-MM-DD)`. **This is the only open G1 box.**
2. **Drive GT true-score** (recommended, human) — also watch GT-3/Ex4 urbanistica `non_conforme`→`non_rilevato` vs perizia prose.
3. Board hygiene — link PRs #134/#136/#144/#146/#154/#158 to K EC 7.3.

**One-line flip when counsel sends:** update counsel row above to `packet sent <date>` → G1 fully green.

After **full** G1 green: EC-27 (payments split) and EC-28 lane work unlock; G2 (flag enable) still requires observability on VPS, counsel EXTERNAL sign-off, and `aste-enable.md` smoke.

---

## Pre-EC-27 checklist (stub — do not dispatch EC-27 until all ✓)

| # | Gate | Notes |
| --- | --- | --- |
| (a) | **G1 fully green** | Counsel packet **sent** (`packet sent <date>` recorded in this ledger) |
| (b) | **EC-24 OMI sconto-reale** | Verify tolerates `valore_stima = not_found` (EC-33/34 guards can legitimately clear stima) |
| (c) | **Drive GT true-score** | Recommended human evidence before monetization lane |

EC-27 / EC-28 monetization briefs remain **locked** until (a).

---

## Agent verify

| Check | Result |
| --- | --- |
| SHAs on `origin/main` | `57b0f1f` … `fc64987`, **`6f92e31`** (EC-35) on `main` |
| VPS `/opt/easycasa-ita` | `ai` rebuilt+recreated; in-container smoke lot7 **64906/48680**, lot4 **36039** |
| Pytest (cloud) | `test_aste_extract.py` **61/61** |
| Live 8/8 post-EC-34 | **DONE** 2026-08-14 — 8/8 ready; Ex2-7 closed by EC-35 VPS smoke + product acceptance |
| Eval pass bar | **GREEN (product-accepted 2026-08-14)** |
| Full G1 | **Pending counsel send only** |

**Do not** claim **full** G1 closed or flip `ASTE_ANALYSIS_ENABLED` until `packet sent <date>` lands in this ledger.
