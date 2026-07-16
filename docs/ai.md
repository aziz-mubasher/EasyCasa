# AI Layer (Phase 4)

FastAPI service (`services/ai`), reached via Caddy at `/ai/*`. Reads/writes Postgres
directly (pgvector). Everything is provider-pluggable with **offline fallbacks**, so it
runs with no external API or GPU by default.

## Endpoints
| Method | Path | Purpose |
|---|---|---|
| POST | /ai/search | Natural-language search → parsed filters + pgvector similarity |
| POST | /ai/valuation | Comparables AVM: estimate + range + confidence |
| GET | /ai/recommendations/{id} | Similar listings (vector NN) |
| POST | /ai/assistant | Multilingual RAG assistant (grounded in real listings) |
| POST | /ai/admin/reindex-embeddings | Backfill embeddings |

## Providers (config)
- **Embeddings** — `hashing` (deterministic, offline, default), `openai`
  (OpenAI-compatible: OpenAI/Ollama/TEI/LiteLLM), or `local` (sentence-transformers,
  `requirements-ml.txt`). Dim must match `listings.embedding` (1536 default).
- **Chat** — `none` returns a grounded, templated multilingual answer from retrieved
  listings; `openai` calls an LLM with a strict RAG system prompt (never invents listings).

## How each piece works
- **NL query parser** (`services/nlq.py`) — IT/EN/ES heuristics for transaction
  (sale/rent), price (`under 150k`, `più di 1,5 milioni`), bedrooms (`bilocale`,
  `2 bed`), category (`da ristrutturare`→renovatable…), region. Optional LLM parsing.
- **Semantic search** — parsed filters as SQL `WHERE` + `ORDER BY embedding <=> qvec`.
- **AVM v1** — median €/m² of size-banded comparables in the same region/category;
  range from the interquartile spread; confidence from sample size. Explainable, needs
  only listing data. Upgrade to a trained model later.
- **Assistant** — retrieves top-k listings, grounds the answer, flags `handoff` when the
  user asks for a person/agent.
- **Alerts worker** (`worker/alerts.py`) — matches saved searches against newly
  published listings and enqueues notifications (delivery wired in Phase 5).

## Cost / safety controls
- In-process TTL cache + fixed-window rate limiter on `/ai/assistant`.
- Timeouts on all provider HTTP calls; offline fallbacks avoid spend by default.

## Run
```bash
# populate embeddings (after ETL / when listings change)
python -m app.services.embed_index         # or: POST /ai/admin/reindex-embeddings
# then build the ANN index once:
pnpm --filter @easycasa/migration migrate  # applies 0005_vector_index.sql
# alerts (cron or loop)
python worker/alerts.py --loop
```
