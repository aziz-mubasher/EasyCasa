# EC-S-T01 — Sell Privately (`vendi-da-privato`)

**Route:** `/{locale}/vendi-da-privato` · EN rewrite `/en/sell-privately` · ES rewrite `/es/vender-como-particular`  
**Placement:** Site footer, column “Per chi vende” — label **Vendi da privato** / **Sell privately**.  
**Stack:** Next.js App Router static page; brand tokens from `easycasa-brand.css`.  
**Roadmap:** see `docs/ec-s-roadmap.md` (v2, 33 tasks).

## Honesty mechanic — promise ledger

Availability is **never hardcoded** in JSX. Every benefit tile and how-it-works step reads `status` from:

`apps/web/src/config/sell-privately/promises.json`

| Status  | UI |
|---------|----|
| `live`  | Shown as available |
| `coming`| Shown with subtle “In arrivo” / “Coming soon” chip — never as available |
| `hidden`| Not rendered |

### Counsel gates (T02 / T04 interim)

```json
"gates": {
  "savingsFigures": false,
  "mediazioneBoundaryCopy": false
}
```

| Gate | While `false` | Flip to `true` after |
|------|---------------|----------------------|
| `savingsFigures` | Neutral free-to-list copy only — **no €7,500–9,150, no slider, no AGCM footnote** | T02 counsel sign-off |
| `mediazioneBoundaryCopy` | “What EasyCasa is not” block omitted | T04 mediazione boundary doc |

**Do not** expose un-counseled € savings figures or portal-vs-mediatore wording on production.

## Phase 0 exit (ledger)

P1 / P4 / P5 / P8 → `live` · P2 / P3 / P6 / P7 → `coming`

## Page structure

1. Hero + dual CTA
2. Savings — gated (neutral vs figures)
3. How it works (5 steps, ledger-driven)
4. Benefits grid (P1–P8, ledger-driven)
5. “What EasyCasa is not” — gated by `mediazioneBoundaryCopy`
6. FAQ
7. Final CTA + page legal footer (privacy `1.0-draft`)

## SEO (T33)

- Title (IT): `Vendere casa da privato senza agenzia | EasyCasa`
- `FAQPage` + `Service` JSON-LD (live ledger items only in Service props)
- Localized canonical + hreflang via `sellPrivatelyLanguageAlternates()` (rewrites, not next-intl pathnames)
- Sitemap uses `sellPrivatelyPath(locale)` per locale

## Acceptance

- [x] IT + EN + ES render; ledger drives availability
- [x] T02 interim: no public € savings figures while gate false
- [x] Footer link present
- [x] Localized canonical / hreflang / sitemap paths
- [ ] Lighthouse ≥ 90 mobile (verify on VPS)
- [ ] Flip `savingsFigures` / `mediazioneBoundaryCopy` only after counsel
