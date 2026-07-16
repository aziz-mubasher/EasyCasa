# Security & GDPR Pre-Launch Checklist (Phase 6)

Owner: _____   Target launch: _____   Pentest vendor: _____

Sign-off requires every **must** item checked or an accepted, documented risk.

## 1. Edge & transport
- [ ] TLS 1.2+ only; HSTS enabled (2y, `includeSubDomains`; add `preload` after soak). *(must)*
- [ ] Security headers present on all responses (CSP, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy). Verify with securityheaders.com. *(must)*
- [ ] CSP starts in `report-only`, then enforcing after a clean week. `/csp-report` sink live.
- [ ] Cloudflare (or Caddy) WAF + DDoS protection in front; origin firewall restricts to CF IP ranges. *(must)*
- [ ] Rate limiting active: baseline per-IP + stricter `/auth/*` and `/ai/*` zones. *(must)*
- [ ] Server version headers stripped.

## 2. AuthN / AuthZ
- [ ] OIDC (Keycloak/Auth0) enforced; passwords never handled by app. *(must)*
- [ ] MFA required for admin and partner roles. *(must)*
- [ ] Every mutating endpoint checks role + resource ownership (IDOR sweep on listings, messages, leads, payouts). *(must)*
- [ ] Sessions: short-lived access tokens + rotating refresh; logout revokes.
- [ ] Brute-force / credential-stuffing protection on login (rate limit + lockout/backoff).

## 3. Input & data handling
- [ ] All queries parameterized (ORM/prepared) — no string-built SQL. *(must)*
- [ ] File uploads validated (type, size, magic bytes); images re-encoded; stored in MinIO, never executed. *(must)*
- [ ] Output encoding / React escaping verified; no `dangerouslySetInnerHTML` with user data.
- [ ] AI endpoints: prompt-injection guardrails; assistant grounded, cannot invent listings/prices; per-user rate + token budget caps. *(must)*
- [ ] Webhooks (Stripe) verified by signature against the raw body. *(must)*

## 4. Secrets & supply chain
- [ ] No secrets in repo — gitleaks + `scripts/secrets-audit.sh` clean. *(must)*
- [ ] Secrets from env/secret store only; rotated set for production.
- [ ] `pnpm audit` and `pip-audit` clean at high/critical. *(must)*
- [ ] Trivy container scan clean at HIGH/CRITICAL (unfixed triaged). *(must)*
- [ ] Base images pinned by digest; images run as non-root.

## 5. GDPR / privacy (EU)
- [ ] Data residency: all PII stored in the EU region. *(must)*
- [ ] Consent banner (analytics/marketing opt-in, essential-only default); choices logged.
- [ ] Data-subject rights implemented: export + delete (right to erasure) endpoints/runbook. *(must)*
- [ ] Privacy policy, cookie policy, ToS published; DPAs signed with processors (Stripe, hosting, email/push, maps). *(must)*
- [ ] Records of Processing (Art. 30) drafted; retention periods defined; PII minimized in logs.
- [ ] Breach-notification runbook (72h) exists — `docs/runbooks/incident.md`.

## 6. Verification
- [ ] External pentest commissioned; criticals/highs fixed and retested before go-live. *(must)*
- [ ] OWASP Top 10 walkthrough documented with evidence.
- [ ] `docs/runbooks/incident.md` reviewed; on-call rota set.
