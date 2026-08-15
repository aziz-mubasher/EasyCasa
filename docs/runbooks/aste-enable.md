# Aste G2 enable runbook

**Who** Ops (AZM). **Feature** Analisi Aste (EC-21…EC-26).  
**Admin** `https://admin.easycasaita.com/#aste` — works regardless of `ASTE_ANALYSIS_ENABLED`.  
**Flags stay off until this checklist is followed.** Rollback = flag off + redeploy; data retained.

Also see: `docs/env.md` · Grafana dashboard **EasyCasa — Aste** · alerts group `aste` in `infra/observability/prometheus/alerts.yml`.

---

## STATUS (2026-08-15 — EC-36)

**Production today:** `ASTE_ANALYSIS_ENABLED=false` · `NEXT_PUBLIC_ASTE_ANALYSIS_ENABLED=false` — public stays dark.

**Internal preview (EC-36, counsel-safe):** AZM may enable allowlist-gated testing on the VPS **without** flipping the public flag:

| Env (api) | Env (web build + runtime) | Purpose |
|---|---|---|
| `ASTE_INTERNAL_PREVIEW=true` | `NEXT_PUBLIC_ASTE_INTERNAL_PREVIEW=true` (build ARG) | Mount analisi routes + run pipeline |
| `ASTE_INTERNAL_PREVIEW_EMAILS=a@x.com,b@y.com` | same values on **web** runtime (server allowlist) | Keycloak email allowlist |
| `ASTE_ANALYSIS_ENABLED=false` | `NEXT_PUBLIC_ASTE_ANALYSIS_ENABLED=false` | Public semantics unchanged |
| Stripe **`sk_test_*`** only | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_*` | EC-27 unlock test path; live key refused while public off |

Preview analyses are tagged `internal_preview=true` (migration **0067**) — **purge before G2 public flip** (§5.4 below).

### Remaining G2 items (public enable — do not skip)

1. **Counsel EXTERNAL sign-off** — LGL-1 addendum answers due ~2026-08-29 (retention, claims, subprocessors).
2. **Observability stack on VPS** (human/ops):
   ```bash
   # From repo root with .env containing GRAFANA_ADMIN_PASSWORD + PG_EXPORTER_DSN
   docker compose -f infra/docker-compose.yml \
     -f infra/docker-compose.traefik.yml \
     -f infra/observability/docker-compose.observability.yml \
     --env-file .env up -d prometheus grafana postgres-exporter
   ```
   Verify Grafana dashboard **EasyCasa — Aste** loads; confirm `postgres-exporter` loads `infra/observability/prometheus/postgres-aste.queries.yml`; fire-test alerts in `infra/observability/prometheus/alerts.yml` group `aste`.
3. **Aste-admin integration tests** — re-run `aste-admin` int specs where Docker is available (CI or VPS).
4. **Enable smoke** — §2 below (full checklist, not preview-only).
5. **ECS migrations 0052/0053** — ops decision whether already applied on VPS (unrelated to Aste but ledger hygiene).
6. **Preview purge** — delete `internal_preview=true` rows + MinIO objects before public flip.

### G2 flip sequence (after counsel + observability)

1. Confirm migration **0066** (EC-27 credits) and **0067** (preview tag) applied.
2. Set `ASTE_ANALYSIS_ENABLED=true` + `NEXT_PUBLIC_ASTE_ANALYSIS_ENABLED=true`; turn **off** preview envs.
3. Rebuild/recreate (both compose files — Traefik overlay lesson):
   ```bash
   COMPOSE="docker compose -f infra/docker-compose.yml -f infra/docker-compose.traefik.yml --env-file .env"
   $COMPOSE build --no-cache api web ai
   $COMPOSE up -d --force-recreate api web ai
   ```
4. `curl -fsS https://easycasaita.com/api/version` — gitSha matches deploy.
5. Run §2 smoke checklist.

---

## 0. Preconditions

### Migrations (must be applied on VPS)

Ledger for **Aste** on `main` at EC-26 ship (Aste highest **0051**; no EC-26 table). Later unrelated migrations (e.g. ECS Phase 2 **0052+**) may exist — verify full ledger on VPS before enable:

| # | File | Purpose |
|---|---|---|
| 0046 | `0046_aste_leads.sql` | G1 waitlist |
| 0047 | `0047_aste_analysis.sql` | analyses / documents / chunks / glossary |
| 0048 | `0048_aste_analysis_pipeline.sql` | attempts + processing_started_at |
| 0050 | `0050_aste_report.sql` | buyer_profile + translations |
| 0051 | `0051_aste_chat.sql` | chat messages + FTS on chunks |

(0049 is seller-listing ECS — unrelated but may already be applied.)

Verify ledger:

```bash
COMPOSE="docker compose -f infra/docker-compose.yml -f infra/docker-compose.traefik.yml --env-file .env"
$COMPOSE exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c \
  "SELECT version FROM _migrations ORDER BY version;"
```

Expect `0046`…`0051` present (and peers).

### Secrets / config

- [ ] `AI_INTERNAL_TOKEN` **identical** on `api` and `ai` (length-check only inside containers — never echo).
- [ ] `CHAT_PROVIDER=openai` + OpenAI key configured on `ai` for production chat (templated `none` is dark-mode fallback only).
- [ ] `ASTE_ANALYSIS_ENABLED=false` and `NEXT_PUBLIC_ASTE_ANALYSIS_ENABLED=false` until enable step.
- [ ] Observability stack up; postgres-exporter loads `infra/observability/prometheus/postgres-aste.queries.yml`.

### Counsel / EXTERNAL sign-off (do not invent)

- [ ] **EXTERNAL** — LGL-1 counsel addendum / glossary review items as required before public claims.
- [ ] **EXTERNAL** — retention (`ASTE_DOCS_RETENTION_DAYS`) counsel confirmation if still pending.
- [ ] Product: G1 waitlist volume gate accepted (read `#aste` → Waitlist tab — counts only). Full G1 checklist (eval + counsel send + waitlist): `docs/runbooks/aste-g1-gate.md`.

---

## 1. Enable steps

1. Set on VPS `.env` (api + web build args as applicable):
   - `ASTE_ANALYSIS_ENABLED=true`
   - `NEXT_PUBLIC_ASTE_ANALYSIS_ENABLED=true`
2. Deploy with rebuild so web picks up the public flag:

```bash
$COMPOSE build --no-cache api web ai
$COMPOSE up -d --force-recreate api web ai
```

3. Verify git SHA:

```bash
curl -fsS https://easycasaita.com/api/version
# expect gitSha matching the deployed commit
```

4. Confirm admin still reachable: `#aste` shows Analyses / Failures / Waitlist without depending on the flag.

---

## 2. Smoke checklist

- [ ] Create analysis with a real perizia; status reaches `ready` (pipeline worker claiming).
- [ ] Report renders **IT + EN** with citations; OMI panel populated when zone/comune resolves.
- [ ] Chat answers with citations (IT/EN); ES chat remains disabled.
- [ ] Admin `#aste` shows the run (masked user ref + masked filenames).
- [ ] Optional support: **Reveal identity** / **Reveal filenames** write `admin_audit_log` rows.
- [ ] DSAR export includes aste tables (`aste_analyses`, documents/chunks as registered, `aste_chat_messages`); **`aste_leads` untouched** by analysis DSAR.
- [ ] Grafana **EasyCasa — Aste** loads; failure/backlog panels populate after traffic.
- [ ] (Optional) Stop worker / pause claims → `AsteWorkerNotClaiming` or stuck-processing warning fires when thresholds met.

---

## 3. Rollback

1. Set `ASTE_ANALYSIS_ENABLED=false` and `NEXT_PUBLIC_ASTE_ANALYSIS_ENABLED=false`.
2. Rebuild/recreate `api` + `web` (`--no-cache` on web recommended for public flag).
3. User-facing `/aste/analisi*` returns dark/404 behaviour again.
4. **Data retained** (analyses, docs, chat, leads). Admin `#aste` remains available for ops.

---

## 4. Known failure modes (incl. EC-25)

| Symptom | Where to look |
|---|---|
| Status stuck `processing` / stale reclaim | Admin Failures tab; `processing_started_at`; `ASTE_PIPELINE_STALE_MS` (default 30m reclaim); alert `AsteAnalysisStuckProcessing` (45m) |
| Exhausted retries → `failed` | `failure_reason` category in admin; `aste_pipeline_failures_total` by stage |
| Worker idle with `uploaded` backlog | `AsteWorkerNotClaiming`; scheduler logs; flag + `AI_INTERNAL_TOKEN` mismatch |
| Chat `429` / rate limited | Nest chat routes; product event `ASTE_CHAT_RATE_LIMITED`; env `ASTE_CHAT_Q_PER_*` |
| Chat `not_found` / weak answers | Poor OCR chunks; hashing embedder → lexical FTS leg carries quality; api logs `aste.chat_retrieval` (`vector_hits` / `lexical_hits` — **log-only**, not Prom) |
| Advice-style over-refusal | Deterministic heuristic before LLM (EC-25) — product behaviour, not pipeline `failed` |
| Translate/chat/token cost invisible in Grafana | **Metric gap** — no Prom counters; use logs / product analytics only |
| AI FastAPI 5xx invisible as Prom series | AI has no `/metrics`; Nest `/aste*` 5xx alert is the proxy |

---

## 5. Alert thresholds (tune without code)

Edit `infra/observability/prometheus/alerts.yml` group `aste`:

| Alert | Default |
|---|---|
| `AsteAnalysisFailureRateHigh` | >20% terminal failure rate over 1h, `for: 15m` |
| `AsteAnalysisStuckProcessing` | `aste_processing_max_age_seconds_age > 2700` (45m) |
| `AsteAiEndpoint5xxHigh` | Nest `/aste*` 5xx >10% over 15m |
| `AsteWorkerNotClaiming` | backlog >0 and no ready/failed increase for 30m |

Reload Prometheus after edit. Validate with `promtool check rules` when available (not wired in CI).

---

## 6. Admin API quick reference

| Method | Path | Notes |
|---|---|---|
| GET | `/admin/aste/analyses` | Masked list; `?failuresOnly=true&staleMinutes=45` |
| GET | `/admin/aste/analyses/:id` | Masked detail; no extraction/chat text |
| POST | `/admin/aste/analyses/:id/reveal-identity` | Audited |
| POST | `/admin/aste/analyses/:id/reveal-filenames` | Audited |
| POST | `/admin/aste/analyses/:id/rerun` | `failed`/`processing` → `uploaded`; **409** on `ready` |
| GET | `/admin/aste/waitlist/stats` | Aggregates only — no emails |
