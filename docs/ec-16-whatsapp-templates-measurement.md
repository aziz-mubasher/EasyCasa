# EC-16 — WhatsApp: Meta templates, delivery status, measurement

**Repo** `aziz-mubasher/EasyCasa`
**Context** Phases A–C on main and live (`5e01754`). Cloud client, webhook,
`WhatsAppService`, OTP cutover, viewing lifecycle, 24h/2h reminders, verified-phone
gate, disclosure ladder. **Do not rebuild any of it.**
**Held** D and E until inbound volume justifies them.
**Size** Part 0 is human. Parts 1–2 are one small run.

---

## Part 0 — Meta template pack *(human, blocking)*

Nothing sends until these are approved. Submit all of them in one sitting;
approval is not instant and it is the only thing between the code and a working
notification.

Names are lowercase alphanumeric with underscores. Each needs **three language
versions** under the same name — `it`, `en`, `es`. That is 7 templates × 3 = 21
submissions.

**Italian is authored below.** EN and ES follow it literally; do not re-word,
because a template whose meaning drifts between locales is a support problem
later.

### Authentication — 1 template

**`easycasa_otp`** · category **AUTHENTICATION**

Meta constrains this format; you select components rather than writing prose.

- Body: the standard verification-code body with `{{1}}` as the code
- Add-on: **expiration warning, 10 minutes**
- Add-on: security recommendation — optional, recommended
- Button: **Copy code**

Note per your feedback: **the auth template is a separate env set from the
utility names.** Do not assume one seeding covers both.

### Utility — 6 templates

All category **UTILITY**. No promotional language anywhere — Meta rejects utility
templates that read as marketing, and a rejection costs another approval cycle.
Provide a realistic sample value for every variable at submission.

---

**`easycasa_enquiry_received`** → owner

> Ciao {{1}}, hai ricevuto una nuova richiesta di informazioni per il tuo annuncio
> "{{2}}".
> Apri EasyCasa per leggerla e rispondere.

`{{1}}` owner first name · `{{2}}` listing title
**No seeker name.** The ladder holds in notifications, not only in the UI.

---

**`easycasa_viewing_requested`** → conductor

> Ciao {{1}}, nuova richiesta di visita per "{{2}}" il {{3}}.
> Puoi confermare o proporre un altro orario su EasyCasa.

`{{1}}` conductor first name · `{{2}}` listing title · `{{3}}` date and time
Still no seeker name.

---

**`easycasa_viewing_confirmed`** → seeker

> Visita confermata per "{{1}}" il {{2}}.
> Indirizzo: {{3}}
> Referente: {{4}}
> Se non puoi venire, annulla su EasyCasa così liberi l'orario.

`{{3}}` exact address · `{{4}}` conductor name

**This is the reveal template.** The first message in the whole system carrying an
exact address and a name — correct, and worth a second look during review to
confirm nothing earlier leaks either.

---

**`easycasa_viewing_reminder_24h`** → seeker **and** conductor

> Promemoria: domani hai una visita per "{{1}}" alle {{2}}.
> Indirizzo: {{3}}
> Se non puoi venire, annulla su EasyCasa.

---

**`easycasa_viewing_reminder_2h`** → seeker **and** conductor

> Tra due ore: visita per "{{1}}" alle {{2}}.
> Indirizzo: {{3}}
> Contatto: {{4}}

`{{4}}` the other party's phone — this is the "I'm running late" message, and
it is the one that actually prevents a wasted trip.

---

**`easycasa_viewing_cancelled`** → other party

> La visita per "{{1}}" del {{2}} alle {{3}} è stata annullata.
> Puoi prenotare un altro orario su EasyCasa.

---

### Not submitting

- **Order status** — no notifier exists to emit it. My earlier plan listed it
  without checking; there is nothing to attach a template to. Revisit when an
  order notifier exists.
- **Any marketing template.** Keeping the account free of them means the WhatsApp
  consent story stays "we message you about things you asked for."

---

## Part 1 — Delivery status persistence

Currently status callbacks are logged. Logs are not queryable, and this is the
prerequisite for Part 2 rather than a separate improvement.

```sql
CREATE TABLE whatsapp_messages (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_message_id  text UNIQUE,
  template_name        text NOT NULL,
  locale               text NOT NULL,
  to_user_id           uuid REFERENCES users(id) ON DELETE SET NULL,
  related_type         text,          -- viewing | enquiry | otp
  related_id           uuid,
  status               text NOT NULL, -- queued|sent|delivered|read|failed
  failure_reason       text,
  sent_at              timestamptz NOT NULL DEFAULT now(),
  status_updated_at    timestamptz
);
CREATE INDEX whatsapp_messages_related_idx ON whatsapp_messages (related_type, related_id);
CREATE INDEX whatsapp_messages_status_idx  ON whatsapp_messages (status, sent_at DESC);
```

Webhook status callbacks update the row by `provider_message_id`. Phase B already
stores that on OTP — extend it to every send.

**Why it matters beyond metrics:** a reminder that failed silently is worse than
no reminder, because you believe the person was told. Without this table, "I never
got it" is unanswerable and a systematic delivery failure could run for weeks
unnoticed.

**Message content is not stored.** Status, template name and reference only. The
content is reconstructable from the template and the entity, and storing it
duplicates personal data into a second place that erasure then has to reach.

`to_user_id` nullable with `ON DELETE SET NULL`, so erasure does not destroy
delivery statistics.

## Part 2 — Measurement

The number that justifies phase C: **does a delivered reminder reduce no-shows.**

Viewings already carry `COMPLETED` and `NO_SHOW` from Phase 29. Join to
`whatsapp_messages` on `related_id` and compare no-show rate where a reminder was
**delivered** — not merely sent — against where it was not.

Expose it on the admin coverage or a small ops view: viewings in period, reminder
delivery rate, no-show rate with and without.

**Be honest about what this can prove.** At fifty listings you will have perhaps
a dozen viewings a month. That is not enough for significance for several months.
So:

- Instrument now, so the data accumulates from the first viewing
- Do not run an A/B holdout — deliberately withholding reminders to build a
  control group costs real no-shows for a result you cannot read at this volume
- Report the raw number, not a claimed improvement, until there are ~100 viewings

Also track **failure rate by template**. A template failing at 30% is an ops
problem to fix, and without Part 1 it is invisible.

---

## Human runbook

- [ ] Submit all 21 template versions to Meta
- [ ] Set `WHATSAPP_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID` on the VPS
- [ ] Confirm the **auth** template env is set separately from the utility names
- [ ] Verify `DEMO_MODE` is off in production and **on** in the demo stack — EC-15
      requires the demo stack to send nothing, and this is the switch
- [ ] Smoke: verified phone, book a viewing, confirm it, check the confirmed
      template arrives with address and name
- [ ] Smoke: trigger a 24h reminder and confirm **both** seeker and conductor
      receive it — this is the bug that was caught once already
- [ ] Confirm graceful skip still works: unset the token, verify email and in-app
      continue and nothing throws

**Deploy:** API-only per your note — build `api`, then
`--force-recreate --no-deps api`. Confirm `Recreated`, not `up-to-date`, and check
the build SHA changed if EC-14's `/version` has landed.

## Validation

- Every send writes a `whatsapp_messages` row before the API call returns
- Status callbacks update the correct row by `provider_message_id`
- A failed send records `failure_reason` and does not break the calling flow
- 24h and 2h reminders create rows for **both** recipients
- No message content persisted anywhere
- Erasure nulls `to_user_id` and leaves the row
- No-show comparison query returns correct counts against seeded data
- Missing credentials still degrade to email and in-app with no exception
- Migration applies and rolls back; `pglast` parse
- Lint, typecheck, tests green

## Out of scope

Phases D and E. Order-status notifications. Marketing templates. Inbound message
handling beyond what the webhook already does for status.
