# WhatsApp Cloud — ops preflight

Paste into any brief that assumes WhatsApp sends work. Not an engineering task —
this is the gate that decides whether the engineering is even reachable.

Env catalogue: `docs/env.md` (six Nest secrets + no-dump rule).

## Gate 1 — env is actually loaded (not just present)

- [ ] `DEMO_MODE=false` — anything else short-circuits the Cloud client before Graph
- [ ] All **six** Nest secrets set: token · phone number ID · verify token · app secret ·
      template name(s) · `WA_HANDLE_SECRET`
- [ ] **WABA ID is not a Nest env.** Meta-console only. Do not list it.
- [ ] `.env` hygiene: one key per line · ASCII only · no inline `#` on a secret value ·
      no duplicate keys (last wins, silently) · no `…` from a truncated paste
- [ ] Length check per key **inside the container**, not on the host file:
      `docker compose exec api sh -c 'echo ${#WHATSAPP_TOKEN}'` — never echo the value
- [ ] API recreated after env change: `--force-recreate --no-deps api` (env is read at boot)

## Gate 2 — Meta side matches VPS side

- [ ] Verify token: **re-subscribe from the Meta app dashboard** and confirm the 200.
      A self-issued `curl` against your own webhook proves the app can echo its own
      token; it proves nothing about what Meta stored. Existing subscriptions keep
      POSTing without re-verifying, so a mismatch stays invisible until the next touch.
- [ ] App secret: matches the Meta app. Wrong secret → inbound `X-Hub-Signature-256`
      rejected → **status callbacks silently dropped** while sends still look fine.
- [ ] Phone number ID belongs to the same app as the token.

## Gate 3 — templates

- [ ] One template **name**, multiple **language versions** (it/en/es). Three separate
      Nest env keys for the three languages is the wrong shape — the name is the env,
      the language code is a per-send parameter.
- [ ] Auth-category templates use Meta's fixed Authentication components
      (code delivery + optional security disclaimer + expiry). Custom body prose in an
      auth template is a routine rejection.
- [ ] Template names are **immutable after creation** — no rename, only re-create and
      re-approve. Settle the name before the first submission.
- [ ] Approved status confirmed per language, not just per name.

## Gate 4 — smoke means both halves

- [ ] Outbound: Graph returns `messages[0].id` → **accepted for delivery**, not delivered.
- [ ] Inbound: a `sent`/`delivered` status callback arrives at the webhook *and passes
      signature validation*. Only this proves Gate 2's app secret.
- [ ] Real verified phone, real template, real locale.

**Faster path while templates are still pending:** free-form auto-reply inside the 24h
window needs no approved template. Run the full operator checklist in
`docs/runbooks/whatsapp-inbound-smoke.md` (phone ×2 · viewer · forge+counter · DSAR)
**before** briefing EC-20. Pass = all five sections, not “the reply arrived”.

## Never

- No secret dumps. `docker compose config`, `env`, and `printenv` render the full
  resolved environment — treat any one of them as having exposed **every** secret in
  that service, not just the one you were looking for. Rotate all of them.
- After rotating `WA_HANDLE_SECRET`, log the date in `docs/env.md` (rotation table).
  Bookmarked `#whatsapp/<handle>` links 404 until re-opened from the list — that is
  expected, not a viewer bug.
