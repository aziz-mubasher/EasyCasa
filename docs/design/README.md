# Design references

## `EC_CRM_Admin_Prototype_v1.html`

Canonical K EC 4.1 CRM clickable mockup — **Claude’s attached binary**, committed as-is (UTF-8, no conversion).

## `EC_CRM_Admin_Prototype_v1.cursor-authored.html`

Cursor’s self-authored reference from the v1.0 round (kept for delta comparison per brief §16).

### Deltas (Claude authentic vs Cursor-authored)

| Aspect | Claude (`EC_CRM_Admin_Prototype_v1.html`) | Cursor-authored |
|---|---|---|
| Size | ~24 KB | ~8.6 KB |
| Shell theme | **Light parchment** main + ink sidebar | Dark back-office (`apps/admin` shell) |
| Locale / copy | Italian (`Contatti`, `Attività`, `Impostazioni`, `Nessuna attestazione`) | Mostly English labels |
| Nav labels | Dashboard, Contatti, Pipeline, Attività, Impostazioni | Dashboard, Contacts, Contact-360, Pipelines, Tasks, Settings |
| Contact-360 | Nested under Contatti (row click → `c360`); sample **Maria Bianchi** with seeker+owner+B4A | Separate nav entry; sample Mario Rossi |
| Cards / radius | Soft cards, `border-radius: 10px` on panels | Flatter dark panels matching live admin CSS |
| Brand tokens | Same ink / parchment / azure / ochre + Bricolage / Newsreader / Plex Mono | Same tokens, dark surfaces |

Admin SPA implementation remains on the **dark Vite `apps/admin` shell**; Claude’s HTML is the product design reference for CRM information architecture and ochre/mono semantics, not a mandate to restyle the whole portal to parchment.
