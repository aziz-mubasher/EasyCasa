# SOP — How to test Easy Casa Aste (Analisi Aste)

**Audience:** Ops (AZM), R&D agents, Mac operator.  
**Product:** Analisi Aste (EC-21…EC-36) — extract → report → chat → credits.  
**Standing rule:** Do **not** flip public `ASTE_ANALYSIS_ENABLED` / `NEXT_PUBLIC_ASTE_ANALYSIS_ENABLED` without the G2 checklist in `docs/runbooks/aste-enable.md`.

This SOP is the **index of how to test**. Deep checklists live in the linked runbooks. If a command here disagrees with `package.json` or `docs/env.md`, trust those.

**Canonical env names (code / `docs/env.md`):**  
`ASTE_ANALYSIS_ENABLED`, `ASTE_INTERNAL_PREVIEW`, `ASTE_INTERNAL_PREVIEW_EMAILS`, `NEXT_PUBLIC_ASTE_*`, `PAYMENTS_ENABLED`.

**Package:** `@easycasa/api` · script `aste:eval` · VPS root `/opt/easycasa-ita`.

---

## 0. Choose the right test lane

| Lane | When | Who | Public flag | Outcome |
|---|---|---|---|---|
| **A — Automated** | Every PR touching Aste | CI / any agent | N/A | Unit + integration green |
| **B — Mac golden eval** | Extract quality / G1 bar | Mac operator only | Local `true` | Hit/miss tables vs Drive GT |
| **C — Internal preview (EC-36)** | Prod-like E2E while counsel-safe | Allowlisted Keycloak user | **Stays `false`** | Full pipeline + optional test Stripe |
| **D — Stripe credits (EC-27)** | Monetisation path | Local or preview | Local `true` **or** preview allowlist | Teaser → unlock → full report |
| **E — G2 enable smoke** | After counsel answers + observability | Ops | Flip to `true` | Public launch checklist |
| **F — Admin-only** | Always (flag-independent) | Admin JWT | Irrelevant | Masked list / rerun / waitlist stats |

**Cloud agents cannot run lane B** (Drive PDFs stay on AZM Mac). Prefer lane A + C for agent work.

---

## 1. Lane A — Automated (every change)

From repo root on the feature branch:

```bash
pnpm lint
pnpm typecheck
pnpm test
# when Docker / Testcontainers available:
pnpm --filter @easycasa/api test:int
```

### What matters for Aste

| Area | Specs (indicative) |
|---|---|
| Access / preview matrix | `packages/shared/src/aste-access/*`, `apps/api/src/aste/aste-preview-flag-matrix.spec.ts`, `aste-monetisation-flag-matrix.spec.ts` |
| Extract guards / chunk / RRF / OMI / semaforo | `apps/api/src/aste/*.spec.ts` |
| Pipeline / analysis / report / chat / admin / leads | `apps/api/test/integration/aste-*.int.spec.ts` |
| Web financing / monetisation config | `apps/web/src/lib/aste-financing-*.spec.ts`, `aste-*-config.spec.ts` |

**Pass:** all green; no secrets committed.

---

## 2. Lane B — Mac golden-set eval (extract quality)

**Canonical detail:** `docs/runbooks/aste-g1-gate.md`  
**Ground truth (not in git):** Drive `EC_Aste_GoldenSet_GroundTruth_v1.md`  
**Script:** `pnpm --filter @easycasa/api aste:eval` (builds, then runs compiled eval)  
**Source:** `apps/api/src/aste/aste-eval.ts`

### Minimum set

| GT | Example folder | Lot |
|---|---|---|
| GT-1 | `Example 1 ` (**trailing space**) | unico |
| GT-2 | Example 2 | `4` and `7` (two runs) |
| GT-3 | Example 4 | — |
| GT-4 | Example 5 | — |
| GT-5 | Example 7 | `H` (must **not** mark non-conform) |
| GT-8 | Example 8 | `A` and `B` |

### Invoke (sketch)

```bash
# Local only: ASTE_ANALYSIS_ENABLED=true. Stack: db + minio + api + ai.
# Host needs tesseract+ita + poppler for scanned PDFs.

EVAL_LIVE=1 \
CHAT_PROVIDER=openai OPENAI_API_KEY=… \
AI_INTERNAL_TOKEN=… ASTE_ANALYSIS_ENABLED=true \
pnpm --filter @easycasa/api aste:eval "/Volumes/Muba/Easy Casa Italia/EC Aste /Example 5"

# Multi-lot (required post EC-23b) or create fails with lotto_selection_required:
… aste:eval "/path/to/Example 2" --lotto 7
# or: EC_ASTE_EVAL_LOTTO=7 EVAL_LIVE=1 … aste:eval …
```

### Pass bar (summary)

- Economics (`prezzo_base`, `offerta_minima`, `cauzione`, `valore_stima`) + **page refs** correct  
- Occupazione correct; **zero invented values** (misses → `meta.not_found`)  
- Ex2 lotto 7 = **€64.906** / off. min. **€48.680** (product-adjudicated; not ordinanza bleed)  
- Paste hit/miss tables to R&D — do **not** flip public flags on eval alone  

Full ops notes (AppleDouble, MinIO disk, blank `.env` key traps): see the G1 gate runbook.

---

## 3. Lane C — Internal preview on VPS (EC-36)

**Canonical enable notes:** `docs/runbooks/aste-enable.md` (STATUS / preview table)  
**Env reference:** `docs/env.md`

### 3.1 Env (public stays off)

```bash
# Public — keep false
ASTE_ANALYSIS_ENABLED=false
NEXT_PUBLIC_ASTE_ANALYSIS_ENABLED=false

# Preview
ASTE_INTERNAL_PREVIEW=true
ASTE_INTERNAL_PREVIEW_EMAILS=you@example.com
NEXT_PUBLIC_ASTE_INTERNAL_PREVIEW=true

# Credits unlock (optional): Stripe test keys only
# Live sk_live_* checkout is refused while public analysis is off
```

| Var | Where |
|---|---|
| `ASTE_INTERNAL_PREVIEW` + `_EMAILS` | **api + web runtime** (compose `env_file`) |
| `NEXT_PUBLIC_ASTE_INTERNAL_PREVIEW` | **web Docker build ARG** — rebuild web `--no-cache` |
| Migrations **0066** + **0067** | applied on VPS (credits + `internal_preview` column) |

### 3.2 Deploy sketch

```bash
cd /opt/easycasa-ita
export GIT_SHA="$(git rev-parse --short HEAD)"
export BUILD_TIME="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
COMPOSE="docker compose -f infra/docker-compose.yml -f infra/docker-compose.traefik.yml --env-file .env"
$COMPOSE build --no-cache api web
$COMPOSE up -d --force-recreate api web
curl -fsS https://easycasaita.com/api/version
```

Verify containers see the flags (`printenv` inside `api` / `web`); never paste secrets into chat.

### 3.3 Ten-step smoke (allowlisted user, **public** PVP dossier only)

**UI entry:** open `/it/aste/lab` (also linked from `/it/aste` when the preview build arg is mounted). The lab shows flag diagnostics (no secrets) and deep-links into `/aste/analisi`.

Use **public court PDFs** only (no private PII packs). Prefer dossiers already used in eval.

1. Open `/it/aste/lab` → confirm preview build/runtime/allowlist flags; anonymous session shows **can open analisi = off**.  
2. **Anonymous / non-allowlisted** → `/it/aste/analisi` redirects to `/it/aste`.  
3. **Allowlisted** Keycloak sign-in → lab flips session allowlisted on; `/it/aste/analisi` loads (SSR gate reads `ec_access` cookie mirrored at login; **API is the security boundary**).  
4. Create analysis → upload perizia + avviso → submit.  
5. Status reaches **`ready`** (if stuck: admin `#aste` Failures; check `AI_INTERNAL_TOKEN` match on api+ai).  
6. Open report → **teaser** when payments+credits path is on; economics/chat locked until unlock.  
7. **Test unlock** — Stripe **test** checkout or spend 1 credit → full report (Lane D if paywall on).  
8. Full report: IT economics, criticità, OMI panel when zone resolves; EN when enabled; one grounded **chat** with citations (ES chat stays off).  
9. **Admin** `#aste` — run visible with masked identity/filenames; optional reveal writes audit rows.  
10. **DB:** `internal_preview = true` on the new row; audit events for preview create / unlock / checkout.

```sql
SELECT id, status, internal_preview, created_at
FROM aste_analyses
ORDER BY created_at DESC
LIMIT 5;
```

### 3.4 Negative checks (must pass)

| Check | Expect |
|---|---|
| Public flag still false in `.env` + containers | `ASTE_ANALYSIS_ENABLED=false` |
| Incognito / other email | Redirect / API **404** (not 200) |
| Live Stripe key while public off | Checkout refused |
| Landing `/it/aste` | Still 200 for everyone |

### 3.5 Purge before G2 public flip

```sql
-- inventory
SELECT id, user_id, status, created_at
FROM aste_analyses
WHERE internal_preview = true;

-- after deleting MinIO objects for those analyses (ops), then:
DELETE FROM aste_analyses WHERE internal_preview = true;
```

Turn **off** `ASTE_INTERNAL_PREVIEW*` / `NEXT_PUBLIC_ASTE_INTERNAL_PREVIEW` when flipping public enable.

---

## 4. Lane D — Stripe credits (EC-27)

**Canonical:** `docs/audits/EC-27-stripe-test-runbook.md`  
**Also:** `docs/runbooks/aste-pre-ec27-checklist.md` (gates before charging real users)

### Flag matrix (local / preview)

| Analysis access (public **or** preview allowlist) | `PAYMENTS_ENABLED` | Credits API | Report |
|---|---|---|---|
| no | * | 404 | dark |
| yes | off | 404 | full (eval-style) |
| yes | on | 200 | **teaser** until unlock |

Happy path: teaser → buy pack (test card `4242…`) → webhook grants credits → unlock (−1, idempotent) → chat + print on full only.

**Human still:** real Stripe Price IDs in env when leaving `price_data` fallback; webhook E2E on VPS.

---

## 5. Lane E — G2 public enable smoke

**Canonical:** `docs/runbooks/aste-enable.md` §2  

Only after: counsel **answers**, observability up, preview purge, migrations verified. Then flip public flags, rebuild web `--no-cache`, and run the full enable smoke (ready report IT+EN, chat, admin, DSAR, Grafana).

---

## 6. Lane F — Admin (always on)

Admin `#aste` / `/admin/aste*` is **not** gated by `ASTE_ANALYSIS_ENABLED`.

| Action | Notes |
|---|---|
| List / failures | Masked user + filenames |
| Reveal identity / filenames | Writes `admin_audit_log` |
| Rerun | `failed`/`processing` → `uploaded`; **409** on `ready` |
| Waitlist stats | Aggregates only — no emails |

Useful during preview when diagnosing stuck `processing` without exposing PII in chat logs.

---

## 7. Evidence to keep

| Lane | Evidence |
|---|---|
| A | CI / local `pnpm test` output |
| B | Pasted hit/miss tables + analysis ids |
| C | Allowlisted in / anonymous out; `internal_preview=true` SQL; `/api/version` SHA |
| D | Stripe test Dashboard payment + balance before/after unlock |
| E | Full §2 checklist ticks + Grafana panel screenshot |

Do **not** commit real perizie, tokens, or `.env` values.

---

## 8. Related docs (do not fork)

| Doc | Role |
|---|---|
| `docs/runbooks/aste-g1-gate.md` | G1 = eval + counsel **sent** + waitlist |
| `docs/runbooks/aste-g1-human-close.md` | Historical human close actions |
| `docs/runbooks/aste-enable.md` | G2 enable + preview STATUS + prod smoke |
| `docs/runbooks/aste-pre-ec27-checklist.md` | Pre-monetisation gates |
| `docs/audits/EC-27-stripe-test-runbook.md` | Credits E2E |
| `docs/env.md` | Flag semantics |
| `docs/legal/aste-counsel-addendum-lgl1.md` · `docs/legal/COUNSEL-EMAIL-aste-packet-ready-to-send.md` | Legal — not a test substitute |
| `docs/audits/aste-g1-hardening-roadmap-ec29-33.md` | Extract hardening ledger |

---

## 9. Quick “what should I run today?”

1. Touched Aste code? → **Lane A**.  
2. Changed extract / economics? → **Lane B** on Mac (or ask AZM).  
3. Need prod-like UX without public launch? → **Lane C** — start at **`/it/aste/lab`**, then §3.3.  
4. Testing paywall? → **Lane D** with `sk_test_*` only (lab paywall section when monetisation flag is on).  
5. Counsel answered + observability ready? → **Lane E** only.
