# G1 gate — Analisi Aste (operator checklist)

G1 = **eval pass bar** + **counsel packet sent** + **waitlist read** (met or waived).  
Answers from counsel gate **G2**, not G1. Public flag enable is still `docs/runbooks/aste-enable.md`.

Cloud agents **cannot** run the golden-set eval (Drive PDFs stay on AZM Mac). This runbook is the single source for Mac operator steps.

---

## A. Golden-set eval

### A.1 Prep (once)

```bash
cd <your EasyCasa clone>
git checkout main && git pull          # must be ≥ ff43e9a (--lotto support)
pnpm install --frozen-lockfile
docker builder prune -af               # disk hygiene before builds
```

**Stack up** — compose services are **internal-only** by default. For host-side `pnpm aste:eval`, publish ports (or remap URLs to whatever you already publish):

```bash
cat > /tmp/easycasa-g1-ports.yml <<'YAML'
services:
  db:
    ports: ["5432:5432"]
  redis:
    ports: ["6379:6379"]
  meilisearch:
    ports: ["7700:7700"]
  minio:
    ports: ["9000:9000", "9001:9001"]
  ai:
    ports: ["8000:8000"]
YAML

docker compose -f infra/docker-compose.yml -f /tmp/easycasa-g1-ports.yml --env-file .env \
  up -d db redis meilisearch minio ai
# apply pending migrations if local DB is fresh (same as usual local API boot)
```

**Env** (export once, or prefix each command). Nest boots **on the host** via `aste:eval`; OCR/LLM run in the **ai** container — `.env` for ai must also have OpenAI + the shared token.

| Var | Where | Notes |
| --- | --- | --- |
| `EVAL_LIVE=1` | host (eval process) | without this → dry checklist only |
| `ASTE_ANALYSIS_ENABLED=true` | api / host | **local eval only** — do not flip prod |
| `CHAT_PROVIDER=openai` | ai (+ host ok) | required for live extract |
| `OPENAI_API_KEY` | ai | real key |
| `AI_INTERNAL_TOKEN` | api **and** ai | same value |
| `AI_URL` | host | e.g. `http://127.0.0.1:8000` (not `http://ai:8000`) |
| `S3_ENDPOINT` | host | e.g. `http://127.0.0.1:9000` |
| `DATABASE_URL` | host | host `127.0.0.1:5432`, not `db:5432` |
| MinIO / S3 creds | api | match compose MinIO |

```bash
export EVAL_LIVE=1 ASTE_ANALYSIS_ENABLED=true CHAT_PROVIDER=openai
export OPENAI_API_KEY='…'
export AI_INTERNAL_TOKEN='…'          # same as ai container
export AI_URL=http://127.0.0.1:8000
export S3_ENDPOINT=http://127.0.0.1:9000
export DATABASE_URL='postgresql://…@127.0.0.1:5432/easycasa'
```

Ground truth (not in git): Drive `EC_Aste_GoldenSet_GroundTruth_v1.md`.

### A.2 The seven runs (minimum set)

Drive base: `/Volumes/Muba/Easy Casa Italia/EC Aste /`  
**Note:** folder `Example 1 ` has a **trailing space** in the name.

```bash
BASE="/Volumes/Muba/Easy Casa Italia/EC Aste "

pnpm --filter @easycasa/api aste:eval "${BASE}/Example 1 "
pnpm --filter @easycasa/api aste:eval "${BASE}/Example 2" --lotto 4
pnpm --filter @easycasa/api aste:eval "${BASE}/Example 2" --lotto 7
pnpm --filter @easycasa/api aste:eval "${BASE}/Example 4"
pnpm --filter @easycasa/api aste:eval "${BASE}/Example 5"
pnpm --filter @easycasa/api aste:eval "${BASE}/Example 7" --lotto H
pnpm --filter @easycasa/api aste:eval "${BASE}/Example 8"
```

| GT | Folder | Lot | Why |
| --- | --- | --- | --- |
| GT-1 | `Example 1 ` | — | baseline |
| GT-2 | Example 2 | `4` and `7` | scanned + prezzo-base precedence |
| GT-3 | Example 4 | — | |
| GT-4 | Example 5 | — | |
| GT-5 | Example 7 | `H` | negative-space trap |
| GT-8 | Example 8 | — | scanned + occupied |

Script: `apps/api/src/aste/aste-eval.ts` · `pnpm --filter @easycasa/api aste:eval`.

### A.3 Score (paste back to Claude)

Mark **✓** (value **and** page ref correct) · **✗** (wrong/invented) · **NF** (in `meta.not_found` — acceptable miss).

| Run | prezzo_base | offerta_min | valore_stima | cauzione (pct+base) | occupazione | conformità | procedura tipo+num | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| GT-1 Ex1 | €52.250,40 → | €39.187,80 → | €58.056 → | 10% base → | libero → | prospetto nord → | lg 26/2025 → | |
| GT-2 Ex2 L4 | €36.039 (**NOT** €85.425) → | €27.029 → | — | 10% offerto → | → | → | rge 2738/2021 → | precedence |
| GT-2 Ex2 L7 | €64.906 (**NOT** €153.850) → | €48.680 → | — | → | → | → | → | precedence |
| GT-3 Ex4 | €242.776 → | €182.082 → | — | 10% base → | libero → | → | lg 26/2025 → | immobili[] count → |
| GT-4 Ex5 | €156.000 → | €117.000 → | €184.800 → | **20% offerto** → | libero → | NON conf ×3 → | ei 148/2025 → | |
| GT-5 Ex7 H | €100.355,25 → | €75.266,44 → | — | 10% offerto → | libero → | **NOT** non-conform → | rge 249/2011 → | lotto-H trap |
| GT-8 Ex8 | €130.000 → | €97.500 → | — | → | **occupato senza titolo** → | difformità sanabili → | rge 427/2025 → | scanned+occupied |

**Hard failures** (any one → hardening brief **before** EC-27): invented value anywhere · Ex2 returning ordinanza prices · GT-8 occupazione = libero · lotto H marked non-conform · cross-lot economics bleed.

**Soft misses** (EC-27 proceeds; hardening items noted): value in `not_found` · page-ref off-by-one · cauzione base ambiguity.

---

## B. Counsel packet (G1 = sent, not answered)

Attach per `docs/legal/counsel-send-checklist.md` **rows 1–8**, including:

8. **LGL-1** — `docs/legal/aste-counsel-addendum-lgl1.md` (Q-A1–Q-A6)

Also: instruction letter, `COUNSEL-REVIEW-PACKAGE.md`, privacy + mediation drafts, EC-S T02/T04/T05 as listed in the checklist.

Do **not** attach `.env`, tokens, or DB dumps.

### Cover email (IT draft — edit greeting/names; review before send)

> **Oggetto:** MUNDIDA S.r.l. / EasyCasa Italia — pacchetto GDPR e quesiti nuovo servizio "Analisi Aste" — richiesta parere
>
> Gentile Avvocato,
>
> Le trasmetto il pacchetto di revisione predisposto per EasyCasa Italia (MUNDIDA S.r.l.), composto dai documenti indicati nella checklist allegata (punti 1–7: informativa, testi di consenso IT/EN/ES, inventario dei trattamenti, sub-responsabili, quesiti sulla base giuridica, valutazione DPO ex art. 37, struttura di titolarità) e da un addendum (punto 8) relativo a un nuovo servizio in sviluppo, "Analisi Aste", con sei quesiti specifici (Q-A1–Q-A6): trattamento di dati di terzi contenuti in documenti giudiziari caricati dagli utenti, tempi di conservazione, disclaimer e confini rispetto alle attività professionali riservate, futuri servizi di assistenza (L. 39/1989), diritti degli interessati per i contatti raccolti via landing, e OpenAI quale sub-responsabile.
>
> Il servizio non è pubblico: il rilascio è vincolato al Vostro riscontro sui punti Q-A1–Q-A3 e Q-A6. Vi chiederei un'indicazione dei tempi di riscontro e un preventivo, distinguendo se utile il pacchetto core dall'addendum Aste.
>
> Resto a disposizione per una call di inquadramento.
>
> Cordiali saluti,  
> Aziz Mubasher — MUNDIDA S.r.l. / EasyCasa Italia

**Done when:** email is in counsel’s inbox → reply to Claude with `packet sent <YYYY-MM-DD>`.

---

## C. Waitlist (already decided)

UI: https://admin.easycasaita.com/#aste → **Waitlist**.  
API: `GET /admin/aste/waitlist/stats`. Table: `aste_leads`.

| Metric | Value (prod 2026-08-11) |
| --- | --- |
| Total | **1** |
| Language | it: 1 |
| Province | MI: 1 |

**WAIVED** — no promotion run; ≪ 100 / ≥20-in-one-province. Re-check before G2 if product still wants a volume signal.

---

## D. Calling the gate

Send Claude **one** message:

1. Filled A.3 table (or fail table → hardening first)
2. `packet sent <date>`
3. Waitlist: **waived** (already recorded)

Claude then dispatches the held **EC-27** brief or writes the **hardening** brief first, per the hard/soft rules above.
