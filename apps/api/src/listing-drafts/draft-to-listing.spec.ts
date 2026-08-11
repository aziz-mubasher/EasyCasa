import { describe, expect, it } from 'vitest';
import type { ListingDraftPayload } from '@easycasa/shared';

import { draftPayloadToCreateDto } from './draft-to-listing';

const ready: ListingDraftPayload = {
  currentStep: 'review',
  propertyType: 'apartment',
  title: 'Bilocale luminoso',
  address: 'Via Roma 1',
  city: 'Milano',
  province: 'mi',
  postalCode: '20121',
  lat: 45.46,
  lng: 9.19,
  sqm: 65,
  rooms: 2,
  bathrooms: 1,
  yearBuilt: 1970,
  condition: 'good',
  price: 320000,
  photoUrls: ['https://cdn.example/a.webp', 'https://cdn.example/b.webp', 'https://cdn.example/c.webp'],
  description: 'A'.repeat(50),
  acceptedTerms: true,
};

describe('draftPayloadToCreateDto (PR-W)', () => {
  it('maps wizard fields onto create DTO with private seller defaults', () => {
    const dto = draftPayloadToCreateDto(ready);
    expect(dto.title).toBe('Bilocale luminoso');
    expect(dto.province).toBe('MI');
    expect(dto.sizeSqm).toBe(65);
    expect(dto.bedrooms).toBe(2);
    expect(dto.sellerType).toBe('private');
    expect(dto.transactionTypes).toEqual(['sale']);
    expect(dto.latitude).toBe(45.46);
  });
});
