# Auth-page informativa changelog

`ecPolicyVersion` in `login/theme.properties` is the stamp. Bump it only in
the same change that edits the notice. Keycloak records a per-user
`terms_and_conditions` acceptance timestamp; this file is the dated ledger
that turns the timestamp into a version.

Do **not** copy a retention number from Legenda document-retention or from
the trial-counter clocks. The account-retention clock is a separate human
decision and is still unset.

| Version | In force | What changed |
|---|---|---|
| `2026-09-v1` | 2026-09-03 (theme ship) | First EasyCasa login/register notice. Art. 6(1)(b) for the account; optional marketing as a separate `marketingEmailOptIn` attribute. 18+ is inside the terms text, not a second checkbox. |

## Controller wording used in `2026-09-v1`

Theme keys `ecController` / `ecLegalFooter` currently say:

**Mundida S.r.l. · P.IVA IT04531990986 · Piazza Roma 8, 25030 Torbole Casaglia (BS)**

Sources: `CLAUDE.md` (denomination + P.IVA), Bunny DPA citation (sede).
The published informativa (`/it/legal/privacy`) still has sede / P.IVA as
TODO. **A visura must confirm this before go-live.** If the published
notice uses different words, change the message keys to match it — do not
leave a third wording on the login page.

## Linked documents

- Informativa: `https://easycasaita.com/{locale}/legal/privacy`
- Terms: `https://easycasaita.com/{locale}/legal/terms`
- Cookie: same URL as the informativa until a dedicated cookie page exists
