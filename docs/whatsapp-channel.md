# EC WhatsApp channel (K EC 7.4 / EC-21)

Copy of the **Banks4All WhatsApp shape**, not B4A copy or number.

T04 rows: **4** (viewing pointer) and **5** (staff reply transport). Does **not** collect or transmit offers (row 10), *proposta* / *caparra* (row 11), or negotiation advice (row 12). Search-brief text is a **search preference**, never an offer.

## Shape (same idea as B4A)

```
Customer  <->  Meta Cloud API (EasyCasa WABA — own number)
                    |
         NestJS WhatsAppModule  (webhook + Graph send)
                    |
         Postgres (inbound, outbound, wa_contacts, CRM phone)
                    |
     Inbox  #whatsapp
     API Hub  #whatsapp/{connection,templates,canned,analytics}
```

API Hub is **not** a microservice. Staff call `/admin/whatsapp/hub/*`. Meta calls `/whatsapp/webhook` only.

## What we copied

1. One public webhook host, HMAC fail-closed, 200-then-process.
2. One send path (`WhatsAppCloudClient`) — session text / buttons / list / CTA URL inside 24h; utility templates outside.
3. One inbox; humans take over. Established portal clients (`contact_type=client`) skip the journey.
4. Language first — B4A ice-breaker set (Meta list max **10** rows):
   `it` / `en` / `es` / `fr` / `de` / `pt` / `ur` / `hi` / `pa` / `ar`
   (`lang_*` ids). CRM `contacts.locale` stays `it|en|es` (`pt`→`es`, others→`en`);
   the full WhatsApp code is stored on `wa_contacts.language` and
   `searchIntent.whatsappLanguage`. Then welcome or off-hours (06:00–22:00 Europe/Rome), then three **new** buttons:
   - `buy_property`
   - `sell_property`
   - `easy_legenda`
   In-flight taps of `book_viewing` / `search_brief` / `open_listings` still resolve.
5. Phone → CRM contact (`source=whatsapp`) when `CRM_ENABLED`. Shareable callback links (province + reason) live at `/{locale}/prenota-chiamata` — operators copy them from `#crm/calls` (`docs/call-booking.md`).
6. Operator Hub: connection (no secrets), templates catalog, canned replies, analytics.
7. Health: `GET /whatsapp/webhook/status` (no secrets; signature-reject counter).

## What we did not copy

- B4A Assist / Consult / FAQ auto-reply
- Credit journeys, mutuo buttons, “independent credit advisor”
- Banks4All phone / WABA / portfolio
- Marketing templates or broadcast
- Encrypted Flows endpoints (pattern only — add later if counsel + product need in-chat forms)

## Ops

- Webhook (unchanged): `https://easycasaita.com/api/whatsapp/webhook`
- Health: `https://easycasaita.com/api/whatsapp/webhook/status`
- Admin: `https://admin.easycasaita.com/#whatsapp`
- Display number: `WHATSAPP_BUSINESS_NUMBER` (optional, Hub only)
- Portal CTA: `WHATSAPP_PUBLIC_SITE_URL` (default `https://easycasaita.com`)
