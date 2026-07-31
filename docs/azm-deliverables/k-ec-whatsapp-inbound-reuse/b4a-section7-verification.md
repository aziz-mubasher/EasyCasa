# §7 verification — Banks4All WhatsApp receiver (2026-07-31)

Repo checked: `/Volumes/Muba/Banks4All_Portals/Banks_4all` (GitHub `aziz-mubasher/Banks_4all` portals tree).
Not the empty/legacy `/Volumes/Muba/SW Development /Banks_4all` checkout.

## Answers

| # | Question | Finding |
|---|----------|---------|
| 1 | App secret single-configured or per-path? | **Single-configured.** `whatsappConfig.appSecret` from `WHATSAPP_APP_SECRET` / `META_APP_SECRET`. One webhook URL: `GET/POST /api/webhooks/whatsapp`. **Kills shared receiver.** |
| 2 | Persist conversations, or classify-and-forward? | **Persists.** Inbound → CRM lead sync + `WhatsAppMessage` store (`recordInboundWhatsAppForOwner`). Not a stateless forwarder. |
| 3 | Window-state model? | **Yes.** `computeWhatsAppWindow` = 24h from last inbound; dashboard/insights surface open windows. Outbound automation falls back to templates outside the window. |
| 4 | Classifier API client or DB handle? | **DB handle.** `b4aAssist` writes `B4aAssistEvent` via Mongoose; WhatsApp live-chat auto-reply calls Assist in-process. Finding for B4A independently of EasyCasa. |

## Extra (signature path)

- **Flows** endpoints (`whatsappFlowController`) verify `X-Hub-Signature-256` against the single app secret.
- **Main messages webhook** (`handleWhatsAppWebhook`) does **not** verify signature today — only hub.verify_token on GET. Separate hardening item for B4A; does not enable multi-tenant sharing.

## Implication for EasyCasa

Assessment §1–§2 stand: **do not route EC inbound into B4A.** Reuse code/pattern only; two deployments, two stores. Prefer the **minimal inbound ack** (§5) before Full D/E.
