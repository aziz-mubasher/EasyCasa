-- EC-PRICING-FINAL — PONTE catalog.
-- Deactivate reserved / %-of-sale / person-screening SKUs. Do not delete:
-- they return if the corporate state changes. 0016 seeded three buyer-side
-- rows with a legal_basis other than review_required; this corrects live rows.

UPDATE service_catalog_items
SET legal_basis = 'review_required'
WHERE code IN ('VIEWING_ACCOMPANIMENT', 'BUYER_MEDIATION', 'OFFER_DRAFTING');

UPDATE service_catalog_items
SET active = false
WHERE code IN (
  'FULL_MEDIATION',
  'BUYER_MEDIATION',
  'OFFER_DRAFTING',
  'VIEWING_ACCOMPANIMENT',
  'APE_ISSUANCE',
  'TENANT_SCREENING',
  'ROGITO_COORDINATION'
);

UPDATE service_catalog_items
SET
  label_en = 'Delivery of the file to your notary',
  label_it = 'Consegna del fascicolo al tuo notaio'
WHERE code = 'ROGITO_COORDINATION';

UPDATE service_catalog_items
SET
  label_en = 'Valuation (published OMI range + comparables)',
  label_it = 'Valutazione (fascia OMI pubblicata + comparabili)'
WHERE code = 'VALUATION';

UPDATE service_catalog_items
SET
  label_en = 'Lease drafting (tenant already found)',
  label_it = 'Redazione contratto di locazione (conduttore già individuato)'
WHERE code = 'LEASE_DRAFTING';

INSERT INTO service_catalog_items (
  code, label_en, label_it, category, price_model, amount_cents, rate_percent,
  iva_applicable, active, legal_basis
) VALUES
  ('VIEWING_KIT', 'Viewing kit', 'Kit visite',
   'listing', 'fixed', 3900, NULL, true, true, 'review_required'),
  ('SELL_IT_YOURSELF_COURSE', 'Sell it yourself course', 'Corso «vendi da solo»',
   'training', 'fixed', 6900, NULL, true, true, 'review_required'),
  ('PROPOSAL_NOTE', 'How a purchase proposal works', 'Come funziona una proposta di acquisto',
   'documents', 'fixed', 0, NULL, true, true, 'review_required')
ON CONFLICT (code) DO UPDATE SET
  label_en = EXCLUDED.label_en,
  label_it = EXCLUDED.label_it,
  category = EXCLUDED.category,
  price_model = EXCLUDED.price_model,
  amount_cents = EXCLUDED.amount_cents,
  active = EXCLUDED.active,
  legal_basis = 'review_required';

UPDATE service_packages SET active = false
WHERE code IN ('FAI_DA_TE', 'ASSISTITO', 'CHIAVI_IN_MANO', 'AFFITTO_SERENO');

INSERT INTO service_packages (code, label_en, label_it, bundle_fixed_cents, active)
VALUES
  ('READY_TO_LIST', 'Ready to list', 'Pronto a pubblicare', 25900, true),
  ('READY_TO_SELL', 'Ready to sell', 'Pronto a vendere', 77900, true),
  ('RENTING_MADE_SIMPLE', 'Renting made simple', 'Affitto in regola', 18900, true)
ON CONFLICT (code) DO UPDATE SET
  label_en = EXCLUDED.label_en,
  label_it = EXCLUDED.label_it,
  bundle_fixed_cents = EXCLUDED.bundle_fixed_cents,
  active = EXCLUDED.active;

INSERT INTO package_items (package_code, item_code) VALUES
  ('READY_TO_LIST', 'VALUATION'),
  ('READY_TO_LIST', 'DOC_CHECKUP'),
  ('READY_TO_LIST', 'VIEWING_KIT'),
  ('READY_TO_SELL', 'VALUATION'),
  ('READY_TO_SELL', 'DOC_CHECKUP'),
  ('READY_TO_SELL', 'VIEWING_KIT'),
  ('READY_TO_SELL', 'MEDIA_PACK'),
  ('READY_TO_SELL', 'CONFORMITY_SURVEY'),
  ('RENTING_MADE_SIMPLE', 'LEASE_DRAFTING'),
  ('RENTING_MADE_SIMPLE', 'RLI_REGISTRATION')
ON CONFLICT DO NOTHING;
