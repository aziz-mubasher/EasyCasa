# EC-17 — WhatsApp minimal inbound

**Repo** `aziz-mubasher/EasyCasa`
**Builds on** A `#64` (WhatsAppModule, webhook, WhatsAppService) · B `#66` (migration 0038) · C `#67`
**Size** Small. One migration, one controller change, one service, one email, tests.
**Not this brief** No queue screen. No AI triage. No conversation threading. D/E stay held.

## Why now

A–C is send-only plus delivery-status callbacks. There is no inbound consumer, so a
seeker replying to an OTP or a viewing reminder gets **silence from a number that
just messaged them**. That is live today.

This does not need Meta template approval: the seeker's message opens the 24-hour
customer service window, and a reply inside that window is free-form. EC-17 can
therefore ship while templates are still in review.

---

## Step 0 — Pre-flight (report before writing code)

```bash
# 1. Migration number. 0038 = B. 0039 is claimed by EC-16 #68 (unmerged).
ls apps/*/drizzle/ migrations/ packages/*/migrations/ 2>/dev/null | sort | tail -20

# 2. Does the EXISTING webhook verify X-Hub-Signature-256, or only GET-verify?
grep -rn "X-Hub-Signature\|hub.challenge\|APP_SECRET" apps/api/src

# 3. How does the repo already get a raw body? Stripe needs one.
grep -rn "rawBody\|RawBodyRequest\|bodyParser\|constructEvent" apps/api/src

# 4. Existing inbound shape — what does the POST handler do with `statuses` today?
grep -rn "statuses\|entry\[0\]\|changes\[0\]" apps/api/src/whatsapp

# 5. Email + GDPR seams to reuse, not rebuild.
grep -rn "MailService\|NOTIFY_FROM\|sendMail" apps/api/src -l
grep -rn "dsar\|erasure\|retention" apps/api/src -l
```

**Report:** the next free migration number; whether signature verification already
exists on the messages webhook; which raw-body mechanism is in place; the names of
the DSAR export / erasure / retention-purge registration points.

If answer 2 is "no verification" — say so loudly. That is the same defect found in
Banks4All and it changes this brief from *add* to *add and fix*.

---

## 1. Signature verification — non-negotiable, first commit

Verify `X-Hub-Signature-256` on every POST to the messages webhook **before parsing
or persisting anything**. Reject with 403 on mismatch.

Three failure modes to avoid, in order of likelihood:

- **Raw body.** HMAC must be computed over the exact bytes Meta sent. If Nest's JSON
  parser has already run, the re-serialised body will not match and every request
  fails. **Reuse whatever mechanism the Stripe webhook already uses** — do not
  introduce a second raw-body path, and do not flip a global `bodyParser` option that
  changes behaviour for other routes.
- **Comparison.** `crypto.timingSafeEqual`, and guard the length first — it throws on
  differing buffer lengths rather than returning false.
- **Config.** Missing or empty `APP_SECRET` must fail closed (reject), never open.

Signature failures increment a counter (§6). That counter is the alarm for forged
inbound; it is not a debug nicety.

---

## 2. Handle `messages` without regressing `statuses`

Meta delivers both under `entry[].changes[].value`. A payload may contain `statuses`,
`messages`, or both. Keep the existing status path byte-identical in behaviour and add
messages alongside it.

Respond **200 fast**: persist synchronously (one insert), then return. Auto-reply and
email forwarding happen after the response. Meta retries on slow or non-200 responses,
which is how one inbound message becomes five.

---

## 3. Persist — migration `0040`

Re-verify the number on `main` immediately before adding. Migration collisions are a
recurring failure on this repo, and `0039` is already spoken for by an unmerged PR.

```sql
CREATE TABLE IF NOT EXISTS wa_inbound_messages (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_message_id text        NOT NULL,
  wa_id               text        NOT NULL,
  phone_number_id     text        NOT NULL,
  message_type        text        NOT NULL,
  body                text,
  received_at         timestamptz NOT NULL,
  window_expires_at   timestamptz NOT NULL,
  auto_replied_at     timestamptz,
  forwarded_at        timestamptz,
  forward_error       text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS wa_inbound_messages_provider_message_id_key
  ON wa_inbound_messages (provider_message_id);
CREATE INDEX IF NOT EXISTS wa_inbound_messages_wa_id_received_at_idx
  ON wa_inbound_messages (wa_id, received_at DESC);
CREATE INDEX IF NOT EXISTS wa_inbound_messages_auto_reply_idx
  ON wa_inbound_messages (wa_id, auto_replied_at DESC) WHERE auto_replied_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS wa_inbound_messages_created_at_idx
  ON wa_inbound_messages (created_at);
```

**Dedupe is the unique index, not application logic.** Meta redelivers; the insert is
the idempotency point:

```sql
INSERT INTO wa_inbound_messages
  (provider_message_id, wa_id, phone_number_id, message_type, body, received_at, window_expires_at)
VALUES ($1,$2,$3,$4,$5,$6,$7)
ON CONFLICT (provider_message_id) DO NOTHING
RETURNING id;
```

No row returned → already seen → return 200 and stop. No reply, no email.

`window_expires_at = received_at + 24 hours`. Use Meta's `timestamp` field, not
`now()`, or clock skew and retry delays corrupt the window.

**Media: record `message_type` and leave `body` null. Do not download media.** No
MinIO writes, no Graph media fetch. Out of scope and it imports storage, cost and PII
problems this brief does not want.

---

## 4. Auto-reply — at most once per sender per 24h

```sql
SELECT 1 FROM wa_inbound_messages
WHERE wa_id = $1 AND auto_replied_at > now() - interval '24 hours'
LIMIT 1;
```

Row exists → skip. This is the rule that matters most in the brief. Replying per
*message* rather than per *window* means a seeker who sends four lines gets four
auto-replies. That reads as spam, spam moves the quality rating, and **quality rating
is portfolio-level** — so it can throttle template delivery, which is the OTP, which
is signup. The failure chain runs from a chatty user to broken registration.

Free-form send (no template — the window is open). IT default with an EN line; do not
build locale detection for this. Content: acknowledge receipt, say a human replies by
email, do not promise a time.

Stop-words (`STOP`, `BASTA`, `CANCELLA`, `UNSUBSCRIBE`, `BAJA`, case-insensitive,
whole message) → persist, do not auto-reply. A durable opt-out flag that also
suppresses C's utility templates is **EC-18, not this brief** — note the gap in the PR
rather than half-building it here.

---

## 5. Forward to ops

Reuse the existing mail service. One email per persisted inbound to the ops mailbox:
`wa_id`, `message_type`, body, received time, window expiry. Failure writes
`forward_error` and increments a counter — it must not fail the webhook or block the
auto-reply.

---

## 6. GDPR wiring — the part that is easy to forget

This table is a **new store of personal data** (phone number plus free text). Phase 38
already built DSAR export, erasure and retention purge. A PII table not registered
with them is silently missing from every future subject request.

- **DSAR export** — include, keyed on `wa_id`:
  ```sql
  SELECT provider_message_id, message_type, body, received_at, auto_replied_at
  FROM wa_inbound_messages WHERE wa_id = $1 ORDER BY received_at;
  ```
- **Erasure** — include in the same erasure path, honouring existing legal-hold reporting.
- **Retention purge** — register with a configurable window, default 90 days:
  ```sql
  DELETE FROM wa_inbound_messages WHERE created_at < now() - ($1 || ' days')::interval;
  ```
  Flag 90 days in the PR as **COUNSEL TO CONFIRM**. Do not present it as decided.

Lawful basis is contract performance / pre-contractual steps — the seeker initiated
contact. Do not add a consent checkbox anywhere for this.

**No message body or `wa_id` in application logs.** Log the internal `id` only.

**Metrics** (Phase 39 Prometheus): `inbound_received`, `inbound_signature_rejected`,
`inbound_duplicate`, `auto_reply_sent`, `auto_reply_suppressed`, `forward_failed`.

---

## DO NOT

- Do **not** use the Banks4All webhook as a reference implementation. Its messages path
  skips `X-Hub-Signature-256`. Copying that pattern is the single likeliest way this
  brief goes wrong.
- Do not build a shared receiver, a shared conversation store, or any B4A code path.
  Do not send EasyCasa inbound data to anything Banks4All-owned.
- Do not add a queue screen, admin UI, classification, AI, or conversation threading.
- Do not download or store media.
- Do not touch the OTP or utility send paths, or the template names.
- Do not change the GET verify handler.
- Do not add a second raw-body mechanism or change global body parsing.
- Do not auto-reply outside an open window (it would need an approved template and
  none are approved).
- Do not claim visual or live-Meta verification. There is no browser and no Meta
  sandbox in the agent.

---

## VERIFY

`pnpm install --frozen-lockfile` · `pnpm lint` · `pnpm -w typecheck` · `pnpm -w build`
(must stay green) · `pnpm test` · `pnpm --filter @easycasa/api test:int`

Integration tests, all against the real handler:

1. Valid signature + `messages` payload → 200, one row, auto-reply attempted.
2. **Invalid signature → 403, zero rows, zero sends.** The regression test that matters.
3. Missing/empty app secret → 403, not 200.
4. Same `provider_message_id` twice → 200 both times, one row, **one** send.
5. Two distinct messages from one `wa_id` inside 24h → two rows, **one** auto-reply.
6. `statuses`-only payload → existing behaviour unchanged, no inbound row.
7. Combined `statuses` + `messages` payload → both handled.
8. Stop-word message → row persisted, no auto-reply.
9. Media message → row with type set, `body` null, no media fetch.
10. Mail transport throws → 200 still returned, `forward_error` set.

---

## PR

- Branch `feat/whatsapp-minimal-inbound`
- Title `feat(api): handle inbound WhatsApp messages with signature verification and windowed auto-reply`
- Description must state: the migration number actually used and how it was verified
  free on `main`; **whether signature verification already existed or this PR
  introduced it**; which raw-body mechanism was reused; the DSAR/erasure/retention
  registration points touched; the 90-day retention flagged COUNSEL TO CONFIRM; and
  the EC-18 opt-out gap.

## DEFINITION OF DONE

An inbound WhatsApp message to the EasyCasa number is signature-verified, persisted
exactly once, acknowledged to the sender at most once per 24 hours with a free-form
reply, forwarded to ops by email, exportable and erasable under the existing GDPR
paths, and purged on a retention schedule — with a forged POST rejected 403 and
counted.

## REPORT BACK

1. Did signature verification already exist on the messages path, or did you add it?
2. Migration number used, and how you confirmed it free.
3. Raw-body mechanism reused (and confirmation you added no second one).
4. Where DSAR export, erasure and retention purge were registered.
5. Anything in A–C you had to touch, and why.

---

*Sandbox caveat: the SQL above was grammar-validated with pglast; the queries are
parse-checked. Nothing here was compiled or run against the repo, Meta, or a live
Postgres. Treat the TypeScript-level instructions as specification, not tested code.*
