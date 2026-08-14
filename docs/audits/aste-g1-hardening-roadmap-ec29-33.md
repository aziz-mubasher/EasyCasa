# EC Aste — G1 Hardening Roadmap (EC-29 → EC-33)

**Venture:** Easy Casa Italia · repo `aziz-mubasher/EasyCasa`  
**Updated:** 2026-08-13 (EC-29→33 all merged — extract-quality set complete; gate now waits on humans)  
**Gate spec:** `docs/runbooks/aste-g1-gate.md` · Public enable: G2 / `docs/runbooks/aste-enable.md`  
**Flags:** `ASTE_ANALYSIS_ENABLED` **off** in production. No brief in this set flips any flag.  
**Board:** Kaizen EC · K EC 7.3 (AI Agent) · Operations  

**Supersedes extract-next guidance in** `docs/audits/G1-aste-status-rnd-feedback.md` (that file’s 2026-08-13 paste tables remain the pre–EC-32/33 baseline; do not re-brief urbanistica / cauzione / valore_stima extract work from it).

---

## Gate G1 definition (do not reinterpret)

`eval pass bar` + `counsel packet sent` + `waitlist read (met or WAIVED)`.  
Counsel **answers** unlock G2, not G1. Current stance: **conscious near-miss → hardening-first.**

| G1 piece | Status |
| --- | --- |
| Eval pass bar | Near-miss; all planned fixes merged — awaiting live 8/8 re-run on tip ≥ `fe1e0c7` |
| Counsel packet sent | **NOT DONE** — human (docs 1–8 + LGL-1, reply `packet sent <date>`) |
| Waitlist | **WAIVED** — 1 lead (2026-08-11) |

---

## Task ledger

| Task | Scope | Status | PR / SHA |
| --- | --- | --- | --- |
| **EC-29** | Large-dossier map-reduce chunking (~90k chars), 429 backoff, upstream 4xx surfacing, eval DX (compiled invoke, AppleDouble skip, process.exit) | **MERGED + deployed** | `57b0f1f` |
| **EC-30** | Field-specific source precedence (`_apply_field_precedence`), occupazione enum + normalization, perizia keyword packing (`FIELD_CONTEXT_KEYWORDS`), derived cauzione importo (`derived: true`) | **MERGED + deployed** | [#134](https://github.com/aziz-mubasher/EasyCasa/pull/134) `fab9973` |
| **EC-31** | Scorer unwrap `{value\|importo}` + page → paste-ready TSV; G1 runbook truth-up; commented .env placeholders | **MERGED + deployed** | [#136](https://github.com/aziz-mubasher/EasyCasa/pull/136) `0ebf1be` |
| **EC-32** | Urbanistica/catastale structured conformità (enum + difformita[]), lot-filtered precedence (lotto_label into `_apply_field_precedence`), cauzione patterns (a)/(b)/(c) + offer-based no-derive, GT-5 negative-space fixture, scorer lotto-H noise fix, same-shell-AI runbook note | **MERGED + deployed** | [#144](https://github.com/aziz-mubasher/EasyCasa/pull/144) `0b861ee` |
| **EC-33** | valore_stima correctness: total-not-€/mq prompt guard, `valore_stima_suspect` plausibility guard (`VALORE_STIMA_MIN_PREZZO_BASE_RATIO`, default 0.01), per-lot stima filter, stima keyword packing (micro-chunk held as fallback, 0 extra tokens) | **MERGED + deployed** | [#146](https://github.com/aziz-mubasher/EasyCasa/pull/146) `fe1e0c7` |

Completion audits: `docs/audits/EC-30-completion-feedback.md` … `EC-33-completion-feedback.md`, plus batch `EC-30-31-T20-batch-completion.md`.

---

## Eval state (2026-08-13 full golden-set re-run, tip `1f1269b`)

8/8 `ready`. Ex2 avviso precedence ✓ (36039 / 64906). GT-5 lotto H not non-conform ✓ (`extract_chunked:7`).

| Field | State | Owner |
| --- | --- | --- |
| prezzo_base / offerta_minima / rilancio | Hit all cases with page refs | Done |
| occupazione (`giuridica.stato_occupazione`) | Hit 8/8 (enum + text) | EC-30 ✓ |
| urbanistica.conformita | Was miss 8/8 → fixed in EC-32, awaiting live re-run | EC-32 → verify |
| cauzione.importo | Misses Ex2-7/Ex7/Ex8 → fixed per-pattern in EC-32, awaiting live re-run | EC-32 → verify |
| valore_stima | Fixed in EC-33 (Ex5 €/mq → prompt + plausibility guard; Ex2 lot bleed → lot filter; Ex7 → keywords, live verify decides if micro-chunk follow-up needed) | EC-33 → verify |
| Zero invented values | `meta.not_found` discipline holding | Standing rule |

---

## Standing rules (every future EC aste brief)

1. One agent per **scope**, not just per task code — check running tasks and open PRs for overlap before dispatch (#135/#137 lesson).
2. `aste_extract.py` is single-writer: sequence briefs that touch it; never parallel.
3. Additive schema fields only; no `schema_version` bump unless truly required (EC-30 precedent). Occupazione path is `giuridica.stato_occupazione`.
4. Zero invented values: unknown → `not_found`; deterministic arithmetic only, flagged `derived: true`; junk rejection (not invention) allowed with meta warning.
5. Field-specific source priority: auction economics avviso > ordinanza > perizia; valore_stima / occupazione / urbanistica perizia-first; lot filter via `lotto_label`.
6. Do not re-brief Ex7 400 / chunk size unless regression. Do not re-litigate the runbook invoke section.
7. Synthetic Italian fixtures only — no real court PDFs in git (third-party PII).
8. Flags stay off; G2 + `aste-enable.md` govern public enable; never brief EC-27/EC-28 as "G1 green" until the gate ledger says so.

---

## Operator verification recipe (host stack, AZM Mac)

Run on tip ≥ `fe1e0c7`. AI service must live in the **same long-lived shell** as the suite; ~90s cooldown between cases; MinIO data dir on `/Volumes/Muba/easycasa-minio-data`; host tesseract + ita installed.

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

## Remaining to close G1 (all human)

1. **Live 8/8 re-run** on tip ≥ `fe1e0c7` (recipe above) → paste tables to R&D. Expected: valore_stima green or honest not_found + `valore_stima_suspect`; if Ex7 stima still misses → micro-chunk-only follow-up brief (not a new number unless needed).
2. **Counsel email** — packet 1–8 + LGL-1, requested response date → reply `packet sent <date>`.
3. **Drive GT true-score** vs `EC_Aste_GoldenSet_GroundTruth_v1.md` (Drive-only, not in git).
4. **Product call** — near-miss → hardening-first vs green, based on the re-run.
5. Board hygiene — link PRs #134/#136/#144/#146 to K EC 7.3.
6. **EC-24 note for R&D**: OMI sconto-reale must tolerate stima = not_found (guard can legitimately clear it) — verify before any EC-24-dependent brief.

After G1 green: EC-27 (payments split) and EC-28 lane work unlock; G2 (flag enable) still requires observability on VPS, counsel EXTERNAL sign-off, and `aste-enable.md` smoke.

---

## Agent verify (2026-08-13, this doc land)

| Check | Result |
| --- | --- |
| SHAs on `origin/main` | `57b0f1f`, `fab9973`, `0ebf1be`, `0b861ee`, `fe1e0c7` all ancestors |
| VPS `/opt/easycasa-ita` tip | `0921e67` (includes `fe1e0c7`) |
| Stale draft | [#132](https://github.com/aziz-mubasher/EasyCasa/pull/132) still OPEN draft for EC-29 — close as superseded by `57b0f1f` |
| Public DNS from cloud agent | `easycasa.online` may fail resolve; use VPS tip + prior deploy notes |

**Do not** claim G1 closed or flip `ASTE_ANALYSIS_ENABLED` without the human paste + `packet sent <date>`.

| **EC-34** | Ex2 lot-bleed economics, GT-5 orphaned stato → non_rilevato, Ex7 stima micro-chunk | **MERGED + deployed** | [#154](https://github.com/aziz-mubasher/EasyCasa/pull/154) `fc64987` |
