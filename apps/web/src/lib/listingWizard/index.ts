/**
 * Guided listing wizard state machine (EC-S-T07 — "Guided listing wizard UI").
 *
 * Pure, framework-free helpers shared by the wizard UI and the API layer:
 * step order, per-step validation (machine-readable error codes), untrusted
 * JSONB draft deserialization, submit-readiness, and step navigation that
 * never drops already-entered fields.
 */

/** Ordered wizard steps for an Italian private-seller listing. */
export const WIZARD_STEPS = [
  'basics',
  'address',
  'details',
  'price',
  'photos',
  'description',
  'review',
] as const;

export type WizardStepId = (typeof WIZARD_STEPS)[number];

const STEP_INDEX: ReadonlyMap<WizardStepId, number> = new Map(
  WIZARD_STEPS.map((step, index) => [step, index] as const),
);

export function isWizardStepId(value: unknown): value is WizardStepId {
  return typeof value === 'string' && STEP_INDEX.has(value as WizardStepId);
}

/** Allowed property types for a residential/land private-seller listing. */
export const PROPERTY_TYPES = [
  'apartment',
  'house',
  'villa',
  'land',
  'commercial',
  'garage',
  'other',
] as const;

export type PropertyType = (typeof PROPERTY_TYPES)[number];

export interface BasicsFields {
  propertyType?: string;
  title?: string;
}

/**
 * Address step. `omiZoneId` is deliberately optional + nullable: it is
 * resolved asynchronously (EC-S-T08) after address entry, and a listing may
 * legitimately have no OMI zone match.
 */
export interface AddressFields {
  address?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  lat?: number;
  lng?: number;
  omiZoneId?: string | null;
}

export interface DetailsFields {
  sqm?: number;
  rooms?: number;
  bathrooms?: number;
  floor?: number;
  yearBuilt?: number;
  condition?: string;
}

export interface PriceFields {
  price?: number;
  priceNegotiable?: boolean;
}

export interface PhotosFields {
  photoUrls?: string[];
}

export interface DescriptionFields {
  description?: string;
}

export interface ReviewFields {
  acceptedTerms?: boolean;
}

/**
 * Draft payload shape: `{ currentStep, ...step fields }`. All step fields
 * are optional at the type level because the draft is filled progressively
 * — `validateStep` / `canSubmit` decide what "complete" means.
 */
export type ListingDraftPayload = {
  currentStep: WizardStepId;
} & BasicsFields &
  AddressFields &
  DetailsFields &
  PriceFields &
  PhotosFields &
  DescriptionFields &
  ReviewFields;

export type ValidationResult = { ok: true } | { ok: false; codes: string[] };

const MIN_TITLE_LENGTH = 5;
const MIN_DESCRIPTION_LENGTH = 40;
const MIN_PHOTOS = 3;
const POSTAL_CODE_RE = /^\d{5}$/;
const PROVINCE_RE = /^[A-Za-z]{2}$/;
const MIN_YEAR_BUILT = 1000;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function validateBasics(payload: Partial<ListingDraftPayload>, codes: string[]): void {
  if (!isNonEmptyString(payload.propertyType)) {
    codes.push('PROPERTY_TYPE_REQUIRED');
  } else if (!(PROPERTY_TYPES as readonly string[]).includes(payload.propertyType)) {
    codes.push('PROPERTY_TYPE_INVALID');
  }

  if (!isNonEmptyString(payload.title)) {
    codes.push('TITLE_REQUIRED');
  } else if (payload.title.trim().length < MIN_TITLE_LENGTH) {
    codes.push('TITLE_TOO_SHORT');
  }
}

function validateAddress(payload: Partial<ListingDraftPayload>, codes: string[]): void {
  if (!isNonEmptyString(payload.address)) codes.push('ADDRESS_REQUIRED');
  if (!isNonEmptyString(payload.city)) codes.push('CITY_REQUIRED');

  if (!isNonEmptyString(payload.province)) {
    codes.push('PROVINCE_REQUIRED');
  } else if (!PROVINCE_RE.test(payload.province)) {
    codes.push('PROVINCE_INVALID');
  }

  if (!isNonEmptyString(payload.postalCode)) {
    codes.push('POSTAL_CODE_REQUIRED');
  } else if (!POSTAL_CODE_RE.test(payload.postalCode)) {
    codes.push('POSTAL_CODE_INVALID');
  }

  if (payload.lat !== undefined && (!isFiniteNumber(payload.lat) || payload.lat < -90 || payload.lat > 90)) {
    codes.push('LAT_INVALID');
  }
  if (payload.lng !== undefined && (!isFiniteNumber(payload.lng) || payload.lng < -180 || payload.lng > 180)) {
    codes.push('LNG_INVALID');
  }

  if (
    payload.omiZoneId !== undefined &&
    payload.omiZoneId !== null &&
    !isNonEmptyString(payload.omiZoneId)
  ) {
    codes.push('OMI_ZONE_ID_INVALID');
  }
}

function validateDetails(payload: Partial<ListingDraftPayload>, codes: string[]): void {
  if (payload.sqm === undefined) {
    codes.push('SQM_REQUIRED');
  } else if (!isFiniteNumber(payload.sqm) || payload.sqm <= 0) {
    codes.push('SQM_INVALID');
  }

  if (payload.rooms === undefined) {
    codes.push('ROOMS_REQUIRED');
  } else if (!Number.isInteger(payload.rooms) || payload.rooms <= 0) {
    codes.push('ROOMS_INVALID');
  }

  if (payload.bathrooms !== undefined && (!Number.isInteger(payload.bathrooms) || payload.bathrooms < 0)) {
    codes.push('BATHROOMS_INVALID');
  }

  if (payload.floor !== undefined && !Number.isInteger(payload.floor)) {
    codes.push('FLOOR_INVALID');
  }

  const maxYear = new Date().getUTCFullYear() + 1;
  if (
    payload.yearBuilt !== undefined &&
    (!Number.isInteger(payload.yearBuilt) || payload.yearBuilt < MIN_YEAR_BUILT || payload.yearBuilt > maxYear)
  ) {
    codes.push('YEAR_BUILT_INVALID');
  }
}

function validatePrice(payload: Partial<ListingDraftPayload>, codes: string[]): void {
  if (payload.price === undefined) {
    codes.push('PRICE_REQUIRED');
  } else if (!isFiniteNumber(payload.price) || payload.price <= 0) {
    codes.push('PRICE_INVALID');
  }
}

function validatePhotos(payload: Partial<ListingDraftPayload>, codes: string[]): void {
  const photoUrls = payload.photoUrls;
  if (!Array.isArray(photoUrls) || photoUrls.length === 0) {
    codes.push('PHOTOS_REQUIRED');
    return;
  }
  if (photoUrls.length < MIN_PHOTOS) {
    codes.push('PHOTOS_MIN_COUNT');
  }
  if (photoUrls.some((url) => !isNonEmptyString(url))) {
    codes.push('PHOTOS_INVALID');
  }
}

function validateDescription(payload: Partial<ListingDraftPayload>, codes: string[]): void {
  if (!isNonEmptyString(payload.description)) {
    codes.push('DESCRIPTION_REQUIRED');
  } else if (payload.description.trim().length < MIN_DESCRIPTION_LENGTH) {
    codes.push('DESCRIPTION_TOO_SHORT');
  }
}

function validateReview(payload: Partial<ListingDraftPayload>, codes: string[]): void {
  if (payload.acceptedTerms !== true) {
    codes.push('ACCEPTED_TERMS_REQUIRED');
  }
}

const STEP_VALIDATORS: Readonly<
  Record<WizardStepId, (payload: Partial<ListingDraftPayload>, codes: string[]) => void>
> = {
  basics: validateBasics,
  address: validateAddress,
  details: validateDetails,
  price: validatePrice,
  photos: validatePhotos,
  description: validateDescription,
  review: validateReview,
};

/**
 * Validate a single wizard step against (a slice of) the draft payload.
 * Returns machine-readable error codes rather than human copy — the UI/i18n
 * layer maps codes to localized messages.
 */
export function validateStep(
  stepId: WizardStepId,
  payload: Partial<ListingDraftPayload>,
): ValidationResult {
  const codes: string[] = [];
  const validator = STEP_VALIDATORS[stepId];
  validator(payload, codes);
  return codes.length === 0 ? { ok: true } : { ok: false, codes };
}

/** A draft can be submitted only when every wizard step currently validates. */
export function canSubmit(draft: ListingDraftPayload): boolean {
  return WIZARD_STEPS.every((step) => validateStep(step, draft).ok);
}

export function nextStep(draft: ListingDraftPayload): ListingDraftPayload {
  const index = STEP_INDEX.get(draft.currentStep) ?? 0;
  const nextId = WIZARD_STEPS[Math.min(index + 1, WIZARD_STEPS.length - 1)];
  if (nextId === undefined) return draft;
  return { ...draft, currentStep: nextId };
}

export function prevStep(draft: ListingDraftPayload): ListingDraftPayload {
  const index = STEP_INDEX.get(draft.currentStep) ?? 0;
  const prevId = WIZARD_STEPS[Math.max(index - 1, 0)];
  if (prevId === undefined) return draft;
  return { ...draft, currentStep: prevId };
}

/** Raised by {@link deserializeDraft} when untrusted input cannot be trusted as-is. */
export class DraftValidationError extends Error {
  readonly codes: string[];

  constructor(codes: string[]) {
    super(`Invalid listing draft: ${codes.join(', ')}`);
    this.name = 'DraftValidationError';
    this.codes = codes;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(record: Record<string, unknown>, key: string, code: string, codes: string[]): string | undefined {
  const raw = record[key];
  if (raw === undefined) return undefined;
  if (typeof raw !== 'string') {
    codes.push(code);
    return undefined;
  }
  return raw;
}

function readNullableString(
  record: Record<string, unknown>,
  key: string,
  code: string,
  codes: string[],
): string | null | undefined {
  const raw = record[key];
  if (raw === undefined) return undefined;
  if (raw === null) return null;
  if (typeof raw !== 'string') {
    codes.push(code);
    return undefined;
  }
  return raw;
}

function readNumber(record: Record<string, unknown>, key: string, code: string, codes: string[]): number | undefined {
  const raw = record[key];
  if (raw === undefined) return undefined;
  if (!isFiniteNumber(raw)) {
    codes.push(code);
    return undefined;
  }
  return raw;
}

function readBoolean(record: Record<string, unknown>, key: string, code: string, codes: string[]): boolean | undefined {
  const raw = record[key];
  if (raw === undefined) return undefined;
  if (typeof raw !== 'boolean') {
    codes.push(code);
    return undefined;
  }
  return raw;
}

function readStringArray(
  record: Record<string, unknown>,
  key: string,
  code: string,
  codes: string[],
): string[] | undefined {
  const raw = record[key];
  if (raw === undefined) return undefined;
  if (!Array.isArray(raw) || !raw.every((entry) => typeof entry === 'string')) {
    codes.push(code);
    return undefined;
  }
  return raw as string[];
}

/**
 * Deserialize an untrusted JSONB draft (e.g. loaded straight from Postgres)
 * into a typed {@link ListingDraftPayload}. Never trusts the input shape:
 * unknown/mistyped fields are rejected with machine-readable codes rather
 * than silently coerced. Throws {@link DraftValidationError} on failure.
 */
export function deserializeDraft(raw: unknown): ListingDraftPayload {
  if (!isRecord(raw)) {
    throw new DraftValidationError(['DRAFT_INVALID_SHAPE']);
  }

  const codes: string[] = [];

  const currentStepRaw = raw.currentStep;
  const currentStep = isWizardStepId(currentStepRaw) ? currentStepRaw : undefined;
  if (currentStep === undefined) codes.push('CURRENT_STEP_INVALID');

  const propertyType = readString(raw, 'propertyType', 'PROPERTY_TYPE_TYPE_INVALID', codes);
  const title = readString(raw, 'title', 'TITLE_TYPE_INVALID', codes);

  const address = readString(raw, 'address', 'ADDRESS_TYPE_INVALID', codes);
  const city = readString(raw, 'city', 'CITY_TYPE_INVALID', codes);
  const province = readString(raw, 'province', 'PROVINCE_TYPE_INVALID', codes);
  const postalCode = readString(raw, 'postalCode', 'POSTAL_CODE_TYPE_INVALID', codes);
  const lat = readNumber(raw, 'lat', 'LAT_TYPE_INVALID', codes);
  const lng = readNumber(raw, 'lng', 'LNG_TYPE_INVALID', codes);
  const omiZoneId = readNullableString(raw, 'omiZoneId', 'OMI_ZONE_ID_TYPE_INVALID', codes);

  const sqm = readNumber(raw, 'sqm', 'SQM_TYPE_INVALID', codes);
  const rooms = readNumber(raw, 'rooms', 'ROOMS_TYPE_INVALID', codes);
  const bathrooms = readNumber(raw, 'bathrooms', 'BATHROOMS_TYPE_INVALID', codes);
  const floor = readNumber(raw, 'floor', 'FLOOR_TYPE_INVALID', codes);
  const yearBuilt = readNumber(raw, 'yearBuilt', 'YEAR_BUILT_TYPE_INVALID', codes);
  const condition = readString(raw, 'condition', 'CONDITION_TYPE_INVALID', codes);

  const price = readNumber(raw, 'price', 'PRICE_TYPE_INVALID', codes);
  const priceNegotiable = readBoolean(raw, 'priceNegotiable', 'PRICE_NEGOTIABLE_TYPE_INVALID', codes);

  const photoUrls = readStringArray(raw, 'photoUrls', 'PHOTO_URLS_TYPE_INVALID', codes);

  const description = readString(raw, 'description', 'DESCRIPTION_TYPE_INVALID', codes);

  const acceptedTerms = readBoolean(raw, 'acceptedTerms', 'ACCEPTED_TERMS_TYPE_INVALID', codes);

  if (codes.length > 0) {
    throw new DraftValidationError(codes);
  }

  return {
    currentStep: currentStep as WizardStepId,
    propertyType,
    title,
    address,
    city,
    province,
    postalCode,
    lat,
    lng,
    omiZoneId,
    sqm,
    rooms,
    bathrooms,
    floor,
    yearBuilt,
    condition,
    price,
    priceNegotiable,
    photoUrls,
    description,
    acceptedTerms,
  };
}
