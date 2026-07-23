# Email Verification Runbook — K EC 1.16

**Scope:** human verification of outbound email after SMTP configuration. The API diagnostic CLI and startup warnings make misconfiguration loud; this runbook confirms real delivery, both enquiry recipients, and SPF/DKIM.

**You cannot skip the human steps.** A green deploy with `email:diagnostic` passing only proves the API sees a real provider — not that Contatta enquiries reach the agency inbox or pass authentication.

---

## Prerequisites

| Variable | Required | Notes |
|---|---|---|
| `SMTP_URL` | Yes (production) | Brevo relay, e.g. `smtp://user:password@smtp-relay.brevo.com:587` |
| `NOTIFY_FROM` | Yes | Sender address. **Quote in `.env` if it contains spaces or angle brackets** (audit F5): `NOTIFY_FROM="EasyCasa <noreply@easycasaita.com>"` |

Provider selection precedence (first match wins):

1. `SMTP_URL` set → **SmtpEmailProvider** (nodemailer)
2. else `EMAIL_PROVIDER_URL` set → **HttpEmailProvider**
3. else → **NoopEmailProvider** (warn log per message, email discarded)

---

## 1. Run the diagnostic CLI (inside the API container)

From the VPS project root (where `docker-compose.yml` lives):

```bash
docker compose exec api sh -c 'EMAIL_DIAGNOSTIC_TO=your-inbox@example.com pnpm --filter @easycasa/api email:diagnostic'
```

Or pass the recipient as argv:

```bash
docker compose exec api node dist/email/diagnostic/run-email-diagnostic.js your-inbox@example.com
```

**Expected when configured:**

```
Active provider: smtp
SMTP_URL set: true (smtp://***:***@smtp-relay.brevo.com:587/)
NOTIFY_FROM set: true (EasyCasa <noreply@easycasaita.com>)
OK — test email delivered via smtp (messageId: ...)
```

**Exit codes:**

| Code | Meaning |
|---|---|
| `0` | Real provider active; test send succeeded (or no recipient given but provider is real) |
| `1` | Noop provider active, or test send failed — **do not treat deploy as email-ready** |

The CLI uses the same `EmailService` / provider stack as enquiry emails — not a separate nodemailer script.

---

## 2. Confirm startup warning is gone

After setting `SMTP_URL`, restart the API and check logs on boot:

```bash
docker compose logs api 2>&1 | grep -i 'EMAIL MISCONFIGURED'
```

**Expected:** no matches. If you see `EMAIL MISCONFIGURED — ALL OUTBOUND EMAIL WILL BE DISCARDED`, SMTP is still unset from the container's point of view (check `.env` sourcing and quoting).

Readiness (informational — does **not** fail the site):

```bash
curl -s https://api.easycasaita.com/health/ready | jq '.checks[] | select(.name=="email")'
```

**Expected:** `"up": true` with `"detail"` containing `provider: smtp`. When misconfigured, detail shows `provider: noop` but `/health/ready` still returns 200 — email is non-critical for load-balancer rotation.

---

## 3. Submit a Contatta enquiry and grep logs

1. Log in via Keycloak on production.
2. Open a listing → **Contatta** → submit a real enquiry with a seeker email you control.
3. Grep API logs:

```bash
docker compose logs api --since 10m 2>&1 | grep -Ei 'EmailNoop|smtp|mail|enquiry'
```

**Pass criteria:**

- **No** `WARN [EmailNoop] email not configured — skipped` lines for the enquiry subjects.
- Seeker confirmation subject contains `Abbiamo ricevuto la tua richiesta`.
- Owner notification subject contains `Nuova richiesta`.

**Fail criteria:** any `EmailNoop` skip for those subjects means leads are still evaporating.

---

## 4. Confirm BOTH recipients receive mail

| Recipient | Email | Template |
|---|---|---|
| Seeker | Address used at login / enquiry form | `enquiryReceivedSeeker` — "Abbiamo ricevuto la tua richiesta …" |
| Listing owner | **`users.email` of the listing owner** (not hardcoded in code) | `enquiryReceivedOwner` — "Nuova richiesta …" |

**Critical:** seeker-only delivery is still a broken lead pipeline. The agency must receive the owner notification or the lead is lost from their perspective.

In production, owner mail goes to whatever email is on the listing owner's user record (e.g. `info@easycasaita.com` if that is the owner's `users.email`). Pilot seed data uses `agente@easycasaita.com`.

Check both inboxes (and spam folders).

---

## 5. SPF / DKIM (Brevo + Hostinger)

1. Brevo dashboard → **Senders, Domains & Dedicated IPs** → **Domains**.
2. Add `easycasaita.com`.
3. Copy the TXT records Brevo provides.
4. Hostinger hPanel → **DNS Zone** → add the records.

**SPF warning:** a domain may have only **one** SPF TXT record. If `easycasaita.com` already has `v=spf1 ...`, **merge** Brevo's `include:` into the existing record — do not add a second SPF TXT.

5. Return to Brevo → **Verify** the domain.

---

## 6. Prove authentication passes (Gmail "Show original")

Open the received test or enquiry email in Gmail → **⋮** → **Show original**.

Require:

```
SPF: PASS
DKIM: PASS
```

Mail that lands in **spam** is indistinguishable from "not sent" to most users — check spam during verification.

---

## 7. NOTIFY_FROM quoting (audit F5)

Values like `EasyCasa <noreply@easycasaita.com>` contain spaces and angle brackets. In `.env`:

```bash
NOTIFY_FROM="EasyCasa <noreply@easycasaita.com>"
```

Unquoted values break shell parsing when sourcing `.env` and can cause false deploy failures.

---

## Quick checklist

- [ ] `email:diagnostic` exits 0 with test delivery
- [ ] No `EMAIL MISCONFIGURED` on API boot
- [ ] `/health/ready` email check shows `provider: smtp`
- [ ] Contatta enquiry → no `EmailNoop` in logs
- [ ] Seeker inbox received confirmation
- [ ] Owner inbox received notification
- [ ] Gmail original shows SPF PASS + DKIM PASS
- [ ] `NOTIFY_FROM` quoted in `.env`

---

## What this runbook cannot automate

- Real SMTP/network delivery (requires VPS + provider credentials)
- DNS propagation and Brevo domain verification
- Inbox placement (spam vs inbox)
- Confirming the production listing owner's `users.email` is the correct agency address

Those remain human-operated gates after merge.
