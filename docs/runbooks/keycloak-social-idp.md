# Keycloak — Google & Apple identity brokers (EC-12)

**Zero application code.** Configure on the live `easycasa` realm. Do **not**
re-import `realm-easycasa.json` (drops real users).

## Prerequisites

- Working Keycloak admin (`kcadm` or console) — see `docs/runbooks/roles.md`
- Google Cloud OAuth client (Web) with authorized redirect URI:
  `https://auth.easycasaita.com/realms/easycasa/broker/google/endpoint`
- Apple Services ID with return URL:
  `https://auth.easycasaita.com/realms/easycasa/broker/apple/endpoint`
- Apple is **required** on iOS if any social login is offered

## Google

1. Realm → Identity providers → Add → Google
2. Client ID / secret from Google Cloud Console
3. Default scopes: `openid profile email`
4. **Account linking**: First login flow → detect existing Keycloak user by
   verified email and link (avoid forked identities when the same person later
   uses email/password or Apple)

## Apple

1. Realm → Identity providers → Add → Apple
2. Services ID, Team ID, Key ID, private key (.p8)
3. Same email-linking policy as Google

## Clients already PKCE-ready

| Client | App |
|---|---|
| `easycasa-web` | Next.js |
| `easycasa-app` / `easycasa-mobile` | Expo |
| `easycasa-admin` | Ops SPA |

Social buttons appear on the Keycloak hosted login theme once IdPs are enabled —
no custom `/login` page required.

## Verify

1. Incognito → listing enquiry → Sign in → Continue with Google → land back on listing
2. Repeat with Apple on iOS
3. Sign in with Google, then Apple on the **same email** → one user (linked), not two

## Production checklist

- [ ] `ALLOW_PROVIDER_STUBS=false` and `EC_TEST_AUTH=false` on VPS API
- [ ] `OIDC_*` set; Traefik still strips `X-Dev-*` at the edge
- [ ] WhatsApp authentication template submitted (parallel track for phone verify)
