# Phase 4 — AI Layer (checklist)

Goal: semantic/natural-language search, valuation (AVM), recommendations, and a
multilingual grounded assistant — on the FastAPI service, with offline-safe defaults.

## Steps & acceptance criteria
- [x] **1. Embeddings pipeline.** Done when: `embed_index.reindex()` fills `listings.embedding`; idempotent; ANN index (0005) built.
- [x] **2. Semantic search.** Done when: `POST /ai/search` parses NL (IT/EN/ES) and returns vector-ranked results honoring parsed filters.
- [x] **3. AVM v1.** Done when: `POST /ai/valuation` returns estimate + low/high + confidence from comparables.
- [x] **4. Recommendations.** Done when: `GET /ai/recommendations/{id}` returns similar listings.
- [x] **5. Saved-search alerts.** Done when: `worker/alerts.py` finds new matches per saved search and enqueues notifications.
- [x] **6. Assistant.** Done when: `POST /ai/assistant` answers in the user's locale, grounded strictly in retrieved listings, with `handoff` detection.
- [x] **7. Cost/safety.** Done when: rate limit + cache active; provider calls time out; offline fallbacks keep it running with no spend.

## Verified in this scaffold
- `pytest services/ai` ✅ (8: nlq×3, valuation×2, embeddings×2, health)
- FastAPI app assembles; OpenAPI exposes all five AI routes ✅
- `0005_vector_index.sql` parses against Postgres grammar ✅

## Cursor prompts (one PR each)
1. "Add a natural-language search bar to the web /search page that calls aiSearch() and merges results above the keyword grid."
2. "Build an assistant widget (floating) that calls aiAssistant(message, locale), shows cited listings, and surfaces a 'talk to an agent' CTA when handoff=true."
3. "Add a seller-side valuation panel to the add-home flow: call /ai/valuation with region/category/size and show the estimate range."
4. "Add pgvector registration via the `pgvector` Python package and switch the raw ::vector casts to typed params."
5. "Wire alerts to the Phase 5 notification service and add a last_notified_at column to saved_searches for exact windowing."
6. "Add integration tests (testcontainers Postgres+pgvector) that reindex a few listings and assert /ai/search ranking."

## Guardrails
- The assistant must never invent listings/prices — keep it grounded in retrieved rows.
- Keep embedding dim in sync with the DB column; changing models may need a migration.
- Default providers stay offline; enable `openai` only with keys + budget alerts.
