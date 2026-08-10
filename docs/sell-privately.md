# EC-S-T01 — Sell Privately (`vendi-da-privato`)

**Route:** `/{locale}/vendi-da-privato` · EN `/en/sell-privately` · ES `/es/vender-entre-particulares`  
**Placement:** Site footer, column “Per chi vende”.  
**Roadmap:** `docs/ec-s-roadmap.md` · **Audits:** `docs/audits/T01/REPORT.md`

## Promise ledger (T03)

`apps/web/src/config/sell-privately/promises.json` validated by `apps/web/src/lib/promiseLedger`  
(`validateLedger` also runs at Next config load — malformed / un-counseled `live` blocks fail the build).

| Field | Values |
|-------|--------|
| benefit/step `status` | `live` \| `coming` \| `hidden` |
| `blocks.savingsFigures` | `live` \| `fallback` \| `hidden` |
| `blocks.mediazioneCopy` | `live` \| `fallback` \| `hidden` |

**Interim (T02/T04):** both blocks must be `fallback` or `hidden` — never `live` until counsel (enforced in `validateLedger`).

## SEO (T33)

- Localized canonical + hreflang `it` / `en` / `es` / `x-default` via `sellPrivatelyLanguageAlternates()`
- Rewrites (not next-intl pathnames); legacy ES `/vender-como-particular` → 308 to `/vender-entre-particulares`
- Sitemap uses `sellPrivatelyPath(locale)`

## Acceptance (verification pack)

See `docs/audits/T01/REPORT.md`. Performance ≥90 mobile **PASS**. SEO category blocked by VPS `NEXT_PUBLIC_DEMO_MODE=true` (`noindex`) — ops gate, not assertion-weakened.
