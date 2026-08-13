# EC-S-T01 — Sell Privately (`vendi-da-privato`)

**Route:** `/{locale}/vendi-da-privato` · EN `/en/sell-privately` · ES `/es/vender-entre-particulares`  
**Placement:** Site footer, column “Per chi vende”.  
**Roadmap:** `docs/ec-s-roadmap.md` · **Audits:** `docs/audits/T01/REPORT.md`

## Promise ledger (T03)

`apps/web/src/config/sell-privately/promises.json` (+ `promises.schema.json`)  
validated by `apps/web/src/lib/promiseLedger`  
(`validateLedger` also runs at Next config load — malformed / un-counseled `live` blocks fail the build).

| Field | Values |
|-------|--------|
| `promises.P*.state` | `live` \| `coming` \| `hidden` |
| `promises.P*.tasks` | roadmap task ids (e.g. `T01`, `EC-1`) |
| `blocks.*.state` | `live` \| `fallback` \| `hidden` |
| `blocks.*.gate` | counsel task (`T02` / `T04`) |

How-it-works step chips are **derived** in `getSellPrivatelySteps()` (list→coming; price→P2; verify→P3; buyers→P4; viewings→P5) — not separate ledger rows.

**Interim (T02/T04):** cleared 2026-08-13 — both counsel blocks are `live` (see Claim 1–2 flip + `mediation-disclosure.md` portal reconcile).

## SEO (T33)

- Localized canonical + hreflang `it` / `en` / `es` / `x-default` via `sellPrivatelyLanguageAlternates()`
- Rewrites (not next-intl pathnames); legacy ES `/vender-como-particular` → 308 to `/vender-entre-particulares`
- Sitemap uses `sellPrivatelyPath(locale)`

## Acceptance (verification pack)

See `docs/audits/T01/REPORT.md`. Performance ≥90 mobile **PASS**. SEO category blocked by VPS `NEXT_PUBLIC_DEMO_MODE=true` (`noindex`) — ops gate, not assertion-weakened.
