# EC-AUTH-1 — Keycloak sign-in / sign-up theme (completion)

**Date:** 2026-09-03  
**PR:** https://github.com/aziz-mubasher/EasyCasa/pull/189  
**Merged:** `b6028ce` (2026-09-03)  
**Kaizen:** `K EC AUTH-1` (Claude has not assigned a real `K EC x.y`)  
**Polish:** EC-AUTH-1  
**Branch:** `cursor/ec-auth-1-keycloak-theme-e167`

## Live outcome

| Item | Result |
|---|---|
| Theme in git | `infra/keycloak/themes/easycasa/` (login + email + welcome) |
| User profile JSON | `infra/keycloak/user-profile.easycasa.json` |
| Step 0 runbook | `docs/runbooks/keycloak.md` (first commit, before any theme file) |
| Local checks | `pnpm lint` 0 errors · `pnpm typecheck` pass · `pnpm test` pass (`apps/api` 162 / 838) |
| CI on #189 | Red jobs are **pre-existing on `main`** (pa11y sandbox, Testcontainers Postgres image, gitleaks on `.env.demo.example`, `pypdf` pin, `process.env` allowlist). None from the theme. Required checks: none blocking |
| VPS theme live | **Not flipped.** No SSH / no self-hosted worker from this agent. Realm still serves stock `keycloak.v2` |
| Realm SMTP | Still unset from repo visibility — forgot-password / VERIFY_EMAIL stay decorative |

## R&D FEEDBACK — for Claude

### 1. BRIEF ADHERENCE
- Step 0 first: estate runbook before `themes/easycasa/**`.
- Theme mounted read-only, not baked into an image.
- Login + email theme, `it` / `en` / `es`, Art. 13 footer on every screen, longer `ecArt13Short` on sign-up, basis art. 6(1)(b) not consent.
- User profile is the registration form. Marketing consent is a separate optional attribute (`yes` when ticked). Terms 18+ is in the terms text, not a second checkbox.
- No reCAPTCHA, no social buttons, no account/admin theme, no e-mail-as-username, `VERIFY_EMAIL` not default, `VERIFY_PROFILE` off.

Deviations:
- Could not run the four VPS `docker` commands. Runbook keeps declared-in-git vs live-HTTP vs human-on-VPS.
- Cookie footer link → `/legal/privacy` (no `/legal/cookie` page exists).
- Controller sede uses the Bunny DPA address (Piazza Roma 8, Torbole Casaglia). Published informativa still has sede as TODO.
- Theme cache disable is on the **local** overlay only.
- Did not select the theme on the live realm and did not recreate the Keycloak container (no VPS shell; inspect-before-recreate still stands).

### 2. WHERE THE BRIEF FAILED YOU
- Ambiguous: “four fields” vs Keycloak username. Guess: username admin-edit only, so new users get the e-mail as username *without* the realm “e-mail as username” flag.
- Ambiguous: controller wording. `CLAUDE.md`, live footer, informativa TODO, Bunny DPA, and `.env.example` (`IT00000000000`) disagree. Wording is in `POLICY-CHANGELOG.md`.
- Missing: live user-profile JSON to keep in the PR as the rollback export.
- Missing: a real Kaizen code. Ledger uses `K EC AUTH-1`.
- Over-specified: `KC_SPI_THEME_WELCOME_THEME`. Added a one-screen welcome so the SPI has a target.
- Wrong: the local overlay’s first line already says production is `docker-compose.yml` + Traefik. The dangerous assumption is still real; the running box is already that service. Live theme is `keycloak.v2` (PF5), not classic `keycloak`.
- Wrong/stale: API `SMTP_URL` is a different mail stack from realm SMTP.

### 3. REPO REALITY CHECK
- pnpm monorepo, NestJS API, Next.js web. Vitest. Existing Keycloak tests live in `apps/api/src/auth/realm.spec.ts`; theme tests sit next to them.
- Production Keycloak: compose project `easycasa-ita`, service `keycloak`, image `quay.io/keycloak/keycloak:26.0`, Traefik `auth.${STAGING_DOMAIN}`. One bind today: realm JSON. No theme mount until this PR’s compose lands **and** the container is recreated.
- Live HTTP 2026-09-03: issuer `https://auth.easycasaita.com/realms/easycasa`, stock keycloak.v2, i18n off (or en-only), registration on, reset on, remember-me off, no social IdPs, no third-party hosts.
- `realm-easycasa.json` is first-boot only. Re-import over live users drops people.
- VPS often cannot `git fetch`. Deploy path is tar + scp. A bare `--force-recreate` without `--no-deps` / recorded image is how live features disappear.
- `apps/web` fonts: Bricolage Grotesque / Newsreader / IBM Plex Mono via `next/font/google`. All SIL OFL 1.1 — self-host on the auth host is allowed. Theme ships system stacks (no Google request before consent).
- `.env.example` `EASYCASA_PIVA=IT00000000000` is the e-invoicing placeholder, not the published controller.

### 4. EFFORT SIGNAL
Larger than “drop in the theme files”: estate discovery, three locale bundles, email theme, user-profile JSON, compose + realm-template guards, tests. Correct as one task if SMTP / inspect / theme-select stay human. Split if the next brief is “make forgot-password actually send”.

### 5. BLOCKED / NEEDS A HUMAN
- **Realm SMTP** — single highest-value unblock. VERIFY_EMAIL and `aste_trial_grants` wait on it.
- VPS `docker inspect` + `kc.sh --version` into the runbook table **before** any Keycloak recreate.
- Export live user profile, then import `user-profile.easycasa.json`.
- Realm settings: i18n `it`/`en`/`es` default `it`; Login/Email theme `easycasa`; remember-me on; temporary brute-force; `terms_and_conditions` on; `VERIFY_PROFILE` off.
- Recreate Keycloak only with the recorded compose files + image tag, `--no-build --no-deps`.
- Visura vs published informativa. Dedicated cookie page. 36 null-e-mail accounts. Account-retention number. Admin-console credential drift (`docs/runbooks/roles.md`).
- This cloud agent: no SSH, no self-hosted worker, staging `workflow_dispatch` deploy is a full `deploy.sh` (wrong tool for a theme mount).

### 6. NEXT TASK SHOULD ACCOUNT FOR
- Write briefs against `docs/runbooks/keycloak.md`, not the local overlay.
- Do not enable `VERIFY_PROFILE` or e-mail-as-username until the null-e-mail migration is a written decision.
- Future fields go in `user-profile.easycasa.json`, never `register.ftl`.
- Bump `ecPolicyVersion` + `POLICY-CHANGELOG.md` in the same PR as any informativa change.
- Matching `apps/web` typography is “self-host three OFL files on the auth host”, not `fonts.google.com`.
- Do not point `infra/deploy.sh` / `FORCE_REBUILD=1` at this change — that recreates the whole stack.
