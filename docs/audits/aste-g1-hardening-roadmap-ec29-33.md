# EC Aste — G1 Hardening Roadmap (EC-29 → EC-35)

**Venture:** Easy Casa Italia · repo `aziz-mubasher/EasyCasa`  
**Updated:** 2026-08-15 — **G1 FULL GREEN** (`packet sent 2026-08-15`, response requested by **2026-08-29**)  
**Gate spec:** `docs/runbooks/aste-g1-gate.md` · Public enable: G2 / `docs/runbooks/aste-enable.md`  
**Flags:** `ASTE_ANALYSIS_ENABLED` **off** in production. G1 green does **not** flip any flag.  
**Board:** Kaizen EC · K EC 7.3 (AI Agent) · Operations · EC-G1-LEDGER  

**Canonical post–EC-35 R&D report:** `docs/audits/G1-post-ec35-rnd-report.md`  
**G1 full-green flip report:** `docs/audits/G1-full-green-rnd-report.md`  
**Pre-EC-27 checklist (OPEN):** `docs/runbooks/aste-pre-ec27-checklist.md`  
**Supersedes extract-next guidance in** `docs/audits/G1-aste-status-rnd-feedback.md` (that file’s 2026-08-13 paste tables remain the pre–EC-32/33 baseline; do not re-brief urbanistica / cauzione / valore_stima extract work from it).

**Unchanged (explicit):** `ASTE_ANALYSIS_ENABLED` **off** · G2 / `docs/runbooks/aste-enable.md` **untouched** until counsel **ANSWERS** + observability + enable smoke · EC-27/EC-28 briefs may be drafted only after pre-EC-27 checklist (a)(b)(c).

---

## Gate G1 definition (do not reinterpret)

`eval pass bar` + `counsel packet sent` + `waitlist read (met or WAIVED)`.  
Counsel **answers** unlock G2, not G1.

| G1 piece | Status |
| --- | --- |
| Eval pass bar | **GREEN (product-accepted 2026-08-14)** — evidence: post-EC-34 live 8/8 (analysisIds `f97b103c…c7ad0915`: GT-5 stato clean, Ex8 derive parity, not_found reconciled, occupazione bleed resolved, Ex7 stima honest not_found, zero invented values) + EC-35 VPS smoke Ex2-7 **64906/48680** (#158, `_deterministic_lot_auction_economics`; 153850 was other-lot/older-vendita; wrong-only-LLM fixtures). Optional confirmatory Mac run (Example 2 `--lotto 4\|7`) noted as nice-to-have, **not gating**. |
| Counsel packet sent | **DONE** — `packet sent 2026-08-15 (response requested by 2026-08-29)` (AZM human confirm) |
| Waitlist | **WAIVED** (1 lead, 2026-08-11) |

**G1 as a whole is FULL GREEN (2026-08-15).**

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
8. Flags stay off; G2 + `aste-enable.md` govern public enable. G1 is full green as of 2026-08-15; do **not** treat that as flag enable. EC-27/EC-28 require `docs/runbooks/aste-pre-ec27-checklist.md` before dispatch.

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

## G1 close record

| Item | Status |
| --- | --- |
| Counsel email | **SENT** `packet sent 2026-08-15 (response requested by 2026-08-29)` |
| Operator checklist | `docs/runbooks/aste-g1-human-close.md` Action 2 **DONE** |
| Ready-to-send draft | `docs/legal/COUNSEL-EMAIL-aste-packet-ready-to-send.md` |

**Post-G1 hygiene (not gate boxes):**
1. Drive GT true-score (recommended) — watch GT-3/Ex4 urbanistica `non_conforme`→`non_rilevato` vs perizia prose.
2. Board hygiene — link PRs #134/#136/#144/#146/#154/#158 to K EC 7.3.
3. Await counsel **answers** by 2026-08-29 → feed G2 / `aste-enable.md` (not G1).

**G2 (flag enable) still requires:** VPS observability, counsel EXTERNAL sign-off (answers), and `aste-enable.md` smoke. Do **not** flip `ASTE_ANALYSIS_ENABLED` from this ledger update.

---

## Pre-EC-27 checklist — OPEN

Canonical checklist: **`docs/runbooks/aste-pre-ec27-checklist.md`**.

| # | Gate | Status (2026-08-15) |
| --- | --- | --- |
| (a) | **G1 fully green** | **✓** — this flip |
| (b) | **EC-24 OMI sconto-reale** tolerates `valore_stima = not_found` | **OPEN** — verify before EC-27 dispatch |
| (c) | **Drive GT true-score** | **OPEN** — recommended before monetization lane |

EC-27 / EC-28 monetization briefs: unlocked for drafting after (a); **do not dispatch build** until (b) ✓ (and preferably (c)).

---

## Agent verify

| Check | Result |
| --- | --- |
| SHAs on `origin/main` | `57b0f1f` … `fc64987`, **`6f92e31`** (EC-35) on `main` |
| VPS `/opt/easycasa-ita` | tip past EC-35; prior smoke lot7 **64906/48680**, lot4 **36039** |
| Live 8/8 post-EC-34 | **DONE** 2026-08-14 |
| Eval pass bar | **GREEN (product-accepted 2026-08-14)** |
| Counsel packet | **SENT** 2026-08-15 · response by 2026-08-29 |
| Full G1 | **FULL GREEN** 2026-08-15 |
| Flags | **`ASTE_ANALYSIS_ENABLED` still off** |
