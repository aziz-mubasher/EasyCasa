# EC-PRICING-FINAL — repo facts (§2)

Confirmed before the catalog was changed. Do not design the next brief as if the page reads Postgres.

1. `GET /service-catalog` **does** feed `/[locale]/pricing`. The rows come from the TypeScript constant `CATALOG` in `apps/api/src/service-catalog/domain/catalog.ts`, **not** from `service_catalog_items`.
2. The DB table has `active`. Quotes, orders and checkout call `buildQuote()` on that TS catalog. Hiding a card while leaving `active: true` in `catalog.ts` leaves the SKU purchasable.
3. `migration/sql/0016_phase24.sql` did seed `legal_basis = 'mediazione'` on `VIEWING_ACCOMPANIMENT`, `BUYER_MEDIATION`, `OFFER_DRAFTING`. This PR sets those rows (and the 0016 INSERT for fresh installs) to `review_required`.
4. Bundles lived in `PACKAGES` in the same file (`FAI_DA_TE`, `ASSISTITO`, `CHIAVI_IN_MANO`, `AFFITTO_SERENO`). They are kept, `active: false`. New bundles are `READY_TO_LIST`, `READY_TO_SELL`, `RENTING_MADE_SIMPLE`.

`LicenceState` / `PERIMETER` still do not exist. `CORPORATE_STATE = 'PONTE'` in `@easycasa/shared` is the joint switch until EC-AYNI-1 lands.
