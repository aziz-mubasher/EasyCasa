# Call booking — shareable links → CRM scheduled call

**T04 rows:** 4 (scheduling tooling) and 5 (transport). **Rows 10–12 stay prohibited** — the form does not collect offers, *proposta*, *caparra*, or negotiation advice. No credit / mutuo intake (Banks4All).

**Copy rule:** the visitor *requests a callback*. EasyCasa does not match them to a counterparty or advise on a deal.

## Shareable URL

Operators build links in admin `#crm` → **Call links** (`IT` `EN` `ES` `UR` `HI`).
EC Consult copies the invitation (greeting + 15-minute discovery-call body + link) in the
guest’s language — same pattern in every locale. The `{name}` after the greeting is the
**form-filled client name** (source of truth). If that is empty, the WhatsApp profile name
is used. If both are missing the name stays blank (`Salam o alaikum,` — no stub `name`).

Every inbound EasyCasa WhatsApp lead upserts a CRM contact (`source=whatsapp`), including
STOP / closed-window / blocked threads. The journey auto-reply is separate.

```
https://easycasaita.com/{locale}/prenota-chiamata?provincia=Brescia&motivo=vendere
```

`ur` and `hi` are desk locales for this form only (not full-site next-intl locales).

| Query | Accepts | Canonical |
|-------|---------|-----------|
| `provincia` / `province` | Sigla (`BS`) or name (`Brescia`) | Official ISTAT name in the generated link |
| `motivo` / `reason` | `vendere` `comprare` `easy-legenda` `acquisto-assistito` `altro` (and EN aliases `sell` `buy` …) | Closed `CallBookingReason` |

Reasons: **sell** · **buy** · **legenda** · **assistito** · **other**. No offer / credit reasons.

## What happens on submit

`POST /call-requests` (public, throttled) → `CRM_HOOKS.onCallRequestCreated` when `CRM_ENABLED=true`:

1. Upsert `crm.contacts` (`source=call_request` on create; existing source kept).
2. Seeker `searchIntent`: `{ channel: 'call_booking', province, reason }`.
3. **Open task** titled `Call · {Province} · {reason}` with `due_at` = visitor’s preferred time, or **+24h**.
4. Activity `system` + audit.

Operators see the task on `#crm` → Tasks and on Contact-360. They can also schedule a call from Contact-360 without the public form.

## Gate

Same as CRM: no-op when `CRM_ENABLED=false`. Production already uses the CRM flag.
