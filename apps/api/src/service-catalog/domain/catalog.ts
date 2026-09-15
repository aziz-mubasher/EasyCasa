import { isPonte } from '@easycasa/shared';

import type { CatalogItem, ServicePackage } from './types';

const eur = (n: number): number => Math.round(n * 100);

/**
 * Seed catalog. Runtime source of truth for GET /service-catalog, quotes,
 * and orders. The `service_catalog_items` table is a legal-basis / admin
 * overlay — it does not drive prices. Do not hide a SKU on the page while
 * leaving `active: true` here.
 */
export const CATALOG: readonly CatalogItem[] = [
  {
    code: 'LISTING_PUBLICATION',
    labelEn: 'Listing publication',
    labelIt: 'Pubblicazione annuncio',
    labelEs: 'Publicación del anuncio',
    category: 'listing',
    priceModel: 'fixed',
    amountCents: eur(0),
    ivaApplicable: true,
    active: true,
  },
  {
    code: 'VALUATION',
    labelEn: 'Valuation (published OMI range + comparables)',
    labelIt: 'Valutazione (fascia OMI pubblicata + comparabili)',
    labelEs: 'Valoración (rango OMI publicado + comparables)',
    category: 'valuation',
    priceModel: 'fixed',
    amountCents: eur(99),
    ivaApplicable: true,
    active: true,
  },
  {
    code: 'DOC_CHECKUP',
    labelEn: 'Document check-up (fascicolo)',
    labelIt: 'Check-up documentale (fascicolo)',
    labelEs: 'Revisión documental (fascicolo)',
    category: 'documents',
    priceModel: 'fixed',
    amountCents: eur(149),
    ivaApplicable: true,
    active: true,
  },
  {
    code: 'CATASTO_RETRIEVAL',
    labelEn: 'Cadastral retrieval (visura + planimetria)',
    labelIt: 'Recupero catastale (visura + planimetria)',
    labelEs: 'Obtención catastral (visura + planimetría)',
    category: 'documents',
    priceModel: 'passthrough',
    amountCents: eur(35),
    ivaApplicable: false,
    active: true,
  },
  {
    code: 'CONFORMITY_SURVEY',
    labelEn: 'Conformity survey (RTI, sub-contract art. 1656)',
    labelIt: 'Verifica conformità (RTI, subappalto art. 1656)',
    labelEs: 'Verificación de conformidad (RTI, subcontrato art. 1656)',
    category: 'documents',
    priceModel: 'fixed',
    amountCents: eur(390),
    ivaApplicable: true,
    active: true,
  },
  {
    code: 'APE_ISSUANCE',
    labelEn: 'APE issuance (certified tecnico)',
    labelIt: 'Rilascio APE (tecnico certificato)',
    labelEs: 'Emisión del APE (técnico certificado)',
    category: 'documents',
    priceModel: 'fixed',
    amountCents: eur(120),
    ivaApplicable: true,
    active: false,
  },
  {
    code: 'MEDIA_PACK',
    labelEn: 'Professional photos + floor plan',
    labelIt: 'Foto professionali + planimetria',
    labelEs: 'Fotos profesionales + planimetría',
    category: 'media',
    priceModel: 'fixed',
    amountCents: eur(160),
    ivaApplicable: true,
    active: true,
  },
  {
    code: 'VIRTUAL_TOUR',
    labelEn: 'Virtual tour',
    labelIt: 'Tour virtuale',
    labelEs: 'Tour virtual',
    category: 'media',
    priceModel: 'fixed',
    amountCents: eur(90),
    ivaApplicable: true,
    active: true,
  },
  {
    code: 'FULL_MEDIATION',
    labelEn: 'Full mediation (offer → close)',
    labelIt: 'Mediazione completa (proposta → rogito)',
    labelEs: 'Mediación completa (oferta → escritura)',
    category: 'mediation',
    priceModel: 'provvigione',
    ratePercent: 0.0249,
    ivaApplicable: true,
    active: false,
  },
  {
    code: 'VIEWING_ACCOMPANIMENT',
    labelEn: 'Viewing accompaniment',
    labelIt: 'Accompagnamento visita',
    labelEs: 'Acompañamiento en visitas',
    category: 'mediation',
    priceModel: 'fixed',
    amountCents: eur(49),
    ivaApplicable: true,
    active: false,
  },
  {
    code: 'BUYER_MEDIATION',
    labelEn: 'Buyer-side mediation',
    labelIt: 'Mediazione lato acquirente',
    labelEs: 'Mediación del comprador',
    category: 'mediation',
    priceModel: 'provvigione',
    ratePercent: 0.0249,
    ivaApplicable: true,
    active: false,
  },
  {
    code: 'OFFER_DRAFTING',
    labelEn: 'Offer drafting',
    labelIt: 'Redazione proposta di acquisto',
    labelEs: 'Redacción de oferta de compra',
    category: 'mediation',
    priceModel: 'fixed',
    amountCents: eur(99),
    ivaApplicable: true,
    active: false,
  },
  {
    code: 'ROGITO_COORDINATION',
    labelEn: 'Delivery of the file to your notary',
    labelIt: 'Consegna del fascicolo al tuo notaio',
    labelEs: 'Entrega del expediente a tu notario',
    category: 'closing',
    priceModel: 'fixed',
    amountCents: eur(250),
    ivaApplicable: true,
    active: false,
  },
  {
    code: 'LEASE_DRAFTING',
    labelEn: 'Lease drafting (tenant already found)',
    labelIt: 'Redazione contratto di locazione (conduttore già individuato)',
    labelEs: 'Redacción del contrato de arrendamiento (inquilino ya encontrado)',
    category: 'rental',
    priceModel: 'fixed',
    amountCents: eur(120),
    ivaApplicable: true,
    active: true,
  },
  {
    code: 'RLI_REGISTRATION',
    labelEn: 'RLI registration + cedolare secca option',
    labelIt: 'Registrazione RLI + opzione cedolare secca',
    labelEs: 'Registro RLI + opción cedolare secca',
    category: 'rental',
    priceModel: 'fixed',
    amountCents: eur(80),
    ivaApplicable: true,
    active: true,
  },
  {
    code: 'REGISTRATION_TAXES',
    labelEn: 'Registration & stamp taxes (pass-through)',
    labelIt: 'Imposta di registro e bollo (a costo)',
    labelEs: 'Impuestos de registro y timbre (a coste)',
    category: 'rental',
    priceModel: 'passthrough',
    amountCents: eur(0),
    ivaApplicable: false,
    active: true,
  },
  {
    code: 'TENANT_SCREENING',
    labelEn: 'Tenant screening / KYC',
    labelIt: 'Screening inquilino / KYC',
    labelEs: 'Screening del inquilino / KYC',
    category: 'aml',
    priceModel: 'fixed',
    amountCents: eur(45),
    ivaApplicable: true,
    active: false,
  },
  {
    code: 'VIEWING_KIT',
    labelEn: 'Viewing kit',
    labelIt: 'Kit visite',
    labelEs: 'Kit de visitas',
    category: 'listing',
    priceModel: 'fixed',
    amountCents: eur(39),
    ivaApplicable: true,
    active: true,
  },
  {
    code: 'SELL_IT_YOURSELF_COURSE',
    labelEn: 'Sell it yourself course',
    labelIt: 'Corso «vendi da solo»',
    labelEs: 'Curso «véndelo tú»',
    category: 'training',
    priceModel: 'fixed',
    amountCents: eur(69),
    ivaApplicable: true,
    active: true,
  },
  {
    code: 'PROPOSAL_NOTE',
    labelEn: 'How a purchase proposal works',
    labelIt: 'Come funziona una proposta di acquisto',
    labelEs: 'Cómo funciona una propuesta de compra',
    category: 'documents',
    priceModel: 'fixed',
    amountCents: eur(0),
    ivaApplicable: true,
    active: true,
  },
] as const;

export const PACKAGES: readonly ServicePackage[] = [
  {
    code: 'FAI_DA_TE',
    labelEn: 'Fai-da-te',
    labelIt: 'Fai-da-te',
    labelEs: 'Hazlo tú mismo',
    includes: ['LISTING_PUBLICATION', 'DOC_CHECKUP', 'VALUATION'],
    bundleFixedCents: eur(199),
    active: false,
  },
  {
    code: 'ASSISTITO',
    labelEn: 'Assistito',
    labelIt: 'Assistito',
    labelEs: 'Asistido',
    includes: ['LISTING_PUBLICATION', 'DOC_CHECKUP', 'VALUATION', 'MEDIA_PACK', 'FULL_MEDIATION'],
    bundleFixedCents: eur(349),
    active: false,
  },
  {
    code: 'CHIAVI_IN_MANO',
    labelEn: 'Chiavi in mano',
    labelIt: 'Chiavi in mano',
    labelEs: 'Llave en mano',
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
    active: false,
  },
  {
    code: 'AFFITTO_SERENO',
    labelEn: 'Affitto Sereno',
    labelIt: 'Affitto Sereno',
    labelEs: 'Alquiler Sereno',
    includes: ['LEASE_DRAFTING', 'RLI_REGISTRATION', 'REGISTRATION_TAXES', 'TENANT_SCREENING'],
    bundleFixedCents: eur(220),
    active: false,
  },
  {
    code: 'READY_TO_LIST',
    labelEn: 'Ready to list',
    labelIt: 'Pronto a pubblicare',
    labelEs: 'Listo para publicar',
    includes: ['VALUATION', 'DOC_CHECKUP', 'VIEWING_KIT'],
    bundleFixedCents: eur(259),
    active: true,
  },
  {
    code: 'READY_TO_SELL',
    labelEn: 'Ready to sell',
    labelIt: 'Pronto a vendere',
    labelEs: 'Listo para vender',
    includes: ['VALUATION', 'DOC_CHECKUP', 'VIEWING_KIT', 'MEDIA_PACK', 'CONFORMITY_SURVEY'],
    bundleFixedCents: eur(779),
    active: true,
  },
  {
    code: 'RENTING_MADE_SIMPLE',
    labelEn: 'Renting made simple',
    labelIt: 'Affitto in regola',
    labelEs: 'Alquiler en regla',
    includes: ['LEASE_DRAFTING', 'RLI_REGISTRATION'],
    bundleFixedCents: eur(189),
    active: true,
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

/** Public list: active rows only. In PONTE, never a provvigione SKU. */
export function listPublicCatalogItems(): readonly CatalogItem[] {
  return CATALOG.filter((item) => item.active && !(isPonte() && item.priceModel === 'provvigione'));
}

export function listPublicPackages(): readonly ServicePackage[] {
  return PACKAGES.filter((pkg) => pkg.active);
}

export const PONTE_INACTIVE_ITEM_CODES = CATALOG.filter((i) => !i.active).map((i) => i.code);
