# EasyCasa inbound WhatsApp — what's reusable from B4A, what isn't

**Status** Design note, not a brief. D/E are still held.
**Caveat** I can't read `aziz-mubasher/Banks_4all` from here. Everything about the
B4A side is inference from prior sessions (B4A Assist: classification, retrieval,
escalation, logging). §7 lists what to grep to confirm or kill this.

---

## 1. Verdict

**You cannot route EasyCasa's inbound WhatsApp into B4A's receiver.** Not a
preference — three separate constraints each block it independently, and the
legal one is already on your blocked list for other reasons.

**What you can reuse is the pattern and the triage capability, not the running
service.** That was already the §7 position in the A–F plan ("build once, deploy
twice") and nothing here changes it. The distinction that matters: *one
capability, two deployments, two data stores* — not *one service, two tenants*.

---

## 2. Why the receiver can't be shared

**Constraint 1 — routing.** A phone number belongs to one WABA; a WABA is
subscribed to one Meta app; an app has one webhook callback URL. You've just
wired EasyCasa's own token and phone number ID, so these are separate apps.
B4A's receiver is not reachable by EasyCasa's inbound traffic without
re-pointing EasyCasa's app webhook at a B4A-hosted URL — which is constraint 3.

**Constraint 2 — signature validation.** Inbound POSTs carry
`X-Hub-Signature-256` computed with the *app secret of the owning app*. A single
receiver serving both apps has to pick a secret before it can trust the payload
— you cannot read the body to decide which secret to use, because validating the
body is the thing you're deciding. The only correct shape is **separate URL
paths with the secret pinned per path** (`/wa/ec`, `/wa/b4a`). If B4A's receiver
validates against a single configured secret, it structurally cannot accept
EasyCasa traffic. Check this first — it's the cheapest disqualifier.

**Constraint 3 — controller boundary.** EasyCasa inbound WhatsApp is seeker PII:
name, `wa_id`, free-text about a property they want. Landing it in B4A
infrastructure is a cross-controller transfer, gated on exactly the counsel
consent already blocking Banks4All Phase B/C — and it inverts the standing rule
that enquiry PII does not reach Banks4All. The shared VAT already makes the
independence claim fragile; a shared inbox makes it false.

**And a fourth, softer one — identity.** The display name and number the user
sees is per-phone-number. EasyCasa messages must arrive from EasyCasa. If a
seeker's viewing reminder comes from Banks4All, the disclosure ladder is broken
at the transport layer, before any product logic runs.

---

## 3. Two couplings to check even though the stacks stay separate

**Messaging limits are portfolio-level, not number-level.** Per current
reporting, business-initiated template limits and quality tiers attach to the
Meta *Business Portfolio*, with new portfolios starting around 250 unique
recipients per rolling 24h and tiering up on quality and verification. If
EasyCasa and B4A sit in the same portfolio, a quality-rating hit on B4A's
advisory messaging can throttle EasyCasa's **OTP delivery** — i.e. break signup —
and vice versa. Verify in Business Manager. If they're already in one portfolio,
this is an argument for splitting that outweighs the admin convenience of not.

**Window economics change on 1 Oct 2026.** Service messages sent inside the
24-hour window are free today; reporting says they become chargeable per-message
from 1 October, with utility-in-response also moving to per-message. That's two
months out and it inverts the usual "drive inbound, replies are free" design.
Any D/E business case built on free service replies has a short shelf life —
confirm against Meta's pricing page before costing the queue.

*(Both of these post-date my reliable knowledge and come from secondary sources.
Treat as prompts to verify, not as settled.)*

---

## 4. The gap that exists right now

A–C is send-only plus delivery-status callbacks. There is no inbound consumer.
So today, when a seeker replies to an OTP or a viewing reminder — and they will,
because it's WhatsApp and replying is the natural act — **the message is received
by the webhook and goes nowhere.** Silence from a number that just messaged them.

That's a live product defect, and it's a better argument for acting than "when
volume becomes annoying." But it does not require the queue.

---

## 5. Minimal move vs. full D

**Minimal (hours, no EC-14 dependency, no AI):**

1. Handle `messages` in the existing webhook alongside `statuses`. Idempotent on
   `messages[0].id` — Meta redelivers.
2. Persist a thin `wa_inbound` row: `wa_id`, message id, timestamp, body,
   `window_expires_at`. No threading model, no state machine.
3. Auto-reply once per window: "we've received this, we reply by email" — free-form
   is allowed here because their message opened the window, so no template needed.
4. Forward to the ops mailbox. Humans answer in the channel that already works.

This closes the silence and buys the real inbound corpus that phase F needs to be
grounded on, without committing to a queue design before you know what people ask.

**Full D (the queue) only after EC-14 Pt 2** — support redaction and admin roles
are its actual prerequisite, and neither has landed.

**One design point for when you build it:** the organizing axis of the queue is
not read/unread, it's **time remaining in the 24-hour window**, because that's
what determines whether a reply is a free-form message or a template that needs
prior approval. A queue sorted by arrival time will let windows expire silently
and then fail sends with a template error. Sort by expiry, surface the countdown,
and gate the reply box on window state.

---

## 6. What "shared" should actually mean

| Layer | Shared? | Why |
|---|---|---|
| Meta app, number, WABA | **No** | Constraints 1, 2, 4 |
| Business Portfolio | **Probably not** | §3 limit coupling |
| Webhook receiver instance | **No** | Constraint 2 |
| Conversation store | **No** | Constraint 3 |
| Receiver *code* / dedupe / window logic | **Yes** | Same Meta contract both sides |
| Classification + escalation capability | **Yes** | Two knowledge bases, two escalation routes |
| Admin queue UI pattern | **Yes** | Same shape, different data |

The shared triage capability stays a **client of each API with a scoped token** —
never a process with a database connection. That rule is what stops a seeker's
name leaking before viewing confirmation, or a financing band reaching the wrong
party.

---

## 7. Verify in `Banks_4all` before any of this is actionable

```
grep -rn "X-Hub-Signature\|hub.challenge\|app_secret" -l
grep -rn "graph.facebook.com\|phone_number_id" -l
grep -rn "24h\|window_expires\|conversation_window" -l
```

Answer four questions:

1. Is the app secret single-configured or per-path? (kills or permits any sharing)
2. Does it persist conversations, or classify-and-forward statelessly?
3. Is there a window-state model, or does it assume replies always work?
4. Is the classifier already an API client with a token, or does it hold a DB handle?

If 4 is "DB handle", that's a finding for B4A on its own terms, independent of
EasyCasa.
