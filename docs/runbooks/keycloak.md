# Keycloak estate — `auth.easycasaita.com` (EC-AUTH-1)

An undocumented identity provider is worse than an undocumented API: losing
this container logs everybody out. This file is the observed estate, not a
wish-list. **Do not assume `infra/docker-compose.keycloak.yml` is production.**
That file is the local laptop overlay.

---

## Step 0 answers (2026-09-03)

Four answers the brief asked for. Two sources are kept separate on purpose:
**declared in git** vs **observed live**. This agent had no SSH to
`banks4all-vps` / `/opt/easycasa-ita`, so `docker inspect` / `kc.sh --version`
were **not** run. A human on the VPS must fill the “observed on VPS” column
before the first theme recreate.

| Question | Declared in git | Observed this session | Observed on VPS (2026-09-03 deploy) |
|---|---|---|---|
| **Image tag** | `quay.io/keycloak/keycloak:26.0` in `infra/docker-compose.yml` | Login HTML after deploy uses `/login/easycasa/` (no PatternFly) | `docker inspect`: `quay.io/keycloak/keycloak:26.0` |
| **Exact version** (`kc.sh --version`) | Tag `26.0` (floating minor) | Not in HTTP headers | **Keycloak 26.0.8** / JVM 21.0.6 |
| **Compose project / service** | Project **`easycasa-ita`**. Service **`keycloak`**. Traefik overlay: `infra/docker-compose.traefik.yml` | Traefik headers match that overlay | Labels `easycasa-ita` / `keycloak`. Container `easycasa-ita-keycloak-1` |
| **Existing mounts** | Realm import + theme bind `./keycloak/themes/easycasa` → `/opt/keycloak/themes/easycasa:ro` | Live CSS is 10413 bytes, EasyCasa header, `.ec-legal` | Realm JSON + theme bind. In-container `head -1` matches repo |

**Verdict:** production Keycloak is the service in
`infra/docker-compose.yml` + `infra/docker-compose.traefik.yml`, **not**
`infra/docker-compose.keycloak.yml`. The local overlay remains
`start-dev` / `admin`/`admin` / host port 8080 and must never be pointed at
the VPS.

If VPS `docker inspect` disagrees with the table (extra env, extra mounts,
a different image tag, or “not compose”), **stop**. That drift is its own
estate item. Do not “fix” it inside a theme PR. A bare
`--force-recreate` is how live features disappear on this host.

### Commands to run on the VPS (paste results back into this table)

```bash
docker ps --format '{{.Names}}\t{{.Image}}\t{{.Ports}}' | grep -i -E 'keycloak|auth'

# substitute the container name from the line above
CID=$(docker ps --format '{{.Names}}' | grep -i keycloak | head -1)

docker inspect "$CID" --format '{{json .Config.Env}}' | tr ',' '\n' | grep -i -E 'KC_|KEYCLOAK_'
docker inspect "$CID" --format '{{json .Mounts}}'
docker exec "$CID" /opt/keycloak/bin/kc.sh --version
docker inspect "$CID" --format '{{index .Config.Labels "com.docker.compose.project"}}/{{index .Config.Labels "com.docker.compose.service"}}'
```

### Live HTTP (this agent, 2026-09-03)

| Probe | Result |
|---|---|
| `GET https://auth.easycasaita.com/` | `302` → `/admin/` |
| Issuer | `https://auth.easycasaita.com/realms/easycasa` (`.well-known/openid-configuration`) |
| Login theme in use | **`easycasa`** after 2026-09-03 deploy. Title `Accedi a easycasa`. `<html class="ec-html" lang="it">`. Mundida `ec-legal` footer |
| `ui_locales` | `it` default (`content-language: it`). `en` → `Sign in to easycasa`. `es` → `Accede a easycasa`. Locale switcher present |
| Registration | On |
| Forgot password | On |
| Remember me | **On** (`Ricordami`) |
| Social IdPs | None rendered |
| Third-party hosts on login HTML | **None.** CSS/JS same-origin `/login/easycasa/`. Legal links to `easycasaita.com` |
| SMTP / verify-email | Live realm already has **`verifyEmail: true`**. Confirm Realm → Email SMTP before assuming verification works |

Theme target is Keycloak **24–26**. Declared tag is `26.0`. If `kc.sh --version`
reports **older than 24**, delete `infra/keycloak/themes/easycasa/login/register.ftl`
from the deployed theme (it imports `user-profile-commons.ftl` /
`register-commons.ftl`, which older servers do not have). Everything else still
works: the design lives in `template.ftl` + the `kc*Class` map.

### Post-recreate probe (2026-09-03, after `easycasa-ita-keycloak-1 Recreated`)

OIDC stayed up. The container is new. **The EasyCasa theme is not loaded.**

| Probe | Result |
|---|---|
| Issuer | Still `https://auth.easycasaita.com/realms/easycasa` |
| Login HTML | Stock `keycloak.v2` + PatternFly 5. No `ec-legal`, no Mundida footer, no `lang` |
| Cookie node | `AUTH_SESSION_ID=….e22507eb8573-4914` (was `.c3030e79bf51-47244`) — recreate is real |
| `GET /resources/76c9j/login/easycasa/css/login.css` | `200` **10845** bytes, starts `/* Patternfly CSS places…` — **stock**, not ours |
| Repo `login.css` | **10413** bytes, starts `/* EasyCasa login theme — system fonts only.` |
| `GET /resources/76c9j/login/does-not-exist/css/login.css` | Also `200` **10845** bytes, same stock file |

**Do not treat `200` on `/login/easycasa/css/login.css` as proof the theme is mounted.**
Keycloak 26 serves the parent/default CSS under any unknown theme name. A
nonsense path (`does-not-exist`) returning the same bytes is the control.

Pass when **all** of these are true:

1. Live CSS starts with `EasyCasa login theme` and contains `.ec-legal`.
2. `does-not-exist` CSS is still the stock PatternFly file (or 404) — different from (1).
3. Login HTML uses `/login/easycasa/` resources, has `ec-legal` / Mundida, and
   (once i18n is on) a `lang` on `<html>`.

Until (1) is true, **do not select the realm Login theme**. Selecting `easycasa`
while the directory is empty or missing falls through to stock look and is easy
to misread as “theme is live”.

Most likely cause of this recreate: compose ran **before** the theme tree was
on disk at `infra/keycloak/themes/easycasa`, or the VPS still has the old
compose without the theme bind. Docker will create an empty host directory for
a missing bind source. Confirm on the VPS:

```bash
# files must exist *next to* infra/docker-compose.yml
head -1 /opt/easycasa-ita/infra/keycloak/themes/easycasa/login/resources/css/login.css
# expect: /* EasyCasa login theme — system fonts only. No CDN, no webfont host. */

CID=$(docker ps --format '{{.Names}}' | grep -i keycloak | head -1)
docker inspect "$CID" --format '{{json .Mounts}}'
# must include Destination /opt/keycloak/themes/easycasa

docker exec "$CID" head -1 /opt/keycloak/themes/easycasa/login/resources/css/login.css
# same EasyCasa first line. If this fails, the bind is empty or absent.
```

If the host file is missing, copy the tree (tarball in “Deploy path” below),
then restart Keycloak (theme cache is on in production). If `docker inspect`
has no theme mount, the VPS compose is stale — copy `infra/docker-compose.yml`
from `main` @ `b6028ce` or later, then recreate with `--no-build --no-deps`
again. Then Realm → Themes → Login / Email `easycasa`.

### Deployed (2026-09-03)

Theme is live on `auth.easycasaita.com`. Do **not** `git pull` on the VPS to
refresh it: `/opt/easycasa-ita` is a dirty checkout of
`cursor/legenda-subdomain-go-live-ff78` with unrelated local edits. Deploy was
tarball + a surgical compose patch (theme bind + `KC_SPI_THEME_WELCOME_THEME`)
+ `up -d --no-build --no-deps --force-recreate keycloak`. Compose backup:
`infra/docker-compose.yml.bak-ec-auth-1-*`.

Empty `import=` in `login/theme.properties` crashes KC 26.0.8
(`DefaultThemeManager.processImportedTheme` AIOOBE → HTTP 500 on the CSS).
That line must stay absent.

Still human: export live user-profile before importing
`user-profile.easycasa.json`; enable `terms_and_conditions`; confirm SMTP
(`verifyEmail` is already true); 36 null-email users; cookie page.

---

## What runs where

| File | Role |
|---|---|
| `infra/docker-compose.yml` service `keycloak` | **Production** definition. `start --import-realm`. Image `quay.io/keycloak/keycloak:26.0` |
| `infra/docker-compose.traefik.yml` service `keycloak` | Traefik labels: `Host(\`auth.${STAGING_DOMAIN}\`)`, middleware `easycasa-headers` only — **not** `easycasa-strip-dev-auth` |
| `infra/docker-compose.keycloak.yml` | **Local only.** `start-dev --import-realm`, port 8080, bootstrap admin. Does not replace Traefik/Caddy |
| `infra/keycloak/realm-easycasa.json` | Realm **template** for first boot / local import. **Do not re-import over live users** |
| `infra/keycloak/themes/easycasa/` | Login + email theme source (this task). Mount read-only; do not bake into an image |
| `infra/keycloak/user-profile.easycasa.json` | Registration form. Import via Admin → User profile → JSON, or `kcadm` |
| `infra/postgres/init/02-keycloak-db.sql` | Creates the `keycloak` database on first Postgres boot |

`--import-realm` only imports when the realm does **not** exist. It does not
overwrite a live `easycasa` realm. Admin Console import-with-overwrite **does**.
Never do that on production.

---

## Theme install

Source of truth: `infra/keycloak/themes/easycasa/` (login + email).

Mount (already in `infra/docker-compose.yml` and the local overlay):

```yaml
    volumes:
      - ./keycloak/themes/easycasa:/opt/keycloak/themes/easycasa:ro
    environment:
      KC_SPI_THEME_WELCOME_THEME: easycasa
```

Then **Realm settings → Themes**: Login `easycasa`, Email `easycasa`.
Account and Admin stay stock — out of scope.

`KC_SPI_THEME_CACHE_THEMES=false` and `KC_SPI_THEME_STATIC_MAX_AGE=-1` are
**development only**. Never on the VPS. Production cache-on is a feature: an
edit to a `.ftl` cannot silently change the login page between two loads.
A theme change needs a container restart to appear.

### Deploy path (VPS cannot `git fetch` reliably)

Same rule as EC-TRIAL-3/4. From a machine that has the merged tree:

```bash
# 1. Pack only the theme + profile (no .git)
tar -C /path/to/EasyCasa -czf /tmp/easycasa-kc-theme.tgz \
  infra/keycloak/themes/easycasa \
  infra/keycloak/user-profile.easycasa.json \
  infra/docker-compose.yml \
  infra/docker-compose.traefik.yml \
  infra/docker-compose.keycloak.yml

scp /tmp/easycasa-kc-theme.tgz root@<vps>:/tmp/

# 2. On the VPS
cd /opt/easycasa-ita
tar -xzf /tmp/easycasa-kc-theme.tgz
# confirm the files landed; do not git pull if fetch is broken
```

### Recreate — read this twice

1. `docker inspect` the running Keycloak container (env + mounts). If it has
   hand-made config that is not in git, **stop and report**. Do not recreate.
2. Recreate **only** that service, with the compose files and image tag
   recorded above, **`--no-build --no-deps`**:

```bash
cd /opt/easycasa-ita
# Project name is easycasa-ita (see compose `name:`).
docker compose \
  -f infra/docker-compose.yml \
  -f infra/docker-compose.traefik.yml \
  --env-file .env \
  up -d --no-build --no-deps --force-recreate keycloak
```

A bare `--force-recreate` without the compose file / image tag / `--no-deps`
is how sibling services get rebuilt from a stale context and live features
vanish.

3. Realm → Themes → Login `easycasa` / Email `easycasa` (takes effect
   immediately for the *selection*; the new files need the restart in step 2
   because theme cache is on).

### Rollback

Realm settings → Themes → Login theme back to `keycloak` (or `keycloak.v2`,
which is what production is serving today). Save. Immediate, no restart, no
data touched.

The User Profile import is the one non-additive step. **Export the live
profile JSON before importing** `user-profile.easycasa.json` and keep that
export in the PR or next to the import file.

---

## Realm configuration (human, Admin console / `kcadm`)

Do **not** turn these on by re-importing `realm-easycasa.json` over live users.
The repo JSON is updated for **local first-boot** only. Production is additive.

| Area | Setting | Why |
|---|---|---|
| Localization | Internationalization **on**; supported `it`, `en`, `es`; default **`it`** | Without this the language switcher does not render (`template.ftl` guards on `realm.internationalizationEnabled`) and the email theme cannot pick a locale. Live is English-only today |
| Themes | Login `easycasa`, Email `easycasa` | Account / Admin unchanged |
| User profile | Import `infra/keycloak/user-profile.easycasa.json` | This file **is** the registration form. Future fields go here, never into `register.ftl` |
| Required actions | Enable `terms_and_conditions` (default for new users). Enable `VERIFY_EMAIL` as default for **new users only**, and **only once SMTP exists**. Leave `VERIFY_PROFILE` **disabled** | `VERIFY_EMAIL` with no SMTP is a dead-end screen. `VERIFY_PROFILE` + required email would lock out the ~36 users with a null e-mail |
| Login tab | Registration **on**, Forgot password **on**, Remember me **on**, Login with email **on**, Email as username **off**, Duplicate emails **off** | Email-as-username or required-email-on-existing-accounts locks out roughly half the user base. New registrations still require e-mail via the profile JSON |
| Security defenses | Brute force **on**, **temporary** lockout, exponential back-off. Not permanent | Permanent lockout + a known address = DoS against one named user |
| Events | Login events **on**, set an expiration, **turn off “include representation”** on admin events | Login events store IPs. Forever is not a security posture; it is an undeclared processing |

`realm-easycasa.json` now carries the local-first-boot equivalents of the
rows above (`verifyEmail: false`, `VERIFY_PROFILE` disabled,
`registrationEmailAsUsername: false`). Applying them on production is still
a console/`kcadm` job.

---

## SMTP (blocked — highest-value human unblock)

Realm SMTP is **not** configured in anything this repo can see, and the
login form cannot prove it either way. Until a server is set on the realm:

- Forgotten-password is a dead end with a nice typeface.
- `VERIFY_EMAIL` must stay off. The first-file-free grant
  (`aste_trial_grants`) is keyed to a verified address and will not start
  until this is done.

API `SMTP_URL` (Brevo, `docs/runbooks/email-verification.md`) is a **different
mail stack**. It does not send Keycloak messages. Configure Realm → Email
separately (or point it at the same relay, with its own from-address).

---

## GDPR layer (what is in the theme)

| Requirement | Where |
|---|---|
| Art. 13 notice at collection | `ec-legal` footer in `template.ftl` (every screen); longer `ecArt13Short` on sign-up |
| Controller identity | `ecController` / `ecLegalFooter` message keys. **Must match the published informativa word for word.** See “Controller identity” below |
| Legal basis stated | `ecArt13Short`: art. 6(1)(b) performance of a contract — **not** consent |
| Mandatory acceptance, auditable | `terms_and_conditions` required action → per-user timestamp |
| Optional marketing, separate | `marketingEmailOptIn` in the User Profile, unticked, own help text. Never merge with terms |
| Withdrawal as easy as giving | Same attribute editable in the account console; unsubscribe link in every mail |
| Data minimisation | Email, first name, last name, optional marketing. Username is admin-managed (new users get the e-mail as username). No phone, no CF, no DoB |
| No third-party disclosure before auth | System-font stacks only. No CDN, no web-font host, no analytics |
| Cookie posture | Auth cookies are strictly necessary; `KEYCLOAK_LOCALE` is set by the user’s own click. **No banner** |
| Account-enumeration resistance | Generic `invalidUserMessage` and `emailSentMessage` in `it` / `en` / `es` |
| Policy version | `ecPolicyVersion=2026-09-v1` in `theme.properties`. Bump only in the same PR that changes the informativa. Changelog: `infra/keycloak/themes/easycasa/POLICY-CHANGELOG.md` |

Account-retention is **not** a number yet. Do not copy a value from the
Legenda document-retention work or from the trial-counter clocks.

---

## Controller identity (human confirmation required)

Published consumer copy on the site is **not internally consistent**, and
`.env.example` is still a placeholder.

| Source | Denomination | P.IVA | Sede |
|---|---|---|---|
| `CLAUDE.md` | Mundida S.r.l. | IT04531990986 | Brescia |
| Live footer / transparency `ident.line1` | Mundida S.r.l. / “EasyCasa Italia” | IT04531990986 | **TODO** on `/trasparenza` |
| Published informativa `privacyPolicy.s1` | MUNDIDA S.r.l. | (todo in the same section) | (todo) |
| Bunny DPA citation | Mundida | — | Piazza Roma 8, 25030 Torbole Casaglia, Italy |
| `.env.example` / API invoice defaults | Easy Casa Ita Srl | **IT00000000000** | — |

Theme strings use **Mundida S.r.l. · P.IVA IT04531990986 · Piazza Roma 8,
25030 Torbole Casaglia (BS)** so they have a complete Art. 13 identity, and
they say so in `POLICY-CHANGELOG.md`. **A human must confirm denomination,
P.IVA and registered office against a visura** and against the published
informativa before this theme goes live. If the informativa uses different
words, change the message keys — do not invent a third wording.

Linked pages the theme expects (must exist before go-live):

| Key | URL (Italian default) | Status 2026-09-03 |
|---|---|---|
| Informativa | `https://easycasaita.com/it/legal/privacy` | Exists (draft `1.0-draft`, sede TODO) |
| Terms | `https://easycasaita.com/it/legal/terms` | Exists |
| Cookie | `https://easycasaita.com/it/legal/privacy` (same page — **no dedicated cookie policy**) | Dedicated page **missing**. Auth pages do not need a banner; the link is there so the footer is not a dead end |

---

## Fonts (web vs auth)

`apps/web/app/[locale]/layout.tsx` resolves:

| Token | Family | `next/font` | Licence | Self-host on auth? |
|---|---|---|---|---|
| `--font-display` | **Bricolage Grotesque** | `next/font/google` | SIL OFL 1.1 | Yes — OFL permits it |
| `--font-body` | **Newsreader** | `next/font/google` | SIL OFL 1.1 | Yes |
| `--font-mono` | **IBM Plex Mono** | `next/font/google` | SIL OFL 1.1 | Yes |

The auth theme **does not** load these (no Google CDN, no third-party request
before consent). It ships system stacks (`ui-sans-serif` / `ui-serif` /
`ui-monospace`). The two surfaces will not match exactly until a human
decides to self-host the OFL files on `auth.easycasaita.com`.

---

## Existing users (do not touch)

36 of 79 users have a null e-mail (figure from the brief). This PR:

- does **not** set “e-mail as username”
- does **not** enable `VERIFY_PROFILE`
- does **not** enable `VERIFY_EMAIL` as a default action

New registrations require e-mail via the User Profile. Existing accounts
need a **separate, decided migration** — not a side effect of this theme.

---

## What this PR does not do

- No reCAPTCHA (Google = third-party + US transfer on a page with no consent).
- No social login buttons wired (none configured; each IdP is its own transfer).
- No account / admin theme.
- No change to existing users.
- No SPI writing `ecPolicyVersion` onto the user. Timestamp + dated changelog
  is enough until the notice changes twice.

---

## Related

- `docs/runbooks/oidc-cutover.md` — cutover, Traefik, “do not re-import live”
- `docs/runbooks/roles.md` — additive `kcadm` role sync; admin-console drift
- `docs/runbooks/keycloak-social-idp.md` — Google/Apple brokers (out of scope)
- `docs/runbooks/email-verification.md` — **API** SMTP, not realm SMTP
- `docs/deploy.md` — VPS compose recreate rules
