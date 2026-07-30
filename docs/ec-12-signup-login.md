# EC-12 — Signup and login (lean)

Login stays **Keycloak OIDC/PKCE**. Phone verification is a **post-login** API
feature (WhatsApp authentication template, email fallback) — not phone-as-login.

## Layers

| Layer | What | Where |
|---|---|---|
| 1 | Google + Apple IdP | Keycloak identity brokering — **ops config**, see `docs/runbooks/keycloak-social-idp.md` |
| 2 | Email/password | Already enabled in realm (`registrationAllowed`, `loginWithEmailAllowed`) |
| 3 | WhatsApp OTP → `users.phone_verified_at` | `POST /me/phone/verify/start\|confirm` |

## Phone verification

- Migration `0036_phone_verification.sql`
- OTP hashed (`PHONE_OTP_PEPPER`), 10 min TTL, max 3 attempts, rate limits per user/phone/IP
- Meta Cloud API when `WHATSAPP_*` set; otherwise email fallback to the account email
- Submit Meta **authentication** template with copy-code on day one (approval lag)
- Ops runbook: `docs/runbooks/whatsapp-otp.md` (K EC 7.1 Phase B)

## Auth bypass removal

Former header trust path is gone from production config. Tests use
`NODE_ENV=test` + `EC_TEST_AUTH=true`. Provider stubs use `ALLOW_PROVIDER_STUBS`
(not an auth bypass). Proven by `dev-auth-absent.spec.ts`.

## Enquiry UX

Privacy processing for enquiries is Art. 6(1)(b) — **notice link**, not a required
consent tick. Mediation disclosure remains acknowledged. Marketing/B4A share stays
optional and unticked.

## Deferred

- Phone-as-login (Keycloak SPI)
- SMS / magic links
- Agency invite flow (`agency_members` still greenfield — EC-11)
- Owner trust badge on listing cards (API sets `phone_verified_at`; display follow-up)
- Keycloak Google/Apple IdP secrets (ops — see runbook)
- Meta authentication template approval (ops long pole)
- Web valuation landing still mock (API `/avm/estimate` is already `@Public`)
- Admin Vite SPA still has `VITE_DEV_AUTH` for local ops until full OIDC cutover

## Env

See `docs/env.md` / `.env.example` for `WHATSAPP_*`, `PHONE_OTP_PEPPER`,
`EC_TEST_AUTH`, `ALLOW_PROVIDER_STUBS`.
