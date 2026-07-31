# Live inbound smoke — operator checklist

**Who** Aziz, on a phone + VPS shell. **Not an agent task.**

**When** Before EC-20 is briefed. Everything from EC-17 → EC-19a has run only against
fixtures and an empty table.

**Also see** `docs/runbooks/whatsapp-cloud-ops-preflight.md` · `docs/env.md`

**Standing ops preamble** Six Nest secrets · no `compose config` / `printenv` for
secret debug (dump → rotate all six) · log any `WA_HANDLE_SECRET` rotation in
`docs/env.md`.

Blocked on nothing. Inbound and windowed free-form auto-reply do **not** need
template approval.

Webhook: `https://easycasaita.com/api/whatsapp/webhook`

**Pass = all five sections.** Not “the reply arrived”.

---

## 0. Before

- [ ] `curl -fsS https://easycasaita.com/api/version` reports `gitSha` **`8ace4fb`**
      (EC-19a image; docs-only pulls do not change this)
- [ ] `DEMO_MODE=false` on the VPS (name only — do not dump `.env`)
- [ ] Baseline the counters so §3 compares against a known number:

```bash
COMPOSE="docker compose -f infra/docker-compose.yml -f infra/docker-compose.traefik.yml --env-file .env"
$COMPOSE exec -T api wget -qO- http://127.0.0.1:4000/metrics | \
  grep -E 'whatsapp_(inbound_received|inbound_signature_rejected|inbound_duplicate|auto_reply_sent|auto_reply_suppressed)_total'
```

Record:

| Metric | Baseline |
|---|---|
| `whatsapp_inbound_received_total` | |
| `whatsapp_inbound_signature_rejected_total` | |
| `whatsapp_inbound_duplicate_total` | |
| `whatsapp_auto_reply_sent_total` | |
| `whatsapp_auto_reply_suppressed_total` | |

---

## 1. Two messages, one auto-reply

Send two distinct messages from your phone, ~30s apart.

- [ ] Auto-reply arrives on the device — **once**
- [ ] Two rows in `wa_inbound_messages`, distinct `provider_message_id`
- [ ] `auto_replied_at` set on the first row only
- [ ] Both rows carry a `wa_handle`; **identical** across the two
- [ ] `window_expires_at` ≈ message timestamp + 24h (Meta's timestamp, not `now()`)

```bash
$COMPOSE exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c \
  "SELECT provider_message_id, wa_handle, received_at, window_expires_at,
          auto_replied_at IS NOT NULL AS replied
   FROM wa_inbound_messages
   ORDER BY received_at DESC LIMIT 10;"
```

**The auto-reply arriving is the credential test.** It is a real Cloud API send that
needs no template, so a delivered reply confirms token + phone number ID independently
of Meta's template queue.

**Isolation:** row persists but no reply → token or phone number ID. Not signature, not
the viewer.

---

## 2. Admin viewer

- [ ] `#whatsapp` lists one sender, count 2, window open, countdown in mono
- [ ] No E.164 string anywhere in the **list** response — check the network tab, not the UI
- [ ] Detail via `#whatsapp/<handle>` shows both messages, full bodies
- [ ] Exactly one audit row written for that reveal
- [ ] A tampered handle → 404, no audit row
- [ ] No message body or `wa_id` in `docker compose logs api`

```bash
$COMPOSE exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c \
  "SELECT action, resource_type, created_at
   FROM admin_audit_log
   WHERE resource_type = 'wa_inbound_thread'
   ORDER BY created_at DESC LIMIT 5;"
```

---

## 3. Forge

```bash
curl -sS -o /dev/null -w '%{http_code}\n' \
  -X POST 'https://easycasaita.com/api/whatsapp/webhook' \
  -H 'Content-Type: application/json' \
  -H 'X-Hub-Signature-256: sha256=deadbeef' \
  -d '{"object":"whatsapp_business_account","entry":[]}'
```

- [ ] POST with a bad signature → **403**
- [ ] `whatsapp_inbound_signature_rejected_total` incremented by **exactly** the number of
      forged requests sent (re-scrape metrics as in §0)
- [ ] The same counter did **not** move during §1

A 403 alone does not prove the signature path rejected it — Traefik, a guard, or a
missing route return 403 too. The **counter** is the only thing that distinguishes
“signature verification worked” from “something upstream said no”. Check it, or do not
record §3 as passed.

---

## 4. DSAR

Your own number is now production PII. Use it.

Signed-in account whose `users.phone` matches the inbound `wa_id`:
`GET /me/privacy/export` · `POST /me/privacy/erase` (see `docs/privacy-my-data.md`).
Source name: `wa_inbound_messages`
(`apps/api/src/privacy/sources/wa-inbound.data-source.ts`).

- [ ] Export returns the two messages
- [ ] Erasure removes them; re-export returns nothing
- [ ] Retention purge path runs without error (rows are new → expect **0** deleted).
      Daily scheduler calls `purgeWaInbound`; confirm logs show a clean run or invoke
      the same path in a controlled way — do not invent ad-hoc `DELETE`s for this check.

**Check the format before concluding anything.** `wa_id` is E.164 **without** `+`
(e.g. `393331234567`); `users.phone` may hold `+39 333 1234567` with plus, spaces, or
other formatting. Matching goes through `phoneMatchVariants` (digits-only + `+digits`).
If they do not match, the export returns **zero rows** — which looks exactly like a
correct export for a subject with no messages. A silent pass here is the failure mode
that survives to the first real subject request.

Run the export, then `SELECT` the table directly for that `wa_id`. If the direct query
returns rows and the export did not, the join is the bug.

```bash
# After §1, before erase — replace WA_ID with digits from the table (no +)
$COMPOSE exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c \
  "SELECT provider_message_id, body, received_at FROM wa_inbound_messages
   WHERE wa_id = 'WA_ID' ORDER BY received_at;"
```

---

## 5. Close out

- [ ] Record the run below
- [ ] Name the operator on the `WA_HANDLE_SECRET` rotation log row in `docs/env.md`
      (`2026-07-31` stub currently has `—`)
- [ ] Note any counter that moved unexpectedly

### Run log

| Date (UTC) | Operator | Pass? | Notes (counters / DSAR / isolation) |
|---|---|---|---|
| | | | |

---

## Never

- Do not dump secrets (`compose config`, `env`, `printenv`).
- Do not treat HTTP 403 alone as §3 pass without the reject counter.
- Do not brief EC-20 until this checklist is fully green.
