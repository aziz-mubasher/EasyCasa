# WhatsApp inbound — live smoke (no Meta template gate)

EC-17 / EC-19 / EC-19a can all ship green against fixtures and an empty
`wa_inbound_messages` table. The first real Meta `POST` is the first integration
test. **Inbound needs no approved templates.**

Webhook: `https://easycasaita.com/api/whatsapp/webhook`

## 1. Phone → full chain

From your own phone, message the EasyCasa WhatsApp number once.

Expected:

1. Meta signs the POST → signature verifies
2. Row persists in `wa_inbound_messages` (`wa_handle` set)
3. 24h window computed
4. Free-form auto-reply sends via Cloud API (no template)
5. Admin list shows the thread (opaque handle only)
6. Detail open audits (`whatsapp:inbound:read`)

If the **row persists but the auto-reply never arrives**, isolate to
`WHATSAPP_TOKEN` / `WHATSAPP_PHONE_NUMBER_ID` — not signature, dedupe, or the
viewer. If the reply **lands on your phone**, credentials are good and the
original blocked-list token item is half-closed without waiting on Meta.

Then send a **second message quickly** from the same number:

- Expect a **second row**
- Expect **no second auto-reply** (one free-form ack per `wa_id` / 24h)

## 2. Forged signature → 403

```bash
curl -sS -o /dev/null -w '%{http_code}\n' \
  -X POST 'https://easycasaita.com/api/whatsapp/webhook' \
  -H 'Content-Type: application/json' \
  -H 'X-Hub-Signature-256: sha256=deadbeef' \
  -d '{"object":"whatsapp_business_account","entry":[]}'
```

Expect **403**. Metric `whatsapp_inbound_signature_rejected_total` should
increment. After real Meta traffic has been verifying, that counter should
otherwise stay flat between forges — non-zero only from deliberate rejects
means live traffic is verifying.

## 3. DSAR on your number (PII now in prod)

Your phone is real PII in `wa_inbound_messages` after step 1. Use an account
whose `users.phone` matches that `wa_id` (E.164 / variant matching):

1. **Export** — subject export must include source `wa_inbound_messages`
2. **Erasure** — erase path must delete those rows (legal-hold reporting unchanged)

Two privacy tests for one live message. See `docs/privacy-my-data.md` and
`apps/api/src/privacy/sources/wa-inbound.data-source.ts`.

## 4. Quick SQL / metrics (VPS)

Length-check secrets only — never dump values (`docs/env.md` no-dump rule).

```bash
# rows + auto-reply once
docker compose … exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c \
  "SELECT id, wa_handle, message_type, received_at, auto_replied_at IS NOT NULL AS replied
   FROM wa_inbound_messages ORDER BY received_at DESC LIMIT 10;"
```

Prometheus / Pushgateway: `whatsapp_inbound_*` counters from Phase 39.
