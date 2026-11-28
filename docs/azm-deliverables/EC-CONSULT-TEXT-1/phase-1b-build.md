# EC-CONSULT-TEXT-1.B — Phases A/B (dry-run)

Built on Phase 0 (PR #282). **No production cut-over:** `EC_CONSULT_LINE_ENABLED=false`, `EC_CONSULT_DRY_RUN=true` by default. No Graph subscribe runs in CI.

## Go-live sequence (after AZM grant)

1. `META_6605_TOKEN=… node scripts/meta-waba-6605-survey.mjs`
2. `META_6605_TOKEN=… node scripts/meta-waba-6605-setup.mjs --apply` (extend script or subscribe in Meta UI)
3. Set VPS env: `META_6605_TOKEN`, `WHATSAPP_6605_APP_SECRET`, `ELEVENLABS_KB_READ_KEY`, `GOOGLE_GENERATIVE_AI_KEY`
4. Deploy API image rebuild (no overlay). Keep `EC_CONSULT_DRY_RUN=true` for one validation day.
5. Set `EC_CONSULT_INBOX_SOURCE=webhook`, `EC_CONSULT_LINE_ENABLED=true`, `EC_CONSULT_DRY_RUN=false` with ElevenLabs messaging off on 6605 (same minute).

## Templates still needed on WABA `1139868405295155`

| Template | Purpose |
|----------|---------|
| `ec_callback_permission` | Already approved (call permission) |
| `ec_request_followup` | Operator follow-up outside 24h |
| **TBD** session re-open / post-close nudge | When 24h window expired (no name in repo yet) |
| **TBD** `Richiamata` utility | KB §12 confirmation when window closed |

## System prompt (Claude review)

`apps/api/src/ec-consult/system-prompt.md`