import type { CatalogItem, ServicePackage } from './types';

const eur = (n: number): number => Math.round(n * 100);

/**
 * Seed catalog. Prices are indicative placeholders for the design — the admin
 * back office is the source of truth in production (regional pricing, edits).
 */
export const CATALOG: readonly CatalogItem[] = [
  {
    code: 'LISTING_PUBLICATION',
    labelEn: 'Listing publication',
    labelIt: 'Pubblicazione annuncio',
    category: 'listing',
    priceModel: 'fixed',
    amountCents: eur(0),
    ivaApplicable: true,
  },
  {
    code: 'VALUATION',
    labelEn: 'Valuation (AVM + agent review)',
    labelIt: 'Valutazione (AVM + revisione agente)',
    category: 'valuation',
    priceModel: 'fixed',
    amountCents: eur(99),
    ivaApplicable: true,
  },
  {
    code: 'DOC_CHECKUP',
    labelEn: 'Document check-up (fascicolo)',
    labelIt: 'Check-up documentale (fascicolo)',
    category: 'documents',
    priceModel: 'fixed',
    amountCents: eur(149),
    ivaApplicable: true,
  },
  {
    code: 'CATASTO_RETRIEVAL',
    labelEn: 'Cadastral retrieval (visura + planimetria)',
    labelIt: 'Recupero catastale (visura + planimetria)',
    category: 'documents',
    priceModel: 'passthrough',
    amountCents: eur(35),
    ivaApplicable: false,
  },
  {
    code: 'CONFORMITY_SURVEY',
    labelEn: 'Conformity survey (RTI, tecnico)',
    labelIt: 'Verifica conformità (RTI, tecnico)',
    category: 'documents',
    priceModel: 'fixed',
    amountCents: eur(390),
    ivaApplicable: true,
  },
  {
    code: 'APE_ISSUANCE',
    labelEn: 'APE issuance (certified tecnico)',
    labelIt: 'Rilascio APE (tecnico certificato)',
    category: 'documents',
    priceModel: 'fixed',
    amountCents: eur(120),
    ivaApplicable: true,
  },
  {
    code: 'MEDIA_PACK',
    labelEn: 'Professional photos + floor plan',
    labelIt: 'Foto professionali + planimetria',
    category: 'media',
    priceModel: 'fixed',
    amountCents: eur(160),
    ivaApplicable: true,
  },
  {
    code: 'VIRTUAL_TOUR',
    labelEn: 'Virtual tour',
    labelIt: 'Tour virtuale',
    category: 'media',
    priceModel: 'fixed',
    amountCents: eur(90),
    ivaApplicable: true,
  },
  {
    code: 'FULL_MEDIATION',
    labelEn: 'Full mediation (offer → close)',
    labelIt: 'Mediazione completa (proposta → rogito)',
    category: 'mediation',
    priceModel: 'provvigione',
    ratePercent: 0.0249,
    ivaApplicable: true,
  },
  {
    code: 'ROGITO_COORDINATION',
    labelEn: 'Rogito coordination (with notaio)',
    labelIt: 'Coordinamento rogito (con notaio)',
    category: 'closing',
    priceModel: 'fixed',
    amountCents: eur(250),
    ivaApplicable: true,
  },
  {
    code: 'LEASE_DRAFTING',
    labelEn: 'Lease drafting (type-aware)',
    labelIt: 'Redazione contratto di locazione',
    category: 'rental',
    priceModel: 'fixed',
    amountCents: eur(120),
    ivaApplicable: true,
  },
  {
    code: 'RLI_REGISTRATION',
    labelEn: 'RLI registration + cedolare secca option',
    labelIt: 'Registrazione RLI + opzione cedolare secca',
    category: 'rental',
    priceModel: 'fixed',
    amountCents: eur(80),
    ivaApplicable: true,
  },
  {
    code: 'REGISTRATION_TAXES',
    labelEn: 'Registration & stamp taxes (pass-through)',
    labelIt: 'Imposta di registro e bollo (a costo)',
    category: 'rental',
    priceModel: 'passthrough',
    amountCents: eur(0),
    ivaApplicable: false,
  },
  {
    code: 'TENANT_SCREENING',
    labelEn: 'Tenant screening / KYC',
    labelIt: 'Screening inquilino / KYC',
    category: 'aml',
    priceModel: 'fixed',
    amountCents: eur(45),
    ivaApplicable: true,
  },
] as const;

export const PACKAGES: readonly ServicePackage[] = [
  {
    code: 'FAI_DA_TE',
    labelEn: 'Fai-da-te',
    labelIt: 'Fai-da-te',
    includes: ['LISTING_PUBLICATION', 'DOC_CHECKUP', 'VALUATION'],
    bundleFixedCents: eur(199),
  },
  {
    code: 'ASSISTITO',
    labelEn: 'Assistito',
    labelIt: 'Assistito',
    includes: ['LISTING_PUBLICATION', 'DOC_CHECKUP', 'VALUATION', 'MEDIA_PACK', 'FULL_MEDIATION'],
    bundleFixedCents: eur(349),
  },
  {
    code: 'CHIAVI_IN_MANO',
    labelEn: 'Chiavi in mano',
    labelIt: 'Chiavi in mano',
    includes: [
      'LISTING_PUBLICATION',
      'DOC_CHECKUP',
      'VALUATION',
      'CONFORMITY_SURVEY',
      'APE_ISSUANCE',
      'MEDIA_PACK',
      'VIRTUAL_TOUR',
      'FULL_MEDIATION',
      'ROGITO_COORDINATION',
    ],
    bundleFixedCents: eur(890),
  },
  {
    code: 'AFFITTO_SERENO',
    labelEn: 'Affitto Sereno',
    labelIt: 'Affitto Sereno',
    includes: ['LEASE_DRAFTING', 'RLI_REGISTRATION', 'REGISTRATION_TAXES', 'TENANT_SCREENING'],
    bundleFixedCents: eur(220),
  },
] as const;

const ITEM_BY_CODE = new Map(CATALOG.map((i) => [i.code, i]));
const PKG_BY_CODE = new Map(PACKAGES.map((p) => [p.code, p]));

export function catalogItem(code: string): CatalogItem | undefined {
  return ITEM_BY_CODE.get(code);
}

export function servicePackage(code: string): ServicePackage | undefined {
  return PKG_BY_CODE.get(code);
}
