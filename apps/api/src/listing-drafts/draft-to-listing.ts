import type { CreateListingDto } from '../listings/dto/create-listing.dto';
import type { ListingDraftPayload } from '@easycasa/shared';

/**
 * EC-S PR-W — map a ready T07 wizard draft onto CreateListingDto.
 * Assumes `canSubmit(draft)` already passed.
 */
export function draftPayloadToCreateDto(draft: ListingDraftPayload): CreateListingDto {
  return {
    title: (draft.title ?? '').trim(),
    description: draft.description?.trim(),
    // Wizard PROPERTY_TYPES ⊂ CreateListingDto union; validated by canSubmit.
    propertyType: draft.propertyType as CreateListingDto['propertyType'],
    condition: draft.condition as CreateListingDto['condition'],
    address: draft.address?.trim(),
    city: draft.city?.trim(),
    province: draft.province?.trim()?.toUpperCase(),
    price: draft.price,
    sizeSqm: draft.sqm,
    bedrooms: draft.rooms,
    bathrooms: draft.bathrooms,
    yearBuilt: draft.yearBuilt,
    latitude: draft.lat,
    longitude: draft.lng,
    sellerType: 'private',
    transactionTypes: ['sale'],
    transactionType: 'sale',
    assetClass: draft.propertyType === 'commercial' ? 'commercial' : 'residential',
  };
}
