import {
  FEATURE_SLUGS,
  provinceFromComune,
  type AssetClassSlug,
  type ConditionSlug,
  type FeatureSlug,
  type PropertyTypeSlug,
  type SellerTypeSlug,
  type TransactionTypeSlug,
} from '@easycasa/shared';
import { CASAFARI_FEATURE_TO_SLUG, type CasafariRawDraft } from './casafari-scrape';

export interface EasyCasaImportDraft {
  casafariId: string;
  sourceUrl: string;
  propertyUrl: string;
  title: string;
  description: string;
  price: number | null;
  rentPrice: number | null;
  transactionTypes: TransactionTypeSlug[];
  assetClass: AssetClassSlug;
  propertyType: PropertyTypeSlug | null;
  condition: ConditionSlug | null;
  sellerType: SellerTypeSlug;
  features: FeatureSlug[];
  bedrooms: number | null;
  bathrooms: number | null;
  rooms: number | null;
  sizeSqm: number | null;
  surfaceSqm: number | null;
  landSqm: number | null;
  yearBuilt: number | null;
  energyClass: string | null;
  floor: string | null;
  address: string | null;
  city: string | null;
  /** Inferred ISTAT province sigla when the comune name matches. */
  province: string | null;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
  photoUrls: string[];
  listingSource: string;
  listingUrls: string[];
  sellerLabel: string;
  /** Fields Casafari did not provide — UI should prompt. */
  missingRequired: string[];
}

function mapPropertyType(draft: CasafariRawDraft): PropertyTypeSlug | null {
  const raw = `${draft.propertyTypeRaw} ${draft.typeGroup}`.toLowerCase();
  if (/studio|monolocale/.test(raw)) return 'studio';
  if (/penthouse|attico/.test(raw)) return 'penthouse';
  if (/loft/.test(raw)) return 'loft';
  if (/mansarda|attic/.test(raw)) return 'attic';
  if (/villa/.test(raw)) return 'villa';
  if (/townhouse|schiera|terraced/.test(raw)) return 'townhouse';
  if (/farmhouse|cascina|country\s*house|casa\s*di\s*campagna/.test(raw)) return 'farmhouse';
  if (/rustic|rustico|casale/.test(raw)) return 'rustic';
  if (/building|palazzo|edificio/.test(raw)) return 'building';
  if (/room|stanza|camera/.test(raw)) return 'room';
  if (/apartment|appartamento|flat/.test(raw)) return 'apartment';
  if (/house|detached|unifamiliare|casa/.test(raw)) return 'detached';
  if (draft.typeGroup === 'house') return 'detached';
  if (draft.typeGroup === 'apartment') return 'apartment';
  return null;
}

function mapAssetClass(draft: CasafariRawDraft): AssetClassSlug {
  const raw = `${draft.propertyTypeRaw} ${draft.typeGroup}`.toLowerCase();
  if (/office|ufficio/.test(raw)) return 'office';
  if (/commercial|negozio|retail|shop/.test(raw)) return 'commercial';
  if (/industrial|capannone|warehouse/.test(raw)) return 'industrial';
  if (/land|terreno|plot/.test(raw)) return 'land';
  if (/garage|box|parking/.test(raw)) return 'garage';
  if (/hotel|hospitality|albergo/.test(raw)) return 'hospitality';
  return 'residential';
}

function mapCondition(draft: CasafariRawDraft): ConditionSlug | null {
  const raw = draft.conditionRaw.toLowerCase().replace(/_/g, '-');
  if (/new[- ]?build|nuovo|new$/.test(raw)) return 'new_build';
  if (/under[- ]?construction|cantiere/.test(raw)) return 'under_construction';
  if (/renovat/.test(raw)) return 'renovated';
  if (/good|buono|habitable/.test(raw)) return 'good';
  if (/to[- ]?refurbish|to[- ]?renovat|da\s*ristrutturare|refurbish/.test(raw)) {
    return 'to_renovate';
  }
  if (/shell|grezzo|raw/.test(raw)) return 'shell';
  return null;
}

function mapSellerType(draft: CasafariRawDraft): SellerTypeSlug {
  return draft.sellerType === 'agency' ? 'agency' : 'private';
}

function mapFeatures(draft: CasafariRawDraft): FeatureSlug[] {
  const allowed = new Set<string>(FEATURE_SLUGS);
  const out: FeatureSlug[] = [];
  const seen = new Set<string>();
  for (const id of draft.featureIds) {
    const slug = CASAFARI_FEATURE_TO_SLUG[id];
    if (slug && allowed.has(slug) && !seen.has(slug)) {
      seen.add(slug);
      out.push(slug as FeatureSlug);
    }
  }
  return out;
}

function mapTransactionTypes(draft: CasafariRawDraft): TransactionTypeSlug[] {
  const types: TransactionTypeSlug[] = [];
  if (draft.price && draft.price > 0) types.push('sale');
  if (draft.rentPrice && draft.rentPrice > 0) types.push('rent');
  if (types.length === 0) types.push('sale');
  return types;
}

function normalizeEnergyClass(raw: string): string | null {
  const v = String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
  if (!v) return null;
  if (/^A[1-4]$|^[B-G]$/.test(v)) return v;
  // Casafari sometimes returns "A" alone
  if (v === 'A') return 'A4';
  return v.slice(0, 2);
}

/**
 * Map a Casafari scrape draft onto EasyCasa listing fields.
 */
export function mapCasafariDraftToEasyCasa(draft: CasafariRawDraft): EasyCasaImportDraft {
  const propertyType = mapPropertyType(draft);
  const condition = mapCondition(draft);
  const transactionTypes = mapTransactionTypes(draft);
  const province = draft.city ? provinceFromComune(draft.city) : null;
  const missingRequired: string[] = [];
  if (!draft.city) missingRequired.push('city');
  if (!province) missingRequired.push('province');
  if (!propertyType) missingRequired.push('propertyType');
  if (!condition) missingRequired.push('condition');
  if (!draft.constructionYear) missingRequired.push('yearBuilt');

  return {
    casafariId: draft.casafariId,
    sourceUrl: draft.sourceUrl,
    propertyUrl: draft.propertyUrl,
    title: draft.title,
    description: draft.description,
    price: draft.price > 0 ? draft.price : null,
    rentPrice: draft.rentPrice,
    transactionTypes,
    assetClass: mapAssetClass(draft),
    propertyType,
    condition,
    sellerType: mapSellerType(draft),
    features: mapFeatures(draft),
    bedrooms: draft.beds,
    bathrooms: draft.bathrooms,
    rooms: draft.rooms,
    sizeSqm: draft.sqm,
    surfaceSqm: draft.sqm,
    landSqm: draft.plotArea,
    yearBuilt: draft.constructionYear,
    energyClass: normalizeEnergyClass(draft.energyRating),
    floor: draft.floor || null,
    address: draft.address || null,
    city: draft.city || null,
    province,
    postalCode: draft.zipCode || null,
    latitude: draft.latitude,
    longitude: draft.longitude,
    photoUrls: draft.photos,
    listingSource: draft.listingSource,
    listingUrls: draft.listingUrls,
    sellerLabel: draft.sellerLabel,
    missingRequired: [...new Set(missingRequired)],
  };
}
