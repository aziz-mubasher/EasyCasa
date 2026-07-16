# Cutover Runbook — WordPress → EasyCasa (SEO-safe, reversible)

**Live hostname today:** `easycasaita.com` (Traefik on the shared Hostinger VPS).
**Goal:** move the public domain from WordPress to the new platform without dropping
search rankings or losing a running business, with a rollback that works at every step.

> **Edge note (this VPS):** production traffic hits **Traefik**, not Caddy. Security
> headers + AI rate limits live in `infra/docker-compose.traefik.yml`. The Phase 6
> `infra/caddy/` stack (rate_limit plugin + `redirects.caddy` import) is for
> dedicated/local Caddy deploys (`--profile caddy`). For Traefik cutover, regenerate
> redirects (`pnpm --filter @easycasa/migration redirects`) and either (a) apply the
> CSV via Cloudflare/page rules, or (b) temporarily front the origin with the Caddy
> build for the 301 map. Keep WP frozen until 7–14 clean days.

**Roles:** Cutover lead ____ · DB/infra ____ · SEO ____ · Comms ____
**Window:** low-traffic (e.g. Tue 02:00–05:00 CET). **Freeze:** no unrelated deploys 24h before.

Legend: 🟢 reversible instantly · 🟡 reversible in minutes · 🔴 point of no easy return.

---

## T-7 days — Prepare

- [ ] Final content freeze on WordPress announced (editors stop publishing at T-24h).
- [ ] Fresh production data migration rehearsed end-to-end on staging (`etl → geocode → media → reconcile`); reconciliation report reviewed and signed off.
- [ ] **Redirect map regenerated** from the current WP permalinks:
      `pnpm --filter @easycasa/migration redirects` → `migration/out/redirects.caddy` + `.csv`.
- [ ] Redirect map spot-checked: top 100 URLs by traffic (from GSC/analytics) each map to a live new URL. **This is the #1 ranking risk — do not skip.**
- [ ] `caddy validate` passes against the plugin build (rate_limit + redirects imported).
- [ ] Security checklist (`docs/security-checklist.md`) fully signed off; pentest criticals/highs fixed.
- [ ] Load test green (`k6 run load/k6/search.js`), soak green (`load/k6/soak.js`).
- [ ] **Backup-restore drill passes** (`scripts/backup-restore-drill.sh`) — a verified-recoverable dump exists.
- [ ] Observability live: Prometheus targets up, Grafana overview populated, Alertmanager routes tested, Uptime Kuma monitors green.
- [ ] Rollback rehearsed on staging (see below). Everyone has read this doc.
- [ ] Google Search Console: new-structure sitemaps prepared; property verified for all hostnames.

## T-24h — Lower TTL & final sync

- [ ] 🟢 Lower DNS TTL for `easycasa.it` / `www` A/AAAA (and CNAMEs) to **300s**. Do this a full day ahead so the low TTL has propagated *before* the switch.
- [ ] Confirm WordPress is read-only / frozen. Take a final WP DB + uploads snapshot (rollback source of truth).
- [ ] Run the final ETL delta into production Postgres; re-run `reconcile`; review.
- [ ] Deploy the release to **production infra** but keep DNS pointing at WordPress (dark launch). Smoke-test via `/etc/hosts` override or the origin IP.

## T-0 — Switch

1. [ ] 🟢 Put WordPress in a lightweight maintenance/redirect mode as a safety net (optional): serve 302→ new host for anything the map misses. Keep WP reachable.
2. [ ] Copy the generated redirects into the edge: `migration/out/redirects.caddy → infra/caddy/redirects.caddy`; reload Caddy (`caddy reload`). Verify a few 301s with `curl -I`.
3. [ ] 🔴 **Flip DNS** A/AAAA (or CF proxied records) for `easycasa.it` + `www` to the new origin. `www → easycasa.it` 301 already configured.
4. [ ] Watch propagation: `dig +short easycasa.it @1.1.1.1` / `@8.8.8.8`. Because TTL=300s, most resolvers flip within ~5–10 min.

## T+0 → T+60m — Verify

- [ ] Homepage, search, a listing detail, add-home, login all load over HTTPS with valid cert.
- [ ] `curl -sI https://www.easycasa.it/` → 301 → `https://easycasa.it/`.
- [ ] 10 sampled old URLs → `curl -sI` returns **301** to the correct new URL (not 302, not 404).
- [ ] `https://easycasa.it/robots.txt` and `/sitemap.xml` resolve; sitemap lists listings.
- [ ] Security headers present (securityheaders.com or `curl -I`); HSTS visible.
- [ ] Rate limiting behaves (hammer `/auth/*` → 429). Stripe webhook test event delivered + 200.
- [ ] Grafana: request rate flowing, 5xx ratio ≈ 0, search p95 < 800ms. No firing criticals.
- [ ] Submit new sitemaps in GSC; use URL Inspection on 3–5 key pages → "URL is on Google" / request indexing.

## T+1 → T+14 days — Stabilise

- [ ] Raise DNS TTL back to 3600s once stable (T+24–48h).
- [ ] GSC daily: **Coverage** (spikes in 404/soft-404 = redirect gaps → patch `redirects.ts` and redeploy the map), **Crawl stats**, Core Web Vitals field data.
- [ ] Compare organic traffic vs. baseline; expect a brief dip then recovery. Investigate any sustained >15% drop against the redirect map.
- [ ] 🔴 **Retire WordPress** only after 7–14 clean days: keep the frozen WP snapshot archived offsite ≥90 days. If WP hosted editorial, transition to headless per `docs/schema.md`; otherwise decommission the instance and revoke its credentials/DNS.

---

## Rollback

Pick the lightest step that resolves the problem — you rarely need a full revert.

- **Redirect gaps / individual 404s (most common):** do **not** roll back. Add the mappings to `redirects.ts`, regenerate, copy to `infra/caddy/redirects.caddy`, `caddy reload`. Minutes, no DNS change.
- **App broken but DNS already flipped, WP still intact:** 🟡 revert DNS A/AAAA to the WordPress origin. TTL=300s → recovery in ~5–10 min. Because WP was frozen and never took new writes, no data reconciliation is needed. Announce, then debug the new stack out of the traffic path.
- **Data problem discovered post-cutover (writes landed on new DB):** stop writes, restore the new DB from the pre-cutover verified dump (`scripts/backup-restore-drill.sh` proves this works), replay/repair, then re-verify before re-exposing. Only revert DNS to WP if recovery will exceed the acceptable outage.

**Rollback triggers (any one):** checkout/payments failing, auth broken for all users, sustained 5xx >5% for >10 min with no quick fix, or data integrity in doubt.

**Comms:** post status at switch, at verified-green, and at any rollback. Keep `#oncall` updated; Alertmanager will page on criticals regardless.
