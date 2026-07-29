# Privacy notice & My data

Template-driven legal pages under the normal site header and V2 footer (no custom masthead).

## Routes

| Page | Path | Component |
|------|------|-----------|
| Privacy notice | `/{locale}/legal/privacy` | `PrivacyPolicyView` |
| My data (DSAR) | `/{locale}/privacy` | `MyDataView` |
| Alias | `/{locale}/i-miei-dati` | redirects → `/privacy` |

Source HTML: `docs/page-privacy-template.html`, `docs/page-i-miei-dati.html`.

## Footer

Legal row links: Privacy → `/legal/privacy`, My data → `/privacy`.

## Behaviour

- Policy: static i18n content (`privacyPolicy` namespace); draft placeholders remain for counsel.
- My data: sign-in required for export/erase via `GET /me/privacy/export` and `POST /me/privacy/erase`. Consent toggles on this page are largely local UI (enquiry consents still go through Contatta).
