import { describe, expect, it } from 'vitest';
import {
  DraftValidationError,
  WIZARD_STEPS,
  canSubmit,
  deserializeDraft,
  nextStep,
  prevStep,
  validateStep,
  type ListingDraftPayload,
} from './index';

/** A draft that passes validateStep for every wizard step. */
const validDraft: ListingDraftPayload = {
  currentStep: 'review',
  propertyType: 'apartment',
  title: 'Bright two-bedroom flat near the center',
  address: 'Via Roma 12',
  city: 'Brescia',
  province: 'BS',
  postalCode: '25100',
  lat: 45.5416,
  lng: 10.2118,
  omiZoneId: null,
  sqm: 85,
  rooms: 3,
  bathrooms: 1,
  price: 250000,
  photoUrls: ['https://cdn.example.com/1.jpg', 'https://cdn.example.com/2.jpg', 'https://cdn.example.com/3.jpg'],
  description:
    'A bright, well-connected two-bedroom apartment close to public transport, shops, and schools.',
  acceptedTerms: true,
};

describe('WIZARD_STEPS', () => {
  it('is an ordered, sensible step list for an Italian private-seller listing', () => {
    expect(WIZARD_STEPS).toEqual([
      'basics',
      'address',
      'details',
      'price',
      'photos',
      'description',
      'review',
    ]);
  });
});

describe('validateStep', () => {
  it('flags PROPERTY_TYPE_REQUIRED and TITLE_REQUIRED on an empty basics step', () => {
    const result = validateStep('basics', {});
    expect(result.ok).toBe(false);
    expect(result.ok ? [] : result.codes).toEqual(
      expect.arrayContaining(['PROPERTY_TYPE_REQUIRED', 'TITLE_REQUIRED']),
    );
  });

  it('accepts a well-formed basics step', () => {
    expect(validateStep('basics', { propertyType: 'apartment', title: 'Sunny family home' })).toEqual({
      ok: true,
    });
  });

  it('flags ADDRESS_REQUIRED, CITY_REQUIRED, PROVINCE_REQUIRED, POSTAL_CODE_REQUIRED on an empty address step', () => {
    const result = validateStep('address', {});
    expect(result.ok).toBe(false);
    expect(result.ok ? [] : result.codes).toEqual(
      expect.arrayContaining([
        'ADDRESS_REQUIRED',
        'CITY_REQUIRED',
        'PROVINCE_REQUIRED',
        'POSTAL_CODE_REQUIRED',
      ]),
    );
  });

  it('accepts an address step with a null omiZoneId (not yet resolved)', () => {
    expect(
      validateStep('address', {
        address: 'Via Roma 12',
        city: 'Brescia',
        province: 'BS',
        postalCode: '25100',
        omiZoneId: null,
      }),
    ).toEqual({ ok: true });
  });

  it('flags POSTAL_CODE_INVALID for a malformed postal code', () => {
    const result = validateStep('address', {
      address: 'Via Roma 12',
      city: 'Brescia',
      province: 'BS',
      postalCode: '123',
    });
    expect(result.ok).toBe(false);
    expect(result.ok ? [] : result.codes).toContain('POSTAL_CODE_INVALID');
  });

  it('flags SQM_INVALID and ROOMS_INVALID for non-positive details', () => {
    const result = validateStep('details', { sqm: -10, rooms: 0 });
    expect(result.ok).toBe(false);
    expect(result.ok ? [] : result.codes).toEqual(expect.arrayContaining(['SQM_INVALID', 'ROOMS_INVALID']));
  });

  it('flags PRICE_REQUIRED when price is missing and PRICE_INVALID when non-positive', () => {
    expect(validateStep('price', {})).toEqual({ ok: false, codes: ['PRICE_REQUIRED'] });
    expect(validateStep('price', { price: -1 })).toEqual({ ok: false, codes: ['PRICE_INVALID'] });
    expect(validateStep('price', { price: 199000 })).toEqual({ ok: true });
  });

  it('flags PHOTOS_MIN_COUNT when fewer than the minimum photo count is supplied', () => {
    const result = validateStep('photos', { photoUrls: ['https://cdn.example.com/1.jpg'] });
    expect(result.ok).toBe(false);
    expect(result.ok ? [] : result.codes).toContain('PHOTOS_MIN_COUNT');
  });

  it('flags DESCRIPTION_TOO_SHORT for a too-brief description', () => {
    const result = validateStep('description', { description: 'Nice flat.' });
    expect(result.ok).toBe(false);
    expect(result.ok ? [] : result.codes).toContain('DESCRIPTION_TOO_SHORT');
  });

  it('flags ACCEPTED_TERMS_REQUIRED until the review step is explicitly accepted', () => {
    expect(validateStep('review', {})).toEqual({ ok: false, codes: ['ACCEPTED_TERMS_REQUIRED'] });
    expect(validateStep('review', { acceptedTerms: true })).toEqual({ ok: true });
  });
});

describe('deserializeDraft', () => {
  it('round-trips a well-formed JSONB draft', () => {
    const draft = deserializeDraft(JSON.parse(JSON.stringify(validDraft)));
    expect(draft.currentStep).toBe('review');
    expect(draft.price).toBe(250000);
    expect(draft.omiZoneId).toBeNull();
  });

  it('accepts a partial in-progress draft (only earlier steps filled in)', () => {
    const draft = deserializeDraft({ currentStep: 'address', propertyType: 'house', title: 'Countryside villa' });
    expect(draft.currentStep).toBe('address');
    expect(draft.sqm).toBeUndefined();
    expect(draft.photoUrls).toBeUndefined();
  });

  it('throws DraftValidationError with DRAFT_INVALID_SHAPE for non-object input', () => {
    expect(() => deserializeDraft(null)).toThrow(DraftValidationError);
    expect(() => deserializeDraft('not a draft')).toThrow(DraftValidationError);
    try {
      deserializeDraft(['array']);
    } catch (error) {
      expect(error).toBeInstanceOf(DraftValidationError);
      expect((error as DraftValidationError).codes).toEqual(['DRAFT_INVALID_SHAPE']);
    }
  });

  it('throws DraftValidationError with CURRENT_STEP_INVALID for an unknown step id', () => {
    try {
      deserializeDraft({ currentStep: 'not-a-real-step' });
      throw new Error('expected deserializeDraft to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(DraftValidationError);
      expect((error as DraftValidationError).codes).toContain('CURRENT_STEP_INVALID');
    }
  });

  it('never trusts mistyped client fields (e.g. sqm sent as a string)', () => {
    try {
      deserializeDraft({ currentStep: 'details', sqm: '85', rooms: 3 });
      throw new Error('expected deserializeDraft to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(DraftValidationError);
      expect((error as DraftValidationError).codes).toContain('SQM_TYPE_INVALID');
    }
  });
});

describe('canSubmit', () => {
  it('is false when required steps are incomplete', () => {
    expect(canSubmit({ currentStep: 'basics' })).toBe(false);
  });

  it('is true only once every wizard step passes validateStep', () => {
    expect(canSubmit(validDraft)).toBe(true);
    expect(canSubmit({ ...validDraft, acceptedTerms: false })).toBe(false);
  });
});

describe('step navigation (nextStep / prevStep)', () => {
  it('advances currentStep without losing any already-entered fields', () => {
    const draft: ListingDraftPayload = { currentStep: 'basics', title: 'Cozy studio', price: 120000 };
    const advanced = nextStep(draft);
    expect(advanced.currentStep).toBe('address');
    expect(advanced.title).toBe('Cozy studio');
    expect(advanced.price).toBe(120000);
  });

  it('does not advance past the final step', () => {
    const draft: ListingDraftPayload = { currentStep: 'review', title: 'Loft' };
    expect(nextStep(draft).currentStep).toBe('review');
  });

  it('moves back a step and does not go before the first step', () => {
    const draft: ListingDraftPayload = { currentStep: 'details', city: 'Milano' };
    const back = prevStep(draft);
    expect(back.currentStep).toBe('address');
    expect(back.city).toBe('Milano');
    expect(prevStep({ currentStep: 'basics' }).currentStep).toBe('basics');
  });
});
