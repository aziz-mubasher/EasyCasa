# Phase 7 — Universal App (iOS · Android · Web)

**Goal:** ship the authenticated EasyCasa product experience to iOS, Android, and web from
**one** Expo Router codebase, reusing the Nest API and design tokens. The Next.js site
(Phase 2–6) stays the public, server-rendered, SEO surface; this app is the logged-in
shell (native binaries + `expo export --platform web`).

**This VPS domain:** API at `https://easycasaita.com/api`. Deep links / well-known files
are served from the Next.js app on `easycasaita.com`. Cutover apex `easycasa.it` is also
declared in `app.json` associated domains for the future flip.

## Acceptance checklist
- [x] Workspace resolves `@easycasa/mobile`, `@easycasa/api-client`, `@easycasa/design-tokens`
- [x] `pnpm --filter @easycasa/api-client typecheck`
- [x] `POST/PUT/DELETE /me/favorites/:id` → `{ ok: true }` (idempotent); favorites list returns listing summaries
- [x] `POST /me/devices` upserts push tokens; alerts worker fans out Expo push
- [x] CORS allows `https://app.easycasaita.com` (+ public site + local Expo)
- [x] `/.well-known/apple-app-site-association` + `assetlinks.json` + `/listing/{slug}` redirect
- [ ] Keycloak public client `easycasa-app` (PKCE S256, redirect `easycasa://auth` + `https://app.easycasaita.com/*`) — ops
- [ ] Replace AASA `TEAMID` + Play SHA-256 fingerprint before store release
- [ ] `expo start` / EAS preview builds (needs Expo toolchain + credentials)

## Packages
| Path | Role |
|------|------|
| `packages/api-client` | Typed fetch client + zod (RN-free) |
| `packages/design-tokens` | Colors/radius aligned with web CSS vars |
| `apps/mobile` | Expo Router tabs: Search · Map · Saved · Profile |

## Local
```bash
pnpm install
pnpm --filter @easycasa/migration migrate   # 0007 devices
pnpm --filter @easycasa/api-client typecheck
pnpm --filter @easycasa/mobile typecheck
pnpm --filter @easycasa/mobile start        # Expo
pnpm --filter @easycasa/mobile export:web
```

## Keycloak (manual)
In realm `easycasa`, add public client `easycasa-app`: PKCE S256 required, standard flow on,
redirect URIs `easycasa://auth` and `https://app.easycasaita.com/*`, `offline_access` granted.
